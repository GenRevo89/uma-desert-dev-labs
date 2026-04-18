import { NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════════════════
   UMA CHAT — Schema-Driven AI with Dynamic Prompt Assembly

   The frontend sends an optional `farmSchema` object alongside
   messages. When present, Uma's system prompt is dynamically
   assembled from the loaded digital twin schematic. This makes
   Uma portable across any farm configuration.
   ══════════════════════════════════════════════════════════════ */

/* ── Dynamic Prompt Builder ── */

function buildSystemPrompt(farmSchema?: any): string {
  const base = `You are Uma, an advanced AI agricultural intelligence. You manage vertical hydroponic farms with precision autonomy. You have direct sensor database access via GraphQL tools and can issue actuator commands.

CORE CAPABILITIES:
- Query real-time and historical sensor data from the database
- Issue actuator commands (valves, humidity zone controls, dosing pumps)
- Diagnose crop health issues from sensor patterns
- Provide expert guidance on hydroponic agriculture, nutrient management, and environmental controls

PERSONALITY:
- Concise, authoritative, data-driven
- You are a precision instrument, not a chatbot
- Reference specific sensor values when making recommendations
- When users ask about status, ALWAYS query live data first — never guess`;

  if (!farmSchema) {
    return base + `\n\nNo digital twin is currently loaded. You can still answer general agricultural questions and query the sensor database.`;
  }

  const sections: string[] = [base, '', '═══ LOADED DIGITAL TWIN SCHEMATIC ═══'];

  // Crops / Rows
  if (farmSchema.rows && Array.isArray(farmSchema.rows) && farmSchema.rows.length > 0) {
    sections.push('', 'FARM LAYOUT:');
    for (const r of farmSchema.rows) {
      sections.push(
        `  ${r.towerId}: ${r.crop} (Zone ${r.humidityZone})`,
        `    pH range: ${r.optimalPh?.[0]}–${r.optimalPh?.[1]} | EC range: ${r.optimalEc?.[0]}–${r.optimalEc?.[1]} mS/cm | RH range: ${r.optimalRh?.[0]}–${r.optimalRh?.[1]}%`,
      );
    }
  }

  // Sensor inventory
  const sensorCount = {
    reservoir: farmSchema.reservoir ? Object.keys(farmSchema.reservoir).length : 0,
    ambient: farmSchema.ambient ? Object.keys(farmSchema.ambient).length : 0,
    perRow: (farmSchema.rows?.length || 0) * 3, // pH, EC, RH per row
  };
  const total = sensorCount.reservoir + sensorCount.ambient + sensorCount.perRow;
  sections.push(
    '', `SENSOR INVENTORY (${total} total):`,
    `  System Level: ${sensorCount.reservoir} reservoir sensors + ${sensorCount.ambient} ambient sensors`,
    `  Per-Row: ${sensorCount.perRow} sensors (pH input, EC runoff, Canopy RH × ${farmSchema.rows?.length || 0} rows)`,
  );

  if (farmSchema.reservoir) {
    sections.push('', 'RESERVOIR SENSORS (current readings):');
    for (const [key, val] of Object.entries(farmSchema.reservoir)) {
      const units: Record<string, string> = { ph: 'pH', ec: 'mS/cm', temp: '°C', do2: 'mg/L', flow: 'L/min' };
      sections.push(`  ${key}: ${(val as number).toFixed(2)} ${units[key] || ''}`);
    }
  }

  if (farmSchema.ambient) {
    sections.push('', 'AMBIENT SENSORS (current readings):');
    for (const [key, val] of Object.entries(farmSchema.ambient)) {
      const units: Record<string, string> = { humidity: '%', light: 'µmol' };
      sections.push(`  ${key}: ${(val as number).toFixed(key === 'light' ? 0 : 1)} ${units[key] || ''}`);
    }
  }

  if (farmSchema.rows && farmSchema.rows.length > 0) {
    sections.push('', 'PER-ROW SENSORS (current readings):');
    for (const r of farmSchema.rows) {
      sections.push(
        `  ${r.towerId} (${r.crop}): pH=${r.phInput?.toFixed(2)} | EC=${r.ecRunoff?.toFixed(2)} | RH=${r.rh?.toFixed(0)}% | Valve=${r.valveOpen ? 'OPEN' : 'CLOSED'}`,
      );
    }
  }

  // Actuator architecture
  sections.push(
    '', 'ACTUATOR ARCHITECTURE:',
    '  System Level: pH-down doser, pH-up doser, Nutrient A doser, Nutrient B doser, RO dilution valve, Air stone pump, Main circulation pump, LED dimmer, Chiller/Heater',
    `  Per-Row (${farmSchema.rows?.length || 0}): Feed solenoid valves (open/close nutrient delivery per tower)`,
  );

  if (farmSchema.humidityZones && farmSchema.humidityZones.length > 0) {
    sections.push(`  Humidity Zones (${farmSchema.humidityZones.length}):`);
    for (const z of farmSchema.humidityZones) {
      sections.push(
        `    Zone ${z.id} "${z.label}" (towers: ${z.towerIds?.join(', ')}): Humidifier=${z.humidifierOn ? 'ON' : 'OFF'} | Dehumidifier=${z.dehumidifierOn ? 'ON' : 'OFF'}`,
      );
    }
    sections.push('    Note: Humidifier and dehumidifier are mutually exclusive per zone.');
  }

  // Active diseases
  if (farmSchema.diseases && farmSchema.diseases.length > 0) {
    const active = farmSchema.diseases.filter((d: any) => d.disease);
    if (active.length > 0) {
      sections.push('', 'ACTIVE DISEASES:');
      for (const d of active) {
        sections.push(`  ${d.towerId}: ${d.disease.name} (${d.disease.severity}) — ${d.disease.symptoms}`);
      }
    }
  }

  // Intervention guidelines (real-world vertical farm practices)
  sections.push(
    '', 'INTERVENTION GUIDELINES:',
    '',
    'CRITICAL — UNDERSTAND THE PLUMBING:',
    '  - pH and EC corrections are CENTRALIZED at the reservoir/mixing tank via dosing pumps.',
    '  - Per-tower pH sensors are DIAGNOSTIC — they show if feed reaches each tower correctly.',
    '  - Per-tower EC runoff sensors reveal nutrient uptake patterns and potential lockout.',
    '  - You correct pH/EC at the SOURCE (reservoir), not at individual towers.',
    '  - Closing a feed valve STARVES roots of water and oxygen — it is a DESTRUCTIVE action, not corrective.',
    '  - Valves are for FLOW SCHEDULING (drip timing, irrigation cycles), not isolation during corrections.',
    '  - The only valid reason to close a valve is scheduled irrigation pauses or maintenance shutdowns.',
    '',
    'CORRECTION HIERARCHY (least invasive first):',
    '  1. Adjust dosing pumps at reservoir level (pH-up, pH-down, nutrient A/B, RO dilution)',
    '  2. Modify environmental controls (chiller, fans, zone humidity actuators)',
    '  3. Adjust flow rate (pump speed) to improve nutrient distribution',
    '  4. Adjust LED intensity for transpiration/growth rate control',
    '  5. Zone humidity actuators for RH corrections (humidifier/dehumidifier)',
    '  6. Valve adjustments ONLY for scheduled flow management, never as a corrective measure',
    '',
    'CROSS-SENSOR AWARENESS:',
    '  - RO water dilution fixes BOTH high EC AND high pH simultaneously',
    '  - Temperature rise → dissolved O₂ drops → root health degrades → pH drifts',
    '  - High RH + poor airflow → fungal disease conditions',
    '  - If per-tower pH differs from reservoir pH, suspect a clog or biofilm, not a dosing issue',
    '',
    'When issuing actuator commands, use the control_actuator tool.',
    'Always explain your reasoning and how it connects to the sensor readings.',
  );

  return sections.join('\n');
}

/* ── Tool Definitions ── */

const TOOLS = [
  {
    type: "function" as const,
    name: "query_sensors",
    description: "Fetch all configured sensors from the database. Returns sensor type, status, and installation date. Use when asked about hardware inventory or farm configuration.",
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
    }
  },
  {
    type: "function" as const,
    name: "query_telemetry",
    description: "Fetch recent telemetry events (spikes, anomalies, corrections, disease injections). Use when asked about recent events, alerts, history, or trends.",
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
    description: "Add a new sensor to the farm configuration database.",
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
    description: "Log a telemetry event or observation to the database.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Event type, e.g. 'manual_observation', 'correction', 'alert'" },
        value: { type: "number", description: "Numeric value associated with the event" },
        message: { type: "string", description: "Description of the event" },
      },
      required: ["type", "value", "message"],
    }
  },
  {
    type: "function" as const,
    name: "get_farm_summary",
    description: "Get a complete summary of the farm: total sensors, recent events, system status. Use this for general status checks or when greeting the user.",
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
    }
  },
  {
    type: "function" as const,
    name: "control_actuator",
    description: "Issue an actuator command. Supported targets: 'valve' (per-row feed valve), 'zone_humidifier' (zone-level humidifier), 'zone_dehumidifier' (zone-level dehumidifier). The frontend simulation will execute the command.",
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "The actuator type: 'valve', 'zone_humidifier', 'zone_dehumidifier', 'ph_doser', 'nutrient_doser', 'ro_valve', 'air_pump', 'circulation_pump', 'led_dimmer', or 'chiller'",
          enum: ["valve", "zone_humidifier", "zone_dehumidifier", "ph_doser", "nutrient_doser", "ro_valve", "air_pump", "circulation_pump", "led_dimmer", "chiller"],
        },
        id: {
          type: "string",
          description: "The target ID. For valves: tower ID (e.g., 'T1'). For zone actuators: zone ID (e.g., 'A' or 'B'). For system actuators: 'system'.",
        },
        action: {
          type: "string",
          description: "The action to perform: 'on', 'off', 'open', 'close', 'purge', 'dose_up', or 'dose_down'",
          enum: ["on", "off", "open", "close", "purge", "dose_up", "dose_down"],
        },
        reason: {
          type: "string",
          description: "Brief explanation of why this command is being issued",
        },
      },
      required: ["target", "id", "action", "reason"],
    }
  },
  {
    type: "function" as const,
    name: "read_sensor",
    description: "Read the current value of a specific sensor from the loaded digital twin. Use this to get precise live readings before making recommendations. Sensor types: 'reservoir_ph', 'reservoir_ec', 'reservoir_temp', 'reservoir_do2', 'reservoir_flow', 'ambient_humidity', 'ambient_light', or per-row: '{towerId}_ph', '{towerId}_ec', '{towerId}_rh' (e.g., 'T1_ph', 'T3_rh').",
    parameters: {
      type: "object",
      properties: {
        sensor: {
          type: "string",
          description: "Sensor identifier, e.g. 'reservoir_ph', 'T1_ph', 'T3_rh', 'ambient_humidity'",
        },
      },
      required: ["sensor"],
    }
  },
  {
    type: "function" as const,
    name: "capture_schematic",
    description: "Request a fresh screenshot of the farm schematic from the digital twin simulation. Returns a signal for the frontend to capture and provide the image. Use this when you need to visually inspect the current state of the farm layout, sensor positions, flow animations, or zone health colors.",
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
    }
  },
];

