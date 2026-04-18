"use client";

import { SimulationProvider } from './SimulationContext';
import UmaToggle from './components/UmaToggle';
import FarmSchematic from './components/FarmSchematic';
import ReservoirCard from './components/ReservoirCard';
import RowControlCard from './components/RowControlCard';
import AmbientStrip from './components/AmbientStrip';
import HumidityZoneCard from './components/HumidityZoneCard';
import DiseasePanel from './components/DiseasePanel';
import ActivityLog from './components/ActivityLog';
import TeamPanel from './components/TeamPanel';
import WorkOrdersPanel from './components/WorkOrdersPanel';
import './simulation.css';

export default function Simulation() {
  return (
      <div className="sim-container">
        {/* ═══ HEADER ═══ */}
        <div className="sim-header animate-in">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Digital Twin</h1>
            <p className="page-subtitle">
              Real-time hydroponic simulation with per-row control. Spike sensors to create
              perturbations and observe Uma&apos;s elastic correction and cascade failure propagation.
            </p>
          </div>
          <UmaToggle />
        </div>

        {/* ═══ MAIN STAGE: SCHEMATIC + ACTIVITY LOG ═══ */}
        <div className="sim-main-stage">
          {/* ═══ FARM SCHEMATIC ═══ */}
          <FarmSchematic />

          {/* ═══ SIDEBAR: ACTIVITY LOG ═══ */}
          <div className="sim-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ActivityLog />
          </div>
        </div>

        {/* ═══ AMBIENT ENVIRONMENT ═══ */}
        <AmbientStrip />

        {/* ═══ RESERVOIR CONTROL ═══ */}
        <ReservoirCard />

        {/* ═══ PER-ROW CONTROL CARDS ═══ */}
        <div className="row-cards-grid">
          {[0, 1, 2, 3, 4].map(i => (
            <RowControlCard key={i} rowIndex={i} />
          ))}
        </div>

        {/* ═══ HUMIDITY ZONE CONTROL ═══ */}
        <div className="hz-cards-grid">
          <HumidityZoneCard zoneId="A" />
          <HumidityZoneCard zoneId="B" />
        </div>

        {/* ═══ CROP HEALTH & DISEASE SIMULATION ═══ */}
        <DiseasePanel />
      </div>
  );
}
