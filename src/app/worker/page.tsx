"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, CheckCircle2, Clock, Send, Leaf, Wrench, TriangleAlert } from 'lucide-react';
import './worker.css';

function WorkerTerminalInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  const [status, setStatus] = useState<'loading' | 'pending' | 'submitting' | 'success' | 'error' | 'invalid'>('loading');
  const [order, setOrder] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('resolved');
  const [timeSpent, setTimeSpent] = useState('');

  // Load work order details from DB
  useEffect(() => {
    if (!orderId) { setStatus('invalid'); return; }

    const fetchOrder = async () => {
      try {
        const res = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query { getWorkOrderById(workOrderId: "${orderId}") { workOrderId type description assignedTo status createdAt } }`
          }),
        });
        const { data } = await res.json();
        const match = data?.getWorkOrderById;
        if (match) {
          setOrder(match);
          setStatus(match.status === 'completed' || match.status === 'verified' || match.status === 'escalated' ? 'success' : 'pending');
        } else {
          setStatus('invalid');
        }
      } catch {
        // Fallback — still show the form even if DB is down
        setStatus('pending');
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleSubmit = async () => {
    if (!orderId) return;
    setStatus('submitting');
    try {
      // Complete in DB via GraphQL
      const timeSpentFinal = timeSpent ? parseInt(timeSpent) : 'null';
      const notesCleaned = notes.replace(/"/g, '\\"');
      
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { completeWorkOrder(workOrderId: "${orderId}", workerNotes: "${notesCleaned}", resolution: "${resolution}", timeSpent: ${timeSpentFinal}) { workOrderId status } }`
        }),
      });

      // Also notify the worker endpoint for real-time sync
      await fetch('/api/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          notes,
          resolution,
          timeSpent: timeSpent ? parseInt(timeSpent) : null,
        }),
      });

      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="worker-page">
        <div className="worker-card">
          <div className="worker-loading">
            <div className="worker-spinner" />
            <span>Loading work order...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="worker-page">
        <div className="worker-card">
          <div className="worker-invalid">
            <TriangleAlert size={48} />
            <h2>Invalid Work Order</h2>
            <p>This link does not point to a valid work order. Please check the email you received and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-page">
      <div className="worker-card">

        {/* Header */}
        <div className="worker-header">
          <div className="worker-logo">
            <Leaf size={20} />
            <span>Uma</span>
          </div>
          <span className="worker-subtitle">Digital Twin Work Order</span>
        </div>

        {/* Order Info */}
        <div className="worker-order-banner">
          <div className="worker-order-icon">
            {status === 'success' ? (
              <CheckCircle2 size={28} />
            ) : (
              <ShieldAlert size={28} />
            )}
          </div>
          <div className="worker-order-meta">
            <h1 className="worker-order-id">{orderId}</h1>
            {order && (
              <div className="worker-order-type">
                <Wrench size={12} /> {order.type}
              </div>
            )}
          </div>
          <div className={`worker-status-badge ${status === 'success' ? 'completed' : 'open'}`}>
            {status === 'success' ? 'Completed' : 'Action Required'}
          </div>
        </div>

        {/* Task Description */}
        {order?.description && (
          <div className="worker-task-block">
            <h3>Task Description</h3>
            <p>{order.description}</p>
          </div>
        )}

        {order?.assignedTo && (
          <div className="worker-assigned">
            Assigned to: <strong>{order.assignedTo}</strong>
            {order.createdAt && (
              <span className="worker-date">
                <Clock size={12} /> {new Date(order.createdAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Completion Form or Success State */}
        {status === 'success' ? (
          <div className="worker-success">
            <CheckCircle2 size={48} />
            <h2>Task Completed</h2>
            <p>The digital twin has been notified and the operations dashboard is updated. You may close this page.</p>
          </div>
        ) : (
          <div className="worker-form">
            <h3>Completion Report</h3>

            <label className="worker-label">
              Resolution Type
              <select
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                className="worker-select"
              >
                <option value="resolved">Resolved — Issue corrected</option>
                <option value="mitigated">Mitigated — Partial fix applied</option>
                <option value="escalated">Escalated — Needs further attention</option>
                <option value="false_alarm">False Alarm — No issue found</option>
              </select>
            </label>

            <label className="worker-label">
              Time Spent (minutes)
              <input
                type="number"
                min={1}
                placeholder="e.g. 30"
                value={timeSpent}
                onChange={e => setTimeSpent(e.target.value)}
                className="worker-input"
              />
            </label>

            <label className="worker-label">
              Notes
              <textarea
                rows={4}
                placeholder="Describe actions taken, materials used, observations…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="worker-textarea"
              />
            </label>

            <button
              onClick={handleSubmit}
              disabled={status === 'submitting'}
              className="worker-submit-btn"
            >
              {status === 'submitting' ? (
                <><div className="worker-spinner-sm" /> Submitting...</>
              ) : (
                <><Send size={16} /> Submit Completion Report</>
              )}
            </button>

            {status === 'error' && (
              <div className="worker-error">
                Failed to sync with the server. Please try again.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="worker-footer">
          <Leaf size={14} />
          <span>Uma Digital Twin • Desert Dev Labs</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkerTerminal() {
  return (
    <Suspense
      fallback={
        <div className="worker-page">
          <div className="worker-card">
            <div className="worker-loading">
              <div className="worker-spinner" />
              <span>Loading...</span>
            </div>
          </div>
        </div>
      }
    >
      <WorkerTerminalInner />
    </Suspense>
  );
}
