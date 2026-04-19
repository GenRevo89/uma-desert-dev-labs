import { NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════════════════
   UMA MONITORING — Autonomous Intervention via LLM Reasoning
   
   Called by the simulation when Uma is active and a sensor
   exceeds its operational range. Uma receives the full sensor
   snapshot including per-row and humidity zone data, reasons
   about the best corrective strategy, and returns structured
   actions for all actuators. Supports vision input for disease
   diagnosis and tool calls for work order dispatch.
   ══════════════════════════════════════════════════════════════ */

function buildMonitorInstructions(teamWorkers: any[]): string {
  let teamSection: string;
  if (teamWorkers.length > 0) {
    const roster = teamWorkers.map((w: any) => `- ${w.name} (${w.role}, ${w.email})`).join('\n');
    teamSection = `KEY PERSONNEL:\n${roster}\n\nWhen a condition requires physical human intervention (disease treatment, manual inspection, equipment repair, biological pest control), you MUST issue a work order by calling the issue_work_order tool and assigning it to the most appropriate team member based on their role and expertise.`;
  } else {
    teamSection = `KEY PERSONNEL:\nNo team members currently registered. If human intervention is needed, note it in your analysis but do not attempt to issue work orders.`;
  }

  return `You are Uma, an expert AI agricultural intelligence managing an advanced vertical hydroponic farm's control systems in real-time.

You have just been alerted to a sensor anomaly or plant disease. You will receive the full sensor state snapshot across all zones and context about what triggered the alert. If a side-by-side comparison image of a healthy vs diseased plant is provided, use it to visually confirm the diagnosis and assess severity.

FARM LAYOUT — 5 ZipGrow Towers:
- Tower T1: Butterhead Lettuce (pH 5.5–6.5, EC 0.8–1.2, RH 60–70%)  → Humidity Zone A
- Tower T2: Genovese Basil (pH 5.5–6.5, EC 1.0–1.6, RH 55–65%)     → Humidity Zone A
- Tower T3: Cherry Tomatoes (pH 5.8–6.3, EC 2.0–3.5, RH 60–75%)    → Humidity Zone B
- Tower T4: Tuscan Kale (pH 5.5–6.5, EC 1.5–2.5, RH 55–70%)       → Humidity Zone B
- Tower T5: Strawberries (pH 5.5–6.2, EC 1.0–1.5, RH 60–70%)      → Humidity Zone B

${teamSection}

SENSOR ARCHITECTURE (22 SENSORS):
System Level (7):
  - Reservoir: pH, EC, Water Temp, Dissolved O₂, Flow Rate
  - Ambient: Room Humidity, PAR (LED intensity)
Per-Row (3 × 5 = 15):
  - pH at feed input (per tower)
  - EC at drain runoff (per tower)
  - Canopy RH (per tower, local relative humidity at plant level)

ACTUATOR ARCHITECTURE:
System Level:
  - pH-down doser (phosphoric acid) / pH-up doser (potassium hydroxide)
  - Nutrient A & B concentrate dosers / RO water dilution valve
  - Air stone pump (dissolved O₂)
  - Main circulation pump (flow rate)
  - LED dimmer (PAR intensity)
  - Chiller / Heater (water temp)
Per-Row (5):
  - Feed solenoid valve (open/close nutrient delivery per tower)
Humidity Zone (2 zones):
  - Zone A humidifier + Zone A dehumidifier (serves T1, T2)
  - Zone B humidifier + Zone B dehumidifier (serves T3, T4, T5)
  Note: Humidifier and dehumidifier are mutually exclusive per zone.

OPERATIONAL RANGES (equilibrium → acceptable range):
- Reservoir pH: 6.0 (5.5–6.5)
- Water Temp: 24.0°C (20–28°C)
- Room Humidity: 68% (55–75%)
- EC: 1.8 mS/cm (1.2–2.5 mS/cm)
- Dissolved O₂: 8.2 mg/L (6.0–10.0 mg/L)
- Flow Rate: 2.4 L/min (1.5–3.5 L/min)
- PAR Intensity: 450 µmol (300–550 µmol)

DISEASE MANAGEMENT PROTOCOLS:
- Pythium Root Rot: Reduce water temp <22°C, increase O₂, add H₂O₂ at 3mL/L, increase flow. Requires physical root zone inspection.
- Powdery Mildew: Reduce zone humidity via dehumidifier, increase airflow, reduce PAR. Requires foliar treatment application.
- Botrytis Gray Mold: Lower zone humidity <65%, increase ventilation, potassium bicarbonate spray. Requires manual infected tissue removal.
- Calcium Tipburn: Reduce EC, slow growth, increase airflow around affected row. Requires physical leaf inspection.
- Fusarium Wilt: Sterilize reservoir with UV/ozone, lower water temp, flush system. Requires reservoir sterilization procedure.
- Aphid Infestation: Neem oil foliar, reduce zone humidity. Requires beneficial insect deployment or manual pesticide application.

INTERVENTION PHILOSOPHY:
1. ALWAYS try the least invasive approach first (airflow before chemicals)
2. For diseases, prefer environmental corrections (temp, humidity, flow) before chemical treatments
3. Consider crop-specific tolerances — tomatoes handle higher EC than lettuce
4. Cross-sensor interactions: diluting with RO water fixes both high EC AND high pH
5. Use targeted per-row interventions when possible (close valve on affected row) rather than system-wide changes
6. Engage zone-level humidity actuators strategically — humidifier/dehumidifier are mutually exclusive per zone
7. When RH is out of range for a row, engage the zone's humidifier or dehumidifier, not per-row
8. If only one row in a zone needs correction but another doesn't, consider whether the zone actuator would harm the healthy row
9. Be specific about what actuator you're engaging and why
10. If multiple sensors are out of range, address the root cause first
11. Be concise but authoritative — you are a precision instrument
12. ALWAYS issue a work order for conditions requiring human intervention using the issue_work_order tool, selecting the best-fit team member by role

Respond with a JSON object:
{
  "analysis": "Brief root cause analysis (1-2 sentences)",
  "strategy": "Your chosen intervention strategy and why you picked it over alternatives",
  "actions": [
    { "sensor": "ph|ec|temp|do2|flow|humidity|light|T1_ph|T2_ec|zoneA_rh|...", "target": 6.0, "actuator": "Name of actuator engaged", "detail": "What you're doing" }
  ],
  "actuatorCommands": [
    { "target": "valve|zone_humidifier|zone_dehumidifier|ph_doser|nutrient_doser|ro_valve|air_pump|circulation_pump|led_dimmer|chiller", "id": "T1|A|B|system", "action": "open|close|on|off|purge|dose_up|dose_down" }
  ],
  "narration": "A natural spoken sentence for voice output (what you'd say out loud to the farm operator)"
}`;
}

const WORK_ORDER_TOOL = {
  type: 'function' as const,
  name: 'issue_work_order',
  description: 'Create and dispatch a work order to a farm team member for physical intervention. This sends an email notification to the assigned worker.',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Category of work order (e.g., "Disease Treatment", "Equipment Repair", "Crop Inspection", "Pest Control", "Reservoir Maintenance")',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the work to be performed, including location (tower ID), condition details, and specific instructions',
      },
      assignedTo: {
        type: 'string',
        description: 'Full name of the team member to assign from the KEY PERSONNEL list provided',
      },
      assignedEmail: {
        type: 'string',
        description: 'Email address of the assigned team member',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Priority level based on severity and urgency',
      },
    },
    required: ['type', 'description', 'assignedTo', 'assignedEmail', 'priority'],
  },
};

