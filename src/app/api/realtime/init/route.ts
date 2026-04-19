import { NextResponse } from 'next/server';
import { buildSystemPrompt, TOOLS } from '@/lib/uma-core';

export async function POST(req: Request) {
  try {
    const { farmSchema, language } = await req.json();

    const url = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Azure OpenAI Realtime configuration missing in environment' }, { status: 500 });
    }

    const wssUrl = url.replace(/^http/, 'ws');
    
    let systemPrompt = buildSystemPrompt(farmSchema);
    
    // Adapt prompt for real-time natural voice constraints
    systemPrompt += `\n\nCRITICAL REALTIME VOICE INSTRUCTIONS:
- Speak concisely and swiftly as a highly advanced conversational AI.
- You are directly wired into the user's audio channel. Do not announce your actions unless extremely helpful, just execute tools seamlessly in conversation.
- If the user issues a command, use your tools immediately. When the tool returns, briefly confirm the result.
- IMPORTANT: DO NOT use markdown, emojis, asterisks, or any non-pronounceable symbols.`;

    if (language && language !== 'English') {
        systemPrompt += `\n\nCRITICAL LANGUAGE OVERRIDE:
- You must respond to all spoken prompts and narrations entirely in ${language}.
- Tools and system actions will return execution notes in English. You MUST translate these actions natively into ${language} before incorporating them into your speech.
- NEVER switch back to English under any circumstances. Keep the same concise, authoritative tone.`;
    }

    return NextResponse.json({
      url: wssUrl,
      key: key,
      systemPrompt: systemPrompt,
      tools: TOOLS
    });
  } catch (err) {
    return NextResponse.json({ error: 'Initialization Failed' }, { status: 500 });
  }
}
