"use client";
import React, { useState } from "react";
import { Resident } from "./types";

interface StatsOverviewProps {
  residents: Resident[];
  calculateNDPSScore: (resident: Resident) => number;
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number };
  calculateNDPSStaffing: (residents: Resident[]) => { Day: number; Night: number };
  calculateStaffBreakdown: (residents: Resident[]) => { 
    Day: { nurses: number; ctms: number; carers: number; total: number }; 
    Night: { nurses: number; ctms: number; carers: number; total: number } 
  };
  openAddModal?: () => void;
}

// Helper function to get NDPS band from score
function getNDPSBand(score: number): { band: number; name: string } {
  if (score <= 5) return { band: 1, name: "Independent" };
  if (score <= 10) return { band: 2, name: "Low Dependency" };
  if (score <= 15) return { band: 3, name: "Medium Dependency" };
  if (score <= 20) return { band: 4, name: "High Dependency" };
  return { band: 5, name: "Very High Dependency" };
}

export function StatsOverview({
  residents,
  calculateNDPSScore,
  calculateResidentCareMinutes,
  calculateNDPSStaffing,
  calculateStaffBreakdown,
  openAddModal
}: StatsOverviewProps) {
  const [showBandInfo, setShowBandInfo] = useState(false);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
      {/* Total Residents */}
      <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-lg font-bold text-white">Total Residents</div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-white mb-2">{residents.length}</div>
              <div className="text-sm text-blue-100">Active assessments</div>
            </div>
            
            {/* Resident Status Breakdown */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-200">High Dependency:</span>
                <span className="text-sm font-semibold text-white">
                  {residents.filter(r => {
                    const score = calculateNDPSScore(r);
                    const band = getNDPSBand(score).band;
                    return band >= 4;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-200">Medium Dependency:</span>
                <span className="text-sm font-semibold text-white">
                  {residents.filter(r => {
                    const score = calculateNDPSScore(r);
                    const band = getNDPSBand(score).band;
                    return band === 3;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-200">Low Dependency:</span>
                <span className="text-sm font-semibold text-white">
                  {residents.filter(r => {
                    const score = calculateNDPSScore(r);
                    const band = getNDPSBand(score).band;
                    return band <= 2;
                  }).length}
                </span>
              </div>
            </div>
            
            {openAddModal && (
              <button
                onClick={openAddModal}
                className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Resident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NDPS Banding Key */}
      <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-lg font-bold text-white">Banding Key</div>
            </div>
            <button
              onClick={() => setShowBandInfo(true)}
              className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200"
              title="More information about bands"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-100">Band 1</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {residents.filter(r => getNDPSBand(calculateNDPSScore(r)).band === 1).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-100">Band 2</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {residents.filter(r => getNDPSBand(calculateNDPSScore(r)).band === 2).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-100">Band 3</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {residents.filter(r => getNDPSBand(calculateNDPSScore(r)).band === 3).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-300 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-100">Band 4</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {residents.filter(r => getNDPSBand(calculateNDPSScore(r)).band === 4).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-100">Band 5</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {residents.filter(r => getNDPSBand(calculateNDPSScore(r)).band === 5).length}
                </span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-white/20">
              <div className="text-xs text-emerald-100 font-medium text-center">NDPS Dependency Bands</div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Ratios */}
      <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-lg font-bold text-white">Staff Ratios</div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-white mb-1">
                  {(() => {
                    const dayStaff = calculateNDPSStaffing(residents).Day;
                    return residents.length > 0 && dayStaff > 0 ? (Math.round((residents.length / dayStaff) * 100) / 100) : 0;
                  })()}:1
                </div>
                <div className="text-xs text-purple-200 font-medium">Day Ratio</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-white mb-1">
                  {(() => {
                    const nightStaff = calculateNDPSStaffing(residents).Night;
                    return residents.length > 0 && nightStaff > 0 ? (Math.round((residents.length / nightStaff) * 100) / 100) : 0;
                  })()}:1
                </div>
                <div className="text-xs text-purple-200 font-medium">Night Ratio</div>
              </div>
            </div>
            
            {/* Additional Ratio Information */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-200">Total Care Hours:</span>
                <span className="text-sm font-semibold text-white">
                  {Math.round(residents.reduce((total, r) => {
                    const care = calculateResidentCareMinutes(r);
                    return total + (care.Day + care.Night) / 60;
                  }, 0))}h
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-200">Avg. Care/Resident:</span>
                <span className="text-sm font-semibold text-white">
                  {residents.length > 0 ? Math.round((residents.reduce((total, r) => {
                    const care = calculateResidentCareMinutes(r);
                    return total + (care.Day + care.Night) / 60;
                  }, 0) / residents.length) * 10) / 10 : 0}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Staff */}
      <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
        <div className="pb-3">
          <div className="flex items-center gap-2 p-4">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="text-lg font-bold text-white mb-2">Staff Required</div>
          </div>
        </div>
        <div className="p-4">
          {(() => {
            const breakdown = calculateStaffBreakdown(residents);
            return (
              <>
                {/* Day Shift Breakdown (no nurses) */}
                <div className="mb-3">
                  <div className="text-sm font-semibold text-amber-200 mb-2">Day Shift</div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Day.ctms}</div>
                      <div className="text-xs text-amber-200">CTMs</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Day.carers}</div>
                      <div className="text-xs text-amber-200">Carers</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Day.total}</div>
                      <div className="text-xs text-amber-200">Total</div>
                    </div>
                  </div>
                </div>

                {/* Night Shift Breakdown (no nurses) */}
                <div className="mb-3">
                  <div className="text-sm font-semibold text-amber-200 mb-2">Night Shift</div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Night.ctms}</div>
                      <div className="text-xs text-amber-200">CTMs</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Night.carers}</div>
                      <div className="text-xs text-amber-200">Carers</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Night.total}</div>
                      <div className="text-xs text-amber-200">Total</div>
                    </div>
                  </div>
                </div>

                {/* Overall Totals */}
                <div className="pt-2 border-t border-white/20">
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">
                      {breakdown.Day.total + breakdown.Night.total}
                    </div>
                    <div className="text-xs text-amber-200 font-medium">Total Staff (24h)</div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* NDPS Band Information Modal */}
      {showBandInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Banding System</h3>
                <button
                  onClick={() => setShowBandInfo(false)}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-800">Band 1: Independent</span>
                  </div>
                  <p className="text-sm text-green-700">No assistance required</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-blue-800">Band 2: Low Dependency</span>
                  </div>
                  <p className="text-sm text-blue-700">Prompt/supervision/occasional assistance of 1</p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="font-semibold text-yellow-800">Band 3: Medium Dependency</span>
                  </div>
                  <p className="text-sm text-yellow-700">Full assistance of 1 for all of the task and can not complete any of the task independently</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="font-semibold text-orange-800">Band 4: High Dependency</span>
                  </div>
                  <p className="text-sm text-orange-700">Assistance of 2 required but can complete some of the task with prompt/encouragement</p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="font-semibold text-red-800">Band 5: Very High Dependency</span>
                  </div>
                  <p className="text-sm text-red-700">Full assistance of 2 and can not complete any of the task</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> The NDPS (National Dependency Projection System) provides an evidence-based approach to assessing resident dependency levels and calculating required staffing ratios.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}