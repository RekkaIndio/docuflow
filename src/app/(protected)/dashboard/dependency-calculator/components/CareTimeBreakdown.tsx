"use client";
import React from "react";
import { Resident } from "./types";

interface CareTimeBreakdownProps {
  residents: Resident[];
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number };
}

export function CareTimeBreakdown({
  residents,
  calculateResidentCareMinutes
}: CareTimeBreakdownProps) {
  return (
    <div className="group hover:shadow-xl transition-all duration-300 border border-rose-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-rose-100/50">
      <div className="pb-3 border-b border-rose-100/80 bg-gradient-to-r from-rose-50/40 to-transparent rounded-t-2xl">
        <div className="flex items-center gap-2 p-4">
          <div className="w-6 h-6 bg-rose-100 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-rose-900">Care Time Breakdown</div>
        </div>
      </div>
      <div className="p-4">
        {(() => {
          const totalDayMinutes = residents.reduce((sum, r) => sum + calculateResidentCareMinutes(r).Day, 0);
          const totalNightMinutes = residents.reduce((sum, r) => sum + calculateResidentCareMinutes(r).Night, 0);
          const totalMinutes = totalDayMinutes + totalNightMinutes || 1;

          // Calculate staffing requirements for 12-hour shifts
          const totalDayHours = Math.round((totalDayMinutes / 60) * 100) / 100;
          const totalNightHours = Math.round((totalNightMinutes / 60) * 100) / 100;
          const dayStaffNeeded = Math.ceil(totalDayHours / 12 * 4) / 4; // Round to quarter increments
          const nightStaffNeeded = Math.ceil(totalNightHours / 12 * 4) / 4;
          const totalStaffNeeded = dayStaffNeeded + nightStaffNeeded;

          const dayPercentage = Math.round((totalDayMinutes / totalMinutes) * 100);
          const nightPercentage = 100 - dayPercentage;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="transparent"
                      className="drop-shadow-sm"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(dayPercentage / 100) * 351.86} 351.86`}
                      className="drop-shadow-sm"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#8b5cf6"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(nightPercentage / 100) * 351.86} 351.86`}
                      strokeDashoffset={`-${(dayPercentage / 100) * 351.86}`}
                      className="drop-shadow-sm"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-lg font-bold text-gray-900">{Math.round(totalMinutes / 60)}h</div>
                    <div className="text-xs text-gray-600">Total Care</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-blue-800">Day Shift (12h)</span>
                      <span className="text-xs text-blue-600">{dayStaffNeeded} staff needed</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-900">{totalDayHours}h</div>
                    <div className="text-xs text-blue-600">({dayPercentage}%)</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-purple-800">Night Shift (12h)</span>
                      <span className="text-xs text-purple-600">{nightStaffNeeded} staff needed</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-900">{totalNightHours}h</div>
                    <div className="text-xs text-purple-600">({nightPercentage}%)</div>
                  </div>
                </div>

                {/* Total Staffing Summary */}
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-emerald-800">Total 24h Staffing</span>
                        <span className="text-xs text-emerald-600">Combined requirement</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-900">{totalStaffNeeded}</div>
                      <div className="text-xs text-emerald-600">staff per day</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}