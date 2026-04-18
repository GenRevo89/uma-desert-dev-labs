/**
 * FarmSchema — The digital twin configuration object.
 * Passed to Uma's chat API so her system prompt is dynamically
 * assembled from the loaded schematic. This makes Uma portable
 * across any farm configuration built in the builder.
 */
export interface FarmSchema {
  /** System-level reservoir sensors (name + current value) */
  reservoir?: Record<string, number>;
  /** Ambient environment sensors */
  ambient?: Record<string, number>;
  /** Per-row / per-tower configuration */
  rows?: {
    towerId: string;
    crop: string;
    humidityZone: string;
    phInput: number;
    ecRunoff: number;
    rh: number;
    valveOpen: boolean;
    optimalPh: [number, number];
    optimalEc: [number, number];
    optimalRh: [number, number];
  }[];
  /** Humidity zone actuator states */
  humidityZones?: {
    id: string;
    label: string;
    towerIds: string[];
    humidifierOn: boolean;
    dehumidifierOn: boolean;
  }[];
  /** Active disease states */
  diseases?: {
    towerId: string;
    disease: { name: string; severity: string; symptoms: string } | null;
  }[];
  /** Farm Operations Team */
  teamWorkers?: {
    id: string;
    name: string;
    role: string;
    email: string;
  }[];
  /** Base64 JPEG of the farm schematic SVG (captured from the simulation) */
  schematicImage?: string;
}

export async function generateChatResponse(
  messages: { role: string; content: string }[],
  farmSchema?: FarmSchema,
) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, farmSchema }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate chat response');
  }

  return response.json();
}

export async function generateSpeechUrl(text: string): Promise<string> {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate speech');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
