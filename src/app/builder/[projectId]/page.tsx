"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Play, CheckCircle, Package, Settings2, Trash2, Plus } from 'lucide-react';
import ZipGrowTower from '../../simulation/components/builder/ZipGrowTower';
import ReservoirTank from '../../simulation/components/builder/ReservoirTank';
import Pump from '../../simulation/components/builder/Pump';
import Manifold from '../../simulation/components/builder/Manifold';
import ReturnDrain from '../../simulation/components/builder/ReturnDrain';
import DosingPump from '../../simulation/components/builder/DosingPump';
import ClimateActuator from '../../simulation/components/builder/ClimateActuator';
import Chiller from '../../simulation/components/builder/Chiller';
import SoilField from '../../simulation/components/builder/SoilField';
import '../builder.css';

// Node Library Models
const NODE_TYPES = [
  // Visual Schematics
  { type: 'Reservoir', w: 180, h: 110, color: 'var(--cyan)', icon: '🌊' },
  { type: 'Tower', w: 120, h: 490, color: 'var(--accent)', icon: '🌱' },
  { type: 'Pump', w: 60, h: 60, color: 'var(--cyan)', icon: '⚙️' },
  { type: 'Air Pump', w: 60, h: 60, color: 'var(--violet)', icon: '🫧' },
  { type: 'Manifold', w: 60, h: 140, color: 'var(--accent)', icon: '🔱' },
  { type: 'Return Drain', w: 120, h: 40, color: 'var(--cyan)', icon: '🕳️' },
  { type: 'Dosing Pump', w: 80, h: 180, color: 'var(--amber)', icon: '🧪' },
  { type: 'Climate Actuator', w: 100, h: 60, color: 'var(--violet)', icon: '❄️' },
  { type: 'Chiller', w: 100, h: 80, color: 'var(--cyan)', icon: '🧊' },
  { type: 'Soil Plot', w: 180, h: 140, color: 'var(--amber)', icon: '🌾' },
  
  // General Logic Nodes (Fallbacks)
  { type: 'Environment Zone', w: 180, h: 140, color: 'var(--violet)', icon: '🌡️' },
  { type: 'Irrigation Valve', w: 120, h: 80, color: 'var(--cyan)', icon: '🚿' },
  { type: 'Weather Station', w: 220, h: 80, color: 'var(--violet)', icon: '⛅' },
  { type: 'Sensor', w: 220, h: 80, color: 'var(--amber)', icon: '📡' },
];

type NodeDef = {
  id: string;
  type: string;
  x: number;
  y: number;
  options?: any;
};

type PipeDef = {
  id: string;
  sourceId: string;
  targetId: string;
};

