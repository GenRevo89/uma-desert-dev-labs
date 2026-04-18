import React from 'react';

interface LedPanelProps {
  x: number;
  y: number;
  width: number;
  lightLevel: number; // PAR intensity
  status: 'nominal' | 'warning' | 'danger';
}

export default function LedPanel({ x, y, width, lightLevel, status }: LedPanelProps) {
  const isDanger = status === 'danger';
  const fill = isDanger ? 'rgba(245,158,11,0.5)' : 'rgba(250,204,21,0.3)';
  const stroke = isDanger ? 'rgba(245,158,11,0.7)' : 'rgba(250,204,21,0.5)';
  
  // Calculate how many LED blocks fit inside the panel
  const ledCount = Math.floor((width - 24) / 53);
  const ledSpan = ledCount * 40 + (ledCount - 1) * 13;
  const startX = (width - ledSpan) / 2;

  // Use lightLevel to adjust visual intensity (opacity)
  const opacity = Math.min(1, Math.max(0.2, lightLevel / 600));

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text x={width / 2} y="-1" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" letterSpacing="1.5">
        LED GROW LIGHTS · {lightLevel.toFixed(0)} µmol
      </text>
      <rect 
        x="0" y="0" width={width} height="16" rx="4" 
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" 
      />
      
      {/* Light cone representation */}
      <path 
        d={`M 0 16 L ${width} 16 L ${width + 40} 100 L -40 100 Z`} 
        fill="url(#ledConeGrad)" 
        opacity={opacity}
        style={{ pointerEvents: 'none', transition: 'opacity 0.5s ease' }}
      />

      {Array.from({ length: ledCount }).map((_, i) => (
        <rect 
          key={`led-${i}`} 
          x={startX + i * 53} y="3" 
          width="40" height="10" rx="2"
          fill={fill} stroke={stroke}
          style={{ opacity: opacity }}
        />
      ))}
    </g>
  );
}
