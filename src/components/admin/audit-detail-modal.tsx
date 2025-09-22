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
import { Progress } from '@/components/ui/progress';
import {
  Shield,
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
  Printer
} from 'lucide-react';
import LineChart from '@/components/admin/line-chart';
import BarChart from '@/components/admin/bar-chart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateAuditData: {
    totalYesCount: number;
    totalQuestions: number;
    overallPercentage: number | null;
    auditsCompleted: number;
    totalAudits: number;
    workspacesWithData: number;
  };
  workspaces: any[];
}

type TimePeriod = 'day' | 'week' | 'month';

export default function AuditDetailModal({
  isOpen,
  onClose,
  aggregateAuditData,
  workspaces
}: AuditDetailModalProps) {
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

      // Generate realistic mock data with some variation around the overall percentage
      const baseScore = aggregateAuditData.overallPercentage || 75;
      const variation = (Math.random() - 0.5) * 20; // ±10% variation
      const score = Math.max(0, Math.min(100, baseScore + variation));

      data.push({
        date: dateStr,
        score: Math.round(score),
        completed: Math.floor(Math.random() * 5) + 1,
        total: 11 // 11 audit types
      });
    }

    return data;
  }, [timePeriod, aggregateAuditData.overallPercentage]);

  // Calculate period-over-period change
  const periodChange = useMemo(() => {
    if (trendData.length < 2) return { change: 0, percentage: 0 };

    const current = trendData[trendData.length - 1].score;
    const previous = trendData[trendData.length - 2].score;
    const change = current - previous;
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;

    return { change, percentage };
  }, [trendData]);

  const handlePrint = async () => {
    const modalContent = document.querySelector('[data-radix-dialog-content]');
    if (!modalContent) return;

    try {
      // Add print-specific classes for PDF generation
      modalContent.classList.add('print-modal-content', 'audit-report');

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
      pdf.text('Compliance Score - Detailed Analysis', 20, 25);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Comprehensive overview of audit performance and compliance metrics', 20, 35);

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
        pdf.text(`CG360 Admin Dashboard - Compliance Score Analysis | Page ${i} of ${pageCount}`, 20, pdfHeight - 10);
      }

      // Save the PDF
      const fileName = `compliance-audit-report-${currentDate.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Clean up classes
      modalContent.classList.remove('print-modal-content', 'audit-report');
      if (overlay) overlay.classList.remove('print-hidden');

    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to browser print if PDF generation fails
      const modalContent = document.querySelector('[data-radix-dialog-content]');
      if (modalContent) {
        modalContent.classList.add('print-modal-content', 'audit-report');
        const overlay = document.querySelector('[data-radix-dialog-overlay]');
        if (overlay) overlay.classList.add('print-hidden');
        window.print();
        modalContent.classList.remove('print-modal-content', 'audit-report');
        if (overlay) overlay.classList.remove('print-hidden');
      }
    }
  };

  // Mock audit types data
  const auditTypes = [
    { name: 'Care Plan', score: 82, total: 25, completed: 23, color: '#10b981' },
    { name: 'Health & Safety', score: 78, total: 30, completed: 28, color: '#f59e0b' },
    { name: 'Maintenance', score: 85, total: 15, completed: 14, color: '#10b981' },
    { name: 'Restrictive Practice', score: 76, total: 20, completed: 18, color: '#f59e0b' },
    { name: 'Fire Safety', score: 88, total: 25, completed: 24, color: '#10b981' },
    { name: 'Infection Control', score: 79, total: 35, completed: 32, color: '#f59e0b' },
    { name: 'Mealtime', score: 83, total: 20, completed: 19, color: '#10b981' },
    { name: 'Night Visit', score: 81, total: 15, completed: 14, color: '#10b981' },
    { name: 'Staff File', score: 74, total: 40, completed: 37, color: '#ef4444' },
    { name: 'Kitchen', score: 86, total: 18, completed: 17, color: '#10b981' },
    { name: 'Falls', score: 77, total: 22, completed: 20, color: '#f59e0b' }
  ];

  // Top performing workspaces
  const topWorkspaces = useMemo(() => {
    return workspaces
      .map(ws => ({
        name: ws.name || ws.id,
        score: Math.floor(Math.random() * 30) + 70, // 70-100 range
        auditsCompleted: Math.floor(Math.random() * 8) + 3,
        totalAudits: 11,
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [workspaces]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { text: 'Excellent', icon: CheckCircle2, color: 'text-green-600' };
    if (score >= 60) return { text: 'Good', icon: AlertTriangle, color: 'text-yellow-600' };
    return { text: 'Needs Attention', icon: XCircle, color: 'text-red-600' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="print-title">
                <Shield className="w-5 h-5 text-blue-500" />
                Compliance Score - Detailed Analysis
              </DialogTitle>
              <DialogDescription className="print-description">
                Comprehensive overview of audit performance and compliance metrics
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
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={periodChange.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {periodChange.change >= 0 ? '+' : ''}{periodChange.change}% ({periodChange.percentage >= 0 ? '+' : ''}{periodChange.percentage}%)
                </span>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {aggregateAuditData.workspacesWithData} workspaces reporting
              </Badge>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="print-grid-3">
            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Overall Score</div>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-blue-600">
                  {aggregateAuditData.overallPercentage || 0}%
                </div>
                <p className="print-metric-label">
                  Compliance rate
                </p>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Audits Completed</div>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-green-600">
                  {aggregateAuditData.auditsCompleted}
                </div>
                <p className="print-metric-label">
                  Out of {aggregateAuditData.totalAudits} total
                </p>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader className="print-card-header">
                <div className="text-sm font-medium">Avg per Workspace</div>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="print-card-content">
                <div className="print-metric-value text-purple-600">
                  {aggregateAuditData.workspacesWithData > 0
                    ? Math.round(aggregateAuditData.auditsCompleted / aggregateAuditData.workspacesWithData * 10) / 10
                    : 0}
                </div>
                <p className="print-metric-label">
                  Audits per facility
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
                {/* Score Distribution */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Audit Type Performance</div>
                    <div className="text-sm text-muted-foreground">Compliance scores by audit category</div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {auditTypes.slice(0, 6).map((audit) => (
                        <div key={audit.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getScoreColor(audit.score) }}
                            />
                            <span className="text-sm truncate">{audit.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: getScoreColor(audit.score) }}>
                              {audit.score}%
                            </span>
                            <div className="w-16">
                              <Progress value={audit.score} className="h-2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Trend */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Compliance Trend</div>
                    <div className="text-sm text-muted-foreground">Last {timePeriod === 'day' ? '24 hours' : timePeriod === 'week' ? '7 days' : '30 days'}</div>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={trendData.map(d => ({ date: d.date, value: d.score }))}
                      height={200}
                      color="#3b82f6"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Compliance Status</div>
                  <div className="text-sm text-muted-foreground">Overall audit performance summary</div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {auditTypes.filter(a => a.score >= 80).length}
                      </div>
                      <div className="text-sm font-medium text-green-600">Excellent (80%+)</div>
                      <div className="text-xs text-muted-foreground">Audit categories</div>
                    </div>
                    <div className="text-center p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-yellow-600 mb-1">
                        {auditTypes.filter(a => a.score >= 60 && a.score < 80).length}
                      </div>
                      <div className="text-sm font-medium text-yellow-600">Good (60-79%)</div>
                      <div className="text-xs text-muted-foreground">Audit categories</div>
                    </div>
                    <div className="text-center p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {auditTypes.filter(a => a.score < 60).length}
                      </div>
                      <div className="text-sm font-medium text-red-600">Needs Attention (&lt;60%)</div>
                      <div className="text-xs text-muted-foreground">Audit categories</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Compliance Trends Over Time</div>
                  <div className="text-sm text-muted-foreground">Daily compliance scores and audit completion rates</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <LineChart
                      data={trendData.map(d => ({ date: d.date, value: d.score }))}
                      height={300}
                      color="#3b82f6"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm font-medium text-blue-600 mb-2">Average Score</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(trendData.reduce((sum, d) => sum + d.score, 0) / trendData.length)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Across selected period</div>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm font-medium text-green-600 mb-2">Completion Rate</div>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round((aggregateAuditData.auditsCompleted / aggregateAuditData.totalAudits) * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Audits completed vs total</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {auditTypes.map((audit) => {
                  const status = getScoreStatus(audit.score);
                  const StatusIcon = status.icon;

                  return (
                    <Card key={audit.name}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold">{audit.name}</div>
                          <Badge variant="outline" className={`flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">Compliance audit category</div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold mb-2" style={{ color: getScoreColor(audit.score) }}>
                          {audit.score}%
                        </div>
                        <div className="mb-3">
                          <Progress value={audit.score} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Completed</div>
                            <div className="font-medium">{audit.completed}/{audit.total}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Success Rate</div>
                            <div className="font-medium">{Math.round((audit.completed / audit.total) * 100)}%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="text-lg font-semibold">Workspace Performance</div>
                  <div className="text-sm text-muted-foreground">Compliance scores by facility</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topWorkspaces.map((workspace, index) => {
                      const status = getScoreStatus(workspace.score);
                      const StatusIcon = status.icon;

                      return (
                        <div key={workspace.name} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{workspace.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {workspace.auditsCompleted}/{workspace.totalAudits} audits completed
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-lg font-bold" style={{ color: getScoreColor(workspace.score) }}>
                                {workspace.score}%
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                {workspace.trend === 'up' ? (
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                )}
                                <span className={workspace.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                                  {workspace.trend === 'up' ? 'Improving' : 'Declining'}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className={`flex items-center gap-1 ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.text}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Print Footer */}
        <div className="print-footer">
          <div>Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
          <div>CG360 Admin Dashboard - Compliance Score Analysis</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}