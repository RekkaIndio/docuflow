"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { useCookieConsent } from '@/context/cookie-consent';
import { track } from '@vercel/analytics';
import { CalendlyModal } from '@/components/calendly-modal';

interface CalendlyContextType {
  openCalendlyModal: () => void;
}

const CalendlyContext = createContext<CalendlyContextType | undefined>(undefined);

export function CalendlyProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { analytics } = useCookieConsent();

  const openCalendlyModal = () => setIsOpen(true);

  function openCalendlyModalWithTracking(consentGiven: boolean | null) {
    if (consentGiven) {
      try {
        track('book_demo', { category: 'engagement', label: 'Book Demo (Calendly open)' });
      } catch (e) {
        // ignore
      }
    }
    setIsOpen(true);
  };

  return (
    <CalendlyContext.Provider value={{ openCalendlyModal: () => openCalendlyModalWithTracking(analytics ?? null) }}>
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