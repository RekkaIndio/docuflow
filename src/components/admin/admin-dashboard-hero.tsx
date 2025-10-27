"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Building2, Activity, TrendingUp, Calendar, Settings } from 'lucide-react';

interface AdminDashboardHeroProps {
  workspaceCount: number;
  totalDocuments: number;
  careOverview: {
    totalHomes: number;
    totalBeds: number;
    totalOccupied: number;
    averageOccupancy: number;
  };
  aggregateAuditData: {
    overallPercentage: number | null;
    auditsCompleted: number;
    totalAudits: number;
  };
  aggregateWoundsTotal: number;
  aggregateFallsTotal: number;
  aggregateInfectionsTotal: number;
  aggregateDailyCheckinData: {
    totalWorkspaces: number;
    completedToday: number;
    percentComplete: number;
  };
  onManageWorkspaces: () => void;
}

export default function AdminDashboardHero({
  workspaceCount,
  totalDocuments,
  careOverview,
  aggregateAuditData,
  aggregateWoundsTotal,
  aggregateFallsTotal,
  aggregateInfectionsTotal,
  aggregateDailyCheckinData,
  onManageWorkspaces
}: AdminDashboardHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-800 dark:via-blue-800 dark:to-indigo-900 rounded-b-[48px] shadow-2xl mb-8">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-40 translate-x-40 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-36 -translate-x-36" />
        <div className="absolute top-1/2 left-1/2 w-56 h-56 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000" />
      </div>
      <div className="relative z-10 px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Main content - left side */}
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white dark:text-slate-100 drop-shadow-sm">
              Admin Dashboard
            </h1>
            <p className="text-lg text-blue-100 dark:text-blue-200 max-w-2xl">
              Monitor and manage all workspaces, compliance metrics, and system performance across your organization.
            </p>

            {/* Key stats row */}
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-700/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Building2 className="w-5 h-5 text-blue-200 dark:text-blue-300" />
                <span className="text-white dark:text-slate-100 font-semibold">{workspaceCount} Workspaces</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-700/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <FileText className="w-5 h-5 text-green-200 dark:text-green-300" />
                <span className="text-white dark:text-slate-100 font-semibold">{totalDocuments} Documents</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-700/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Users className="w-5 h-5 text-purple-200 dark:text-purple-300" />
                <span className="text-white dark:text-slate-100 font-semibold">{Math.round(careOverview.averageOccupancy * 100)}% Avg Occupancy</span>
              </div>
            </div>
          </div>

          {/* Action buttons - right side */}
          <div className="flex flex-col sm:flex-row gap-3 lg:flex-col">
            <Button
              size="lg"
              className="bg-white/20 dark:bg-slate-700/30 hover:bg-white/30 dark:hover:bg-slate-700/50 text-white dark:text-slate-100 border-white/30 dark:border-slate-600/50 backdrop-blur-sm"
              onClick={onManageWorkspaces}
            >
              <Settings className="w-5 h-5 mr-2" />
              Manage Workspaces
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 dark:border-slate-600/50 text-white dark:text-slate-100 hover:bg-white/10 dark:hover:bg-slate-700/20 backdrop-blur-sm"
            >
              <Activity className="w-5 h-5 mr-2" />
              View Reports
            </Button>
          </div>
        </div>

        {/* Bottom metrics bar */}
        <div className="mt-8 pt-6 border-t border-white/20 dark:border-slate-600/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white dark:text-slate-100">{aggregateAuditData.overallPercentage ? Math.round(aggregateAuditData.overallPercentage) : 0}%</div>
              <div className="text-sm text-blue-100 dark:text-blue-200">Compliance Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white dark:text-slate-100">{aggregateDailyCheckinData.percentComplete}%</div>
              <div className="text-sm text-green-100 dark:text-green-200">Daily Check-ins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white dark:text-slate-100">{aggregateWoundsTotal + aggregateFallsTotal + aggregateInfectionsTotal}</div>
              <div className="text-sm text-orange-100 dark:text-orange-200">Incidents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white dark:text-slate-100">{careOverview.totalOccupied}/{careOverview.totalBeds}</div>
              <div className="text-sm text-purple-100 dark:text-purple-200">Bed Occupancy</div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white/10 dark:from-slate-800/20 to-transparent rounded-b-[48px]" />
    </div>
  );
}