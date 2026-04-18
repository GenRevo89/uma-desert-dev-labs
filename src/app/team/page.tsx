"use client";

import React, { useState } from 'react';
import { useSimulation } from '../simulation/SimulationContext';
import { Users, Plus, Mail, UserCircle2, Briefcase, Phone, MapPin } from 'lucide-react';
import { TeamWorker } from '../simulation/types';
import './team.css';

export default function TeamPage() {
  const { teamWorkers, addWorker } = useSimulation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamWorker['role']>('Technician');

  const handleAdd = () => {
    if (!name || !email) return;
    addWorker({
      id: `W-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name,
      email,
      role
    });
    setName('');
    setEmail('');
    setShowForm(false);
  };

  return (
    <div className="team-page-container">
      
      {/* ── Page Header ── */}
      <div className="page-overview">
        <div>
          <h1 className="page-title">
            <Users className="text-violet" size={32} color="var(--violet)" />
            Farm Roster
          </h1>
          <p className="page-subtitle">Manage your hydroponic operations team and assign rapid response teams.</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, var(--violet) 0%, #4b2591 100%)', boxShadow: '0 0 20px var(--violet-subtle)' }}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} /> New Member
        </button>
      </div>

      {/* ── Add Form Panel ── */}
      {showForm && (
        <div className="team-form-container glass-panel animate-in">
          <h3 className="form-header">
            <UserCircle2 size={18} color="var(--violet-bright, #a78bfa)" />
            Add Team Member
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                placeholder="Eleanor Martinez" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="form-input" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                placeholder="tech@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="form-input" 
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Assigned Role</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value as any)} 
                  className="form-input"
                  style={{ appearance: 'none' }}
                >
                  <option value="Technician">Technician</option>
                  <option value="Agronomist">Agronomist</option>
                  <option value="Harvester">Harvester</option>
                  <option value="Manager">Manager</option>
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>
                  <Briefcase size={16} />
                </div>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button 
              className="btn-cancel"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleAdd}
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* ── Team Grid ── */}
      {teamWorkers.length === 0 ? (
        <div className="empty-roster">
          <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3>No Roster Detected</h3>
          <p>
            You haven't assigned any team members yet. Add farm operations staff so Uma can dispatch critical work orders.
          </p>
        </div>
      ) : (
        <div className="roster-grid">
          {teamWorkers.map(w => (
            <div key={w.id} className="roster-card">
              <div className="card-padding">
                <div className="roster-card-header">
                  <div className="roster-avatar">
                    {w.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="roster-name">{w.name}</h3>
                    <div className="roster-role">{w.role}</div>
                  </div>
                </div>
                
                <div className="roster-details">
                  <div className="roster-detail-item">
                    <Mail size={16} />
                    <span>{w.email}</span>
                  </div>
                  <div className="roster-detail-item" style={{ opacity: 0.6 }}>
                    <Phone size={16} />
                    <span>+1 (555) 012-3400</span>
                  </div>
                  <div className="roster-detail-item" style={{ opacity: 0.6 }}>
                    <MapPin size={16} />
                    <span>On Call (Zone B)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
