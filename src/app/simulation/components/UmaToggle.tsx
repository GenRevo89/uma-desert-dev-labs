"use client";

import { useState, useRef, useEffect } from 'react';
import { Power, Volume2, VolumeX, Globe, ChevronDown } from 'lucide-react';
import { useSimulation } from '../SimulationContext';

export default function UmaToggle() {
  const { umaActive, umaState, toggleUma, voiceEnabled, setVoiceEnabled, umaLanguage, setUmaLanguage } = useSimulation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const LANGUAGES = ['English', 'Español', 'Français', 'Deutsch', '日本語', '中文', 'Hindi', 'Arabic'];

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sim-header-right">
      <div className="uma-lang-dropdown custom" ref={langRef}>
        <div className="uma-custom-select" onClick={() => setLangOpen(!langOpen)}>
          <Globe size={13} className="lang-icon" />
          <span className="current-lang">{umaLanguage}</span>
          <ChevronDown size={12} className={`lang-chevron ${langOpen ? 'open' : ''}`} />
        </div>
        
        {langOpen && (
          <div className="uma-lang-menu">
            {LANGUAGES.map(lang => (
              <div 
                key={lang} 
                className={`uma-lang-option ${lang === umaLanguage ? 'selected' : ''}`}
                onClick={() => { 
                  setUmaLanguage(lang); 
                  setLangOpen(false); 
                }}
              >
                {lang}
              </div>
            ))}
          </div>
        )}
      </div>

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
