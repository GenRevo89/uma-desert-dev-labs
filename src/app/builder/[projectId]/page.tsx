"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Save, Play, CheckCircle, Settings2, Trash2, Plus, Minus, X, Camera, Scan, ImagePlus } from 'lucide-react';
import Manifold from '../../simulation/components/builder/Manifold';
import ReturnDrain from '../../simulation/components/builder/ReturnDrain';
import ClimateActuator from '../../simulation/components/builder/ClimateActuator';
import WeatherStation from '../../simulation/components/builder/WeatherStation';
import Chiller from '../../simulation/components/builder/Chiller';
import MunicipalWater from '../../simulation/components/builder/MunicipalWater';
import SoilField from '../../simulation/components/builder/SoilField';
import LedPanel from '../../simulation/components/builder/LedPanel';
import ReservoirBlock, { DEFAULT_RESERVOIR_SLOTS, getReservoirSlotAt, RESERVOIR_PORTS } from '../../simulation/components/builder/ReservoirBlock';
import TowerBlock, { DEFAULT_TOWER_SLOTS, getTowerSlotAt, TOWER_PORTS } from '../../simulation/components/builder/TowerBlock';
import type { SlotDef } from '../../simulation/components/builder/ReservoirBlock';
import '../builder.css';

/* ── Dosting Presets ── */
const DOSING_PRESETS: Record<string, { label: string; color: string; fill: string }> = {
  'pH Down':    { label: 'pH DOWN',  color: 'rgba(244,63,94,0.45)',  fill: 'rgba(244,63,94,0.15)' },
  'pH Up':      { label: 'pH UP',    color: 'rgba(59,130,246,0.45)',  fill: 'rgba(59,130,246,0.15)' },
  'Nutrient A': { label: 'NUTR A',   color: 'rgba(34,197,94,0.45)',  fill: 'rgba(34,197,94,0.15)' },
  'Nutrient B': { label: 'NUTR B',   color: 'rgba(245,158,11,0.45)', fill: 'rgba(245,158,11,0.15)' },
};

const SENSOR_TYPES = ['pH', 'EC', 'Temp', 'DO2', 'Flow', 'PAR', 'RH', 'Moisture'];
const CROP_OPTIONS = [
  { group: 'Indoor/Hydroponic', items: ['Butterhead Lettuce', 'Basil', 'Arugula', 'Kale', 'Mint', 'Strawberry'] },
  { group: 'Outdoor/Soil', items: ['Tomatoes', 'Corn', 'Soybeans', 'Wheat', 'Cannabis', 'Peppers'] },
];

const CROP_EMOJIS: Record<string, string> = {
  'Butterhead Lettuce': '🥬',
  'Basil': '🌿',
  'Arugula': '🥗',
  'Kale': '🥦',
  'Mint': '🍃',
  'Strawberry': '🍓',
  'Tomatoes': '🍅',
  'Corn': '🌽',
  'Soybeans': '🫘',
  'Wheat': '🌾',
  'Cannabis': '🍁',
  'Peppers': '🌶️',
  'Unassigned': '🪴'
};
const SOIL_STYLES = ['Rows', 'Grid', 'Flood'];

/* ── EQUIPMENT: Top-level objects placed on the canvas ── */
const EQUIPMENT_TYPES = [
  { type: 'Reservoir',        w: 220, h: 320, color: 'var(--cyan)',   icon: 'Database', category: 'equipment' as const },
  { type: 'Tower',            w: 120, h: 500, color: 'var(--accent)', icon: 'Sprout', category: 'equipment' as const },
  { type: 'Manifold',         w: 60,  h: 140, color: 'var(--accent)', icon: 'Split', category: 'equipment' as const },
  { type: 'Return Drain',     w: 200, h: 40,  color: 'var(--cyan)',   icon: 'ArrowDownToLine', category: 'equipment' as const },
  { type: 'LED Panel',        w: 220, h: 30,  color: 'var(--amber)',  icon: 'Sun', category: 'equipment' as const },
  { type: 'Chiller',          w: 70,  h: 100, color: 'var(--cyan)',   icon: 'Thermometer', category: 'equipment' as const },
  { type: 'Climate Actuator', w: 70,  h: 30,  color: 'var(--violet)', icon: 'Fan', category: 'equipment' as const },
  { type: 'Soil Plot',        w: 180, h: 140, color: 'var(--amber)',  icon: 'Grid', category: 'equipment' as const },
  { type: 'Weather Station',  w: 100, h: 220, color: 'var(--violet)', icon: 'CloudRainWind', category: 'equipment' as const },
  { type: 'Irrigation Valve', w: 60,  h: 40,  color: 'var(--cyan)',   icon: 'Droplet', category: 'equipment' as const },
  { type: 'Municipal Water',  w: 100, h: 100, color: 'var(--blue)',   icon: 'Waves', category: 'equipment' as const },
];

/* ── ACCESSORIES: Sub-components that dock into equipment slots ── */
const ACCESSORY_TYPES = [
  { type: 'Dosing Pump',   icon: 'FlaskConical', color: 'var(--amber)',  slotType: 'dosing',  category: 'accessory' as const },
  { type: 'Air Pump',      icon: 'Wind', color: 'var(--violet)', slotType: 'air',     category: 'accessory' as const },
  { type: 'Water Pump',    icon: 'Settings2', color: 'var(--cyan)',   slotType: 'pump',    category: 'accessory' as const },
  { type: 'Inline Sensor', icon: 'Radio', color: 'var(--accent)', slotType: 'sensor',  category: 'accessory' as const },
];

// Combined for getSize lookups
const ALL_TYPES = [...EQUIPMENT_TYPES, ...ACCESSORY_TYPES.map(a => ({ ...a, w: 40, h: 30 }))];

type NodeDef = {
  id: string;
  type: string;
  x: number;
  y: number;
  options?: any;
  slots?: SlotDef[];   // Dockable sub-component bays
};

type PipeDef = {
  id: string;
  sourceId: string;
  targetId: string;
  waypoints?: { x: number; y: number }[];  // Orthogonal routing waypoints
};

