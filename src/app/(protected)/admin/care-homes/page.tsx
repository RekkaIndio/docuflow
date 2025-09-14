"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import { Button } from '@/components/ui/button';
import BedOccupancyInput from '@/components/admin/bed-occupancy-input';
import OccupancyPie from '@/components/admin/occupancy-pie';
import CareHomeDetailModal from '@/components/admin/care-home-detail-modal';
import { TrendingUp, TrendingDown, Users, Building, BarChart3, Building2, Activity, RefreshCw, Plus, Eye, PieChart } from 'lucide-react';

export default function CareHomesPage() {
  const router = useRouter();
  const [homes, setHomes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const adminWorkspaces = useAdminWorkspaces();
  // const { refreshWorkspaces } = useAdminWorkspacesActions(); // Removed: not implemented
  const [devHomes, setDevHomes] = React.useState<any[]>([]);
  const [occupancyValues, setOccupancyValues] = React.useState<Record<string, string>>({});
  const [previousOccupancy, setPreviousOccupancy] = React.useState<number | null>(null);
  const [selectedHome, setSelectedHome] = React.useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Calculate overview statistics
  const overviewStats = React.useMemo(() => {
    // Return nullable averages when there's no meaningful data so UI can show placeholders
    if (!homes.length) return {
      totalHomes: 0,
      totalBeds: 0,
      totalOccupied: 0,
      averageOccupancy: null,
      averageCompliance: null,
      occupancyTrend: null,
      highOccupancyCount: 0,
      lowOccupancyCount: 0,
      utilizationRate: null
    };

    const homesWithBeds = homes.filter(h => h.totalBeds && h.occupiedBeds !== undefined);
    const totalBeds = homesWithBeds.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
    const totalOccupied = homesWithBeds.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0);

    // For homes without bed counts, use occupancy percentage if available
    const homesWithPercentage = homes.filter(h => !(h.totalBeds && h.occupiedBeds !== undefined) && typeof h.occupancy === 'number');
    const percentageOccupancy = homesWithPercentage.length > 0
      ? homesWithPercentage.reduce((sum, h) => sum + (h.occupancy || 0), 0) / homesWithPercentage.length
      : null;

    const averageOccupancy = totalBeds > 0
      ? (totalOccupied / totalBeds)
      : percentageOccupancy ?? null;

    const averageCompliance = homes.length > 0
      ? homes.reduce((sum, h) => sum + (h.complianceScore || 0), 0) / homes.length
      : null;

    // Calculate occupancy distribution
    const allOccupancies = homes.map(h => {
      if (h.totalBeds && h.occupiedBeds !== undefined) {
        return (h.occupiedBeds / h.totalBeds) * 100;
      }
      return h.occupancy ? h.occupancy * 100 : null;
    }).filter(o => o !== null) as number[];

    const highOccupancyCount = allOccupancies.filter(o => o >= 80).length;
    const lowOccupancyCount = allOccupancies.filter(o => o < 60).length;

    // Calculate utilization rate (occupied beds / total beds)
    const utilizationRate = totalBeds > 0 ? (totalOccupied / totalBeds) : null;

    return {
      totalHomes: homes.length,
      totalBeds,
      totalOccupied,
      averageOccupancy,
      averageCompliance,
      occupancyTrend: previousOccupancy && averageOccupancy ? averageOccupancy - previousOccupancy : null,
      highOccupancyCount,
      lowOccupancyCount,
      utilizationRate
    };
  }, [homes, previousOccupancy]);

  // Track occupancy trends
  React.useEffect(() => {
    // Initialize previous occupancy only when we have a meaningful average
    if (previousOccupancy === null && overviewStats.averageOccupancy !== null) {
      setPreviousOccupancy(overviewStats.averageOccupancy as number);
    }
  }, [overviewStats.averageOccupancy, previousOccupancy]);

  const handleHomeClick = (home: any) => {
    setSelectedHome(home);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedHome(null);
  };

  const handleRefresh = () => {
    // Refresh logic would go here
    window.location.reload();
  };

  const handleBedCountSave = async (homeId: string, totalBeds: number, occupiedBeds: number) => {
    try {
      const home = homes.find(h => h.id === homeId);
      if (!home) throw new Error('Home not found');

      if (home._isAdminWorkspace) {
        // Update admin workspace
        const resp = await fetch(`/api/admin/workspaces/${homeId}`, {
          method: 'PATCH',
          body: JSON.stringify({ totalBeds, occupiedBeds }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) throw new Error('Failed to update admin workspace');
        const updated = await resp.json();
        setHomes(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        // Refresh admin workspaces context to persist data across navigation
  // await refreshWorkspaces(); // Removed: not implemented
      } else {
        // Update care home
        const resp = await fetch(`/api/care-homes/${homeId}`, {
          method: 'PATCH',
          body: JSON.stringify({ totalBeds, occupiedBeds }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) throw new Error('Failed to update care home');
        const updated = await resp.json();
        setDevHomes(prev => prev.map(p => p.id === updated.id ? updated : p));
        setHomes(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        // Refresh admin workspaces context to persist data across navigation
  // await refreshWorkspaces(); // Removed: not implemented
      }
      
      // Update occupancy values display (leave blank when there is no meaningful occupancy)
      if (totalBeds > 0) {
        const newOccupancy = occupiedBeds / totalBeds;
        setOccupancyValues(prev => ({ ...prev, [homeId]: String(Math.round(newOccupancy * 100)) }));
      } else {
        setOccupancyValues(prev => ({ ...prev, [homeId]: '' }));
      }
    } catch (error) {
      throw error;
    }
  };

  React.useEffect(() => {
    const fetchHomes = async () => {
      setLoading(true);
      try {
        // Map admin workspaces (preserve occupancy if available)
        const adminMapped = (adminWorkspaces || []).map((w: any) => {
          // prefer explicit totalBeds/occupiedBeds if present
          const totalBeds = typeof w.totalBeds === 'number' ? w.totalBeds : undefined;
          const occupiedBeds = typeof w.occupiedBeds === 'number' ? w.occupiedBeds : undefined;
          const occupancy = (totalBeds !== undefined && occupiedBeds !== undefined)
            ? (totalBeds > 0 ? (occupiedBeds / totalBeds) : 0)
            : (typeof w.occupancy === 'number' ? w.occupancy : null);
          return {
            id: w.id,
            name: w.name || w.title || 'Workspace',
            region: w.region || '',
            occupancy,
            totalBeds,
            occupiedBeds,
            renewalBacklog: (w.folders && Array.isArray(w.folders)) ? w.folders.length : 0,
            complianceScore: w.complianceScore || 0,
            _isAdminWorkspace: true,
          };
        });

        // Always fetch dev-mode care-homes (editable)
        const resp = await fetch('/api/care-homes');
        let mappedCH: any[] = [];
        if (resp && resp.ok) {
          const json = await resp.json();
          mappedCH = (json.homes || []).map((h: any) => ({ ...h, _isAdminWorkspace: false }));
          // initialize occupancyValues for editable homes as strings, but don't overwrite if already set
          const initial: Record<string, string> = {};
          for (const h of mappedCH) {
            if (typeof h.occupancy === 'number') {
              initial[h.id] = String(Math.round(h.occupancy * 100));
            } else {
              initial[h.id] = '';
            }
          }
          setOccupancyValues(prev => Object.keys(prev).length ? prev : initial);
        } else {
        }

        // Combine: admin workspaces first, then dev care-homes
        const combined = [...adminMapped, ...mappedCH];
        setHomes(combined);
        setDevHomes(mappedCH);
        // initialize occupancyValues for admin and dev homes as strings, but don't overwrite if already set
        const initialAll: Record<string, string> = {};
        for (const h of combined) {
          if (typeof h.occupancy === 'number') {
            initialAll[h.id] = String(Math.round(h.occupancy * 100));
          } else {
            initialAll[h.id] = '';
          }
        }
        setOccupancyValues(prev => Object.keys(prev).length ? prev : initialAll);
      } catch (e) {
        setHomes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomes();
  }, [adminWorkspaces]);

  return (
    <div>
      {/* Full-width themed header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-[64px] shadow-2xl mb-6">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
        </div>
        <div className="relative z-10 px-6 py-8 md:px-8 md:py-12">
          <div className="flex items-center gap-6">
            {/* Header content */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="ml-4 md:ml-6 lg:ml-8">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">Care Homes</h1>
                <p className="text-blue-100 text-lg">Manage bed counts, occupancy and compliance across workspaces.</p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom rounded corner overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-[64px]"></div>
      </div>

      {loading ? (
        <div className="px-6">Loading...</div>
      ) : (
        <div className="px-6 space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Occupancy Dashboard
                </h2>
                <p className="text-sm text-gray-600">Real-time bed occupancy and capacity management</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Live Data</span>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {/* Overall Occupancy Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Overall Occupancy</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-blue-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="relative">
                {overviewStats.averageOccupancy !== null ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-16">
                        <OccupancyPie
                          percent={Math.round(overviewStats.averageOccupancy * 100)}
                          size={64}
                          strokeWidth={8}
                          gradientColors={{ start: '#3b82f6', end: '#1d4ed8' }}
                          centerFontSize={14}
                        />
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                        overviewStats.averageOccupancy >= 0.8 ? 'text-green-600 bg-green-50' :
                        overviewStats.averageOccupancy >= 0.6 ? 'text-yellow-600 bg-yellow-50' :
                        'text-red-600 bg-red-50'
                      }`}>
                        {overviewStats.averageOccupancy >= 0.8 ? 'High' :
                         overviewStats.averageOccupancy >= 0.6 ? 'Moderate' : 'Low'}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Rate:</span>
                        <span className="font-semibold text-gray-900">{Math.round(overviewStats.averageOccupancy * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Beds:</span>
                        <span className="font-semibold text-gray-900">{overviewStats.totalBeds}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span>{overviewStats.totalHomes} facilities</span>
                      <div className="flex items-center gap-1">
                        {overviewStats.averageOccupancy > (previousOccupancy || 0) ? (
                          <><TrendingUp className="w-3 h-3 text-green-500" /> <span className="text-green-600">Improving</span></>
                        ) : overviewStats.averageOccupancy < (previousOccupancy || 0) ? (
                          <><TrendingDown className="w-3 h-3 text-red-500" /> <span className="text-red-600">Declining</span></>
                        ) : (
                          <><Activity className="w-3 h-3 text-gray-500" /> <span>Stable</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-2xl font-bold text-gray-400">N/A</div>
                    <div className="text-sm text-gray-600 mt-1">
                      No occupancy data available
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Add bed counts to see occupancy rates
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Capacity Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-green-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-green-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors duration-300">
                    <Building className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Total Capacity</div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-green-600">{overviewStats.totalBeds}</div>
                    <div className="text-xs text-green-500 font-medium bg-green-50 px-2 py-1 rounded-full">
                      Total Beds
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Occupied:</span>
                      <span className="font-semibold text-gray-900">{overviewStats.totalOccupied}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available:</span>
                      <span className="font-semibold text-green-600">{overviewStats.totalBeds - overviewStats.totalOccupied}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>{overviewStats.totalHomes} facilities</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{Math.round((overviewStats.totalOccupied / overviewStats.totalBeds) * 100) || 0}% utilized</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facilities Count Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-purple-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors duration-300">
                    <Building2 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Care Facilities</div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-purple-600">{overviewStats.totalHomes}</div>
                    <div className="text-xs text-purple-500 font-medium bg-purple-50 px-2 py-1 rounded-full">
                      Active
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">With bed data:</span>
                      <span className="font-semibold text-gray-900">{homes.filter(h => h.totalBeds && h.occupiedBeds !== undefined).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Without data:</span>
                      <span className="font-semibold text-gray-900">{homes.filter(h => !(h.totalBeds && h.occupiedBeds !== undefined)).length}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>All facilities</span>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>Real-time</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy Distribution Card */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/20 rounded-full -ml-12 -mb-12"></div>

              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <PieChart className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-700">Occupancy Distribution</div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">High (80%+)</span>
                      </div>
                      <span className="font-semibold text-red-600">{overviewStats.highOccupancyCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Moderate (60-79%)</span>
                      </div>
                      <span className="font-semibold text-yellow-600">
                        {homes.length - overviewStats.highOccupancyCount - overviewStats.lowOccupancyCount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Low (&lt;60%)</span>
                      </div>
                      <span className="font-semibold text-green-600">{overviewStats.lowOccupancyCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span>Distribution analysis</span>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>Real-time</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Facilities Management Section */}
          {homes.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Facility Management
                    </h2>
                    <p className="text-sm text-gray-600">Monitor and update bed occupancy across all facilities</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {homes.map(h => (
                  <Card
                    key={`facility-${h.id}`}
                    className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                    onClick={() => handleHomeClick(h)}
                  >
                    {/* Animated background elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/20 rounded-full -mr-12 -mt-12 group-hover:bg-blue-100/30 transition-colors duration-300"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-200/10 rounded-full -ml-8 -mb-8"></div>

                    <CardHeader className="relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors duration-300">
                            <Building className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                              {h.name}
                            </h3>
                            <p className="text-sm text-gray-600">{h.region || 'No region specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                          <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors duration-300">View Details</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative">
                      <div className="space-y-4">
                        {/* Occupancy Display */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12">
                              {h.totalBeds && h.occupiedBeds !== undefined ? (
                                <OccupancyPie
                                  percent={Math.round((h.occupiedBeds / h.totalBeds) * 100)}
                                  size={48}
                                  strokeWidth={6}
                                  gradientColors={{ start: '#3b82f6', end: '#1d4ed8' }}
                                  centerFontSize={10}
                                />
                              ) : h.occupancy !== null && h.occupancy !== undefined ? (
                                <OccupancyPie
                                  percent={Math.round(h.occupancy * 100)}
                                  size={48}
                                  strokeWidth={6}
                                  gradientColors={{ start: '#3b82f6', end: '#1d4ed8' }}
                                  centerFontSize={10}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">--</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {h.totalBeds && h.occupiedBeds !== undefined
                                  ? `${h.occupiedBeds}/${h.totalBeds} beds`
                                  : h.occupancy !== null && h.occupancy !== undefined
                                  ? `${Math.round(h.occupancy * 100)}% occupied`
                                  : 'No data'
                                }
                              </div>
                              <div className="text-xs text-gray-600">
                                {h.totalBeds && h.occupiedBeds !== undefined
                                  ? `${h.totalBeds - h.occupiedBeds} available`
                                  : 'Occupancy rate'
                                }
                              </div>
                            </div>
                          </div>
                          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            (h.totalBeds && h.occupiedBeds !== undefined && (h.occupiedBeds / h.totalBeds) >= 0.8) ||
                            (h.occupancy !== null && h.occupancy !== undefined && h.occupancy >= 0.8)
                              ? 'text-green-600 bg-green-50' :
                            (h.totalBeds && h.occupiedBeds !== undefined && (h.occupiedBeds / h.totalBeds) >= 0.6) ||
                            (h.occupancy !== null && h.occupancy !== undefined && h.occupancy >= 0.6)
                              ? 'text-yellow-600 bg-yellow-50' :
                            'text-red-600 bg-red-50'
                          }`}>
                            {(h.totalBeds && h.occupiedBeds !== undefined && (h.occupiedBeds / h.totalBeds) >= 0.8) ||
                             (h.occupancy !== null && h.occupancy !== undefined && h.occupancy >= 0.8)
                              ? 'High' :
                             (h.totalBeds && h.occupiedBeds !== undefined && (h.occupiedBeds / h.totalBeds) >= 0.6) ||
                             (h.occupancy !== null && h.occupancy !== undefined && h.occupancy >= 0.6)
                              ? 'Moderate' : 'Low'}
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                          <span>{h._isAdminWorkspace ? 'Admin Workspace' : 'Care Home'}</span>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>Click for details</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {homes.length === 0 && (
            <div className="px-6 text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Care Homes Found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first care home or importing workspace data.
              </p>
              <Button onClick={() => router.push('/admin/care-homes/new')}>
                Add Your First Care Home
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Care Home Detail Modal */}
      <CareHomeDetailModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        home={selectedHome}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
