"use client";

import React, { useState } from 'react';
import { useSimulation } from '../simulation/SimulationContext';
import { ClipboardList, ShieldAlert, CheckCircle2, Clock, MapPin, Tag, Users } from 'lucide-react';
import './operations.css';

export default function OperationsPage() {
  const { workOrders } = useSimulation();

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
          <div className="ops-tab active">All</div>
          <div className="ops-tab">
            Pending 
            {workOrders.filter(o => o.status === 'pending').length > 0 && (
              <span className="ops-badge">{workOrders.filter(o => o.status === 'pending').length}</span>
            )}
          </div>
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
            <div className="ops-stat-value">{workOrders.filter(o => o.status === 'pending').length}</div>
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
                    {o.instructions}
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
                </div>
              </div>

              {o.status === 'pending' && (
               <div className="wo-alert-box">
                  Dispatch email sent via AWS SES. Awaiting field technician completion ping from mobile terminal.
               </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
