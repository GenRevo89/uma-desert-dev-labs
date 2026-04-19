"use client";

import { useSimulation } from '../SimulationContext';
import { Activity, TriangleAlert } from 'lucide-react';
import { getAmbientStatus, getReservoirStatus, ReservoirKey } from '../types';
import ZipGrowTower from './builder/ZipGrowTower';
import ReservoirTank from './builder/ReservoirTank';
import Pump from './builder/Pump';
import Manifold from './builder/Manifold';
import ReturnDrain from './builder/ReturnDrain';
import DosingPump from './builder/DosingPump';
import ClimateActuator from './builder/ClimateActuator';
import Chiller from './builder/Chiller';
import SoilField from './builder/SoilField';

const NODE_TYPES = [
  // Visual Schematics
  { type: 'Reservoir', w: 180, h: 110, color: 'var(--cyan)' },
  { type: 'Tower', w: 120, h: 490, color: 'var(--accent)' },
  { type: 'Pump', w: 60, h: 60, color: 'var(--cyan)' },
  { type: 'Air Pump', w: 60, h: 60, color: 'var(--violet)' },
  { type: 'Manifold', w: 60, h: 140, color: 'var(--accent)' },
  { type: 'Return Drain', w: 120, h: 40, color: 'var(--cyan)' },
  { type: 'Dosing Pump', w: 80, h: 180, color: 'var(--amber)' },
  { type: 'Climate Actuator', w: 100, h: 60, color: 'var(--violet)' },
  { type: 'Chiller', w: 100, h: 80, color: 'var(--cyan)' },
  { type: 'Soil Plot', w: 180, h: 140, color: 'var(--amber)' },
  
  // General Logic Nodes (Fallbacks)
  { type: 'Environment Zone', w: 180, h: 140, color: 'var(--violet)' },
  { type: 'Irrigation Valve', w: 120, h: 80, color: 'var(--cyan)' },
  { type: 'Weather Station', w: 220, h: 80, color: 'var(--violet)' },
  { type: 'Sensor', w: 220, h: 80, color: 'var(--amber)' },
];

export default function CustomSchematic({ projectBase, nodes, pipes }: { projectBase: any, nodes: any[], pipes: any[] }) {
  const {
    reservoir, ambient, systemActuators, umaActive, bottlenecks, cascadeActive
  } = useSimulation();

  const getSize = (type: string) => NODE_TYPES.find(t => t.type === type) || { w: 80, h: 80, color: '#fff' };

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

      <div className="schematic-body bg-black/20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
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
            const sDef = getSize(src.type);
            const tDef = getSize(tgt.type);
            
            // Connect heuristic
            const p1 = { x: src.x, y: src.y + sDef.h/2 };
            const p2 = { x: tgt.x, y: tgt.y - tDef.h/2 };

            const pathStr = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + 100}, ${p2.x} ${p2.y - 100}, ${p2.x} ${p2.y}`;
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
            const def = getSize(node.type);
            
            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                
                {['Environment Zone', 'Sensor'].includes(node.type) && (
                  <circle cx={def.w / 2} cy={def.h / 2} r={180} fill={def.color} opacity={0.07} stroke={def.color} strokeWidth={1} strokeDasharray="8 8" className="animate-[spin_60s_linear_infinite] pointer-events-none" />
                )}
                
                {node.type === 'Tower' ? (
                  <g transform={`translate(${def.w / 2}, 0)`}>
                    <ZipGrowTower
                      x={0} y={0} i={1} towerId={node.id} cropName={node.options?.crop || "Unassigned"} emoji="🌱"
                      valveOpen={isTowerFlowing(node.id)} healthStatus="nominal" rhStatus="nominal" rhValue={ambient.humidity} phInput={reservoir.ph} ecRunoff={reservoir.ec} isDisease={false} fluidColor={fluidColor}
                    />
                  </g>
                ) : node.type === 'Reservoir' ? (
                  <ReservoirTank x={0} y={0} flowRate={reservoirFlowRate(node.id)} isAerated={isReservoirAerated(node.id)} />
                ) : node.type === 'Pump' ? (
                  <Pump x={0} y={0} label="MAIN PUMP" type="water" isActive={hasIncomingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Air Pump' ? (
                  <Pump x={0} y={0} label="AIRSTONE" type="air" isActive={hasOutgoingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Manifold' ? (
                  <Manifold x={0} y={0} towerPositions={[0, 40, 80]} valveStates={[true, true, true]} fluidColor={fluidColor} label="MANIFOLD" />
                ) : node.type === 'Return Drain' ? (
                  <ReturnDrain x={0} y={0} width={120} label="SYSTEM DRAIN" fluidColor={fluidColor} />
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
        </svg>
      </div>
    </div>
  );
}
