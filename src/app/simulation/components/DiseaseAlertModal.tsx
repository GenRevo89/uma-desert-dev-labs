import React, { useEffect, useState } from 'react';
import { useSimulation } from '../SimulationContext';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { TOWER_CROPS } from '../types';

export default function DiseaseAlertModal() {
  const { towerConditions, workOrders } = useSimulation();

  // Find the first actively diseased tower
  const activeSickRow = towerConditions.find(t => t.disease !== null);
  
  const [showModal, setShowModal] = useState(false);
  const [lastDisease, setLastDisease] = useState<{crop: string, disease: string, diseaseId: string} | null>(null);

  useEffect(() => {
    if (activeSickRow) {
      const crop = TOWER_CROPS.find(c => c.id === activeSickRow.towerId);
      if (crop && activeSickRow.disease) {
        setLastDisease({ 
          crop: crop.crop.toLowerCase().includes('lettuce') ? 'lettuce' : 
                crop.crop.toLowerCase().includes('basil') ? 'basil' : 
                crop.crop.toLowerCase().includes('tomato') ? 'tomato' : 
                crop.crop.toLowerCase().includes('kale') ? 'kale' : 'strawberry',
          disease: activeSickRow.disease.name,
          diseaseId: activeSickRow.disease.id
        });
        setShowModal(true);
      }
    } else {
      // It was fixed! We keep showing the modal for a few seconds to show the healthy transition.
      if (showModal) {
        setTimeout(() => setShowModal(false), 4000);
      }
    }
  }, [activeSickRow, showModal]);

  if (!showModal || !lastDisease) return null;

  const isHealthyNow = !activeSickRow;

  // Determine image filename safely based on crop type and disease ID
  // If healthy, it's just `${crop}_healthy.png`. 
  // If sick, it's `${crop}_${diseaseId}.png` but if we didn't generate that specific combo (we only did a few), fallback.
  // We explicitly generated: basil_powdery_mildew, lettuce_pythium, tomato_botrytis, kale_tipburn, strawberry_aphids.
  // And we generated _healthy for each.
  const imageUrl = isHealthyNow 
    ? `/assets/diseases/${lastDisease.crop}_healthy.png`
    : `/assets/diseases/${lastDisease.crop}_${lastDisease.diseaseId}.png`;

  return (
    <div className="disease-modal-overlay">
      <div className={`disease-modal ${isHealthyNow ? 'healthy' : 'sick'}`}>
        <div className="disease-modal-header">
          {isHealthyNow ? (
            <><CheckCircle2 className="text-success" /> Condition Resolved</>
          ) : (
            <><ShieldAlert className="text-danger" /> Critical Outbreak: {lastDisease.disease}</>
          )}
        </div>
        <div className="disease-modal-body">
          <img 
            src={imageUrl} 
            alt={isHealthyNow ? 'Healthy Plant' : 'Diseased Plant'} 
            className="disease-image"
            onError={(e) => {
              // Fallback to healthy if disease image is missing
              (e.target as HTMLImageElement).src = `/assets/diseases/${lastDisease.crop}_healthy.png`;
            }}
          />
        </div>
      </div>
    </div>
  );
}
