import React from 'react';

export interface ManifoldProps {
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'horizontal' | 'vertical';
  numInputs: number;
  numOutputs: number;
  fluidColor: string;
  label: string;
}

export default function Manifold({ x, y, w, h, orientation = 'horizontal', numInputs = 1, numOutputs = 4, fluidColor, label }: ManifoldProps) {
  return (
    <g>
      {/* Main Manifold Housing */}
      <rect x={x} y={y} width={w} height={h} rx="4" fill="rgba(34, 197, 94, 0.05)" stroke="rgba(34, 197, 94, 0.2)" strokeWidth="1.5" />
      
      {/* Label */}
      <text 
        x={x + w / 2} 
        y={orientation === 'horizontal' ? y + h / 2 + 3 : y + h / 2 + 2} 
        textAnchor="middle" 
        fill="rgba(255,255,255,0.4)" 
        fontSize={orientation === 'horizontal' ? "8" : "6"} 
        fontWeight="700" 
        letterSpacing="1" 
        transform={orientation === 'vertical' ? `rotate(-90 ${x+w/2} ${y+h/2})` : ''}
      >
        {label}
      </text>
      
      {/* Input Ports (Top for Horiz, Left for Vert) */}
      {Array.from({ length: numInputs }).map((_, i) => {
        const spacing = orientation === 'horizontal' ? w / (numInputs + 1) : h / (numInputs + 1);
        const px = orientation === 'horizontal' ? x + spacing * (i + 1) : x;
        const py = orientation === 'horizontal' ? y : y + spacing * (i + 1);
        return <circle key={`in-${i}`} cx={px} cy={py} r="2.5" fill="rgba(139,92,246,0.6)" stroke="#000" strokeWidth="1" />;
      })}

      {/* Output Ports (Bottom for Horiz, Right for Vert) */}
      {Array.from({ length: numOutputs }).map((_, i) => {
        const spacing = orientation === 'horizontal' ? w / (numOutputs + 1) : h / (numOutputs + 1);
        const px = orientation === 'horizontal' ? x + spacing * (i + 1) : x + w;
        const py = orientation === 'horizontal' ? y + h : y + spacing * (i + 1);
        return <circle key={`out-${i}`} cx={px} cy={py} r="2.5" fill="rgba(6,182,212,0.6)" stroke="#000" strokeWidth="1" />;
      })}
    </g>
  );
}
