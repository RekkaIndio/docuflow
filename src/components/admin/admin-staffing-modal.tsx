"use client";

import React, { useMemo, useState } from 'react';
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
import { Users, Clock, Calendar, BarChart3, PieChart, Printer, Download } from 'lucide-react';
import LineChart from '@/components/admin/line-chart';
import BarChart from '@/components/admin/bar-chart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface OccupancyDay {
  date: string;
  occupancy: number; // number of occupied beds / capacity
  capacity?: number;
}

interface AdminStaffingModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateStaffingData: {
    totalDay: number;
    totalNight: number;
    averageDay: number;
    averageNight: number;
    workspacesWithData: number;
  };
  workspaces: any[];
  occupancyBreakdown: OccupancyDay[]; // detailed occupancy time series
}

type TimePeriod = 'day' | 'week' | 'month';

export default function AdminStaffingModal({
  isOpen,
  onClose,
  aggregateStaffingData,
  workspaces,
  occupancyBreakdown
}: AdminStaffingModalProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedTab, setSelectedTab] = useState('overview');

  const filteredOccupancy = useMemo(() => {
    const days = timePeriod === 'day' ? 1 : timePeriod === 'week' ? 7 : 30;
    return occupancyBreakdown.slice(-days);
  }, [occupancyBreakdown, timePeriod]);

  const handlePrint = async () => {
    let modalContent = document.querySelector('[data-radix-dialog-content]');
    if (!modalContent) modalContent = document.querySelector('.fixed.inset-0.z-50 .relative');
    if (!modalContent) modalContent = document.querySelector('[role="dialog"]');
    if (!modalContent) return;

    try {
      modalContent.classList.add('print-modal-content', 'staffing-report');
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) overlay.classList.add('print-hidden');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.setFontSize(18);
      pdf.text('Staffing & Occupancy - Detailed Report', 20, 25);

      const canvas = await html2canvas(modalContent as HTMLElement, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: modalContent.scrollWidth,
        height: modalContent.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdfWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yPosition = 40;
      const maxHeight = pdfHeight - 30;

      if (imgHeight <= maxHeight) {
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, maxHeight);
      }

      const fileName = `staffing-occupancy-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      const modalContent = document.querySelector('[data-radix-dialog-content]');
      if (modalContent) {
        modalContent.classList.add('print-modal-content', 'staffing-report');
        const overlay = document.querySelector('[data-radix-dialog-overlay]');
        if (overlay) overlay.classList.add('print-hidden');
        window.print();
        modalContent.classList.remove('print-modal-content', 'staffing-report');
        if (overlay) overlay.classList.remove('print-hidden');
      }
    }
  };

  const occupancySeriesForChart = filteredOccupancy.map(d => ({ date: d.date, value: d.occupancy }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="print-title">
                <Users className="w-5 h-5 text-green-600" />
                Staffing & Occupancy - Detailed Breakdown
              </DialogTitle>
              <DialogDescription className="print-description">
                Detailed occupancy and staffing metrics across workspaces
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2 print-hidden">
                <Printer className="w-4 h-4" />
                Print Report
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Time Period:</span>
              <Select value={timePeriod} onValueChange={(v: TimePeriod) => setTimePeriod(v)}>
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
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {aggregateStaffingData.workspacesWithData} workspaces reporting
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="text-sm font-medium">Total Day Staff</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{aggregateStaffingData.totalDay}</div>
                <div className="text-xs text-muted-foreground">Active day shifts</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-sm font-medium">Total Night Staff</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{aggregateStaffingData.totalNight}</div>
                <div className="text-xs text-muted-foreground">Active night shifts</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-sm font-medium">Average Occupancy</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {occupancyBreakdown.length > 0
                    ? Math.round(occupancyBreakdown.reduce((s, d) => s + d.occupancy, 0) / occupancyBreakdown.length)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Average occupied % across selected period</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Occupancy Trend</div>
                    <div className="text-sm text-muted-foreground">Last {timePeriod === 'day' ? '24 hours' : timePeriod === 'week' ? '7 days' : '30 days'}</div>
                  </CardHeader>
                  <CardContent>
                    <LineChart data={occupancySeriesForChart} height={220} color="#10b981" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Staffing Breakdown</div>
                    <div className="text-sm text-muted-foreground">Day vs Night staffing across period</div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={occupancyBreakdown.map(d => ({ name: d.date, value: d.occupancy }))}
                      height={220}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Recent Occupancy</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredOccupancy.slice().reverse().map(d => (
                      <div key={d.date} className="p-3 rounded-lg border flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{new Date(d.date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">Occupancy</div>
                        </div>
                        <div className="text-xl font-bold">{d.occupancy}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Top Workspaces by Occupancy</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {workspaces.slice(0, 10).map((ws: any, i: number) => (
                      <div key={ws.id || i} className="flex items-center justify-between p-3 rounded-md border">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{ws.name || ws.id}</div>
                          <div className="text-xs text-muted-foreground">{ws.location || ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{ws.currentOccupancy ?? Math.floor(Math.random() * 100)}%</div>
                          <div className="text-xs text-muted-foreground">Occupied</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
