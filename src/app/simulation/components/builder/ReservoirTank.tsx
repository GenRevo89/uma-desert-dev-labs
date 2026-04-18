import React from 'react';

interface ReservoirTankProps {
  x: number;
  y: number;
  flowRate: number; // 0 to ~3.5
  isAerated?: boolean;
}

export default function ReservoirTank({ x, y, flowRate, isAerated = true }: ReservoirTankProps) {
  // Map flow rate roughly to a water level visualization (max 100 height)
  const waterHeight = Math.min(100, 100 * (flowRate / 3));
  const waterY = 110 - waterHeight;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x="90" y="-5" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" letterSpacing="1">
        NUTRIENT RESERVOIR
      </text>
      <rect 
        x="0" y="0" width="180" height="110" rx="8" 
        fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" 
      />
      <rect 
        x="5" y={waterY} width="170" height={waterHeight} rx="4" 
        fill="rgba(59,130,246,0.15)" className="reservoir-water" 
      />
      
      {isAerated && [25, 60, 95, 130].map((bx, i) => (
        <circle 
          key={`bubble-${i}`} 
          cx={bx} cy={80} r="2.5" 
          fill="rgba(139,92,246,0.5)" 
          className="air-particle" 
          style={{ animationDelay: `${i * 0.4}s` }} 
        />
      ))}
    </g>
  );
}
