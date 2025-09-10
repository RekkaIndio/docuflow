"use client";
import React from "react";
import { Resident } from "./types";

interface NDPSBandChartProps {
  residents: Resident[];
  calculateNDPSScore: (resident: Resident) => number;
  getNDPSBand: (score: number) => { band: number; name: string };
}

export function NDPSBandChart({
  residents,
  calculateNDPSScore,
  getNDPSBand
}: NDPSBandChartProps) {
  return (
    <div className="group hover:shadow-xl transition-all duration-300 border border-indigo-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-indigo-100/50">
      <div className="pb-3 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/40 to-transparent rounded-t-2xl">
        <div className="flex items-center gap-2 p-4">
          <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-indigo-900">NDPS Band Distribution</div>
        </div>
      </div>
      <div className="p-4">
        {(() => {
          const bandCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          residents.forEach(r => {
            const score = calculateNDPSScore(r);
            const band = getNDPSBand(score).band;
            bandCounts[band as keyof typeof bandCounts]++;
          });
          const total = residents.length || 1;
          const bands = [
            { band: 1, name: "Independent", count: bandCounts[1], color: "bg-green-500", bgColor: "bg-green-50" },
            { band: 2, name: "Low Dependency", count: bandCounts[2], color: "bg-blue-500", bgColor: "bg-blue-50" },
            { band: 3, name: "Medium Dependency", count: bandCounts[3], color: "bg-yellow-500", bgColor: "bg-yellow-50" },
            { band: 4, name: "High Dependency", count: bandCounts[4], color: "bg-orange-500", bgColor: "bg-orange-50" },
            { band: 5, name: "Very High Dependency", count: bandCounts[5], color: "bg-red-500", bgColor: "bg-red-50" }
          ];

          return (
            <div className="space-y-3">
              {bands.map(band => {
                const percentage = Math.round((band.count / total) * 100);
                return (
                  <div key={band.band} className={`p-3 rounded-lg ${band.bgColor} border border-opacity-20`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${band.color}`}></div>
                        <span className="text-sm font-medium text-gray-800">Band {band.band}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{band.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${band.color} h-2 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{band.name}</div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}