export default function TwinWorkspace() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [projectBase, setProjectBase] = useState<any>(null);
  
  // Workspace State
  const [nodes, setNodes] = useState<NodeDef[]>([]);
  const [pipes, setPipes] = useState<PipeDef[]>([]);
  
  // Interaction State
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [drawingPipeFrom, setDrawingPipeFrom] = useState<{ id: string, x: number, y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // DnD State tracking (bypasses browser dataTransfer sandboxing)
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging logic
  const dragTarget = useRef<{ id: string, ox: number, oy: number } | null>(null);

  // Standard component size access
  const getSize = (type: string) => NODE_TYPES.find(t => t.type === type) || { w: 80, h: 80, color: '#fff', icon: '❓' };

  /* ── GRAPH TRAVERSAL ENGINE (Video Game Logic) ── */
  const hasIncomingPath = useCallback((targetId: string, requiredOriginType: string, visited = new Set<string>()): boolean => {
    if (visited.has(targetId)) return false;
    visited.add(targetId);
    const incomingPipes = pipes.filter(p => p.targetId === targetId);
    return incomingPipes.some(p => {
      const srcNode = nodes.find(n => n.id === p.sourceId);
      if (srcNode?.type === requiredOriginType) return true;
      return hasIncomingPath(p.sourceId, requiredOriginType, visited);
    });
  }, [nodes, pipes]);

  const hasOutgoingPath = useCallback((sourceId: string, requiredTargetType: string, visited = new Set<string>()): boolean => {
    if (visited.has(sourceId)) return false;
    visited.add(sourceId);
    const outgoingPipes = pipes.filter(p => p.sourceId === sourceId);
    return outgoingPipes.some(p => {
      const tgtNode = nodes.find(n => n.id === p.targetId);
      if (tgtNode?.type === requiredTargetType) return true;
      return hasOutgoingPath(p.targetId, requiredTargetType, visited);
    });
  }, [nodes, pipes]);

  const checkWaterSource = useCallback((id: string, visited = new Set<string>()): boolean => {
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
  }, [nodes, pipes]);

  const isTowerFlowing = useCallback((towerId: string) => {
    return hasOutgoingPath(towerId, 'Return Drain') && checkWaterSource(towerId) && hasIncomingPath(towerId, 'Pump');
  }, [checkWaterSource, hasIncomingPath, hasOutgoingPath]);

  const isSoilIrrigated = useCallback((id: string) => {
    return hasIncomingPath(id, 'Irrigation Valve') && checkWaterSource(id) && hasOutgoingPath(id, 'Return Drain');
  }, [checkWaterSource, hasIncomingPath, hasOutgoingPath]);

  const isReservoirAerated = useCallback((resId: string) => {
    return hasIncomingPath(resId, 'Air Pump');
  }, [hasIncomingPath]);

  const reservoirFlowRate = useCallback((resId: string) => {
    return hasOutgoingPath(resId, 'Pump') ? 2.5 : 0;
  }, [hasOutgoingPath]);

  /* ── 1. Load Project ── */
  useEffect(() => {
    const fetchProj = async () => {
      try {
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `query { getTwinProjectById(id: "${projectId}") { id name componentsJson pipesJson } }` }),
        });
        const { data } = await res.json();
        const p = data?.getTwinProjectById;
        if (p) {
          setProjectBase(p);
          try { setNodes(JSON.parse(p.componentsJson || '[]')); } catch {}
          try { setPipes(JSON.parse(p.pipesJson || '[]')); } catch {}
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProj();
  }, [projectId]);

  /* ── 2. Drag & Drop interactions ── */
  const onMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;
    setMousePos({ x, y });

    if (dragTarget.current) {
      setNodes(prev => prev.map(n => n.id === dragTarget.current!.id ? { ...n, x: x - dragTarget.current!.ox, y: y - dragTarget.current!.oy } : n));
    }
  };

  const onMouseUp = () => { dragTarget.current = null; };

  const startDrag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    const mx = (e.clientX - CTM.e) / CTM.a;
    const my = (e.clientY - CTM.f) / CTM.d;

    const node = nodes.find(n => n.id === id);
    if (!node) return;

    setSelectedNode(id);
    dragTarget.current = { id, ox: mx - node.x, oy: my - node.y };
  };

  const addNodeFromLibrary = (type: string) => {
    setNodes(prev => [...prev, { id: `${type.substring(0,3)}-${Date.now()}`, type, x: 200, y: 200, options: {} }]);
  };

  /* ── 3. Wire/Pipe Logic ── */
  const handlePortClick = (e: React.MouseEvent, id: string, type: 'out' | 'in') => {
    e.stopPropagation();
    if (type === 'out') {
      const CTM = svgRef.current!.getScreenCTM()!;
      setDrawingPipeFrom({ id, x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d });
    } else if (type === 'in' && drawingPipeFrom && drawingPipeFrom.id !== id) {
      setPipes(prev => [...prev, { id: `pipe-${Date.now()}`, sourceId: drawingPipeFrom.id, targetId: id }]);
      setDrawingPipeFrom(null);
    }
  };

  const getCubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
    // N8N style: ports are left and right, so the curve pulls horizontally
    const offset = Math.max(Math.abs(x2 - x1) / 2, 50);
    return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
  };

  /* ── 4. Generative SVG Thumbnail ── */
  const generateThumbnail = () => {
    if (!svgRef.current) return '';
    return svgRef.current.outerHTML;
  };

  /* ── 5. Save State ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const thumb = generateThumbnail();
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation SaveTwinProject($id: ID!, $name: String!, $thumb: String, $comps: String, $pipes: String) {
            saveTwinProject(id: $id, name: $name, thumbnailSvg: $thumb, componentsJson: $comps, pipesJson: $pipes) { id }
          }`,
          variables: {
            id: projectId,
            name: projectBase.name,
            thumb: thumb,
            comps: JSON.stringify(nodes),
            pipes: JSON.stringify(pipes)
          }
        })
      });
      alert('Saved Successfully!');
    } catch(e) {
      console.error(e);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ── 6. Uma Verification ── */
  const verifySystem = async () => {
    setAnalysisResult("Uma is analyzing your topology...");
    try {
      const prompt = `[SYSTEM ARCHITECTURE REVIEW] Analyze this digital twin topography. Nodes: ${JSON.stringify(nodes.map(n => ({id: n.id, type: n.type})))}. Pipes: ${JSON.stringify(pipes)}. Provide 1-2 concise paragraphs judging the layout. If there are unconnected towers, lack of sensors, or isolated nodes, warn the user. Provide any actionable tips.`;
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          farmSchema: { nodes, pipes }
        }),
      });
      const data = await res.json();
      setAnalysisResult(data.choices?.[0]?.message?.content || "Status nominal.");
    } catch (e) {
      setAnalysisResult("Failed to reach Uma API.");
    }
  };

  if (loading) return <div className="p-8">Loading workspace...</div>;

  const selNode = nodes.find(n => n.id === selectedNode);

  return (
    <div className="workspace-container" style={{ margin: '-32px -40px', height: '100vh', zIndex: 10 }}>
      {/* LEFT SIDEBAR: Library */}
      <div className="workspace-sidebar" style={{ background: '#060a10', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div className="p-4 border-b border-white/10 shrink-0">
          <Link href="/builder" className="btn btn-ghost mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft size={14} /> Back to Hub
          </Link>
          <h2 className="text-lg font-bold text-white mb-1">{projectBase?.name || 'Project'}</h2>
          <p className="text-xs text-gray-500">Drag components onto the canvas</p>
        </div>
        
        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
          {NODE_TYPES.map(nt => (
            <div 
              key={nt.type}
              className="n8n-library-node relative group"
              style={{ borderLeft: `3px solid ${nt.color}` }}
              draggable={true}
              onDragStart={(e) => {
                setDraggedNodeType(nt.type);
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', nt.type || 'fallback');
              }}
            >
              <span style={{ color: nt.color, fontSize: '18px' }}>{nt.icon}</span>
              <div className="n8n-lib-text flex-1">
                <strong>{nt.type}</strong>
                <span>Drag to layout</span>
              </div>
              <button 
                className="absolute right-3 opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] p-1.5 rounded transition-all z-20 text-gray-400"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addNodeFromLibrary(nt.type);
                }}
                title="Click to spawn at center"
              >
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: SVG Canvas */}
      <div 
        className="workspace-canvas n8n-canvas flex-1 w-full h-full" 
        onMouseMove={onMouseMove} 
        onMouseUp={onMouseUp} 
        onClick={() => { setSelectedNode(null); setDrawingPipeFrom(null); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const type = draggedNodeType || e.dataTransfer.getData('text/plain');
          setDraggedNodeType(null);
          if (!type || type === 'fallback') return;
          if (!svgRef.current) return;
          
          const rect = svgRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const def = getSize(type);
          
          let finalX = x - def.w/2;
          let finalY = y - def.h/2;
          const newNodeId = `${type.substring(0,3)}-${Date.now()}`;

          // Pipe Snap/Interception Logic
          if (['Sensor', 'Irrigation Valve'].includes(type)) {
            for (const pipe of pipes) {
              const src = nodes.find(n => n.id === pipe.sourceId);
              const tgt = nodes.find(n => n.id === pipe.targetId);
              if (!src || !tgt) continue;

              const sDef = getSize(src.type);
              const tDef = getSize(tgt.type);
              const p1 = { x: src.x + sDef.w, y: src.y + sDef.h/2 };
              const p2 = { x: tgt.x, y: tgt.y + tDef.h/2 };

              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;

              // If dropped within 40px of the optical midpoint slot
              if (Math.hypot(x - midX, y - midY) < 40) {
                finalX = midX - def.w / 2;
                finalY = midY - def.h / 2;

                // Sever original pipe and inject twin lines to bridge component
                setPipes(p => {
                  const cleaned = p.filter(px => px.id !== pipe.id);
                  return [
                    ...cleaned,
                    { id: `pipe-${Date.now()}-1`, sourceId: src.id, targetId: newNodeId },
                    { id: `pipe-${Date.now()}-2`, sourceId: newNodeId, targetId: tgt.id }
                  ];
                });
                break;
              }
            }
          }

          setNodes(prev => [...prev, { id: newNodeId, type, x: finalX, y: finalY, options: {} }]);
        }}
      >
        {/* Top Floating Actions */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button className="btn btn-primary shadow-lg" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Layout'}
          </button>
          <button className="btn btn-outline bg-surface-1 shadow-lg" onClick={verifySystem}>
            <CheckCircle size={14} /> Analyze Topology
          </button>
          <button className={`btn shadow-lg ${isTestRunning ? 'btn-danger' : 'btn-success'}`} onClick={() => setIsTestRunning(!isTestRunning)}>
            <Play size={14} /> {isTestRunning ? 'Stop Flow' : 'Test Flow'}
          </button>
        </div>

        {/* Uma Verification Toast */}
        {analysisResult && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-xl w-full bg-[#111827] border border-[#22c55e]/30 rounded-xl p-4 shadow-2xl z-20 flex gap-3 text-sm text-gray-300">
            <span className="text-[#22c55e] shrink-0 font-bold">Uma:</span>
            <span>{analysisResult}</span>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-white" onClick={() => setAnalysisResult(null)}>×</button>
          </div>
        )}

        <svg 
          ref={svgRef} 
          className="absolute top-0 left-0 w-full h-full pt-0 mt-0 pointer-events-none"
          style={{ overflow: 'visible', zIndex: 1 }}
        >
          {/* Render Drawn Pipes (Lines underneath the ForeignObjects) */}
          {pipes.map(pipe => {
            const src = nodes.find(n => n.id === pipe.sourceId);
            const tgt = nodes.find(n => n.id === pipe.targetId);
            if (!src || !tgt) return null;
            const sDef = getSize(src.type);
            const tDef = getSize(tgt.type);
            
            // Connect right port of source to left port of target
            const p1 = { x: src.x + sDef.w, y: src.y + sDef.h/2 };
            const p2 = { x: tgt.x, y: tgt.y + tDef.h/2 };

            const pathStr = getCubicBezier(p1.x, p1.y, p2.x, p2.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return (
              <g key={pipe.id}>
                <path d={pathStr} className={`n8n-wire ${isTestRunning ? 'active' : ''}`} strokeDasharray={isTestRunning ? "8 6" : "none"} />
                <path d={pathStr} stroke="transparent" strokeWidth="20" fill="none" style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); setPipes(p => p.filter(x => x.id !== pipe.id)); }} />
                
                {/* Visual Interception Slot */}
                <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none opacity-40">
                  <rect x="-10" y="-10" width="20" height="20" rx="4" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="0" cy="0" r="3" fill="var(--text-muted)" />
                </g>
              </g>
            );
          })}

          {/* Render Active Drag Pipe */}
          {drawingPipeFrom && (
            <path 
              d={getCubicBezier(drawingPipeFrom.x, drawingPipeFrom.y, mousePos.x, mousePos.y)} 
              className="n8n-wire active" 
            />
          )}

          {/* Render Nodes using standard HTML via foreignObject */}
          {nodes.map(node => {
            const def = getSize(node.type);
            const isSelected = selectedNode === node.id;
            
            return (
              <g 
                key={node.id} 
                transform={`translate(${node.x}, ${node.y})`}
                className="pointer-events-auto"
                onMouseDown={(e) => startDrag(node.id, e)}
                onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
                style={{ cursor: isSelected ? 'grabbing' : 'grab' }}
              >
                {/* Fallback Selection Bounds */}
                {isSelected && (
                  <>
                    <rect x={-4} y={-4} width={def.w + 8} height={def.h + 8} fill={def.color} opacity={0.15} rx={14} />
                    <rect x={-4} y={-4} width={def.w + 8} height={def.h + 8} stroke={def.color} strokeWidth={2} opacity={0.6} fill="none" rx={14} />
                  </>
                )}

                {/* Automated Proximity/Span Radius visualization for Sensors */}
                {['Environment Zone', 'Sensor'].includes(node.type) && (
                  <circle cx={def.w / 2} cy={def.h / 2} r={180} fill={def.color} opacity={0.03} stroke={def.color} strokeWidth={1} strokeDasharray="8 8" className="animate-[spin_60s_linear_infinite] pointer-events-none" />
                )}

                {/* Fallback bounds rect in case foreignObject is failing */}
                <rect x={0} y={0} width={def.w} height={def.h} fill={def.color} opacity={0.15} rx={14} />
                <rect x={0} y={0} width={def.w} height={def.h} stroke={def.color} strokeWidth={2} opacity={0.3} fill="none" rx={14} />

                {/* Animated Component Switch */}
                {node.type === 'Tower' ? (
                  <g transform={`translate(${def.w / 2}, 0)`}>
                    <ZipGrowTower
                      x={0} y={0} i={1} towerId={node.id} cropName={node.options?.crop || "Unassigned"} emoji="🌱"
                      valveOpen={isTowerFlowing(node.id)} healthStatus="nominal" rhStatus="nominal" rhValue={65} phInput={6.0} ecRunoff={1.5} isDisease={false} fluidColor="#06b6d4"
                    />
                  </g>
                ) : node.type === 'Reservoir' ? (
                  <ReservoirTank x={0} y={0} flowRate={reservoirFlowRate(node.id)} isAerated={isReservoirAerated(node.id)} />
                ) : node.type === 'Pump' ? (
                  <Pump x={0} y={0} label="MAIN PUMP" type="water" isActive={hasIncomingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Air Pump' ? (
                  <Pump x={0} y={0} label="AIRSTONE" type="air" isActive={hasOutgoingPath(node.id, 'Reservoir')} />
                ) : node.type === 'Manifold' ? (
                  <Manifold x={0} y={0} towerPositions={[0, 40, 80]} valveStates={[true, true, true]} fluidColor="#06b6d4" label="MANIFOLD" />
                ) : node.type === 'Return Drain' ? (
                  <ReturnDrain x={0} y={0} width={120} label="SYSTEM DRAIN" fluidColor="#06b6d4" />
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
                    fluidColor="#06b6d4"
                  />
                ) : (
                  /* Fallback Generic Logic Node (N8N Style) */
                  <foreignObject x={0} y={0} width={def.w} height={def.h} style={{ overflow: 'visible' }}>
                    <div className={`n8n-node ${isSelected ? 'selected' : ''}`} style={{ width: '100%', height: '100%' }}>
                      <div className="n8n-header" style={{ color: def.color }}>
                        <span>{def.icon}</span> {node.type}
                      </div>
                      <div className="n8n-body">
                        <div className="n8n-title">{node.id}</div>
                        {node.options?.crop ? (
                          <div className="n8n-subtitle">Assigned: {node.options.crop}</div>
                        ) : (
                          <div className="n8n-subtitle" style={{ opacity: 0.6 }}>Unconfigured Input</div>
                        )}
                      </div>
                    </div>
                  </foreignObject>
                )}

                {/* SVG Native Input/Output Connection Ports */}
                <g className="n8n-ports">
                  <circle cx={-6} cy={def.h / 2} r={7} fill={def.color} stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'in')} />
                  <circle cx={def.w + 6} cy={def.h / 2} r={7} fill={def.color} stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT SIDEBAR: Context Panel */}
      {selNode && (
        <div className="context-panel animate-in shrink-0">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
            <h3 className="font-bold text-white flex items-center gap-2"><Settings2 size={16}/> Node Properties</h3>
            <button className="text-gray-500 hover:text-white" onClick={() => setSelectedNode(null)}>×</button>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">ID</label>
            <input type="text" className="w-full bg-[#060a10] border border-white/10 rounded px-3 py-2 text-sm text-gray-300" value={selNode.id} disabled />
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Type</label>
            <div className="text-sm font-semibold" style={{ color: getSize(selNode.type).color }}>{selNode.type}</div>
          </div>

          {['Tower', 'Soil Plot'].includes(selNode.type) && (
            <div className="mb-6">
              <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Assigned Crop</label>
              <select 
                className="w-full bg-[#060a10] border border-white/10 rounded px-3 py-2 text-sm text-white"
                value={selNode.options?.crop || ''}
                onChange={(e) => {
                  setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, crop: e.target.value } } : n));
                }}
              >
                <option value="">Select Crop...</option>
                <optgroup label="Indoor/Hydroponic">
                  <option value="Butterhead Lettuce">Butterhead Lettuce</option>
                  <option value="Basil">Basil</option>
                  <option value="Arugula">Arugula</option>
                  <option value="Kale">Kale</option>
                  <option value="Mint">Mint</option>
                </optgroup>
                <optgroup label="Outdoor/Soil">
                  <option value="Tomatoes">Tomatoes</option>
                  <option value="Corn">Corn</option>
                  <option value="Soybeans">Soybeans</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Cannabis">Cannabis</option>
                </optgroup>
              </select>
            </div>
          )}

          <div className="pt-4 border-t border-white/10">
            <button 
              className="btn btn-outline btn-danger w-full justify-center" 
              onClick={() => {
                setNodes(nodes.filter(n => n.id !== selNode.id));
                setPipes(pipes.filter(p => p.sourceId !== selNode.id && p.targetId !== selNode.id));
                setSelectedNode(null);
              }}
            >
              <Trash2 size={14} /> Delete Node
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
