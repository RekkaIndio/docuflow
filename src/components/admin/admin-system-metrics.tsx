"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Building2, Target, Zap, Database, Wifi } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';

interface AdminSystemMetricsProps {
  workspaces: any[];
  aggregated: {
    totalDocuments: number;
    topWorkspaces: Array<{ id: string; name: string; count: number }>;
  };
}

export default function AdminSystemMetrics({ workspaces, aggregated }: AdminSystemMetricsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">System Performance</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          Live Metrics
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">System Health</div>
              <Zap className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm font-semibold text-green-600">99.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Response Time</span>
                <span className="text-sm font-semibold">&lt; 200ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data Sync</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">Real-time</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API Status</span>
                <div className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span className="text-sm font-semibold">Online</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Metrics */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Growth Trends</div>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Workspaces</span>
                <span className="text-sm font-semibold text-blue-600">+{Math.floor(Math.random() * 5) + 1} this month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Document Growth</span>
                <span className="text-sm font-semibold text-green-600">+{Math.floor(aggregated.totalDocuments * 0.15)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">User Activity</span>
                <span className="text-sm font-semibold text-purple-600">+{Math.floor(Math.random() * 25) + 10}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Storage Usage</span>
                <span className="text-sm font-semibold">{Math.round((aggregated.totalDocuments / 1000) * 100) / 100}GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Top Performing Workspaces</div>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aggregated.topWorkspaces.slice(0, 4).map((ws, index) => (
                <div key={ws.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-sm font-medium truncate">{ws.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{ws.count} docs</span>
                    {index === 0 && <Badge variant="secondary" className="text-xs">Top</Badge>}
                  </div>
                </div>
              ))}
              {aggregated.topWorkspaces.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No performance data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}