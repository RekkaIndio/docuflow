"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Target, Shield, Activity, TrendingUp, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
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
  onOpenWoundsModal?: () => void;
  onOpenFallsModal?: () => void;
  onOpenInfectionsModal?: () => void;
  onOpenAuditModal?: () => void;
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
  onRefreshInfections,
  onOpenWoundsModal,
  onOpenFallsModal,
  onOpenInfectionsModal,
  onOpenAuditModal
}: AdminOverviewCardsProps) {
  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              System Health Overview
            </h2>
            <p className="text-sm text-gray-600">Real-time metrics across all workspaces</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200/50">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 font-medium">Live Data</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wounds Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-red-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer" onClick={onOpenWoundsModal}>
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-red-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-200/20 rounded-full -ml-12 -mb-12"></div>

          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors duration-300">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Incident Reports</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onRefreshWounds(); }}
              aria-label="Refresh wounds data"
              title="Refresh wounds data"
              className="transition-opacity duration-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-300"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="relative">
            {isMounted && aggregateWoundsData.total > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-red-600">{aggregateWoundsData.total}</div>
                  <div className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded-full">
                    Active
                  </div>
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
                        <span className="text-sm text-gray-600">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>{aggregateWoundsData.workspacesWithData} workspaces</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600 mt-1">
                  {!isMounted ? 'Loading...' : 'No incidents reported'}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-3">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>All clear</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Falls Prevention Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer" onClick={onOpenFallsModal}>
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-orange-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full -ml-12 -mb-12"></div>

          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors duration-300">
                <Target className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Falls Prevention</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onRefreshFalls(); }}
              aria-label="Refresh falls data"
              title="Refresh falls data"
              className="transition-opacity duration-300 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-300"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="relative">
            {isMounted && aggregateFallsData.totalFalls > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-orange-600">{aggregateFallsData.totalFalls}</div>
                  <div className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded-full">
                    Monitoring
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Falls reported across all facilities
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>{aggregateFallsData.workspacesWithData} workspaces</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600 mt-1">
                  {!isMounted ? 'Loading...' : 'No falls reported'}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-3">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Safety maintained</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Infections Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer" onClick={onOpenInfectionsModal}>
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-pink-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-200/20 rounded-full -ml-12 -mb-12"></div>

          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-xl group-hover:bg-pink-500/20 transition-colors duration-300">
                <Shield className="h-5 w-5 text-pink-500" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Infection Control</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onRefreshInfections(); }}
              aria-label="Refresh infections data"
              title="Refresh infections data"
              className="transition-opacity duration-300 hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-300"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="relative">
            {isMounted && aggregateInfectionData.totalInfections > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-pink-600">{aggregateInfectionData.totalInfections}</div>
                  <div className="text-xs text-pink-500 font-medium bg-pink-50 px-2 py-1 rounded-full">
                    Active
                  </div>
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
                        <span className="text-sm text-gray-600">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>{aggregateInfectionData.workspacesWithData} workspaces</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600 mt-1">
                  {!isMounted ? 'Loading...' : 'No infections reported'}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-3">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Under control</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Score Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer" onClick={onOpenAuditModal}>
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>

          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors duration-300">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-sm font-semibold text-gray-700">Compliance Score</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onRefreshAudits(); }}
              aria-label="Refresh audit data"
              title="Refresh audit data"
              className="transition-opacity duration-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="relative">
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
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    aggregateAuditData.overallPercentage >= 80 ? 'text-green-600 bg-green-50' :
                    aggregateAuditData.overallPercentage >= 60 ? 'text-yellow-600 bg-yellow-50' :
                    'text-red-600 bg-red-50'
                  }`}>
                    {aggregateAuditData.overallPercentage >= 80 ? 'Excellent' :
                     aggregateAuditData.overallPercentage >= 60 ? 'Good' : 'Needs Attention'}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Compliance Rate:</span>
                    <span className="font-semibold text-gray-900">{aggregateAuditData.totalYesCount}/{aggregateAuditData.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Audits Completed:</span>
                    <span className="font-semibold text-gray-900">{aggregateAuditData.auditsCompleted}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
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
                <div className="text-sm text-gray-600 mt-1">
                  {!isMounted ? 'Loading...' : 'No audit data available'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
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