import React from 'react';
import { useSimulation } from '../SimulationContext';
import { ClipboardList, CheckCircle2, Clock } from 'lucide-react';

export default function WorkOrdersPanel() {
  const { workOrders } = useSimulation();

  return (
    <div className="work-orders-panel glass-panel animate-in animate-in-delay-3">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-amber" />
          <h3>Work Orders</h3>
        </div>
        <span className="badge badge-warning">{workOrders.filter(w => w.status==='open').length} Open</span>
      </div>

      <div className="work-orders-list">
        {workOrders.length === 0 ? (
          <div className="empty-state">No active work requests.</div>
        ) : (
          workOrders.map(w => (
            <div key={w.id} className={`work-order-row ${w.status}`}>
              <div className="wo-header">
                <span className="wo-id mono">{w.id}</span>
                <span className={`wo-status ${w.status}`}>
                  {w.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {w.status}
                </span>
              </div>
              <div className="wo-desc">{w.description}</div>
              <div className="wo-meta">
                <span className="wo-assignee">Assigned to: {w.assignedTo || 'Unassigned'}</span>
                <span className="wo-time">{new Date(w.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
