"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, UserCheck, RefreshCw, Clock, ArrowUp, ArrowDown } from 'lucide-react';
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
  // compute previous day values for trend (yesterday is the last item in weekData before today)
  const prevDay = weekData[weekData.length - 2] || { day: 0, night: 0 };
  const roundedAverageDay = Math.round(aggregateStaffingData.averageDay || 0);
  const roundedAverageNight = Math.round(aggregateStaffingData.averageNight || 0);

  // additional summaries
  const totalWeek = weekData.reduce((s, d) => s + d.total, 0);
  const avgPerDay = Math.round(totalWeek / Math.max(1, weekData.length));
  const peakDay = weekData.reduce((best, d) => (d.total > best.total ? d : best), weekData[0] || { date: '', total: 0, dayName: '' });

  const dayDiff = roundedAverageDay - prevDay.day;
  const nightDiff = roundedAverageNight - prevDay.night;
  const dayPct = prevDay.day > 0 ? Math.round((dayDiff / prevDay.day) * 100) : (dayDiff > 0 ? 100 : 0);
  const nightPct = prevDay.night > 0 ? Math.round((nightDiff / prevDay.night) * 100) : (nightDiff > 0 ? 100 : 0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="mb-10 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 drop-shadow-sm">
              Weekly Staffing Overview
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last 7 days staffing levels</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/60 backdrop-blur-sm border-gray-200/50 hover:bg-white/80 dark:bg-slate-800/60 dark:border-slate-700/50 dark:hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
              onClick={onRefresh}
              aria-label="Refresh staffing data"
              title="Refresh staffing data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="bg-white/40 backdrop-blur-sm border-gray-200/30 hover:bg-white/70 dark:bg-slate-800/40 dark:border-slate-700/30 dark:hover:bg-slate-800/70 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
              onClick={() => setIsModalOpen(true)}
              aria-label="Open staffing details"
              title="Open staffing details"
            >
              Details
            </Button>
          </div>

          {/* Timeframe buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={staffingTimeframe === 'day' ? 'default' : 'ghost'}
              onClick={() => onTimeframeChange('day')}
              className="px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
              aria-pressed={staffingTimeframe === 'day'}
              aria-label="View day staffing"
              title="View day staffing"
            >
              Day
            </Button>
            <Button
              size="sm"
              variant={staffingTimeframe === 'week' ? 'default' : 'ghost'}
              onClick={() => onTimeframeChange('week')}
              className="px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
              aria-pressed={staffingTimeframe === 'week'}
              aria-label="View week staffing"
              title="View week staffing"
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={staffingTimeframe === 'month' ? 'default' : 'ghost'}
              onClick={() => onTimeframeChange('month')}
              className="px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400"
              aria-pressed={staffingTimeframe === 'month'}
              aria-label="View month staffing"
              title="View month staffing"
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 dark:border-slate-700/40 bg-gradient-to-br from-white/80 via-indigo-50/60 to-white/85 dark:from-slate-800/80 dark:via-slate-900/60 dark:to-slate-800/85 backdrop-blur-xl shadow-2xl hover:shadow-[0_40px_120px_rgba(79,70,229,0.25)] transition-all duration-500">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/15 via-purple-400/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-300/25 rounded-full -mr-20 -mt-16 blur-2xl group-hover:bg-indigo-300/35 transition-colors duration-500"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-300/20 rounded-full -ml-16 -mb-14 blur-2xl"></div>

        <CardContent className="relative p-8 lg:p-10">
          {staffingLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-500"></div>
                <div className="text-gray-600 dark:text-gray-400">Loading staffing data...</div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Layout: two columns - main chart left, stacked cards right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: main chart (spans 2 columns on large screens) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Current Snapshot: combined Day + Night */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsModalOpen(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); }}
                      className="group/card relative overflow-hidden bg-gradient-to-br from-white/90 to-indigo-100/60 dark:from-slate-800/90 dark:to-slate-900/60 p-6 rounded-2xl border border-white/40 dark:border-slate-700/40 backdrop-blur-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-200/40 rounded-full -mr-8 -mt-8 blur-sm group-hover/card:bg-indigo-200/60 transition-colors duration-300"></div>
                      <div className="relative flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl group-hover/card:bg-indigo-500/20 transition-colors duration-300">
                          <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{aggregateStaffingData.totalDay + aggregateStaffingData.totalNight}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Staff Today</div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{aggregateStaffingData.totalDay} day • {aggregateStaffingData.totalNight} night</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="bg-white/75 dark:bg-slate-800/75 backdrop-blur-md p-4 rounded-xl border border-white/40 dark:border-slate-700/40 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Weekly total</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{weekData.reduce((s, d) => s + d.total, 0)}</div>
                          </div>
                          <div className="w-28 h-8">
                            {/* Inline sparkline SVG for totals */}
                            <svg viewBox={`0 0 ${weekData.length * 10} 20`} className="w-full h-full" preserveAspectRatio="none">
                              <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                points={weekData.map((d, i) => {
                                  const max = Math.max(...weekData.map(w => w.total), 1);
                                  const x = i * 10;
                                  const y = 20 - (d.total / max) * 18;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/75 dark:bg-slate-800/75 backdrop-blur-md p-4 rounded-xl border border-white/40 dark:border-slate-700/40 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Workspaces reporting</div>
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{aggregateStaffingData.workspacesWithData}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${((roundedAverageDay + roundedAverageNight) - (prevDay.day + prevDay.night)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {Math.abs(Math.round(((roundedAverageDay + roundedAverageNight) - (prevDay.day + prevDay.night)) / Math.max(1, prevDay.day + prevDay.night) * 100))}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">vs yesterday</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Chart */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Weekly Staffing Levels</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>Last 7 days</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-white/80 via-indigo-50/50 to-white/80 dark:from-slate-800/80 dark:via-slate-900/50 dark:to-slate-800/80 rounded-2xl p-8 border border-white/40 dark:border-slate-700/40 backdrop-blur-md">
                      {/* Chart Area */}
                      <div className="h-56 mb-6">
                        <div className="flex items-end justify-between h-44 gap-4">
                          {weekData.map((day, index) => {
                            const maxStaffing = Math.max(...weekData.map(d => Math.max(d.day, d.night)), 1);
                            const dayHeight = (day.day / maxStaffing) * 100;
                            const nightHeight = (day.night / maxStaffing) * 100;

                            return (
                              <div key={day.date} className="flex flex-col items-center flex-1 group/bar px-1">
                                {/* Value above bar: show total only to avoid repetition */}
                                <div className="mb-3 text-center">
                                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{day.total}</div>
                                </div>

                                {/* Bars */}
                                <div className="flex flex-col w-full max-w-20 justify-end h-32 gap-1">
                                  <div
                                    className="bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all duration-300 hover:from-indigo-600 hover:to-indigo-500 group-hover/bar:scale-110 w-full shadow-sm"
                                    style={{
                                      height: `${dayHeight}%`,
                                      minHeight: day.day > 0 ? '6px' : '0'
                                    }}
                                    title={`Day Staff: ${day.day} on ${day.dayName}`}
                                  />
                                  <div
                                    className="bg-gradient-to-t from-sky-500 to-sky-400 rounded-b transition-all duration-300 hover:from-sky-600 hover:to-sky-500 group-hover/bar:scale-110 w-full shadow-sm"
                                    style={{
                                      height: `${nightHeight}%`,
                                      minHeight: day.night > 0 ? '6px' : '0'
                                    }}
                                    title={`Night Staff: ${day.night} on ${day.dayName}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Days of the week at bottom with month/day */}
                        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                          {weekData.map((day) => (
                            <div key={day.date} className="flex-1 text-center">
                              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{day.dayName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{day.monthDay}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-8 mt-8 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-4 h-4 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded shadow-sm"></div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Day Staff</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-4 h-4 bg-gradient-to-t from-sky-500 to-sky-400 rounded shadow-sm"></div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Night Staff</span>
                        </div>
                      </div>

                      {/* Summary Stats */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalWeek}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Total This Week</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{avgPerDay}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Avg per day</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{aggregateStaffingData.workspacesWithData}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Workspaces</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: stacked cards */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <Card className="bg-white/75 dark:bg-slate-800/75 backdrop-blur-md p-4 shadow-md flex-1 border border-white/40 dark:border-slate-700/40">
                    <CardContent className="p-4 h-full flex flex-col justify-between">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Staffing Summary</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Averages and trends</p>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{roundedAverageDay}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-500">Average Day Staff</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {dayDiff >= 0 ? (
                              <ArrowUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <div className={`text-sm ${dayDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {Math.abs(dayPct)}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{roundedAverageNight}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-500">Average Night Staff</div>
                          </div>
                            <div className="flex items-center gap-2">
                            {nightDiff >= 0 ? (
                              <ArrowUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <div className={`text-sm ${nightDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {Math.abs(nightPct)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/75 dark:bg-slate-800/75 backdrop-blur-md p-4 shadow-md flex-1 border border-white/40 dark:border-slate-700/40">
                    <CardContent className="p-4 h-full flex flex-col justify-between">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workspaces</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Active workspaces and occupancy</p>
                      </div>
                      <div className="mt-4 text-center">
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{aggregateStaffingData.workspacesWithData}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">Workspaces with data</div>
                      </div>
                    </CardContent>
                  </Card>
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