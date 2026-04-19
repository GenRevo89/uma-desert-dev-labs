import React from 'react';
import type { SlotDef } from './ReservoirBlock';

/* ── Default Tower Slots ── */
export const DEFAULT_TOWER_SLOTS: SlotDef[] = [
  { slotId: 'sensor-ph',  slotType: 'sensor', label: 'pH',  occupied: false },
  { slotId: 'sensor-rh',  slotType: 'sensor', label: 'RH',  occupied: false },
  { slotId: 'sensor-ec',  slotType: 'sensor', label: 'EC',  occupied: false },
];

/* ── Sensor Slot Positions (relative to tower center, y from top) ── */
const TOWER_SENSOR_POSITIONS: Record<string, { x: number; y: number }> = {
  'sensor-ph': { x: -35, y: 95 },
  'sensor-rh': { x: 35,  y: 95 },
  'sensor-ec': { x: 0,   y: 460 },
};

/* ── Port positions for pipe connections (relative to node origin) ── */
export const TOWER_PORTS = {
  waterIn:  { x: 60, y: 0 },    // top center
  waterOut: { x: 60, y: 500 },  // bottom center
};

interface TowerBlockProps {
  towerId: string;
  cropName: string;
  emoji: string;
  slots: SlotDef[];
  valveOpen: boolean;
  healthStatus: 'nominal' | 'warning' | 'danger';
  fluidColor: string;
  isSelected: boolean;
  i: number;
  onValveClick?: () => void;
}

export default function TowerBlock({
  towerId, cropName, emoji, slots, valveOpen,
  healthStatus, fluidColor, isSelected, i, onValveClick
}: TowerBlockProps) {
  const tColor = healthStatus === 'danger' ? '#f43f5e' : healthStatus === 'warning' ? '#f59e0b' : '#22c55e';
  const tankColor = healthStatus === 'danger' ? 'rgba(244,63,94,0.1)' : healthStatus === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.04)';
  const zFill = healthStatus === 'danger' ? 'rgba(244,63,94,0.1)' : healthStatus === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.04)';
  const zStroke = healthStatus === 'danger' ? 'rgba(244,63,94,0.35)' : healthStatus === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.15)';

  return (
    <g>
      {/* ═══ WATER INPUT PORT ═══ */}
      <circle cx={TOWER_PORTS.waterIn.x} cy={TOWER_PORTS.waterIn.y} r={8}
        fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.6)" strokeWidth="2"
        className="cursor-crosshair"
      />
      <text x={TOWER_PORTS.waterIn.x} y={TOWER_PORTS.waterIn.y - 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="600">IN</text>

      {/* ═══ OUTER ZONE ═══ */}
      <rect x={0} y={20} width={120} height={470} rx={10}
        fill={zFill} stroke={isSelected ? 'var(--accent)' : zStroke}
        strokeWidth={isSelected ? 2 : 1} strokeDasharray={isSelected ? 'none' : '4 3'}
      />

      {/* Tower ID + Crop Label */}
      <text x={60} y={38} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6" fontWeight="700" letterSpacing="0.5">
        {towerId} · {cropName}
      </text>

      {/* ═══ SENSOR BAYS ═══ */}
      {slots.map(slot => {
        const pos = TOWER_SENSOR_POSITIONS[slot.slotId];
        if (!pos) return null;
        const absX = 60 + pos.x; // relative to tower center
        const absY = pos.y;

        return (
          <g key={slot.slotId} data-slot-id={slot.slotId} data-slot-type="sensor">
            {slot.occupied ? (
              <g>
                <circle cx={absX} cy={absY} r="13" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5" />
                <text x={absX} y={absY - 2} textAnchor="middle" fill="#22c55e" fontSize="5" fontWeight="700">
                  {slot.occupantOptions?.sensorType || slot.label}
                </text>
                <text x={absX} y={absY + 6} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                  —
                </text>
              </g>
            ) : (
              <g className="slot-empty">
                <circle cx={absX} cy={absY} r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                <text x={absX} y={absY + 3} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="5" fontWeight="600">{slot.label}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* ═══ FEED VALVE ═══ */}
      <g 
        onMouseDown={(e) => e.stopPropagation()} 
        onClick={(e) => { e.stopPropagation(); if (onValveClick) onValveClick(); }} 
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <rect x={52} y={114} width={16} height={8} rx={2}
          fill={valveOpen ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)'}
          stroke={valveOpen ? '#22c55e' : '#f43f5e'} strokeWidth="1.5"
        />
        <text x={60} y={121} textAnchor="middle" fill={valveOpen ? '#4ade80' : '#fb7185'} fontSize="4" fontWeight="800">
          {valveOpen ? 'OPEN' : 'SHUT'}
        </text>
      </g>

      {/* ═══ TOWER HOUSING ═══ */}
      <rect x={42} y={130} width={36} height={310} rx={4}
        fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="2"
      />

      {/* Root media core */}
      <rect x={48} y={136} width={24} height={298} rx={2} fill={tankColor} />

      {/* Fluid drip animation */}
      {valveOpen && (
        <g>
          <line x1={60} y1={140} x2={60} y2={430} stroke={fluidColor} strokeWidth="2" strokeOpacity="0.4" />
          <line x1={60} y1={140} x2={60} y2={430} stroke="rgba(255,255,255,0.85)" strokeWidth="1" className="flow-anim-v" style={{ animationDelay: `${0.8 * i}s` }} />
          <line x1={54} y1={160} x2={54} y2={410} stroke={fluidColor} strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1={66} y1={150} x2={66} y2={420} stroke={fluidColor} strokeWidth="1.5" strokeOpacity="0.3" />
        </g>
      )}

      {/* Grow slots */}
      {[135, 155, 175, 195, 215, 235, 255, 275, 295, 315, 335, 355, 375].map((sy, j) => (
        <rect key={j} x={46} y={sy} width={28} height={9} rx={4}
          fill={`${tColor}12`} stroke={`${tColor}35`} strokeWidth="0.8"
        />
      ))}

      {/* Crop emoji */}
      <text x={60} y={408} textAnchor="middle" fontSize="16">{emoji}</text>

      {/* ═══ WATER OUTPUT PORT ═══ */}
      <circle cx={TOWER_PORTS.waterOut.x} cy={TOWER_PORTS.waterOut.y} r={8}
        fill="rgba(6,182,212,0.2)" stroke="rgba(6,182,212,0.6)" strokeWidth="2"
        className="cursor-crosshair"
      />
      <text x={TOWER_PORTS.waterOut.x} y={TOWER_PORTS.waterOut.y + 18} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="4.5" fontWeight="600">OUT</text>
    </g>
  );
}

/* ── Slot Hit-Testing Utility ── */
export function getTowerSlotAt(localX: number, localY: number, slots: SlotDef[]): SlotDef | null {
  for (const slot of slots) {
    const pos = TOWER_SENSOR_POSITIONS[slot.slotId];
    if (!pos) continue;
    const absX = 60 + pos.x;
    const absY = pos.y;
    if (!slot.occupied && Math.hypot(localX - absX, localY - absY) < 18) {
      return slot;
    }
  }
  return null;
}
