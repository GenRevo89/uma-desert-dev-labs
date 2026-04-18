import React, { useState } from 'react';
import { useSimulation } from '../SimulationContext';
import { Users, Plus, Mail } from 'lucide-react';
import { TeamWorker } from '../types';

export default function TeamPanel() {
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
    <div className="team-panel glass-panel animate-in animate-in-delay-3">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-violet" />
          <h3>Farm Operations Team</h3>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add
        </button>
      </div>

      {showForm && (
        <div className="team-form">
          <input 
            type="text" 
            placeholder="Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="panel-input" 
          />
          <input 
            type="email" 
            placeholder="Email (required for SES)" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="panel-input" 
          />
          <select value={role} onChange={e => setRole(e.target.value as any)} className="panel-select">
            <option value="Technician">Technician</option>
            <option value="Agronomist">Agronomist</option>
            <option value="Harvester">Harvester</option>
            <option value="Manager">Manager</option>
          </select>
          <button className="btn btn-primary btn-sm mt-2 w-full" onClick={handleAdd}>Confirm Added</button>
        </div>
      )}

      <div className="team-list">
        {teamWorkers.length === 0 ? (
          <div className="empty-state">No workers added.</div>
        ) : (
          teamWorkers.map(w => (
            <div key={w.id} className="team-member">
              <div className="member-avatar">{w.name.charAt(0)}</div>
              <div className="member-info">
                <span className="member-name">{w.name} ({w.role})</span>
                <span className="member-email"><Mail size={10} /> {w.email}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
