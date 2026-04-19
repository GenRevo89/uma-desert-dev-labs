"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { generateChatResponse, generateSpeechUrl, type FarmSchema } from '@/lib/ai';
import { 
  Send, Volume2, VolumeX, Leaf, User, Sparkles,
  Loader2, Mic, Database
} from 'lucide-react';
import './chat.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

interface ChatProps {
  /** Optional digital twin schema — when loaded, Uma gets full schematic awareness */
  farmSchema?: FarmSchema;
  /** Optional callback for actuator commands Uma issues via chat */
  onActuatorCommand?: (cmd: { target: string; id: string; action: string; reason: string }) => void;
  /** Optional callback to capture a fresh schematic screenshot, returns base64 JPEG */
  onCaptureSchematic?: () => Promise<string | null>;
}

export default function Chat({ farmSchema, onActuatorCommand, onCaptureSchematic }: ChatProps = {}) {
  const baselineImage = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello — I\'m Uma, your hydroponic intelligence. I can query the farm\'s sensor array, analyze telemetry trends, or discuss vertical agriculture strategy. How can I help you today?',
      timestamp: now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Capture baseline schematic image on mount (after short delay for rendering)
  useEffect(() => {
    if (!onCaptureSchematic) return;
    const timer = setTimeout(async () => {
      const img = await onCaptureSchematic();
      if (img) baselineImage.current = img;
    }, 1500); // Wait for schematic to render
    return () => clearTimeout(timer);
  }, [onCaptureSchematic]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
    // Assume capability available
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      setHasSpeechRecognition(true);
    }
  }, []);

  const nextPlayTimeRef = useRef<number>(0);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);

  const startRealtimeRecording = async () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const res = await fetch('/api/realtime/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmSchema })
      });
      const { url, key, systemPrompt, tools } = await res.json();
      if (!url || !key) throw new Error('Realtime endpoint missing');

      const wsUrl = `${url}&api-key=${key}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt,
            tools: tools,
            modalities: ["audio", "text"],
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: "server_vad" }
          }
        }));
        setIsListening(true);
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`, role: 'assistant',
          content: '— Live Audio Link Established (\'server_vad\' active) —',
          timestamp: now()
        }]);
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        
        // 1. User Transcription Finished
        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          setMessages(prev => [...prev, {
             id: `user-${Date.now()}`,
             role: 'user',
             content: msg.transcript || '[Unintelligible]',
             timestamp: now()
          }]);
        }

        // 2. Assistant Audio Transcript Streaming
        if (msg.type === "response.audio_transcript.delta") {
          setMessages(prev => {
             const last = prev[prev.length - 1];
             if (last && last.id === `uma-live`) {
                return [...prev.slice(0, -1), { ...last, content: last.content + msg.delta }];
             }
             return [...prev, { id: 'uma-live', role: 'assistant', content: msg.delta, timestamp: now() }];
          });
        }

        // 3. Audio Streaming (Base64 -> PCM16 -> Float32)
        if (msg.type === "response.audio.delta") {
            const binaryString = atob(msg.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

            if (!outputAudioCtxRef.current) return;
            const audioBuffer = outputAudioCtxRef.current.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            
            const source = outputAudioCtxRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioCtxRef.current.destination);
            
            const startTime = Math.max(outputAudioCtxRef.current.currentTime, nextPlayTimeRef.current);
            source.start(startTime);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;
        }

        // 4. Client-side Tool Interception
        if (msg.type === "response.function_call_arguments.done") {
           const { name, arguments: args, call_id } = msg;
           let parsedArgs = {};
           try { parsedArgs = JSON.parse(args); } catch(x){}

           const toolRes = await fetch('/api/realtime/execute', { 
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ toolName: name, args: parsedArgs, farmSchema })
           });
           const { result } = await toolRes.json();
           
           try {
              const resObj = JSON.parse(result);
              if (resObj.command && onActuatorCommand) {
                 onActuatorCommand(resObj.command);
              }
              if (resObj.capture_requested && onCaptureSchematic) {
                 const freshImg = await onCaptureSchematic();
                 if (freshImg) baselineImage.current = freshImg;
              }
           } catch(err) { /* Not a JSON result */ }

           if(ws.readyState === WebSocket.OPEN) {
               ws.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                     type: "function_call_output",
                     call_id: call_id,
                     output: result
                  }
               }));
               ws.send(JSON.stringify({ type: "response.create" }));
           }
        }

        // 5. Cleanup temporary message ID
        if (msg.type === "response.done") {
          setMessages(prev => {
             const last = prev[prev.length - 1];
             if (last && last.id === 'uma-live') {
                return [...prev.slice(0, -1), { ...last, id: `uma-${Date.now()}` }];
             }
             return prev;
          });
        }
      };

      ws.onerror = () => stopRealtimeRecording();
      ws.onclose = () => setIsListening(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8.byteLength; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)));
        }
        const b64 = btoa(binary);

        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: b64 }));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (e: any) {
      console.warn('Realtime connection failed:', e);
      setIsListening(false);
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`, role: 'assistant',
        content: 'Failed to connect to Azure Realtime WS endpoint. Check credentials.',
        timestamp: now()
      }]);
    }
  };

  const stopRealtimeRecording = () => {
    setIsListening(false);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(()=>{});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(()=>{});
      outputAudioCtxRef.current = null;
    }
  };

  const toggleListening = () => {
    if (isListening) stopRealtimeRecording();
    else startRealtimeRecording();
  };

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: now(),
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      // Attach pre-captured baseline schematic image to the schema
      const schemaWithImage = farmSchema && baselineImage.current
        ? { ...farmSchema, schematicImage: baselineImage.current }
        : farmSchema;

      const gptRes = await generateChatResponse(
        newMsgs.map(m => ({ role: m.role, content: m.content })),
        schemaWithImage,
      );
      
      const reply = gptRes?.choices?.[0]?.message?.content || 'I wasn\'t able to process that request. Please try again.';

      // Execute any actuator commands Uma issued
      if (gptRes?.actuatorCommands && onActuatorCommand) {
        for (const cmd of gptRes.actuatorCommands) {
          onActuatorCommand(cmd);
        }
      }

      // Handle schematic capture requests from Uma — refresh the baseline
      if (gptRes?.captureRequested && onCaptureSchematic) {
        const freshImg = await onCaptureSchematic();
        if (freshImg) {
          baselineImage.current = freshImg;
        }
      }
      
      const assistantMsg: Message = {
        id: `uma-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: now(),
      };

      setMessages([...newMsgs, assistantMsg]);

      // Voice output
      if (voiceEnabled) {
        try {
          setIsSpeaking(true);
          const url = await generateSpeechUrl(reply.slice(0, 500)); // Limit TTS length
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play();
            audioRef.current.onended = () => setIsSpeaking(false);
          }
        } catch {
          setIsSpeaking(false);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([...newMsgs, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I\'m having trouble connecting to my systems right now. Please check the Azure OpenAI endpoint configuration and try again.',
        timestamp: now(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, voiceEnabled, farmSchema, onActuatorCommand, onCaptureSchematic]);

  const suggestions = [
    'What sensors are currently active on the farm?',
    'Show me the latest telemetry readings',
    'Explain optimal pH for leafy greens',
    'What\'s the ideal nutrient EC for tomatoes?',
  ];

  return (
    <div className="chat-container">
      {/* ── Header ── */}
      <div className="chat-header animate-in">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Uma Chat</h1>
          <p className="page-subtitle">
            Engage with Uma through natural language. She can query your database, analyze sensor data, and provide agricultural expertise.
          </p>
        </div>
        <div className="chat-header-actions">
          <button
            className={`btn btn-ghost btn-icon ${voiceEnabled ? 'voice-active' : ''}`}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* ── Chat Body ── */}
      <div className="chat-body glass-panel animate-in animate-in-delay-1">

        {/* Messages */}
        <div className="chat-messages" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'assistant' ? (
                  <div className="avatar-uma">
                    <Leaf size={16} />
                  </div>
                ) : (
                  <div className="avatar-user">
                    <User size={16} />
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-name">
                    {msg.role === 'assistant' ? 'Uma' : 'You'}
                  </span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-body">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="chat-message assistant">
              <div className="message-avatar">
                <div className="avatar-uma thinking">
                  <Leaf size={16} />
                </div>
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-name">Uma</span>
                </div>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="speaking-indicator">
              <Mic size={12} />
              Uma is speaking...
            </div>
          )}
        </div>

        {/* Quick suggestions (only when few messages) */}
        {messages.length <= 1 && !loading && (
          <div className="chat-suggestions">
            <div className="suggestions-label">
              <Sparkles size={12} /> Try asking
            </div>
            <div className="suggestions-grid">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <form onSubmit={sendMessage} className="chat-input-bar">
          <div className="chat-input-wrap">
            <Database size={16} className="chat-input-prefix" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Uma anything about your farm..."
              className="chat-input"
              disabled={loading}
            />
            {hasSpeechRecognition && (
              <button
                type="button"
                className={`btn btn-ghost btn-icon chat-mic ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={loading}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                <Mic size={16} className={isListening ? 'pulse' : ''} />
              </button>
            )}
            <button
              type="submit"
              className={`btn btn-primary btn-icon chat-send ${!input.trim() ? 'disabled' : ''}`}
              disabled={!input.trim() || loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="chat-input-hint">
            Uma has access to your GraphQL database and can execute queries autonomously.
          </div>
        </form>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
