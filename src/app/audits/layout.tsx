"use client";
import React from 'react';
import { usePathname } from 'next/navigation';

export default function AuditsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Allow only the accident-incident audit page to render its full content.
  // All other audit routes will show a temporary disabled placeholder to isolate build issues.
  if (!pathname?.includes('/audits/accident-incident')) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="max-w-xl text-center p-6 bg-yellow-50 border border-yellow-200 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Audit pages temporarily disabled</h2>
          <p className="text-sm text-gray-700">To diagnose build issues we have temporarily disabled all audit pages except the Accident & Incident audit. Visit <strong>/audits/accident-incident</strong> to continue testing.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
