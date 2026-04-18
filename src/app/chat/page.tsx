"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { generateChatResponse, generateSpeechUrl } from '@/lib/ai';
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

export default function Chat() {
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      const gptRes = await generateChatResponse(
        newMsgs.map(m => ({ role: m.role, content: m.content }))
      );
      
      const reply = gptRes?.choices?.[0]?.message?.content || 'I wasn\'t able to process that request. Please try again.';
      
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
  }, [input, loading, messages, voiceEnabled]);

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
