"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { TrendingDown, CheckCircle, AlertTriangle, Users, Building2 } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';

interface AdminLowOccupancyProps {
  workspaces: any[];
}

export default function AdminLowOccupancy({ workspaces }: AdminLowOccupancyProps) {
  const lowOccupancyWorkspaces = React.useMemo(() => {
    return workspaces
      .filter(w => {
        const occupancy = typeof w.occupancy === 'number'
          ? w.occupancy
          : (w.totalBeds ? (w.occupiedBeds || 0) / w.totalBeds : 0);
        return occupancy < 0.8; // Less than 80% occupancy
      })
      .sort((a, b) => {
        const aOccupancy = typeof a.occupancy === 'number'
          ? a.occupancy
          : (a.totalBeds ? (a.occupiedBeds || 0) / a.totalBeds : 0);
        const bOccupancy = typeof b.occupancy === 'number'
          ? b.occupancy
          : (b.totalBeds ? (b.occupiedBeds || 0) / b.totalBeds : 0);
        return aOccupancy - bOccupancy;
      })
      .slice(0, 5);
  }, [workspaces]);

  if (lowOccupancyWorkspaces.length === 0) {
    return (
      <div className="mb-10 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Occupancy Status
              </h2>
              <p className="text-sm text-gray-600">All facilities at healthy levels</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">All Good</span>
          </div>
        </div>

        <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/80 via-emerald-50/50 to-white/85 backdrop-blur-xl shadow-2xl hover:shadow-[0_40px_120px_rgba(16,185,129,0.25)] transition-all duration-500">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-teal-400/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/25 rounded-full -mr-20 -mt-16 blur-2xl group-hover:bg-emerald-200/35 transition-colors duration-500"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-200/20 rounded-full -ml-16 -mb-14 blur-2xl"></div>

          <CardContent className="relative p-8 lg:p-10">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-600 mb-2">All Facilities Healthy</div>
              <div className="text-gray-600">
                All facilities maintaining healthy occupancy levels above 80%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-10 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-rose-600 rounded-xl shadow-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Low Occupancy Alert
            </h2>
            <p className="text-sm text-gray-600">Facilities requiring attention</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-orange-700 font-medium">Watchlist</span>
        </div>
      </div>

      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/80 via-amber-50/50 to-white/85 backdrop-blur-xl shadow-2xl hover:shadow-[0_40px_120px_rgba(249,115,22,0.25)] transition-all duration-500">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-rose-400/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-200/25 rounded-full -mr-20 -mt-16 blur-2xl group-hover:bg-amber-200/35 transition-colors duration-500"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-200/20 rounded-full -ml-16 -mb-14 blur-2xl"></div>

        <CardContent className="relative p-8 lg:p-10">
          <div className="space-y-4">
            {lowOccupancyWorkspaces.map((w: any) => {
              const occupancy = typeof w.occupancy === 'number'
                ? w.occupancy
                : (w.totalBeds ? (w.occupiedBeds || 0) / w.totalBeds : 0);
              const occupancyPercent = Math.round(occupancy * 100);

              return (
                <div key={`low-${w.id}`} className="group/workspace flex items-center justify-between p-6 bg-gradient-to-r from-white/75 to-amber-50/40 backdrop-blur-lg border border-white/40 rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 flex items-center justify-center bg-white rounded-2xl shadow-sm group-hover/workspace:shadow-md transition-shadow duration-300">
                        <OccupancyPie
                          percent={occupancyPercent}
                          size={48}
                          strokeWidth={4}
                        />
                      </div>
                      {occupancyPercent < 60 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900 group-hover/workspace:text-gray-800 transition-colors">
                        {w.name || w.id}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                          occupancyPercent >= 70 ? 'text-yellow-700 bg-yellow-50' :
                          occupancyPercent >= 50 ? 'text-orange-700 bg-orange-50' :
                          'text-red-700 bg-red-50'
                        }`}>
                          {occupancyPercent}% occupied
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" />
                          <span>{w.occupiedBeds || 0}/{w.totalBeds || 'n/a'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Available beds</div>
                    <div className="text-lg font-bold text-orange-600">
                      {w.totalBeds ? (w.totalBeds - (w.occupiedBeds || 0)) : 'n/a'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/40">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span>Facilities below 80% occupancy</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{lowOccupancyWorkspaces.length} facilities monitored</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}