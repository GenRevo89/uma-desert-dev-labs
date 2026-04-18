"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeechUrl } from '@/lib/ai';
import {
  Activity, Droplets, Thermometer, Wind, Zap,
  AlertTriangle, Sprout, Volume2, VolumeX,
  Power, Waves, Gauge, Sun, FlaskConical,
  ArrowDown, ArrowUp, TriangleAlert, Bug, Leaf
} from 'lucide-react';
import './simulation.css';

/* ═══════════════════════════════════════════
   EQUILIBRIUM CONSTANTS & TYPES
   ═══════════════════════════════════════════ */
const EQ = { ph: 6.0, temp: 24.0, humidity: 68, ec: 1.8, do2: 8.2, flow: 2.4, light: 450 };

type SensorKey = 'ph' | 'temp' | 'humidity' | 'ec' | 'do2' | 'flow' | 'light';
type SensorStatus = 'nominal' | 'warning' | 'danger';
type LogEntry = { time: string; msg: string; type: 'info' | 'warning' | 'success' | 'danger' };
type Bottleneck = { sensor: SensorKey; severity: number; message: string };
type ActiveIntervention = { sensor: SensorKey; actuator: string; detail: string; startedAt: number };

const SENSOR_META: Record<SensorKey, { label: string; unit: string; icon: any; color: string; bg: string; min: number; max: number; dangerLow: number; dangerHigh: number }> = {
  ph:       { label: 'pH Level',      unit: 'pH',    icon: Droplets,     color: 'var(--accent)', bg: 'var(--accent-subtle)', min: 4, max: 10,  dangerLow: 5.0, dangerHigh: 7.5 },
  temp:     { label: 'Water Temp',     unit: '°C',    icon: Thermometer,  color: 'var(--cyan)',   bg: 'var(--cyan-subtle)',   min: 15, max: 40, dangerLow: 18, dangerHigh: 30 },
  humidity: { label: 'Humidity',       unit: '%',     icon: Wind,         color: 'var(--violet)', bg: 'var(--violet-subtle)', min: 0, max: 100, dangerLow: 40, dangerHigh: 85 },
  ec:       { label: 'EC Conductivity',unit: 'mS/cm', icon: Zap,          color: 'var(--amber)',  bg: 'var(--amber-subtle)',  min: 0, max: 5,   dangerLow: 1.0, dangerHigh: 3.0 },
  do2:      { label: 'Dissolved O₂',   unit: 'mg/L',  icon: Waves,        color: 'var(--cyan)',   bg: 'var(--cyan-subtle)',   min: 0, max: 14,  dangerLow: 5.0, dangerHigh: 12.0 },
  flow:     { label: 'Flow Rate',      unit: 'L/min', icon: Gauge,        color: 'var(--violet)', bg: 'var(--violet-subtle)', min: 0, max: 5,   dangerLow: 1.0, dangerHigh: 4.0 },
  light:    { label: 'PAR Intensity',  unit: 'µmol',  icon: Sun,          color: 'var(--amber)',  bg: 'var(--amber-subtle)',  min: 0, max: 800, dangerLow: 200, dangerHigh: 600 },
};

/* ═══════════════════════════════════════════
   CASCADE FAILURE DEFINITIONS
   ═══════════════════════════════════════════ */
const CASCADE_RULES: { trigger: SensorKey; threshold: number; direction: 'above' | 'below'; effects: { sensor: SensorKey; delta: number }[]; message: string }[] = [
  { trigger: 'temp', threshold: 30, direction: 'above', effects: [{ sensor: 'do2', delta: -1.5 }, { sensor: 'humidity', delta: 8 }], message: 'Heat cascade: dissolved O₂ falling, humidity rising' },
  { trigger: 'ph', threshold: 7.5, direction: 'above', effects: [{ sensor: 'ec', delta: -0.4 }, { sensor: 'flow', delta: -0.3 }], message: 'Alkaline cascade: nutrient lockout, flow reduction' },
  { trigger: 'ec', threshold: 3.0, direction: 'above', effects: [{ sensor: 'ph', delta: 0.8 }, { sensor: 'do2', delta: -0.8 }], message: 'Nutrient overload cascade: pH rising, O₂ depleting' },
  { trigger: 'humidity', threshold: 85, direction: 'above', effects: [{ sensor: 'temp', delta: 2.0 }, { sensor: 'flow', delta: -0.5 }], message: 'Humidity cascade: temperature climbing, circulation impaired' },
];

/* ═══════════════════════════════════════════
   CROP & DISEASE DEFINITIONS
   ═══════════════════════════════════════════ */
const TOWER_CROPS = [
  { id: 'T1', crop: 'Butterhead Lettuce', emoji: '🥬', optimalPh: [5.5, 6.5], optimalEc: [0.8, 1.2] },
  { id: 'T2', crop: 'Genovese Basil', emoji: '🌿', optimalPh: [5.5, 6.5], optimalEc: [1.0, 1.6] },
  { id: 'T3', crop: 'Cherry Tomatoes', emoji: '🍅', optimalPh: [5.8, 6.3], optimalEc: [2.0, 3.5] },
  { id: 'T4', crop: 'Tuscan Kale', emoji: '🥗', optimalPh: [5.5, 6.5], optimalEc: [1.5, 2.5] },
  { id: 'T5', crop: 'Strawberries', emoji: '🍓', optimalPh: [5.5, 6.2], optimalEc: [1.0, 1.5] },
];

