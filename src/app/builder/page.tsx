"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Box, Play, AlertCircle } from 'lucide-react';
import './builder.css';

type TwinProject = {
  id: string;
  name: string;
  thumbnailSvg: string | null;
  isDemo: boolean;
  updatedAt: string;
};

export default function BuilderDashboard() {
  const [projects, setProjects] = useState<TwinProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { getTwinProjects { id name thumbnailSvg isDemo updatedAt } }` }),
      });
      const { data } = await res.json();
      if (data?.getTwinProjects) {
        setProjects(data.getTwinProjects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { createTwinProject(name: "${newProjectName}") { id } }` }),
      });
      const { data } = await res.json();
      if (data?.createTwinProject?.id) {
        window.location.href = `/builder/${data.createTwinProject.id}`;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { deleteTwinProject(id: "${id}") }` }),
      });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  /* The actual hardcoded mapping used in the simulator right now, to seed the DB */
  const seedDemoTwin = async () => {
    try {
      const components = [
        { id: "res1", type: "Reservoir", x: 400, y: 50 },
        { id: "T1", type: "Tower", crop: "Butterhead Lettuce", x: 100, y: 400 },
        { id: "T2", type: "Tower", crop: "Basil", x: 250, y: 400 },
        { id: "T3", type: "Tower", crop: "Arugula", x: 400, y: 400 },
        { id: "T4", type: "Tower", crop: "Kale", x: 550, y: 400 },
        { id: "T5", type: "Tower", crop: "Mint", x: 700, y: 400 },
        { id: "ambient", type: "Environment Zone", x: 850, y: 50 },
      ];
      const pipes = [
        { id: "p1", sourceId: "res1", targetId: "T1" },
        { id: "p2", sourceId: "res1", targetId: "T2" },
        { id: "p3", sourceId: "res1", targetId: "T3" },
        { id: "p4", sourceId: "res1", targetId: "T4" },
        { id: "p5", sourceId: "res1", targetId: "T5" },
      ];
      
      // Auto-generate a minimalist SVG string to act as the thumbnail
      const thumb = `<svg viewBox="0 0 1000 600" width="100%" height="100%"><circle cx="400" cy="50" r="20" fill="var(--cyan)"/><circle cx="100" cy="400" r="15" fill="var(--accent)"/><circle cx="250" cy="400" r="15" fill="var(--accent)"/><circle cx="400" cy="400" r="15" fill="var(--accent)"/><circle cx="550" cy="400" r="15" fill="var(--accent)"/><circle cx="700" cy="400" r="15" fill="var(--accent)"/></svg>`;

      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { createTwinProject(name: "Demo Twin", isDemo: true) { id } }` }),
      });
      const { data } = await res.json();
      if (data?.createTwinProject?.id) {
        await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: `mutation SaveTwinProject($id: ID!, $name: String!, $thumb: String, $comps: String, $pipes: String) {
              saveTwinProject(id: $id, name: $name, thumbnailSvg: $thumb, componentsJson: $comps, pipesJson: $pipes) { id }
            }`,
            variables: {
              id: data.createTwinProject.id,
              name: "Demo Twin",
              thumb: thumb,
              comps: JSON.stringify(components),
              pipes: JSON.stringify(pipes)
            }
          }),
        });
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="builder-loading">Loading Projects...</div>;

  return (
    <div className="builder-dashboard">
      <div className="dashboard-header animate-in">
        <div className="header-text">
          <h1 className="page-title"><Box size={28} className="title-icon" /> Twin Builder Projects</h1>
          <p className="page-subtitle">Design, layout, and test physical logic arrays before pushing to the digital twin simulator.</p>
        </div>
        <div className="header-actions">
          {projects.length === 0 && (
            <button className="btn btn-outline" onClick={seedDemoTwin}>
              Generate Demo Twin
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      <div className="projects-grid animate-in animate-in-delay-1">
        {projects.length === 0 ? (
          <div className="empty-state glass-panel">
            <AlertCircle size={32} />
            <h3>No Projects Found</h3>
            <p>Create a new digital twin to arrange your sensors and towers.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="project-card glass-panel">
              <div className="project-thumb">
                {project.thumbnailSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: project.thumbnailSvg }} />
                ) : (
                  <div className="thumb-placeholder"><Box size={48} /></div>
                )}
              </div>
              <div className="project-info">
                <h3>
                  {project.name} 
                  {project.isDemo && <span className="badge badge-info">Demo</span>}
                </h3>
                <p>Last edited: {project.updatedAt ? new Date(parseInt(project.updatedAt)).toLocaleDateString() : 'Never'}</p>
              </div>
              <div className="project-actions">
                <Link href={`/builder/${project.id}`} className="btn btn-primary flex-1 text-center">
                  Edit Layout
                </Link>
                <Link href={`/simulation?project_id=${project.id}`} className="btn btn-success flex-1 text-center">
                  <Play size={14} /> Simulate
                </Link>
                {!project.isDemo && (
                  <button className="btn btn-icon btn-danger" onClick={(e) => handleDelete(project.id, e)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="custom-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="custom-modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create Digital Twin</h2>
            <p className="modal-subtitle">Enter a name for your new simulation project.</p>
            <input 
              type="text" 
              className="custom-modal-input"
              placeholder="e.g. Sector 7 Aquaponics"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newProjectName.trim()}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
