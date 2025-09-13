"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Target, Activity } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OccupancyTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

interface OccupancyEntry {
  id: string;
  occupancy: string | number;
  createdAt: Date;
  recordedAt: Date;
}

const OccupancyTrendsModal = ({ isOpen, onClose, workspaceId }: OccupancyTrendsModalProps) => {
  const [occupancyHistory, setOccupancyHistory] = useState<OccupancyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Load occupancy history
  useEffect(() => {
    if (!workspaceId || !isOpen) return;

    setLoading(true);
    try {
      const colRef = collection(db, `workspaces/${workspaceId}/daily-checkins`);
      const now = new Date();
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

      const q = query(
        colRef,
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );

      const unsub = onSnapshot(q, (snap) => {
        const entries = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          recordedAt: doc.data().recordedAt?.toDate?.() || new Date(doc.data().recordedAt)
        })) as OccupancyEntry[];

        setOccupancyHistory(entries);
        setLoading(false);
      }, (err) => {
        console.error('Failed to load occupancy history', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.error('Failed to set up occupancy history listener', e);
      setLoading(false);
    }
  }, [workspaceId, isOpen, selectedPeriod]);

  const calculateStats = () => {
    if (occupancyHistory.length === 0) return null;

    const occupancyValues: number[] = [];

    occupancyHistory.forEach(entry => {
      if (entry.occupancy !== undefined && entry.occupancy !== null) {
        const v = String(entry.occupancy).trim();
        if (v.includes('/')) {
          const parts = v.split('/').map(p => p.trim());
          const occ = parseFloat(parts[0]) || 0;
          const tot = parseFloat(parts[1]) || 0;
          if (tot > 0) {
            occupancyValues.push(Math.round((occ / tot) * 100));
          }
        } else {
          const n = parseFloat(v);
          if (!isNaN(n)) {
            if (n > 0 && n <= 1) {
              occupancyValues.push(Math.round(n * 100));
            } else if (n > 1) {
              occupancyValues.push(Math.round(n));
            }
          }
        }
      }
    });

    if (occupancyValues.length === 0) return null;

    const avgOccupancy = occupancyValues.reduce((a, b) => a + b, 0) / occupancyValues.length;

    const latest = occupancyValues[0];
    const previous = occupancyValues[1];
    const occupancyTrend = previous ? ((latest - previous) / previous) * 100 : 0;

    const minOccupancy = Math.min(...occupancyValues);
    const maxOccupancy = Math.max(...occupancyValues);

    return {
      avgOccupancy: Math.round(avgOccupancy),
      occupancyTrend,
      minOccupancy,
      maxOccupancy,
      latest,
      totalEntries: occupancyValues.length
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

  const getOccupancyColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 80) return 'text-amber-600';
    if (percent >= 60) return 'text-blue-600';
    return 'text-green-600';
  };

  const getOccupancyStatus = (percent: number) => {
    if (percent >= 90) return 'High';
    if (percent >= 80) return 'Moderate';
    if (percent >= 60) return 'Normal';
    return 'Low';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl p-0 max-h-[90vh] overflow-hidden">
        {/* Dark hero header to match dashboard style */}
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Occupancy Trends & Analytics</DialogTitle>
                <p className="text-slate-300 text-sm mt-1">Monitor occupancy patterns and capacity utilization</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-b-lg border-0 shadow-none max-h-[calc(90vh-120px)] overflow-y-auto">
          <CardContent className="p-6">
            <div className="space-y-6">
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
                  <p className="text-gray-600">Loading occupancy data...</p>
                </div>
              ) : stats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Target className="h-4 w-4 text-blue-600" />
                          Average Occupancy
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getOccupancyColor(stats.avgOccupancy)}`}>{stats.avgOccupancy}%</div>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(stats.occupancyTrend)}
                          <span className={`text-sm ${getTrendColor(stats.occupancyTrend)}`}>
                            {stats.occupancyTrend > 0 ? '+' : ''}{stats.occupancyTrend.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Activity className="h-4 w-4 text-blue-600" />
                          Current Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getOccupancyColor(stats.latest)}`}>{stats.latest}%</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {getOccupancyStatus(stats.latest)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Peak Occupancy
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getOccupancyColor(stats.maxOccupancy)}`}>{stats.maxOccupancy}%</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Maximum recorded
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
                        <div className="text-sm text-gray-600 mt-1">
                          Records in period
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Occupancy Range */}
                  <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">Occupancy Range</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200/50">
                          <div className="text-sm text-green-600 font-medium">Low</div>
                          <div className="text-2xl font-bold text-green-700">{stats.minOccupancy}%</div>
                          <div className="text-xs text-green-500">Minimum</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200/50">
                          <div className="text-sm text-blue-600 font-medium">Average</div>
                          <div className="text-2xl font-bold text-blue-700">{stats.avgOccupancy}%</div>
                          <div className="text-xs text-blue-500">Typical</div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200/50">
                          <div className="text-sm text-red-600 font-medium">High</div>
                          <div className="text-2xl font-bold text-red-700">{stats.maxOccupancy}%</div>
                          <div className="text-xs text-red-500">Peak</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Occupancy History */}
                  <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">Recent Occupancy Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {occupancyHistory.slice(0, 14).map((entry, index) => {
                          // Calculate occupancy percentage for this entry
                          let occupancyPercent = 0;
                          let displayValue = '—';

                          if (entry.occupancy !== undefined && entry.occupancy !== null) {
                            const v = String(entry.occupancy).trim();
                            if (v.includes('/')) {
                              const parts = v.split('/').map(p => p.trim());
                              const occ = parseFloat(parts[0]) || 0;
                              const tot = parseFloat(parts[1]) || 0;
                              if (tot > 0) {
                                occupancyPercent = Math.round((occ / tot) * 100);
                                displayValue = `${occ}/${tot}`;
                              }
                            } else {
                              const n = parseFloat(v);
                              if (!isNaN(n)) {
                                if (n > 0 && n <= 1) {
                                  occupancyPercent = Math.round(n * 100);
                                  displayValue = `${occupancyPercent}%`;
                                } else if (n > 1) {
                                  occupancyPercent = Math.round(n);
                                  displayValue = `${occupancyPercent}%`;
                                }
                              }
                            }
                          }

                          return (
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
                                  <div className="text-sm text-gray-500">Occupancy</div>
                                  <div className={`font-bold text-lg ${getOccupancyColor(occupancyPercent)}`}>{displayValue}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Status</div>
                                  <div className={`font-semibold ${getOccupancyColor(occupancyPercent)}`}>{getOccupancyStatus(occupancyPercent)}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No occupancy data available for the selected period</p>
                  <p className="text-sm text-gray-500 mt-1">Start recording daily occupancy to see trends</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export { OccupancyTrendsModal };