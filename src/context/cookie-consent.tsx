"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
// switched to Vercel Analytics; no direct GA integration needed here

type ConsentState = {
  analytics: boolean | null; // null = not decided
};

type CookieConsentContextType = {
  analytics: boolean | null;
  setAnalyticsConsent: (v: boolean) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const STORAGE_KEY = 'cookie_consent';

function readStoredConsent(): ConsentState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch (err) {
    return null;
  }
}

function writeStoredConsent(state: ConsentState) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (err) {
    // ignore
  }
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [analytics, setAnalytics] = useState<boolean | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);

  // Load stored preference on mount
  useEffect(() => {
    const stored = readStoredConsent();
    if (stored && typeof stored.analytics === 'boolean') {
      setAnalytics(stored.analytics);
    } else {
      setAnalytics(null);
    }
  }, []);

  // Persist preference when it changes
  useEffect(() => {
    if (analytics === null) return;
    writeStoredConsent({ analytics });
    // We intentionally do not auto-initialize any other analytics provider here.
    // Rendering of the Vercel <Analytics/> component is gated by consent in the layout.
  }, [analytics]);

  const setAnalyticsConsent = (v: boolean) => setAnalytics(v);
  const acceptAll = () => setAnalytics(true);
  const rejectAll = () => setAnalytics(false);
  const openPreferencesFn = () => setIsPreferencesOpen(true);
  const closePreferencesFn = () => setIsPreferencesOpen(false);

  return (
    <CookieConsentContext.Provider value={{ analytics, setAnalyticsConsent, acceptAll, rejectAll, isPreferencesOpen, openPreferences: openPreferencesFn, closePreferences: closePreferencesFn }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used inside CookieConsentProvider');
  return ctx;
}

// Helper for automated tests to clear stored consent
export function _resetCookieConsentForTests() {
  try { if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}
