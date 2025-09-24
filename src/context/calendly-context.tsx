"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { CalendlyModal } from '@/components/calendly-modal';

interface CalendlyContextType {
  openCalendlyModal: () => void;
}

const CalendlyContext = createContext<CalendlyContextType | undefined>(undefined);

export function CalendlyProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCalendlyModal = () => setIsOpen(true);

  return (
    <CalendlyContext.Provider value={{ openCalendlyModal }}>
      {children}
      <CalendlyModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </CalendlyContext.Provider>
  );
}

export function useCalendly() {
  const context = useContext(CalendlyContext);
  if (context === undefined) {
    throw new Error('useCalendly must be used within a CalendlyProvider');
  }
  return context;
}