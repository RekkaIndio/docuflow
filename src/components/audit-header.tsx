"use client";
import React from 'react';
import PageHeader from './page-header';

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
      <PageHeader
        title={"Audits"}
        subtitle={subtitle ?? 'Complete monthly compliance audits and track performance'}
        gradientClass="from-primary to-accent"
        textClass="text-primary-foreground"
        subtitleClass="text-primary-foreground/80 text-base leading-relaxed"
        actions={(
          <div className="text-right">
            <div className="flex flex-col justify-center items-end h-10 sm:h-12 px-3 gap-1 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-sm">
              <div className="text-primary-foreground/80 text-xs leading-none">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div className="flex items-center gap-2">
                <div className="text-primary-foreground/80 text-xs">Next: {resetDate.toLocaleDateString()}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>
        )}
      />

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
