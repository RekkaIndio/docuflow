"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import { Button } from '@/components/ui/button';
import BedOccupancyInput from '@/components/admin/bed-occupancy-input';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { TrendingUp, TrendingDown, Users, Building, BarChart3, Building2 } from 'lucide-react';

export default function CareHomesPage() {
  const router = useRouter();
  const [homes, setHomes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const adminWorkspaces = useAdminWorkspaces();
  // const { refreshWorkspaces } = useAdminWorkspacesActions(); // Removed: not implemented
  const [devHomes, setDevHomes] = React.useState<any[]>([]);
  const [occupancyValues, setOccupancyValues] = React.useState<Record<string, string>>({});
  const [previousOccupancy, setPreviousOccupancy] = React.useState<number | null>(null);

  // Calculate overview statistics
  const overviewStats = React.useMemo(() => {
    // Return nullable averages when there's no meaningful data so UI can show placeholders
    if (!homes.length) return { totalHomes: 0, totalBeds: 0, totalOccupied: 0, averageOccupancy: null, averageCompliance: null };

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

    return {
      totalHomes: homes.length,
      totalBeds,
      totalOccupied,
      averageOccupancy,
      averageCompliance
    };
  }, [homes]);

  // Track occupancy trends
  React.useEffect(() => {
    // Initialize previous occupancy only when we have a meaningful average
    if (previousOccupancy === null && overviewStats.averageOccupancy !== null) {
      setPreviousOccupancy(overviewStats.averageOccupancy as number);
    }
  }, [overviewStats.averageOccupancy, previousOccupancy]);

  const handleBedCountSave = async (homeId: string, totalBeds: number, occupiedBeds: number) => {
    console.log('💾 Saving bed count data:', { homeId, totalBeds, occupiedBeds });
    try {
      const home = homes.find(h => h.id === homeId);
      if (!home) throw new Error('Home not found');

      if (home._isAdminWorkspace) {
        console.log('🔄 Updating admin workspace...');
        // Update admin workspace
        const resp = await fetch(`/api/admin/workspaces/${homeId}`, {
          method: 'PATCH',
          body: JSON.stringify({ totalBeds, occupiedBeds }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) throw new Error('Failed to update admin workspace');
        const updated = await resp.json();
        console.log('✅ Admin workspace updated:', updated);
        setHomes(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        // Refresh admin workspaces context to persist data across navigation
  // await refreshWorkspaces(); // Removed: not implemented
      } else {
        console.log('🔄 Updating care home via API...');
        // Update care home
        const resp = await fetch(`/api/care-homes/${homeId}`, {
          method: 'PATCH',
          body: JSON.stringify({ totalBeds, occupiedBeds }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) throw new Error('Failed to update care home');
        const updated = await resp.json();
        console.log('✅ Care home updated:', updated);
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
      console.log('📊 Updated occupancy values for:', homeId);
    } catch (error) {
      console.error('💥 Failed to save bed counts:', error);
      throw error;
    }
  };

  React.useEffect(() => {
    const fetchHomes = async () => {
      console.log('🏠 Fetching care homes data...');
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
        console.log('🔄 Fetching from /api/care-homes...');
        const resp = await fetch('/api/care-homes');
        let mappedCH: any[] = [];
        if (resp && resp.ok) {
          const json = await resp.json();
          console.log('📋 Care homes API response:', json);
          mappedCH = (json.homes || []).map((h: any) => ({ ...h, _isAdminWorkspace: false }));
          console.log('🏠 Mapped care homes:', mappedCH);
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
          console.error('❌ Failed to fetch care homes:', resp.status, resp.statusText);
        }

        // Combine: admin workspaces first, then dev care-homes
        const combined = [...adminMapped, ...mappedCH];
        console.log('🔗 Combined homes data:', combined);
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
        console.error('💥 Error fetching care homes:', e);
        setHomes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomes();
  }, [adminWorkspaces]);

  return (
    <div className="p-6">
      {/* Full-width themed header */}
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden shadow-lg mb-6">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="relative z-10 px-6 py-8 md:px-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Header content */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Care Homes</h1>
                  <p className="text-blue-100 text-lg">Manage bed counts, occupancy and compliance across workspaces.</p>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button onClick={() => router.push('/admin/care-homes/new')}>Add Care Home</Button>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom rounded corner overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/20 to-transparent rounded-b-2xl"></div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-lg overflow-hidden bg-gradient-to-b from-slate-800 to-slate-700/95 p-6 text-white shadow-md">
              <h4 className="text-sm text-white/80">Overall Occupancy</h4>
              <p className="text-xs text-white/70 mt-1">Average across all workspaces</p>
              <div className="mt-6 flex items-center gap-6">
                <div className="w-24 h-24">
                  <div className="flex items-center justify-center w-20 h-20 bg-white/5 rounded-full">
                    {overviewStats.averageOccupancy !== null ? (
                      <OccupancyPie percent={Math.round(overviewStats.averageOccupancy * 100)} size={80} strokeWidth={10} />
                    ) : (
                      <OccupancyPie percent={null} size={80} strokeWidth={10} />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{overviewStats.averageOccupancy !== null ? `${Math.round(overviewStats.averageOccupancy * 100)}%` : '--'}</div>
                  <div className="text-xs text-white/70 mt-1">{overviewStats.totalBeds > 0 ? `${overviewStats.totalOccupied}/${overviewStats.totalBeds} beds` : 'No bed data'}</div>
                  <div className="text-xs text-white/60 mt-3">
                    {previousOccupancy !== null && overviewStats.averageOccupancy !== null ? (
                      overviewStats.averageOccupancy > previousOccupancy ? `+${Math.round((overviewStats.averageOccupancy - previousOccupancy) * 100)}% since last update` : overviewStats.averageOccupancy < previousOccupancy ? `${Math.round((overviewStats.averageOccupancy - previousOccupancy) * 100)}% since last update` : 'No change since last update'
                    ) : 'No change since last update'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden bg-slate-800 p-6 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Total Beds</div>
                </div>
                <div className="text-white/40">📊</div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white">{overviewStats.totalOccupied}/{overviewStats.totalBeds}</div>
                <div className="text-xs text-white/70 mt-1">{overviewStats.totalBeds - overviewStats.totalOccupied} beds available</div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden bg-slate-800 p-6 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Care Homes</div>
                </div>
                <div className="text-white/40">🏥</div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white">{overviewStats.totalHomes}</div>
                <div className="text-xs text-white/70 mt-1">{homes.filter(h => h.totalBeds && h.occupiedBeds !== undefined).length} with bed data</div>
              </div>
            </div>
          </div>

          {/* Bed Count Management Section */}
          {homes.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Bed Occupancy Management</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {homes.map(h => (
                  <BedOccupancyInput
                    key={`bed-input-${h.id}`}
                    homeId={h.id}
                    homeName={h.name}
                    initialTotalBeds={h.totalBeds}
                    initialOccupiedBeds={h.occupiedBeds}
                    occupancy={h.occupancy}
                    isAdmin={!!h._isAdminWorkspace}
                    onSave={handleBedCountSave}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {homes.length === 0 && (
            <div className="text-center py-12">
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
    </div>
  );
}
