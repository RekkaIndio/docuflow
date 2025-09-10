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
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden mb-8">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
      </div>
      <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">Admin Dashboard</h1>
            <div className="text-slate-200 text-base leading-relaxed">
              System overview • {workspaceCount} workspaces • {totalFolders} folders • {totalDocuments} documents
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={onRefresh}
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm"
              >
                Refresh Data
              </Button>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live data</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Workspaces */}
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg min-w-[120px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Workspaces</div>
                  <div className="text-xl font-bold">{workspaceCount}</div>
                </div>
              </div>
            </div>

            {/* Folders */}
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg min-w-[120px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Folder className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Folders</div>
                  <div className="text-xl font-bold">{totalFolders}</div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg min-w-[120px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Documents</div>
                  <div className="text-xl font-bold">{totalDocuments}</div>
                </div>
              </div>
            </div>

            {/* Occupancy */}
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg min-w-[140px]">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white/5 rounded-full">
                  <OccupancyPie percent={Math.round(averageOccupancy * 100)} size={48} strokeWidth={6} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Avg Occupancy</div>
                  <div className="text-xl font-bold">{Math.round(averageOccupancy * 100)}%</div>
                  <div className="text-xs text-slate-400">{totalOccupied}/{totalBeds} beds</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}