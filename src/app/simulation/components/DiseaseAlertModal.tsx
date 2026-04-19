"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSimulation } from '../SimulationContext';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { TOWER_CROPS } from '../types';

/**
 * Resolves a crop name to its filesystem-safe key for image lookup.
 */
function getCropKey(cropName: string): string {
  const lower = cropName.toLowerCase();
  if (lower.includes('lettuce')) return 'lettuce';
  if (lower.includes('basil')) return 'basil';
  if (lower.includes('tomato')) return 'tomato';
  if (lower.includes('kale')) return 'kale';
  return 'strawberry';
}

/**
 * Generates a fused side-by-side image from healthy + diseased PNGs.
 * Returns a base64 data URL.
 */
function fuseImages(healthyUrl: string, diseasedUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject('No canvas context');

    const imgH = new Image();
    const imgD = new Image();
    let loaded = 0;

    const onLoad = () => {
      loaded++;
      if (loaded < 2) return;
      // Scale down for LLM input — 256px per image side
      const targetW = 256;
      const targetH = 256;
      canvas.width = targetW * 2;
      canvas.height = targetH;
      ctx.drawImage(imgH, 0, 0, targetW, targetH);
      ctx.drawImage(imgD, targetW, 0, targetW, targetH);
      // Add labels
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, 70, 18);
      ctx.fillRect(targetW, 0, 70, 18);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('HEALTHY', 6, 13);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('DISEASED', targetW + 6, 13);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };

    imgH.crossOrigin = 'anonymous';
    imgD.crossOrigin = 'anonymous';
    imgH.onload = onLoad;
    imgD.onload = onLoad;
    imgH.onerror = () => reject('Failed to load healthy image');
    imgD.onerror = () => reject('Failed to load diseased image');
    imgH.src = healthyUrl;
    imgD.src = diseasedUrl;
  });
}

export default function DiseaseAlertModal() {
  const { towerConditions, setFusedDiseaseImage } = useSimulation();

  const activeSickRow = towerConditions.find(t => t.disease !== null);

  const [showModal, setShowModal] = useState(false);
  const [lastDisease, setLastDisease] = useState<{
    cropKey: string;
    cropName: string;
    diseaseName: string;
    diseaseId: string;
    towerId: string;
  } | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(() => {
    setShowModal(false);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (activeSickRow && activeSickRow.disease) {
      const crop = TOWER_CROPS.find(c => c.id === activeSickRow.towerId);
      if (crop) {
        const cropKey = getCropKey(crop.crop);
        const info = {
          cropKey,
          cropName: crop.crop,
          diseaseName: activeSickRow.disease.name,
          diseaseId: activeSickRow.disease.id,
          towerId: activeSickRow.towerId,
        };
        setLastDisease(info);
        setShowModal(true);

        // Generate fused image and pass to context
        const healthyUrl = `/assets/diseases/${cropKey}_healthy.png`;
        const diseasedUrl = `/assets/diseases/${cropKey}_${activeSickRow.disease.id}.png`;
        fuseImages(healthyUrl, diseasedUrl)
          .then(dataUrl => setFusedDiseaseImage(dataUrl))
          .catch(() => setFusedDiseaseImage(null));

        // Auto-dismiss after 6 seconds
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => setShowModal(false), 6000);
      }
    } else if (showModal && lastDisease) {
      // Disease was resolved — show healthy briefly then dismiss
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setShowModal(false);
        setFusedDiseaseImage(null);
      }, 3000);
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSickRow?.towerId, activeSickRow?.disease?.id]);

  if (!showModal || !lastDisease) return null;

  const isHealthyNow = !activeSickRow;
  const healthyUrl = `/assets/diseases/${lastDisease.cropKey}_healthy.png`;
  const diseasedUrl = `/assets/diseases/${lastDisease.cropKey}_${lastDisease.diseaseId}.png`;

  return (
    <div className="disease-modal-overlay" onClick={dismiss}>
      <div className={`disease-modal ${isHealthyNow ? 'healthy' : 'sick'}`} onClick={e => e.stopPropagation()}>
        <div className="disease-modal-header">
          {isHealthyNow ? (
            <><CheckCircle2 className="text-success" /> Condition Resolved — {lastDisease.cropName}</>
          ) : (
            <><ShieldAlert className="text-danger" /> {lastDisease.diseaseName} — {lastDisease.cropName} ({lastDisease.towerId})</>
          )}
        </div>
        <div className="disease-modal-body">
          <div className="disease-comparison">
            <div className="disease-comparison-panel">
              <div className="disease-comparison-label healthy">✓ Healthy</div>
              <img
                src={healthyUrl}
                alt={`Healthy ${lastDisease.cropName}`}
                className="disease-image"
              />
            </div>
            <div className="disease-comparison-panel">
              <div className={`disease-comparison-label ${isHealthyNow ? 'healthy' : 'diseased'}`}>
                {isHealthyNow ? '✓ Recovered' : `⚠ ${lastDisease.diseaseName}`}
              </div>
              <img
                src={isHealthyNow ? healthyUrl : diseasedUrl}
                alt={isHealthyNow ? 'Recovered' : lastDisease.diseaseName}
                className="disease-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = healthyUrl;
                }}
              />
            </div>
          </div>
          <div className="disease-modal-dismiss">Click or wait to dismiss</div>
        </div>
      </div>
    </div>
  );
}