export default function TwinWorkspace() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [projectBase, setProjectBase] = useState<any>(null);

  const renderIcon = (iconName: string, size = 16) => {
    const IconCmp = (LucideIcons as any)[iconName];
    return IconCmp ? <IconCmp size={size} /> : <span>❓</span>;
  };

  // Workspace State
  const [nodes, setNodes] = useState<NodeDef[]>([]);
  const [pipes, setPipes] = useState<PipeDef[]>([]);
  
  // Interaction State
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [drawingPipe, setDrawingPipe] = useState<{ sourceId: string, waypoints: { x: number; y: number }[] } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Vision AI Autobuild State
  const [showAutobuild, setShowAutobuild] = useState(false);
  const [visionScanning, setVisionScanning] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<'indoor' | 'outdoor' | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setUploadedImage(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const runAutobuild = () => {
    if (!uploadedImage || !operationType) return;
    setVisionScanning(true);
    setTimeout(() => {
      let newNodes: NodeDef[] = [];
      let newPipes: PipeDef[] = [];

      if (operationType === 'indoor') {
        newNodes = [
          {
            id: 'res-auto',
            type: 'Reservoir',
            x: 100,
            y: 250,
            slots: [
              { slotId: 'pump', slotType: 'pump', label: 'Main Circ Pump', occupantType: 'Water Pump', occupantOptions: {}, occupied: true },
              { slotId: 'air', slotType: 'air', label: 'Aerator 1', occupantType: 'Air Pump', occupantOptions: {}, occupied: true },
              { slotId: 'dosing1', slotType: 'dosing', label: 'Nutrient Ch. 1', occupantType: 'Dosing Pump', occupantOptions: { dosingType: 'Nutrient A'}, occupied: true },
              { slotId: 'sensor1', slotType: 'sensor', label: 'Sensor 1', occupantType: 'Inline Sensor', occupantOptions: { sensorType: 'pH'}, occupied: true },
              { slotId: 'sensor2', slotType: 'sensor', label: 'Sensor 2', occupantType: 'Inline Sensor', occupantOptions: { sensorType: 'EC'}, occupied: true },
            ]
          },
          ...['T1','T2','T3'].map((t, i) => ({
            id: `twr-auto-${i}`,
            type: 'Tower',
            x: 400 + (160 * i),
            y: 150,
            options: {},
            slots: DEFAULT_TOWER_SLOTS.map(s => ({ ...s }))
          })),
          { id: 'drain-auto', type: 'Return Drain', x: 400, y: 700, options: { width: 500 } },
          { id: 'led-auto', type: 'LED Panel', x: 400, y: 50, options: {} },
          { id: 'chiller-auto', type: 'Chiller', x: 100, y: 50, options: {} }
        ];

        newPipes = [
          {
            id: 'pipe-res-chiller', sourceId: 'res-auto', targetId: 'chiller-auto',
            waypoints: [{ x: 300, y: 350 }, { x: 60, y: 350 }, { x: 60, y: 100 }]
          },
          ...['T1','T2','T3'].map((t, i) => ({
            id: `pipe-chiller-twr-${i}`, sourceId: 'chiller-auto', targetId: `twr-auto-${i}`,
            waypoints: [{ x: 176, y: 100 }, { x: 460 + (160 * i), y: 100 }, { x: 460 + (160 * i), y: 150 }]
          })),
          ...['T1','T2','T3'].map((t, i) => ({
            id: `pipe-ret-${i}`, sourceId: `twr-auto-${i}`, targetId: 'drain-auto',
            waypoints: [{ x: 460 + (160 * i), y: 650 }, { x: 460 + (160 * i), y: 700 }]
          }))
        ];
      } else {
        newNodes = [
          { id: 'env-auto', type: 'Weather Station', x: 500, y: 30, options: {} },
          { id: 'water-auto', type: 'Municipal Water', x: 100, y: 300, options: {} },
          { id: 'valve-auto', type: 'Irrigation Valve', x: 300, y: 300, options: {} },
          ...['P1','P2','P3'].map((p, i) => ({
            id: `plot-auto-${i}`,
            type: 'Soil Plot',
            x: 500 + (220 * i),
            y: 250,
            options: {}
          })),
          { id: 'drain-auto', type: 'Return Drain', x: 500, y: 600, options: { width: 700 } }
        ];

        newPipes = [
          {
            id: 'pipe-water-valve', sourceId: 'water-auto', targetId: 'valve-auto',
            waypoints: [{ x: 200, y: 320 }, { x: 300, y: 320 }]
          },
          ...['P1','P2','P3'].map((p, i) => ({
            id: `pipe-plot-${i}`, sourceId: 'valve-auto', targetId: `plot-auto-${i}`,
            waypoints: [{ x: 360, y: 320 }, { x: 590 + (220 * i), y: 320 }, { x: 590 + (220 * i), y: 250 }]
          })),
          ...['P1','P2','P3'].map((p, i) => ({
            id: `pipe-ret-${i}`, sourceId: `plot-auto-${i}`, targetId: 'drain-auto',
            waypoints: [{ x: 590 + (220 * i), y: 390 }, { x: 590 + (220 * i), y: 600 }]
          }))
        ];
      }

      setNodes(newNodes);
      setPipes(newPipes);
      setVisionScanning(false);
      setShowAutobuild(false);
      setUploadedImage(null);
      setOperationType(null); // reset
    }, 2800);
  };

  // DnD State tracking (bypasses browser dataTransfer sandboxing)
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging logic
  const dragTarget = useRef<{ id: string, ox: number, oy: number } | null>(null);

  // Standard component size access with dynamic bounds for scalable nodes
  const getSize = (nodeOrType: NodeDef | string) => {
    const type = typeof nodeOrType === 'string' ? nodeOrType : nodeOrType.type;
    const base = ALL_TYPES.find(t => t.type === type) || { w: 80, h: 80, color: '#fff', icon: '❓' };
    
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
    if (node?.type === 'Reservoir') {
      // Reservoir is a water source only if it has a pump slotted in
      return node.slots?.some(s => s.slotId === 'pump' && s.occupied) || false;
    }
    if (node?.type === 'Municipal Water') {
      return true; // Root water source
    }
    
    return pipes.filter(p => p.targetId === id).some(p => {
      const srcNode = nodes.find(n => n.id === p.sourceId);
      if (srcNode?.type === 'Irrigation Valve') {
        const isOpen = isTestRunning || (srcNode.options?.isOpen === true);
        if (!isOpen) return false; // Flow blocked here
        return checkWaterSource(p.sourceId, visited);
      }
      if (['Reservoir', 'Manifold', 'Chiller', 'Municipal Water'].includes(srcNode?.type || '')) {
        return checkWaterSource(p.sourceId, visited);
      }
      return false;
    });
  }, [nodes, pipes, isTestRunning]);

  const isTowerFlowing = useCallback((towerId: string) => {
    return hasOutgoingPath(towerId, 'Return Drain') && checkWaterSource(towerId);
  }, [checkWaterSource, hasOutgoingPath]);

  const isSoilIrrigated = useCallback((id: string) => {
    return hasIncomingPath(id, 'Irrigation Valve') && checkWaterSource(id) && hasOutgoingPath(id, 'Return Drain');
  }, [checkWaterSource, hasIncomingPath, hasOutgoingPath]);

  // Reservoir aeration/flow are now derived from SLOTS, not pipe connections
  const isReservoirAerated = useCallback((resId: string) => {
    const res = nodes.find(n => n.id === resId);
    return res?.slots?.some(s => s.slotId === 'air' && s.occupied) || false;
  }, [nodes]);

  const reservoirFlowRate = useCallback((resId: string) => {
    const res = nodes.find(n => n.id === resId);
    return res?.slots?.some(s => s.slotId === 'pump' && s.occupied) ? 2.5 : 0;
  }, [nodes]);

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
    let initialSlots: SlotDef[] | undefined;
    if (type === 'Reservoir') initialSlots = DEFAULT_RESERVOIR_SLOTS.map(s => ({ ...s }));
    else if (type === 'Tower') initialSlots = DEFAULT_TOWER_SLOTS.map(s => ({ ...s }));
    setNodes(prev => [...prev, { id: `${type.substring(0,3)}-${Date.now()}`, type, x: 200, y: 200, options: {}, slots: initialSlots }]);
  };

  /* ── 3. Wire/Pipe Logic ── */
  const handlePortClick = (e: React.MouseEvent, id: string, type: 'out' | 'in') => {
    e.stopPropagation();
    e.preventDefault();
    const CTM = svgRef.current!.getScreenCTM()!;
    const px = (e.clientX - CTM.e) / CTM.a;
    const py = (e.clientY - CTM.f) / CTM.d;

    if (type === 'out') {
      const src = nodes.find(n => n.id === id);
      if (src) {
        let p1 = { x: px, y: py };
        const sDef = getSize(src);
        if (src.type === 'Reservoir') {
          p1 = { x: src.x + 210, y: src.y + 290 }; // RESERVOIR_PORTS.waterOut fallback
        } else if (src.type === 'Tower') {
          p1 = { x: src.x + 60, y: src.y + 480 }; // TOWER_PORTS.waterOut fallback
        } else if (src.type === 'Manifold') {
          const orient = src.options?.orientation || 'horizontal';
          const numOutputs = src.options?.numOutputs || 4;
          const outgoingPipes = pipes.filter(p => p.sourceId === src.id).sort((a,b) => a.id.localeCompare(b.id));
          const idx = Math.min(outgoingPipes.length, numOutputs - 1);
          const spacing = orient === 'horizontal' ? sDef.w / (numOutputs + 1) : sDef.h / (numOutputs + 1);
          const cx = orient === 'horizontal' ? src.x + spacing * (idx + 1) : src.x + sDef.w;
          const cy = orient === 'horizontal' ? src.y + sDef.h : src.y + spacing * (idx + 1);
          p1 = { x: cx, y: cy };
        } else if (src.type === 'Return Drain') {
          const outgoingPipes = pipes.filter(p => p.sourceId === src.id).sort((a,b) => a.id.localeCompare(b.id));
          const idx = outgoingPipes.length;
          const spacing = sDef.w / (outgoingPipes.length + 2); // Dynamic scale
          p1 = { x: src.x + spacing * (idx + 1), y: src.y + sDef.h };
        } else {
          p1 = { x: src.x + sDef.w + 6, y: src.y + sDef.h / 2 };
        }
        setDrawingPipe({ sourceId: id, waypoints: [p1] });
        setSelectedNode(null);
      }
    } else if (type === 'in' && drawingPipe && drawingPipe.sourceId !== id) {
      // Complete the pipe to this input port
      const finalWaypoints = [...drawingPipe.waypoints, { x: px, y: py }];
      setPipes(prev => [...prev, {
        id: `pipe-${Date.now()}`,
        sourceId: drawingPipe.sourceId,
        targetId: id,
        waypoints: finalWaypoints.slice(1, -1), // Store only intermediate waypoints
      }]);
      setDrawingPipe(null);
    }
  };

  const getSnappedMousePos = (rawX: number, rawY: number, currentPipe: { sourceId: string; waypoints: { x: number; y: number }[] } | null) => {
    if (!currentPipe || currentPipe.waypoints.length === 0) return { x: rawX, y: rawY };
    const lastWp = currentPipe.waypoints[currentPipe.waypoints.length - 1];
    const dx = rawX - lastWp.x;
    const dy = rawY - lastWp.y;
    const dist = Math.hypot(dx, dy);
    
    // Don't snap if too close to the origin to avoid jitter
    if (dist < 5) return { x: rawX, y: rawY };

    let angle = Math.atan2(dy, dx);
    const snapAngle = (5 * Math.PI) / 180; // 5 degrees increment
    angle = Math.round(angle / snapAngle) * snapAngle;

    return {
      x: lastWp.x + Math.cos(angle) * dist,
      y: lastWp.y + Math.sin(angle) * dist
    };
  };

  // Canvas click — add waypoint if drawing
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!drawingPipe) {
      setSelectedNode(null);
      return;
    }
    if (!svgRef.current) return;
    const CTM = svgRef.current.getScreenCTM()!;
    const px = (e.clientX - CTM.e) / CTM.a;
    const py = (e.clientY - CTM.f) / CTM.d;
    
    // Snap the waypoint coordinate natively
    const snapped = getSnappedMousePos(px, py, drawingPipe);
    
    setDrawingPipe(prev => prev ? { ...prev, waypoints: [...prev.waypoints, snapped] } : null);
  };

  // ESC cancels pipe drawing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawingPipe(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Build a polyline SVG path through waypoints with smooth 90° elbows
  const buildPipePath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    const r = 12; // corner radius
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      if (i < points.length - 1) {
        // Smooth corner: use quadratic bezier for the bend
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

  /* ── 4. Generative SVG Thumbnail ── */
  const generateThumbnail = () => {
    if (!svgRef.current) return '';
    
    // Calculate bounding box of all components to frame the shot
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const s = getSize(n);
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + s.w > maxX) maxX = n.x + s.w;
      if (n.y + s.h > maxY) maxY = n.y + s.h;
    });

    if (nodes.length === 0) {
      minX = 0; minY = 0; maxX = 1000; maxY = 600;
    } else {
      // Add generous padding
      minX -= 50; minY -= 50;
      maxX += 50; maxY += 50;
    }
    const width = Math.max(maxX - minX, 100);
    const height = Math.max(maxY - minY, 100);

    // Clone the DOM SVG so we can mutate layout properties without corrupting the live canvas
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
    clone.removeAttribute('class');
    clone.removeAttribute('style');
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    
    return clone.outerHTML;
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
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) {
      console.error(e);
      // Failsafe error log - suppressed to avoid blocking alerts
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
    <div className="workspace-container" style={{ margin: '-32px -40px', height: '100vh', zIndex: 10, overflow: 'hidden' }}>
      <div className="workspace-sidebar" style={{ background: '#060a10', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100vh', overflow: 'hidden' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <Link href="/builder" className="btn btn-ghost" style={{ padding: '6px 12px', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginLeft: '-12px' }}>
            <ArrowLeft size={14} /> Back to Hub
          </Link>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', margin: '0 0 4px 0', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{projectBase?.name || 'Project'}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Drag components onto the canvas</p>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* ═══ EQUIPMENT ═══ */}
          <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-1 mt-1">Equipment</div>
          {EQUIPMENT_TYPES.map(nt => (
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
              <span style={{ color: nt.color, display: 'flex' }}>{renderIcon(nt.icon, 18)}</span>
              <div className="n8n-lib-text flex-1">
                <strong>{nt.type}</strong>
                <span>Drag to canvas</span>
              </div>
            </div>
          ))}

          {/* ═══ ACCESSORIES ═══ */}
          <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-1 mt-4">Accessories — dock into equipment</div>
          {ACCESSORY_TYPES.map(at => (
            <div 
              key={at.type}
              className="n8n-library-node relative group"
              style={{ borderLeft: `3px solid ${at.color}`, background: 'rgba(255,255,255,0.02)' }}
              draggable={true}
              onDragStart={(e) => {
                setDraggedNodeType(at.type);
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', at.type || 'fallback');
              }}
            >
              <span style={{ color: at.color, display: 'flex' }}>{renderIcon(at.icon, 16)}</span>
              <div className="n8n-lib-text flex-1">
                <strong>{at.type}</strong>
                <span>Drop onto {at.slotType === 'dosing' ? 'Reservoir' : at.slotType === 'sensor' ? 'equipment' : 'Reservoir'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: SVG Canvas */}
      <div 
        className="workspace-canvas n8n-canvas flex-1 w-full h-full relative" 
        onMouseMove={onMouseMove} 
        onMouseUp={onMouseUp} 
        onClick={handleCanvasClick}
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
          const dropX = e.clientX - rect.left;
          const dropY = e.clientY - rect.top;
          const def = getSize(type);
          const newNodeId = `${type.substring(0,3)}-${Date.now()}`;

          // Check if this is an ACCESSORY being dropped onto an equipment slot
          const accessoryDef = ACCESSORY_TYPES.find(a => a.type === type);
          if (accessoryDef) {
            // Look for a parent equipment node that has a matching empty slot
            for (const parentNode of nodes) {
              if (parentNode.type !== 'Reservoir' && parentNode.type !== 'Tower') continue;
              if (!parentNode.slots) continue;

              // Calculate drop position relative to the parent node
              const localX = dropX - parentNode.x;
              const localY = dropY - parentNode.y;

              // Check if drop is within the parent's bounding box (with padding)
              const parentDef = getSize(parentNode.type);
              if (localX < -20 || localX > parentDef.w + 20 || localY < -20 || localY > parentDef.h + 20) continue;

              // Hit-test against the parent's slots
              let hitSlot: SlotDef | null = null;
              if (parentNode.type === 'Reservoir') {
                hitSlot = getReservoirSlotAt(localX, localY, parentNode.slots);
              } else if (parentNode.type === 'Tower') {
                hitSlot = getTowerSlotAt(localX, localY, parentNode.slots);
              }

              // Validate slot type matches accessory type
              if (hitSlot && hitSlot.slotType === accessoryDef.slotType) {
                // DOCK the accessory into the slot
                setNodes(prev => prev.map(n => {
                  if (n.id !== parentNode.id) return n;
                  return {
                    ...n,
                    slots: n.slots?.map(s => 
                      s.slotId === hitSlot!.slotId
                        ? { ...s, occupied: true, occupantType: type, occupantOptions: { dosingType: 'Nutrient A', sensorType: 'pH' } }
                        : s
                    ),
                  };
                }));
                return; // Don't create a top-level node
              }
            }
            // If no slot found, just ignore — accessories must dock into equipment
            return;
          }

          // EQUIPMENT drops: create a top-level node with default slots
          let initialSlots: SlotDef[] | undefined;
          if (type === 'Reservoir') {
            initialSlots = DEFAULT_RESERVOIR_SLOTS.map(s => ({ ...s }));
          } else if (type === 'Tower') {
            initialSlots = DEFAULT_TOWER_SLOTS.map(s => ({ ...s }));
          }

          setNodes(prev => [...prev, {
            id: newNodeId,
            type,
            x: dropX - def.w / 2,
            y: dropY - def.h / 2,
            options: {},
            slots: initialSlots,
          }]);
        }}
      >
        {/* Top Floating Actions */}
        <div className="absolute z-20 glass-panel" style={{ top: '32px', left: '40px', padding: '6px', display: 'flex', gap: '4px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid var(--border-emphasis)' }}>
          <button className="toolbar-btn" onClick={() => setShowAutobuild(true)}>
            <Camera size={14} style={{ color: 'var(--violet)' }} /> Autobuild
          </button>

          <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '4px 6px' }} />

          <button 
            className="toolbar-btn" 
            style={{ 
              background: saved ? 'var(--accent)' : 'rgba(255,255,255,0.08)', 
              color: 'white',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} 
            onClick={handleSave} 
            disabled={saving || saved}
          >
            {saved ? <CheckCircle size={15} /> : <Save size={14} className="text-gray-400" />} 
            <span style={{ transition: 'opacity 0.2s', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : saved ? 'Saved Successfully!' : 'Save Layout'}
            </span>
          </button>
          
          <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '4px 6px' }} />
          
          <button className="toolbar-btn" onClick={verifySystem}>
            <CheckCircle size={14} style={{ color: 'var(--cyan)' }} /> Analyze Topology
          </button>
          
          <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '4px 6px' }} />

          <button className={`toolbar-btn ${isTestRunning ? 'active-red' : 'active-green'}`} onClick={() => setIsTestRunning(!isTestRunning)}>
            <Play size={14} /> {isTestRunning ? 'Stop Flow' : 'Test Flow'}
          </button>
        </div>
        {/* Drawing Mode Overlay Hint */}
        {drawingPipe && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#060a10]/90 backdrop-blur border border-green-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-in slide-in-from-bottom-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">Drawing Pipe Mode Active</span>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <span className="text-xs text-gray-400">Click canvas to add corners • Click port to connect • Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-white ml-0.5">ESC</kbd> to cancel</span>
          </div>
        )}

        {/* Uma Verification Toast */}
        {analysisResult && (
          <div className="custom-modal-overlay">
            <div className="custom-modal-content animate-in" style={{ width: '600px', maxWidth: '90vw', position: 'relative', borderTop: '4px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                  <CheckCircle size={20} />
                  Topology Analysis Complete
                </h2>
                <button className="panel-close-btn" onClick={() => setAnalysisResult(null)}><X size={16} /></button>
              </div>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {analysisResult}
                </p>
              </div>
              
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button className="btn btn-primary" onClick={() => setAnalysisResult(null)}>Acknowledge</button>
              </div>
            </div>
          </div>
        )}

        <svg 
          ref={svgRef} 
          className="absolute top-0 left-0 w-full h-full pt-0 mt-0 pointer-events-none"
          style={{ overflow: 'visible', zIndex: 1 }}
        >
          {/* SVG Gradient & Animation Defs */}
          <defs>
            <linearGradient id="ledConeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </linearGradient>
            <style>{`
              @keyframes dash-flow { to { stroke-dashoffset: -40; } }
              .flow-anim-h { stroke-dasharray: 8 6; animation: dash-flow 1s linear infinite; }
              .flow-anim-v-up { stroke-dasharray: 8 6; animation: dash-flow 0.8s linear infinite; }
              .flow-anim-h-rev { stroke-dasharray: 8 6; animation: dash-flow 1s linear infinite reverse; }
              .pump-pulse { animation: pulseStroke 1.5s ease-in-out infinite; }
              .actuator-pulse { animation: pulseStroke 2s ease-in-out infinite; }
              .sensor-alarm-ring { animation: alarmRing 1s ease-in-out infinite; }
              .fan-spin { animation: spin 1s linear infinite; }
              @keyframes pulseStroke { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
              @keyframes alarmRing { 0%,100% { r:20; opacity:0.5; } 50% { r:24; opacity:0.2; } }
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </defs>
          {/* Render Drawn Pipes */}
          {pipes.map(pipe => {
            const src = nodes.find(n => n.id === pipe.sourceId);
            const tgt = nodes.find(n => n.id === pipe.targetId);
            if (!src || !tgt) return null;
            const sDef = getSize(src);
            const tDef = getSize(tgt);
            
            // Calculate source output port position
            let p1: { x: number; y: number };
            if (src.type === 'Reservoir') {
              p1 = { x: src.x + RESERVOIR_PORTS.waterOut.x, y: src.y + RESERVOIR_PORTS.waterOut.y };
            } else if (src.type === 'Tower') {
              p1 = { x: src.x + TOWER_PORTS.waterOut.x, y: src.y + TOWER_PORTS.waterOut.y };
            } else if (src.type === 'Manifold') {
              const orient = src.options?.orientation || 'horizontal';
              const numOutputs = src.options?.numOutputs || 4;
              const outgoingPipes = pipes.filter(p => p.sourceId === src.id).sort((a,b) => a.id.localeCompare(b.id));
              const idx = Math.min(outgoingPipes.findIndex(p => p.id === pipe.id), numOutputs - 1);
              const spacing = orient === 'horizontal' ? sDef.w / (numOutputs + 1) : sDef.h / (numOutputs + 1);
              const px = orient === 'horizontal' ? src.x + spacing * (idx + 1) : src.x + sDef.w;
              const py = orient === 'horizontal' ? src.y + sDef.h : src.y + spacing * (idx + 1);
              p1 = { x: px, y: py };
            } else if (src.type === 'Return Drain') {
              const outgoingPipes = pipes.filter(p => p.sourceId === src.id).sort((a,b) => a.id.localeCompare(b.id));
              const idx = outgoingPipes.findIndex(p => p.id === pipe.id);
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
              const incomingPipes = pipes.filter(p => p.targetId === tgt.id).sort((a,b) => a.id.localeCompare(b.id));
              const idx = Math.min(incomingPipes.findIndex(p => p.id === pipe.id), numInputs - 1);
              const spacing = orient === 'horizontal' ? tDef.w / (numInputs + 1) : tDef.h / (numInputs + 1);
              const px = orient === 'horizontal' ? tgt.x + spacing * (idx + 1) : tgt.x;
              const py = orient === 'horizontal' ? tgt.y : tgt.y + spacing * (idx + 1);
              p2 = { x: px, y: py };
            } else if (tgt.type === 'Return Drain') {
              const incomingPipes = pipes.filter(p => p.targetId === tgt.id).sort((a,b) => a.id.localeCompare(b.id));
              const idx = incomingPipes.findIndex(p => p.id === pipe.id);
              const spacing = tDef.w / (incomingPipes.length + 1);
              p2 = { x: tgt.x + spacing * (idx + 1), y: tgt.y };
            } else if (tgt.type === 'Reservoir') {
              p2 = { x: tgt.x + RESERVOIR_PORTS.waterIn.x, y: tgt.y + RESERVOIR_PORTS.waterIn.y };
            } else {
              p2 = { x: tgt.x - 6, y: tgt.y + tDef.h / 2 };
            }

            // Build path through waypoints
            const allPoints = [p1, ...(pipe.waypoints || []), p2];
            const pathStr = buildPipePath(allPoints);

            return (
              <g key={pipe.id}>
                {/* Outer pipe wall */}
                <path d={pathStr} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                {/* Inner pipe — animated when test running */}
                <path d={pathStr} fill="none" stroke="rgba(6,182,212,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isTestRunning ? 'flow-anim-h' : ''} />
                {/* Click target (invisible, wider) */}
                <path d={pathStr} stroke="transparent" strokeWidth="16" fill="none" strokeLinecap="round" style={{cursor: 'pointer', pointerEvents: 'stroke'}} onClick={(e) => { e.stopPropagation(); setPipes(p => p.filter(x => x.id !== pipe.id)); }} />
                {/* Waypoint dots */}
                {(pipe.waypoints || []).map((wp, i) => (
                  <circle key={i} cx={wp.x} cy={wp.y} r="3" fill="rgba(6,182,212,0.3)" className="pointer-events-none" />
                ))}
              </g>
            );
          })}

          {/* Render In-Progress Pipe Preview */}
          {drawingPipe && (
            <g>
              {/* Placed segments */}
              {drawingPipe.waypoints.length >= 2 && (
                <path d={buildPipePath(drawingPipe.waypoints)} fill="none" stroke="rgba(34,197,94,0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
              )}
              {/* Live segment from last waypoint to mouse (snapped visually) */}
              <line
                x1={drawingPipe.waypoints[drawingPipe.waypoints.length - 1].x}
                y1={drawingPipe.waypoints[drawingPipe.waypoints.length - 1].y}
                x2={getSnappedMousePos(mousePos.x, mousePos.y, drawingPipe).x} 
                y2={getSnappedMousePos(mousePos.x, mousePos.y, drawingPipe).y}
                stroke="rgba(34,197,94,0.6)" strokeWidth="2" strokeDasharray="4 4"
              />
              {/* Waypoint markers */}
              {drawingPipe.waypoints.map((wp, i) => (
                <circle key={i} cx={wp.x} cy={wp.y} r={i === 0 ? 5 : 4} fill={i === 0 ? 'rgba(34,197,94,0.6)' : 'rgba(34,197,94,0.4)'} stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
              ))}
              {/* Mouse cursor indicator (snapped) */}
              <circle cx={getSnappedMousePos(mousePos.x, mousePos.y, drawingPipe).x} cy={getSnappedMousePos(mousePos.x, mousePos.y, drawingPipe).y} r="6" fill="none" stroke="rgba(34,197,94,0.4)" strokeWidth="1.5" strokeDasharray="3 3" className="pointer-events-none" />
            </g>
          )}

          {/* Render Nodes using standard HTML via foreignObject */}
          {nodes.map(node => {
            const def = getSize(node);
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

                {/* Automated Proximity/Span Radius visualization for Zones */}
                {['Environment Zone'].includes(node.type) && (
                  <circle cx={def.w / 2} cy={def.h / 2} r={180} fill={def.color} opacity={0.03} stroke={def.color} strokeWidth={1} strokeDasharray="8 8" className="animate-[spin_60s_linear_infinite] pointer-events-none" />
                )}

                {/* Only draw fallback bounds for non-slotted equipment */}
                {!['Reservoir', 'Tower'].includes(node.type) && (
                  <>
                    <rect x={0} y={0} width={def.w} height={def.h} fill={def.color} opacity={0.15} rx={14} />
                    <rect x={0} y={0} width={def.w} height={def.h} stroke={def.color} strokeWidth={2} opacity={0.3} fill="none" rx={14} />
                  </>
                )}

                {/* Animated Component Switch */}
                {node.type === 'Reservoir' ? (
                  <ReservoirBlock
                    slots={node.slots || DEFAULT_RESERVOIR_SLOTS}
                    isAerated={node.slots?.some(s => s.slotId === 'air' && s.occupied) || false}
                    flowRate={node.slots?.some(s => s.slotId === 'pump' && s.occupied) ? 2.5 : 0}
                    isSelected={isSelected}
                  />
                ) : node.type === 'Tower' ? (
                  <TowerBlock
                    towerId={`Tow-${node.id.split('-')[1]}`}
                    cropName={node.options?.crop || 'Unassigned'}
                    emoji={CROP_EMOJIS[node.options?.crop || 'Unassigned'] || '🪴'}
                    slots={node.slots || []}
                    valveOpen={node.options?.valveOpen === true || isTestRunning}
                    healthStatus="nominal"
                    fluidColor="#06b6d4"
                    isSelected={isSelected}
                    i={1}
                    onValveClick={() => {
                      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, options: { ...n.options, valveOpen: !n.options?.valveOpen, isOpen: !n.options?.valveOpen } } : n));
                    }}
                  />
                ) : node.type === 'Manifold' ? (
                  <Manifold 
                    x={0} y={0} 
                    w={def.w} h={def.h} 
                    orientation={node.options?.orientation || 'horizontal'} 
                    numInputs={node.options?.numInputs || 1} 
                    numOutputs={node.options?.numOutputs || 4} 
                    fluidColor="#06b6d4" 
                    label={node.options?.label || 'MANIFOLD'} 
                  />
                ) : node.type === 'Return Drain' ? (
                  <ReturnDrain x={0} y={0} width={def.w} label={node.options?.label || 'RETURN DRAIN'} fluidColor="#06b6d4" />
                ) : node.type === 'Climate Actuator' ? (
                  <ClimateActuator x={0} y={0} type={node.options?.actuatorType || 'humidifier'} isActive={hasIncomingPath(node.id, 'Weather Station')} />
                ) : node.type === 'Weather Station' ? (
                  <WeatherStation x={0} y={0} width={def.w} height={def.h} label="WEATHER STATION" isTestRunning={isTestRunning} />
                ) : node.type === 'Chiller' ? (
                  <Chiller x={0} y={0} status="nominal" isActive={hasIncomingPath(node.id, 'Pump')} />
                ) : node.type === 'LED Panel' ? (
                  <LedPanel x={0} y={0} width={def.w} lightLevel={node.options?.par || 450} status="nominal" />
                ) : node.type === 'Soil Plot' ? (
                  <SoilField 
                    x={0} y={0}
                    fieldStyle={node.options?.style || 'Rows'}
                    cropName={node.options?.crop || 'Unassigned'}
                    emoji={CROP_EMOJIS[node.options?.crop || 'Unassigned'] || '🌱'}
                    isIrrigated={isSoilIrrigated(node.id)}
                    moistureLevel={isSoilIrrigated(node.id) ? 65 : 15}
                    fluidColor="#06b6d4"
                  />
                ) : node.type === 'Irrigation Valve' ? (
                  (() => {
                    const isOpen = (node.options?.isOpen || node.options?.valveOpen) === true || isTestRunning;
                    const strokeColor = isOpen ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)";
                    const fillColor = isOpen ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
                    const text = isOpen ? "OPEN" : "CLOSED";
                    return (
                      <g>
                        <rect x={0} y={0} width={def.w} height={def.h} rx={6} fill={fillColor} stroke={strokeColor} strokeWidth="1.5" className="transition-colors" />
                        <text x={def.w/2} y={def.h/2 - 2} textAnchor="middle" fill={strokeColor} fontSize="6" fontWeight="700">SOLENOID</text>
                        <text x={def.w/2} y={def.h/2 + 6} textAnchor="middle" fill={strokeColor} fontSize="8" fontWeight="800" className="transition-colors">{text}</text>
                      </g>
                    );
                  })()
                ) : node.type === 'Municipal Water' ? (
                  <MunicipalWater x={0} y={0} width={def.w} height={def.h} label="MUNICIPAL" isFlowing={isTestRunning || hasOutgoingPath(node.id, 'Irrigation Valve')} />
                ) : (
                  /* Fallback Generic Logic Node (N8N Style) */
                  <foreignObject x={0} y={0} width={def.w} height={def.h} style={{ overflow: 'visible' }}>
                    <div className={`n8n-node ${isSelected ? 'selected' : ''}`} style={{ width: '100%', height: '100%' }}>
                      <div className="n8n-header" style={{ color: def.color }}>
                        <span className="flex items-center">{renderIcon(def.icon, 14)}</span> {node.type}
                      </div>
                      <div className="n8n-body">
                        <div className="n8n-title">{node.id}</div>
                        <div className="n8n-subtitle" style={{ opacity: 0.6 }}>Unconfigured</div>
                      </div>
                    </div>
                  </foreignObject>
                )}

                {/* SVG Native Input/Output Connection Ports */}
                <g className="n8n-ports">
                  {node.type === 'Reservoir' ? (
                    /* Reservoir: input port left side, output port right side */
                    <>
                      <circle cx={RESERVOIR_PORTS.waterIn.x} cy={RESERVOIR_PORTS.waterIn.y} r={7} fill="var(--accent)" stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'in')} />
                      <circle cx={RESERVOIR_PORTS.waterOut.x} cy={RESERVOIR_PORTS.waterOut.y} r={7} fill="var(--cyan)" stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                    </>
                  ) : node.type === 'Tower' ? (
                    /* Tower: input at top, output at bottom */
                    <>
                      <circle cx={TOWER_PORTS.waterIn.x} cy={TOWER_PORTS.waterIn.y} r={7} fill="var(--accent)" stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'in')} />
                      <circle cx={TOWER_PORTS.waterOut.x} cy={TOWER_PORTS.waterOut.y} r={7} fill="var(--cyan)" stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                    </>
                  ) : node.type === 'Manifold' ? (
                    /* Manifold: input/output hit target centered on edges based on orientation */
                    (() => {
                      const orient = node.options?.orientation || 'horizontal';
                      const inX = orient === 'horizontal' ? def.w / 2 : 0;
                      const inY = orient === 'horizontal' ? 0 : def.h / 2;
                      const outX = orient === 'horizontal' ? def.w / 2 : def.w;
                      const outY = orient === 'horizontal' ? def.h : def.h / 2;
                      return (
                        <>
                          <circle cx={inX} cy={inY} r={7} fill="var(--accent)" stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform opacity-0 hover:opacity-100" onMouseDown={(e) => handlePortClick(e, node.id, 'in')} />
                          <circle cx={outX} cy={outY} r={7} fill="var(--cyan)" stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform opacity-0 hover:opacity-100" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                        </>
                      );
                    })()
                  ) : node.type === 'Return Drain' ? (
                    // Return Drain: visual circles centered, but hit target spans entire edge
                    <>
                      {/* Visual Input Center Point */}
                      <circle cx={def.w / 2} cy={0} r={6} fill="var(--accent)" stroke="#111827" strokeWidth={2} className="cursor-crosshair pointer-events-none opacity-50" />
                      <rect x={0} y={-10} width={def.w} height={20} fill="var(--accent)" fillOpacity={0} stroke="#111827" strokeOpacity={0} strokeWidth={2} className="cursor-crosshair hover:fill-opacity-10 transition-all opacity-0 hover:opacity-100" onMouseDown={(e) => handlePortClick(e, node.id, 'in')} />
                      
                      {/* Visual Output Center Point */}
                      <circle cx={def.w / 2} cy={def.h} r={6} fill="var(--cyan)" stroke="#111827" strokeWidth={2} className="cursor-crosshair pointer-events-none opacity-50" />
                      <rect x={0} y={def.h - 10} width={def.w} height={20} fill="var(--cyan)" fillOpacity={0} stroke="#111827" strokeOpacity={0} strokeWidth={2} className="cursor-crosshair hover:fill-opacity-10 transition-all opacity-0 hover:opacity-100" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                    </>
                  ) : node.type === 'Municipal Water' ? (
                    <circle cx={def.w + 6} cy={def.h / 2} r={7} fill={def.color} stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                  ) : (
                    /* Generic: left input, right output */
                    <>
                      <circle cx={-6} cy={def.h / 2} r={7} fill={def.color} stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'in')} />
                      <circle cx={def.w + 6} cy={def.h / 2} r={7} fill={def.color} stroke="#111827" strokeWidth={2} className="cursor-crosshair hover:scale-150 transition-transform" onMouseDown={(e) => handlePortClick(e, node.id, 'out')} />
                    </>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT SIDEBAR: Context Panel */}
      {selNode && (
        <div className="context-panel animate-in shrink-0">
          <div className="panel-header">
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Settings2 size={16}/> Node Properties</h3>
            <button className="panel-close-btn" onClick={() => setSelectedNode(null)}><X size={14} /></button>
          </div>
          
          <div className="mb-4">
            <label className="panel-label">ID</label>
            <input type="text" className="panel-input" value={selNode.id} disabled />
          </div>

          <div className="mb-4">
            <label className="panel-label">Type</label>
            <div className="text-sm font-semibold flex items-center gap-2" style={{ color: getSize(selNode.type).color, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
              {renderIcon(getSize(selNode.type).icon)} {selNode.type}
            </div>
          </div>

          <div className="mb-4">
            <label className="panel-label">Position</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" className="panel-input" value={Math.round(selNode.x)} onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, x: +e.target.value } : n))} />
              <input type="number" className="panel-input" value={Math.round(selNode.y)} onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, y: +e.target.value } : n))} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />

          {/* ── Manifold Configuration ── */}
          {selNode.type === 'Manifold' && (
            <>
              <div className="mb-4">
                <label className="panel-label">Orientation</label>
                <select 
                  className="panel-select"
                  value={selNode.options?.orientation || 'horizontal'}
                  onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, orientation: e.target.value } } : n))}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="panel-label">Inputs</label>
                  <select 
                    className="panel-select"
                    value={selNode.options?.numInputs || 1}
                    onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, numInputs: Number(e.target.value) } } : n))}
                  >
                    {[1,2,3,4,6,8,12].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="panel-label">Outputs</label>
                  <select 
                    className="panel-select"
                    value={selNode.options?.numOutputs || 4}
                    onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, numOutputs: Number(e.target.value) } } : n))}
                  >
                    {[1,2,3,4,6,8,12].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Return Drain Configuration ── */}
          {selNode.type === 'Return Drain' && (
            <div className="mb-4">
              <label className="panel-label">Drain Length</label>
              <input 
                type="number" 
                className="panel-input"
                min={100} max={2000} step={20} 
                value={selNode.options?.width || 300} 
                onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, width: Number(e.target.value) } } : n))} 
              />
            </div>
          )}

          {/* ── Irrigation Valve & Tower Valve Configuration ── */}
          {['Irrigation Valve', 'Tower'].includes(selNode.type) && (
            <div style={{ marginBottom: '16px', background: 'rgba(10,16,26,0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
              <label className="panel-label" style={{ marginBottom: '8px' }}>Manual Supply Valve</label>
              <div className="panel-btn-group">
                <button 
                  className={`panel-toggle-btn ${selNode.options?.valveOpen ? '' : 'active-red'}`}
                  onClick={() => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, valveOpen: false, isOpen: false } } : n))}
                >
                  Shut
                </button>
                <button 
                  className={`panel-toggle-btn ${(selNode.options?.valveOpen || selNode.options?.isOpen) ? 'active-green' : ''}`}
                  onClick={() => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, valveOpen: true, isOpen: true } } : n))}
                >
                  Open
                </button>
              </div>
              <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '8px', lineHeight: '1.4' }}>Test Flow will override and automatically open all manual solenoids system-wide.</p>
            </div>
          )}

          {/* ── Crop Assignment (Tower, Soil Plot) ── */}
          {['Tower', 'Soil Plot'].includes(selNode.type) && (
            <div className="mb-4">
              <label className="panel-label">Assigned Crop</label>
              <select 
                className="panel-select"
                value={selNode.options?.crop || ''}
                onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, crop: e.target.value } } : n))}
              >
                <option value="">Select Crop...</option>
                {CROP_OPTIONS.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* ── Soil Style ── */}
          {selNode.type === 'Soil Plot' && (
            <div className="mb-4">
              <label className="panel-label">Field Style</label>
              <select 
                className="panel-select"
                value={selNode.options?.style || 'Rows'}
                onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, style: e.target.value } } : n))}
              >
                {SOIL_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* ── Climate Actuator Mode ── */}
          {selNode.type === 'Climate Actuator' && (
            <div className="mb-4">
              <label className="panel-label">Actuator Mode</label>
              <select 
                className="panel-select"
                value={selNode.options?.actuatorType || 'humidifier'}
                onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, actuatorType: e.target.value } } : n))}
              >
                <option value="humidifier">Humidifier</option>
                <option value="dehumidifier">Dehumidifier</option>
              </select>
            </div>
          )}

          {/* ── LED Panel PAR ── */}
          {selNode.type === 'LED Panel' && (
            <div className="mb-4">
              <label className="panel-label">PAR Level (µmol)</label>
              <input 
                type="number" min={0} max={1200} step={50}
                className="panel-input"
                value={selNode.options?.par || 450}
                onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, par: +e.target.value } } : n))}
              />
            </div>
          )}

          {/* ── Custom Label (Manifold, Return Drain) ── */}
          {['Manifold', 'Return Drain'].includes(selNode.type) && (
            <div className="mb-4">
              <label className="panel-label">Label</label>
              <input 
                type="text"
                className="panel-input"
                value={selNode.options?.label || ''}
                placeholder={selNode.type === 'Manifold' ? 'SUPPLY MANIFOLD' : 'RETURN DRAIN'}
                onChange={(e) => setNodes(prev => prev.map(n => n.id === selNode.id ? { ...n, options: { ...n.options, label: e.target.value } } : n))}
              />
            </div>
          )}

          {/* ═══ DOCKED ACCESSORIES (Slot Management) ═══ */}
          {selNode.slots && selNode.slots.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />
              <label className="panel-label" style={{ color: 'var(--cyan)' }}>Docked Accessories</label>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selNode.slots.map(slot => (
                  <div key={slot.slotId} className={`dock-slot ${slot.occupied ? 'occupied' : ''}`}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>{slot.label}</div>
                        {slot.occupied ? (
                          <div style={{ fontSize: '14px', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <div className="dock-icon-pulsing" />
                            {slot.occupantType}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>Empty — drag out from library</div>
                        )}
                      </div>

                      {/* Undock button */}
                      {slot.occupied && (
                        <button 
                          className="floating-remove-btn"
                          title="Eject Accessory"
                          onClick={() => setNodes(prev => prev.map(n => {
                            if (n.id !== selNode.id) return n;
                            return { ...n, slots: n.slots?.map(s => s.slotId === slot.slotId ? { ...s, occupied: false, occupantType: undefined, occupantOptions: undefined } : s) };
                          }))}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Configure docked occupant */}
                    {slot.occupied && slot.slotType === 'dosing' && (
                      <select 
                        className="panel-select"
                        value={slot.occupantOptions?.dosingType || 'Nutrient A'}
                        onChange={(e) => setNodes(prev => prev.map(n => {
                          if (n.id !== selNode.id) return n;
                          return { ...n, slots: n.slots?.map(s => s.slotId === slot.slotId ? { ...s, occupantOptions: { ...s.occupantOptions, dosingType: e.target.value } } : s) };
                        }))}
                      >
                        {Object.keys(DOSING_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    )}
                    {slot.occupied && slot.slotType === 'sensor' && (
                      <select 
                        className="panel-select"
                        value={slot.occupantOptions?.sensorType || 'pH'}
                        onChange={(e) => setNodes(prev => prev.map(n => {
                          if (n.id !== selNode.id) return n;
                          return { ...n, slots: n.slots?.map(s => s.slotId === slot.slotId ? { ...s, occupantOptions: { ...s.occupantOptions, sensorType: e.target.value } } : s) };
                        }))}
                      >
                        {SENSOR_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Connection Info ── */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />
          <div className="mb-4">
            <label className="panel-label">Connections</label>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: '4px' }}>In: {pipes.filter(p => p.targetId === selNode.id).length} pipe(s)</div>
              <div>Out: {pipes.filter(p => p.sourceId === selNode.id).length} pipe(s)</div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
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
      {/* Image Upload Autobuild Modal */}
      {showAutobuild && (
        <div className="vision-modal-overlay">
          <div className="vision-modal">
            <button 
              className="vision-modal-close" 
              onClick={() => { setShowAutobuild(false); setUploadedImage(null); }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scan size={24} color="var(--violet)" />
              Vision AI Configuration
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Upload a physical photograph of the layout. Uma Semantic Vision will extract the hardware parameters and populate the digital topological map automatically.
            </p>

            {!operationType ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px', marginBottom: '24px' }}>
                <div 
                  className="config-card hover:bg-white/5" 
                  onClick={() => setOperationType('indoor')}
                  style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--cyan)', marginBottom: '12px' }}><Settings2 size={32} style={{ margin: '0 auto' }} /></div>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#fff' }}>Indoor Hydroponics</strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Vertical Towers & Environment Control</span>
                </div>
                <div 
                  className="config-card hover:bg-white/5" 
                  onClick={() => setOperationType('outdoor')}
                  style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                >
                  <div style={{ color: 'var(--amber)', marginBottom: '12px' }}><Scan size={32} style={{ margin: '0 auto' }} /></div>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#fff' }}>Outdoor Open Soil</strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Geometric Plot Grids & Irrigation Sets</span>
                </div>
              </div>
            ) : (
              <div className="vision-upload-zone" onClick={() => !uploadedImage && document.getElementById('vision-upload')?.click()}>
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage} alt="Layout" className="vision-preview" />
                    {visionScanning && (
                      <div className="scan-line" />
                    )}
                    {visionScanning && (
                      <div className="vision-status-text">EXTRACTING METADATA...</div>
                    )}
                  </>
                ) : (
                  <>
                    <ImagePlus size={48} color={operationType === 'indoor' ? 'var(--cyan)' : 'var(--amber)'} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Upload {operationType === 'indoor' ? 'Indoor' : 'Outdoor'} facility reference</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>JPEG, PNG (Max 10MB)</span>
                  </>
                )}
                <input 
                  id="vision-upload" 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn-vision btn-vision-secondary" 
                onClick={() => { setShowAutobuild(false); setUploadedImage(null); }}
                disabled={visionScanning}
              >
                Cancel
              </button>
              <button 
                className="btn-vision btn-vision-primary" 
                onClick={runAutobuild}
                disabled={!uploadedImage || visionScanning}
              >
                {visionScanning ? 'Scanning...' : 'Initialize Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
