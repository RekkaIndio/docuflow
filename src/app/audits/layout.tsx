"use client";
import React from 'react';

export default function AuditsLayout({ children }: { children: React.ReactNode }) {
  // Wrap all audit pages in a root container and apply a small scoped
  // CSS override so pages that include `max-w-7xl mx-auto` will render
  // full-width inside the audits area. This avoids editing every audit
  // page individually while keeping the scope limited to `src/app/audits`.
  return (
    <div className="audits-root w-full">
      {/* Scoped CSS override: make any descendant using Tailwind's max-w-7xl
          behave as full width within audits. The !important is intentional
          to override the generated utility. */}
      <style>{`.audits-root .max-w-7xl{ max-width: none !important; width: 100% !important; }`}</style>
      {children}
    </div>
  );
}
