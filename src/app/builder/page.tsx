"use client";

import { useState, useCallback } from 'react';
import { 
  Droplet, Thermometer, Wind, Zap, Gauge, Radio,
  Waves, Sun, FlaskConical, Trash2, GripVertical,
  Plus, CheckCircle2, Package
} from 'lucide-react';
import './builder.css';

type SensorDef = {
  id: string;
  type: string;
  icon: any;
  brand: string;
  model: string;
  description: string;
  color: string;
  colorBg: string;
  category: string;
};

type PlacedSensor = SensorDef & { instanceId: string };

const SENSOR_LIBRARY: SensorDef[] = [
  { id: 'ph', type: 'pH Sensor', icon: Droplet, brand: 'Atlas Scientific', model: 'EZO-pH', description: 'Industrial pH probe with ±0.002 accuracy', color: 'var(--accent)', colorBg: 'var(--accent-subtle)', category: 'Water Quality' },
  { id: 'temp', type: 'Temp Probe', icon: Thermometer, brand: 'Pyrosales', model: 'PT-100', description: 'Platinum RTD sensor, -50°C to 250°C', color: 'var(--cyan)', colorBg: 'var(--cyan-subtle)', category: 'Water Quality' },
  { id: 'ec', type: 'EC Sensor', icon: Zap, brand: 'Atlas Scientific', model: 'EZO-EC', description: 'Conductivity probe 0.07–500,000 µS/cm', color: 'var(--amber)', colorBg: 'var(--amber-subtle)', category: 'Water Quality' },
  { id: 'do', type: 'DO Sensor', icon: Waves, brand: 'Atlas Scientific', model: 'EZO-DO', description: 'Dissolved oxygen 0.01–100+ mg/L', color: 'var(--cyan)', colorBg: 'var(--cyan-subtle)', category: 'Water Quality' },
  { id: 'flow', type: 'Flow Meter', icon: Gauge, brand: 'Honeywell', model: 'AWM3300V', description: 'Microbridge mass airflow sensor', color: 'var(--violet)', colorBg: 'var(--violet-subtle)', category: 'Infrastructure' },
  { id: 'humidity', type: 'Humidity Sensor', icon: Wind, brand: 'Sensirion', model: 'SHT-45', description: '±1% RH accuracy, I2C digital output', color: 'var(--violet)', colorBg: 'var(--violet-subtle)', category: 'Environment' },
  { id: 'lux', type: 'PAR Meter', icon: Sun, brand: 'Apogee', model: 'SQ-520', description: 'Full-spectrum quantum sensor', color: 'var(--amber)', colorBg: 'var(--amber-subtle)', category: 'Environment' },
  { id: 'nutrient', type: 'Nutrient Doser', icon: FlaskConical, brand: 'Bluelab', model: 'Peripod M4', description: '4-channel peristaltic dosing pump', color: 'var(--accent)', colorBg: 'var(--accent-subtle)', category: 'Infrastructure' },
];

export default function Builder() {
  const [placed, setPlaced] = useState<PlacedSensor[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addingId, setAddingId] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(SENSOR_LIBRARY.map(s => s.category)))];

  const filteredSensors = selectedCategory === 'All' 
    ? SENSOR_LIBRARY 
    : SENSOR_LIBRARY.filter(s => s.category === selectedCategory);

  const addSensor = useCallback(async (sensor: SensorDef) => {
    const instance: PlacedSensor = { ...sensor, instanceId: `${sensor.id}-${Date.now()}` };
    setPlaced(prev => [...prev, instance]);
    setAddingId(sensor.id);

    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { addSensor(type: "${sensor.type} (${sensor.brand} ${sensor.model})") { id } }`
        })
      });
    } catch (e) {
      console.error('Failed to log sensor', e);
    }

    setTimeout(() => setAddingId(null), 800);
  }, []);

  const removeSensor = useCallback((instanceId: string) => {
    setPlaced(prev => prev.filter(s => s.instanceId !== instanceId));
  }, []);

  return (
    <div className="builder-container">
      {/* ── Header ── */}
      <div className="page-header animate-in">
        <h1 className="page-title">Twin Builder</h1>
        <p className="page-subtitle">
          Configure your real-world sensor array. Select components from the library and add them to your digital twin configuration.
        </p>
      </div>

      <div className="builder-layout">
        {/* ── Component Library ── */}
        <div className="library-panel glass-panel animate-in animate-in-delay-1">
          <div className="library-header">
            <h3><Package size={14} /> Component Library</h3>
            <span className="badge badge-info">{SENSOR_LIBRARY.length} sensors</span>
          </div>

          {/* Category Tabs */}
          <div className="library-tabs">
            {categories.map(cat => (
              <button 
                key={cat}
                className={`library-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sensor List */}
          <div className="library-list">
            {filteredSensors.map((sensor) => {
              const Icon = sensor.icon;
              const isAdding = addingId === sensor.id;
              return (
                <div key={sensor.id} className="library-item">
                  <div className="library-item-icon" style={{ background: sensor.colorBg, color: sensor.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="library-item-info">
                    <div className="library-item-name">{sensor.type}</div>
                    <div className="library-item-brand">{sensor.brand} · {sensor.model}</div>
                  </div>
                  <button 
                    className={`btn btn-icon btn-ghost library-add-btn ${isAdding ? 'added' : ''}`}
                    onClick={() => addSensor(sensor)}
                  >
                    {isAdding ? <CheckCircle2 size={16} color="var(--accent)" /> : <Plus size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Configuration Canvas ── */}
        <div className="canvas-panel animate-in animate-in-delay-2">
          <div className="canvas-header glass-panel">
            <div className="canvas-header-left">
              <h3>Active Configuration</h3>
              <span className="badge badge-success">{placed.length} component{placed.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="canvas-area">
            {placed.length === 0 ? (
              <div className="canvas-empty">
                <div className="canvas-empty-icon">
                  <Radio size={32} />
                </div>
                <p className="canvas-empty-title">No components configured</p>
                <p className="canvas-empty-subtitle">Add sensors from the component library to begin building your digital twin.</p>
              </div>
            ) : (
              <div className="canvas-grid">
                {placed.map((sensor, idx) => {
                  const Icon = sensor.icon;
                  return (
                    <div key={sensor.instanceId} className="placed-card glass-panel" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="placed-card-grip">
                        <GripVertical size={14} />
                      </div>
                      <div className="placed-card-icon" style={{ background: sensor.colorBg, color: sensor.color }}>
                        <Icon size={20} />
                      </div>
                      <div className="placed-card-info">
                        <div className="placed-card-type">{sensor.type}</div>
                        <div className="placed-card-model">{sensor.brand} · {sensor.model}</div>
                        <div className="placed-card-desc">{sensor.description}</div>
                      </div>
                      <div className="placed-card-status">
                        <div className="status-dot" />
                        <span>Connected</span>
                      </div>
                      <button className="btn btn-icon btn-ghost placed-remove" onClick={() => removeSensor(sensor.instanceId)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
