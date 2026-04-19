import {
  Droplets, Thermometer, Wind, Zap, Waves, Gauge, Sun,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   SENSOR TYPES
   ═══════════════════════════════════════════ */

export type ReservoirKey = 'ph' | 'ec' | 'temp' | 'do2' | 'flow';
export type AmbientKey = 'humidity' | 'light';
export type SensorStatus = 'nominal' | 'warning' | 'danger';

export type LogEntry = {
  time: string;
  msg: string;
  type: 'info' | 'warning' | 'success' | 'danger';
};

export type Bottleneck = {
  sensor: string;
  severity: number;
  message: string;
};

export type TeamWorker = {
  id: string;
  name: string;
  role: 'Agronomist' | 'Technician' | 'Harvester' | 'Manager';
  email: string;
};

export type WorkOrder = {
  id: string;
  type: string;
  description: string;
  assignedTo: string | null;
  status: 'open' | 'completed' | 'verified' | 'escalated';
  createdAt: number;
  reviewed?: boolean;
  reviewResult?: string | null;
  workerNotes?: string | null;
  resolution?: string | null;
};

export type ActiveIntervention = {
  sensor: string;
  actuator: string;
  detail: string;
  startedAt: number;
};

/* ═══════════════════════════════════════════
   PER-ROW SENSOR MODEL
   ═══════════════════════════════════════════ */

export type RowSensors = {
  phInput: number;      // pH at feed input
  ecRunoff: number;     // EC at drain runoff
  rh: number;           // Relative humidity at canopy level
  valveOpen: boolean;   // Feed solenoid valve
};

export type RowZone = {
  towerId: string;
  crop: string;
  emoji: string;
  sensors: RowSensors;
  optimalPh: [number, number];
  optimalEc: [number, number];
  optimalRh: [number, number];
  humidityZone: 'A' | 'B';  // Which humidity control zone this row belongs to
};

/* ═══════════════════════════════════════════
   HUMIDITY ZONE MODEL
   Two zones, each with a shared humidifier
   and dehumidifier serving multiple rows.
   Zone A: T1, T2 (leafy greens)
   Zone B: T3, T4, T5 (fruiting / heavier crops)
   ═══════════════════════════════════════════ */

export type HumidityZone = {
  id: 'A' | 'B';
  label: string;
  towerIds: string[];
  humidifierOn: boolean;
  dehumidifierOn: boolean;
};

export const HUMIDITY_ZONES_DEF: { id: 'A' | 'B'; label: string; towerIds: string[] }[] = [
  { id: 'A', label: 'Zone A · Leafy Greens', towerIds: ['T1', 'T2'] },
  { id: 'B', label: 'Zone B · Fruiting Crops', towerIds: ['T3', 'T4', 'T5'] },
];

/* ═══════════════════════════════════════════
   DISEASE TYPES
   ═══════════════════════════════════════════ */

export type Disease = {
  id: string;
  name: string;
  description: string;
  sensorEffects: { sensor: ReservoirKey; delta: number }[];
  rowEffects?: { phDelta: number; ecDelta: number; rhDelta: number };
  symptoms: string;
  severity: 'moderate' | 'severe' | 'critical';
};

export type TowerCondition = {
  towerId: string;
  disease: Disease | null;
  injectedAt: number | null;
};

/* ═══════════════════════════════════════════
   EQUILIBRIUM CONSTANTS
   ═══════════════════════════════════════════ */

export const RESERVOIR_EQ: Record<ReservoirKey, number> = {
  ph: 6.0, ec: 1.8, temp: 24.0, do2: 8.2, flow: 2.4,
};

export const AMBIENT_EQ: Record<AmbientKey, number> = {
  humidity: 68, light: 450,
};

/* ═══════════════════════════════════════════
   SENSOR METADATA
   ═══════════════════════════════════════════ */

export const RESERVOIR_META: Record<ReservoirKey, {
  label: string; unit: string; icon: any; color: string; bg: string;
  min: number; max: number; dangerLow: number; dangerHigh: number;
}> = {
  ph:   { label: 'pH Level',      unit: 'pH',    icon: Droplets,    color: 'var(--accent)', bg: 'var(--accent-subtle)', min: 4,  max: 10, dangerLow: 5.0, dangerHigh: 7.5 },
  ec:   { label: 'EC Conductivity',unit: 'mS/cm', icon: Zap,         color: 'var(--amber)',  bg: 'var(--amber-subtle)',  min: 0,  max: 5,  dangerLow: 1.0, dangerHigh: 3.0 },
  temp: { label: 'Water Temp',     unit: '°C',    icon: Thermometer, color: 'var(--cyan)',   bg: 'var(--cyan-subtle)',   min: 15, max: 40, dangerLow: 18,  dangerHigh: 30 },
  do2:  { label: 'Dissolved O₂',   unit: 'mg/L',  icon: Waves,       color: 'var(--cyan)',   bg: 'var(--cyan-subtle)',   min: 0,  max: 14, dangerLow: 5.0, dangerHigh: 12.0 },
  flow: { label: 'Flow Rate',      unit: 'L/min', icon: Gauge,       color: 'var(--violet)', bg: 'var(--violet-subtle)', min: 0,  max: 5,  dangerLow: 1.0, dangerHigh: 4.0 },
};

export const AMBIENT_META: Record<AmbientKey, {
  label: string; unit: string; icon: any; color: string; bg: string;
  min: number; max: number; dangerLow: number; dangerHigh: number;
}> = {
  humidity: { label: 'Room Humidity',  unit: '%',    icon: Wind, color: 'var(--violet)', bg: 'var(--violet-subtle)', min: 0, max: 100, dangerLow: 40, dangerHigh: 85 },
  light:   { label: 'PAR Intensity',  unit: 'µmol', icon: Sun,  color: 'var(--amber)',  bg: 'var(--amber-subtle)',  min: 0, max: 800, dangerLow: 200, dangerHigh: 600 },
};

/* ═══════════════════════════════════════════
   TOWER / CROP DEFINITIONS
   Each crop has its own optimal microclimate
   ═══════════════════════════════════════════ */

export const TOWER_CROPS = [
  { id: 'T1', crop: 'Butterhead Lettuce', emoji: '🥬', optimalPh: [5.5, 6.5] as [number, number], optimalEc: [0.8, 1.2] as [number, number], optimalRh: [60, 70] as [number, number], eqPh: 6.0, eqEc: 1.0, eqRh: 65 },
  { id: 'T2', crop: 'Genovese Basil',     emoji: '🌿', optimalPh: [5.5, 6.5] as [number, number], optimalEc: [1.0, 1.6] as [number, number], optimalRh: [55, 65] as [number, number], eqPh: 6.0, eqEc: 1.3, eqRh: 60 },
  { id: 'T3', crop: 'Cherry Tomatoes',    emoji: '🍅', optimalPh: [5.8, 6.3] as [number, number], optimalEc: [2.0, 3.5] as [number, number], optimalRh: [60, 75] as [number, number], eqPh: 6.0, eqEc: 2.8, eqRh: 68 },
  { id: 'T4', crop: 'Tuscan Kale',        emoji: '🥗', optimalPh: [5.5, 6.5] as [number, number], optimalEc: [1.5, 2.5] as [number, number], optimalRh: [55, 70] as [number, number], eqPh: 6.0, eqEc: 2.0, eqRh: 62 },
  { id: 'T5', crop: 'Strawberries',       emoji: '🍓', optimalPh: [5.5, 6.2] as [number, number], optimalEc: [1.0, 1.5] as [number, number], optimalRh: [60, 75] as [number, number], eqPh: 5.8, eqEc: 1.2, eqRh: 67 },
];

/* ═══════════════════════════════════════════
   CASCADE FAILURE RULES
   ═══════════════════════════════════════════ */

export const CASCADE_RULES: {
  trigger: ReservoirKey;
  threshold: number;
  direction: 'above' | 'below';
  effects: { sensor: ReservoirKey; delta: number }[];
  message: string;
}[] = [
  { trigger: 'temp', threshold: 30, direction: 'above', effects: [{ sensor: 'do2', delta: -1.5 }, { sensor: 'flow', delta: -0.2 }], message: 'Heat cascade: dissolved O₂ falling, flow impaired' },
  { trigger: 'ph', threshold: 7.5, direction: 'above', effects: [{ sensor: 'ec', delta: -0.4 }, { sensor: 'flow', delta: -0.3 }], message: 'Alkaline cascade: nutrient lockout, flow reduction' },
  { trigger: 'ec', threshold: 3.0, direction: 'above', effects: [{ sensor: 'ph', delta: 0.8 }, { sensor: 'do2', delta: -0.8 }], message: 'Nutrient overload cascade: pH rising, O₂ depleting' },
];

/* ═══════════════════════════════════════════
   DISEASE CATALOG (with per-row RH effects)
   ═══════════════════════════════════════════ */

export const DISEASE_CATALOG: Disease[] = [
  { id: 'pythium', name: 'Pythium Root Rot', description: 'Oomycete pathogen attacking root zone in warm, stagnant water', sensorEffects: [{ sensor: 'temp', delta: 4 }, { sensor: 'do2', delta: -3 }, { sensor: 'flow', delta: -1 }], rowEffects: { phDelta: 0.8, ecDelta: -0.5, rhDelta: 8 }, symptoms: 'Brown slimy roots, wilting despite adequate water', severity: 'critical' },
  { id: 'powdery_mildew', name: 'Powdery Mildew', description: 'Fungal infection thriving in high humidity with poor airflow', sensorEffects: [{ sensor: 'flow', delta: -0.5 }], rowEffects: { phDelta: 0.3, ecDelta: 0.2, rhDelta: 15 }, symptoms: 'White powdery coating on leaf surfaces', severity: 'moderate' },
  { id: 'botrytis', name: 'Botrytis (Gray Mold)', description: 'Necrotrophic fungus in cool, humid, stagnant conditions', sensorEffects: [{ sensor: 'temp', delta: -3 }], rowEffects: { phDelta: 0.4, ecDelta: 0.3, rhDelta: 18 }, symptoms: 'Gray fuzzy mold on stems and fruit', severity: 'severe' },
  { id: 'tipburn', name: 'Calcium Tipburn', description: 'Calcium deficiency from rapid growth and high EC', sensorEffects: [{ sensor: 'ec', delta: 1.8 }, { sensor: 'temp', delta: 2 }], rowEffects: { phDelta: 0.2, ecDelta: 1.2, rhDelta: -5 }, symptoms: 'Brown necrotic edges on young inner leaves', severity: 'moderate' },
  { id: 'fusarium', name: 'Fusarium Wilt', description: 'Soilborne fungus entering through roots in warm nutrient solution', sensorEffects: [{ sensor: 'temp', delta: 5 }, { sensor: 'ph', delta: 1.5 }, { sensor: 'ec', delta: -0.8 }], rowEffects: { phDelta: 1.5, ecDelta: -0.6, rhDelta: 5 }, symptoms: 'Yellowing, wilting on one side of plant', severity: 'critical' },
  { id: 'aphids', name: 'Aphid Infestation', description: 'Sap-sucking insects weakening plants and spreading viruses', sensorEffects: [{ sensor: 'ec', delta: 0.5 }], rowEffects: { phDelta: 0.2, ecDelta: 0.5, rhDelta: 6 }, symptoms: 'Curled leaves, sticky honeydew, stunted growth', severity: 'severe' },
];

/* ═══════════════════════════════════════════
   HELPER: STATUS FROM VALUE
   ═══════════════════════════════════════════ */

export function getReservoirStatus(key: ReservoirKey, value: number): SensorStatus {
  const meta = RESERVOIR_META[key];
  if (value < meta.dangerLow || value > meta.dangerHigh) return 'danger';
  const eq = RESERVOIR_EQ[key];
  const warnThreshold = key === 'temp' ? 2 : 0.3;
  if (Math.abs(value - eq) > warnThreshold) return 'warning';
  return 'nominal';
}

export function getAmbientStatus(key: AmbientKey, value: number): SensorStatus {
  const meta = AMBIENT_META[key];
  if (value < meta.dangerLow || value > meta.dangerHigh) return 'danger';
  const eq = AMBIENT_EQ[key];
  const warnThreshold = key === 'light' ? 50 : 8;
  if (Math.abs(value - eq) > warnThreshold) return 'warning';
  return 'nominal';
}

export function getRowPhStatus(value: number, optimal: [number, number]): SensorStatus {
  if (value < optimal[0] - 0.8 || value > optimal[1] + 0.8) return 'danger';
  if (value < optimal[0] - 0.3 || value > optimal[1] + 0.3) return 'warning';
  return 'nominal';
}

export function getRowEcStatus(value: number, optimal: [number, number]): SensorStatus {
  if (value < optimal[0] - 0.6 || value > optimal[1] + 0.6) return 'danger';
  if (value < optimal[0] - 0.2 || value > optimal[1] + 0.2) return 'warning';
  return 'nominal';
}

export function getRowRhStatus(value: number, optimal: [number, number]): SensorStatus {
  if (value < optimal[0] - 12 || value > optimal[1] + 12) return 'danger';
  if (value < optimal[0] - 5 || value > optimal[1] + 5) return 'warning';
  return 'nominal';
}

export function getRowHealth(row: RowZone): SensorStatus {
  const ph = getRowPhStatus(row.sensors.phInput, row.optimalPh);
  const ec = getRowEcStatus(row.sensors.ecRunoff, row.optimalEc);
  const rh = getRowRhStatus(row.sensors.rh, row.optimalRh);
  if (ph === 'danger' || ec === 'danger' || rh === 'danger') return 'danger';
  if (ph === 'warning' || ec === 'warning' || rh === 'warning') return 'warning';
  return 'nominal';
}
