"use client";

import { ReactNode } from 'react';
import { SimulationProvider } from './simulation/SimulationContext';

// We import simulation.css here so it applies globally for the context
import './simulation/simulation.css';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SimulationProvider>
      {children}
    </SimulationProvider>
  );
}
