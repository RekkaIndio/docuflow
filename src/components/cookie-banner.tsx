"use client";

import React from 'react';
import { useCookieConsent } from '@/context/cookie-consent';

export function CookieBanner() {
  const { analytics, setAnalyticsConsent, acceptAll, rejectAll, isPreferencesOpen, closePreferences } = useCookieConsent();
  const [openPrefs, setOpenPrefs] = React.useState(false);
  const [localAnalytics, setLocalAnalytics] = React.useState<boolean>(analytics ?? false);

  // If user already decided and there is no openPreferences request, don't show
  React.useEffect(() => {
    if (isPreferencesOpen) setOpenPrefs(true);
  }, [isPreferencesOpen]);

  if (analytics !== null && !openPrefs) return null;

  function handleSavePrefs() {
    setAnalyticsConsent(localAnalytics);
    setOpenPrefs(false);
    closePreferences();
  }

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1">
          <div className="font-semibold">We use cookies</div>
          <div className="text-sm text-slate-600">We use essential cookies to run the service and analytics cookies to understand usage. You can accept analytics or reject them.</div>

          {openPrefs && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded">
              <label className="flex items-center gap-3">
                <input
                  aria-label="Allow analytics cookies"
                  type="checkbox"
                  checked={localAnalytics}
                  onChange={(e) => setLocalAnalytics(e.target.checked)}
                />
                <span className="text-sm">Allow analytics cookies</span>
              </label>
              <div className="mt-3 flex gap-2">
                <button onClick={handleSavePrefs} className="bg-blue-600 text-white px-3 py-1 rounded">Save preferences</button>
                <button onClick={() => { setOpenPrefs(false); closePreferences(); }} className="px-3 py-1 rounded border">Cancel</button>
              </div>
            </div>
          )}
        </div>

          <div className="flex items-center gap-2">
          <button onClick={() => { acceptAll(); closePreferences(); }} className="bg-blue-600 text-white px-4 py-2 rounded-md">Accept all</button>
          <button onClick={() => { rejectAll(); closePreferences(); }} className="bg-transparent border border-slate-300 px-4 py-2 rounded-md">Reject analytics</button>
          <button onClick={() => setOpenPrefs(true)} className="text-sm underline">Manage preferences</button>
        </div>
      </div>
    </div>
  );
}
