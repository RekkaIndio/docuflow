"use client";
import React from "react";
import { Resident } from "./types";

interface StatsOverviewProps {
  residents: Resident[];
  calculateNDPSScore: (resident: Resident) => number;
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number };
  calculateNDPSStaffing: (residents: Resident[]) => { Day: number; Night: number };
}

export function StatsOverview({
  residents,
  calculateNDPSScore,
  calculateResidentCareMinutes,
  calculateNDPSStaffing
}: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
      {/* Total Residents */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-blue-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-blue-100/50">
        <div className="pb-3 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-blue-900">Total Residents</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-blue-900 mb-2">{residents.length}</div>
          <div className="text-xs text-blue-700 font-medium">Active assessments</div>
        </div>
      </div>

      {/* Average NDPS Score */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-emerald-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-emerald-100/50">
        <div className="pb-3 border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-emerald-900">Avg NDPS Score</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-emerald-900 mb-2">
            {residents.length > 0 ? Math.round(residents.reduce((sum, r) => sum + calculateNDPSScore(r), 0) / residents.length * 10) / 10 : 0}
          </div>
          <div className="text-xs text-emerald-700 font-medium">Care dependency level</div>
        </div>
      </div>

      {/* Total Care Hours */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-purple-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-purple-100/50">
        <div className="pb-3 border-b border-purple-100/80 bg-gradient-to-r from-purple-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-purple-900">Care Hours</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-3xl font-bold text-purple-900 mb-2">
            {Math.round((residents.reduce((sum, r) => sum + calculateResidentCareMinutes(r).Day, 0) / 60 + residents.reduce((sum, r) => sum + calculateResidentCareMinutes(r).Night, 0) / 60) * 10) / 10}h
          </div>
          <div className="text-xs text-purple-700 font-medium">Daily requirements</div>
        </div>
      </div>

      {/* Recommended Staff */}
      <div className="group hover:shadow-xl transition-all duration-300 border border-amber-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-amber-100/50">
        <div className="pb-3 border-b border-amber-100/80 bg-gradient-to-r from-amber-50/40 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-2 p-4">
            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-amber-900">Staff Required</div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-900">{calculateNDPSStaffing(residents).Day}</div>
              <div className="text-xs text-amber-700 font-medium">Day Shift</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-900">{calculateNDPSStaffing(residents).Night}</div>
              <div className="text-xs text-amber-700 font-medium">Night Shift</div>
            </div>
          </div>
          <div className="text-center pt-2 border-t border-amber-100">
            <div className="text-sm font-bold text-amber-900">{calculateNDPSStaffing(residents).Day + calculateNDPSStaffing(residents).Night}</div>
            <div className="text-xs text-amber-700 font-medium">Total Staff</div>
          </div>
        </div>
      </div>
    </div>
  );
}