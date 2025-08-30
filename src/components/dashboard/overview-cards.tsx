"use client";
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { ReactNode } from 'react';

export type OverviewCardItem = {
  key: string;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export default function OverviewCards({ items }: { items: OverviewCardItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <Card key={item.key} className={`flex items-center gap-4 p-4 bg-white/90 shadow-sm rounded-lg border-transparent hover:shadow-md transition-shadow ${item.className || ''}`}>
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-slate-100 to-white text-white rounded-lg shadow flex-shrink-0">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">{item.title}</div>
            <div className="text-xl font-semibold truncate">{item.value}</div>
            {item.subtitle && <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>}
          </div>
        </Card>
      ))}
    </div>
  );
}
