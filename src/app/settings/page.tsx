"use client";

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Clock, Bell, Save, CheckCircle2 } from 'lucide-react';
import './settings.css';

const CRON_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
];

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
];

export default function SettingsPage() {
  const [cronInterval, setCronInterval] = useState(5);
  const [reminderTimeframe, setReminderTimeframe] = useState(30);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('uma_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      setCronInterval(parsed.cronInterval || 5);
      setReminderTimeframe(parsed.reminderTimeframe || 30);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('uma_settings', JSON.stringify({ cronInterval, reminderTimeframe }));
    // Dispatch event so SimulationContext picks it up
    window.dispatchEvent(new CustomEvent('uma-settings-changed', { detail: { cronInterval, reminderTimeframe } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>
          <SettingsIcon size={28} color="var(--accent)" />
          System Settings
        </h1>
        <p>Configure Uma's autonomous work order oversight behavior.</p>
      </div>

      <div className="settings-grid">
        {/* CRON Interval Card */}
        <div className="settings-card">
          <div className="settings-card-icon">
            <Clock size={24} />
          </div>
          <div className="settings-card-content">
            <h3>CRON Check Interval</h3>
            <p>How often Uma checks open work orders for overdue tasks and reviews completed orders.</p>
            <div className="settings-options">
              {CRON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`settings-option ${cronInterval === opt.value ? 'active' : ''}`}
                  onClick={() => setCronInterval(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reminder Timeframe Card */}
        <div className="settings-card">
          <div className="settings-card-icon reminder">
            <Bell size={24} />
          </div>
          <div className="settings-card-content">
            <h3>Reminder Timeframe</h3>
            <p>How long after assignment (or last reminder) before Uma sends a follow-up email to the worker.</p>
            <div className="settings-options">
              {REMINDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`settings-option ${reminderTimeframe === opt.value ? 'active' : ''}`}
                  onClick={() => setReminderTimeframe(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-save-row">
        <button className={`settings-save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
          {saved ? (
            <><CheckCircle2 size={16} /> Saved</>
          ) : (
            <><Save size={16} /> Save Settings</>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="settings-info">
        <strong>How it works:</strong> When Uma is active, she runs a background check at the configured interval. 
        Open work orders that haven't received a response within the reminder timeframe trigger an automated 
        follow-up email. Completed work orders are reviewed by Uma for quality — she'll either restore the 
        crop to healthy status or escalate to a manager if the resolution is insufficient.
      </div>
    </div>
  );
}
