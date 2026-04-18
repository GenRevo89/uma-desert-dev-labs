import React from 'react';

interface ClimateActuatorProps {
  x: number;
  y: number;
  type: 'humidifier' | 'dehumidifier';
  isActive: boolean;
}

export default function ClimateActuator({ x, y, type, isActive }: ClimateActuatorProps) {
  const isHumid = type === 'humidifier';
  const label = isHumid ? 'HUMIDIFY' : 'DEHUMID';
  const color = isHumid ? '#8b5cf6' : '#22d3ee';
  const dimColor = isHumid ? 'rgba(139,92,246,0.25)' : 'rgba(34,211,238,0.25)';
  const fillActive = isHumid ? 'rgba(139,92,246,0.3)' : 'rgba(34,211,238,0.3)';
  const fillDim = isHumid ? 'rgba(139,92,246,0.08)' : 'rgba(34,211,238,0.08)';

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect 
        x="0" y="0" width="60" height="20" rx="3"
        fill={isActive ? fillActive : fillDim}
        stroke={isActive ? color : dimColor}
        className={isActive ? "actuator-pulse" : ""}
      />
      <text 
        x="30" y="13" textAnchor="middle" 
        fill={isActive ? color : isHumid ? 'rgba(139,92,246,0.6)' : 'rgba(34,211,238,0.6)'} 
        fontSize="5" fontWeight="700"
      >
        {label}
      </text>
      {isActive && (
        <circle cx="50" cy="10" r="2.5" fill={color} className="sensor-alarm-ring" />
      )}
    </g>
  );
}
