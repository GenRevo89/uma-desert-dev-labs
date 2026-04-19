import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: 'Azure OpenAI Realtime configuration missing in environment' }, { status: 500 });
  }

  // Swap https:// for wss://
  const wssUrl = url.replace(/^http/, 'ws');

  return NextResponse.json({
    url: wssUrl,
    key: key
  });
}
