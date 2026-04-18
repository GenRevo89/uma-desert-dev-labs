"use client";

import { Activity } from 'lucide-react';
import { useSimulation } from '../SimulationContext';

export default function ActivityLog() {
  const { logs, cascadeActive } = useSimulation();

  return (
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
  );
}
