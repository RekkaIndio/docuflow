"use client";
import React from "react";
import { Resident, ChartData } from "./types";

interface HistoricalTrendsChartProps {
  residents: Resident[];
  generateChartData: (residents: Resident[], months: number) => ChartData[];
}

export function HistoricalTrendsChart({
  residents,
  generateChartData
}: HistoricalTrendsChartProps) {
  return (
    <div className="group hover:shadow-xl transition-all duration-300 border border-teal-200/60 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-teal-100/50 mb-8">
      <div className="pb-3 border-b border-teal-100/80 bg-gradient-to-r from-teal-50/40 to-transparent rounded-t-2xl">
        <div className="flex items-center gap-2 p-4">
          <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2V6a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-teal-900">Trends Over Time</div>
        </div>
      </div>
      <div className="p-4">
        {(() => {
          const chartData = generateChartData(residents, 6);
          const maxValue = Math.max(...chartData.map(d => Math.max(d.ndpsScore, d.careHours, d.staffRequired)));

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Avg NDPS</div>
                  <div className="text-lg font-bold text-blue-900">
                    {chartData.length > 0 ? chartData[chartData.length - 1].ndpsScore : 0}
                  </div>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                  <div className="text-sm font-medium text-emerald-800">Care Hours</div>
                  <div className="text-lg font-bold text-emerald-900">
                    {chartData.length > 0 ? chartData[chartData.length - 1].careHours : 0}h
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-800">Staff Needed</div>
                  <div className="text-lg font-bold text-purple-900">
                    {chartData.length > 0 ? chartData[chartData.length - 1].staffRequired : 0}
                  </div>
                </div>
              </div>

              <div className="relative h-64 bg-gradient-to-t from-gray-50 to-white rounded-lg p-4 border border-gray-200">
                {/* Chart Grid Lines */}
                <div className="absolute inset-4">
                  {[0, 25, 50, 75, 100].map(percent => (
                    <div
                      key={percent}
                      className="absolute w-full border-t border-gray-200"
                      style={{ bottom: `${percent}%` }}
                    >
                      <span className="absolute -left-8 -top-2 text-xs text-gray-500">{Math.round(maxValue * percent / 100)}</span>
                    </div>
                  ))}
                </div>

                {/* Chart Data Points and Lines */}
                <div className="relative h-full flex items-end justify-between px-4">
                  {chartData.map((data, index) => {
                    const ndpsHeight = Math.max((data.ndpsScore / maxValue) * 100, 2);
                    const careHeight = Math.max((data.careHours / maxValue) * 100, 2);
                    const staffHeight = Math.max((data.staffRequired / maxValue) * 100, 2);

                    return (
                      <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                        {/* Data bars */}
                        <div className="flex items-end gap-1 h-48">
                          <div
                            className="w-3 bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                            style={{ height: `${ndpsHeight}%` }}
                            title={`NDPS: ${data.ndpsScore}`}
                          />
                          <div
                            className="w-3 bg-emerald-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                            style={{ height: `${careHeight}%` }}
                            title={`Care Hours: ${data.careHours}h`}
                          />
                          <div
                            className="w-3 bg-purple-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                            style={{ height: `${staffHeight}%` }}
                            title={`Staff: ${data.staffRequired}`}
                          />
                        </div>

                        {/* Month labels */}
                        <div className="text-xs text-gray-600 font-medium transform rotate-45 origin-center mt-2">
                          {data.date}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="absolute top-2 right-2 flex gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded"></div>
                    <span>NDPS</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded"></div>
                    <span>Care Hours</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded"></div>
                    <span>Staff</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-600 text-center">
                Historical data shows trends over the last 6 months with variation based on current resident profiles
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}