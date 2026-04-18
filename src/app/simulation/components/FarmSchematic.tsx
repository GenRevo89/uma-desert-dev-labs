"use client";

import { Activity, TriangleAlert } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import {
  RESERVOIR_META, TOWER_CROPS,
  getReservoirStatus, getAmbientStatus, getRowHealth, getRowRhStatus,
  type ReservoirKey,
} from '../types';

export default function FarmSchematic() {
  const {
    reservoir, ambient, rowZones, humidityZones, umaActive, umaState,
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
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waterGradV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hotGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="nutrientGradV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glowSm"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* ═══ LED PANEL (top) ═══ */}
          <rect x="250" y="8" width="600" height="16" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
          {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
            <rect key={`led-${i}`} x={262 + i * 53} y="11" width="40" height="10" rx="2"
              fill={getAmbientStatus('light', ambient.light) === 'danger' ? 'rgba(245,158,11,0.5)' : 'rgba(250,204,21,0.3)'}
              stroke={getAmbientStatus('light', ambient.light) === 'danger' ? 'rgba(245,158,11,0.7)' : 'rgba(250,204,21,0.5)'}
            />
          ))}
          <text x="550" y="7" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" letterSpacing="1.5">LED GROW LIGHTS · {ambient.light.toFixed(0)} µmol</text>

          {/* PAR SENSOR */}
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
          {[
            { y: 135, label: 'pH DOWN', color: 'rgba(244,63,94,0.45)', fill: 'rgba(244,63,94,0.15)' },
            { y: 162, label: 'pH UP', color: 'rgba(59,130,246,0.45)', fill: 'rgba(59,130,246,0.15)' },
            { y: 189, label: 'NUTR A', color: 'rgba(34,197,94,0.45)', fill: 'rgba(34,197,94,0.15)' },
            { y: 216, label: 'NUTR B', color: 'rgba(245,158,11,0.45)', fill: 'rgba(245,158,11,0.15)' },
          ].map((pump, i) => (
            <g key={`pump-${i}`}>
              <rect x="20" y={pump.y} width="60" height="22" rx="4" fill={pump.fill} stroke={pump.color} strokeWidth="1" />
              <text x="50" y={pump.y + 14} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6" fontWeight="700">{pump.label}</text>
              <line x1="80" y1={pump.y + 11} x2="130" y2={pump.y + 11} stroke={pump.color} strokeWidth="1.5" strokeDasharray="3 2" />
            </g>
          ))}
          <text x="50" y="130" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="600">DOSING</text>

          {/* Reservoir Tank */}
          <rect x="25" y="320" width="180" height="110" rx="8" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" />
          <rect x="30" y={430 - Math.min(100, 100 * (reservoir.flow / 3))} width="170" height={Math.min(100, 100 * (reservoir.flow / 3))} rx="4" fill="rgba(59,130,246,0.15)" className="reservoir-water" />
          <text x="115" y="315" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600" letterSpacing="1">NUTRIENT RESERVOIR</text>
          {[50, 85, 120, 155].map((x, i) => (
            <circle key={`bubble-${i}`} cx={x} cy={400} r="2.5" fill="rgba(139,92,246,0.5)" className="air-particle" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}

          {/* Air Pump + Main Pump */}
          <rect x="25" y="450" width="55" height="22" rx="4" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)" />
          <text x="52" y="464" textAnchor="middle" fill="rgba(139,92,246,0.8)" fontSize="6" fontWeight="700">AIR PUMP</text>
          <line x1="52" y1="450" x2="52" y2="430" stroke="rgba(139,92,246,0.35)" strokeWidth="1.5" strokeDasharray="3 2" />

          <rect x="100" y="450" width="55" height="22" rx="4" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)" />
          <text x="127" y="464" textAnchor="middle" fill="rgba(59,130,246,0.8)" fontSize="6" fontWeight="700">MAIN PUMP</text>
          <line x1="127" y1="450" x2="127" y2="430" stroke="rgba(59,130,246,0.3)" strokeWidth="2" />

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

          {/* Supply riser */}
          <rect x="128" y="55" width="4" height="195" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
          <rect x="129" y="55" width="2" height="195" rx="1" fill="url(#nutrientGradV)" className="flow-anim-v-up" />

          {/* ═══ SUPPLY HEADER ═══ */}
          <rect x="128" y="53" width="870" height="6" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
          <rect x="128" y="53" width="870" height="6" rx="3" fill={getReservoirStatus('temp', reservoir.temp) === 'danger' ? 'url(#hotGrad)' : 'url(#waterGrad)'} className="flow-anim-h" />
          <text x="550" y="48" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="600" letterSpacing="1">SUPPLY HEADER</text>

          {/* ═══ HVAC + CLIMATE CONTROL (right side) ═══ */}
          <text x="1050" y="100" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="600">CLIMATE</text>

          {/* Zone A Humidity Actuators */}
          {(() => {
            const zA = humidityZones.find(z => z.id === 'A')!;
            return (
              <g>
                <text x="1050" y="118" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5.5" fontWeight="700" letterSpacing="0.5">ZONE A</text>
                <rect x="1020" y="122" width="60" height="20" rx="3"
                  fill={zA.humidifierOn ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.08)'}
                  stroke={zA.humidifierOn ? '#8b5cf6' : 'rgba(139,92,246,0.25)'}
                />
                <text x="1050" y="135" textAnchor="middle" fill={zA.humidifierOn ? '#a78bfa' : 'rgba(139,92,246,0.6)'} fontSize="5" fontWeight="700">HUMIDIFY</text>
                {zA.humidifierOn && <circle cx="1085" cy="132" r="2.5" fill="#8b5cf6" className="sensor-alarm-ring" />}
                <rect x="1020" y="146" width="60" height="20" rx="3"
                  fill={zA.dehumidifierOn ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.08)'}
                  stroke={zA.dehumidifierOn ? '#22d3ee' : 'rgba(34,211,238,0.25)'}
                />
                <text x="1050" y="159" textAnchor="middle" fill={zA.dehumidifierOn ? '#67e8f9' : 'rgba(34,211,238,0.6)'} fontSize="5" fontWeight="700">DEHUMID</text>
                {zA.dehumidifierOn && <circle cx="1085" cy="156" r="2.5" fill="#22d3ee" className="sensor-alarm-ring" />}
              </g>
            );
          })()}

          {/* Zone B Humidity Actuators */}
          {(() => {
            const zB = humidityZones.find(z => z.id === 'B')!;
            return (
              <g>
                <text x="1050" y="184" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5.5" fontWeight="700" letterSpacing="0.5">ZONE B</text>
                <rect x="1020" y="188" width="60" height="20" rx="3"
                  fill={zB.humidifierOn ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.08)'}
                  stroke={zB.humidifierOn ? '#8b5cf6' : 'rgba(139,92,246,0.25)'}
                />
                <text x="1050" y="201" textAnchor="middle" fill={zB.humidifierOn ? '#a78bfa' : 'rgba(139,92,246,0.6)'} fontSize="5" fontWeight="700">HUMIDIFY</text>
                {zB.humidifierOn && <circle cx="1085" cy="198" r="2.5" fill="#8b5cf6" className="sensor-alarm-ring" />}
                <rect x="1020" y="212" width="60" height="20" rx="3"
                  fill={zB.dehumidifierOn ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.08)'}
                  stroke={zB.dehumidifierOn ? '#22d3ee' : 'rgba(34,211,238,0.25)'}
                />
                <text x="1050" y="225" textAnchor="middle" fill={zB.dehumidifierOn ? '#67e8f9' : 'rgba(34,211,238,0.6)'} fontSize="5" fontWeight="700">DEHUMID</text>
                {zB.dehumidifierOn && <circle cx="1085" cy="222" r="2.5" fill="#22d3ee" className="sensor-alarm-ring" />}
              </g>
            );
          })()}

          {/* HVAC Fans */}
          {[250, 285].map((y, i) => (
            <g key={`fan-${i}`}>
              <circle cx="1050" cy={y} r="14" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.35)" />
              <text x="1050" y={y + 3} textAnchor="middle" fill="rgba(139,92,246,0.7)" fontSize="6" fontWeight="700">FAN</text>
            </g>
          ))}

          {/* Chiller */}
          <rect x="1020" y="315" width="60" height="28" rx="4"
            fill={getReservoirStatus('temp', reservoir.temp) === 'danger' ? 'rgba(244,63,94,0.15)' : 'rgba(34,211,238,0.1)'}
            stroke={getReservoirStatus('temp', reservoir.temp) === 'danger' ? 'rgba(244,63,94,0.5)' : 'rgba(34,211,238,0.35)'}
          />
          <text x="1050" y="333" textAnchor="middle"
            fill={getReservoirStatus('temp', reservoir.temp) === 'danger' ? 'rgba(244,63,94,0.8)' : 'rgba(34,211,238,0.7)'}
            fontSize="7" fontWeight="700"
          >CHILLER</text>

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
              <g key={`row-${i}`}>
                {/* Zone overlay */}
                <rect x={x - 60} y="60" width="120" height="490" rx="8" fill={zFill} stroke={zStroke} strokeWidth="1" strokeDasharray="4 3" />
                <text x={x} y="76" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontWeight="700" letterSpacing="0.5">{crop.id} · {crop.crop}</text>

                {/* pH INPUT sensor */}
                <circle cx={x - 22} cy="95" r="11" fill={`${phSc}25`} stroke={phSc} strokeWidth="2" />
                <text x={x - 22} y="92" textAnchor="middle" fill={phSc} fontSize="5" fontWeight="700">pH</text>
                <text x={x - 22} y="100" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">{row.sensors.phInput.toFixed(1)}</text>

                {/* RH sensor at canopy level */}
                <circle cx={x + 22} cy="95" r="11" fill={`${rhSc}25`} stroke={rhSc} strokeWidth="2" />
                <text x={x + 22} y="92" textAnchor="middle" fill={rhSc} fontSize="5" fontWeight="700">RH</text>
                <text x={x + 22} y="100" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">{row.sensors.rh.toFixed(0)}</text>

                {/* Vertical feed pipe */}
                <rect x={x - 2} y="59" width="4" height="460" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" />
                <rect x={x - 1} y="59" width="2" height="460" rx="1" fill="url(#waterGradV)" className="flow-anim-v" style={{ animationDelay: `${i * 0.3}s` }} />

                {/* Feed valve */}
                <rect x={x - 8} y="114" width="16" height="8" rx="2"
                  fill={row.sensors.valveOpen ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)'}
                  stroke={row.sensors.valveOpen ? '#22c55e' : '#f43f5e'}
                  strokeWidth="1.5"
                />
                <text x={x} y="121" textAnchor="middle" fill={row.sensors.valveOpen ? '#4ade80' : '#fb7185'} fontSize="4" fontWeight="800">
                  {row.sensors.valveOpen ? 'OPEN' : 'SHUT'}
                </text>

                {/* Tower grow slots */}
                {[135, 155, 175, 195, 215, 235, 255, 275, 295, 315, 335, 355, 375].map((y, j) => (
                  <rect key={j} x={x - 14} y={y} width="28" height="9" rx="4"
                    fill={`${tColor}${hasDis ? '20' : '12'}`} stroke={`${tColor}${hasDis ? '60' : '35'}`} strokeWidth="0.8"
                  />
                ))}

                {/* Crop emoji */}
                <text x={x} y="408" textAnchor="middle" fontSize="16">{crop.emoji}</text>

                {/* Disease badge */}
                {hasDis && (
                  <g>
                    <rect x={x - 30} y="418" width="60" height="14" rx="4" fill="rgba(244,63,94,0.18)" stroke="rgba(244,63,94,0.5)" />
                    <text x={x} y="428" textAnchor="middle" fill="#fb7185" fontSize="6" fontWeight="700">🦠 DISEASED</text>
                  </g>
                )}

                {/* EC RUNOFF sensor */}
                <circle cx={x} cy="460" r="11" fill={`${phSc}25`} stroke={phSc} strokeWidth="2" />
                <text x={x} y="457" textAnchor="middle" fill={phSc} fontSize="5" fontWeight="700">EC</text>
                <text x={x} y="465" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono, monospace">{row.sensors.ecRunoff.toFixed(1)}</text>
              </g>
            );
          })}

          {/* ═══ RETURN DRAIN ═══ */}
          <rect x="230" y="500" width="700" height="6" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
          <rect x="230" y="500" width="700" height="6" rx="3" fill="url(#waterGrad)" className="flow-anim-h-rev" />
          <text x="580" y="522" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="600" letterSpacing="1">RETURN DRAIN → RESERVOIR</text>
          <path d="M230 503 L230 480 Q230 465 210 465 L115 465 L115 430" stroke="rgba(59,130,246,0.25)" strokeWidth="2" fill="none" />

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
