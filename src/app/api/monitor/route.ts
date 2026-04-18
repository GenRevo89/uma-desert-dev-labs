import { NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════════════════
   UMA MONITORING — Autonomous Intervention via LLM Reasoning
   
   Called by the simulation when Uma is active and a sensor
   exceeds its operational range. Uma receives the full sensor
   snapshot, reasons about the best corrective strategy, and
   returns structured actions.
   ══════════════════════════════════════════════════════════════ */

const MONITOR_INSTRUCTIONS = `You are Uma, an expert AI agricultural intelligence managing a vertical hydroponic farm's control systems in real-time.

You have just been alerted to a sensor anomaly or plant disease. You will receive the full sensor state snapshot and context about what triggered the alert.

FARM LAYOUT:
- Tower T1: Butterhead Lettuce (pH 5.5-6.5, EC 0.8-1.2)
- Tower T2: Genovese Basil (pH 5.5-6.5, EC 1.0-1.6)
- Tower T3: Cherry Tomatoes (pH 5.8-6.3, EC 2.0-3.5)  
- Tower T4: Tuscan Kale (pH 5.5-6.5, EC 1.5-2.5)
- Tower T5: Strawberries (pH 5.5-6.2, EC 1.0-1.5)

OPERATIONAL RANGES (target → acceptable range):
- pH: 6.0 (5.5–6.5) — adjust with pH-down (phosphoric acid) or pH-up (potassium hydroxide)
- Water Temp: 24.0°C (20–28°C) — adjust via chiller, heater, or airflow modulation
- Humidity: 68% (55–75%) — adjust via dehumidifier, humidifier, or ventilation fans
- EC Conductivity: 1.8 mS/cm (1.2–2.5 mS/cm) — adjust via nutrient concentrate or RO water dilution
- Dissolved O₂: 8.2 mg/L (6.0–10.0 mg/L) — adjust via air stone, water circulation speed
- Flow Rate: 2.4 L/min (1.5–3.5 L/min) — adjust via pump speed
- PAR Intensity: 450 µmol (300–550 µmol) — adjust via LED dimmer

DISEASE MANAGEMENT PROTOCOLS:
- Pythium Root Rot: Reduce water temp to <22°C, increase dissolved O₂ via air stones, add hydrogen peroxide (H₂O₂) at 3mL/L, increase flow rate
- Powdery Mildew: Reduce humidity via exhaust fans, increase airflow, reduce PAR to limit transpiration stress
- Botrytis Gray Mold: Lower humidity to <65%, increase ventilation, remove affected tissue, consider potassium bicarbonate spray
- Calcium Tipburn: Reduce EC, slow growth rate by slightly lowering nutrient concentration, increase airflow around affected leaves
- Fusarium Wilt: Sterilize reservoir with UV or ozone, lower water temp, flush system with clean nutrient solution
- Aphid Infestation: Introduce beneficial insects (lacewings), neem oil foliar spray, reduce humidity to discourage reproduction

INTERVENTION PHILOSOPHY:
1. ALWAYS try the least invasive approach first (adjusting airflow before dosing chemicals)
2. For diseases, prefer environmental corrections (temp, humidity, flow) before chemical treatments
3. Consider crop-specific tolerances — tomatoes handle higher EC than lettuce
4. Consider cross-sensor interactions (e.g., diluting with RO water fixes both high EC AND high pH)
5. Be specific about what you're doing and why
6. Mention the actuator you're engaging (e.g., "engaging the peristaltic acid doser at 2mL/min")
7. If multiple sensors are out of range, address the root cause first
8. Be concise but authoritative — you are a precision instrument

Respond with a JSON object:
{
  "analysis": "Brief root cause analysis (1-2 sentences)",
  "strategy": "Your chosen intervention strategy and why you picked it over alternatives",
  "actions": [
    { "sensor": "ph", "target": 6.0, "actuator": "Name of actuator engaged", "detail": "What you're doing" }
  ],
  "narration": "A natural spoken sentence for voice output (what you'd say out loud to the farm operator)"
}`;

export async function POST(req: Request) {
  try {
    const { sensorState, triggeredSensor } = await req.json();

    const userMessage = `ALERT: ${triggeredSensor} has exceeded its operational range.

Current sensor snapshot:
- pH: ${sensorState.ph.toFixed(2)} pH
- Water Temp: ${sensorState.temp.toFixed(1)}°C
- Humidity: ${sensorState.humidity.toFixed(0)}%
- EC: ${sensorState.ec.toFixed(2)} mS/cm
- Dissolved O₂: ${sensorState.do2.toFixed(1)} mg/L
- Flow Rate: ${sensorState.flow.toFixed(2)} L/min
- PAR: ${sensorState.light.toFixed(0)} µmol

Analyze the situation and provide your corrective intervention.`;

    const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT!, {
      method: 'POST',
      headers: {
        'api-key': process.env.AZURE_OPENAI_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        instructions: MONITOR_INSTRUCTIONS,
        input: [
          { type: 'message', role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Monitor API Error:', errorText);
      return NextResponse.json({ error: 'Uma monitoring failed' }, { status: response.status });
    }

    const data = await response.json();
    const output = data.output || [];
    const messageItems = output.filter((item: any) => item.type === 'message');

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
      // Extract JSON from potential markdown code blocks
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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Monitor Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
