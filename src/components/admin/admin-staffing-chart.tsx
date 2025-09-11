"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, UserCheck } from 'lucide-react';

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

  return (
    <Card className="border-l-4 border-l-green-500 mb-8">
      <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-semibold text-white">Weekly Staffing Overview</div>
              <div className="text-sm text-slate-300">Last 7 days staffing levels</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-white border-white/20 hover:bg-white/10"
              onClick={onRefresh}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {staffingLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-muted-foreground">Loading staffing data...</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">{aggregateStaffingData.totalDay}</div>
                <div className="text-sm text-amber-600 font-medium">Day Staff Today</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{aggregateStaffingData.totalNight}</div>
                <div className="text-sm text-blue-600 font-medium">Night Staff Today</div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Weekly Staffing Levels</h4>
              
              <div className="bg-gray-50 rounded-lg p-6">
                {/* Chart Area */}
                <div className="h-48 mb-4">
                  <div className="flex items-end justify-between h-40 gap-4">
                    {weekData.map((day, index) => {
                      const maxStaffing = Math.max(...weekData.map(d => Math.max(d.day, d.night)), 1);
                      const dayHeight = (day.day / maxStaffing) * 100;
                      const nightHeight = (day.night / maxStaffing) * 100;
                      
                      return (
                        <div key={day.date} className="flex flex-col items-center flex-1">
                          {/* Values above bars */}
                          <div className="mb-2 space-y-1 text-center">
                            <div className="text-xs font-semibold text-amber-700">{day.day}</div>
                            <div className="text-xs font-semibold text-blue-700">{day.night}</div>
                          </div>
                          
                          {/* Bars */}
                          <div className="flex flex-col w-full max-w-12 justify-end h-32 gap-1">
                            <div 
                              className="bg-amber-500 rounded transition-all duration-300 hover:bg-amber-600 w-full"
                              style={{ 
                                height: `${dayHeight}%`, 
                                minHeight: day.day > 0 ? '4px' : '0' 
                              }}
                              title={`Day Staff: ${day.day} on ${day.dayName}`}
                            />
                            <div 
                              className="bg-blue-500 rounded transition-all duration-300 hover:bg-blue-600 w-full"
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
                  <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
                    {weekData.map((day) => (
                      <div key={day.date} className="flex-1 text-center">
                        <div className="text-sm font-medium text-gray-700">{day.dayName}</div>
                        <div className="text-xs text-gray-500 mt-1">{day.monthDay}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span className="font-medium">Day Staff</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="font-medium">Night Staff</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}