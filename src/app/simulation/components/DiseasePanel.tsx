"use client";

import { Bug } from 'lucide-react';
import { useSimulation } from '../SimulationContext';
import { TOWER_CROPS, DISEASE_CATALOG } from '../types';

export default function DiseasePanel() {
  const { towerConditions, selectedTower, setSelectedTower, injectDisease } = useSimulation();

  return (
    <div className="disease-panel glass-panel animate-in animate-in-delay-2">
      <div className="disease-header">
        <h3><Bug size={14} /> Crop Health &amp; Disease Simulation</h3>
        <span className="badge badge-info">{towerConditions.filter(t => t.disease).length} active</span>
      </div>
      <div className="disease-body">
        {/* Tower selector */}
        <div className="tower-selector">
          {TOWER_CROPS.map(t => {
            const condition = towerConditions.find(tc => tc.towerId === t.id);
            const hasDisease = !!condition?.disease;
            return (
              <button
                key={t.id}
                className={`tower-chip ${selectedTower === t.id ? 'active' : ''} ${hasDisease ? 'diseased' : ''}`}
                onClick={() => setSelectedTower(t.id)}
              >
                <span className="tower-chip-emoji">{t.emoji}</span>
                <span className="tower-chip-label">{t.id} · {t.crop}</span>
                {hasDisease && <span className="tower-chip-alert">⚠</span>}
              </button>
            );
          })}
        </div>

        {/* Disease grid */}
        <div className="disease-grid">
          {DISEASE_CATALOG.map(disease => {
            const currentCondition = towerConditions.find(t => t.towerId === selectedTower);
            const isActive = currentCondition?.disease?.id === disease.id;
            return (
              <button
                key={disease.id}
                className={`disease-card glass-panel ${isActive ? 'active' : ''} ${disease.severity}`}
                onClick={() => {
                  if (!isActive) injectDisease(selectedTower, disease);
                }}
              >
                <div className="disease-card-head">
                  <span className="disease-name">{disease.name}</span>
                  <span className={`badge badge-${disease.severity === 'critical' ? 'danger' : disease.severity === 'severe' ? 'warning' : 'info'}`}>
                    {disease.severity}
                  </span>
                </div>
                <p className="disease-desc">{disease.description}</p>
                {isActive && <div className="disease-active-tag">Active on {selectedTower}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
