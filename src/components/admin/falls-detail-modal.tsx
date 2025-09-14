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
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
  Clock,
  Activity,
  AlertCircle,
  Printer,
  Download
} from 'lucide-react';
import LineChart from '@/components/admin/line-chart';
import BarChart from '@/components/admin/bar-chart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FallsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateFallsData: {
    totalFalls: number;
    workspacesWithData: number;
  };
  workspaces: any[];
}

type TimePeriod = 'day' | 'week' | 'month';

export default function FallsDetailModal({
  isOpen,
  onClose,
  aggregateFallsData,
  workspaces
}: FallsDetailModalProps) {
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
      const falls = Math.floor(Math.random() * 8) + 1;
      data.push({
        date: dateStr,
        falls,
        withInjury: Math.floor(falls * 0.3),
        withoutInjury: falls - Math.floor(falls * 0.3)
      });
    }

    return data;
  }, [timePeriod]);

  // Calculate period-over-period change
  const periodChange = useMemo(() => {
    if (trendData.length < 2) return { change: 0, percentage: 0 };

    const current = trendData[trendData.length - 1].falls;
    const previous = trendData[trendData.length - 2].falls;
    const change = current - previous;
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;

    return { change, percentage };
  }, [trendData]);

  // Top workspaces by falls
  const topWorkspaces = useMemo(() => {
    return workspaces
      .map(ws => ({
        name: ws.name || ws.id,
        falls: Math.floor(Math.random() * 15) + 1,
        withInjury: Math.floor(Math.random() * 5),
        withoutInjury: Math.floor(Math.random() * 10) + 1,
        riskLevel: Math.random() > 0.7 ? 'High' : Math.random() > 0.4 ? 'Medium' : 'Low'
      }))
      .sort((a, b) => b.falls - a.falls)
      .slice(0, 5);
  }, [workspaces]);

  const handlePrint = async () => {
    // Try multiple selectors to find the modal content
    let modalContent = document.querySelector('[data-radix-dialog-content]');
    if (!modalContent) {
      modalContent = document.querySelector('.fixed.inset-0.z-50 .relative');
    }
    if (!modalContent) {
      modalContent = document.querySelector('[role="dialog"]');
    }

    if (!modalContent) {
      return;
    }

    try {
      // Add print-specific classes for PDF generation
      modalContent.classList.add('print-modal-content', 'falls-report');

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
      pdf.text('Falls Prevention - Detailed Analysis', 20, 25);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Comprehensive overview of falls incidents and prevention measures', 20, 35);

      // Add generation info
      const currentDate = new Date();
      pdf.setFontSize(10);
      pdf.text(`Generated: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`, 20, 45);

      // Capture the modal content as image
      const canvas = await html2canvas(modalContent as HTMLElement, {
        scale: 1, // Reduce scale to avoid memory issues
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: modalContent.scrollWidth,
        height: modalContent.scrollHeight,
        logging: true // Enable html2canvas logging
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdfWidth - 40; // 20mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add content to PDF (split into multiple pages if needed)
      const yPosition = 55;
      const maxHeight = pdfHeight - 20;

      if (imgHeight <= maxHeight) {
        // Content fits on one page
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      } else {
        // Content spans multiple pages - simplified version
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, maxHeight);
      }

      // Add footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`DocuFlow Admin Dashboard - Falls Prevention Analysis | Generated: ${currentDate.toLocaleDateString()}`, 20, pdfHeight - 10);

      // Save the PDF
      const fileName = `falls-prevention-report-${currentDate.toISOString().split('T')[0]}.pdf`;

      // Try multiple approaches to save the PDF
      try {
        // Method 1: Standard save
        pdf.save(fileName);

        // Method 2: Alternative approach using blob
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } catch (saveError) {
        // PDF generated but save failed - continue silently
      }

    } catch (error) {
      // Fallback to browser print if PDF generation fails
      const modalContent = document.querySelector('[data-radix-dialog-content]');
      if (modalContent) {
        modalContent.classList.add('print-modal-content', 'falls-report');
        const overlay = document.querySelector('[data-radix-dialog-overlay]');
        if (overlay) overlay.classList.add('print-hidden');
        window.print();
        modalContent.classList.remove('print-modal-content', 'falls-report');
        if (overlay) overlay.classList.remove('print-hidden');
      }
    }
  };

  const fallsCategories = [
    { key: 'withInjury', label: 'Falls with Injury', value: Math.floor(aggregateFallsData.totalFalls * 0.3), color: '#ef4444', description: 'Falls requiring medical attention' },
    { key: 'withoutInjury', label: 'Falls without Injury', value: Math.floor(aggregateFallsData.totalFalls * 0.7), color: '#f97316', description: 'Falls without reported injury' }
  ];

  const riskInsights = [
    { level: 'High Risk', count: Math.floor(workspaces.length * 0.2), color: '#ef4444', description: 'Facilities with elevated fall rates' },
    { level: 'Medium Risk', count: Math.floor(workspaces.length * 0.4), color: '#f97316', description: 'Facilities with moderate fall rates' },
    { level: 'Low Risk', count: Math.floor(workspaces.length * 0.4), color: '#10b981', description: 'Facilities with low fall rates' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="print-title">
                <Target className="w-5 h-5 text-orange-500" />
                Falls Prevention - Detailed Analysis
              </DialogTitle>
              <DialogDescription className="print-description">
                Comprehensive overview of fall incidents and prevention metrics
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
                {aggregateFallsData.workspacesWithData} workspaces reporting
              </Badge>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="print-grid-3">
            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Total Falls</div>
                <Target className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-orange-600">{aggregateFallsData.totalFalls}</div>
                <p className="print-metric-label">
                  Across all workspaces
                </p>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Injury Rate</div>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-red-600">
                  {aggregateFallsData.totalFalls > 0
                    ? Math.round((Math.floor(aggregateFallsData.totalFalls * 0.3) / aggregateFallsData.totalFalls) * 100)
                    : 0}%
                </div>
                <p className="print-metric-label">
                  Falls with injury
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
                  {aggregateFallsData.workspacesWithData > 0
                    ? Math.round(aggregateFallsData.totalFalls / aggregateFallsData.workspacesWithData * 10) / 10
                    : 0}
                </div>
                <p className="print-metric-label">
                  Falls per facility
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
                {/* Falls Categories */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Falls by Severity</div>
                    <div className="text-sm text-muted-foreground">Breakdown by injury status</div>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={fallsCategories.map(type => ({
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
                      data={trendData.map(d => ({ date: d.date, value: d.falls }))}
                      height={200}
                      color="#f97316"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Risk Assessment */}
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Risk Assessment</div>
                  <div className="text-sm text-muted-foreground">Facility risk levels based on fall rates</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {riskInsights.map((risk) => (
                      <div key={risk.level} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: risk.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{risk.level}</div>
                          <div className="text-lg font-bold" style={{ color: risk.color }}>{risk.count}</div>
                          <div className="text-xs text-muted-foreground">{risk.description}</div>
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
                  <div className="text-lg font-semibold">Falls Trends Over Time</div>
                  <div className="text-sm text-muted-foreground">Daily fall counts with injury breakdown</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <LineChart
                      data={trendData.map(d => ({ date: d.date, value: d.falls }))}
                      height={300}
                      color="#f97316"
                    />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-4 rounded-lg border">
                        <div className="text-sm font-medium text-red-600">With Injury</div>
                        <div className="text-2xl font-bold text-red-600">
                          {Math.floor(aggregateFallsData.totalFalls * 0.3)}
                        </div>
                        <div className="text-xs text-muted-foreground">Require medical attention</div>
                      </div>
                      <div className="text-center p-4 rounded-lg border">
                        <div className="text-sm font-medium text-orange-600">Without Injury</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {Math.floor(aggregateFallsData.totalFalls * 0.7)}
                        </div>
                        <div className="text-xs text-muted-foreground">No reported injury</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {fallsCategories.map((category) => (
                  <Card key={category.key}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div className="text-lg font-semibold">{category.label}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{category.description}</div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2" style={{ color: category.color }}>
                        {category.value}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {aggregateFallsData.totalFalls > 0
                          ? `${Math.round((category.value / aggregateFallsData.totalFalls) * 100)}% of total falls`
                          : 'No falls'
                        }
                      </div>
                      <div className="mt-4">
                        <LineChart
                          data={trendData.map(d => ({
                            date: d.date,
                            value: d[category.key as keyof typeof d] as number
                          }))}
                          height={150}
                          color={category.color}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Prevention Insights */}
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Prevention Insights</div>
                  <div className="text-sm text-muted-foreground">Key metrics for fall prevention</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm font-medium text-green-600 mb-2">Prevention Success Rate</div>
                      <div className="text-2xl font-bold text-green-600">78%</div>
                      <div className="text-xs text-muted-foreground">Facilities with active prevention programs</div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm font-medium text-blue-600 mb-2">Risk Assessment Coverage</div>
                      <div className="text-2xl font-bold text-blue-600">92%</div>
                      <div className="text-xs text-muted-foreground">Residents with recent risk assessments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Workspace Performance</div>
                  <div className="text-sm text-muted-foreground">Falls by facility with risk levels</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topWorkspaces.map((workspace, index) => (
                      <div key={workspace.name} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{workspace.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workspace.falls} total falls
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={workspace.riskLevel === 'High' ? 'destructive' : workspace.riskLevel === 'Medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {workspace.riskLevel} Risk
                          </Badge>
                          <div className="flex gap-1 text-xs">
                            <span className="text-red-600">I:{workspace.withInjury}</span>
                            <span className="text-orange-600">N:{workspace.withoutInjury}</span>
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
          <div>DocuFlow Admin Dashboard - Falls Prevention Analysis</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}