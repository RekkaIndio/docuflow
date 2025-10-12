"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Clock, Target } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { getWorkspaceCollectionRef } from '@/lib/firestore';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';
import { db } from '@/lib/firebase';
import { format, startOfWeek, addDays } from 'date-fns';

interface StaffingTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  organisationId?: string | null;
}

interface StaffingEntry {
  id: string;
  staffingDay: number;
  staffingNight: number;
  staffingTeams?: any;
  // optional hour estimates derived from rotas when available
  staffingDayHours?: number;
  staffingNightHours?: number;
  totalHours?: number;
  createdAt: Date;
  recordedAt: Date;
}

const StaffingTrendsModal = ({ isOpen, onClose, workspaceId, organisationId }: StaffingTrendsModalProps) => {
  const [staffingHistory, setStaffingHistory] = useState<StaffingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Load staffing history
  useEffect(() => {
    if (!workspaceId || !isOpen) return;
    let unsub: any = null;

    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

        // Try rotas first
        const rotaEntries = await fetchRotaEntries(startDate, now);
        if (rotaEntries.length > 0) {
          setStaffingHistory(rotaEntries);
          setLoading(false);
          return;
        }

        // If no rotas, subscribe to daily-checkins
        const orgId = organisationId ?? null;
        const colRef = getWorkspaceCollectionRef(workspaceId, 'daily-checkins', orgId);
        if (!colRef) {
          setLoading(false);
          return;
        }

        const q = query(
          colRef,
          where('createdAt', '>=', startDate),
          orderBy('createdAt', 'desc')
        );

        unsub = onSnapshot(q, (snap) => {
          const entries = snap.docs.map((d: any) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt),
            recordedAt: d.data().recordedAt?.toDate?.() || new Date(d.data().recordedAt)
          })) as StaffingEntry[];

          setStaffingHistory(entries);
          setLoading(false);
        }, (err) => {
          console.error('Failed to load staffing history', err);
          // If we've been denied permission to read daily-checkins, attempt rota-derived entries as fallback
          if ((err && (err.code === 'permission-denied' || String(err).toLowerCase().includes('insufficient permissions'))) && !permissionDenied) {
            setPermissionDenied(true);
            fetchRotaEntries(startDate, now).then(entries => {
              if (entries.length > 0) setStaffingHistory(entries);
            }).catch(e => console.error('Rota fallback failed', e)).finally(() => setLoading(false));
          } else {
            setLoading(false);
          }
        });
      } catch (e) {
        console.error('Failed to set up staffing history listener', e);
        setLoading(false);
      }
    };

    load();

    return () => {
      if (unsub) unsub();
    };
  }, [workspaceId, isOpen, selectedPeriod]);

  // Helper: calculate hours between two HH:mm strings (handles overnight)
  function calculateShiftHours(startTime?: string, endTime?: string) {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    if (Number.isNaN(sH) || Number.isNaN(sM) || Number.isNaN(eH) || Number.isNaN(eM)) return 0;
    let hours = eH - sH;
    let minutes = eM - sM;
    if (hours < 0) hours += 24;
    const total = hours + (minutes / 60);
    return isNaN(total) ? 0 : total;
  }

  // Rota-derived fallback: fetch rota docs covering the requested period and synthesise staffing entries
  const fetchRotaEntries = async (startDate: Date, endDate: Date): Promise<StaffingEntry[]> => {
    if (!workspaceId) return [];
    setFallbackLoading(true);
    try {
      const firstWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
      const weeks: string[] = [];
      for (let d = new Date(firstWeekStart); d <= endDate; d = addDays(d, 7)) {
        weeks.push(format(d, 'yyyy-MM-dd'));
      }

      const entriesMap: Record<string, { date: string; staffingDay: number; staffingNight: number; dayHours: number; nightHours: number; createdAt: Date; recordedAt: Date }> = {};

      for (const wk of weeks) {
        try {
          const rotaRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId ?? null), 'rotas', wk);
          const rotaSnap = await getDoc(rotaRef as any);
          if (!rotaSnap.exists()) continue;
          const rotaData: any = rotaSnap.data();
          const shifts = rotaData.shifts || [];

          shifts.forEach((shift: any) => {
            const date = shift.date;
            if (!date) return;
            if (!entriesMap[date]) {
              entriesMap[date] = { date, staffingDay: 0, staffingNight: 0, dayHours: 0, nightHours: 0, createdAt: new Date(date), recordedAt: new Date(date) };
            }
            const startTime = shift.startTime;
            const endTime = shift.endTime;
            const hours = calculateShiftHours(startTime, endTime);
            if (startTime) {
              const startHour = parseInt((startTime || '').split(':')[0] || '0', 10);
              if (!Number.isNaN(startHour) && startHour >= 6 && startHour < 18) {
                entriesMap[date].staffingDay += 1;
                entriesMap[date].dayHours += hours;
              } else {
                entriesMap[date].staffingNight += 1;
                entriesMap[date].nightHours += hours;
              }
            } else {
              entriesMap[date].staffingDay += 1;
              entriesMap[date].dayHours += hours;
            }
          });
        } catch (e) {
          console.warn('Failed to fetch rota for week', wk, e);
        }
      }

      const entries = Object.values(entriesMap)
        .map(e => ({
          id: e.date,
          staffingDay: e.staffingDay,
          staffingNight: e.staffingNight,
          staffingDayHours: Math.round(e.dayHours * 100) / 100,
          staffingNightHours: Math.round(e.nightHours * 100) / 100,
          totalHours: Math.round((e.dayHours + e.nightHours) * 100) / 100,
          staffingTeams: undefined,
          createdAt: e.createdAt,
          recordedAt: e.recordedAt
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return entries;
    } finally {
      setFallbackLoading(false);
    }
  };

  const calculateStats = () => {
    if (staffingHistory.length === 0) return null;

    const dayStaffing = staffingHistory.map(entry => entry.staffingDay || 0);
    const nightStaffing = staffingHistory.map(entry => entry.staffingNight || 0);
    const totalHoursArray = staffingHistory.map(e => e.totalHours || 0);
    const totalStaffing = staffingHistory.map(entry => (entry.staffingDay || 0) + (entry.staffingNight || 0));

    const avgDay = dayStaffing.reduce((a, b) => a + b, 0) / dayStaffing.length;
    const avgNight = nightStaffing.reduce((a, b) => a + b, 0) / nightStaffing.length;
    const avgTotal = totalStaffing.reduce((a, b) => a + b, 0) / totalStaffing.length;

    const latest = staffingHistory[0];
    const previous = staffingHistory[1];
    const dayTrend = previous ? ((latest.staffingDay - previous.staffingDay) / previous.staffingDay) * 100 : 0;
    const nightTrend = previous ? ((latest.staffingNight - previous.staffingNight) / previous.staffingNight) * 100 : 0;
    const totalTrend = previous ? (((latest.staffingDay + latest.staffingNight) - (previous.staffingDay + previous.staffingNight)) / (previous.staffingDay + previous.staffingNight)) * 100 : 0;

    const minTotal = Math.min(...totalStaffing);
    const maxTotal = Math.max(...totalStaffing);

    return {
      avgDay: Math.round(avgDay),
      avgNight: Math.round(avgNight),
      avgTotal: Math.round(avgTotal),
      avgHours: Math.round((totalHoursArray.reduce((a, b) => a + b, 0) / (totalHoursArray.length || 1)) * 100) / 100,
      dayTrend,
      nightTrend,
      totalTrend,
      minTotal,
      maxTotal,
      latest,
      totalEntries: staffingHistory.length
    };
  };

  const stats = calculateStats();

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-green-600';
    if (trend < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl p-0 max-h-[90vh] overflow-hidden">
        {/* Dark hero header to match dashboard style */}
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Staffing Trends & Analytics</DialogTitle>
                <DialogDescription className="text-slate-300 text-sm mt-1">Monitor staffing patterns and trends over time</DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-b-lg border-0 shadow-none max-h-[calc(90vh-120px)] overflow-y-auto">
          <CardContent className="p-6">
            <div className="space-y-6">
              {permissionDenied && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                  We couldn't read daily staffing records due to permissions. Showing rota-derived estimates where available.
                  <Button size="sm" variant="default" className="ml-3" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-rotas'))}>
                    View rotas
                  </Button>
                </div>
              )}
              {/* Period Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Period:</span>
                <div className="flex gap-1">
                  {[
                    { key: '7d', label: '7 Days' },
                    { key: '30d', label: '30 Days' },
                    { key: '90d', label: '90 Days' }
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={selectedPeriod === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPeriod(key as any)}
                      className={selectedPeriod === key ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-300 hover:bg-gray-50'}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading staffing data...</p>
                </div>
              ) : (permissionDenied && fallbackLoading) ? (
                <div className="text-center py-8 text-gray-600">Loading rota-derived estimates...</div>
              ) : stats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Target className="h-4 w-4 text-blue-600" />
                          Average Day Shift
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats.avgDay}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(stats.dayTrend)}
                          <span className={`text-sm ${getTrendColor(stats.dayTrend)}`}>
                            {stats.dayTrend > 0 ? '+' : ''}{stats.dayTrend.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Target className="h-4 w-4 text-blue-600" />
                          Average Night Shift
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats.avgNight}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(stats.nightTrend)}
                          <span className={`text-sm ${getTrendColor(stats.nightTrend)}`}>
                            {stats.nightTrend > 0 ? '+' : ''}{stats.nightTrend.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Users className="h-4 w-4 text-blue-600" />
                          Average Total Staff
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats.avgTotal}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(stats.totalTrend)}
                          <span className={`text-sm ${getTrendColor(stats.totalTrend)}`}>
                            {stats.totalTrend > 0 ? '+' : ''}{stats.totalTrend.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          Data Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats.totalEntries}</div>
                        <div className="text-sm text-gray-600 mt-1">Records in period</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Range Information */}
                  <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">Staffing Range</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200/50">
                          <div className="text-sm text-blue-600 font-medium">Minimum</div>
                          <div className="text-2xl font-bold text-blue-700">{stats.minTotal}</div>
                          <div className="text-xs text-blue-500">Total Staff</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200/50">
                          <div className="text-sm text-green-600 font-medium">Average</div>
                          <div className="text-2xl font-bold text-green-700">{stats.avgTotal}</div>
                          <div className="text-xs text-green-500">Total Staff</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200/50">
                          <div className="text-sm text-purple-600 font-medium">Maximum</div>
                          <div className="text-2xl font-bold text-purple-700">{stats.maxTotal}</div>
                          <div className="text-xs text-purple-500">Total Staff</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Staffing History */}
                  <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">Recent Staffing Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {staffingHistory.slice(0, 14).map((entry, index) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-gray-600">
                                {entry.createdAt.toLocaleDateString()}
                              </div>
                              {index === 0 && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Latest</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-sm text-gray-500">Day</div>
                                <div className="font-semibold text-gray-900">{entry.staffingDay || 0}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-500">Night</div>
                                <div className="font-semibold text-gray-900">{entry.staffingNight || 0}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-500">Total</div>
                                <div className="font-bold text-lg text-gray-900">{(entry.staffingDay || 0) + (entry.staffingNight || 0)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Breakdown (if available) */}
                  {staffingHistory.some(entry => entry.staffingTeams) && (
                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-gray-900">Team Staffing Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600 mb-4">
                          Latest team breakdown from most recent staffing record
                        </div>
                        {(() => {
                          const latestWithTeams = staffingHistory.find(entry => entry.staffingTeams);
                          if (!latestWithTeams?.staffingTeams) return null;

                          const teams = latestWithTeams.staffingTeams;
                          const teamCategories = [
                            { key: 'management', label: 'Management' },
                            { key: 'nurses', label: 'Nurses' },
                            { key: 'ctm', label: 'CTM' },
                            { key: 'domestic', label: 'Domestic' },
                            { key: 'kitchen', label: 'Kitchen' },
                            { key: 'maintenance', label: 'Maintenance' },
                          ];

                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {teamCategories.map(({ key, label }) => {
                                const team = teams[key];
                                if (!team) return null;

                                return (
                                  <div key={key} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                    <div className="font-medium text-sm text-gray-700">{label}</div>
                                    <div className="flex justify-between mt-2">
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500">Day</div>
                                        <div className="font-semibold text-gray-900">{team.day || 0}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500">Night</div>
                                        <div className="font-semibold text-gray-900">{team.night || 0}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                // If we fell back to rota estimates but still have no entries, explain the situation
                (permissionDenied && staffingHistory.length === 0) ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">We couldn't access daily staffing records and no rota data was found for the selected period.</p>
                    <p className="text-sm text-gray-500 mt-1">Ask your workspace administrator for access, or create rotas in the Rotas page to allow estimated staffing to be shown here.</p>
                    <div className="mt-4">
                      <Button variant="default" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-rotas'))}>Open Rotas</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No staffing data available for the selected period</p>
                    <p className="text-sm text-gray-500 mt-1">Start recording daily staffing to see trends</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export { StaffingTrendsModal };