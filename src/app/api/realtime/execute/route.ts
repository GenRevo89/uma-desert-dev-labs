import { NextResponse } from 'next/server';
import { executeTool } from '@/lib/uma-core';

export async function POST(req: Request) {
  try {
    const { toolName, args, farmSchema } = await req.json();
    const result = await executeTool(toolName, args, req.url, farmSchema);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Realtime Tool Exec Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