/* ── Tool Execution ── */

async function executeGraphQL(baseUrl: string, query: string) {
  const res = await fetch(new URL('/api/graphql', baseUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

function readSensorFromSchema(sensor: string, farmSchema?: any): string {
  if (!farmSchema) return JSON.stringify({ error: 'No digital twin loaded. Cannot read live sensor values.' });

  // Reservoir sensors
  if (sensor.startsWith('reservoir_')) {
    const key = sensor.replace('reservoir_', '');
    const val = farmSchema.reservoir?.[key];
    if (val !== undefined) {
      const units: Record<string, string> = { ph: 'pH', ec: 'mS/cm', temp: '°C', do2: 'mg/L', flow: 'L/min' };
      return JSON.stringify({ sensor, value: val, unit: units[key] || '', status: 'ok' });
    }
  }

  // Ambient sensors
  if (sensor.startsWith('ambient_')) {
    const key = sensor.replace('ambient_', '');
    const val = farmSchema.ambient?.[key];
    if (val !== undefined) {
      const units: Record<string, string> = { humidity: '%', light: 'µmol' };
      return JSON.stringify({ sensor, value: val, unit: units[key] || '', status: 'ok' });
    }
  }

  // Per-row sensors: T1_ph, T3_rh, etc.
  const rowMatch = sensor.match(/^(T\d+)_(ph|ec|rh)$/);
  if (rowMatch && farmSchema.rows) {
    const [, towerId, type] = rowMatch;
    const row = farmSchema.rows.find((r: any) => r.towerId === towerId);
    if (row) {
      const fieldMap: Record<string, string> = { ph: 'phInput', ec: 'ecRunoff', rh: 'rh' };
      const unitMap: Record<string, string> = { ph: 'pH', ec: 'mS/cm', rh: '%' };
      const val = row[fieldMap[type]];
      const optimal = type === 'ph' ? row.optimalPh : type === 'ec' ? row.optimalEc : row.optimalRh;
      return JSON.stringify({
        sensor, towerId, crop: row.crop, value: val,
        unit: unitMap[type], optimal, valveOpen: row.valveOpen,
        humidityZone: row.humidityZone, status: 'ok',
      });
    }
  }

  return JSON.stringify({ error: `Unknown sensor: ${sensor}` });
}

async function executeTool(toolName: string, args: any, baseUrl: string, farmSchema?: any): Promise<string> {
  try {
    switch (toolName) {
      case 'query_sensors': {
        const data = await executeGraphQL(baseUrl, `query { getSensors { id type status addedAt } }`);
        return JSON.stringify(data);
      }
      case 'query_telemetry': {
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

        const summary: any = {
          sensors: sensorCount,
          recentEvents: eventCount,
          sensorList: sensors?.data?.getSensors || [],
          recentTelemetry: telemetry?.data?.getTelemetry?.slice(0, 5) || [],
          status: sensorCount > 0 ? 'operational' : 'no_sensors_configured',
        };

        // Append digital twin summary if loaded
        if (farmSchema?.rows) {
          summary.digitalTwin = {
            loaded: true,
            towers: farmSchema.rows.length,
            crops: farmSchema.rows.map((r: any) => `${r.towerId}: ${r.crop}`),
            humidityZones: farmSchema.humidityZones?.length || 0,
            totalSensors: (farmSchema.reservoir ? Object.keys(farmSchema.reservoir).length : 0) +
                          (farmSchema.ambient ? Object.keys(farmSchema.ambient).length : 0) +
                          (farmSchema.rows.length * 3),
            activeDiseases: farmSchema.diseases?.filter((d: any) => d.disease).length || 0,
          };
        }

        return JSON.stringify(summary);
      }
      case 'read_sensor': {
        return readSensorFromSchema(args.sensor, farmSchema);
      }
      case 'control_actuator': {
        // Return a structured command for the frontend to execute
        return JSON.stringify({
          executed: true,
          command: {
            target: args.target,
            id: args.id,
            action: args.action,
            reason: args.reason,
          },
          note: 'Command queued for frontend execution. The simulation will apply this on the next tick.',
        });
      }
      case 'capture_schematic': {
        // Signal the frontend to capture a fresh schematic screenshot
        return JSON.stringify({
          capture_requested: true,
          note: 'Frontend will capture the schematic and provide it as an image in the next message. The image shows the live state of sensor positions, flow animations, zone health colors, and actuator states.',
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

/* ── POST Handler ── */

export async function POST(req: Request) {
  try {
    const { messages, farmSchema } = await req.json();

    // Build dynamic system prompt from the loaded schematic
    const systemPrompt = buildSystemPrompt(farmSchema);

    // Build Responses API input
    const input: any[] = [];

    // Inject schematic image as visual context
    if (farmSchema?.schematicImage) {
      input.push({
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_image', image_url: farmSchema.schematicImage },
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
    let captureRequested = false;

    // Multi-step tool loop (max 6 iterations)
    for (let i = 0; i < 6; i++) {
      const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT!, {
        method: 'POST',
        headers: {
          'api-key': process.env.AZURE_OPENAI_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          instructions: systemPrompt,
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
      // Whether Uma requested a fresh schematic capture
      captureRequested: captureRequested || undefined,
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