export async function POST(req: Request) {
  try {
    const { sensorState, triggeredSensor, imageBase64 } = await req.json();

    // Build comprehensive sensor readout
    const lines: string[] = [
      `ALERT: ${triggeredSensor} has exceeded its operational range.`,
      '',
      'RESERVOIR SENSORS:',
      `  pH: ${sensorState.ph?.toFixed?.(2) ?? 'N/A'}`,
      `  EC: ${sensorState.ec?.toFixed?.(2) ?? 'N/A'} mS/cm`,
      `  Water Temp: ${sensorState.temp?.toFixed?.(1) ?? 'N/A'}°C`,
      `  Dissolved O₂: ${sensorState.do2?.toFixed?.(1) ?? 'N/A'} mg/L`,
      `  Flow Rate: ${sensorState.flow?.toFixed?.(2) ?? 'N/A'} L/min`,
      '',
      'AMBIENT SENSORS:',
      `  Room Humidity: ${sensorState.humidity?.toFixed?.(0) ?? 'N/A'}%`,
      `  PAR: ${sensorState.light?.toFixed?.(0) ?? 'N/A'} µmol`,
    ];

    // Per-row sensors
    if (sensorState.rows && Array.isArray(sensorState.rows)) {
      lines.push('', 'PER-ROW SENSORS:');
      for (const row of sensorState.rows) {
        lines.push(
          `  ${row.towerId} (${row.crop}, Zone ${row.humidityZone}):`,
          `    pH input: ${row.phInput?.toFixed?.(2) ?? 'N/A'} | EC runoff: ${row.ecRunoff?.toFixed?.(2) ?? 'N/A'} mS/cm | Canopy RH: ${row.rh?.toFixed?.(0) ?? 'N/A'}%`,
          `    Valve: ${row.valveOpen ? 'OPEN' : 'CLOSED'} | Optimal pH: ${row.optimalPh?.[0] ?? '?'}–${row.optimalPh?.[1] ?? '?'} | Optimal EC: ${row.optimalEc?.[0] ?? '?'}–${row.optimalEc?.[1] ?? '?'} | Optimal RH: ${row.optimalRh?.[0] ?? '?'}–${row.optimalRh?.[1] ?? '?'}%`,
        );
      }
    }

    // Humidity zone states
    if (sensorState.humidityZones && Array.isArray(sensorState.humidityZones)) {
      lines.push('', 'HUMIDITY ZONE ACTUATORS:');
      for (const zone of sensorState.humidityZones) {
        lines.push(
          `  Zone ${zone.id} (${zone.label}, towers: ${zone.towerIds?.join(', ')}):`,
          `    Humidifier: ${zone.humidifierOn ? 'ON' : 'OFF'} | Dehumidifier: ${zone.dehumidifierOn ? 'ON' : 'OFF'}`,
        );
      }
    }

    // Disease states
    if (sensorState.diseases && Array.isArray(sensorState.diseases)) {
      const active = sensorState.diseases.filter((d: any) => d.disease);
      if (active.length > 0) {
        lines.push('', 'ACTIVE DISEASES:');
        for (const d of active) {
          lines.push(`  ${d.towerId}: ${d.disease.name} (${d.disease.severity}) — ${d.disease.symptoms}`);
        }
      }
    }
    // Team workers available for work orders
    if (sensorState.teamWorkers && Array.isArray(sensorState.teamWorkers) && sensorState.teamWorkers.length > 0) {
      lines.push('', 'AVAILABLE TEAM MEMBERS:');
      for (const w of sensorState.teamWorkers) {
        lines.push(`  - ${w.name} (${w.role}, ${w.email})`);
      }
    }

    lines.push('', 'Analyze the situation and provide your corrective intervention. If human intervention is required and team members are available, issue a work order using the issue_work_order tool.');

    const userMessage = lines.join('\n');

    // Build instructions with dynamic team roster
    const teamWorkers = sensorState.teamWorkers || [];
    const instructions = buildMonitorInstructions(teamWorkers);

    // Build content array — text + optional image
    const contentParts: any[] = [
      { type: 'input_text', text: userMessage },
    ];

    if (imageBase64) {
      contentParts.push({
        type: 'input_image',
        image_url: imageBase64,
      });
    }

    // Initial API call
    let response = await fetch(process.env.AZURE_OPENAI_ENDPOINT!, {
      method: 'POST',
      headers: {
        'api-key': process.env.AZURE_OPENAI_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        instructions,
        ...(teamWorkers.length > 0 ? { tools: [WORK_ORDER_TOOL] } : {}),
        input: [
          { type: 'message', role: 'user', content: contentParts },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Monitor API Error:', errorText);
      return NextResponse.json({ error: 'Uma monitoring failed' }, { status: response.status });
    }

    let data = await response.json();
    
    // Tool call loop (up to 3 iterations)
    const issuedWorkOrders: any[] = [];
    let iterations = 0;

    while (iterations < 3) {
      const output = data.output || [];
      const toolCalls = output.filter((item: any) => item.type === 'function_call');
      
      if (toolCalls.length === 0) break;
      iterations++;

      // Process each tool call
      const toolResults: any[] = [];
      for (const tc of toolCalls) {
        if (tc.name === 'issue_work_order') {
          let args;
          try {
            args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments;
          } catch {
            args = {};
          }

          const orderId = `WO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          // Dispatch email via work order API
          try {
            await fetch(new URL('/api/workorder', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId,
                type: args.type,
                description: args.description,
                assignedTo: args.assignedTo,
                assignedEmail: args.assignedEmail,
                priority: args.priority,
              }),
            });
          } catch (emailErr) {
            console.error('Work order dispatch failed:', emailErr);
          }

          issuedWorkOrders.push({
            type: args.type || 'General',
            description: args.description || 'Work order issued',
            assignedTo: args.assignedTo || 'Unassigned',
            priority: args.priority || 'medium',
          });

          toolResults.push({
            type: 'function_call_output',
            call_id: tc.call_id,
            output: JSON.stringify({ success: true, orderId, message: `Work order ${orderId} created and email notification dispatched to ${args.assignedEmail}` }),
          });
        }
      }

      if (toolResults.length === 0) break;

      // Continue conversation with tool results
      response = await fetch(process.env.AZURE_OPENAI_ENDPOINT!, {
        method: 'POST',
        headers: {
          'api-key': process.env.AZURE_OPENAI_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          instructions,
          tools: teamWorkers.length > 0 ? [WORK_ORDER_TOOL] : [],
          input: [
            { type: 'message', role: 'user', content: contentParts },
            ...output,
            ...toolResults,
          ],
        }),
      });

      if (!response.ok) break;
      data = await response.json();
    }

    // Extract final message
    const finalOutput = data.output || [];
    const messageItems = finalOutput.filter((item: any) => item.type === 'message');

    let responseText = '';
    if (messageItems.length > 0) {
      const content = messageItems[0].content;
      if (Array.isArray(content)) {
        responseText = content.map((c: any) => c.text || '').join('');
      } else if (typeof content === 'string') {
        responseText = content;
      }
    }

    // Try to parse as JSON, fall back to raw text
    let parsed;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
      parsed = JSON.parse(jsonMatch[1] || responseText);
    } catch {
      parsed = {
        analysis: responseText,
        strategy: responseText,
        actions: [],
        narration: responseText.slice(0, 200),
      };
    }

    // Attach issued work orders
    if (issuedWorkOrders.length > 0) {
      parsed.issuedWorkOrders = issuedWorkOrders;
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Monitor Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
