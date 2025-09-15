"use client";
import React from 'react';

export default function AuditHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  // Calculate next reset date (7th of next month) and days remaining
  const calculateResetInfo = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    let resetMonth = currentMonth;
    let resetYear = currentYear;

    if (currentDay >= 7) {
      resetMonth = currentMonth + 1;
      if (resetMonth > 11) {
        resetMonth = 0;
        resetYear = currentYear + 1;
      }
    }

    const resetDate = new Date(resetYear, resetMonth, 7);
    const timeDiff = resetDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return { resetDate, daysRemaining };
  };

  const { resetDate, daysRemaining } = calculateResetInfo();

  const getCountdownColor = (days: number) => {
    if (days > 15) return { text: 'text-green-800', bg: 'bg-green-100' };
    if (days > 5) return { text: 'text-amber-800', bg: 'bg-amber-100' };
    return { text: 'text-destructive', bg: 'bg-destructive/10' };
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight font-headline">Audits</h2>
              <div className="text-primary-foreground/80 text-base leading-relaxed">{subtitle ?? 'Complete monthly compliance audits and track performance'}</div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4">
              <p className="text-primary-foreground/80">Current month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p className="text-primary-foreground/80">Next reset: {resetDate.toLocaleDateString()}</p>
              <div className="flex justify-end mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Audits
          </button>
          <div className="h-6 border-l border-gray-300"></div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
    </div>
  );
}
