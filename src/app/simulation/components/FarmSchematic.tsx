"use client";

import { Activity, TriangleAlert } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import {
  RESERVOIR_META, TOWER_CROPS,
  getReservoirStatus, getAmbientStatus, getRowHealth, getRowRhStatus,
  type ReservoirKey,
} from '../types';

import LedPanel from './builder/LedPanel';
import DosingPump from './builder/DosingPump';
import ReservoirTank from './builder/ReservoirTank';
import Pump from './builder/Pump';
import ClimateActuator from './builder/ClimateActuator';
import Chiller from './builder/Chiller';
import ZipGrowTower from './builder/ZipGrowTower';
import Manifold from './builder/Manifold';
import ReturnDrain from './builder/ReturnDrain';

export default function FarmSchematic() {
  const {
    reservoir, ambient, rowZones, humidityZones, systemActuators, umaActive, umaState,
    bottlenecks, cascadeActive, activeInterventions, towerConditions,
  } = useSimulation();

  const reservoirKeys: ReservoirKey[] = ['ph', 'ec', 'temp', 'do2', 'flow'];

  const reservoirHealth = (() => {
    const statuses = reservoirKeys.map(k => getReservoirStatus(k, reservoir[k]));
    if (statuses.includes('danger')) return 'danger';
    if (statuses.includes('warning')) return 'warning';
    return 'nominal';
  })();

  const zoneColor = (status: string) =>
    status === 'danger' ? 'rgba(244,63,94,0.1)' :
    status === 'warning' ? 'rgba(245,158,11,0.07)' :
    'rgba(34,197,94,0.04)';

  const zoneStroke = (status: string) =>
    status === 'danger' ? 'rgba(244,63,94,0.35)' :
    status === 'warning' ? 'rgba(245,158,11,0.25)' :
    'rgba(34,197,94,0.15)';

  const towerXPositions = [280, 430, 580, 730, 880];

  // Dynamic fluid coloration based on pH and EC
  const phLevel = reservoir.ph;
  const ecLevel = reservoir.ec;
  let fluidColor = '#3b82f6'; // Default base blue
  
  if (phLevel < 5.7) fluidColor = '#f59e0b'; // Acidic - Yellow/Orange
  else if (phLevel > 6.3) fluidColor = '#8b5cf6'; // Alkaline - Purple
  else if (ecLevel > 2.0) fluidColor = '#22c55e'; // High EC - Rich Green
  else if (ecLevel < 1.0) fluidColor = '#93c5fd'; // Low EC - Pale blue
  else fluidColor = '#06b6d4'; // Nominal - Cyan

  return (
    <div className="schematic glass-panel animate-in animate-in-delay-1">
      <div className="schematic-header">
        <h3>Farm Schematic — Resource Flow Network</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {bottlenecks.length > 0 && (
            <span className="badge badge-danger"><TriangleAlert size={12} /> {bottlenecks.length} bottleneck{bottlenecks.length > 1 ? 's' : ''}</span>
          )}
          {cascadeActive && <span className="badge badge-danger cascade-badge">⛓ Cascade Active</span>}
          <span className={`badge ${umaActive ? 'badge-success' : 'badge-warning'}`}>
            <Activity size={12} /> {umaActive ? 'Uma Monitoring' : 'Manual Mode'}
          </span>
        </div>
      </div>

      <div className="schematic-body">
        <svg className="flow-svg" viewBox="0 0 1100 580" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={fluidColor} stopOpacity="0" />
              <stop offset="50%" stopColor={fluidColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={fluidColor} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waterGradV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fluidColor} stopOpacity="0" />
              <stop offset="50%" stopColor={fluidColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={fluidColor} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hotGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="nutrientGradV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowSm"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* ═══ LED PANEL (top) ═══ */}
          <LedPanel 
            x={240} y={-25} width={680} 
            lightLevel={ambient.light} 
            status={getAmbientStatus('light', ambient.light)} 
          />{/* PAR SENSOR */}
          {(() => {
            const s = getAmbientStatus('light', ambient.light);
            const c = s === 'danger' ? '#f43f5e' : s === 'warning' ? '#f59e0b' : '#22c55e';
            return (
              <g>
                <circle cx="870" cy="16" r="14" fill={`${c}20`} stroke={c} strokeWidth="1.5" />
                <text x="870" y="13" textAnchor="middle" fill={c} fontSize="6" fontWeight="700">PAR</text>
                <text x="870" y="22" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono, monospace">{ambient.light.toFixed(0)}</text>
              </g>
            );
          })()}

          {/* ROOM HUMIDITY SENSOR */}
          {(() => {
            const s = getAmbientStatus('humidity', ambient.humidity);
            const c = s === 'danger' ? '#f43f5e' : s === 'warning' ? '#f59e0b' : '#22c55e';
            return (
              <g>
                <circle cx="1000" cy="50" r="14" fill={`${c}20`} stroke={c} strokeWidth="1.5" />
                <text x="1000" y="47" textAnchor="middle" fill={c} fontSize="6" fontWeight="700">RH</text>
                <text x="1000" y="56" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono, monospace">{ambient.humidity.toFixed(0)}</text>
              </g>
            );
          })()}

          {/* ═══ RESERVOIR ZONE ═══ */}
          <rect x="10" y="100" width="210" height="430" rx="12" fill={zoneColor(reservoirHealth)} stroke={zoneStroke(reservoirHealth)} strokeWidth="1.5" strokeDasharray="6 3" />
          <text x="115" y="117" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8" fontWeight="700" letterSpacing="1">RESERVOIR ZONE</text>

          {/* Dosing Pumps */}
          <DosingPump x={20} y={135} label="pH DOWN" color="rgba(244,63,94,0.45)" fill="rgba(244,63,94,0.15)" isActive={systemActuators.ph_doser} />
          <DosingPump x={20} y={162} label="pH UP" color="rgba(59,130,246,0.45)" fill="rgba(59,130,246,0.15)" isActive={systemActuators.ph_doser} />
          <DosingPump x={20} y={189} label="NUTR A" color="rgba(34,197,94,0.45)" fill="rgba(34,197,94,0.15)" isActive={systemActuators.nutrient_doser} />
          <DosingPump x={20} y={216} label="NUTR B" color="rgba(245,158,11,0.45)" fill="rgba(245,158,11,0.15)" isActive={systemActuators.nutrient_doser} />
          <text x="50" y="130" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="600">DOSING</text>

          {/* Reservoir Tank */}
          <ReservoirTank x={25} y={320} flowRate={reservoir.flow} isAerated={systemActuators.air_pump} />

          {/* Air Pump + Main Pump */}
          <Pump x={25} y={450} label="AIR PUMP" type="air" isActive={systemActuators.air_pump} />
          <Pump x={100} y={450} label="MAIN PUMP" type="water" isActive={systemActuators.circulation_pump} />

          {/* Reservoir Sensors */}
          {[
            { key: 'ph' as ReservoirKey, x: 175, y: 260, label: 'pH' },
            { key: 'ec' as ReservoirKey, x: 175, y: 290, label: 'EC' },
            { key: 'temp' as ReservoirKey, x: 55, y: 260, label: 'TEMP' },
            { key: 'do2' as ReservoirKey, x: 55, y: 290, label: 'O₂' },
            { key: 'flow' as ReservoirKey, x: 115, y: 488, label: 'FLOW' },
          ].map(s => {
            const status = getReservoirStatus(s.key, reservoir[s.key]);
            const fillColor = status === 'danger' ? 'rgba(244,63,94,0.2)' : status === 'warning' ? 'rgba(245,158,11,0.18)' : 'rgba(34,197,94,0.15)';
            const strokeColor = status === 'danger' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : '#22c55e';
            return (
              <g key={s.key}>
                {status === 'danger' && <circle cx={s.x} cy={s.y} r="20" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity="0.5" className="sensor-alarm-ring" />}
                <circle cx={s.x} cy={s.y} r="14" fill={fillColor} stroke={strokeColor} strokeWidth="2" filter={status === 'danger' ? 'url(#glow)' : undefined} />
                <text x={s.x} y={s.y - 2} textAnchor="middle" fill={strokeColor} fontSize="6" fontWeight="700">{s.label}</text>
                <text x={s.x} y={s.y + 7} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono, monospace">{reservoir[s.key].toFixed(1)}</text>
              </g>
            );
          })}

          {/* Supply riser from Pumps to Manifold */}
          <path d={`M 130 450 L 130 15`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
          <path d={`M 130 450 L 130 15`} fill="none" stroke={fluidColor} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.4" />
          <path d={`M 130 450 L 130 15`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" className="flow-anim-v-up" style={{ animationDelay: '0s' }} />

          {/* ═══ SUPPLY MANIFOLD ═══ */}
          <Manifold 
            x={128} y={15}
            towerPositions={towerXPositions} 
            valveStates={rowZones.map((r: any) => r.sensors.valveOpen)}
            fluidColor={fluidColor} 
            label="SUPPLY MANIFOLD" 
          />

          {/* ═══ HVAC + CLIMATE CONTROL (right side) ═══ */}
          <text x="1050" y="100" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="600">CLIMATE</text>

          {/* Zone A Humidity Actuators */}
          {(() => {
            const zA = humidityZones.find(z => z.id === 'A')!;
            return (
              <g>
                <text x="1050" y="118" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5.5" fontWeight="700" letterSpacing="0.5">ZONE A</text>
                <ClimateActuator x={1020} y={122} type="humidifier" isActive={zA.humidifierOn} />
                <ClimateActuator x={1020} y={146} type="dehumidifier" isActive={zA.dehumidifierOn} />
              </g>
            );
          })()}

          {/* Zone B Humidity Actuators */}
          {(() => {
            const zB = humidityZones.find(z => z.id === 'B')!;
            return (
              <g>
                <text x="1050" y="184" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5.5" fontWeight="700" letterSpacing="0.5">ZONE B</text>
                <ClimateActuator x={1020} y={188} type="humidifier" isActive={zB.humidifierOn} />
                <ClimateActuator x={1020} y={212} type="dehumidifier" isActive={zB.dehumidifierOn} />
              </g>
            );
          })()}

          {/* Chiller */}
          <Chiller 
            x={1020} y={260} 
            status={getReservoirStatus('temp', reservoir.temp)} 
            isActive={systemActuators.chiller} 
          />

          {/* ═══ HUMIDITY ZONE OVERLAYS ═══ */}
          <rect x="218" y="62" width="276" height="485" rx="10" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1.5" strokeDasharray="8 4" />
          <text x="356" y="555" textAnchor="middle" fill="rgba(139,92,246,0.35)" fontSize="7" fontWeight="700" letterSpacing="1">HUMIDITY ZONE A</text>

          <rect x="518" y="62" width="426" height="485" rx="10" fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" strokeDasharray="8 4" />
          <text x="731" y="555" textAnchor="middle" fill="rgba(34,211,238,0.35)" fontSize="7" fontWeight="700" letterSpacing="1">HUMIDITY ZONE B</text>

          {/* ═══ PER-ROW CONTROL COLUMNS ═══ */}
          {towerXPositions.map((x, i) => {
            const row = rowZones[i];
            const crop = TOWER_CROPS[i];
            const towerCond = towerConditions.find(tc => tc.towerId === row.towerId);
            const hasDis = !!towerCond?.disease;
            const rowHealth = getRowHealth(row);
            const rhStatus = getRowRhStatus(row.sensors.rh, row.optimalRh);
            const tColor = hasDis ? '#f43f5e' : rowHealth === 'danger' ? '#f43f5e' : rowHealth === 'warning' ? '#f59e0b' : '#22c55e';
            const zFill = zoneColor(rowHealth);
            const zStroke = zoneStroke(rowHealth);
            const phSc = rowHealth === 'danger' ? '#f43f5e' : rowHealth === 'warning' ? '#f59e0b' : '#22c55e';
            const rhSc = rhStatus === 'danger' ? '#f43f5e' : rhStatus === 'warning' ? '#f59e0b' : '#8b5cf6';

            return (
              <ZipGrowTower
                key={`tower-${i}`}
                x={x}
                y={0}
                i={i}
                towerId={row.towerId}
                cropName={crop.crop}
                emoji={crop.emoji}
                valveOpen={row.sensors.valveOpen}
                healthStatus={rowHealth}
                rhStatus={rhStatus}
                rhValue={row.sensors.rh}
                phInput={row.sensors.phInput}
                ecRunoff={row.sensors.ecRunoff}
                isDisease={hasDis}
                fluidColor={fluidColor}
              />
            );
          })}

          {/* ═══ RETURN DRAIN ═══ */}
          <ReturnDrain 
            x={230} y={500} width={650} 
            label="RETURN DRAIN → RESERVOIR" 
            returnPathD="M0 3 L0 -20 Q0 -35 -20 -35 L-115 -35 L-115 -70"
            delay="2.5s"
            fluidColor={fluidColor}
          />

          {/* ═══ UMA ORB ═══ */}
          <g className={`uma-svg-orb ${umaState}`}>
            <circle cx="580" cy="280" r="28" fill="rgba(34,197,94,0.04)" stroke={umaActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'} strokeWidth="1" className="uma-ring-1" />
            <circle cx="580" cy="280" r="20" fill="rgba(34,197,94,0.06)" stroke={umaActive ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)'} strokeWidth="1" className="uma-ring-2" />
            <circle cx="580" cy="280" r="12" fill={umaActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'} stroke={umaActive ? '#22c55e' : 'rgba(255,255,255,0.18)'} strokeWidth="1.5" />
            {umaActive && <circle cx="580" cy="280" r="3" fill="#22c55e" filter="url(#glowSm)"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" /></circle>}
            <text x="580" y="316" textAnchor="middle" fill={umaActive ? '#4ade80' : 'rgba(255,255,255,0.3)'} fontSize="8" fontWeight="700" letterSpacing="1.5">UMA</text>
            {umaActive && towerXPositions.map((tx, i) => (
              <line key={`uma-line-${i}`} x1="580" y1="280" x2={tx} y2="280" stroke="rgba(34,197,94,0.15)" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            {umaActive && (
              <line x1="580" y1="280" x2="115" y2="280" stroke="rgba(34,197,94,0.15)" strokeWidth="1" strokeDasharray="4 4" />
            )}
          </g>

          {/* ═══ BOTTLENECK INDICATORS ═══ */}
          {bottlenecks.map((bn, i) => {
            const positions: Record<string, { x: number; y: number }> = {
              ph: { x: 175, y: 260 }, ec: { x: 175, y: 290 }, temp: { x: 55, y: 260 },
              do2: { x: 55, y: 290 }, flow: { x: 115, y: 488 },
            };
            const pos = positions[bn.sensor];
            if (!pos) return null;
            return (
              <g key={`bn-${i}`}>
                <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" className="bottleneck-ring" />
              </g>
            );
          })}

          {/* ═══ INTERVENTION ANNOTATIONS ═══ */}
          {activeInterventions.map((iv, i) => {
            const positions: Record<string, { x: number; y: number }> = {
              ph: { x: 175, y: 260 }, ec: { x: 175, y: 290 }, temp: { x: 55, y: 260 },
              do2: { x: 55, y: 290 }, flow: { x: 115, y: 488 },
              humidity: { x: 1000, y: 50 }, light: { x: 870, y: 16 },
            };
            const pos = positions[iv.sensor];
            if (!pos) return null;
            return (
              <g key={`iv-${i}`} className="intervention-annotation">
                <circle cx={pos.x} cy={pos.y} r="20" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" className="intervention-pulse" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
