"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { generateSpeechUrl } from '../../lib/ai';
import {
  RESERVOIR_EQ, AMBIENT_EQ, TOWER_CROPS, CASCADE_RULES, HUMIDITY_ZONES_DEF,
  RESERVOIR_META, AMBIENT_META,
  getReservoirStatus, getAmbientStatus,
  type ReservoirKey, type AmbientKey, type RowZone, type LogEntry,
  type Bottleneck, type ActiveIntervention, type TowerCondition, type Disease,
  type HumidityZone, type TeamWorker, type WorkOrder,
} from './types';

/* ═══════════════════════════════════════════
   CONTEXT SHAPE
   ═══════════════════════════════════════════ */

type UmaState = 'offline' | 'idle' | 'analyzing' | 'correcting' | 'speaking';

interface SimulationContextType {
  // Sensor state
  reservoir: Record<ReservoirKey, number>;
  ambient: Record<AmbientKey, number>;
  rowZones: RowZone[];
  humidityZones: HumidityZone[];

  // Uma
  umaActive: boolean;
  umaState: UmaState;
  toggleUma: () => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  umaLanguage: string;
  setUmaLanguage: (l: string) => void;

  // System state
  logs: LogEntry[];
  bottlenecks: Bottleneck[];
  cascadeActive: boolean;
  activeInterventions: ActiveIntervention[];

  // Disease
  towerConditions: TowerCondition[];
  selectedTower: string;
  setSelectedTower: (id: string) => void;
  injectDisease: (towerId: string, disease: Disease) => void;
  fusedDiseaseImage: string | null;
  setFusedDiseaseImage: (url: string | null) => void;

  // Team & Work Orders
  teamWorkers: TeamWorker[];
  workOrders: WorkOrder[];
  addWorker: (worker: TeamWorker) => void;
  issueWorkOrder: (order: Omit<WorkOrder, 'id' | 'createdAt'>) => void;
  completeWorkOrder: (id: string) => void;

  // Perturbation
  perturbReservoir: (key: ReservoirKey, value: number, label: string) => void;
  perturbAmbient: (key: AmbientKey, value: number, label: string) => void;
  perturbRow: (towerId: string, type: 'ph' | 'ec' | 'rh', value: number) => void;
  toggleRowValve: (towerId: string) => void;
  toggleZoneHumidifier: (zoneId: 'A' | 'B') => void;
  toggleZoneDehumidifier: (zoneId: 'A' | 'B') => void;

  // Topology Loading
  initTopology: (nodes: any[]) => void;

  // Schema snapshot for Uma chat integration
  buildFullSnapshot: (overrides?: Record<string, any>) => any;

  // NEW: System Actuators explicitly tracked for digital twin animations
  systemActuators: Record<string, boolean>;

  // Tick
  tick: number;
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}

/* ═══════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════ */

