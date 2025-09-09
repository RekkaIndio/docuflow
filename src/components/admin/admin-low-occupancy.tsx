"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';

interface AdminLowOccupancyProps {
  workspaces: any[];
}

export default function AdminLowOccupancy({ workspaces }: AdminLowOccupancyProps) {
  const lowOccupancyWorkspaces = React.useMemo(() => {
    return workspaces
      .filter(w => {
        const occupancy = typeof w.occupancy === 'number' 
          ? w.occupancy 
          : (w.totalBeds ? (w.occupiedBeds || 0) / w.totalBeds : 0);
        return occupancy < 0.8; // Less than 80% occupancy
      })
      .sort((a, b) => {
        const aOccupancy = typeof a.occupancy === 'number' 
          ? a.occupancy 
          : (a.totalBeds ? (a.occupiedBeds || 0) / a.totalBeds : 0);
        const bOccupancy = typeof b.occupancy === 'number' 
          ? b.occupancy 
          : (b.totalBeds ? (b.occupiedBeds || 0) / b.totalBeds : 0);
        return aOccupancy - bOccupancy;
      })
      .slice(0, 5);
  }, [workspaces]);

  if (lowOccupancyWorkspaces.length === 0) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex items-center justify-between">
          <div>Occupancy Status</div>
          <div className="text-xs text-green-600 font-medium">All Good</div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-2xl font-bold text-green-600">✓</div>
            <div className="text-sm text-muted-foreground mt-2">
              All facilities maintaining healthy occupancy levels
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="flex items-center justify-between">
        <div>Low Occupancy Alert</div>
        <div className="flex items-center gap-1 text-xs text-orange-600">
          <TrendingDown className="w-3 h-3" />
          <span>Watchlist</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lowOccupancyWorkspaces.map((w: any) => {
            const occupancy = typeof w.occupancy === 'number' 
              ? w.occupancy 
              : (w.totalBeds ? (w.occupiedBeds || 0) / w.totalBeds : 0);
            const occupancyPercent = Math.round(occupancy * 100);
            
            return (
              <div key={`low-${w.id}`} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm">
                    <OccupancyPie 
                      percent={occupancyPercent} 
                      size={40} 
                      strokeWidth={4} 
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{w.name || w.id}</div>
                    <div className="text-xs text-orange-600 font-medium">
                      {occupancyPercent}% occupied
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {w.totalBeds ? `${w.occupiedBeds || 0}/${w.totalBeds}` : 'n/a'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground text-center">
          Facilities below 80% occupancy
        </div>
      </CardContent>
    </Card>
  );
}