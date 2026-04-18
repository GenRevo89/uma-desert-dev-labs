"use client";

import { ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import { RESERVOIR_META, RESERVOIR_EQ, getReservoirStatus, type ReservoirKey } from '../types';

export default function ReservoirCard() {
  const { reservoir, perturbReservoir, bottlenecks, activeInterventions } = useSimulation();

  const keys: ReservoirKey[] = ['ph', 'ec', 'temp', 'do2', 'flow'];

  const spikeValues: Record<ReservoirKey, number> = {
    ph: 8.5, ec: 3.9, temp: 34, do2: 3.0, flow: 0.5,
  };

  return (
    <div className="reservoir-card glass-panel animate-in animate-in-delay-2">
      <div className="reservoir-card-header">
        <h3>🧪 Reservoir Control</h3>
        <div className="reservoir-badges">
          {bottlenecks.length > 0 && (
            <span className="badge badge-danger">{bottlenecks.length} bottleneck{bottlenecks.length > 1 ? 's' : ''}</span>
          )}
          {activeInterventions.length > 0 && (
            <span className="badge badge-success">{activeInterventions.length} active intervention{activeInterventions.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <div className="reservoir-sensors">
        {keys.map(key => {
          const meta = RESERVOIR_META[key];
          const val = reservoir[key];
          const eq = RESERVOIR_EQ[key];
          const status = getReservoirStatus(key, val);
          const delta = val - eq;
          const pct = ((val - meta.min) / (meta.max - meta.min)) * 100;
          const eqPct = ((eq - meta.min) / (meta.max - meta.min)) * 100;
          const Icon = meta.icon;

          return (
            <div key={key} className={`reservoir-sensor-item ${status}`}>
              <div className="reservoir-sensor-top">
                <div className="sensor-icon" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={14} />
                </div>
                <span className="sensor-name">{meta.label}</span>
                <div className={`sensor-dot ${status}`} />
              </div>
              <div className="reservoir-sensor-reading">
                <span className="sensor-val mono">{val.toFixed(key === 'ph' || key === 'ec' ? 2 : 1)}</span>
                <span className="sensor-unit">{meta.unit}</span>
                <span className={`sensor-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                  {delta > 0 ? <ArrowUp size={10} /> : delta < 0 ? <ArrowDown size={10} /> : null}
                  {Math.abs(delta).toFixed(1)}
                </span>
              </div>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  background: status === 'danger' ? 'var(--rose)' : status === 'warning' ? 'var(--amber)' : meta.color,
                }} />
                <div className="sensor-bar-eq" style={{ left: `${eqPct}%` }} />
              </div>
              <button className="btn btn-secondary btn-sm sensor-spike" onClick={() => {
                perturbReservoir(key, spikeValues[key], `${meta.label} spiked to ${spikeValues[key]} ${meta.unit}`);
              }}>
                <AlertTriangle size={11} /> Spike
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
