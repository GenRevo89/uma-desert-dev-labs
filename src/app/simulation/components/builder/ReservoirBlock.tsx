import React from 'react';

/* ── Slot Definition ── */
export interface SlotDef {
  slotId: string;
  slotType: 'dosing' | 'air' | 'sensor' | 'pump';
  label: string;
  occupied: boolean;
  occupantType?: string;
  occupantOptions?: any;
}

/* ── Default Reservoir Slots ── */
export const DEFAULT_RESERVOIR_SLOTS: SlotDef[] = [
  { slotId: 'dosing-1', slotType: 'dosing', label: 'DOSE 1', occupied: false },
  { slotId: 'dosing-2', slotType: 'dosing', label: 'DOSE 2', occupied: false },
  { slotId: 'dosing-3', slotType: 'dosing', label: 'DOSE 3', occupied: false },
  { slotId: 'dosing-4', slotType: 'dosing', label: 'DOSE 4', occupied: false },
  { slotId: 'air',      slotType: 'air',    label: 'AIR',    occupied: false },
  { slotId: 'pump',     slotType: 'pump',   label: 'PUMP',   occupied: false },
  { slotId: 'sensor-ph',   slotType: 'sensor', label: 'pH',   occupied: false },
  { slotId: 'sensor-ec',   slotType: 'sensor', label: 'EC',   occupied: false },
  { slotId: 'sensor-temp', slotType: 'sensor', label: 'TEMP', occupied: false },
  { slotId: 'sensor-do2',  slotType: 'sensor', label: 'O₂',   occupied: false },
  { slotId: 'sensor-flow', slotType: 'sensor', label: 'FLOW', occupied: false },
];

/* ── Dosing Preset Colors ── */
const DOSING_COLORS: Record<string, { color: string; fill: string }> = {
  'pH Down':    { color: 'rgba(244,63,94,0.7)',  fill: 'rgba(244,63,94,0.2)' },
  'pH Up':      { color: 'rgba(59,130,246,0.7)',  fill: 'rgba(59,130,246,0.2)' },
  'Nutrient A': { color: 'rgba(34,197,94,0.7)',   fill: 'rgba(34,197,94,0.2)' },
  'Nutrient B': { color: 'rgba(245,158,11,0.7)',  fill: 'rgba(245,158,11,0.2)' },
};

/* ── Slot Position Maps (relative to reservoir origin) ── */
const DOSING_POSITIONS = [
  { x: 10,  y: 32 },
  { x: 60,  y: 32 },
  { x: 110, y: 32 },
  { x: 160, y: 32 },
];

const SENSOR_POSITIONS: Record<string, { x: number; y: number }> = {
  'sensor-ph':   { x: 30,  y: 230 },
  'sensor-ec':   { x: 80,  y: 230 },
  'sensor-temp': { x: 130, y: 230 },
  'sensor-do2':  { x: 180, y: 230 },
  'sensor-flow': { x: 105, y: 305 },
};

const AIR_POS   = { x: 20,  y: 275 };
const PUMP_POS  = { x: 130, y: 275 };

/* ── Port positions for pipe connections (relative to node origin) ── */
export const RESERVOIR_PORTS = {
  waterOut: { x: 210, y: 290 },  // right side, near pump
  waterIn:  { x: 10,  y: 290 },  // left side, near air pump/drainage return
};

interface ReservoirBlockProps {
  slots: SlotDef[];
  isAerated: boolean;
  flowRate: number;
  isSelected: boolean;
}