export function SimulationProvider({ children }: { children: ReactNode }) {
  /* ── Core sensor state ── */
  const [reservoir, setReservoir] = useState<Record<ReservoirKey, number>>({
    ph: RESERVOIR_EQ.ph, ec: RESERVOIR_EQ.ec, temp: RESERVOIR_EQ.temp,
    do2: RESERVOIR_EQ.do2, flow: RESERVOIR_EQ.flow,
  });

  const [ambient, setAmbient] = useState<Record<AmbientKey, number>>({
    humidity: AMBIENT_EQ.humidity, light: AMBIENT_EQ.light,
  });

  const [systemActuators, setSystemActuators] = useState<Record<string, boolean>>({
    ph_doser: false,
    nutrient_doser: false,
    ro_valve: false,
    air_pump: true, // naturally on
    circulation_pump: true, // naturally on
    chiller: false,
    led_dimmer: true, // naturally on
  });

  const [rowZones, setRowZones] = useState<RowZone[]>(
    TOWER_CROPS.map((t, i) => ({
      towerId: t.id, crop: t.crop, emoji: t.emoji,
      sensors: { phInput: t.eqPh, ecRunoff: t.eqEc, rh: t.eqRh, valveOpen: true },
      optimalPh: t.optimalPh, optimalEc: t.optimalEc, optimalRh: t.optimalRh,
      humidityZone: i < 2 ? 'A' as const : 'B' as const,
    }))
  );

  const [humidityZones, setHumidityZones] = useState<HumidityZone[]>(
    HUMIDITY_ZONES_DEF.map(z => ({ ...z, humidifierOn: false, dehumidifierOn: false }))
  );

  /* ── Uma state ── */
  const [umaActive, setUmaActive] = useState(false);
  const [umaState, setUmaState] = useState<UmaState>('offline');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [umaLanguage, setUmaLanguage] = useState('English');

  /* ── System state ── */
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [cascadeActive, setCascadeActive] = useState(false);
  const [activeInterventions, setActiveInterventions] = useState<ActiveIntervention[]>([]);
  const [monitoringRecovery, setMonitoringRecovery] = useState(false);
  const [tick, setTick] = useState(0);

  /* ── Disease state ── */
  const [towerConditions, setTowerConditions] = useState<TowerCondition[]>(
    TOWER_CROPS.map(t => ({ towerId: t.id, disease: null, injectedAt: null }))
  );
  const [selectedTower, setSelectedTower] = useState<string>('T1');
  const [fusedDiseaseImage, setFusedDiseaseImage] = useState<string | null>(null);

  /* ── Team & Work Orders State ── */
  // Auto-init with the user's requesting email for testing mock if needed, or leave empty
  const [teamWorkers, setTeamWorkers] = useState<TeamWorker[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  /* ── Settings State ── */
  const [cronInterval, setCronInterval] = useState(5);
  const [reminderTimeframe, setReminderTimeframe] = useState(30);

  /* ── Load team workers & work orders from DB on mount ── */
  useEffect(() => {
    // Load Settings
    const stored = localStorage.getItem('uma_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCronInterval(parsed.cronInterval || 5);
        setReminderTimeframe(parsed.reminderTimeframe || 30);
      } catch (e) {}
    }

    // Listen for settings changes
    const handleSettingsChange = (e: any) => {
      setCronInterval(e.detail.cronInterval);
      setReminderTimeframe(e.detail.reminderTimeframe);
    };
    window.addEventListener('uma-settings-changed', handleSettingsChange);

    const loadFromDB = async () => {
      try {
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `query { getTeamWorkers { id name role email } getWorkOrders { id workOrderId type description assignedTo status createdAt reviewed reviewResult workerNotes resolution timeSpent } }` }),
        });
        const { data } = await res.json();
        if (data?.getTeamWorkers) {
          setTeamWorkers(data.getTeamWorkers.map((w: any) => ({ ...w })));
        }
        if (data?.getWorkOrders) {
          setWorkOrders(data.getWorkOrders.map((o: any) => ({ ...o, id: o.workOrderId || o.id, createdAt: !isNaN(Number(o.createdAt)) ? Number(o.createdAt) : new Date(o.createdAt).getTime() })));
        }
      } catch (e) {
        console.error('Failed to load team/orders from DB:', e);
      }
    };
    loadFromDB();

    return () => window.removeEventListener('uma-settings-changed', handleSettingsChange);
  }, []);

  /* ── Helpers ── */
  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 30));
  }, []);

  /* ── Background Telemetry & Data Refresh Loop ── */
  useEffect(() => {
    if (!umaActive) return;

    let lastKnownTelemetryTime = Date.now() - 10000;

    const intervalMs = 3000; // Poll frequently to keep reasoning stream synced
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: `query { 
              getTelemetry { id type message timestamp }
              getWorkOrders { id workOrderId type description assignedTo status createdAt reviewed reviewResult workerNotes resolution }
            }` 
          }),
        });
        const { data } = await res.json();
        
        // 1. Process new telemetry
        if (data?.getTelemetry) {
          const newEvents = data.getTelemetry.filter((t: any) => new Date(t.timestamp).getTime() > lastKnownTelemetryTime);
          if (newEvents.length > 0) {
            lastKnownTelemetryTime = Math.max(...newEvents.map((t: any) => new Date(t.timestamp).getTime()));
            newEvents.reverse().forEach((event: any) => {
              addLog(event.message, event.type === 'alert' ? 'warning' : event.type === 'correction' ? 'success' : 'info');
            });
          }
        }

        // 2. Refresh Work Orders seamlessly
        if (data?.getWorkOrders) {
           const parsedOrders = data.getWorkOrders.map((o: any) => ({ ...o, id: o.workOrderId || o.id, createdAt: !isNaN(Number(o.createdAt)) ? Number(o.createdAt) : new Date(o.createdAt).getTime() }));

           setWorkOrders(prev => {
             // Find newly verified orders that weren't verified before
             const newlyVerified = parsedOrders.filter((n: any) => 
               n.status === 'verified' && 
               !prev.find(p => p.id === n.id && p.status === 'verified')
             );

             for (const nv of newlyVerified) {
               if (nv.towerId) {
                  setTowerConditions(prevT => prevT.map(t => t.towerId === nv.towerId ? { ...t, disease: null, injectedAt: null } : t));
                  addLog(`Uma [Crop Control]: Restoring visual state of ${nv.towerId} automatically upon WO verification`, 'success');
               }
             }

             return parsedOrders;
           });
        }

      } catch (e) {
        console.error('Telemetry Pull Failed', e);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [umaActive, addLog]);

  /* ── Refs ── */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reservoirRef = useRef(reservoir);
  reservoirRef.current = reservoir;
  const ambientRef = useRef(ambient);
  ambientRef.current = ambient;
  const rowZonesRef = useRef(rowZones);
  rowZonesRef.current = rowZones;
  const humidityZonesRef = useRef(humidityZones);
  humidityZonesRef.current = humidityZones;
  const towerConditionsRef = useRef(towerConditions);
  towerConditionsRef.current = towerConditions;
  const teamWorkersRef = useRef(teamWorkers);
  teamWorkersRef.current = teamWorkers;
  const fusedDiseaseImageRef = useRef(fusedDiseaseImage);
  fusedDiseaseImageRef.current = fusedDiseaseImage;
  
  // Buffered Monitoring Refs
  const pendingSpikesRef = useRef<{sensor: string, label: string}[]>([]);
  const monitorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const umaStateRef = useRef(umaState);
  umaStateRef.current = umaState;
  const umaActiveRef = useRef(umaActive);
  umaActiveRef.current = umaActive;
  const audioQueueRef = useRef<string[]>([]);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const playUmaAudio = useCallback((url: string) => {
    if (!audioRef.current) return;
    
    // If the audio element is actively emitting sound, push the new file to the queue.
    // We DO NOT check umaStateRef here because setUmaState('speaking') is often called
    // before the synthesis completes, which would trap the audio in the queue forever.
    if (!audioRef.current.paused && audioRef.current.src) {
      audioQueueRef.current.push(url);
    } else {
      audioRef.current.src = url;
      setUmaState('speaking');
      
      const processNext = () => {
        if (audioQueueRef.current.length > 0) {
          const nextUrl = audioQueueRef.current.shift()!;
          audioRef.current!.src = nextUrl;
          audioRef.current!.play().catch(processNext);
        } else {
          setUmaState('idle');
        }
      };

      audioRef.current.play().catch((e) => {
        console.warn('Uma audio playback suppressed or failed', e);
        processNext();
      });
      
      audioRef.current.onended = processNext;
    }
  }, []);

  /* ── Helpers ── */
  /** Build a full snapshot of all sensors, actuators, and conditions for Uma */
  const buildFullSnapshot = useCallback((overrides?: Record<string, any>) => {
    const res = reservoirRef.current;
    const amb = ambientRef.current;
    const rows = rowZonesRef.current;
    const hzones = humidityZonesRef.current;
    const conditions = towerConditionsRef.current;

    return {
      // Reservoir sensors
      ph: res.ph, ec: res.ec, temp: res.temp, do2: res.do2, flow: res.flow,
      // Ambient sensors
      humidity: amb.humidity, light: amb.light,
      // Per-row sensor array
      rows: rows.map(r => ({
        towerId: r.towerId,
        crop: r.crop,
        humidityZone: r.humidityZone,
        phInput: r.sensors.phInput,
        ecRunoff: r.sensors.ecRunoff,
        rh: r.sensors.rh,
        valveOpen: r.sensors.valveOpen,
        optimalPh: r.optimalPh,
        optimalEc: r.optimalEc,
        optimalRh: r.optimalRh,
      })),
      // Humidity zone actuator states
      humidityZones: hzones.map(z => ({
        id: z.id,
        label: z.label,
        towerIds: z.towerIds,
        humidifierOn: z.humidifierOn,
        dehumidifierOn: z.dehumidifierOn,
      })),
      // Disease states
      diseases: conditions
        .filter(tc => tc.disease)
        .map(tc => ({
          towerId: tc.towerId,
          disease: tc.disease ? {
            name: tc.disease.name,
            severity: tc.disease.severity,
            symptoms: tc.disease.symptoms,
          } : null,
        })),
      // Team Workers tracking
      teamWorkers: teamWorkersRef.current,
      // Overrides (e.g., the value that was just spiked)
      ...overrides,
    };
  }, []);

  /* ═══ HEARTBEAT ═══ */
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, []);


  /* ═══ AMBIENT JITTER + PER-ROW MICROCLIMATE ═══ */
  useEffect(() => {
    if (tick % 4 !== 0) return;

    // Reservoir jitter
    setReservoir(prev => {
      const next = { ...prev };
      (Object.keys(prev) as ReservoirKey[]).forEach(k => {
        next[k] = prev[k] + (Math.random() - 0.5) * 0.05;
      });
      return next;
    });

    // Ambient jitter
    setAmbient(prev => ({
      humidity: prev.humidity + (Math.random() - 0.5) * 0.3,
      light: prev.light + (Math.random() - 0.5) * 0.5,
    }));

    // Per-row jitter — humidity affected by zone-level actuators
    const currentHzones = humidityZonesRef.current;
    setRowZones(prev => prev.map(row => {
      const zone = currentHzones.find(z => z.id === row.humidityZone);
      let rhDrift = (Math.random() - 0.5) * 0.4;

      // Zone humidifier raises humidity for all rows in zone
      if (zone?.humidifierOn) rhDrift += 0.6;
      // Zone dehumidifier lowers humidity for all rows in zone
      if (zone?.dehumidifierOn) rhDrift -= 0.5;
      // Closed valve slightly lowers humidity
      if (!row.sensors.valveOpen) rhDrift -= 0.15;

      return {
        ...row,
        sensors: {
          ...row.sensors,
          phInput: row.sensors.valveOpen
            ? row.sensors.phInput + (Math.random() - 0.5) * 0.03
            : row.sensors.phInput,
          ecRunoff: row.sensors.valveOpen
            ? row.sensors.ecRunoff + (Math.random() - 0.5) * 0.02
            : row.sensors.ecRunoff,
          rh: Math.max(10, Math.min(99, row.sensors.rh + rhDrift)),
        },
      };
    }));
  }, [tick]);

  /* ═══ UMA ELASTIC CORRECTION ═══ */
  useEffect(() => {
    if (!umaActive || tick % 2 !== 0) return;

    let isCorrection = false;

    // Correct reservoir
    setReservoir(prev => {
      const next = { ...prev };
      (Object.keys(prev) as ReservoirKey[]).forEach(k => {
        const eq = RESERVOIR_EQ[k];
        const diff = Math.abs(prev[k] - eq);
        if (diff > 0.15) {
          next[k] = prev[k] + (eq - prev[k]) * 0.06;
          isCorrection = true;
        }
      });
      return next;
    });

    // Correct ambient
    setAmbient(prev => {
      const next = { ...prev };
      (Object.keys(prev) as AmbientKey[]).forEach(k => {
        const eq = AMBIENT_EQ[k];
        const diff = Math.abs(prev[k] - eq);
        const threshold = k === 'light' ? 20 : 2;
        if (diff > threshold) {
          next[k] = prev[k] + (eq - prev[k]) * 0.06;
          isCorrection = true;
        }
      });
      return next;
    });

    // Correct per-row sensors + auto-engage zone humidity actuators
    const zoneRhNeeds: Record<'A' | 'B', 'humidify' | 'dehumidify' | 'off'> = { A: 'off', B: 'off' };

    setRowZones(prev => {
      const next = prev.map((row, i) => {
        const crop = TOWER_CROPS[i];
        const phDiff = Math.abs(row.sensors.phInput - crop.eqPh);
        const ecDiff = Math.abs(row.sensors.ecRunoff - crop.eqEc);
        const rhDiff = row.sensors.rh - crop.eqRh;
        let newPh = row.sensors.phInput;
        let newEc = row.sensors.ecRunoff;
        let newRh = row.sensors.rh;
        let newValve = row.sensors.valveOpen;

        if (phDiff > 0.15) {
          newPh = row.sensors.phInput + (crop.eqPh - row.sensors.phInput) * 0.06;
          isCorrection = true;
        }
        if (ecDiff > 0.15) {
          newEc = row.sensors.ecRunoff + (crop.eqEc - row.sensors.ecRunoff) * 0.06;
          isCorrection = true;
        }
        if (Math.abs(rhDiff) > 3) {
          newRh = row.sensors.rh + (crop.eqRh - row.sensors.rh) * 0.05;
          isCorrection = true;
          // Track what this zone needs
          if (rhDiff < -5) zoneRhNeeds[row.humidityZone] = 'humidify';
          else if (rhDiff > 5) zoneRhNeeds[row.humidityZone] = 'dehumidify';
        }
        if (!row.sensors.valveOpen) {
          newValve = true;
          isCorrection = true;
        }

        return { ...row, sensors: { phInput: newPh, ecRunoff: newEc, rh: newRh, valveOpen: newValve } };
      });
      return next;
    });

    // Auto-engage zone humidifiers/dehumidifiers
    setHumidityZones(prev => prev.map(zone => {
      const need = zoneRhNeeds[zone.id];
      if (need === 'humidify' && !zone.humidifierOn) {
        return { ...zone, humidifierOn: true, dehumidifierOn: false };
      } else if (need === 'dehumidify' && !zone.dehumidifierOn) {
        return { ...zone, dehumidifierOn: true, humidifierOn: false };
      } else if (need === 'off' && (zone.humidifierOn || zone.dehumidifierOn)) {
        return { ...zone, humidifierOn: false, dehumidifierOn: false };
      }
      return zone;
    }));

    if (isCorrection) {
      if (umaState === 'idle') setUmaState('correcting');
    } else if (umaState === 'correcting') {
      setUmaState('idle');
    }
  }, [tick, umaActive, umaState]);

  /* ═══ RECOVERY MONITORING ═══ */
  useEffect(() => {
    if (!monitoringRecovery) return;

    const checkInterval = setInterval(() => {
      const res = reservoirRef.current;
      const amb = ambientRef.current;
      const rows = rowZonesRef.current;

      let outOfRange = 0;
      let total = 0;

      (Object.keys(res) as ReservoirKey[]).forEach(k => {
        total++;
        const diff = Math.abs(res[k] - RESERVOIR_EQ[k]);
        const tolerance = k === 'temp' ? 1.5 : 0.25;
        if (diff > tolerance) outOfRange++;
      });

      (Object.keys(amb) as AmbientKey[]).forEach(k => {
        total++;
        const diff = Math.abs(amb[k] - AMBIENT_EQ[k]);
        const tolerance = k === 'light' ? 30 : 5;
        if (diff > tolerance) outOfRange++;
      });

      rows.forEach((row, i) => {
        const crop = TOWER_CROPS[i];
        total += 3;
        if (Math.abs(row.sensors.phInput - crop.eqPh) > 0.25) outOfRange++;
        if (Math.abs(row.sensors.ecRunoff - crop.eqEc) > 0.25) outOfRange++;
        if (Math.abs(row.sensors.rh - crop.eqRh) > 4) outOfRange++;
      });

      if (outOfRange === 0) {
        const logEq = umaLanguage === 'Español' ? `Uma: Equilibrio total confirmado en los ${total} sensores.` 
            : umaLanguage === 'Français' ? `Uma: Équilibre total confirmé sur les ${total} capteurs.`
            : umaLanguage === 'Deutsch' ? `Uma: Volles Gleichgewicht auf allen ${total} Sensoren bestätigt.`
            : umaLanguage === '日本語' ? `Uma: 全${total}センサーで完全同期確認。`
            : umaLanguage === '中文' ? `Uma: 所有${total}个传感器的平衡已确认。`
            : umaLanguage === 'Hindi' ? `Uma: सभी ${total} सेंसरों पर पूर्ण संतुलन की पुष्टि की गई।`
            : umaLanguage === 'Arabic' ? `Uma: تم تأكيد التوازن الكامل عبر جميع المستشعرات الـ ${total}.`
            : `Uma: Full equilibrium confirmed across all ${total} sensors.`;
        
        const logDisengage = umaLanguage === 'Español' ? `Uma: Desactivando actuadores. Regresando a monitoreo pasivo.`
            : umaLanguage === 'Français' ? `Uma: Désactivation des actionneurs. Retour à la surveillance active.`
            : umaLanguage === 'Deutsch' ? `Uma: Aktuatoren werden deaktiviert. Rüchkher zur passiven Überwachung.`
            : umaLanguage === '日本語' ? `Uma: アクチュエータを解除。受動的監視モードに戻ります。`
            : umaLanguage === '中文' ? `Uma: 脱开执行器。返回被动监控。`
            : umaLanguage === 'Hindi' ? `Uma: एक्चुएटर्स को बंद कर रहे हैं। निष्क्रिय निगरानी पर ফিরে آ रहे हैं।`
            : umaLanguage === 'Arabic' ? `Uma: إيقاف تشغيل المحركات. العودة إلى المراقبة السلبية.`
            : `Uma: Disengaging actuators. Returning to passive monitoring.`;

        addLog(logEq, 'success');
        addLog(logDisengage, 'info');

        setActiveInterventions([]);
        setMonitoringRecovery(false);
        setHumidityZones(prev => prev.map(z => ({ ...z, humidifierOn: false, dehumidifierOn: false })));

        if (voiceEnabled && audioRef.current) {
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: `All ${total} sensors are back in nominal equilibrium. Acknowledge this briefly to the engineering team and state you are disengaging actuators and returning to passive monitoring.`}],
              farmSchema: {},
              language: umaLanguage,
            }),
          })
          .then(res => res.json())
          .then(data => {
            const content = data.choices?.[0]?.message?.content;
            if (content) return generateSpeechUrl(content.slice(0, 400));
          })
          .then(url => { if (url) playUmaAudio(url); })
          .catch(() => {});
        }
      } else {
        const recovered = total - outOfRange;
        const msg = umaLanguage === 'Español' ? `Uma [Monitoreando]: ${recovered}/${total} nominal · ${outOfRange} ajustando`
               : umaLanguage === 'Français' ? `Uma [Surveillance]: ${recovered}/${total} nominal · ${outOfRange} en restauration`
               : umaLanguage === 'Deutsch' ? `Uma [Überwachung]: ${recovered}/${total} nominal · ${outOfRange} justieren`
               : umaLanguage === '日本語' ? `Uma [監視中]: ${recovered}/${total} 正常 · ${outOfRange} 調整中`
               : umaLanguage === '中文' ? `Uma [监控中]: ${recovered}/${total} 正常 · ${outOfRange} 调整中`
               : umaLanguage === 'Hindi' ? `Uma [निगरानी]: ${recovered}/${total} सामान्य · ${outOfRange} बहाल करना`
               : umaLanguage === 'Arabic' ? `Uma [مراقبة]: ${recovered}/${total} عادي · ${outOfRange} يتعافى`
               : `Uma [Monitoring]: ${recovered}/${total} nominal · ${outOfRange} sensors recovering`;
        addLog(msg, 'info');
      }
    }, 4000);

    return () => clearInterval(checkInterval);
  }, [monitoringRecovery, activeInterventions, voiceEnabled, addLog]);

  /* ═══ CASCADE FAILURE PROPAGATION ═══ */
  useEffect(() => {
    if (tick % 6 !== 0) return;
    const current = reservoirRef.current;
    const newBottlenecks: Bottleneck[] = [];

    CASCADE_RULES.forEach(rule => {
      const val = current[rule.trigger];
      const triggered = rule.direction === 'above' ? val > rule.threshold : val < rule.threshold;
      if (triggered) {
        const severity = Math.abs(val - rule.threshold);
        newBottlenecks.push({ sensor: rule.trigger, severity, message: rule.message });

        if (!umaActive) {
          setReservoir(prev => {
            const next = { ...prev };
            rule.effects.forEach(e => { next[e.sensor] = prev[e.sensor] + e.delta * 0.15; });
            return next;
          });

          // Temp cascade → humidity rises in all rows
          if (rule.trigger === 'temp') {
            setRowZones(prev => prev.map(row => ({
              ...row, sensors: { ...row.sensors, rh: row.sensors.rh + 1.2 },
            })));
          }

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

  /* ═══ TOGGLE UMA ═══ */
  const toggleUma = useCallback(() => {
    if (!umaActive) {
      setUmaActive(true);
      setUmaState('idle');
      addLog('Uma activated. Monitoring all sensor feeds across all rows.', 'success');
    } else {
      setUmaActive(false);
      setUmaState('offline');
      setHumidityZones(prev => prev.map(z => ({ ...z, humidifierOn: false, dehumidifierOn: false })));
      addLog('Uma deactivated. System running in manual mode.', 'warning');
    }
  }, [umaActive, addLog]);

  /* ═══ ACTUATOR TOGGLES ═══ */
  const toggleRowValve = useCallback((towerId: string, forceState?: boolean) => {
    setRowZones(prev => prev.map(row => {
      if (row.towerId !== towerId) return row;
      const newState = forceState !== undefined ? forceState : !row.sensors.valveOpen;
      if (row.sensors.valveOpen !== newState) {
        addLog(`${towerId}: Feed valve ${newState ? 'OPENED' : 'CLOSED'}`, newState ? 'success' : 'warning');
      }
      return { ...row, sensors: { ...row.sensors, valveOpen: newState } };
    }));
  }, [addLog]);

  const toggleZoneHumidifier = useCallback((zoneId: 'A' | 'B', forceState?: boolean) => {
    setHumidityZones(prev => prev.map(z => {
      if (z.id !== zoneId) return z;
      const newState = forceState !== undefined ? forceState : !z.humidifierOn;
      if (newState !== z.humidifierOn) {
        addLog(`Humidity Zone ${zoneId}: Humidifier ${newState ? 'ON' : 'OFF'}`, newState ? 'success' : 'info');
      }
      return { ...z, humidifierOn: newState, dehumidifierOn: newState ? false : z.dehumidifierOn };
    }));
  }, [addLog]);

  const toggleZoneDehumidifier = useCallback((zoneId: 'A' | 'B', forceState?: boolean) => {
    setHumidityZones(prev => prev.map(z => {
      if (z.id !== zoneId) return z;
      const newState = forceState !== undefined ? forceState : !z.dehumidifierOn;
      if (newState !== z.dehumidifierOn) {
        addLog(`Humidity Zone ${zoneId}: Dehumidifier ${newState ? 'ON' : 'OFF'}`, newState ? 'success' : 'info');
      }
      return { ...z, dehumidifierOn: newState, humidifierOn: newState ? false : z.humidifierOn };
    }));
  }, [addLog]);

  /* ═══ UMA MONITORING CALL (via /api/chat) ═══ */
  const callUmaMonitor = useCallback(async (sensorSnapshot: any, trigger: string) => {
    if (!umaActive) return;
    setUmaState('analyzing');
    addLog('Uma: Anomaly detected. Analyzing sensor array...', 'info');

    try {
      // Build the alert message as a chat user message
      const alertMessage = `[AUTONOMOUS ALERT] ${trigger}\n\nAnalyze the current sensor state, diagnose the issue, and take corrective action using your actuator tools. If physical human intervention is required, issue a work order. After acting, provide a brief spoken narration of what you did. You must respond to all messages in exactly this language: ${umaLanguage}.`;

      // Build farmSchema from snapshot (don't include schematicImage — model may not support vision)
      const farmSchema = { ...sensorSnapshot };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: alertMessage }],
          farmSchema,
          language: umaLanguage,
        }),
      });
      if (!res.ok) throw new Error('Chat API failed');
      const umaResponse = await res.json();

      setUmaState('correcting');

      // Execute actuator commands returned by Uma's tool calls
      const newInterventions: ActiveIntervention[] = [];
      if (umaResponse.actuatorCommands && Array.isArray(umaResponse.actuatorCommands)) {
        for (const cmd of umaResponse.actuatorCommands) {
          addLog(`Uma [Actuator]: ${cmd.target} ${cmd.id} → ${cmd.action} (${cmd.reason || ''})`, 'success');
          newInterventions.push({ sensor: cmd.target, actuator: `${cmd.target} ${cmd.id}`, detail: cmd.reason || cmd.action, startedAt: Date.now() });

          if (cmd.target === 'valve') {
             if (cmd.action === 'purge') {
               toggleRowValve(cmd.id, false);
               addLog(`Uma [Actuator]: Purging line ${cmd.id}...`, 'warning');
               setTimeout(() => toggleRowValve(cmd.id, true), 3500);
             } else {
               toggleRowValve(cmd.id, cmd.action === 'open');
             }
          } else if (cmd.target === 'zone_humidifier') {
             toggleZoneHumidifier(cmd.id as 'A'|'B', cmd.action === 'on');
          } else if (cmd.target === 'zone_dehumidifier') {
             toggleZoneDehumidifier(cmd.id as 'A'|'B', cmd.action === 'on');
          } else if (cmd.target === 'ph_doser') {
             setReservoir(prev => ({ ...prev, ph: prev.ph + (cmd.action === 'dose_down' ? -0.5 : 0.5) }));
             setSystemActuators(prev => ({ ...prev, ph_doser: true }));
             setTimeout(() => setSystemActuators(p => ({ ...p, ph_doser: false })), 3500);
          } else if (cmd.target === 'nutrient_doser') {
             setReservoir(prev => ({ ...prev, ec: prev.ec + 0.3 }));
             setSystemActuators(prev => ({ ...prev, nutrient_doser: true }));
             setTimeout(() => setSystemActuators(p => ({ ...p, nutrient_doser: false })), 3500);
          } else if (cmd.target === 'ro_valve') {
             setReservoir(prev => ({ ...prev, ec: prev.ec - 0.2, ph: prev.ph - 0.1 }));
          } else if (cmd.target === 'air_pump') {
             setReservoir(prev => ({ ...prev, do2: prev.do2 + 1.2 }));
          } else if (cmd.target === 'circulation_pump') {
             setReservoir(prev => ({ ...prev, flow: prev.flow + 0.8 }));
          } else if (cmd.target === 'chiller') {
             setReservoir(prev => ({ ...prev, temp: prev.temp - 2.5 }));
             setSystemActuators(prev => ({ ...prev, chiller: true }));
             setTimeout(() => setSystemActuators(p => ({ ...p, chiller: false })), 5000);
          } else if (cmd.target === 'led_dimmer') {
             setAmbient(prev => ({ ...prev, light: prev.light + (cmd.action === 'dose_down' ? -50 : 50) }));
          }
        }
      }

      // Process Issued Work Orders
      if (umaResponse.issuedWorkOrders && Array.isArray(umaResponse.issuedWorkOrders)) {
        for (const wo of umaResponse.issuedWorkOrders) {
          issueWorkOrder({
            type: wo.type,
            description: wo.description,
            assignedTo: wo.assignedTo,
            status: 'open',
            // Pass the ID generated by Uma down to issueWorkOrder
            id: wo.workOrderId || `WO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            // Also need towerId for restoration
            towerId: wo.towerId,
          } as any);
        }
      }
      // Process Restored Towers
      if (umaResponse.restoredTowers && Array.isArray(umaResponse.restoredTowers)) {
        setTowerConditions(prev => prev.map(tc => {
          if (umaResponse.restoredTowers.includes(tc.towerId)) {
            addLog(`Uma [Crop Control]: Restoring visual state of ${tc.towerId} to healthy`, 'success');
            return { ...tc, disease: null, injectedAt: null };
          }
          return tc;
        }));
      }

      setActiveInterventions(prev => [...prev, ...newInterventions]);
      setMonitoringRecovery(true);
      addLog('Uma: Monitoring recovery. Will notify when equilibrium is restored.', 'info');

      // Extract narration from chat response
      const content = umaResponse.choices?.[0]?.message?.content || 'Corrective action applied.';
      addLog(`Uma: ${content.slice(0, 200)}`, 'info');
      setUmaState('speaking');

      if (voiceEnabled && audioRef.current) {
        try {
          const url = await generateSpeechUrl(content.slice(0, 400));
          playUmaAudio(url);
        } catch { setTimeout(() => setUmaState('idle'), 3000); }
      } else {
        setTimeout(() => setUmaState('idle'), 3000);
      }
    } catch {
      addLog('Uma: Chat API unavailable. Falling back to baseline correction.', 'warning');
      setUmaState('idle');
    }
  }, [umaActive, voiceEnabled, addLog, toggleRowValve, toggleZoneHumidifier, toggleZoneDehumidifier]);

  /* ═══ UMA ANOMALY BUFFERING ═══ */
  const queueAnomalyForUma = useCallback((sensorKey: string, triggerLabel: string) => {
    if (!umaActive) return;
    
    pendingSpikesRef.current.push({ sensor: sensorKey, label: triggerLabel });
    
    if (monitorTimeoutRef.current) return;
    
    monitorTimeoutRef.current = setTimeout(() => {
      monitorTimeoutRef.current = null;
      
      const newSpikes = [...pendingSpikesRef.current];
      pendingSpikesRef.current = [];
      
      if (newSpikes.length === 0) return;
      
      // If she's speaking or busy, don't interrupt audio but queue analysis
      if (umaStateRef.current !== 'idle') {
         addLog('Uma is processing an ongoing issue. Queuing new anomalies...', 'info');
         // Push them back to be handled later
         pendingSpikesRef.current.push(...newSpikes);
         queueAnomalyForUma('system', 'Re-evaluating queued anomalies');
         return;
      }

      const triggerContext = newSpikes.map(s => s.label).join('; ');
      const snapshot = buildFullSnapshot();
      callUmaMonitor(snapshot, triggerContext);
      
    }, 5000);
  }, [umaActive, buildFullSnapshot, callUmaMonitor, addLog]);

  /* ═══ TEAM & WORK ORDER FUNCTIONS ═══ */

  const addWorker = useCallback(async (worker: TeamWorker) => {
    // Persist to DB
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { addTeamWorker(name: "${worker.name}", role: "${worker.role}", email: "${worker.email}") { id name role email } }` }),
      });
      const { data } = await res.json();
      if (data?.addTeamWorker) {
        setTeamWorkers(prev => [...prev, { id: data.addTeamWorker.id, name: data.addTeamWorker.name, role: data.addTeamWorker.role, email: data.addTeamWorker.email }]);
        addLog(`👤 ${worker.name} (${worker.role}) added to team`, 'success');
        return;
      }
    } catch (e) {
      console.error('Failed to persist worker:', e);
    }
    // Fallback to local state
    setTeamWorkers(prev => [...prev, worker]);
  }, [addLog]);

  const issueWorkOrder = useCallback(async (order: any) => {
    const workOrderId = order.id; // Generated in API route or locally
    // Persist to DB
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { createWorkOrder(workOrderId: "${workOrderId}", type: "${order.type}", description: "${order.description.replace(/"/g, '\\"')}", assignedTo: "${order.assignedTo || ''}", towerId: "${order.towerId || ''}") { id workOrderId type description assignedTo status createdAt } }` }),
      });
      const { data } = await res.json();
      if (data?.createWorkOrder) {
        const wo = data.createWorkOrder;
        setWorkOrders(prev => [{ id: wo.workOrderId, type: wo.type, description: wo.description, assignedTo: wo.assignedTo, status: wo.status as 'open', createdAt: new Date(wo.createdAt).getTime() }, ...prev]);
        addLog(`🎟 Work Order issued: ${order.type}`, 'warning');
        return;
      }
    } catch (e) {
      console.error('Failed to persist work order:', e);
    }
    // Fallback to local state
    const newOrder: WorkOrder = {
      ...order,
      id: workOrderId,
      createdAt: Date.now(),
    };
    setWorkOrders(prev => [newOrder, ...prev]);
    addLog(`🎟 Work Order issued: ${order.type}`, 'warning');
  }, [addLog]);

  const completeWorkOrder = useCallback(async (id: string) => {
    setWorkOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o));
    addLog(`✅ Work Order ${id} completed by field technician. Awaiting Uma review.`, 'success');
    
    // Trigger Uma to review the resolution
    if (umaActiveRef.current) {
      queueAnomalyForUma('resolution', `Work order ${id} has been marked complete by the technician. You will review their completion notes on your next CRON check.`);
    }
  }, [addLog, queueAnomalyForUma]);
  /* ═══ PERTURBATION FUNCTIONS ═══ */

  const initTopology = useCallback((nodes: any[]) => {
    const towers = nodes.filter((n: any) => n.type === 'Tower');
    if (towers.length > 0) {
      setRowZones(towers.map((t, i) => {
        const cropName = t.options?.crop || (TOWER_CROPS[i] ? TOWER_CROPS[i].crop : 'Butterhead Lettuce');
        const cropProfile = TOWER_CROPS.find(c => c.crop === cropName) || TOWER_CROPS[0];
        return {
          towerId: t.id,
          crop: cropProfile.crop,
          emoji: cropProfile.emoji,
          sensors: { phInput: cropProfile.eqPh, ecRunoff: cropProfile.eqEc, rh: cropProfile.eqRh, valveOpen: true },
          optimalPh: cropProfile.optimalPh,
          optimalEc: cropProfile.optimalEc,
          optimalRh: cropProfile.optimalRh,
          humidityZone: i < Math.max(1, Math.ceil(towers.length / 2)) ? 'A' : 'B'
        };
      }));
      setTowerConditions(towers.map(t => ({
        towerId: t.id, disease: null, injectedAt: null
      })));
      setSelectedTower(towers[0].id);
    }
  }, []);
  const perturbReservoir = useCallback(async (key: ReservoirKey, value: number, label: string) => {
    setReservoir(prev => ({ ...prev, [key]: value }));
    addLog(`⚠ ${label}`, 'danger');

    setRowZones(prev => prev.map(row => {
      if (!row.sensors.valveOpen) return row;
      const phPush = key === 'ph' ? (value - RESERVOIR_EQ.ph) * 0.6 : 0;
      const ecPush = key === 'ec' ? (value - RESERVOIR_EQ.ec) * 0.4 : 0;
      const rhPush = key === 'temp' ? (value - RESERVOIR_EQ.temp) * 0.4 : 0;
      return {
        ...row,
        sensors: {
          ...row.sensors,
          phInput: row.sensors.phInput + phPush,
          ecRunoff: row.sensors.ecRunoff + ecPush,
          rh: row.sensors.rh + rhPush,
        },
      };
    }));

    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { logTelemetry(type: "${key}_spike", value: ${value}, message: "${label}") { id } }` }),
      });
    } catch { /* silent */ }

    queueAnomalyForUma('reservoir', `${RESERVOIR_META[key].label} at ${value.toFixed(1)} ${RESERVOIR_META[key].unit}`);
  }, [addLog, queueAnomalyForUma]);

  const perturbAmbient = useCallback(async (key: AmbientKey, value: number, label: string) => {
    setAmbient(prev => ({ ...prev, [key]: value }));
    addLog(`⚠ ${label}`, 'danger');

    if (key === 'humidity') {
      const delta = value - AMBIENT_EQ.humidity;
      setRowZones(prev => prev.map(row => ({
        ...row, sensors: { ...row.sensors, rh: row.sensors.rh + delta * 0.5 },
      })));
    }

    queueAnomalyForUma('ambient', `${AMBIENT_META[key].label} at ${value.toFixed(key === 'light' ? 0 : 1)} ${AMBIENT_META[key].unit}`);
  }, [addLog, queueAnomalyForUma]);

  const perturbRow = useCallback(async (towerId: string, type: 'ph' | 'ec' | 'rh', value: number) => {
    const crop = TOWER_CROPS.find(t => t.id === towerId);
    if (!crop) return;

    setRowZones(prev => prev.map(row => {
      if (row.towerId !== towerId) return row;
      return {
        ...row,
        sensors: {
          ...row.sensors,
          ...(type === 'ph' ? { phInput: value } : type === 'ec' ? { ecRunoff: value } : { rh: value }),
        },
      };
    }));

    const typeLabel = type === 'ph' ? 'pH input' : type === 'ec' ? 'EC runoff' : 'RH';
    const label = `${towerId} ${typeLabel} spiked to ${value.toFixed(type === 'rh' ? 0 : 1)}`;
    addLog(`⚠ ${label}`, 'danger');

    const snapshot = buildFullSnapshot({ [`${towerId}_${type}`]: value });
    await callUmaMonitor(snapshot, `${crop.crop} (${towerId}): ${typeLabel} at ${value.toFixed(type === 'rh' ? 0 : 1)}`);
  }, [addLog, callUmaMonitor, buildFullSnapshot]);
  /* ═══ DISEASE INJECTION ═══ */
  const injectDisease = useCallback(async (towerId: string, disease: Disease) => {
    const crop = TOWER_CROPS.find(t => t.id === towerId);
    if (!crop) return;

    setReservoir(prev => {
      const next = { ...prev };
      disease.sensorEffects.forEach(e => { next[e.sensor] = prev[e.sensor] + e.delta; });
      return next;
    });

    if (disease.rowEffects) {
      setRowZones(prev => prev.map(row => {
        if (row.towerId !== towerId) return row;
        return {
          ...row,
          sensors: {
            ...row.sensors,
            phInput: row.sensors.phInput + disease.rowEffects!.phDelta,
            ecRunoff: row.sensors.ecRunoff + disease.rowEffects!.ecDelta,
            rh: row.sensors.rh + disease.rowEffects!.rhDelta,
          },
        };
      }));
    }

    setTowerConditions(prev => prev.map(tc =>
      tc.towerId === towerId ? { ...tc, disease, injectedAt: Date.now() } : tc
    ));

    addLog(`🦠 ${disease.name} detected on ${crop.crop} (${towerId})`, 'danger');
    addLog(`Symptoms: ${disease.symptoms}`, 'warning');

    if (umaActive) {
      queueAnomalyForUma('disease', `${disease.name} on ${crop.crop} (${towerId}). ${disease.description}. Severity: ${disease.severity}.`);
    }
  }, [umaActive, addLog, queueAnomalyForUma]);

  /* ═══ CONTEXT VALUE ═══ */
  const value: SimulationContextType = {
    reservoir, ambient, rowZones, humidityZones, systemActuators,
    umaActive, umaState, toggleUma, voiceEnabled, setVoiceEnabled,
    umaLanguage, setUmaLanguage,
    logs, bottlenecks, cascadeActive, activeInterventions,
    towerConditions, selectedTower, setSelectedTower, injectDisease, fusedDiseaseImage, setFusedDiseaseImage,
    teamWorkers, workOrders, addWorker, issueWorkOrder, completeWorkOrder,
    perturbReservoir, perturbAmbient, perturbRow,
    toggleRowValve, toggleZoneHumidifier, toggleZoneDehumidifier,
    initTopology,
    buildFullSnapshot,
    tick,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}