type Disease = {
  id: string;
  name: string;
  description: string;
  sensorEffects: { sensor: SensorKey; delta: number }[];
  symptoms: string;
  severity: 'moderate' | 'severe' | 'critical';
};

const DISEASE_CATALOG: Disease[] = [
  { id: 'pythium', name: 'Pythium Root Rot', description: 'Oomycete pathogen attacking root zone in warm, stagnant water', sensorEffects: [{ sensor: 'temp', delta: 4 }, { sensor: 'do2', delta: -3 }, { sensor: 'flow', delta: -1 }], symptoms: 'Brown slimy roots, wilting despite adequate water', severity: 'critical' },
  { id: 'powdery_mildew', name: 'Powdery Mildew', description: 'Fungal infection thriving in high humidity with poor airflow', sensorEffects: [{ sensor: 'humidity', delta: 18 }, { sensor: 'flow', delta: -0.5 }], symptoms: 'White powdery coating on leaf surfaces', severity: 'moderate' },
  { id: 'botrytis', name: 'Botrytis (Gray Mold)', description: 'Necrotrophic fungus in cool, humid, stagnant conditions', sensorEffects: [{ sensor: 'humidity', delta: 15 }, { sensor: 'temp', delta: -3 }], symptoms: 'Gray fuzzy mold on stems and fruit', severity: 'severe' },
  { id: 'tipburn', name: 'Calcium Tipburn', description: 'Calcium deficiency from rapid growth and high EC', sensorEffects: [{ sensor: 'ec', delta: 1.8 }, { sensor: 'temp', delta: 2 }], symptoms: 'Brown necrotic edges on young inner leaves', severity: 'moderate' },
  { id: 'fusarium', name: 'Fusarium Wilt', description: 'Soilborne fungus entering through roots in warm nutrient solution', sensorEffects: [{ sensor: 'temp', delta: 5 }, { sensor: 'ph', delta: 1.5 }, { sensor: 'ec', delta: -0.8 }], symptoms: 'Yellowing, wilting on one side of plant', severity: 'critical' },
  { id: 'aphids', name: 'Aphid Infestation', description: 'Sap-sucking insects weakening plants and spreading viruses', sensorEffects: [{ sensor: 'humidity', delta: 8 }, { sensor: 'ec', delta: 0.5 }], symptoms: 'Curled leaves, sticky honeydew, stunted growth', severity: 'severe' },
];

type TowerCondition = { towerId: string; disease: Disease | null; injectedAt: number | null };

