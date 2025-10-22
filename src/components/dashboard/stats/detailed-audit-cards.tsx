"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { FileText, Shield, Wrench, Lock, Flame, Biohazard, Utensils, Moon, Users, Soup, AlertTriangle, Minus, TrendingUp, TrendingDown } from 'lucide-react';

import { AUDIT_TYPES, AUDIT_DISPLAY_NAMES, type AuditType } from '@/lib/audit-types';

interface Props {
  latestScores: Record<string, any>;
  trends: Record<string, { direction: 'up' | 'down' | 'stable'; change: number }>;
}

// Simple local fallback trend indicator (kept minimal to avoid circular imports)
const TrendIndicator = ({ auditType, trends }: { auditType: string; trends: Props['trends'] }) => {
  const t = trends[auditType];
  if (!t) return null;
  if (t.direction === 'up') return (
    <div className="flex items-center gap-1 text-xs text-green-600"><TrendingUp className="h-3 w-3" />+{t.change}%</div>
  );
  if (t.direction === 'down') return (
    <div className="flex items-center gap-1 text-xs text-red-600"><TrendingDown className="h-3 w-3" />{t.change}%</div>
  );
  return (<div className="flex items-center gap-1 text-xs text-gray-500"><Minus className="h-3 w-3" />No change</div>);
};

const iconMap: Record<string, any> = {
  'care-plan': <FileText className="h-5 w-5 text-blue-600" />,
  'health-safety': <Shield className="h-5 w-5 text-green-600" />,
  'maintenance': <Wrench className="h-5 w-5 text-yellow-600" />,
  'restrictive-practice': <Lock className="h-5 w-5 text-purple-600" />,
  'fire-safety': <Flame className="h-5 w-5 text-red-600" />,
  'infection-control': <Biohazard className="h-5 w-5 text-orange-600" />,
  'mealtime': <Utensils className="h-5 w-5 text-cyan-600" />,
  'night-visit': <Moon className="h-5 w-5 text-indigo-600" />,
  'staff-file': <Users className="h-5 w-5 text-teal-600" />,
  'kitchen': <Soup className="h-5 w-5 text-emerald-600" />,
  'falls': <AlertTriangle className="h-5 w-5 text-amber-600" />
};

const getScoreColor = (score: number | null) => {
  if (score === null) return '#cbd5e1';
  if (score >= 80) return '#10b981';
  if (score >= 20) return '#f59e0b';
  return '#ef4444';
};

const getGradientColors = (score: number | null) => {
  if (score === null) return { start: '#e5e7eb', end: '#cbd5e1' };
  if (score >= 80) return { start: '#34d399', end: '#059669' };
  if (score >= 20) return { start: '#fbbf24', end: '#d97706' };
  return { start: '#f87171', end: '#dc2626' };
};

export default function DetailedAuditCards({ latestScores, trends }: Props) {
  const auditKeys: AuditType[] = (Array.isArray(AUDIT_TYPES) ? AUDIT_TYPES : []) as AuditType[];

  // If AUDIT_TYPES isn't configured, fall back to latestScores keys
  const keys = auditKeys.length > 0 ? auditKeys : Object.keys(latestScores || {});

  return (
    <>
      {keys.map((key: any, index: number) => {
        const score = latestScores?.[key]?.scorePercent ?? null;
        const yesCount = latestScores?.[key]?.yesCount ?? null;
        const totalCount = latestScores?.[key]?.totalCount ?? null;
        const updatedAt = latestScores?.[key]?.updatedAt ?? null;

        const displayNames = AUDIT_DISPLAY_NAMES as Record<string, string>;
        const title = displayNames[key] ?? key;
        const icon = iconMap[key] || <FileText className="h-5 w-5 text-gray-600" />;

        return (
          score !== null && (
            <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {icon}
                  {title}
                </CardTitle>
                <CardDescription>
                  {yesCount !== null && totalCount !== null
                    ? `${yesCount} of ${totalCount} questions passed`
                    : 'No data available'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16">
                      <OccupancyPie
                        percent={score ?? 0}
                        size={64}
                        strokeWidth={8}
                        gradientColors={getGradientColors(score)}
                        centerFontSize={14}
                      />
                    </div>
                    <div>
                      <div className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>
                        {score !== null ? `${score}%` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Current Score</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <TrendIndicator auditType={key} trends={trends} />
                  </div>
                </div>
                {updatedAt && (
                  <div className="text-xs text-gray-500 mt-4">
                    Last updated: {new Date(updatedAt).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        );
      })}
    </>
  );
}
