"use client";

import { CloudRain, Wind } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import { TOWER_CROPS, getRowRhStatus } from '../types';

interface HumidityZoneCardProps {
  zoneId: 'A' | 'B';
}

export default function HumidityZoneCard({ zoneId }: HumidityZoneCardProps) {
  const { humidityZones, rowZones, toggleZoneHumidifier, toggleZoneDehumidifier } = useSimulation();

  const zone = humidityZones.find(z => z.id === zoneId)!;
  const zoneRows = rowZones.filter(r => r.humidityZone === zoneId);

  // Aggregate zone health
  const worstRhStatus = (() => {
    const statuses = zoneRows.map(row => getRowRhStatus(row.sensors.rh, row.optimalRh));
    if (statuses.includes('danger')) return 'danger' as const;
    if (statuses.includes('warning')) return 'warning' as const;
    return 'nominal' as const;
  })();

  const avgRh = zoneRows.length > 0
    ? zoneRows.reduce((sum, r) => sum + r.sensors.rh, 0) / zoneRows.length
    : 0;

  const healthColor = worstRhStatus === 'danger' ? 'var(--rose)' : worstRhStatus === 'warning' ? 'var(--amber)' : 'var(--accent)';

  return (
    <div className={`hz-card glass-panel ${worstRhStatus}`}>
      <div className="hz-card-stripe" style={{ background: healthColor }} />
      <div className="hz-card-header">
        <CloudRain size={14} style={{ color: 'var(--violet)' }} />
        <div className="hz-card-title">
          <span className="hz-card-name">{zone.label}</span>
          <span className="hz-card-rows">
            {zoneRows.map(r => r.towerId).join(', ')}
          </span>
        </div>
        <div className={`sensor-dot ${worstRhStatus}`} />
      </div>

      {/* Per-row RH readings */}
      <div className="hz-readings">
        {zoneRows.map(row => {
          const crop = TOWER_CROPS.find(t => t.id === row.towerId)!;
          const s = getRowRhStatus(row.sensors.rh, row.optimalRh);
          const c = s === 'danger' ? 'var(--rose)' : s === 'warning' ? 'var(--amber)' : 'var(--violet)';
          return (
            <div key={row.towerId} className="hz-row-reading">
              <span className="hz-row-label">{crop.emoji} {row.towerId}</span>
              <span className="mono hz-row-val" style={{ color: c }}>{row.sensors.rh.toFixed(0)}%</span>
              <span className="hz-row-target">({row.optimalRh[0]}–{row.optimalRh[1]})</span>
            </div>
          );
        })}
      </div>

      {/* Average RH */}
      <div className="hz-avg">
        <span className="hz-avg-label">Zone Avg</span>
        <span className="mono hz-avg-val">{avgRh.toFixed(0)}%</span>
      </div>

      {/* Zone Actuators */}
      <div className="hz-actuators">
        <button
          className={`hz-actuator-btn ${zone.humidifierOn ? 'active humidify' : ''}`}
          onClick={() => toggleZoneHumidifier(zoneId)}
        >
          <CloudRain size={12} />
          Humidifier {zone.humidifierOn ? 'ON' : 'OFF'}
        </button>
        <button
          className={`hz-actuator-btn ${zone.dehumidifierOn ? 'active dehumidify' : ''}`}
          onClick={() => toggleZoneDehumidifier(zoneId)}
        >
          <Wind size={12} />
          Dehumidifier {zone.dehumidifierOn ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
