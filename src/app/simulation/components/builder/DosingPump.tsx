import React from 'react';

interface DosingPumpProps {
  x: number;
  y: number;
  label: string;
  color: string;
  fill: string;
  isActive?: boolean;
}

export default function DosingPump({ x, y, label, color, fill, isActive }: DosingPumpProps) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect 
        x="0" y="0" width="60" height="22" rx="4" 
        fill={fill} stroke={color} 
        strokeWidth={isActive ? "2" : "1"} 
        className={isActive ? "actuator-pulse" : ""} 
      />
      <text x="30" y="14" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6" fontWeight="700">
        {label}
      </text>
      <line 
        x1="60" y1="11" x2="110" y2="11" 
        stroke={color} 
        strokeWidth={isActive ? "2.5" : "1.5"} 
        strokeDasharray={isActive ? "4 4" : "3 2"} 
        className={isActive ? "flow-anim-h" : ""} 
      />
    </g>
  );
}
