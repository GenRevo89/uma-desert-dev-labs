"use client";

import React, { useState, useEffect } from 'react';
import { Server, Wifi, Cpu, Activity, RotateCcw, Droplets, Thermometer, Zap, Waves, Gauge, Wind, Sun, Link as LinkIcon, Radio } from 'lucide-react';
import { RESERVOIR_META, AMBIENT_META, TOWER_CROPS } from '../simulation/types';
import './devices.css';

type PhysicalDevice = {
  id: string;
  type: string;
  mac: string;
  firmware: string;
  protocol: 'MQTT' | 'WebSocket';
  icon: any;
  color: string;
};

function generateDeviceList(): PhysicalDevice[] {
  const devices: PhysicalDevice[] = [];
  
  // 1. Ambient Sensors
  const ambientBrands = { humidity: 'Honeywell DHT-22 Lux-X', light: 'Siemens PAR-400X Optical' };
  Object.entries(AMBIENT_META).forEach(([k, meta], i) => {
    devices.push({
      id: `NODE-AMB-0${i+1}-${k.toUpperCase()}`,
      type: ambientBrands[k as keyof typeof ambientBrands] || meta.label,
      mac: `00:1A:${(Math.random()*255|0).toString(16).toUpperCase().padStart(2, '0')}:B2:44:${(Math.random()*255|0).toString(16).toUpperCase().padStart(2, '0')}`,
      firmware: `v2.4.${Math.floor(Math.random() * 9)}`,
      protocol: 'MQTT',
      icon: meta.icon,
      color: meta.color
    });
  });

  // 2. Reservoir Controller Sensors
  const resBrands = { ph: 'Bluelab pH Controller Pro', ec: 'Atlas Scientific EZO-EC', temp: 'Neptune Systems Apex Probe', do2: 'YSI ProODO Optical O2', flow: 'Krohne OPTIFLUX 1000' };
  Object.entries(RESERVOIR_META).forEach(([k, meta], i) => {
    devices.push({
      id: `CTRL-RES-01-${k.toUpperCase()}`,
      type: resBrands[k as keyof typeof resBrands] || meta.label,
      mac: `00:1B:${(Math.random()*255|0).toString(16).toUpperCase().padStart(2, '0')}:A1:22:${(Math.random()*255|0).toString(16).toUpperCase().padStart(2, '0')}`,
      firmware: `v3.1.${Math.floor(Math.random() * 9)}`,
      protocol: 'WebSocket',
      icon: meta.icon,
      color: meta.color
    });
  });

  // 3. Tower Nodes (T1-T5)
  TOWER_CROPS.forEach(tower => {
    devices.push({
      id: `TWR-${tower.id}-MAINBOARD`,
      type: `Raspberry Pi 4 Telemetry Hat`,
      mac: `A4:C1:${(Math.random()*255|0).toString(16).toUpperCase().padStart(2, '0')}:38:F1:${(Math.random()*255|0).toString(16).toUpperCase().padStart(2, '0')}`,
      firmware: `v1.9.${Math.floor(Math.random() * 9)}`,
      protocol: 'WebSocket',
      icon: Server,
      color: 'var(--emerald)'
    });
  });

  return devices;
}

export default function DevicesPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [devices, setDevices] = useState<PhysicalDevice[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('uma_devices_scanned');
    if (stored === 'true') {
      setHasScanned(true);
      setDevices(generateDeviceList());
    }
  }, []);

  const handleScan = () => {
    setIsScanning(true);
    // Simulate network discovery delay
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
      setDevices(generateDeviceList());
      localStorage.setItem('uma_devices_scanned', 'true');
    }, 2500);
  };

  const handleReset = () => {
    setHasScanned(false);
    setDevices([]);
    localStorage.removeItem('uma_devices_scanned');
  };

  return (
    <div className="dev-page-container">
      {/* ── Page Header ── */}
      <div className="dev-page-header">
        <div>
          <h1 className="dev-title">
            <Server className="text-cyan" size={32} color="var(--cyan)" />
            Network Devices
          </h1>
          <p className="dev-subtitle">Hardware topology layer mapping physical IoT endpoints to the Uma Digital Twin.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {hasScanned && (
            <button className="dev-btn dev-btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} /> Force Re-scan
            </button>
          )}
          {!hasScanned && !isScanning && (
            <button className="dev-btn dev-btn-primary" onClick={handleScan}>
              <Radio size={16} /> Autodetect Sensors
            </button>
          )}
        </div>
      </div>

      {isScanning && (
        <div className="dev-scan-overlay">
          <div className="radar-container">
            <div className="radar-grid" />
            <div className="radar-sweep" />
          </div>
          <div className="dev-scan-text">Scanning Local Topology...</div>
        </div>
      )}

      {/* ── Grid ── */}
      {!hasScanned && !isScanning ? (
        <div className="ops-empty" style={{ marginTop: '20px' }}>
          <Wifi size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3>No Devices Configured</h3>
          <p>
            The physical hardware topology is unmapped. Run an autodetection proxy scan to synchronize the telemetry nodes on the local VLAN.
          </p>
          <button className="dev-btn dev-btn-primary mt-4" onClick={handleScan}>
            Initialize Hardware Scan
          </button>
        </div>
      ) : (
        <div className="dev-grid">
          {devices.map(dev => {
            const Icon = dev.icon;
            return (
              <div key={dev.id} className="dev-card">
                <div className="dev-card-header">
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="dev-icon-wrap" style={{ background: 'rgba(34, 211, 238, 0.1)', color: dev.color }}>
                      <Icon size={24} color={dev.color} />
                    </div>
                    <div>
                      <div className="dev-id">{dev.id}</div>
                      <div className="dev-type">{dev.type}</div>
                    </div>
                  </div>
                  <div className="dev-status">
                    <div className="dot" />
                    ONLINE
                  </div>
                </div>

                <div className="dev-meta-block">
                  <div className="dev-meta-row">
                    <span className="dev-meta-label">MAC Addr</span>
                    <span className="dev-meta-value">{dev.mac}</span>
                  </div>
                  <div className="dev-meta-row">
                    <span className="dev-meta-label">Firmware</span>
                    <span className="dev-meta-value">{dev.firmware}</span>
                  </div>
                  <div className="dev-meta-row">
                    <span className="dev-meta-label">Transport</span>
                    <span className="dev-meta-value">{dev.protocol}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
