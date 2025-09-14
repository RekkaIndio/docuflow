"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import OccupancyPie from '@/components/admin/occupancy-pie';
import {
  Building,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Bed,
  MapPin,
  Phone,
  Mail,
  Settings,
  RefreshCw
} from 'lucide-react';

interface CareHomeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  home: any;
  onRefresh?: () => void;
}

export default function CareHomeDetailModal({
  isOpen,
  onClose,
  home,
  onRefresh
}: CareHomeDetailModalProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock trend data - in real implementation, this would come from API
  const trendData = useMemo(() => {
    const days = 30; // Last 30 days
    const data = [];
    const baseOccupancy = home?.totalBeds && home?.occupiedBeds !== undefined
      ? (home.occupiedBeds / home.totalBeds)
      : (home?.occupancy || 0.75);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Generate realistic mock data with some variation around the base occupancy
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const occupancy = Math.max(0, Math.min(1, baseOccupancy + variation));

      data.push({
        date: dateStr,
        occupancy: Math.round(occupancy * 100),
        occupied: home?.totalBeds ? Math.round(home.totalBeds * occupancy) : null,
        total: home?.totalBeds || null
      });
    }

    return data;
  }, [home]);

  // Calculate period-over-period change
  const periodChange = useMemo(() => {
    if (trendData.length < 2) return { change: 0, percentage: 0 };

    const current = trendData[trendData.length - 1].occupancy;
    const previous = trendData[trendData.length - 2].occupancy;
    const change = current - previous;
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;

    return { change, percentage };
  }, [trendData]);

  const getOccupancyStatus = (occupancy: number) => {
    if (occupancy >= 80) return { text: 'High', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' };
    if (occupancy >= 60) return { text: 'Moderate', icon: CheckCircle2, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: 'Low', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' };
  };

  const occupancyRate = home?.totalBeds && home?.occupiedBeds !== undefined
    ? Math.round((home.occupiedBeds / home.totalBeds) * 100)
    : home?.occupancy ? Math.round(home.occupancy * 100) : null;

  const status = occupancyRate !== null ? getOccupancyStatus(occupancyRate) : null;

  if (!home) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideClose className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] md:w-[80vw] lg:max-w-4xl p-0 border-0 shadow-2xl">
        {/* Hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">
          {home ? `${home.name} - Care Home Details` : 'Care Home Details'}
        </DialogTitle>

        {/* Full-width themed header */}
        <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden shadow-lg">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
          </div>
          <div className="relative z-10 px-6 py-6 md:px-8 md:py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <Building className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{home.name}</h2>
                  <p className="text-blue-100 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {home.region || 'Region not specified'}
                    <span className="mx-2">•</span>
                    {home._isAdminWorkspace ? 'Admin Workspace' : 'Care Home'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Close button: explicit, white X icon that calls onClose */}
                <button
                  aria-label="Close"
                  onClick={onClose}
                  className="ml-2 p-2 rounded-md bg-transparent hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
          {/* Bottom rounded corner overlay removed to avoid white gradient */}
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Current Occupancy Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Current Occupancy</div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16">
                    {occupancyRate !== null ? (
                      <OccupancyPie
                        percent={occupancyRate}
                        size={64}
                        strokeWidth={8}
                        gradientColors={{ start: '#3b82f6', end: '#1d4ed8' }}
                        centerFontSize={14}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm text-gray-400">--</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {occupancyRate !== null ? `${occupancyRate}%` : '--'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {home?.totalBeds && home?.occupiedBeds !== undefined
                        ? `${home.occupiedBeds}/${home.totalBeds} beds`
                        : 'Occupancy rate'
                      }
                    </div>
                  </div>
                </div>
                {status && (
                  <div className={`mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color} ${status.bg}`}>
                    <status.icon className="w-3 h-3" />
                    {status.text} Occupancy
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Capacity Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-green-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors duration-300">
                    <Bed className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Total Capacity</div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {home?.totalBeds || '--'}
                </div>
                <div className="text-sm text-gray-600">Total beds</div>
                {home?.totalBeds && home?.occupiedBeds !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Available</span>
                      <span>{home.totalBeds - home.occupiedBeds}</span>
                    </div>
                    <Progress
                      value={((home.totalBeds - home.occupiedBeds) / home.totalBeds) * 100}
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trend Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-purple-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors duration-300">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">30-Day Trend</div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="flex items-center gap-2 mb-1">
                  {periodChange.change >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`text-lg font-bold ${periodChange.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodChange.change >= 0 ? '+' : ''}{periodChange.change}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  vs last period
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {periodChange.change >= 0 ? 'Increasing' : 'Decreasing'} trend
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-gray-50 to-gray-100 p-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="trends" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Trends</TabsTrigger>
              <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Occupancy Breakdown */}
                <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/30 rounded-full -mr-12 -mt-12 group-hover:bg-emerald-100/40 transition-colors duration-300"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-200/20 rounded-full -ml-8 -mb-8"></div>

                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors duration-300">
                        <PieChart className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">Occupancy Breakdown</div>
                        <div className="text-sm text-gray-600">Current bed utilization</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative">
                    {home?.totalBeds && home?.occupiedBeds !== undefined ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm">Occupied Beds</span>
                          </div>
                          <span className="font-semibold">{home.occupiedBeds}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm">Available Beds</span>
                          </div>
                          <span className="font-semibold">{home.totalBeds - home.occupiedBeds}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                            <span className="text-sm">Total Capacity</span>
                          </div>
                          <span className="font-semibold">{home.totalBeds}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Bed className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-600">No bed data available</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Facility Information */}
                <Card className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-100/30 rounded-full -mr-12 -mt-12 group-hover:bg-cyan-100/40 transition-colors duration-300"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-cyan-200/20 rounded-full -ml-8 -mb-8"></div>

                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors duration-300">
                        <Building className="h-5 w-5 text-cyan-500" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">Facility Information</div>
                        <div className="text-sm text-gray-600">Basic details and contact</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{home.name}</span>
                      </div>
                      {home.region && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{home.region}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {home._isAdminWorkspace ? 'Admin Workspace' : 'Care Home'}
                        </span>
                      </div>
                      {home.renewalBacklog !== undefined && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{home.renewalBacklog} pending renewals</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4 mt-6">
              <Card className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100/40 transition-colors duration-300"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full -ml-12 -mb-12"></div>

                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors duration-300">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">Occupancy Trends</div>
                      <div className="text-sm text-gray-600">30-day occupancy history</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  <div className="space-y-4">
                    {/* Simple trend visualization - in real app, use a proper chart library */}
                    <div className="h-32 flex items-end gap-1">
                      {trendData.slice(-14).map((day, index) => (
                        <div
                          key={day.date}
                          className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t flex-1 min-w-[8px] shadow-sm"
                          style={{
                            height: `${(day.occupancy / 100) * 100}%`,
                            opacity: 0.7 + (index / 14) * 0.3
                          }}
                          title={`${day.date}: ${day.occupancy}%`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Average (30 days)</div>
                        <div className="font-semibold text-lg">
                          {Math.round(trendData.reduce((sum, d) => sum + d.occupancy, 0) / trendData.length)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Peak</div>
                        <div className="font-semibold text-lg">
                          {Math.max(...trendData.map(d => d.occupancy))}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Detailed Metrics */}
                <Card className="group relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-violet-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-100/30 rounded-full -mr-12 -mt-12 group-hover:bg-violet-100/40 transition-colors duration-300"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-violet-200/20 rounded-full -ml-8 -mb-8"></div>

                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20 transition-colors duration-300">
                        <BarChart3 className="h-5 w-5 text-violet-500" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">Detailed Metrics</div>
                        <div className="text-sm text-gray-600">Comprehensive facility data</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative">
                    <div className="space-y-4">
                      {home?.totalBeds && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Beds</span>
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{home.totalBeds}</Badge>
                        </div>
                      )}
                      {home?.occupiedBeds !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Occupied Beds</span>
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{home.occupiedBeds}</Badge>
                        </div>
                      )}
                      {home?.complianceScore !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Compliance Score</span>
                          <Badge variant={home.complianceScore >= 80 ? "default" : "secondary"} className="bg-green-50 text-green-700 border-green-200">
                            {home.complianceScore}%
                          </Badge>
                        </div>
                      )}
                      {home?.renewalBacklog !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pending Renewals</span>
                          <Badge variant={home.renewalBacklog > 0 ? "destructive" : "outline"} className="bg-red-50 text-red-700 border-red-200">
                            {home.renewalBacklog}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/30 rounded-full -mr-12 -mt-12 group-hover:bg-orange-100/40 transition-colors duration-300"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-200/20 rounded-full -ml-8 -mb-8"></div>

                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors duration-300">
                        <Settings className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">Quick Actions</div>
                        <div className="text-sm text-gray-600">Manage this facility</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative">
                    <div className="space-y-3">
                      <Button className="w-full justify-start gap-2 bg-white/60 hover:bg-white/80 border-orange-200 text-orange-700" variant="outline">
                        <Settings className="w-4 h-4" />
                        Edit Facility Details
                      </Button>
                      <Button className="w-full justify-start gap-2 bg-white/60 hover:bg-white/80 border-orange-200 text-orange-700" variant="outline">
                        <BarChart3 className="w-4 h-4" />
                        View Full Reports
                      </Button>
                      <Button className="w-full justify-start gap-2 bg-white/60 hover:bg-white/80 border-orange-200 text-orange-700" variant="outline">
                        <Users className="w-4 h-4" />
                        Manage Staff
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}