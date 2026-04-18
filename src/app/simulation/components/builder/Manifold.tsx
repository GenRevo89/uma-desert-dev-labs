import React from 'react';

export interface ManifoldProps {
  x: number;
  y: number;
  towerPositions: number[];
  valveStates?: boolean[];
  fluidColor: string;
  label: string;
}

export default function Manifold({ x, y, towerPositions, valveStates, fluidColor, label }: ManifoldProps) {
  const boxWidth = 60;
  const boxHeight = 20 + towerPositions.length * 8; // scale with ports
  const isLeftMounted = x < towerPositions[0]; // If manifold is on the left
  
  // Output ports are on the right side of the box if mounted on left
  const outX = isLeftMounted ? x + boxWidth : x;

  return (
    <g>
      {/* Drops from Manifold to Towers */}
      {towerPositions.map((tx, i) => {
        // Reverse port selection so shortest horizontal run gets the bottom-most port
        // and longest horizontal run gets the top-most port to prevent intersecting drops.
        const portIndex = isLeftMounted ? towerPositions.length - 1 - i : i;
        const portY = y + 10 + portIndex * 8;
        
        return (
          <g key={`manifold-line-${i}`}>
            {/* Seamless pipe housing */}
            <path d={`M ${outX} ${portY} L ${tx} ${portY} L ${tx} ${114}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinejoin="round" />
            
            {/* Solid liquid core */}
            <path d={`M ${outX} ${portY} L ${tx} ${portY} L ${tx} ${114}`} fill="none" stroke={fluidColor} strokeWidth="4" strokeLinejoin="round" strokeOpacity="0.4" />
            
            {/* Marching animated current */}
            {(!valveStates || valveStates[i]) && (
              <path d={`M ${outX} ${portY} L ${tx} ${portY} L ${tx} ${114}`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinejoin="round" 
                    className={isLeftMounted ? "flow-anim-h" : "flow-anim-h-rev"} style={{ animationDelay: `${0.2 * i}s` }} />
            )}
          </g>
        );
      })}

      {/* Main Manifold Housing */}
      <rect x={x} y={y} width={boxWidth} height={boxHeight} rx="4" fill="rgba(34, 197, 94, 0.05)" stroke="rgba(34, 197, 94, 0.2)" strokeWidth="1.5" />
      <text x={x + boxWidth / 2} y={y - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontWeight="700" letterSpacing="1">
        {label}
      </text>
      
      {/* Manifold Ports */}
      {towerPositions.map((_, i) => (
        <circle key={`port-${i}`} cx={outX} cy={y + 10 + i * 8} r="2.5" fill="rgba(139,92,246,0.5)" />
      ))}
    </g>
  );
}
