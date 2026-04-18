import React from 'react';

export interface ZipGrowTowerProps {
  x: number;
  y: number;
  i: number;
  towerId: string;
  cropName: string;
  emoji: string;
  valveOpen: boolean;
  healthStatus: 'nominal' | 'warning' | 'danger';
  rhStatus: 'nominal' | 'warning' | 'danger';
  phInput: number;
  ecRunoff: number;
  rhValue: number;
  isDisease: boolean;
  fluidColor: string;
}

export default function ZipGrowTower({ 
  x, y = 0, i, towerId, cropName, emoji, valveOpen, 
  healthStatus, rhStatus, rhValue, phInput, ecRunoff, isDisease, fluidColor
}: ZipGrowTowerProps) {
  
  const tankColor = healthStatus === 'danger' ? 'rgba(244,63,94,0.1)' : healthStatus === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.04)';
  const strokeColor = healthStatus === 'danger' ? '#f43f5e' : healthStatus === 'warning' ? '#f59e0b' : '#22c55e';
  const tColor = isDisease ? '#f43f5e' : healthStatus === 'danger' ? '#f43f5e' : healthStatus === 'warning' ? '#f59e0b' : '#22c55e';
  
  const phSc = healthStatus === 'danger' ? '#f43f5e' : healthStatus === 'warning' ? '#f59e0b' : '#22c55e';
  const rhSc = rhStatus === 'danger' ? '#f43f5e' : rhStatus === 'warning' ? '#f59e0b' : '#8b5cf6';

  const zFill = healthStatus === 'danger' ? 'rgba(244,63,94,0.1)' : healthStatus === 'warning' ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.04)';
  const zStroke = healthStatus === 'danger' ? 'rgba(244,63,94,0.35)' : healthStatus === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.15)';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Zone overlay */}
      <rect x="-60" y="60" width="120" height="490" rx="8" fill={zFill} stroke={zStroke} strokeWidth="1" strokeDasharray="4 3" />
      <text x="0" y="76" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontWeight="700" letterSpacing="0.5">{towerId} · {cropName}</text>

      {/* pH INPUT sensor */}
      <circle cx="-22" cy="95" r="11" fill={`${phSc}25`} stroke={phSc} strokeWidth="2" />
      <text x="-22" y="92" textAnchor="middle" fill={phSc} fontSize="5" fontWeight="700">pH</text>
      <text x="-22" y="100" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">{phInput.toFixed(1)}</text>

      {/* RH sensor at canopy level */}
      <circle cx="22" cy="95" r="11" fill={`${rhSc}25`} stroke={rhSc} strokeWidth="2" />
      <text x="22" y="92" textAnchor="middle" fill={rhSc} fontSize="5" fontWeight="700">RH</text>
      <text x="22" y="100" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">{rhValue.toFixed(0)}</text>

      {/* Feed valve */}
      <rect x="-8" y="114" width="16" height="8" rx="2"
        fill={valveOpen ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)'}
        stroke={valveOpen ? '#22c55e' : '#f43f5e'}
        strokeWidth="1.5"
      />
      <text x="0" y="121" textAnchor="middle" fill={valveOpen ? '#4ade80' : '#fb7185'} fontSize="4" fontWeight="800">
        {valveOpen ? 'OPEN' : 'SHUT'}
      </text>

      {/* Main Tower Housing */}
      <rect x="-18" y="130" width="36" height="380" rx="4" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      
      {/* Root mass/media core */}
      <rect x="-12" y="136" width="24" height="368" rx="2" fill={tankColor} />

      {/* Internal fluid drip animation */}
      {valveOpen && (
        <g>
          <line x1="0" y1="140" x2="0" y2="490" stroke={fluidColor} strokeWidth="2" strokeOpacity="0.4" />
          <line x1="0" y1="140" x2="0" y2="490" stroke="rgba(255,255,255,0.85)" strokeWidth="1" className="flow-anim-v" style={{ animationDelay: `${0.8 * i}s` }} />
          
          <line x1="-6" y1="160" x2="-6" y2="470" stroke={fluidColor} strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="-6" y1="160" x2="-6" y2="470" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" className="flow-anim-v" style={{ animationDelay: `${0.8 * i + 0.3}s` }} />
          
          <line x1="6" y1="150" x2="6" y2="480" stroke={fluidColor} strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="6" y1="150" x2="6" y2="480" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" className="flow-anim-v" style={{ animationDelay: `${0.8 * i + 0.5}s` }} />
        </g>
      )}

      {/* Tower grow slots */}
      {[135, 155, 175, 195, 215, 235, 255, 275, 295, 315, 335, 355, 375].map((y, j) => (
        <rect key={j} x="-14" y={y} width="28" height="9" rx="4"
          fill={`${tColor}${isDisease ? '20' : '12'}`} stroke={`${tColor}${isDisease ? '60' : '35'}`} strokeWidth="0.8"
        />
      ))}

      {/* Crop emoji */}
      <text x="0" y="408" textAnchor="middle" fontSize="16">{emoji}</text>

      {/* Disease badge */}
      {isDisease && (
        <g>
          <rect x="-30" y="418" width="60" height="14" rx="4" fill="rgba(244,63,94,0.18)" stroke="rgba(244,63,94,0.5)" />
          <text x="0" y="428" textAnchor="middle" fill="#fb7185" fontSize="6" fontWeight="700">🦠 DISEASED</text>
        </g>
      )}

      {/* EC RUNOFF sensor */}
      <circle cx="0" cy="460" r="11" fill={`${phSc}25`} stroke={phSc} strokeWidth="2" />
      <text x="0" y="457" textAnchor="middle" fill={phSc} fontSize="5" fontWeight="700">EC</text>
      <text x="0" y="465" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">{ecRunoff.toFixed(1)}</text>
    </g>
  );
}
