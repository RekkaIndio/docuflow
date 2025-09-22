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
  Shield,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Clock,
  Activity,
  AlertTriangle,
  Printer
} from 'lucide-react';
import LineChart from '@/components/admin/line-chart';
import BarChart from '@/components/admin/bar-chart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InfectionsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateInfectionData: {
    totalInfections: number;
    uti: number;
    chest: number;
    wound: number;
    workspacesWithData: number;
  };
  workspaces: any[];
}

type TimePeriod = 'day' | 'week' | 'month';

export default function InfectionsDetailModal({
  isOpen,
  onClose,
  aggregateInfectionData,
  workspaces
}: InfectionsDetailModalProps) {
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
      const total = Math.floor(Math.random() * 12) + 2;
      data.push({
        date: dateStr,
        total,
        uti: Math.floor(total * 0.4),
        chest: Math.floor(total * 0.35),
        wound: Math.floor(total * 0.25)
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

  // Top workspaces by infections
  const topWorkspaces = useMemo(() => {
    return workspaces
      .map(ws => ({
        name: ws.name || ws.id,
        total: Math.floor(Math.random() * 25) + 1,
        uti: Math.floor(Math.random() * 10),
        chest: Math.floor(Math.random() * 8),
        wound: Math.floor(Math.random() * 7),
        controlRating: Math.random() > 0.7 ? 'Excellent' : Math.random() > 0.4 ? 'Good' : 'Needs Improvement'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [workspaces]);

  const handlePrint = async () => {
    const modalContent = document.querySelector('[data-radix-dialog-content]');
    if (!modalContent) return;

    try {
      // Add print-specific classes for PDF generation
      modalContent.classList.add('print-modal-content', 'infections-report');

      // Hide dialog overlay and other elements for PDF generation
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) overlay.classList.add('print-hidden');

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Infection Control - Detailed Analysis', 20, 25);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Comprehensive overview of infection incidents and control measures', 20, 35);

      // Add generation info
      const currentDate = new Date();
      pdf.setFontSize(10);
      pdf.text(`Generated: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`, 20, 45);

      // Capture the modal content as image
      const canvas = await html2canvas(modalContent as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: modalContent.scrollWidth,
        height: modalContent.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdfWidth - 40; // 20mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add content to PDF (split into multiple pages if needed)
      let yPosition = 55;
      const maxHeight = pdfHeight - 20;

      if (imgHeight <= maxHeight) {
        // Content fits on one page
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      } else {
        // Content spans multiple pages
        const totalPages = Math.ceil(imgHeight / maxHeight);
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
            yPosition = 20;
          }

          const sourceY = page * maxHeight * (canvas.height / imgHeight);
          const sourceHeight = Math.min(maxHeight * (canvas.height / imgHeight), canvas.height - sourceY);

          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;

          if (pageCtx) {
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;

            pdf.addImage(pageImgData, 'PNG', 20, yPosition, imgWidth, pageImgHeight);
          }
        }
      }

      // Add footer to last page
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`CG360 Admin Dashboard - Infection Control Analysis | Page ${i} of ${pageCount}`, 20, pdfHeight - 10);
      }

      // Save the PDF
      const fileName = `infection-control-report-${currentDate.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Clean up classes
      modalContent.classList.remove('print-modal-content', 'infections-report');
      if (overlay) overlay.classList.remove('print-hidden');

    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to browser print if PDF generation fails
      const modalContent = document.querySelector('[data-radix-dialog-content]');
      if (modalContent) {
        modalContent.classList.add('print-modal-content', 'infections-report');
        const overlay = document.querySelector('[data-radix-dialog-overlay]');
        if (overlay) overlay.classList.add('print-hidden');
        window.print();
        modalContent.classList.remove('print-modal-content', 'infections-report');
        if (overlay) overlay.classList.remove('print-hidden');
      }
    }
  };

  const infectionTypes = [
    { key: 'uti', label: 'UTI', value: aggregateInfectionData.uti, color: '#ec4899', description: 'Urinary Tract Infections' },
    { key: 'chest', label: 'Chest Infections', value: aggregateInfectionData.chest, color: '#ef4444', description: 'Respiratory infections' },
    { key: 'wound', label: 'Wound Infections', value: aggregateInfectionData.wound, color: '#f97316', description: 'Infections from wounds' }
  ];

  const controlMetrics = [
    { metric: 'Hand Hygiene Compliance', value: 94, target: 95, color: '#10b981', description: 'Staff hand hygiene rate' },
    { metric: 'Antibiotic Stewardship', value: 87, target: 90, color: '#f59e0b', description: 'Appropriate antibiotic use' },
    { metric: 'Isolation Protocol', value: 91, target: 95, color: '#10b981', description: 'Proper isolation procedures' },
    { metric: 'PPE Usage', value: 96, target: 95, color: '#10b981', description: 'Personal protective equipment compliance' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="print-title">
                <Shield className="w-5 h-5 text-pink-500" />
                Infection Control - Detailed Analysis
              </DialogTitle>
              <DialogDescription className="print-description">
                Comprehensive overview of infection rates and control measures
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
                {aggregateInfectionData.workspacesWithData} workspaces reporting
              </Badge>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="print-grid-3">
            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Total Infections</div>
                <Shield className="h-4 w-4 text-pink-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-orange-600">{aggregateInfectionData.totalInfections}</div>
                <p className="print-metric-label">
                  Across all workspaces
                </p>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Most Common</div>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-pink-600">
                  {infectionTypes.reduce((max, type) => type.value > max.value ? type : max, infectionTypes[0]).label}
                </div>
                <p className="print-metric-label">
                  {infectionTypes.reduce((max, type) => type.value > max.value ? type : max, infectionTypes[0]).value} cases
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
                  {aggregateInfectionData.workspacesWithData > 0
                    ? Math.round(aggregateInfectionData.totalInfections / aggregateInfectionData.workspacesWithData * 10) / 10
                    : 0}
                </div>
                <p className="print-metric-label">
                  Infections per facility
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
                {/* Infection Type Distribution */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Infection Types</div>
                    <div className="text-sm text-muted-foreground">Breakdown by infection category</div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={infectionTypes.map(type => ({
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
                      color="#ec4899"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Control Metrics */}
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Control Measures</div>
                  <div className="text-sm text-muted-foreground">Key infection prevention metrics</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {controlMetrics.map((metric) => (
                      <div key={metric.metric} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: metric.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{metric.metric}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-lg font-bold" style={{ color: metric.color }}>
                              {metric.value}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Target: {metric.target}%
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{metric.description}</div>
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
                  <div className="text-lg font-semibold">Infection Trends Over Time</div>
                  <div className="text-sm text-muted-foreground">Daily infection counts by type</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <LineChart
                      data={trendData.map(d => ({ date: d.date, value: d.total }))}
                      height={300}
                      color="#ec4899"
                    />
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {infectionTypes.map((type) => (
                        <div key={type.key} className="text-center">
                          <div className="text-sm font-medium">{type.label}</div>
                          <div className="text-lg font-bold" style={{ color: type.color }}>
                            {type.value}
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
                {infectionTypes.map((type) => (
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
                        {aggregateInfectionData.totalInfections > 0
                          ? `${Math.round((type.value / aggregateInfectionData.totalInfections) * 100)}% of total infections`
                          : 'No infections'
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

              {/* Prevention Effectiveness */}
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Prevention Effectiveness</div>
                  <div className="text-sm text-muted-foreground">Impact of control measures</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm font-medium text-green-600 mb-2">Prevention Success Rate</div>
                      <div className="text-2xl font-bold text-green-600">82%</div>
                      <div className="text-xs text-muted-foreground">Infections prevented through protocols</div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm font-medium text-blue-600 mb-2">Early Detection Rate</div>
                      <div className="text-2xl font-bold text-blue-600">89%</div>
                      <div className="text-xs text-muted-foreground">Infections caught in early stages</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Workspace Performance</div>
                  <div className="text-sm text-muted-foreground">Infections by facility with control ratings</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topWorkspaces.map((workspace, index) => (
                      <div key={workspace.name} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{workspace.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workspace.total} total infections
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={workspace.controlRating === 'Excellent' ? 'default' : workspace.controlRating === 'Good' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {workspace.controlRating}
                          </Badge>
                          <div className="flex gap-1 text-xs">
                            <span className="text-pink-600">U:{workspace.uti}</span>
                            <span className="text-red-600">C:{workspace.chest}</span>
                            <span className="text-orange-600">W:{workspace.wound}</span>
                          </div>
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
          <div>CG360 Admin Dashboard - Infection Control Analysis</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}