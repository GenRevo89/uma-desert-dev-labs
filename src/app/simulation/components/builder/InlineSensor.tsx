import React from 'react';

export interface InlineSensorProps {
  x: number;
  y: number;
  sensorType: string; // 'pH' | 'EC' | 'Temp' | 'DO2' | 'Flow' | 'PAR' | 'RH' | 'Moisture'
  value?: number;
  status?: 'nominal' | 'warning' | 'danger';
}

const SENSOR_COLORS: Record<string, { nominal: string; warning: string; danger: string }> = {
  pH:       { nominal: '#22c55e', warning: '#f59e0b', danger: '#f43f5e' },
  EC:       { nominal: '#22c55e', warning: '#f59e0b', danger: '#f43f5e' },
  Temp:     { nominal: '#22c55e', warning: '#f59e0b', danger: '#f43f5e' },
  DO2:      { nominal: '#22c55e', warning: '#f59e0b', danger: '#f43f5e' },
  Flow:     { nominal: '#3b82f6', warning: '#f59e0b', danger: '#f43f5e' },
  PAR:      { nominal: '#facc15', warning: '#f59e0b', danger: '#f43f5e' },
  RH:       { nominal: '#8b5cf6', warning: '#f59e0b', danger: '#f43f5e' },
  Moisture: { nominal: '#06b6d4', warning: '#f59e0b', danger: '#f43f5e' },
};

const SENSOR_DEFAULTS: Record<string, number> = {
  pH: 6.0, EC: 1.8, Temp: 22.0, DO2: 7.5, Flow: 2.5, PAR: 450, RH: 65, Moisture: 45,
};

export default function InlineSensor({ x, y, sensorType, value, status = 'nominal' }: InlineSensorProps) {
  const colors = SENSOR_COLORS[sensorType] || SENSOR_COLORS.pH;
  const color = colors[status];
  const fillBg = `${color}20`;
  const displayValue = value ?? SENSOR_DEFAULTS[sensorType] ?? 0;

  // Derived label
  const unitMap: Record<string, string> = {
    pH: '', EC: 'mS', Temp: '°C', DO2: 'mg/L', Flow: 'L/m', PAR: 'µmol', RH: '%', Moisture: '%',
  };
  const unit = unitMap[sensorType] || '';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Alarm ring */}
      {status === 'danger' && (
        <circle cx="0" cy="0" r="22" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" className="sensor-alarm-ring" />
      )}

      {/* Main circle */}
      <circle cx="0" cy="0" r="16" fill={fillBg} stroke={color} strokeWidth="2" />

      {/* Label */}
      <text x="0" y="-3" textAnchor="middle" fill={color} fontSize="6" fontWeight="700">
        {sensorType === 'DO2' ? 'O₂' : sensorType}
      </text>

      {/* Value */}
      <text x="0" y="7" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono, monospace">
        {displayValue.toFixed(sensorType === 'PAR' || sensorType === 'RH' || sensorType === 'Moisture' ? 0 : 1)}
      </text>

      {/* Unit label below */}
      {unit && (
        <text x="0" y="24" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="5" fontWeight="600">
          {unit}
        </text>
      )}
    </g>
  );
}
