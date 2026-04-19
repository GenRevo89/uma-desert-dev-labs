"use client";

import { useSimulation } from '../SimulationContext';
import { Activity, TriangleAlert } from 'lucide-react';
import { getAmbientStatus, getReservoirStatus, ReservoirKey } from '../types';
import TowerBlock, { TOWER_PORTS } from './builder/TowerBlock';
import ReservoirBlock, { RESERVOIR_PORTS } from './builder/ReservoirBlock';
import Pump from './builder/Pump';
import Manifold from './builder/Manifold';
import ReturnDrain from './builder/ReturnDrain';
import DosingPump from './builder/DosingPump';
import ClimateActuator from './builder/ClimateActuator';
import Chiller from './builder/Chiller';
import SoilField from './builder/SoilField';
import LedPanel from './builder/LedPanel';
import InlineSensor from './builder/InlineSensor';

const NODE_TYPES = [
  { type: 'Reservoir',        w: 220, h: 320, color: 'var(--cyan)' },
  { type: 'Tower',            w: 120, h: 500, color: 'var(--accent)' },
  { type: 'Manifold',         w: 60,  h: 140, color: 'var(--accent)' },
  { type: 'Return Drain',     w: 200, h: 40,  color: 'var(--cyan)' },
  { type: 'LED Panel',        w: 220, h: 30,  color: 'var(--amber)' },
  { type: 'Chiller',          w: 70,  h: 100, color: 'var(--cyan)' },
  { type: 'Climate Actuator', w: 70,  h: 30,  color: 'var(--violet)' },
  { type: 'Irrigation Valve', w: 50,  h: 30,  color: 'var(--cyan)' },
  { type: 'Pump',             w: 60,  h: 60,  color: 'var(--cyan)' },
  { type: 'Air Pump',         w: 60,  h: 60,  color: 'var(--violet)' },
  { type: 'Dosing Pump',      w: 80,  h: 30,  color: 'var(--amber)' },
  { type: 'Soil Plot',        w: 400, h: 300, color: 'var(--amber)' },
  { type: 'Sensor',           w: 50,  h: 50,  color: 'var(--accent)' },
  { type: 'Weather Station',  w: 100, h: 100, color: 'var(--amber)' },
  { type: 'Environment Zone', w: 300, h: 300, color: 'var(--violet)' },
  { type: 'Inline Sensor',    w: 36,  h: 36,  color: 'var(--accent)' },
];

