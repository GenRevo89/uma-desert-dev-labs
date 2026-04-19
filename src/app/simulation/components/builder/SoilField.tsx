import React from 'react';

export interface SoilFieldProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fieldStyle?: string; // 'Rows', 'Grid', 'Flood'
  cropName?: string;
  emoji?: string;
  isIrrigated: boolean;
  moistureLevel: number;
  fluidColor?: string;
}

export default function SoilField({ 
  x, y, width = 180, height = 120, 
  fieldStyle = 'Rows', cropName = 'Unassigned', emoji = '🌱',
  isIrrigated, moistureLevel, fluidColor = '#3b82f6' 
}: SoilFieldProps) {
  
  // Dirt color changes dynamically with moisture
  const dirtColor = isIrrigated ? '#5c4033' : '#a0522d'; // Darker wet dirt vs dry dirt
  const sensorColor = moistureLevel > 40 ? '#22c55e' : moistureLevel > 20 ? '#f59e0b' : '#f43f5e';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Field Base */}
      <rect x={0} y={0} width={width} height={height} rx={8} fill={dirtColor} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

      {/* Field Styling Logic */}
      {fieldStyle === 'Rows' && (
        <g>
          {[15, 45, 75, 105].map((ry, i) => (
            <g key={i}>
              <line x1={15} y1={ry} x2={width - 15} y2={ry} stroke="rgba(0,0,0,0.3)" strokeWidth="8" strokeLinecap="round" />
              <line x1={15} y1={ry} x2={width - 15} y2={ry} stroke={fluidColor} strokeWidth="3" strokeLinecap="round" strokeOpacity={isIrrigated ? 0.7 : 0} className={isIrrigated ? "flow-anim-h" : ""} style={{ animationDelay: `${i * 0.3}s` }} />
            </g>
          ))}
        </g>
      )}

      {fieldStyle === 'Grid' && (
        <g>
          {[20, 60, 100].map((ry, i) => (
            <g key={i}>
              <line x1={20} y1={ry} x2={width - 20} y2={ry} stroke="rgba(0,0,0,0.3)" strokeWidth="6" strokeLinecap="round" />
              <line x1={20} y1={ry} x2={width - 20} y2={ry} stroke={fluidColor} strokeWidth="3" strokeLinecap="round" strokeOpacity={isIrrigated ? 0.7 : 0} className={isIrrigated ? "flow-anim-h" : ""} />
            </g>
          ))}
          {[30, 90, 150].map((cx, i) => (
            <g key={i}>
              <line x1={cx} y1={10} x2={cx} y2={height - 10} stroke="rgba(0,0,0,0.3)" strokeWidth="6" strokeLinecap="round" />
              <line x1={cx} y1={10} x2={cx} y2={height - 10} stroke={fluidColor} strokeWidth="3" strokeLinecap="round" strokeOpacity={isIrrigated ? 0.7 : 0} className={isIrrigated ? "flow-anim-v" : ""} />
            </g>
          ))}
        </g>
      )}

      {fieldStyle === 'Flood' && (
        <rect x={10} y={10} width={width - 20} height={height - 20} rx={4} fill={isIrrigated ? fluidColor : 'transparent'} fillOpacity={0.3} />
      )}

      {/* Main Header */}
      <rect x={width / 2 - 40} y={-10} width={80} height={20} rx={4} fill="rgba(17,24,39,0.9)" stroke={dirtColor} strokeWidth="1" />
      <text x={width / 2} y={3} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">{emoji} {cropName}</text>

      {/* Embedded Soil Moisture Sensor */}
      <g transform={`translate(${width - 40}, ${height - 25})`}>
        <circle cx={15} cy={0} r={14} fill="rgba(17,24,39,0.8)" stroke={sensorColor} strokeWidth="1.5" />
        <text x={15} y={-3} textAnchor="middle" fill={sensorColor} fontSize="6" fontWeight="bold">H₂O</text>
        <text x={15} y={5} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">{moistureLevel}%</text>
      </g>

      {/* Runoff Collection Ditch */}
      <rect x={5} y={height + 5} width={width - 10} height={8} rx={4} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" />
      <rect x={7} y={height + 7} width={width - 14} height={4} rx={2} fill={fluidColor} fillOpacity={isIrrigated ? 0.6 : 0.1} />
      <text x={width / 2} y={height + 10.5} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="4" fontWeight="bold" letterSpacing="1">RUNOFF TRENCH</text>
    </g>
  );
}
