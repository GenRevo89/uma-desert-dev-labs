import { NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════════════════
   UMA CHAT — Schema-Driven AI with Dynamic Prompt Assembly

   The frontend sends an optional `farmSchema` object alongside
   messages. When present, Uma's system prompt is dynamically
   assembled from the loaded digital twin schematic. This makes
   Uma portable across any farm configuration.
   ══════════════════════════════════════════════════════════════ */

import { buildSystemPrompt, TOOLS, executeTool } from '@/lib/uma-core';

/* ── POST Handler ── */

export async function POST(req: Request) {
  try {
    const { messages, farmSchema, language } = await req.json();

    // Build dynamic system prompt from the loaded schematic
    let systemPrompt = buildSystemPrompt(farmSchema);
    
    // Universally enforce natural voice narration format
    systemPrompt += `\n\nCRITICAL NARRATION FORMAT:
- Do NOT use structural headings or prefixes (e.g. "Diagnosis:", "Action taken:", "Diagnóstico:").
- Do NOT use bullet points or markdown lists.
- Speak your response in a single, continuous, natural conversational flow as a script for a voice actor.`;
    
    if (language && language !== 'English') {
      systemPrompt += `\n\nCRITICAL LANGUAGE OVERRIDE:
- You must respond to all prompts and narrations entirely in ${language}.
- Tools and system actions will return execution notes in English. You MUST translate these actions natively into ${language} before incorporating them into your speech.
- NEVER switch back to English under any circumstances. Keep the same concise, authoritative tone.`;
    }

    // Build Responses API input
    const input: any[] = [];

    // Inject schematic image as visual context
    if (farmSchema?.schematicImage) {
      input.push({
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_image', image_url: { url: farmSchema.schematicImage } },
          { type: 'input_text', text: '[SYSTEM] Live capture of the farm schematic. Cross-reference visual sensor colors (green=nominal, amber=warning, red=danger) with the numeric readings in your system prompt.' },
        ],
      });
    }

    // Convert chat messages to Responses API format
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        input.push({
          type: 'message',
          role: msg.role,
          content: msg.content,
        });
      }
    }

    let finalText = '';
    const actuatorCommands: any[] = [];
    const issuedWorkOrders: any[] = [];
    const restoredTowers: string[] = [];
    let captureRequested = false;

    // Multi-step tool loop (max 6 iterations)
    for (let i = 0; i < 6; i++) {
      const requestBody = {
          model: 'gpt-5.4-mini',
          instructions: systemPrompt,
          input,
          tools: TOOLS,
        };
        const bodyStr = JSON.stringify(requestBody);
        // Debug: log the structure of input (truncate image data)
        const debugInput = input.map((item: any) => {
          if (item.content && Array.isArray(item.content)) {
            return { ...item, content: item.content.map((c: any) => c.type === 'input_image' ? { type: c.type, image_url: (c.image_url || '').substring(0, 50) + '...' } : c) };
          }
          return { ...item, content: typeof item.content === 'string' ? item.content.substring(0, 100) + '...' : item.content };
        });
        console.log('Uma API Input:', JSON.stringify(debugInput, null, 2));
        console.log(`Uma API Request: ${input.length} input items, ${(bodyStr.length / 1024).toFixed(0)}KB payload`);
        
        const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT!, {
        method: 'POST',
        headers: {
          'api-key': process.env.AZURE_OPENAI_KEY!,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure OpenAI Error:', errorText);
        return NextResponse.json(
          { error: 'Failed to communicate with AI', details: errorText },
          { status: response.status }
        );
      }

      const data = await response.json();
      const output = data.output || [];

      const functionCalls = output.filter((item: any) => item.type === 'function_call');
      const messageItems = output.filter((item: any) => item.type === 'message');

      if (functionCalls.length > 0) {
        for (const item of output) {
          input.push(item);
        }

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(
          functionCalls.map(async (fc: any) => {
            const args = (() => { try { return JSON.parse(fc.arguments || '{}'); } catch { return {}; } })();
            console.log(`Uma tool call: ${fc.name}(${JSON.stringify(args)})`);

            const result = await executeTool(fc.name, args, req.url, farmSchema);

            // Collect side-effect signals
            if (fc.name === 'control_actuator') actuatorCommands.push(args);
            if (fc.name === 'capture_schematic') captureRequested = true;
            if (fc.name === 'issue_work_order') {
              try {
                const parsedResult = JSON.parse(result);
                if (parsedResult.executed && parsedResult.workOrder) {
                  issuedWorkOrders.push(parsedResult.workOrder);
                }
              } catch (e) {}
            }
            if (fc.name === 'restore_crop_health') {
              try {
                const parsedResult = JSON.parse(result);
                if (parsedResult.restore_crop_requested && parsedResult.towerId) {
                  restoredTowers.push(parsedResult.towerId);
                }
              } catch (e) {}
            }

            return { call_id: fc.call_id, output: result };
          })
        );

        // Append all results to input
        for (const tr of toolResults) {
          input.push({
            type: 'function_call_output',
            call_id: tr.call_id,
            output: tr.output,
          });
        }

        continue;
      }

      // No function calls — extract text response
      if (messageItems.length > 0) {
        const content = messageItems[0].content;
        if (Array.isArray(content)) {
          finalText = content.map((c: any) => c.text || '').join('');
        } else if (typeof content === 'string') {
          finalText = content;
        }
      }

      break;
    }

    // Return response with any actuator commands that need frontend execution
    return NextResponse.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: finalText || 'I processed your request but have no additional commentary.',
          }
        }
      ],
      // Actuator commands Uma issued during this conversation turn
      actuatorCommands: actuatorCommands.length > 0 ? actuatorCommands : undefined,
      // Work orders issued
      issuedWorkOrders: issuedWorkOrders.length > 0 ? issuedWorkOrders : undefined,
      // Towers restored
      restoredTowers: restoredTowers.length > 0 ? restoredTowers : undefined,
      // Whether Uma requested a fresh schematic capture
      captureRequested: captureRequested || undefined,
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
