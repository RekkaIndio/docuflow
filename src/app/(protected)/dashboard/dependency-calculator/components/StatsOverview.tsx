"use client";
import React, { useState } from "react";
import { Resident } from "./types";

interface StatsOverviewProps {
  residents: Resident[];
  calculateNDPSScore: (resident: Resident) => number;
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number };
  calculateNDPSStaffing: (residents: Resident[]) => { Day: number; Night: number };
  calculateStaffBreakdown: (
    residents: Resident[],
    options?: { includeNurses?: boolean }
  ) => { 
    Day: { nurses: number; ctms: number; carers: number; total: number }; 
    Night: { nurses: number; ctms: number; carers: number; total: number } 
  };
  openAddModal?: () => void;
}

// Helper function to get NDPS band from score (based on 100-point scale)
function getNDPSBand(score: number): { band: number; name: string } {
  if (score <= 20) return { band: 1, name: "Low Dependency" };
  if (score <= 40) return { band: 2, name: "Moderate Dependency" };
  if (score <= 60) return { band: 3, name: "High Dependency" };
  if (score <= 80) return { band: 4, name: "Very High Dependency" };
  return { band: 5, name: "Maximum Dependency" };
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
  const [includeNurses, setIncludeNurses] = useState(true);
  const [staffView, setStaffView] = useState<'total' | 'shift'>('total');
  return (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {/* Total Residents */}
      <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
        <div className="p-3 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-base font-semibold text-white">Total Residents</div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-white mb-1">{residents.length}</div>
              <div className="text-xs text-blue-100 uppercase tracking-wide">Active assessments</div>
            </div>
            
            {/* Resident Status Breakdown */}
            <div className="space-y-1.5 mb-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-200">High Dependency</span>
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
                <span className="text-xs text-blue-200">Low Dependency</span>
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
                className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm"
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
        <div className="p-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-base font-semibold text-white">Banding Key</div>
            </div>
            <button
              onClick={() => setShowBandInfo(true)}
              className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors duration-200"
              title="More information about bands"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-2.5 mb-3 text-sm">
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
            
            <div className="pt-2 border-t border-white/20">
              <div className="text-xs text-emerald-100 font-medium text-center">NDPS Dependency Bands</div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Ratios */}
      <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
        <div className="p-3 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-base font-semibold text-white">Staff Ratios</div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-3 text-center mb-3">
              <div className="bg-white/10 rounded-lg p-2.5">
                <div className="text-xl font-bold text-white mb-1">
                  {(() => {
                    const dayStaff = calculateNDPSStaffing(residents).Day;
                    return residents.length > 0 && dayStaff > 0 ? (Math.round((residents.length / dayStaff) * 100) / 100) : 0;
                  })()}:1
                </div>
                <div className="text-xs text-purple-200 font-medium">Day Ratio</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5">
                <div className="text-xl font-bold text-white mb-1">
                  {(() => {
                    const nightStaff = calculateNDPSStaffing(residents).Night;
                    return residents.length > 0 && nightStaff > 0 ? (Math.round((residents.length / nightStaff) * 100) / 100) : 0;
                  })()}:1
                </div>
                <div className="text-xs text-purple-200 font-medium">Night Ratio</div>
              </div>
            </div>
            
            {/* Additional Ratio Information */}
            <div className="space-y-1.5 text-sm">
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
        <div className="pb-2.5">
          <div className="flex items-center gap-2 p-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="text-base font-semibold text-white mb-1">Staff Required</div>
            <div className="ml-auto flex items-center gap-2">
              <div className="bg-white/10 rounded-full flex text-xs font-semibold overflow-hidden border border-white/20">
                <button
                  type="button"
                  onClick={() => setStaffView('total')}
                  className={`px-2.5 py-0.5 transition-colors duration-200 ${
                    staffView === 'total' ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'
                  }`}
                  aria-pressed={staffView === 'total'}
                >
                  24h
                </button>
                <button
                  type="button"
                  onClick={() => setStaffView('shift')}
                  className={`px-2.5 py-0.5 transition-colors duration-200 ${
                    staffView === 'shift' ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'
                  }`}
                  aria-pressed={staffView === 'shift'}
                >
                  12h
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIncludeNurses((prev) => !prev)}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-colors duration-200 ${
                  includeNurses ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
                aria-pressed={includeNurses}
              >
                Nurses {includeNurses ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
        <div className="p-3">
          {(() => {
            const breakdown = calculateStaffBreakdown(residents, { includeNurses });
            const showNurses = includeNurses;
            const totals = {
              nurses: breakdown.Day.nurses + breakdown.Night.nurses,
              ctms: breakdown.Day.ctms + breakdown.Night.ctms,
              carers: breakdown.Day.carers + breakdown.Night.carers,
              total: breakdown.Day.total + breakdown.Night.total,
            };
            if (staffView === 'total') {
              const totalStats = [
                showNurses ? { key: 'nurses', value: totals.nurses, label: 'Nurses (24h)' } : null,
                { key: 'ctms', value: totals.ctms, label: 'CTMs (24h)' },
                { key: 'carers', value: totals.carers, label: 'Carers (24h)' },
              ].filter(Boolean) as { key: string; value: number; label: string }[];

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5 text-center text-sm">
                    {totalStats.map((stat) => (
                      <div key={stat.key} className="bg-white/10 rounded-lg p-2">
                        <div className="text-sm font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-amber-200">{stat.label}</div>
                      </div>
                    ))}
                    <div className="bg-white/10 rounded-lg p-2 col-span-2">
                      <div className="text-base font-bold text-white">{totals.total}</div>
                      <div className="text-xs text-amber-200 font-medium">Total Staff (24h){includeNurses ? '' : ' • Nurses off'}</div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5 text-center text-sm">
                  {showNurses && (
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Day.nurses}</div>
                      <div className="text-xs text-amber-200">Nurses (Day)</div>
                    </div>
                  )}
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">{breakdown.Day.ctms}</div>
                    <div className="text-xs text-amber-200">CTMs (Day)</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">{breakdown.Day.carers}</div>
                    <div className="text-xs text-amber-200">Carers (Day)</div>
                  </div>
                  <div className={`bg-white/10 rounded-lg p-2 ${showNurses ? '' : 'col-span-2'}`}>
                    <div className="text-sm font-bold text-white">{breakdown.Day.total}</div>
                    <div className="text-xs text-amber-200">Total (Day)</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-center text-sm">
                  {showNurses && (
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="text-sm font-bold text-white">{breakdown.Night.nurses}</div>
                      <div className="text-xs text-amber-200">Nurses (Night)</div>
                    </div>
                  )}
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">{breakdown.Night.ctms}</div>
                    <div className="text-xs text-amber-200">CTMs (Night)</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <div className="text-sm font-bold text-white">{breakdown.Night.carers}</div>
                    <div className="text-xs text-amber-200">Carers (Night)</div>
                  </div>
                  <div className={`bg-white/10 rounded-lg p-2 ${showNurses ? '' : 'col-span-2'}`}>
                    <div className="text-sm font-bold text-white">{breakdown.Night.total}</div>
                    <div className="text-xs text-amber-200">Total (Night)</div>
                  </div>
                </div>
              </div>
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
                    <span className="font-semibold text-green-800">Band 1: Low Dependency</span>
                  </div>
                  <p className="text-sm text-green-700 mb-1">NPDS Score: 0-20</p>
                  <p className="text-sm text-green-600">Minimal assistance - prompt/supervision or occasional help of 1 person</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-blue-800">Band 2: Moderate Dependency</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-1">NPDS Score: 21-40</p>
                  <p className="text-sm text-blue-600">Regular assistance of 1 person for most daily tasks</p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="font-semibold text-yellow-800">Band 3: High Dependency</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-1">NPDS Score: 41-60</p>
                  <p className="text-sm text-yellow-600">Full assistance of 1 person or assistance of 2 for some tasks</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="font-semibold text-orange-800">Band 4: Very High Dependency</span>
                  </div>
                  <p className="text-sm text-orange-700 mb-1">NPDS Score: 61-80</p>
                  <p className="text-sm text-orange-600">Assistance of 2 people for most tasks; complex care needs</p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="font-semibold text-red-800">Band 5: Maximum Dependency</span>
                  </div>
                  <p className="text-sm text-red-700 mb-1">NPDS Score: 81-100</p>
                  <p className="text-sm text-red-600">Full assistance of 2+ people for all tasks; extensive medical/nursing needs</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> This system uses NPDS methodology (0-5 scale per item) extended with Therapy needs. Total score: BCN (60) + SNN (25) + Therapy (15) = 100 points maximum.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}