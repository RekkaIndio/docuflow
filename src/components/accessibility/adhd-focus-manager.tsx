'use client';

import { useEffect } from 'react';

export const ADHD_PROFILE_STORAGE_KEY = 'docuflow-adhd-focus-mode';
export const ADHD_FOCUS_EVENT = 'docuflow-adhd-focus-toggle';
export const SEIZURE_SAFE_STORAGE_KEY = 'docuflow-seizure-safe-mode';
export const SEIZURE_SAFE_EVENT = 'docuflow-seizure-safe-toggle';

const ADHD_FOCUS_CLASS = 'adhd-focus-mode';
const SEIZURE_SAFE_CLASS = 'seizure-safe-mode';

type AccessibilityToggleDetail = {
  active: boolean;
};

export function AccessibilityProfileManager() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const body = document.body;
    if (!body) {
      return;
    }

    let adhdActive = false;
    let seizureSafeActive = false;
    let frame: number | null = null;

    const applyFocusCenter = (value: number) => {
      body.style.setProperty('--adhd-focus-center', `${value}px`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        applyFocusCenter(event.clientY);
        frame = null;
      });
    };

    const enableAdhd = () => {
      if (adhdActive) {
        return;
      }
      adhdActive = true;
      body.classList.add(ADHD_FOCUS_CLASS);
      applyFocusCenter(window.innerHeight / 2);
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
    };

    const disableAdhd = () => {
      if (!adhdActive) {
        return;
      }
      adhdActive = false;
      body.classList.remove(ADHD_FOCUS_CLASS);
      body.style.removeProperty('--adhd-focus-center');
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const enableSeizureSafe = () => {
      if (seizureSafeActive) {
        return;
      }
      seizureSafeActive = true;
      body.classList.add(SEIZURE_SAFE_CLASS);
    };

    const disableSeizureSafe = () => {
      if (!seizureSafeActive) {
        return;
      }
      seizureSafeActive = false;
      body.classList.remove(SEIZURE_SAFE_CLASS);
    };

    const syncAdhd = (active: boolean) => {
      if (active) {
        enableAdhd();
      } else {
        disableAdhd();
      }
    };

    const syncSeizureSafe = (active: boolean) => {
      if (active) {
        enableSeizureSafe();
      } else {
        disableSeizureSafe();
      }
    };

    const readStoredStates = () => {
      try {
        const adhd = localStorage.getItem(ADHD_PROFILE_STORAGE_KEY) === 'on';
        const seizureSafe = localStorage.getItem(SEIZURE_SAFE_STORAGE_KEY) === 'on';
        return { adhd, seizureSafe };
      } catch (error) {
        return { adhd: false, seizureSafe: false };
      }
    };

    const initialStates = readStoredStates();
    syncAdhd(initialStates.adhd);
    syncSeizureSafe(initialStates.seizureSafe);

    const handleAdhdToggle = (event: Event) => {
      const custom = event as CustomEvent<AccessibilityToggleDetail>;
      syncAdhd(Boolean(custom.detail?.active));
    };

    const handleSeizureSafeToggle = (event: Event) => {
      const custom = event as CustomEvent<AccessibilityToggleDetail>;
      syncSeizureSafe(Boolean(custom.detail?.active));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ADHD_PROFILE_STORAGE_KEY) {
        syncAdhd(event.newValue === 'on');
      }

      if (event.key === SEIZURE_SAFE_STORAGE_KEY) {
        syncSeizureSafe(event.newValue === 'on');
      }
    };

    window.addEventListener(ADHD_FOCUS_EVENT, handleAdhdToggle as EventListener);
    window.addEventListener(SEIZURE_SAFE_EVENT, handleSeizureSafeToggle as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      disableAdhd();
      disableSeizureSafe();
      window.removeEventListener(ADHD_FOCUS_EVENT, handleAdhdToggle as EventListener);
      window.removeEventListener(SEIZURE_SAFE_EVENT, handleSeizureSafeToggle as EventListener);
      window.removeEventListener('storage', handleStorage);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return null;
}
