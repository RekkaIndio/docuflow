"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, UserCheck, RefreshCw, Clock } from 'lucide-react';
import AdminStaffingModal from './admin-staffing-modal';
import { useState } from 'react';

interface AdminStaffingChartProps {
  aggregateStaffingData: {
    totalDay: number;
    totalNight: number;
    averageDay: number;
    averageNight: number;
    workspacesWithData: number;
  };
  staffingHistory: Array<{ date: string; day: number; night: number; total: number }>;
  staffingTimeframe: 'day' | 'week' | 'month';
  staffingLoading: boolean;
  workspaceCount: number;
  onTimeframeChange: (timeframe: 'day' | 'week' | 'month') => void;
  onRefresh: () => void;
}

export default function AdminStaffingChart({
  aggregateStaffingData,
  staffingHistory,
  staffingTimeframe,
  staffingLoading,
  workspaceCount,
  onTimeframeChange,
  onRefresh
}: AdminStaffingChartProps) {
  // Generate week data (last 7 days) using real aggregated staffing data
  const generateWeekData = () => {
    const today = new Date();
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Find matching data from staffingHistory (real aggregated data)
      const existingData = staffingHistory.find(h =>
        new Date(h.date).toDateString() === date.toDateString()
      );

      weekData.push({
        date: date.toISOString().split('T')[0],
        day: existingData?.day || 0, // Use real data or 0
        night: existingData?.night || 0, // Use real data or 0
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: (existingData?.day || 0) + (existingData?.night || 0),
        hasData: !!existingData
      });
    }

    return weekData;
  };

  const weekData = generateWeekData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="mb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Weekly Staffing Overview
            </h2>
            <p className="text-sm text-gray-600">Last 7 days staffing levels</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/60 backdrop-blur-sm border-gray-200/50 hover:bg-white/80 transition-all duration-300"
              onClick={onRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="bg-white/40 backdrop-blur-sm border-gray-200/30 hover:bg-white/70 transition-all duration-300"
              onClick={() => setIsModalOpen(true)}
            >
              Details
            </Button>
          </div>
        </div>
      </div>

      <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-green-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full -ml-12 -mb-12"></div>

        <CardContent className="relative p-8">
          {staffingLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <div className="text-gray-600">Loading staffing data...</div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Current Totals */}
              <div className="grid grid-cols-2 gap-6">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsModalOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); }}
                  className="group/card relative overflow-hidden bg-gradient-to-br from-amber-50 via-amber-25 to-amber-50/50 p-6 rounded-2xl border border-amber-200/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/30 rounded-full -mr-8 -mt-8 group-hover/card:bg-amber-100/40 transition-colors duration-300"></div>
                  <div className="relative flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl group-hover/card:bg-amber-500/20 transition-colors duration-300">
                      <Users className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-700">{aggregateStaffingData.totalDay}</div>
                      <div className="text-sm text-amber-600 font-medium">Day Staff Today</div>
                      <div className="text-xs text-amber-500 mt-1">Active shifts</div>
                    </div>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsModalOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); }}
                  className="group/card relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-25 to-blue-50/50 p-6 rounded-2xl border border-blue-200/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100/30 rounded-full -mr-8 -mt-8 group-hover/card:bg-blue-100/40 transition-colors duration-300"></div>
                  <div className="relative flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover/card:bg-blue-500/20 transition-colors duration-300">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-700">{aggregateStaffingData.totalNight}</div>
                      <div className="text-sm text-blue-600 font-medium">Night Staff Today</div>
                      <div className="text-xs text-blue-500 mt-1">Active shifts</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-semibold text-gray-900">Weekly Staffing Levels</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Last 7 days</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-8 border border-gray-200/50">
                  {/* Chart Area */}
                  <div className="h-48 mb-6">
                    <div className="flex items-end justify-between h-40 gap-4">
                      {weekData.map((day, index) => {
                        const maxStaffing = Math.max(...weekData.map(d => Math.max(d.day, d.night)), 1);
                        const dayHeight = (day.day / maxStaffing) * 100;
                        const nightHeight = (day.night / maxStaffing) * 100;

                        return (
                          <div key={day.date} className="flex flex-col items-center flex-1 group/bar">
                            {/* Values above bars */}
                            <div className="mb-3 space-y-1 text-center">
                              <div className="text-sm font-bold text-amber-700">{day.day}</div>
                              <div className="text-sm font-bold text-blue-700">{day.night}</div>
                            </div>

                            {/* Bars */}
                            <div className="flex flex-col w-full max-w-12 justify-end h-32 gap-1">
                              <div
                                className="bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all duration-300 hover:from-amber-600 hover:to-amber-500 group-hover/bar:scale-110 w-full shadow-sm"
                                style={{
                                  height: `${dayHeight}%`,
                                  minHeight: day.day > 0 ? '4px' : '0'
                                }}
                                title={`Day Staff: ${day.day} on ${day.dayName}`}
                              />
                              <div
                                className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-b transition-all duration-300 hover:from-blue-600 hover:to-blue-500 group-hover/bar:scale-110 w-full shadow-sm"
                                style={{
                                  height: `${nightHeight}%`,
                                  minHeight: day.night > 0 ? '4px' : '0'
                                }}
                                title={`Night Staff: ${day.night} on ${day.dayName}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Days of the week at bottom with month/day */}
                    <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                      {weekData.map((day) => (
                        <div key={day.date} className="flex-1 text-center">
                          <div className="text-sm font-semibold text-gray-700">{day.dayName}</div>
                          <div className="text-xs text-gray-500 mt-1">{day.monthDay}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-8 mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-4 h-4 bg-gradient-to-t from-amber-500 to-amber-400 rounded shadow-sm"></div>
                      <span className="font-semibold text-gray-700">Day Staff</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-4 h-4 bg-gradient-to-t from-blue-500 to-blue-400 rounded shadow-sm"></div>
                      <span className="font-semibold text-gray-700">Night Staff</span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {weekData.reduce((sum, day) => sum + day.day, 0)}
                        </div>
                        <div className="text-xs text-gray-600">Total Day Staff</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {weekData.reduce((sum, day) => sum + day.night, 0)}
                        </div>
                        <div className="text-xs text-gray-600">Total Night Staff</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {aggregateStaffingData.workspacesWithData}
                        </div>
                        <div className="text-xs text-gray-600">Workspaces</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <AdminStaffingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aggregateStaffingData={aggregateStaffingData}
        workspaces={[]}
        occupancyBreakdown={weekData.map(d => ({ date: d.date, occupancy: Math.round((d.total / Math.max(1, aggregateStaffingData.totalDay + aggregateStaffingData.totalNight)) * 100) }))}
      />
    </div>
  );
}