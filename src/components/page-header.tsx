"use client";
import React from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  gradientClass?: string; // tailwind gradient start/end
  textClass?: string; // text color class
  className?: string;
  subtitleClass?: string;
  leading?: React.ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  actions,
  leading,
  gradientClass = 'from-primary to-accent',
  textClass = 'text-primary-foreground',
  className = '',
  subtitleClass = 'text-slate-200 text-sm sm:text-base leading-relaxed',
}: PageHeaderProps) {
  return (
    // Fixed hero height ensures visual consistency across pages.
    // Use exact heights so every PageHeader renders the same size across the app.
    <div className={`bg-gradient-to-r ${gradientClass} ${textClass} px-6 h-20 sm:h-28 rounded-b-2xl shadow-lg relative overflow-hidden mb-6 ${className}`}>
      <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -translate-y-48 translate-x-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full translate-y-32 -translate-x-32" />
      </div>

      <div className="relative z-10 w-full mx-auto flex items-center justify-between gap-8 h-full">
        <div className="flex items-center gap-6 h-full">
          {/* Leading: fixed boxed area so leading icons/avatars align and are vertically centered */}
          {leading ? (
            <div className="flex-none w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg flex items-center justify-center overflow-hidden">
              {leading}
            </div>
          ) : null}

          {/* Title block: vertically center title + subtitle */}
          <div className="flex flex-col justify-center h-full">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">{title}</h1>
            {subtitle ? (
              <div className={`${subtitleClass} mt-1`}>{subtitle}</div>
            ) : null}
          </div>
        </div>

        {/* Actions: right aligned, vertically centered */}
        {actions ? (
          <div className="flex items-center gap-4 h-full">
            {React.Children.map(actions as React.ReactNode, (child, idx) => (
              <div key={idx} className="flex items-center h-10 sm:h-12">
                {child as React.ReactNode}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
