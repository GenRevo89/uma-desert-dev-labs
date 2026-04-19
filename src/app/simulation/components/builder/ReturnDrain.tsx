import React from 'react';

export interface ReturnDrainProps {
  x: number;
  y: number;
  width: number;
  label: string;
  returnPathD?: string;
  fluidColor: string;
  delay?: string;
}

export default function ReturnDrain({ x, y, width, label, returnPathD, fluidColor, delay = '0s' }: ReturnDrainProps) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={width} height={40} rx={4} fill="rgba(6, 10, 16, 0.85)" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
      <path d={`M 0 3 L ${width} 3`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M 0 3 L ${width} 3`} fill="none" stroke={fluidColor} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.4" />
      <path d={`M 0 3 L ${width} 3`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" className="flow-anim-h-rev" style={{ animationDelay: delay }} />
      <text x={width / 2} y="22" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="600" letterSpacing="1">
        {label}
      </text>
      
      {returnPathD && (
        <path d={returnPathD} stroke={fluidColor} strokeWidth="2" strokeOpacity="0.4" fill="none" strokeDasharray="4 6" />
      )}
    </g>
  );
}
