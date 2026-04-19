import { NextResponse } from 'next/server';

const VOICE_ID = 'tl7lnnI5ADFNMMxMdzil';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const spokenText = text
      // 1. Math symbols & relational operators
      .replace(/≤/g, " less than or equal to ")
      .replace(/≥/g, " greater than or equal to ")
      .replace(/</g, " less than ")
      .replace(/>/g, " greater than ")
      .replace(/=/g, " equals ")
      .replace(/±/g, " plus or minus ")
      .replace(/%/g, " percent ")
      // Range resolution (e.g., 5.5-6.5 -> 5.5 to 6.5)
      .replace(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/g, "$1 to $2")
      
      // 2. Agricultural & Technical Acronyms (Word bounds)
      .replace(/\bRH\b/g, "relative humidity")
      .replace(/\bEC\b/g, "electrical conductivity")
      .replace(/\bDO\b/g, "dissolved oxygen")
      .replace(/\bVPD\b/g, "vapor pressure deficit")
      .replace(/\bPAR\b/g, "photosynthetically active radiation")
      .replace(/\bDLI\b/g, "daily light integral")
      .replace(/\bORP\b/g, "oxidation-reduction potential")
      .replace(/\bHVAC\b/g, "H V A C")
      .replace(/\bRO\b/g, "reverse osmosis")
      .replace(/\bUV\b/g, "ultraviolet")
      .replace(/\bLED\b/g, "L E D")
      .replace(/\bNPK\b/gi, "N P K")

      // 3. Chemistry (Formulas)
      .replace(/\bH₂O₂\b/g, "hydrogen peroxide")
      .replace(/\bCO₂\b/g, "carbon dioxide")
      .replace(/\bO₂\b/g, "oxygen")
      .replace(/\bDO2\b/gi, "dissolved oxygen")
      
      // 4. Compound Units (must be replaced before simple units to avoid partial matches)
      .replace(/µmol\/m²\/s/gi, "micro-moles per square meter per second")
      .replace(/mol\/m²\/d/gi, "moles per square meter per day")
      .replace(/mS\/cm/gi, "milli-siemens per centimeter")
      .replace(/µS\/cm/gi, "micro-siemens per centimeter")
      .replace(/mg\/L/gi, "milli-grams per liter")
      .replace(/mL\/L/gi, "milli-liters per liter")
      .replace(/L\/min/gi, "liters per minute")
      .replace(/L\/hr?/gi, "liters per hour")
      .replace(/gal\/min/gi, "gallons per minute")
      .replace(/gal\/hr?/gi, "gallons per hour")
      .replace(/m³\/hr?/gi, "cubic meters per hour")
      .replace(/cf\/m/gi, "cubic feet per minute")
      .replace(/\bCFM\b/gi, "cubic feet per minute")
      .replace(/mm\/d/gi, "millimeters per day")
      
      // 5. Basic Units (with number lookbehind or direct replace)
      .replace(/°C/gi, "degrees Celsius")
      .replace(/°F/gi, "degrees Fahrenheit")
      .replace(/µmol/gi, "micro-moles")
      .replace(/(?<=\d)\s*ppm\b/gi, " parts per million")
      .replace(/(?<=\d)\s*ppb\b/gi, " parts per billion")
      .replace(/(?<=\d)\s*kWh\b/gi, " kilowatt-hours")
      .replace(/(?<=\d)\s*kW\b/gi, " kilowatts")
      .replace(/(?<=\d)\s*W\b/g, " watts")
      .replace(/(?<=\d)\s*V\b/g, " volts")
      .replace(/(?<=\d)\s*A\b/g, " amps")
      .replace(/(?<=\d)\s*Hz\b/gi, " hertz")
      .replace(/(?<=\d)\s*kPa\b/gi, " kilopascals")
      .replace(/(?<=\d)\s*psi\b/gi, " P S I")
      .replace(/(?<=\d)\s*kg\b/g, " kilograms")
      .replace(/(?<=\d)\s*mg\b/g, " milligrams")
      .replace(/(?<=\d)\s*µg\b/g, " micrograms")
      .replace(/(?<=\d)\s*g\b/g, " grams")
      .replace(/(?<=\d)\s*cm\b/g, " centimeters")
      .replace(/(?<=\d)\s*mm\b/g, " millimeters")
      .replace(/(?<=\d)\s*m\b/g, " meters")
      .replace(/(?<=\d)\s*L\b/g, " liters")
      .replace(/(?<=\d)\s*mL\b/g, " milliliters");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: `${spokenText} ...`,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Error:', errorText);
      return NextResponse.json({ error: 'Failed to generate speech' }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Voice API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