export default function Simulation() {
  /* ── State ── */
  const [sensors, setSensors] = useState<Record<SensorKey, number>>({
    ph: EQ.ph, temp: EQ.temp, humidity: EQ.humidity, ec: EQ.ec,
    do2: EQ.do2, flow: EQ.flow, light: EQ.light,
  });
  const [umaActive, setUmaActive] = useState(false);
  const [umaState, setUmaState] = useState<'offline' | 'idle' | 'analyzing' | 'correcting' | 'speaking'>('offline');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [tick, setTick] = useState(0);
  const [cascadeActive, setCascadeActive] = useState(false);
  const [activeInterventions, setActiveInterventions] = useState<ActiveIntervention[]>([]);
  const [monitoringRecovery, setMonitoringRecovery] = useState(false);
  const [towerConditions, setTowerConditions] = useState<TowerCondition[]>(
    TOWER_CROPS.map(t => ({ towerId: t.id, disease: null, injectedAt: null }))
  );
  const [selectedTower, setSelectedTower] = useState<string>('T1');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sensorsRef = useRef(sensors);
  sensorsRef.current = sensors;

  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 20));
  }, []);

  /* ── Heartbeat ── */
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  /* ── Ambient sensor jitter (always running) ── */
  useEffect(() => {
    if (tick % 4 !== 0) return;
    setSensors(prev => {
      const next = { ...prev };
      const keys: SensorKey[] = ['ph', 'temp', 'humidity', 'ec', 'do2', 'flow', 'light'];
      keys.forEach(k => {
        const jitter = (Math.random() - 0.5) * 0.05;
        next[k] = prev[k] + jitter;
      });
      return next;
    });
  }, [tick]);

  /* ── Uma's elastic correction (only when active) ── */
  useEffect(() => {
    if (!umaActive || tick % 2 !== 0) return;

    let isCorrection = false;
    setSensors(prev => {
      const next = { ...prev };
      const keys: SensorKey[] = ['ph', 'temp', 'humidity', 'ec', 'do2', 'flow', 'light'];
      keys.forEach(k => {
        const eq = EQ[k];
        const diff = Math.abs(prev[k] - eq);
        const threshold = k === 'light' ? 20 : k === 'humidity' ? 2 : 0.15;
        if (diff > threshold) {
          next[k] = prev[k] + (eq - prev[k]) * 0.06;
          isCorrection = true;
        }
      });
      return next;
    });

    if (isCorrection) {
      if (umaState === 'idle') setUmaState('correcting');
    } else if (umaState === 'correcting') {
      setUmaState('idle');
    }
  }, [tick, umaActive, umaState]);

  /* ── Post-intervention recovery monitoring (ALL parameters) ── */
  useEffect(() => {
    if (!monitoringRecovery) return;

    const checkInterval = setInterval(() => {
      const current = sensorsRef.current;
      const allKeys: SensorKey[] = ['ph', 'temp', 'humidity', 'ec', 'do2', 'flow', 'light'];
      
      // Check ALL sensors against their operational ranges
      const outOfRange: { key: SensorKey; diff: number }[] = [];
      allKeys.forEach(k => {
        const eq = EQ[k];
        const val = current[k];
        const tolerance = k === 'light' ? 30 : k === 'humidity' ? 5 : k === 'temp' ? 1.5 : 0.25;
        const diff = Math.abs(val - eq);
        if (diff > tolerance) {
          outOfRange.push({ key: k, diff });
        }
      });

      if (outOfRange.length === 0) {
        // All parameters within tolerance — equilibrium restored
        const interventionNames = activeInterventions.map(iv => SENSOR_META[iv.sensor].label);
        const allNames = interventionNames.length > 0 ? interventionNames.join(', ') : 'All sensors';
        addLog(`Uma: Full equilibrium confirmed across all 7 parameters.`, 'success');
        addLog(`Uma: Disengaging actuators. Returning to passive monitoring.`, 'info');
        setActiveInterventions([]);
        setMonitoringRecovery(false);

        if (voiceEnabled) {
          generateSpeechUrl(`Full equilibrium restored. All seven parameters are within operational range. Disengaging all actuators and returning to passive monitoring.`)
            .then(url => {
              if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
              }
            }).catch(() => {});
        }
      } else {
        // Log the worst offender
        const worst = outOfRange.reduce((a, b) => a.diff > b.diff ? a : b);
        const recoveredCount = allKeys.length - outOfRange.length;
        addLog(`Uma [Monitoring]: ${recoveredCount}/7 nominal · ${SENSOR_META[worst.key].label} Δ${worst.diff.toFixed(2)} from target`, 'info');
      }
    }, 4000);

    return () => clearInterval(checkInterval);
  }, [monitoringRecovery, activeInterventions, voiceEnabled, addLog]);

  /* ── Cascade failure propagation ── */
  useEffect(() => {
    if (tick % 6 !== 0) return;
    const current = sensorsRef.current;
    const newBottlenecks: Bottleneck[] = [];

    CASCADE_RULES.forEach(rule => {
      const val = current[rule.trigger];
      const triggered = rule.direction === 'above' ? val > rule.threshold : val < rule.threshold;
      if (triggered) {
        const severity = Math.abs(val - rule.threshold);
        newBottlenecks.push({ sensor: rule.trigger, severity, message: rule.message });

        if (!umaActive) {
          // Cascading effects only if Uma is NOT correcting
          setSensors(prev => {
            const next = { ...prev };
            rule.effects.forEach(e => {
              next[e.sensor] = prev[e.sensor] + e.delta * 0.15;
            });
            return next;
          });
          if (!cascadeActive) {
            setCascadeActive(true);
            addLog(`⛓ CASCADE: ${rule.message}`, 'danger');
          }
        }
      }
    });

    setBottlenecks(newBottlenecks);
    if (newBottlenecks.length === 0) setCascadeActive(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, umaActive, cascadeActive, addLog]);

  /* ── Toggle Uma ── */
  const toggleUma = () => {
    if (!umaActive) {
      setUmaActive(true);
      setUmaState('idle');
      addLog('Uma activated. Monitoring all sensor feeds.', 'success');
    } else {
      setUmaActive(false);
      setUmaState('offline');
      addLog('Uma deactivated. System running in manual mode.', 'warning');
    }
  };

  /* ── Perturbation → Uma Monitoring ── */
  const perturbSensor = async (key: SensorKey, targetValue: number, label: string) => {
    setSensors(prev => ({ ...prev, [key]: targetValue }));
    addLog(`⚠ ${label}`, 'danger');

    // Log telemetry
    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { logTelemetry(type: "${key}_spike", value: ${targetValue}, message: "${label}") { id } }` })
      });
    } catch { /* silent */ }

    if (umaActive) {
      setUmaState('analyzing');
      addLog('Uma: Anomaly detected. Analyzing sensor array...', 'info');

      try {
        // Call the monitoring API — Uma gets the full sensor state and reasons through it
        const res = await fetch('/api/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sensorState: { ...sensors, [key]: targetValue },
            triggeredSensor: `${SENSOR_META[key].label} at ${targetValue.toFixed(1)} ${SENSOR_META[key].unit}`,
          }),
        });

        if (!res.ok) throw new Error('Monitor API failed');
        const umaResponse = await res.json();

        setUmaState('correcting');

        // Log Uma's analysis
        if (umaResponse.analysis) {
          addLog(`Uma [Analysis]: ${umaResponse.analysis}`, 'info');
        }
        if (umaResponse.strategy) {
          addLog(`Uma [Strategy]: ${umaResponse.strategy}`, 'success');
        }

        // Apply Uma's corrective actions & track active interventions
        const newInterventions: ActiveIntervention[] = [];
        if (umaResponse.actions && Array.isArray(umaResponse.actions)) {
          for (const action of umaResponse.actions) {
            if (action.actuator) {
              addLog(`Uma [Actuator]: ${action.actuator} — ${action.detail || ''}`, 'success');
              const sensorKey = action.sensor as SensorKey;
              if (sensorKey && SENSOR_META[sensorKey]) {
                newInterventions.push({
                  sensor: sensorKey,
                  actuator: action.actuator,
                  detail: action.detail || '',
                  startedAt: Date.now(),
                });
              }
            }
          }
        }
        setActiveInterventions(prev => [...prev, ...newInterventions]);
        setMonitoringRecovery(true);
        addLog('Uma: Monitoring recovery. Will notify when equilibrium is restored.', 'info');

        // Voice narration
        const narration = umaResponse.narration || umaResponse.analysis || 'Corrective action applied.';
        setUmaState('speaking');

        if (voiceEnabled) {
          try {
            const url = await generateSpeechUrl(narration.slice(0, 400));
            if (audioRef.current) {
              audioRef.current.src = url;
              audioRef.current.play();
              audioRef.current.onended = () => setUmaState('idle');
            }
          } catch { setTimeout(() => setUmaState('idle'), 3000); }
        } else {
          setTimeout(() => setUmaState('idle'), 3000);
        }

      } catch (err) {
        console.error('Uma monitoring error:', err);
        addLog('Uma: Monitoring API unavailable. Falling back to baseline correction.', 'warning');
        setUmaState('idle');
      }
    }
  };

  /* ── Status helper ── */
  const getStatus = (key: SensorKey): SensorStatus => {
    const val = sensors[key];
    const meta = SENSOR_META[key];
    if (val < meta.dangerLow || val > meta.dangerHigh) return 'danger';
    const eq = EQ[key];
    const warnThreshold = key === 'light' ? 50 : key === 'humidity' ? 8 : key === 'temp' ? 2 : 0.3;
    if (Math.abs(val - eq) > warnThreshold) return 'warning';
    return 'nominal';
  };

  const sensorKeys: SensorKey[] = ['ph', 'temp', 'humidity', 'ec', 'do2', 'flow', 'light'];

  return (
    <div className="sim-container">
      {/* ═══ HEADER ═══ */}
      <div className="sim-header animate-in">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Digital Twin</h1>
          <p className="page-subtitle">Real-time hydroponic simulation. Spike sensors to create perturbations and observe Uma&apos;s elastic correction and cascade failure propagation.</p>
        </div>
        <div className="sim-header-right">
          <button className={`btn btn-ghost btn-icon ${voiceEnabled ? 'voice-active' : ''}`} onClick={() => setVoiceEnabled(!voiceEnabled)}>
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {/* UMA TOGGLE */}
          <div className={`uma-toggle-wrap ${umaActive ? 'active' : ''}`} onClick={toggleUma}>
            <div className="uma-toggle-track">
              <div className="uma-toggle-glow" />
              <div className="uma-toggle-thumb">
                <Power size={14} />
              </div>
            </div>
            <div className="uma-toggle-label">
              <span className="uma-toggle-name">Uma</span>
              <span className={`uma-toggle-status ${umaActive ? 'on' : 'off'}`}>{umaActive ? 'Active' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FARM SCHEMATIC ═══ */}
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

          {/* ── FULL HYDROPONIC INFRASTRUCTURE SVG ── */}
          <svg className="flow-svg" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="waterGradV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="hotGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="nutrientGradV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                <stop offset="50%" stopColor="#22c55e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <filter id="glowSm"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>

            {/* ═══ LED PANEL (top) ═══ */}
            <rect x="250" y="8" width="500" height="16" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
            {[0,1,2,3,4,5,6,7,8,9].map(i => (
              <rect key={`led-${i}`} x={265 + i * 48} y="11" width="34" height="10" rx="2"
                fill={getStatus('light') === 'danger' ? 'rgba(245,158,11,0.3)' : 'rgba(250,204,21,0.15)'}
                stroke={getStatus('light') === 'danger' ? 'rgba(245,158,11,0.5)' : 'rgba(250,204,21,0.3)'}
              />
            ))}
            <text x="500" y="7" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="600" letterSpacing="1.5">LED GROW LIGHTS · {sensors.light.toFixed(0)} µmol</text>

            {/* ═══ RESERVOIR TANK (bottom-left) ═══ */}
            <rect x="30" y="280" width="160" height="100" rx="8" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" />
            <rect x="35" y={380 - Math.min(90, 90 * (sensors.flow / 3))} width="150" height={Math.min(90, 90 * (sensors.flow / 3))} rx="4" fill="rgba(59,130,246,0.08)" className="reservoir-water" />
            <text x="110" y="275" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="600" letterSpacing="1">NUTRIENT RESERVOIR</text>
            {/* Air bubbles in reservoir */}
            {[60, 90, 120, 150].map((x, i) => (
              <circle key={`bubble-${i}`} cx={x} cy={350} r="2" fill="rgba(139,92,246,0.3)" className="air-particle" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}

            {/* ═══ AIR PUMP (below reservoir) ═══ */}
            <rect x="45" y="250" width="50" height="22" rx="4" fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.25)" />
            <text x="70" y="264" textAnchor="middle" fill="rgba(139,92,246,0.6)" fontSize="6" fontWeight="700">AIR PUMP</text>
            {/* Airline to reservoir */}
            <line x1="70" y1="272" x2="70" y2="290" stroke="rgba(139,92,246,0.2)" strokeWidth="1" strokeDasharray="3 2" />

            {/* ═══ PERISTALTIC DOSING PUMPS (left side) ═══ */}
            {[
              { y: 125, label: 'pH DOWN', color: 'rgba(244,63,94,0.25)', fill: 'rgba(244,63,94,0.08)' },
              { y: 155, label: 'pH UP', color: 'rgba(59,130,246,0.25)', fill: 'rgba(59,130,246,0.08)' },
              { y: 185, label: 'NUTR A', color: 'rgba(34,197,94,0.25)', fill: 'rgba(34,197,94,0.08)' },
              { y: 215, label: 'NUTR B', color: 'rgba(245,158,11,0.25)', fill: 'rgba(245,158,11,0.08)' },
            ].map((pump, i) => (
              <g key={`pump-${i}`}>
                <rect x="30" y={pump.y} width="55" height="22" rx="4" fill={pump.fill} stroke={pump.color} />
                <text x="57" y={pump.y + 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6" fontWeight="700">{pump.label}</text>
                {/* Feed line to main pipe */}
                <line x1="85" y1={pump.y + 11} x2="130" y2={pump.y + 11} stroke={pump.color} strokeWidth="1" strokeDasharray="3 2" />
              </g>
            ))}
            <text x="57" y="118" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontWeight="600" letterSpacing="0.5">DOSING PUMPS</text>

            {/* ═══ MAIN CIRCULATION PUMP ═══ */}
            <rect x="105" y="250" width="55" height="22" rx="4" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.25)" />
            <text x="132" y="264" textAnchor="middle" fill="rgba(59,130,246,0.6)" fontSize="6" fontWeight="700">MAIN PUMP</text>
            {/* Pipe from reservoir to pump */}
            <line x1="132" y1="280" x2="132" y2="272" stroke="rgba(59,130,246,0.15)" strokeWidth="2" />
            {/* Pipe from pump up to supply header */}
            <rect x="130" y="50" width="4" height="200" rx="2" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" />
            <rect x="131" y="50" width="2" height="200" rx="1" fill="url(#nutrientGradV)" className="flow-anim-v-up" />

            {/* ═══ CHILLER (right side) ═══ */}
            <rect x="910" y="250" width="60" height="28" rx="4" fill={getStatus('temp') === 'danger' ? 'rgba(244,63,94,0.1)' : 'rgba(34,211,238,0.06)'} stroke={getStatus('temp') === 'danger' ? 'rgba(244,63,94,0.3)' : 'rgba(34,211,238,0.2)'} />
            <text x="940" y="268" textAnchor="middle" fill={getStatus('temp') === 'danger' ? 'rgba(244,63,94,0.6)' : 'rgba(34,211,238,0.5)'} fontSize="7" fontWeight="700">CHILLER</text>

            {/* ═══ VENTILATION FANS (right side) ═══ */}
            {[140, 190].map((y, i) => (
              <g key={`fan-${i}`}>
                <circle cx="950" cy={y} r="16" fill="rgba(139,92,246,0.05)" stroke="rgba(139,92,246,0.2)" />
                <text x="950" y={y + 3} textAnchor="middle" fill="rgba(139,92,246,0.5)" fontSize="7" fontWeight="700">FAN</text>
              </g>
            ))}
            <text x="950" y="120" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontWeight="600">HVAC</text>

            {/* ═══ WATER SUPPLY HEADER (horizontal pipe) ═══ */}
            <rect x="130" y="48" width="770" height="6" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
            <rect x="130" y="48" width="770" height="6" rx="3" fill={getStatus('temp') === 'danger' ? 'url(#hotGrad)' : 'url(#waterGrad)'} className="flow-anim-h" />
            <text x="515" y="43" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontWeight="600" letterSpacing="1">SUPPLY HEADER</text>

            {/* ═══ RETURN DRAIN (horizontal pipe, bottom) ═══ */}
            <rect x="190" y="365" width="710" height="6" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
            <rect x="190" y="365" width="710" height="6" rx="3" fill="url(#waterGrad)" className="flow-anim-h-rev" />
            <text x="545" y="390" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontWeight="600" letterSpacing="1">RETURN DRAIN → RESERVOIR</text>
            {/* Return pipe back to reservoir */}
            <line x1="190" y1="368" x2="190" y2="340" stroke="rgba(59,130,246,0.1)" strokeWidth="2" />
            <line x1="190" y1="340" x2="110" y2="340" stroke="rgba(59,130,246,0.1)" strokeWidth="2" />

            {/* ═══ VERTICAL FEED DROPS TO TOWERS ═══ */}
            {[280, 410, 540, 670, 800].map((x, i) => (
              <g key={`drop-${i}`}>
                <rect x={x - 2} y="54" width="4" height="308" rx="2" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.03)" />
                <rect x={x - 1} y="54" width="2" height="308" rx="1" fill="url(#waterGradV)" className="flow-anim-v" style={{ animationDelay: `${i * 0.3}s` }} />
              </g>
            ))}

            {/* ═══ GROW TOWERS (with crop labels & disease status) ═══ */}
            {[280, 410, 540, 670, 800].map((x, i) => {
              const towerCrop = TOWER_CROPS[i];
              const towerCond = towerConditions.find(tc => tc.towerId === towerCrop.id);
              const hasDis = !!towerCond?.disease;
              const tColor = hasDis ? '#f43f5e' : getStatus('ph') === 'danger' ? '#f43f5e' : getStatus('ph') === 'warning' ? '#f59e0b' : '#22c55e';
              return (
                <g key={`tower-${i}`}>
                  <text x={x} y="72" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="6" fontWeight="700">{towerCrop.id}</text>
                  <text x={x} y="82" textAnchor="middle" fill={hasDis ? 'rgba(244,63,94,0.6)' : 'rgba(255,255,255,0.15)'} fontSize="5" fontWeight="500">{towerCrop.crop}</text>
                  {[90, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 310, 335].map((y, j) => (
                    <rect key={j} x={x - 14} y={y} width="28" height="8" rx="3"
                      fill={`${tColor}${hasDis ? '12' : '08'}`} stroke={`${tColor}${hasDis ? '40' : '20'}`} strokeWidth="0.5"
                    />
                  ))}
                  {/* Disease badge on tower */}
                  {hasDis && (
                    <g>
                      <rect x={x - 30} y="350" width="60" height="14" rx="4" fill="rgba(244,63,94,0.12)" stroke="rgba(244,63,94,0.3)" />
                      <text x={x} y="360" textAnchor="middle" fill="#f43f5e" fontSize="6" fontWeight="700">🦠 DISEASED</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ═══ SENSOR NODES ═══ */}
            {[
              { key: 'ph' as SensorKey, x: 175, y: 200, label: 'pH' },
              { key: 'temp' as SensorKey, x: 870, y: 265, label: 'TEMP' },
              { key: 'ec' as SensorKey, x: 175, y: 300, label: 'EC' },
              { key: 'do2' as SensorKey, x: 110, y: 340, label: 'O₂' },
              { key: 'flow' as SensorKey, x: 175, y: 250, label: 'FLOW' },
              { key: 'humidity' as SensorKey, x: 900, y: 165, label: 'RH' },
              { key: 'light' as SensorKey, x: 750, y: 18, label: 'PAR' },
            ].map(s => {
              const status = getStatus(s.key);
              const fillColor = status === 'danger' ? 'rgba(244,63,94,0.15)' : status === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.1)';
              const strokeColor = status === 'danger' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : '#22c55e';
              return (
                <g key={s.key}>
                  {status === 'danger' && <circle cx={s.x} cy={s.y} r="22" fill="none" stroke={strokeColor} strokeWidth="1" opacity="0.3" className="sensor-alarm-ring" />}
                  <circle cx={s.x} cy={s.y} r="16" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" filter={status === 'danger' ? 'url(#glow)' : undefined} />
                  <text x={s.x} y={s.y - 2} textAnchor="middle" fill={strokeColor} fontSize="7" fontWeight="700" letterSpacing="0.3">{s.label}</text>
                  <text x={s.x} y={s.y + 8} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="600" fontFamily="JetBrains Mono, monospace">{sensors[s.key].toFixed(s.key === 'light' || s.key === 'humidity' ? 0 : 1)}</text>
                </g>
              );
            })}

            {/* ═══ BOTTLENECK INDICATORS ═══ */}
            {bottlenecks.map((bn, i) => {
              const positions: Record<SensorKey, { x: number; y: number }> = {
                ph: { x: 175, y: 200 }, temp: { x: 870, y: 265 }, ec: { x: 175, y: 300 },
                do2: { x: 110, y: 340 }, flow: { x: 175, y: 250 }, humidity: { x: 900, y: 165 }, light: { x: 750, y: 18 },
              };
              const pos = positions[bn.sensor];
              return (
                <g key={`bn-${i}`}>
                  <circle cx={pos.x} cy={pos.y} r="26" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" className="bottleneck-ring" />
                </g>
              );
            })}

            {/* ═══ INTERVENTION ANNOTATIONS ═══ */}
            {activeInterventions.map((iv, i) => {
              const positions: Record<SensorKey, { x: number; y: number }> = {
                ph: { x: 175, y: 200 }, temp: { x: 870, y: 265 }, ec: { x: 175, y: 300 },
                do2: { x: 110, y: 340 }, flow: { x: 175, y: 250 }, humidity: { x: 900, y: 165 }, light: { x: 750, y: 18 },
              };
              const pos = positions[iv.sensor];
              if (!pos) return null;
              const labelX = pos.x > 500 ? pos.x - 90 : pos.x + 90;
              return (
                <g key={`iv-${i}`} className="intervention-annotation">
                  <line x1={pos.x + (pos.x > 500 ? -18 : 18)} y1={pos.y} x2={labelX + (pos.x > 500 ? 70 : -70)} y2={pos.y} stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                  <rect x={labelX - 70} y={pos.y - 14} width="140" height="28" rx="6" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.25)" strokeWidth="1" />
                  <text x={labelX} y={pos.y - 2} textAnchor="middle" fill="#22c55e" fontSize="7" fontWeight="700">{iv.actuator.slice(0, 26)}</text>
                  <text x={labelX} y={pos.y + 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6">{iv.detail.slice(0, 32)}</text>
                  <circle cx={pos.x} cy={pos.y} r="20" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4" className="intervention-pulse" />
                </g>
              );
            })}

            {/* ═══ UMA ORB (center of towers) ═══ */}
            <g className={`uma-svg-orb ${umaState}`}>
              <circle cx="540" cy="195" r="28" fill="rgba(34,197,94,0.02)" stroke={umaActive ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'} strokeWidth="1" className="uma-ring-1" />
              <circle cx="540" cy="195" r="20" fill="rgba(34,197,94,0.04)" stroke={umaActive ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'} strokeWidth="1" className="uma-ring-2" />
              <circle cx="540" cy="195" r="12" fill={umaActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)'} stroke={umaActive ? '#22c55e' : 'rgba(255,255,255,0.12)'} strokeWidth="1.5" />
              {umaActive && <circle cx="540" cy="195" r="3" fill="#22c55e" filter="url(#glowSm)"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" /></circle>}
              <text x="540" y="230" textAnchor="middle" fill={umaActive ? '#22c55e' : 'rgba(255,255,255,0.18)'} fontSize="8" fontWeight="700" letterSpacing="1.5">UMA</text>
            </g>
          </svg>
        </div>
      </div>

      {/* ═══ SENSOR TELEMETRY GRID ═══ */}
      <div className="sensor-grid">
        {sensorKeys.map((key, i) => {
          const meta = SENSOR_META[key];
          const val = sensors[key];
          const eq = EQ[key];
          const status = getStatus(key);
          const Icon = meta.icon;
          const pct = ((val - meta.min) / (meta.max - meta.min)) * 100;
          const eqPct = ((eq - meta.min) / (meta.max - meta.min)) * 100;
          const delta = val - eq;
          const hasBn = bottlenecks.some(b => b.sensor === key);

          return (
            <div key={key} className={`sensor-card glass-panel animate-in ${status} ${hasBn ? 'has-bottleneck' : ''}`} style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
              <div className="sensor-top">
                <div className="sensor-icon" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={16} />
                </div>
                <div className="sensor-info">
                  <span className="sensor-name">{meta.label}</span>
                </div>
                <div className={`sensor-dot ${status}`} />
              </div>
              <div className="sensor-reading">
                <span className="sensor-val mono">{val.toFixed(key === 'light' || key === 'humidity' ? 0 : key === 'ph' || key === 'ec' ? 2 : 1)}</span>
                <span className="sensor-unit">{meta.unit}</span>
                <span className={`sensor-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                  {delta > 0 ? <ArrowUp size={10} /> : delta < 0 ? <ArrowDown size={10} /> : null}
                  {Math.abs(delta).toFixed(key === 'light' || key === 'humidity' ? 0 : 1)}
                </span>
              </div>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: status === 'danger' ? 'var(--rose)' : status === 'warning' ? 'var(--amber)' : meta.color }} />
                <div className="sensor-bar-eq" style={{ left: `${eqPct}%` }} />
              </div>
              <button className="btn btn-secondary btn-sm sensor-spike" onClick={() => {
                const spikeVal = key === 'ph' ? 8.5 : key === 'temp' ? 34 : key === 'humidity' ? 93 : key === 'ec' ? 3.9 : key === 'do2' ? 3.0 : key === 'flow' ? 0.5 : 700;
                perturbSensor(key, spikeVal, `${meta.label} spiked to ${spikeVal} ${meta.unit}`);
              }}>
                <AlertTriangle size={11} /> Spike
              </button>
            </div>
          );
        })}
      </div>

      {/* ═══ CROP HEALTH & DISEASE SIMULATION ═══ */}
      <div className="disease-panel glass-panel animate-in animate-in-delay-2">
        <div className="disease-header">
          <h3><Bug size={14} /> Crop Health & Disease Simulation</h3>
          <span className="badge badge-info">{towerConditions.filter(t => t.disease).length} active</span>
        </div>
        <div className="disease-body">
          {/* Tower selector */}
          <div className="tower-selector">
            {TOWER_CROPS.map(t => {
              const condition = towerConditions.find(tc => tc.towerId === t.id);
              const hasDisease = !!condition?.disease;
              return (
                <button
                  key={t.id}
                  className={`tower-chip ${selectedTower === t.id ? 'active' : ''} ${hasDisease ? 'diseased' : ''}`}
                  onClick={() => setSelectedTower(t.id)}
                >
                  <span className="tower-chip-emoji">{t.emoji}</span>
                  <span className="tower-chip-label">{t.id} · {t.crop}</span>
                  {hasDisease && <span className="tower-chip-alert">⚠</span>}
                </button>
              );
            })}
          </div>

          {/* Disease selector for selected tower */}
          <div className="disease-grid">
            {DISEASE_CATALOG.map(disease => {
              const currentCondition = towerConditions.find(t => t.towerId === selectedTower);
              const isActive = currentCondition?.disease?.id === disease.id;
              return (
                <button
                  key={disease.id}
                  className={`disease-card glass-panel ${isActive ? 'active' : ''} ${disease.severity}`}
                  onClick={async () => {
                    if (isActive) return;
                    const tower = TOWER_CROPS.find(t => t.id === selectedTower)!;
                    // Apply sensor effects
                    setSensors(prev => {
                      const next = { ...prev };
                      disease.sensorEffects.forEach(e => { next[e.sensor] = prev[e.sensor] + e.delta; });
                      return next;
                    });
                    setTowerConditions(prev => prev.map(tc =>
                      tc.towerId === selectedTower ? { ...tc, disease, injectedAt: Date.now() } : tc
                    ));
                    addLog(`🦠 ${disease.name} detected on ${tower.crop} (${selectedTower})`, 'danger');
                    addLog(`Symptoms: ${disease.symptoms}`, 'warning');

                    if (umaActive) {
                      setUmaState('analyzing');
                      try {
                        const res = await fetch('/api/monitor', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sensorState: (() => {
                              const s = { ...sensors };
                              disease.sensorEffects.forEach(e => { s[e.sensor] = sensors[e.sensor] + e.delta; });
                              return s;
                            })(),
                            triggeredSensor: `${disease.name} on ${tower.crop} (${selectedTower}). ${disease.description}. Symptoms: ${disease.symptoms}. This is a ${disease.severity} plant disease requiring agricultural expertise.`,
                          }),
                        });
                        if (!res.ok) throw new Error('Monitor API failed');
                        const umaResponse = await res.json();
                        setUmaState('correcting');
                        if (umaResponse.analysis) addLog(`Uma [Analysis]: ${umaResponse.analysis}`, 'info');
                        if (umaResponse.strategy) addLog(`Uma [Strategy]: ${umaResponse.strategy}`, 'success');
                        if (umaResponse.actions) {
                          const newIvs: ActiveIntervention[] = [];
                          for (const action of umaResponse.actions) {
                            if (action.actuator) {
                              addLog(`Uma [Actuator]: ${action.actuator} — ${action.detail || ''}`, 'success');
                              const sk = action.sensor as SensorKey;
                              if (sk && SENSOR_META[sk]) newIvs.push({ sensor: sk, actuator: action.actuator, detail: action.detail || '', startedAt: Date.now() });
                            }
                          }
                          setActiveInterventions(prev => [...prev, ...newIvs]);
                          setMonitoringRecovery(true);
                        }
                        const narration = umaResponse.narration || umaResponse.analysis || '';
                        setUmaState('speaking');
                        if (voiceEnabled && narration) {
                          try {
                            const url = await generateSpeechUrl(narration.slice(0, 400));
                            if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); audioRef.current.onended = () => setUmaState('idle'); }
                          } catch { setTimeout(() => setUmaState('idle'), 3000); }
                        } else { setTimeout(() => setUmaState('idle'), 3000); }
                      } catch {
                        addLog('Uma: Disease monitoring unavailable.', 'warning');
                        setUmaState('idle');
                      }
                    }
                  }}
                >
                  <div className="disease-card-head">
                    <span className="disease-name">{disease.name}</span>
                    <span className={`badge badge-${disease.severity === 'critical' ? 'danger' : disease.severity === 'severe' ? 'warning' : 'info'}`}>{disease.severity}</span>
                  </div>
                  <p className="disease-desc">{disease.description}</p>
                  {isActive && <div className="disease-active-tag">Active on {selectedTower}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ ACTIVITY LOG ═══ */}
      <div className="sim-log glass-panel animate-in animate-in-delay-3">
        <div className="log-head">
          <h3>Activity Feed</h3>
          {cascadeActive && <span className="badge badge-danger">⛓ Cascading</span>}
          <span className="badge badge-info"><Activity size={12} /> {logs.length}</span>
        </div>
        <div className="log-list">
          {logs.length === 0 ? (
            <div className="log-empty">No events yet. Activate Uma or spike a sensor to begin.</div>
          ) : logs.map((l, i) => (
            <div key={i} className={`log-row ${l.type}`}>
              <span className="log-ts mono">{l.time}</span>
              <span className={`log-pip ${l.type}`} />
              <span className="log-msg">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
