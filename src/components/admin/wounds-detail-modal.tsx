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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Clock,
  Activity,
  Printer
} from 'lucide-react';
import LineChart from '@/components/admin/line-chart';
import BarChart from '@/components/admin/bar-chart';

interface WoundsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateWoundsData: {
    total: number;
    pressure: number;
    break: number;
    fracture: number;
    bruise: number;
    skintear: number;
    workspacesWithData: number;
  };
  workspaces: any[];
}

type TimePeriod = 'day' | 'week' | 'month';

export default function WoundsDetailModal({
  isOpen,
  onClose,
  aggregateWoundsData,
  workspaces
}: WoundsDetailModalProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock trend data - in real implementation, this would come from API
  const trendData = useMemo(() => {
    const days = timePeriod === 'day' ? 1 : timePeriod === 'week' ? 7 : 30;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Generate realistic mock data with some variation
      const baseValue = Math.floor(Math.random() * 10) + 1;
      data.push({
        date: dateStr,
        total: baseValue,
        pressure: Math.floor(baseValue * 0.4),
        break: Math.floor(baseValue * 0.2),
        fracture: Math.floor(baseValue * 0.15),
        bruise: Math.floor(baseValue * 0.15),
        skintear: Math.floor(baseValue * 0.1)
      });
    }

    return data;
  }, [timePeriod]);

  // Calculate period-over-period change
  const periodChange = useMemo(() => {
    if (trendData.length < 2) return { change: 0, percentage: 0 };

    const current = trendData[trendData.length - 1].total;
    const previous = trendData[trendData.length - 2].total;
    const change = current - previous;
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;

    return { change, percentage };
  }, [trendData]);

  // Top workspaces by wounds
  const topWorkspaces = useMemo(() => {
    return workspaces
      .map(ws => ({
        name: ws.name || ws.id,
        total: Math.floor(Math.random() * 20), // Mock data
        pressure: Math.floor(Math.random() * 8),
        break: Math.floor(Math.random() * 4),
        fracture: Math.floor(Math.random() * 3),
        bruise: Math.floor(Math.random() * 3),
        skintear: Math.floor(Math.random() * 2)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [workspaces]);

  const handlePrint = () => {
    // Add print-specific classes to the modal content
    const modalContent = document.querySelector('[data-radix-dialog-content]');
    if (modalContent) {
      modalContent.classList.add('print-modal-content', 'wounds-report');

      // Hide dialog overlay and other elements for printing
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) overlay.classList.add('print-hidden');

      // Trigger print
      window.print();

      // Clean up classes after printing
      setTimeout(() => {
        modalContent.classList.remove('print-modal-content', 'wounds-report');
        if (overlay) overlay.classList.remove('print-hidden');
      }, 1000);
    }
  };

  const woundTypes = [
    { key: 'pressure', label: 'Pressure Ulcers', value: aggregateWoundsData.pressure, color: '#ef4444', description: 'Pressure-related skin damage' },
    { key: 'break', label: 'Skin Breaks', value: aggregateWoundsData.break, color: '#f97316', description: 'Open skin wounds' },
    { key: 'fracture', label: 'Fracture Wounds', value: aggregateWoundsData.fracture, color: '#eab308', description: 'Wounds from fractures' },
    { key: 'bruise', label: 'Bruising', value: aggregateWoundsData.bruise, color: '#a855f7', description: 'Skin discoloration from trauma' },
    { key: 'skintear', label: 'Skin Tears', value: aggregateWoundsData.skintear, color: '#ec4899', description: 'Epidermal tears' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="print-title">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Incident Reports - Detailed Analysis
              </DialogTitle>
              <DialogDescription className="print-description">
                Comprehensive overview of wound incidents across all workspaces
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2 print-hidden"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Period Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Time Period:</span>
              <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last Day</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                {periodChange.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                )}
                <span className={periodChange.change >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {periodChange.change >= 0 ? '+' : ''}{periodChange.change} ({periodChange.percentage >= 0 ? '+' : ''}{periodChange.percentage}%)
                </span>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {aggregateWoundsData.workspacesWithData} workspaces reporting
              </Badge>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="print-grid-3">
            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Total Incidents</div>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-red-600">{aggregateWoundsData.total}</div>
                <p className="print-metric-label">
                  Across all workspaces
                </p>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Most Common</div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-orange-600">
                  {woundTypes.reduce((max, type) => type.value > max.value ? type : max, woundTypes[0]).label.split(' ')[0]}
                </div>
                <p className="print-metric-label">
                  {woundTypes.reduce((max, type) => type.value > max.value ? type : max, woundTypes[0]).value} incidents
                </p>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Avg per Workspace</div>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-blue-600">
                  {aggregateWoundsData.workspacesWithData > 0
                    ? Math.round(aggregateWoundsData.total / aggregateWoundsData.workspacesWithData * 10) / 10
                    : 0}
                </div>
                <p className="print-metric-label">
                  Incidents per facility
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Wound Type Distribution */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Wound Type Distribution</div>
                    <div className="text-sm text-muted-foreground">Breakdown by incident type</div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={woundTypes.map(type => ({
                        name: type.label,
                        value: type.value,
                        color: type.color
                      }))}
                      height={250}
                    />
                  </CardContent>
                </Card>

                {/* Recent Trend */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Recent Trend</div>
                    <div className="text-sm text-muted-foreground">Last {timePeriod === 'day' ? '24 hours' : timePeriod === 'week' ? '7 days' : '30 days'}</div>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={trendData.map(d => ({ date: d.date, value: d.total }))}
                      height={200}
                      color="#ef4444"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Highlights */}
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Key Highlights</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {woundTypes.map((type) => (
                      <div key={type.key} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-lg font-bold text-red-600">{type.value}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Wound Trends Over Time</div>
                  <div className="text-sm text-muted-foreground">Daily incident counts by type</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <LineChart
                      data={trendData.map(d => ({ date: d.date, value: d.total }))}
                      height={300}
                      color="#ef4444"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                      {woundTypes.map((type) => (
                        <div key={type.key} className="text-center">
                          <div className="text-sm font-medium">{type.label}</div>
                          <div className="text-lg font-bold" style={{ color: type.color }}>
                            {aggregateWoundsData[type.key as keyof typeof aggregateWoundsData] as number}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {woundTypes.map((type) => (
                  <Card key={type.key}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <div className="text-lg font-semibold">{type.label}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2" style={{ color: type.color }}>
                        {type.value}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {aggregateWoundsData.total > 0
                          ? `${Math.round((type.value / aggregateWoundsData.total) * 100)}% of total incidents`
                          : 'No incidents'
                        }
                      </div>
                      <div className="mt-4">
                        <LineChart
                          data={trendData.map(d => ({
                            date: d.date,
                            value: d[type.key as keyof typeof d] as number
                          }))}
                          height={150}
                          color={type.color}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Workspace Performance</div>
                  <div className="text-sm text-muted-foreground">Incidents by facility</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topWorkspaces.map((workspace, index) => (
                      <div key={workspace.name} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{workspace.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workspace.total} total incidents
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {Object.entries(workspace).filter(([key]) => key !== 'name' && key !== 'total').map(([type, value]) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: {value as number}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Print Footer */}
        <div className="print-footer">
          <div>Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
          <div>DocuFlow Admin Dashboard - Incident Reports Analysis</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}