"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Target, Shield, Activity, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';

interface AdminOverviewCardsProps {
  aggregateWoundsData: {
    total: number;
    pressure: number;
    break: number;
    fracture: number;
    bruise: number;
    skintear: number;
    workspacesWithData: number;
  };
  aggregateAuditData: {
    totalYesCount: number;
    totalQuestions: number;
    overallPercentage: number | null;
    auditsCompleted: number;
    totalAudits: number;
    workspacesWithData: number;
  };
  aggregateFallsData: {
    totalFalls: number;
    workspacesWithData: number;
  };
  aggregateInfectionData: {
    totalInfections: number;
    uti: number;
    chest: number;
    wound: number;
    workspacesWithData: number;
  };
  workspaceCount: number;
  isMounted: boolean;
  onRefreshWounds: () => void;
  onRefreshAudits: () => void;
  onRefreshFalls: () => void;
  onRefreshInfections: () => void;
}

const getGradientColors = (score: number | null) => {
  if (score === null) return { start: '#e5e7eb', end: '#cbd5e1' };
  if (score >= 80) return { start: '#34d399', end: '#059669' };
  if (score >= 20) return { start: '#fbbf24', end: '#d97706' };
  return { start: '#f87171', end: '#dc2626' };
};

export default function AdminOverviewCards({
  aggregateWoundsData,
  aggregateAuditData,
  aggregateFallsData,
  aggregateInfectionData,
  workspaceCount,
  isMounted,
  onRefreshWounds,
  onRefreshAudits,
  onRefreshFalls,
  onRefreshInfections
}: AdminOverviewCardsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">System Health Overview</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          Real-time metrics across all workspaces
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wounds Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-red-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Incident Reports</div>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            {isMounted && aggregateWoundsData.total > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-red-600">{aggregateWoundsData.total}</div>
                  <Button size="sm" variant="ghost" onClick={onRefreshWounds}>
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {[
                    { label: 'Pressure', value: aggregateWoundsData.pressure, color: 'bg-red-500' },
                    { label: 'Break', value: aggregateWoundsData.break, color: 'bg-orange-500' },
                    { label: 'Fracture', value: aggregateWoundsData.fracture, color: 'bg-yellow-500' },
                    { label: 'Bruise', value: aggregateWoundsData.bruise, color: 'bg-purple-500' }
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${item.color} rounded-full`}></div>
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>Data from {aggregateWoundsData.workspacesWithData} workspaces</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {!isMounted ? 'Loading...' : 'No incidents reported'}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>All clear</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Falls Prevention Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-orange-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Falls Prevention</div>
            <Target className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isMounted && aggregateFallsData.totalFalls > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-orange-600">{aggregateFallsData.totalFalls}</div>
                  <Button size="sm" variant="ghost" onClick={onRefreshFalls}>
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Falls reported across all facilities
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>Data from {aggregateFallsData.workspacesWithData} workspaces</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {!isMounted ? 'Loading...' : 'No falls reported'}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Safety maintained</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Infections Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-pink-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pink-50 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Infection Control</div>
            <Shield className="h-5 w-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            {isMounted && aggregateInfectionData.totalInfections > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-orange-600">{aggregateInfectionData.totalInfections}</div>
                  <Button size="sm" variant="ghost" onClick={onRefreshInfections}>
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {[
                    { label: 'UTI', value: aggregateInfectionData.uti, color: 'bg-pink-500' },
                    { label: 'Chest', value: aggregateInfectionData.chest, color: 'bg-red-500' },
                    { label: 'Wound', value: aggregateInfectionData.wound, color: 'bg-orange-500' }
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${item.color} rounded-full`}></div>
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>Data from {aggregateInfectionData.workspacesWithData} workspaces</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {!isMounted ? 'Loading...' : 'No infections reported'}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Under control</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Score Card - moved to right */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Compliance Score</div>
            <Shield className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isMounted && aggregateAuditData.overallPercentage !== null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16">
                    <OccupancyPie 
                      percent={aggregateAuditData.overallPercentage} 
                      size={64} 
                      strokeWidth={8} 
                      gradientColors={getGradientColors(aggregateAuditData.overallPercentage)}
                      centerFontSize={14}
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={onRefreshAudits}>
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Compliance Rate:</span>
                    <span className="font-semibold">{aggregateAuditData.totalYesCount}/{aggregateAuditData.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audits Completed:</span>
                    <span className="font-semibold">{aggregateAuditData.auditsCompleted}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>{aggregateAuditData.workspacesWithData}/{workspaceCount} workspaces</span>
                  <div className="flex items-center gap-1">
                    {aggregateAuditData.overallPercentage >= 80 ? (
                      <><CheckCircle2 className="w-3 h-3 text-green-500" /> <span>Excellent</span></>
                    ) : aggregateAuditData.overallPercentage >= 60 ? (
                      <><Clock className="w-3 h-3 text-yellow-500" /> <span>Good</span></>
                    ) : (
                      <><XCircle className="w-3 h-3 text-red-500" /> <span>Needs Attention</span></>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl font-bold text-gray-400">N/A</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {!isMounted ? 'Loading...' : 'No audit data available'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Complete audits to see compliance scores
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}