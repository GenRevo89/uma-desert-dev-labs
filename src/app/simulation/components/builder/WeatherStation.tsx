import React from 'react';

export interface WeatherStationProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isTestRunning?: boolean;
}

export default function WeatherStation({ x, y, width, height, label, isTestRunning = false }: WeatherStationProps) {
  const cx = width / 2;

  // Custom spin animation specifically for the anemometer so it responds to the simulation
  const spinSpeed = isTestRunning ? '1s' : '4s';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Base Anchor Pad */}
      <rect x={cx - 30} y={height - 15} width={60} height={15} rx={3} fill="rgba(10, 15, 25, 0.95)" stroke="var(--violet)" strokeWidth="2" />
      <circle cx={cx - 20} cy={height - 7} r={2} fill="var(--accent)" />
      <circle cx={cx + 20} cy={height - 7} r={2} fill="var(--accent)" />

      {/* Main Mast */}
      <rect x={cx - 4} y={20} width={8} height={height - 35} fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
      
      {/* Core Logic Box (Vented) */}
      <rect x={cx - 25} y={height - 80} width={50} height={40} rx={4} fill="rgba(6, 10, 16, 0.95)" stroke="var(--violet)" strokeWidth="1.5" />
      {/* Ventilation Slits */}
      <path d={`M ${cx - 15} ${height - 70} L ${cx + 15} ${height - 70}`} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeLinecap="round" />
      <path d={`M ${cx - 15} ${height - 62} L ${cx + 15} ${height - 62}`} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeLinecap="round" />
      <path d={`M ${cx - 15} ${height - 54} L ${cx + 15} ${height - 54}`} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeLinecap="round" />
      {/* Status LED */}
      <circle cx={cx} cy={height - 45} r={3} fill="var(--violet)" style={{ filter: isTestRunning ? 'drop-shadow(0 0 5px var(--violet))' : 'none' }} />

      {/* PAR Sensor Dome Component */}
      <g transform={`translate(${cx + 4}, ${height - 100})`}>
        <rect x={0} y={0} width={25} height={4} fill="rgba(255, 255, 255, 0.3)" />
        <path d="M 5 0 C 5 -10, 20 -10, 20 0 Z" fill="var(--accent)" fillOpacity="0.8" />
        {/* PAR Laser connection */}
        <path d="M 0 2 L -8 2" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" />
      </g>

      {/* Anemometer (Spinning Top) */}
      <g transform={`translate(${cx}, 20)`}>
        {/* Hub */}
        <circle cx={0} cy={0} r={6} fill="var(--violet)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
        
        {/* Spinning Arms */}
        <g style={{ transformOrigin: '0px 0px', animation: `spin ${spinSpeed} linear infinite` }}>
          {/* Arm 1 */}
          <path d="M 0 0 L -25 0" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" />
          <path d="M -25 -5 C -30 -5, -30 5, -25 5 Z" fill="rgba(10, 15, 25, 1)" stroke="var(--violet)" strokeWidth="1.5" />
          
          {/* Arm 2 */}
          <path d="M 0 0 L 12.5 -21.6" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" />
          <path d="M 12.5 -21.6 C 16.8 -24.1, 21.8 -15.5, 12.5 -21.6 Z" fill="rgba(10, 15, 25, 1)" stroke="var(--violet)" strokeWidth="1.5" transform="rotate(120, 12.5, -21.6)" />
          
          {/* Arm 3 */}
          <path d="M 0 0 L 12.5 21.6" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" />
          <path d="M 12.5 21.6 C 16.8 24.1, 21.8 15.5, 12.5 21.6 Z" fill="rgba(10, 15, 25, 1)" stroke="var(--violet)" strokeWidth="1.5" transform="rotate(240, 12.5, 21.6)" />
        </g>
      </g>

      {/* Label Matrix Box */}
      <rect x={cx - 50} y={height + 5} width={100} height={22} rx={6} fill="rgba(10, 15, 25, 0.8)" stroke="var(--border-subtle)" strokeWidth="1" />
      <text x={cx} y={height + 20} textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="9" fontWeight="700" letterSpacing="0.5">
        {label}
      </text>

      {/* Dynamic Keyframes injected safely */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </g>
  );
}
