"use client";

import { AlertTriangle, Droplets, Zap, CloudRain } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import { TOWER_CROPS, getRowPhStatus, getRowEcStatus, getRowRhStatus, getRowHealth } from '../types';

interface RowControlCardProps {
  rowIndex: number;
}

export default function RowControlCard({ rowIndex }: RowControlCardProps) {
  const { rowZones, perturbRow, toggleRowValve, humidityZones } = useSimulation();

  const row = rowZones[rowIndex];
  const crop = TOWER_CROPS[rowIndex];
  const zone = humidityZones.find(z => z.id === row.humidityZone);
  const health = getRowHealth(row);
  const phStatus = getRowPhStatus(row.sensors.phInput, row.optimalPh);
  const ecStatus = getRowEcStatus(row.sensors.ecRunoff, row.optimalEc);
  const rhStatus = getRowRhStatus(row.sensors.rh, row.optimalRh);

  const healthColor = health === 'danger' ? 'var(--rose)' : health === 'warning' ? 'var(--amber)' : 'var(--accent)';

  const phSpike = crop.optimalPh[1] + 2.0;
  const ecSpike = crop.optimalEc[1] + 1.5;
  const rhSpike = 92;

  return (
    <div className={`row-card glass-panel ${health}`}>
      <div className="row-card-health-stripe" style={{ background: healthColor }} />

      {/* Header */}
      <div className="row-card-header">
        <span className="row-card-emoji">{crop.emoji}</span>
        <div className="row-card-title">
          <span className="row-card-id">{crop.id} · Zone {row.humidityZone}</span>
          <span className="row-card-crop">{crop.crop}</span>
        </div>
      </div>

      {/* pH Input */}
      <div className={`row-sensor-block ${phStatus}`}>
        <div className="row-sensor-label">
          <Droplets size={11} />
          <span>pH Input</span>
          <div className={`sensor-dot ${phStatus}`} />
        </div>
        <div className="row-sensor-reading">
          <span className="mono row-sensor-val">{row.sensors.phInput.toFixed(2)}</span>
          <span className="row-sensor-range">({crop.optimalPh[0]}–{crop.optimalPh[1]})</span>
        </div>
        <div className="sensor-bar-track">
          <div className="sensor-bar-fill" style={{
            width: `${Math.min(100, Math.max(0, ((row.sensors.phInput - 4) / 6) * 100))}%`,
            background: phStatus === 'danger' ? 'var(--rose)' : phStatus === 'warning' ? 'var(--amber)' : 'var(--accent)',
          }} />
          <div className="sensor-bar-eq" style={{ left: `${((crop.eqPh - 4) / 6) * 100}%` }} />
        </div>
        <button className="btn btn-secondary btn-sm sensor-spike" onClick={() => perturbRow(row.towerId, 'ph', phSpike)}>
          <AlertTriangle size={10} /> Spike pH
        </button>
      </div>

      {/* EC Runoff */}
      <div className={`row-sensor-block ${ecStatus}`}>
        <div className="row-sensor-label">
          <Zap size={11} />
          <span>EC Runoff</span>
          <div className={`sensor-dot ${ecStatus}`} />
        </div>
        <div className="row-sensor-reading">
          <span className="mono row-sensor-val">{row.sensors.ecRunoff.toFixed(2)}</span>
          <span className="row-sensor-range">({crop.optimalEc[0]}–{crop.optimalEc[1]})</span>
        </div>
        <div className="sensor-bar-track">
          <div className="sensor-bar-fill" style={{
            width: `${Math.min(100, Math.max(0, ((row.sensors.ecRunoff) / 5) * 100))}%`,
            background: ecStatus === 'danger' ? 'var(--rose)' : ecStatus === 'warning' ? 'var(--amber)' : 'var(--amber)',
          }} />
          <div className="sensor-bar-eq" style={{ left: `${(crop.eqEc / 5) * 100}%` }} />
        </div>
        <button className="btn btn-secondary btn-sm sensor-spike" onClick={() => perturbRow(row.towerId, 'ec', ecSpike)}>
          <AlertTriangle size={10} /> Spike EC
        </button>
      </div>

      {/* Canopy RH */}
      <div className={`row-sensor-block ${rhStatus}`}>
        <div className="row-sensor-label">
          <CloudRain size={11} />
          <span>Canopy RH</span>
          <div className={`sensor-dot ${rhStatus}`} />
        </div>
        <div className="row-sensor-reading">
          <span className="mono row-sensor-val">{row.sensors.rh.toFixed(0)}</span>
          <span className="sensor-unit">%</span>
          <span className="row-sensor-range">({row.optimalRh[0]}–{row.optimalRh[1]})</span>
        </div>
        <div className="sensor-bar-track">
          <div className="sensor-bar-fill" style={{
            width: `${Math.min(100, Math.max(0, row.sensors.rh))}%`,
            background: rhStatus === 'danger' ? 'var(--rose)' : rhStatus === 'warning' ? 'var(--amber)' : 'var(--violet)',
          }} />
          <div className="sensor-bar-eq" style={{ left: `${crop.eqRh}%` }} />
        </div>
        <button className="btn btn-secondary btn-sm sensor-spike" onClick={() => perturbRow(row.towerId, 'rh', rhSpike)}>
          <AlertTriangle size={10} /> Spike RH
        </button>
      </div>

      {/* Actuators: valve + zone humidity status */}
      <div className="row-actuators">
        <div className="row-actuator-row">
          <span className="row-valve-label">Feed Valve</span>
          <button
            className={`row-valve-btn ${row.sensors.valveOpen ? 'open' : 'closed'}`}
            onClick={() => toggleRowValve(row.towerId)}
          >
            <span className="row-valve-dot" />
            {row.sensors.valveOpen ? 'Open' : 'Closed'}
          </button>
        </div>
        {zone && (
          <div className="row-zone-status">
            <span className={`zone-actuator-pip ${zone.humidifierOn ? 'active' : ''}`} />
            <span className="row-valve-label">Humid.</span>
            <span className={`zone-actuator-pip ${zone.dehumidifierOn ? 'active dehumid' : ''}`} />
            <span className="row-valve-label">Dehumid.</span>
          </div>
        )}
      </div>
    </div>
  );
}
