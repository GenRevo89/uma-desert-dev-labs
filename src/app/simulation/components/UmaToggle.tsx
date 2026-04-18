"use client";

import { Power, Volume2, VolumeX } from 'lucide-react';
import { useSimulation } from '../SimulationContext';

export default function UmaToggle() {
  const { umaActive, umaState, toggleUma, voiceEnabled, setVoiceEnabled } = useSimulation();

  return (
    <div className="sim-header-right">
      <button
        className={`btn btn-ghost btn-icon ${voiceEnabled ? 'voice-active' : ''}`}
        onClick={() => setVoiceEnabled(!voiceEnabled)}
        title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
      >
        {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      <div className={`uma-toggle-wrap ${umaActive ? 'active' : ''}`} onClick={toggleUma}>
        <div className="uma-toggle-track">
          <div className="uma-toggle-glow" />
          <div className="uma-toggle-thumb">
            <Power size={14} />
          </div>
        </div>
        <div className="uma-toggle-label">
          <span className="uma-toggle-name">Uma</span>
          <span className={`uma-toggle-status ${umaActive ? 'on' : 'off'}`}>
            {umaActive ? (umaState === 'idle' ? 'Active' : umaState.charAt(0).toUpperCase() + umaState.slice(1)) : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}
