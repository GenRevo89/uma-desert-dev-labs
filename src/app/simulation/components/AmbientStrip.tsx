"use client";

import { ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import { AMBIENT_META, AMBIENT_EQ, getAmbientStatus, type AmbientKey } from '../types';

export default function AmbientStrip() {
  const { ambient, perturbAmbient } = useSimulation();

  const keys: AmbientKey[] = ['humidity', 'light'];

  const spikeValues: Record<AmbientKey, number> = {
    humidity: 93,
    light: 700,
  };

  return (
    <div className="ambient-strip glass-panel animate-in animate-in-delay-2">
      <h3 className="ambient-strip-title">🌡️ Ambient Environment</h3>
      <div className="ambient-sensors">
        {keys.map(key => {
          const meta = AMBIENT_META[key];
          const val = ambient[key];
          const eq = AMBIENT_EQ[key];
          const status = getAmbientStatus(key, val);
          const delta = val - eq;
          const Icon = meta.icon;
          const pct = ((val - meta.min) / (meta.max - meta.min)) * 100;
          const eqPct = ((eq - meta.min) / (meta.max - meta.min)) * 100;

          return (
            <div key={key} className={`ambient-sensor-item ${status}`}>
              <div className="ambient-sensor-top">
                <div className="sensor-icon" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={14} />
                </div>
                <div className="ambient-sensor-info">
                  <span className="sensor-name">{meta.label}</span>
                  <div className="ambient-sensor-reading">
                    <span className="sensor-val mono">{val.toFixed(key === 'light' || key === 'humidity' ? 0 : 1)}</span>
                    <span className="sensor-unit">{meta.unit}</span>
                    <span className={`sensor-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                      {delta > 0 ? <ArrowUp size={10} /> : delta < 0 ? <ArrowDown size={10} /> : null}
                      {Math.abs(delta).toFixed(key === 'light' || key === 'humidity' ? 0 : 1)}
                    </span>
                  </div>
                </div>
                <div className={`sensor-dot ${status}`} />
              </div>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  background: status === 'danger' ? 'var(--rose)' : status === 'warning' ? 'var(--amber)' : meta.color,
                }} />
                <div className="sensor-bar-eq" style={{ left: `${eqPct}%` }} />
              </div>
              <button className="btn btn-secondary btn-sm sensor-spike" onClick={() => {
                perturbAmbient(key, spikeValues[key], `${meta.label} spiked to ${spikeValues[key]} ${meta.unit}`);
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
