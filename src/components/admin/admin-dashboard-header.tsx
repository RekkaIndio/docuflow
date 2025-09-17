"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, Folder, FileText, Building2 } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';

interface AdminDashboardHeaderProps {
  workspaceCount: number;
  totalFolders: number;
  totalDocuments: number;
  averageOccupancy: number;
  totalOccupied: number;
  totalBeds: number;
  onRefresh?: () => void;
}

export default function AdminDashboardHeader({
  workspaceCount,
  totalFolders,
  totalDocuments,
  averageOccupancy,
  totalOccupied,
  totalBeds,
  onRefresh
}: AdminDashboardHeaderProps) {
  return (
  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-[64px] shadow-2xl">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 py-6 sm:py-8 lg:py-10 px-8 md:px-12 lg:px-16">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
          {/* Main content - left side */}
          <div className="flex-1 space-y-4 lg:space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>

          {/* Key metrics cards - right side */}
            <div className="w-full lg:w-auto">
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4">
              {/* Workspaces */}
              <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center gap-2 lg:gap-3 h-full">
                  <div className="p-2 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors duration-300">
                    <Building2 className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xl lg:text-2xl font-bold text-white">{workspaceCount}</div>
                    <div className="text-xs text-blue-200 font-medium uppercase tracking-wide">Workspaces</div>
                  </div>
                </div>
              </div>

              {/* Folders */}
              {/* (Folders and Documents cards removed) */}

              {/* Occupancy */}
              <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center gap-2 lg:gap-3 h-full">
                  <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors duration-300">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xl lg:text-2xl font-bold text-white">{Math.round(averageOccupancy * 100)}%</div>
                    <div className="text-xs text-emerald-200 font-medium uppercase tracking-wide">Avg Occupancy</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}