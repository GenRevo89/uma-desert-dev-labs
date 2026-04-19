import React from 'react';

export interface MunicipalWaterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isFlowing?: boolean;
}

export default function MunicipalWater({ x, y, width, height, label, isFlowing = false }: MunicipalWaterProps) {
  // A badass looking industrial water hookup
  const cx = width / 2;
  const cy = height / 2;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Heavy Base Flange */}
      <rect x={10} y={height - 20} width={width - 20} height={20} rx={4} fill="rgba(10, 15, 25, 0.9)" stroke="var(--blue)" strokeWidth="2" />
      <path d={`M 20 ${height - 10} L ${width - 20} ${height - 10}`} stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" />
      
      {/* Main Vertical Pipe */}
      <rect x={cx - 15} y={15} width={30} height={height - 30} fill="rgba(20, 25, 40, 0.95)" stroke="var(--blue)" strokeWidth="1.5" />
      
      {/* Pipe Highlights */}
      <rect x={cx - 10} y={15} width={5} height={height - 30} fill="rgba(255, 255, 255, 0.05)" />
      
      {/* Water Simulation Window inside the pipe */}
      <rect x={cx - 5} y={30} width={10} height={height - 60} rx={5} fill="rgba(0, 0, 0, 0.6)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
      <rect x={cx - 3} y={isFlowing ? 32 : height - 35} width={6} height={isFlowing ? height - 64 : 5} rx={3} fill="var(--blue)" style={{ transition: 'all 0.5s ease' }} />
      {isFlowing && (
        <path 
          d={`M ${cx} 35 L ${cx} ${height - 35}`} 
          stroke="rgba(255, 255, 255, 0.6)" 
          strokeWidth="2" 
          strokeDasharray="4 6" 
          className="flow-anim-v-rev" 
        />
      )}
      
      {/* Massive Round Top Hub */}
      <circle cx={cx} cy={20} r={20} fill="rgba(10, 15, 25, 1)" stroke="var(--blue)" strokeWidth="2" />
      <circle cx={cx} cy={20} r={12} fill="var(--blue)" fillOpacity="0.2" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
      {/* Valve Handle */}
      <path d={`M ${cx - 25} 20 L ${cx + 25} 20`} stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" />
      <circle cx={cx - 25} cy={20} r={5} fill="var(--accent)" />
      <circle cx={cx + 25} cy={20} r={5} fill="var(--accent)" />
      
      {/* Label Box */}
      <rect x={cx - 45} y={height + 5} width={90} height={22} rx={6} fill="rgba(10, 15, 25, 0.8)" stroke="var(--border-subtle)" strokeWidth="1" />
      <text x={cx} y={height + 20} textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="9" fontWeight="700" letterSpacing="0.5">
        MUNICIPAL
      </text>
    </g>
  );
}
