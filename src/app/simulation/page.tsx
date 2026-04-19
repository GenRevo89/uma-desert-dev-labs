"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSimulation } from './SimulationContext';
import UmaToggle from './components/UmaToggle';
import FarmSchematic from './components/FarmSchematic';
import CustomSchematic from './components/CustomSchematic';
import ReservoirCard from './components/ReservoirCard';
import RowControlCard from './components/RowControlCard';
import AmbientStrip from './components/AmbientStrip';
import HumidityZoneCard from './components/HumidityZoneCard';
import DiseasePanel from './components/DiseasePanel';
import ActivityLog from './components/ActivityLog';
import TeamPanel from './components/TeamPanel';
import WorkOrdersPanel from './components/WorkOrdersPanel';
import { Suspense } from 'react';
import './simulation.css';

function SimulationInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project_id');
  
  const [projectBase, setProjectBase] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [pipes, setPipes] = useState<any[]>([]);
  const [loadingProject, setLoadingProject] = useState(!!projectId);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  const { initTopology, rowZones, humidityZones } = useSimulation();

  useEffect(() => {
     if (nodes.length > 0 && projectBase && !projectBase.isDemo) {
        initTopology(nodes);
     }
  }, [nodes, projectBase, initTopology]);

  useEffect(() => {
    // Fetch all projects for the dropdown
    fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `query { getTwinProjects { id name isDemo } }` }),
    }).then(r => r.json()).then(d => d?.data?.getTwinProjects && setAllProjects(d.data.getTwinProjects));

    if (!projectId) return;
    const fetchProj = async () => {
      try {
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `query { getTwinProjectById(id: "${projectId}") { id name componentsJson pipesJson isDemo } }` }),
        });
        const { data } = await res.json();
        const p = data?.getTwinProjectById;
        if (p) {
          if (p.isDemo) {
            setProjectBase(null);
          } else {
            setProjectBase(p);
            try { setNodes(JSON.parse(p.componentsJson || '[]')); } catch {}
            try { setPipes(JSON.parse(p.pipesJson || '[]')); } catch {}
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProject(false);
      }
    };
    fetchProj();
  }, [projectId]);

  return (
      <div className="sim-container">
        {/* ═══ HEADER ═══ */}
        <div className="sim-header animate-in">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div className="flex items-center gap-4">
              <h1 className="page-title m-0">Digital Twin</h1>
              <select 
                className="project-select"
                value={projectId || ''}
                onChange={(e) => {
                  window.location.href = e.target.value ? `/simulation?project_id=${e.target.value}` : '/simulation';
                }}
              >
                <option value="">Demo Twin (Hardcoded)</option>
                {allProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.isDemo ? '(Demo)' : ''}</option>
                ))}
              </select>
            </div>
            <p className="page-subtitle mt-2">
              Real-time hydroponic simulation with per-row control. Spike sensors to create
              perturbations and observe Uma&apos;s elastic correction and cascade failure propagation.
            </p>
          </div>
          <UmaToggle />
        </div>

        {/* ═══ MAIN STAGE: SCHEMATIC + ACTIVITY LOG ═══ */}
        <div className="sim-main-stage">
          {/* ═══ FARM SCHEMATIC ═══ */}
          {loadingProject ? (
             <div className="schematic glass-panel p-8 text-center text-gray-500">Loading custom topology...</div>
          ) : projectBase ? (
             <CustomSchematic projectBase={projectBase} nodes={nodes} pipes={pipes} />
          ) : (
             <FarmSchematic />
          )}

          {/* ═══ SIDEBAR: ACTIVITY LOG ═══ */}
          <div className="sim-sidebar" style={{ position: 'relative' }}>
            <ActivityLog />
          </div>
        </div>

        {/* ═══ AMBIENT ENVIRONMENT ═══ */}
        <AmbientStrip />

        {/* ═══ RESERVOIR CONTROL ═══ */}
        {(!projectBase || nodes.some(n => n.type === 'Reservoir')) && (
          <ReservoirCard />
        )}

        {/* ═══ PER-ROW CONTROL CARDS ═══ */}
        <div className="row-cards-grid">
          {(!projectBase || projectBase.isDemo ? [0, 1, 2, 3, 4] : rowZones.map((_, i) => i)).map(i => (
            <RowControlCard key={i} rowIndex={i} />
          ))}
        </div>

        {/* ═══ HUMIDITY ZONE CONTROL ═══ */}
        {(!projectBase || nodes.some(n => n.type === 'Environment Zone')) && (
          <div className="hz-cards-grid">
            {(!projectBase || projectBase.isDemo ? ['A', 'B'] : humidityZones.map(z => z.id)).map(zoneId => (
              <HumidityZoneCard key={zoneId} zoneId={zoneId as any} />
            ))}
          </div>
        )}

        {/* ═══ CROP HEALTH & DISEASE SIMULATION ═══ */}
        {(!projectBase || nodes.some(n => n.type === 'Tower' || n.type === 'Soil Plot')) && (
          <DiseasePanel />
        )}
      </div>
  );
}

export default function Simulation() {
  return (
    <Suspense fallback={<div className="sim-container"><div className="sim-header p-8">Loading Simulation...</div></div>}>
      <SimulationInner />
    </Suspense>
  );
}
