import React from 'react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function AdminPageHeader({ title, subtitle, icon, className }: AdminPageHeaderProps) {
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-800 dark:via-blue-800 dark:to-indigo-900 text-white rounded-b-[48px] shadow-2xl mb-6', className)}>
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-40 translate-x-40 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-36 -translate-x-36" />
        <div className="absolute top-1/2 left-1/2 w-56 h-56 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000" />
      </div>
      <div className="relative z-10 px-6 py-8 md:px-8 md:py-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/12 dark:bg-white/20 rounded-2xl flex items-center justify-center border border-white/20">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-3xl font-semibold leading-tight tracking-tight mb-1 text-white">{title}</h1>
            {subtitle && <p className="text-sm md:text-base text-blue-100 dark:text-blue-200">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-muted/20 to-transparent rounded-b-[48px]" />
    </div>
  );
}