export default function CustomSchematic({ projectBase, nodes, pipes }: { projectBase: any, nodes: any[], pipes: any[] }) {
  const {
    reservoir, ambient, systemActuators, umaActive, umaState, bottlenecks, cascadeActive, rowZones
  } = useSimulation();

  const getSize = (nodeOrType: any) => {
    const type = typeof nodeOrType === 'string' ? nodeOrType : nodeOrType.type;
    const base = NODE_TYPES.find(t => t.type === type) || { w: 80, h: 80, color: '#fff' };
    
    if (typeof nodeOrType !== 'string') {
      if (type === 'Manifold') {
        const orientation = nodeOrType.options?.orientation || 'horizontal';
        const inputs = nodeOrType.options?.numInputs || 1;
        const outputs = nodeOrType.options?.numOutputs || 4;
        const longestSide = Math.max(inputs, outputs) * 16 + 24;
        if (orientation === 'vertical') {
          return { ...base, w: 40, h: longestSide };
        } else {
          return { ...base, w: longestSide, h: 40 };
        }
      } else if (type === 'Return Drain') {
        return { ...base, w: nodeOrType.options?.width || 300, h: 40 };
      }
    }
    return base;
  };

  /* ── GRAPH TRAVERSAL ENGINE (Video Game Logic) ── */
  const hasIncomingPath = (targetId: string, requiredOriginType: string, visited = new Set<string>()): boolean => {
    if (visited.has(targetId)) return false;
    visited.add(targetId);
    const incomingPipes = pipes.filter(p => p.targetId === targetId);
    return incomingPipes.some(p => {
      const srcNode = nodes.find(n => n.id === p.sourceId);
      if (srcNode?.type === requiredOriginType) return true;
      return hasIncomingPath(p.sourceId, requiredOriginType, visited);
    });
  };

  const hasOutgoingPath = (sourceId: string, requiredTargetType: string, visited = new Set<string>()): boolean => {
    if (visited.has(sourceId)) return false;
    visited.add(sourceId);
    const outgoingPipes = pipes.filter(p => p.sourceId === sourceId);
    return outgoingPipes.some(p => {
      const tgtNode = nodes.find(n => n.id === p.targetId);
      if (tgtNode?.type === requiredTargetType) return true;
      return hasOutgoingPath(p.targetId, requiredTargetType, visited);
    });
  };

  const checkWaterSource = (id: string, visited = new Set<string>()): boolean => {
    if (visited.has(id)) return false;
    visited.add(id);
    const node = nodes.find(n => n.id === id);
    if (node?.type === 'Reservoir') return true;
    
    return pipes.filter(p => p.targetId === id).some(p => {
      const srcNode = nodes.find(n => n.id === p.sourceId);
      if (['Pump', 'Manifold', 'Reservoir', 'Chiller', 'Sensor', 'Irrigation Valve', 'Dosing Pump'].includes(srcNode?.type || '')) {
        return checkWaterSource(p.sourceId, visited);
      }
      return false;
    });
  };

  const isTowerFlowing = (towerId: string) => {
    return hasOutgoingPath(towerId, 'Return Drain') && checkWaterSource(towerId) && hasIncomingPath(towerId, 'Pump');
  };

  const isSoilIrrigated = (id: string) => {
    return hasIncomingPath(id, 'Irrigation Valve') && checkWaterSource(id) && hasOutgoingPath(id, 'Return Drain');
  };

  const isReservoirAerated = (resId: string) => hasIncomingPath(resId, 'Air Pump');
  const reservoirFlowRate = (resId: string) => hasOutgoingPath(resId, 'Pump') ? 2.5 : 0;

  // Determine fluid color from context math engine
  const phLevel = reservoir.ph;
  const ecLevel = reservoir.ec;
  let fluidColor = '#3b82f6';
  if (phLevel < 5.7) fluidColor = '#f59e0b';
  else if (phLevel > 6.3) fluidColor = '#8b5cf6';
  else if (ecLevel > 2.0) fluidColor = '#22c55e';
  else if (ecLevel < 1.0) fluidColor = '#93c5fd';
  else fluidColor = '#06b6d4';

  // Dynamically frame the viewport boundary box for custom sandbox topologies
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const s = getSize(n);
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + s.w > maxX) maxX = n.x + s.w;
    if (n.y + s.h > maxY) maxY = n.y + s.h;
  });
  pipes.forEach((p: any) => {
    (p.waypoints || []).forEach((wp: any) => {
      if (wp.x < minX) minX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y > maxY) maxY = wp.y;
    });
  });

  if (nodes.length === 0) {
    minX = 0; minY = 0; maxX = 1000; maxY = 600;
  } else {
    // Generous padding to natively zoom out the schematic and ensure edge-pipes fit.
    // Unbalanced Y-padding intentionally shifts the optical center upwards so tall topologies don't clip the bottom edge.
    minX -= 250; 
    minY -= 50; 
    maxX += 250; 
    maxY += 450; 
  }
  const vbWidth = Math.max(maxX - minX, 100);
  const vbHeight = Math.max(maxY - minY, 100);
  const calcViewBox = `${minX} ${minY} ${vbWidth} ${vbHeight}`;

  const buildPipePath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    const r = 12; // corner radius
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      if (i < points.length - 1) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);
        const cr = Math.min(r, len1 / 2, len2 / 2);
        if (cr > 1 && len1 > 0 && len2 > 0) {
          const ax = curr.x - (dx1 / len1) * cr;
          const ay = curr.y - (dy1 / len1) * cr;
          const bx = curr.x + (dx2 / len2) * cr;
          const by = curr.y + (dy2 / len2) * cr;
          d += ` L ${ax} ${ay} Q ${curr.x} ${curr.y} ${bx} ${by}`;
        } else {
          d += ` L ${curr.x} ${curr.y}`;
        }
      } else {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
    }
    return d;
  };

  return (
    <div className="schematic glass-panel animate-in animate-in-delay-1">
      <div className="schematic-header">
        <h3>{projectBase.name} — Interactive Digital Twin</h3>
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

      <div 
        className="schematic-body bg-black/20" 
        style={{ 
          backgroundImage: 'radial-gradient(ellipse at 50% 120%, rgba(34, 197, 94, 0.03) 0%, transparent 50%), linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
          backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
          width: '100%',
          minHeight: '580px',
          height: 'calc(100vh - 220px)',
          maxHeight: '1200px'
        }}
      >
        <svg className="w-full h-full" viewBox={calcViewBox} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor={fluidColor} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <style>
              {`
                @keyframes dash-fluid { to { stroke-dashoffset: -40; } }
                .flowing-sim { stroke-dasharray: 10, 10; animation: dash-fluid 1s linear infinite; stroke: ${fluidColor}; filter: drop-shadow(0 0 4px ${fluidColor}80); }
              `}
            </style>
          </defs>

          {/* Render Drawn Pipes */}
          {pipes.map(pipe => {
            const src = nodes.find(n => n.id === pipe.sourceId);
            const tgt = nodes.find(n => n.id === pipe.targetId);
            if (!src || !tgt) return null;
            const sDef = getSize(src);
            const tDef = getSize(tgt);
            
            // Perfect structural fidelity using Builder waypoints, else primitive fallback
            // Calculate source output port position
            let p1: { x: number; y: number };
            if (src.type === 'Reservoir') {
              p1 = { x: src.x + RESERVOIR_PORTS.waterOut.x, y: src.y + RESERVOIR_PORTS.waterOut.y };
            } else if (src.type === 'Tower') {
              p1 = { x: src.x + TOWER_PORTS.waterOut.x, y: src.y + TOWER_PORTS.waterOut.y };
            } else if (src.type === 'Manifold') {
              const orient = src.options?.orientation || 'horizontal';
              const numOutputs = src.options?.numOutputs || 4;
              const outgoingPipes = pipes.filter((p: any) => p.sourceId === src.id).sort((a: any,b: any) => a.id.localeCompare(b.id));
              const idx = Math.min(outgoingPipes.findIndex((p: any) => p.id === pipe.id), numOutputs - 1);
              const spacing = orient === 'horizontal' ? sDef.w / (numOutputs + 1) : sDef.h / (numOutputs + 1);
              const px = orient === 'horizontal' ? src.x + spacing * (idx + 1) : src.x + sDef.w;
              const py = orient === 'horizontal' ? src.y + sDef.h : src.y + spacing * (idx + 1);
              p1 = { x: px, y: py };
            } else if (src.type === 'Return Drain') {
              const outgoingPipes = pipes.filter((p: any) => p.sourceId === src.id).sort((a: any,b: any) => a.id.localeCompare(b.id));
              const idx = outgoingPipes.findIndex((p: any) => p.id === pipe.id);
              const spacing = sDef.w / (outgoingPipes.length + 1);
              p1 = { x: src.x + spacing * (idx + 1), y: src.y + sDef.h };
            } else {
              p1 = { x: src.x + sDef.w + 6, y: src.y + sDef.h / 2 };
            }

            // Calculate target input port position
            let p2: { x: number; y: number };
            if (tgt.type === 'Tower') {
              p2 = { x: tgt.x + TOWER_PORTS.waterIn.x, y: tgt.y + TOWER_PORTS.waterIn.y };
            } else if (tgt.type === 'Manifold') {
              const orient = tgt.options?.orientation || 'horizontal';
              const numInputs = tgt.options?.numInputs || 1;
              const incomingPipes = pipes.filter((p: any) => p.targetId === tgt.id).sort((a: any,b: any) => a.id.localeCompare(b.id));
              const idx = Math.min(incomingPipes.findIndex((p: any) => p.id === pipe.id), numInputs - 1);
              const spacing = orient === 'horizontal' ? tDef.w / (numInputs + 1) : tDef.h / (numInputs + 1);
              const px = orient === 'horizontal' ? tgt.x + spacing * (idx + 1) : tgt.x;
              const py = orient === 'horizontal' ? tgt.y : tgt.y + spacing * (idx + 1);
              p2 = { x: px, y: py };
            } else if (tgt.type === 'Return Drain') {
              const incomingPipes = pipes.filter((p: any) => p.targetId === tgt.id).sort((a: any,b: any) => a.id.localeCompare(b.id));
              const idx = incomingPipes.findIndex((p: any) => p.id === pipe.id);
              const spacing = tDef.w / (incomingPipes.length + 1);
              p2 = { x: tgt.x + spacing * (idx + 1), y: tgt.y };
            } else if (tgt.type === 'Reservoir') {
              p2 = { x: tgt.x + RESERVOIR_PORTS.waterIn.x, y: tgt.y + RESERVOIR_PORTS.waterIn.y };
            } else {
              p2 = { x: tgt.x - 6, y: tgt.y + tDef.h / 2 };
            }

            let pathStr = '';
            if (pipe.waypoints && pipe.waypoints.length > 0) {
              const allPoints = [p1, ...pipe.waypoints, p2];
              pathStr = buildPipePath(allPoints);
            } else {
              pathStr = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + 100}, ${p2.x} ${p2.y - 100}, ${p2.x} ${p2.y}`;
            }
            const isFlowing = systemActuators.circulation_pump || true; // Flow defaults true if math engine runs

            return (
              <g key={pipe.id}>
                <path d={pathStr} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <path d={pathStr} fill="none" strokeWidth="3" className={isFlowing ? 'flowing-sim' : ''} />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map(node => {
            const def = getSize(node);
            
            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                
                {['Environment Zone', 'Sensor'].includes(node.type) && (
                  <circle cx={def.w / 2} cy={def.h / 2} r={180} fill={def.color} opacity={0.07} stroke={def.color} strokeWidth={1} strokeDasharray="8 8" className="animate-[spin_60s_linear_infinite] pointer-events-none" />
                )}
                
                {node.type === 'Tower' ? (
                  <TowerBlock
                    towerId={node.id} 
                    cropName={rowZones?.find(r => r.towerId === node.id)?.crop || node.options?.crop || "Unassigned"} 
                    emoji={rowZones?.find(r => r.towerId === node.id)?.emoji || "🌱"}
                    slots={(node.slots || []).map((s: any) => {
                      if (s.slotId === 'sensor-ph' || s.occupantOptions?.sensorType === 'pH') return { ...s, occupied: true, occupantType: reservoir.ph.toFixed(1) };
                      if (s.slotId === 'sensor-rh' || s.occupantOptions?.sensorType === 'RH') return { ...s, occupied: true, occupantType: ambient.humidity.toFixed(0) };
                      if (s.slotId === 'sensor-ec' || s.occupantOptions?.sensorType === 'EC') return { ...s, occupied: true, occupantType: reservoir.ec.toFixed(1) };
                      return s;
                    })}
                    valveOpen={isTowerFlowing(node.id)} healthStatus="nominal" fluidColor={fluidColor} isSelected={false} i={1}
                  />
                ) : node.type === 'Reservoir' ? (
                  <ReservoirBlock 
                    slots={(node.slots || []).map((s: any) => {
                      if (s.slotId === 'sensor-ph') return { ...s, occupied: true, occupantType: reservoir.ph.toFixed(2) };
                      if (s.slotId === 'sensor-ec') return { ...s, occupied: true, occupantType: reservoir.ec.toFixed(2) };
                      if (s.slotId === 'sensor-temp') return { ...s, occupied: true, occupantType: `${reservoir.temp.toFixed(1)}°C` };
                      return s;
                    })}
                    isAerated={isReservoirAerated(node.id)} flowRate={reservoirFlowRate(node.id)} isSelected={false}
                  />
                ) : node.type === 'Pump' ? (
                  <Pump x={0} y={0} label="MAIN PUMP" type="water" isActive={hasIncomingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Air Pump' ? (
                  <Pump x={0} y={0} label="AIRSTONE" type="air" isActive={hasOutgoingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Manifold' ? (
                  <Manifold x={0} y={0} w={def.w} h={def.h} orientation={node.options?.orientation || 'horizontal'} numInputs={node.options?.numInputs || 1} numOutputs={node.options?.numOutputs || 4} fluidColor={fluidColor} label={node.options?.label || 'MANIFOLD'} />
                ) : node.type === 'Return Drain' ? (
                  <ReturnDrain x={0} y={0} width={def.w} label={node.options?.label || 'SYSTEM DRAIN'} fluidColor={fluidColor} />
                ) : node.type === 'Climate Actuator' ? (
                  <ClimateActuator x={0} y={0} type="humidifier" isActive={hasIncomingPath(node.id, 'Environment Zone')} />
                ) : node.type === 'Chiller' ? (
                  <Chiller x={0} y={0} status="nominal" isActive={hasIncomingPath(node.id, 'Pump')} />
                ) : node.type === 'Dosing Pump' ? (
                  <DosingPump x={0} y={0} label="NUTR A" color="rgba(34,197,94,0.45)" fill="rgba(34,197,94,0.15)" isActive={hasOutgoingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Soil Plot' ? (
                  <SoilField 
                    x={0} y={0}
                    fieldStyle={node.options?.style || 'Rows'}
                    cropName={node.options?.crop || 'Unassigned'}
                    isIrrigated={isSoilIrrigated(node.id)}
                    moistureLevel={isSoilIrrigated(node.id) ? 65 : 15}
                    fluidColor={fluidColor}
                  />
                ) : node.type === 'LED Panel' ? (
                  <LedPanel x={0} y={0} width={def.w} lightLevel={node.options?.par || ambient.light} status={getAmbientStatus('light', node.options?.par || ambient.light)} />
                ) : node.type === 'Inline Sensor' ? (
                  <InlineSensor x={def.w / 2} y={def.h / 2} sensorType={node.options?.sensorType || 'pH'} status="nominal" />
                ) : node.type === 'Irrigation Valve' ? (
                  <g>
                    <rect x={0} y={0} width={def.w} height={def.h} rx={6} fill="rgba(6,182,212,0.1)" stroke="rgba(6,182,212,0.4)" strokeWidth="1.5" />
                    <text x={def.w/2} y={def.h/2 + 4} textAnchor="middle" fill="rgba(6,182,212,0.8)" fontSize="7" fontWeight="700">VALVE</text>
                  </g>
                ) : (
                  <>
                    <rect 
                      x={0} 
                      y={0} 
                      width={def.w} 
                      height={def.h} 
                      rx={8} 
                      fill="rgba(17, 24, 39, 0.9)" 
                      stroke={def.color} 
                      strokeWidth="1.5"
                    />
                    <text x={def.w/2} y={def.h/2 - 5} textAnchor="middle" fill={def.color} fontSize="10" fontWeight="bold" pointerEvents="none">{node.type}</text>
                    <text x={def.w/2} y={def.h/2 + 10} textAnchor="middle" fill="#fff" fontSize="8">{node.id}</text>
                  </>
                )}

                {node.type === 'Environment Zone' && (
                  <>
                    <text x={def.w/2} y={def.h/2 - 15} textAnchor="middle" fill="var(--violet)" fontSize="10">Climate</text>
                    <text x={def.w/2} y={def.h/2 + 5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">{ambient.humidity.toFixed(0)}% RH</text>
                    <text x={def.w/2} y={def.h/2 + 25} textAnchor="middle" fill="var(--amber)" fontSize="10">PAR {ambient.light.toFixed(0)}</text>
                  </>
                )}

                {node.type === 'Sensor' && (
                  <>
                    <text x={def.w/2} y={def.h/2} textAnchor="middle" fill="var(--amber)" fontSize="10" fontWeight="bold">Logic</text>
                  </>
                )}
              </g>
            );
          })}

          {/* ═══ UMA ORB ═══ */}
          <g className={`uma-svg-orb ${umaState}`} transform={`translate(${maxX + 40}, ${maxY - 40})`}>
            <circle cx="0" cy="0" r="28" fill="rgba(34,197,94,0.04)" stroke={umaActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'} strokeWidth="1" className="uma-ring-1" />
            <circle cx="0" cy="0" r="20" fill="rgba(34,197,94,0.06)" stroke={umaActive ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)'} strokeWidth="1" className="uma-ring-2" />
            <circle cx="0" cy="0" r="12" fill={umaActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'} stroke={umaActive ? '#22c55e' : 'rgba(255,255,255,0.18)'} strokeWidth="1.5" />
            {umaActive && <circle cx="0" cy="0" r="3" fill="#22c55e" filter="url(#glowSm)"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" /></circle>}
            <text x="0" y="36" textAnchor="middle" fill={umaActive ? '#4ade80' : 'rgba(255,255,255,0.3)'} fontSize="8" fontWeight="700" letterSpacing="1.5">UMA</text>
            {umaActive && nodes.filter((n: any) => n.type === 'Tower').map((t: any, i) => (
              <line key={`uma-line-${i}`} x1="0" y1="0" x2={t.x - (maxX + 40)} y2={t.y + 40 - (maxY - 40)} stroke="rgba(34,197,94,0.08)" strokeWidth="1" strokeDasharray="4 4" />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
