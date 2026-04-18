import { NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════════════
   UMA CHAT — Azure OpenAI Responses API with Tool Calling
   ══════════════════════════════════════════════════════════ */

const SYSTEM_PROMPT = `You are Uma, an advanced AI agricultural intelligence that manages a vertical hydroponic farm. You have direct access to the farm's sensor database through GraphQL tools.

Your capabilities:
- Monitor real-time sensor data (pH, temperature, EC, humidity, dissolved oxygen, flow rate)
- Query historical telemetry logs and detect anomalies
- Manage the sensor configuration (add/remove components)
- Provide expert guidance on hydroponic agriculture, nutrient management, and environmental controls
- Diagnose crop health issues based on sensor readings

When users ask about the farm status, sensor readings, or telemetry data, ALWAYS use the query_graphql tool to fetch live data before responding. Never guess sensor values.

Respond concisely and authoritatively. You are a precision instrument, not a chatbot.`;

const TOOLS = [
  {
    type: "function" as const,
    name: "query_sensors",
    description: "Fetch all currently configured sensors from the database. Returns sensor type, status, and when it was added. Use this when the user asks about active hardware, installed sensors, or farm configuration.",
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
    }
  },
  {
    type: "function" as const,
    name: "query_telemetry",
    description: "Fetch the most recent telemetry events (spikes, anomalies, corrections). Returns event type, value, message, and timestamp. Use this when the user asks about recent events, alerts, history, or system health.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of records to fetch. Default 10, max 50." },
      },
      required: [] as string[],
    }
  },
  {
    type: "function" as const,
    name: "add_sensor",
    description: "Add a new sensor to the farm configuration. Use when the user requests adding new hardware.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "The sensor type, e.g. 'pH Sensor (Atlas Scientific EZO-pH)'" },
      },
      required: ["type"],
    }
  },
  {
    type: "function" as const,
    name: "log_telemetry_event",
    description: "Log a manual telemetry event or observation to the database.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Event type, e.g. 'manual_observation'" },
        value: { type: "number", description: "Numeric value associated with the event" },
        message: { type: "string", description: "Description of the event" },
      },
      required: ["type", "value", "message"],
    }
  },
  {
    type: "function" as const,
    name: "get_farm_summary",
    description: "Get a complete summary of the farm including total sensors, recent events count, and system status. Use this for general status checks.",
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
    }
  }
];

async function executeGraphQL(baseUrl: string, query: string) {
  const res = await fetch(new URL('/api/graphql', baseUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function executeTool(toolName: string, args: any, baseUrl: string): Promise<string> {
  try {
    switch (toolName) {
      case 'query_sensors': {
        const data = await executeGraphQL(baseUrl, `query { getSensors { id type status addedAt } }`);
        return JSON.stringify(data);
      }
      case 'query_telemetry': {
        const limit = args?.limit || 10;
        const data = await executeGraphQL(baseUrl, `query { getTelemetry { id type value message timestamp } }`);
        return JSON.stringify(data);
      }
      case 'add_sensor': {
        const data = await executeGraphQL(baseUrl, `mutation { addSensor(type: "${args.type}") { id type status } }`);
        return JSON.stringify(data);
      }
      case 'log_telemetry_event': {
        const data = await executeGraphQL(baseUrl, `mutation { logTelemetry(type: "${args.type}", value: ${args.value}, message: "${args.message}") { id } }`);
        return JSON.stringify(data);
      }
      case 'get_farm_summary': {
        const sensors = await executeGraphQL(baseUrl, `query { getSensors { id type status } }`);
        const telemetry = await executeGraphQL(baseUrl, `query { getTelemetry { id type value timestamp } }`);
        const sensorCount = sensors?.data?.getSensors?.length || 0;
        const eventCount = telemetry?.data?.getTelemetry?.length || 0;
        return JSON.stringify({
          sensors: sensorCount,
          recentEvents: eventCount,
          sensorList: sensors?.data?.getSensors || [],
          recentTelemetry: telemetry?.data?.getTelemetry?.slice(0, 5) || [],
          status: sensorCount > 0 ? 'operational' : 'no_sensors_configured',
        });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Tool execution error [${toolName}]:`, err);
    return JSON.stringify({ error: `Tool ${toolName} failed to execute` });
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Build the input array for the Responses API
    // Every item MUST have a `type` field. System prompt goes in top-level `instructions`.
    const input: any[] = [];

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

    // Multi-step tool loop (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT!, {
        method: 'POST',
        headers: {
          'api-key': process.env.AZURE_OPENAI_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          instructions: SYSTEM_PROMPT,
          input,
          tools: TOOLS,
        }),
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

      // Check for function calls
      const functionCalls = output.filter((item: any) => item.type === 'function_call');
      const messageItems = output.filter((item: any) => item.type === 'message');

      if (functionCalls.length > 0) {
        // There are tool calls — execute them and continue the loop
        // Add all output items to our input for the next turn
        for (const item of output) {
          input.push(item);
        }

        // Execute each function call and append results
        for (const fc of functionCalls) {
          const args = (() => { try { return JSON.parse(fc.arguments || '{}'); } catch { return {}; } })();
          console.log(`Uma tool call: ${fc.name}(${JSON.stringify(args)})`);
          
          const result = await executeTool(fc.name, args, req.url);
          
          input.push({
            type: 'function_call_output',
            call_id: fc.call_id,
            output: result,
          });
        }

        // Continue to next iteration to get the final response
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

    // Return in a format the frontend expects (Chat Completions shape)
    return NextResponse.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: finalText || 'I processed your request but have no additional commentary.',
          }
        }
      ]
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