export default function ReservoirBlock({ slots, isAerated, flowRate, isSelected }: ReservoirBlockProps) {
  const waterHeight = Math.min(100, 100 * (flowRate / 3));
  const waterY = 180 - waterHeight;
  const dosingSlots = slots.filter(s => s.slotType === 'dosing');
  const sensorSlots = slots.filter(s => s.slotType === 'sensor');
  const airSlot = slots.find(s => s.slotId === 'air');
  const pumpSlot = slots.find(s => s.slotId === 'pump');

  return (
    <g>
      {/* ═══ MAIN BODY ═══ */}
      <rect x={0} y={0} width={220} height={320} rx={12}
        fill="rgba(10,16,26,0.9)"
        stroke={isSelected ? 'var(--accent)' : 'rgba(59,130,246,0.3)'}
        strokeWidth={isSelected ? 2 : 1.5}
      />

      {/* Header */}
      <rect x={0} y={0} width={220} height={22} rx={12}
        fill="rgba(59,130,246,0.15)"
      />
      <rect x={0} y={11} width={220} height={11}
        fill="rgba(59,130,246,0.15)"
      />
      <text x={110} y={15} textAnchor="middle" fill="rgba(59,130,246,0.85)" fontSize="8" fontWeight="800" letterSpacing="1.5">
        NUTRIENT RESERVOIR
      </text>

      {/* ═══ DOSING BAYS ═══ */}
      <text x={110} y={30} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="5" fontWeight="700" letterSpacing="1">
        DOSING INPUTS
      </text>
      {dosingSlots.map((slot, i) => {
        const pos = DOSING_POSITIONS[i];
        if (!pos) return null;
        const preset = slot.occupied ? DOSING_COLORS[slot.occupantOptions?.dosingType || 'Nutrient A'] : null;

        return (
          <g key={slot.slotId} data-slot-id={slot.slotId} data-slot-type="dosing">
            {slot.occupied && preset ? (
              /* Filled dosing slot */
              <g>
                <rect x={pos.x} y={pos.y} width={42} height={20} rx={4}
                  fill={preset.fill} stroke={preset.color} strokeWidth="1.5" className="actuator-pulse"
                />
                <text x={pos.x + 21} y={pos.y + 13} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="5.5" fontWeight="700">
                  {slot.occupantOptions?.dosingType?.toUpperCase().substring(0, 8) || 'DOSE'}
                </text>
              </g>
            ) : (
              /* Empty dosing bay — dashed placeholder */
              <g className="slot-empty">
                <rect x={pos.x} y={pos.y} width={42} height={20} rx={4}
                  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 3"
                />
                <text x={pos.x + 21} y={pos.y + 13} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="5" fontWeight="600">
                  {slot.label}
                </text>
                <line x1={pos.x + 15} y1={pos.y + 7} x2={pos.x + 27} y2={pos.y + 7} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <line x1={pos.x + 21} y1={pos.y + 4} x2={pos.x + 21} y2={pos.y + 10} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              </g>
            )}
          </g>
        );
      })}

      {/* ═══ TANK BODY ═══ */}
      <rect x={15} y={60} width={190} height={130} rx={8}
        fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="1"
      />
      {/* Water level */}
      <rect x={18} y={waterY + 60} width={184} height={waterHeight > 0 ? Math.min(waterHeight, 124) : 0} rx={4}
        fill="rgba(59,130,246,0.15)" className="reservoir-water"
      />
      {/* Aeration bubbles */}
      {isAerated && [40, 75, 110, 145].map((bx, i) => (
        <circle key={`b-${i}`} cx={bx} cy={155} r="2.5"
          fill="rgba(139,92,246,0.5)" className="air-particle"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}

      {/* ═══ SENSOR RING ═══ */}
      <text x={110} y={218} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="5" fontWeight="700" letterSpacing="1">
        SENSOR RING
      </text>
      {sensorSlots.map(slot => {
        const pos = SENSOR_POSITIONS[slot.slotId];
        if (!pos) return null;
        const sensorType = slot.occupantOptions?.sensorType || slot.label;

        return (
          <g key={slot.slotId} data-slot-id={slot.slotId} data-slot-type="sensor">
            {slot.occupied ? (
              <g>
                <circle cx={pos.x} cy={pos.y} r="13" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5" />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fill="#22c55e" fontSize="5" fontWeight="700">{sensorType}</text>
                <text x={pos.x} y={pos.y + 6} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                  —
                </text>
              </g>
            ) : (
              <g className="slot-empty">
                <circle cx={pos.x} cy={pos.y} r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontWeight="600">{slot.label}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* ═══ SUB-EQUIPMENT BAYS ═══ */}
      <text x={110} y={266} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="5" fontWeight="700" letterSpacing="1">
        EQUIPMENT
      </text>

      {/* Air Pump Slot */}
      <g data-slot-id="air" data-slot-type="air">
        {airSlot?.occupied ? (
          <g>
            <rect x={AIR_POS.x} y={AIR_POS.y} width={55} height={22} rx={4}
              fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" className="actuator-pulse"
            />
            <text x={AIR_POS.x + 27} y={AIR_POS.y + 14} textAnchor="middle" fill="rgba(139,92,246,0.9)" fontSize="6" fontWeight="700">AIR PUMP</text>
          </g>
        ) : (
          <g className="slot-empty">
            <rect x={AIR_POS.x} y={AIR_POS.y} width={55} height={22} rx={4}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3"
            />
            <text x={AIR_POS.x + 27} y={AIR_POS.y + 14} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="6" fontWeight="600">AIR</text>
          </g>
        )}
      </g>

      {/* Water Pump Slot */}
      <g data-slot-id="pump" data-slot-type="pump">
        {pumpSlot?.occupied ? (
          <g>
            <rect x={PUMP_POS.x} y={PUMP_POS.y} width={55} height={22} rx={4}
              fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" className="pump-pulse"
            />
            <text x={PUMP_POS.x + 27} y={PUMP_POS.y + 14} textAnchor="middle" fill="rgba(59,130,246,0.9)" fontSize="6" fontWeight="700">PUMP</text>
          </g>
        ) : (
          <g className="slot-empty">
            <rect x={PUMP_POS.x} y={PUMP_POS.y} width={55} height={22} rx={4}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3"
            />
            <text x={PUMP_POS.x + 27} y={PUMP_POS.y + 14} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="6" fontWeight="600">PUMP</text>
          </g>
        )}
      </g>

      {/* ═══ WATER OUTPUT PORT ═══ */}
      <circle cx={RESERVOIR_PORTS.waterOut.x} cy={RESERVOIR_PORTS.waterOut.y} r={8}
        fill="rgba(59,130,246,0.2)" stroke="rgba(59,130,246,0.6)" strokeWidth="2"
        className="cursor-crosshair"
      />
      <text x={RESERVOIR_PORTS.waterOut.x} y={RESERVOIR_PORTS.waterOut.y + 3} textAnchor="middle" fill="rgba(59,130,246,0.8)" fontSize="5" fontWeight="800">▸</text>
      <text x={RESERVOIR_PORTS.waterOut.x} y={RESERVOIR_PORTS.waterOut.y + 18} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="600">OUT</text>

      {/* ═══ WATER INPUT PORT ═══ */}
      <circle cx={RESERVOIR_PORTS.waterIn.x} cy={RESERVOIR_PORTS.waterIn.y} r={8}
        fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.6)" strokeWidth="2"
        className="cursor-crosshair"
      />
      <text x={RESERVOIR_PORTS.waterIn.x} y={RESERVOIR_PORTS.waterIn.y + 3} textAnchor="middle" fill="rgba(34,197,94,0.8)" fontSize="5" fontWeight="800">▸</text>
      <text x={RESERVOIR_PORTS.waterIn.x} y={RESERVOIR_PORTS.waterIn.y + 18} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="600">IN</text>
    </g>
  );
}

/* ── Slot Hit-Testing Utility ── */
export function getReservoirSlotAt(localX: number, localY: number, slots: SlotDef[]): SlotDef | null {
  // Check dosing bays
  for (let i = 0; i < Math.min(slots.filter(s => s.slotType === 'dosing').length, 4); i++) {
    const pos = DOSING_POSITIONS[i];
    const slot = slots.filter(s => s.slotType === 'dosing')[i];
    if (!slot?.occupied && localX >= pos.x && localX <= pos.x + 42 && localY >= pos.y && localY <= pos.y + 20) {
      return slot;
    }
  }

  // Check sensor slots
  for (const slot of slots.filter(s => s.slotType === 'sensor')) {
    const pos = SENSOR_POSITIONS[slot.slotId];
    if (!pos) continue;
    if (!slot.occupied && Math.hypot(localX - pos.x, localY - pos.y) < 18) {
      return slot;
    }
  }

  // Check air slot
  const airSlot = slots.find(s => s.slotId === 'air');
  if (airSlot && !airSlot.occupied && localX >= AIR_POS.x && localX <= AIR_POS.x + 55 && localY >= AIR_POS.y && localY <= AIR_POS.y + 22) {
    return airSlot;
  }

  // Check pump slot
  const pumpSlot = slots.find(s => s.slotId === 'pump');
  if (pumpSlot && !pumpSlot.occupied && localX >= PUMP_POS.x && localX <= PUMP_POS.x + 55 && localY >= PUMP_POS.y && localY <= PUMP_POS.y + 22) {
    return pumpSlot;
  }

  return null;
}
