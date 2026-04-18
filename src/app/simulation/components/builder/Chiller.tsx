import React from 'react';

interface ChillerProps {
  x: number;
  y: number;
  status: 'nominal' | 'warning' | 'danger';
  isActive: boolean;
}

export default function Chiller({ x, y, status, isActive }: ChillerProps) {
  const isDanger = status === 'danger';
  const color = isDanger ? 'rgba(244,63,94,0.8)' : 'rgba(34,211,238,0.7)';
  const stroke = isDanger ? 'rgba(244,63,94,0.5)' : 'rgba(34,211,238,0.35)';
  const fill = isDanger ? 'rgba(244,63,94,0.15)' : 'rgba(34,211,238,0.1)';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Fans above chiller */}
      {[0, 35].map((fy, i) => (
        <g key={`fan-${i}`} transform={`translate(0, ${fy})`}>
          <circle cx="30" cy="0" r="14" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.35)" />
          {/* Fan blades with animation */}
          <g className={isActive ? "fan-spin" : ""} style={{ transformOrigin: "30px 0px" }}>
            <line x1="30" y1="-10" x2="30" y2="10" stroke="rgba(139,92,246,0.5)" strokeWidth="2" />
            <line x1="20" y1="0" x2="40" y2="0" stroke="rgba(139,92,246,0.5)" strokeWidth="2" />
          </g>
          <circle cx="30" cy="0" r="3" fill="rgba(139,92,246,0.7)" />
        </g>
      ))}

      {/* Chiller Main Body */}
      <rect 
        x="0" y="65" width="60" height="28" rx="4"
        fill={fill} stroke={stroke}
      />
      <text 
        x="30" y="83" textAnchor="middle"
        fill={color} fontSize="7" fontWeight="700"
      >
        CHILLER
      </text>
    </g>
  );
}
