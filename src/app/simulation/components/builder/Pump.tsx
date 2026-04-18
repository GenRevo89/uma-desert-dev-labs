import React from 'react';

interface PumpProps {
  x: number;
  y: number;
  label: string;
  type: 'air' | 'water';
  isActive?: boolean;
}

export default function Pump({ x, y, label, type, isActive = true }: PumpProps) {
  const isAir = type === 'air';
  const color = isAir ? 'rgba(139,92,246,1)' : 'rgba(59,130,246,1)';
  const dimColor = isAir ? 'rgba(139,92,246,0.4)' : 'rgba(59,130,246,0.4)';
  const fill = isAir ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)';
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect 
        x="0" y="0" width="55" height="22" rx="4" 
        fill={fill} stroke={isActive ? color : dimColor} 
        className={isActive && !isAir ? "pump-pulse" : ""}
      />
      <text x="27" y="14" textAnchor="middle" fill={isActive ? color : dimColor} fontSize="6" fontWeight="700">
        {label}
      </text>
      <line 
        x1="27" y1="0" x2="27" y2="-20" 
        stroke={isActive ? color : dimColor} 
        strokeWidth={isAir ? "1.5" : "2"} 
        strokeDasharray={isAir ? "3 2" : "none"} 
        className={isActive && !isAir ? "flow-anim-v-up" : ""}
      />
    </g>
  );
}
