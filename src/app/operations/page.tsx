"use client";

import React, { useState, useEffect } from 'react';
import { useSimulation } from '../simulation/SimulationContext';
import { ClipboardList, ShieldAlert, CheckCircle2, Clock, MapPin, Tag, Users, Activity } from 'lucide-react';
import './operations.css';

export default function OperationsPage() {
  const { workOrders } = useSimulation();
  
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  useEffect(() => {
    setIsMounted(true);
    
    const tick = () => {
      const s = new Date().getSeconds();
      const remaining = s === 0 ? 0 : 60 - s;
      setCountdown(remaining);
      
      // Top-of-minute: Fire local backend CRON to simulate Vercel (* * * * *) trigger
      if (s === 0) {
        fetch('/api/cron', { method: 'POST', body: JSON.stringify({}) }).catch(() => null);
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="ops-page-container">
      
      {/* ── Page Header ── */}
      <div className="ops-page-header">
        <div>
          <h1 className="ops-title">
            <ClipboardList className="text-emerald" size={32} color="var(--emerald)" />
            Operations & Work Orders
          </h1>
          <p className="ops-subtitle">Track biological anomalies, structural failures, and Uma's dispatched task requests.</p>
        </div>
        <div className="ops-tabs">
          <div className="ops-tab" style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.2)' }}>
            <Activity className="inline mr-2" size={14} />
            Next System Check: {isMounted ? `00:${countdown.toString().padStart(2, '0')}` : '--:--'}
          </div>
          <div className="ops-tab active">All</div>
          <div className="ops-tab">
            Pending 
            {workOrders.filter(o => o.status === 'open').length > 0 && (
              <span className="ops-badge">{workOrders.filter(o => o.status === 'open').length}</span>
            )}
          </div>
          <div className="ops-tab">Open</div>
          <div className="ops-tab">Completed</div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="ops-stats-grid">
        <div className="ops-stat-card">
          <div className="ops-stat-icon indigo">
            <ClipboardList size={24} />
          </div>
          <div>
            <div className="ops-stat-label">Total Work Orders</div>
            <div className="ops-stat-value">{workOrders.length}</div>
          </div>
        </div>
        <div className="ops-stat-card">
          <div className="ops-stat-icon amber">
            <Clock size={24} />
          </div>
          <div>
            <div className="ops-stat-label">Pending Actions</div>
            <div className="ops-stat-value">{workOrders.filter(o => o.status === 'open').length}</div>
          </div>
        </div>
        <div className="ops-stat-card">
          <div className="ops-stat-icon emerald">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="ops-stat-label">Completed</div>
            <div className="ops-stat-value">{workOrders.filter(o => o.status === 'completed').length}</div>
          </div>
        </div>
        <div className="ops-stat-card">
          <div className="ops-stat-icon verified">
            <Activity size={24} />
          </div>
          <div>
            <div className="ops-stat-label">Verified by Uma</div>
            <div className="ops-stat-value">{workOrders.filter(o => o.status === 'verified').length}</div>
          </div>
        </div>
        <div className="ops-stat-card">
          <div className="ops-stat-icon rose">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="ops-stat-label">Escalated by Uma</div>
            <div className="ops-stat-value">{workOrders.filter(o => o.status === 'escalated').length}</div>
          </div>
        </div>
      </div>

      {/* ── Work Order Grid ── */}
      {workOrders.length === 0 ? (
        <div className="ops-empty">
          <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3>No Operations Logged</h3>
          <p>
            Uma has not dispatched any physical intervention tasks yet. Work orders will appear here when an actionable anomaly occurs.
          </p>
        </div>
      ) : (
        <div className="ops-grid">
          {workOrders.sort((a, b) => b.createdAt - a.createdAt).map(o => (
            <div key={o.id} className={`wo-card ${o.status}`}>
              
              {/* Status Badge */}
              <div className={`wo-status-ribbon ${o.status}`}>
                {o.status}
              </div>

              <div className="wo-card-content">
                <div className={`wo-icon ${o.status}`}>
                  {o.status === 'completed' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div className="wo-card-main">
                  <div className="wo-id-row">
                    <h3 className="wo-id">{o.id}</h3>
                    <span className="wo-date">{new Date(o.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="wo-type">
                    <Tag size={14} /> {o.type}
                  </div>

                  <p className="wo-desc">
                    {o.description}
                  </p>

                  <div className="wo-meta-grid">
                    <div className="wo-meta-item">
                      <Users size={14} />
                      <span>Assigned to: <strong>{o.assignedTo}</strong></span>
                    </div>
                    <div className="wo-meta-item">
                      <MapPin size={14} />
                      <span>Zone: Farm Floor</span>
                    </div>
                  </div>

                  {o.status === 'open' && (
                   <div className="wo-alert-box mt-5">
                      Dispatch email sent via AWS SES. Awaiting field technician completion ping from mobile terminal.
                   </div>
                  )}
                  {o.reviewed && (
                    <div className="wo-review-box-container mt-5" style={{ background: o.status === 'verified' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', padding: '16px', border: o.status === 'verified' ? '1px solid rgba(34,197,94,0.1)' : '1px solid rgba(244,63,94,0.1)' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: o.status === 'verified' ? '#22c55e' : '#f43f5e', boxShadow: o.status === 'verified' ? '0 0 10px #22c55e' : '0 0 10px #f43f5e' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: o.status === 'verified' ? '#22c55e' : '#f43f5e', textTransform: 'uppercase' }}>
                          Uma AI Diagnostic: {o.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: 0 }}>
                        {o.reviewResult || 'Verification complete.'}
                      </p>
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Field Worker Notes: </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>{o.workerNotes || o.resolution || 'No notes documented.'}</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
