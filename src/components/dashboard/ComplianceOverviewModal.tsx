"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, CheckCircle, AlertCircle, Target, Award } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import OccupancyPie from '@/components/admin/occupancy-pie';

interface ComplianceOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface AuditData {
  auditType: string;
  scorePercent: number | null;
  yesCount: number | null;
  totalCount: number | null;
  updatedAt: string | null;
}

interface ComplianceStats {
  overallPercentage: number | null;
  totalYesCount: number;
  totalQuestions: number;
  auditsCompleted: number;
  totalAudits: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export function ComplianceOverviewModal({ isOpen, onClose, workspaceId }: ComplianceOverviewModalProps) {
  const [auditData, setAuditData] = useState<Record<string, AuditData>>({});
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    setLoading(true);

    // Listen to audit latest scores
    const ref = collection(db, `workspaces/${workspaceId}/settings`);
    const q = query(ref, where('__name__', '==', 'audit_latest_scores'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data() as any;
        const processedData: Record<string, AuditData> = {};

        const auditTypes = [
          'care-plan', 'health-safety', 'maintenance', 'restrictive-practice',
          'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'
        ];

        auditTypes.forEach(auditType => {
          const audit = data[auditType];
          if (audit) {
            processedData[auditType] = {
              auditType,
              scorePercent: typeof audit.scorePercent === 'number' ? audit.scorePercent : null,
              yesCount: typeof audit.yesCount === 'number' ? audit.yesCount : null,
              totalCount: typeof audit.totalCount === 'number' ? audit.totalCount : null,
              updatedAt: audit.updatedAt || null
            };
          }
        });

        setAuditData(processedData);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, workspaceId]);

  const calculateStats = (): ComplianceStats => {
    const audits = Object.values(auditData);
    const validAudits = audits.filter(audit => audit.scorePercent !== null);

    if (validAudits.length === 0) {
      return {
        overallPercentage: null,
        totalYesCount: 0,
        totalQuestions: 0,
        auditsCompleted: 0,
        totalAudits: 10,
        trend: 'stable',
        change: 0
      };
    }

    const totalYesCount = validAudits.reduce((sum, audit) => sum + (audit.yesCount || 0), 0);
    const totalQuestions = validAudits.reduce((sum, audit) => sum + (audit.totalCount || 0), 0);
    const overallPercentage = totalQuestions > 0 ? Math.round((totalYesCount / totalQuestions) * 100) : null;

    // Calculate trend (simplified - in real app would compare with historical data)
    const trend: 'up' | 'down' | 'stable' = 'stable';
    const change = 0;

    return {
      overallPercentage,
      totalYesCount,
      totalQuestions,
      auditsCompleted: validAudits.length,
      totalAudits: 10,
      trend,
      change
    };
  };

  const stats = calculateStats();

  const getAuditDisplayName = (auditType: string): string => {
    const names: Record<string, string> = {
      'care-plan': 'Care Plan',
      'health-safety': 'Health & Safety',
      'maintenance': 'Maintenance',
      'restrictive-practice': 'Restrictive Practice',
      'fire-safety': 'Fire Safety',
      'infection-control': 'Infection Control',
      'mealtime': 'Mealtime',
      'night-visit': 'Night Visit',
      'staff-file': 'Staff File',
      'kitchen': 'Kitchen'
    };
    return names[auditType] || auditType.replace(/-/g, ' ');
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number | null): string => {
    if (score === null) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl p-0 max-h-[90vh] overflow-hidden">
        {/* Dark hero header to match dashboard style */}
        <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Compliance Overview</DialogTitle>
                <p className="text-slate-300 text-sm mt-1">Detailed audit performance and compliance analytics</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-b-lg border-0 shadow-none max-h-[calc(90vh-120px)] overflow-y-auto">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Overall Compliance Summary */}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  Overall Compliance Score
                </CardTitle>
              </CardHeader>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <OccupancyPie
                    percent={stats.overallPercentage ?? 0}
                    size={120}
                    strokeWidth={8}
                    gradientColors={{
                      start: stats.overallPercentage && stats.overallPercentage >= 80 ? '#10b981' :
                             stats.overallPercentage && stats.overallPercentage >= 60 ? '#f59e0b' : '#ef4444',
                      end: stats.overallPercentage && stats.overallPercentage >= 80 ? '#059669' :
                           stats.overallPercentage && stats.overallPercentage >= 60 ? '#d97706' : '#dc2626'
                    }}
                    centerFontSize={18}
                    centerClassName="font-bold text-gray-900"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/60 rounded-lg border border-emerald-200">
                      <div className="text-2xl font-bold text-emerald-700">{stats.auditsCompleted}</div>
                      <div className="text-sm text-emerald-600">Audits Completed</div>
                    </div>
                    <div className="text-center p-4 bg-white/60 rounded-lg border border-emerald-200">
                      <div className="text-2xl font-bold text-emerald-700">{stats.totalYesCount}</div>
                      <div className="text-sm text-emerald-600">Questions Passed</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Progress: {stats.auditsCompleted} of {stats.totalAudits} audits</span>
                    <span>{stats.totalYesCount} of {stats.totalQuestions} questions</span>
                  </div>
                  <Progress value={(stats.auditsCompleted / stats.totalAudits) * 100} className="h-2" />
                </div>
              </div>

              {/* Individual Audit Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                Individual Audit Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(auditData).map(([auditType, data]) => (
                  <div key={auditType} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{getAuditDisplayName(auditType)}</h3>
                      <Badge variant={data.scorePercent !== null ? "secondary" : "outline"} className={getScoreBgColor(data.scorePercent)}>
                        {data.scorePercent !== null ? `${data.scorePercent}%` : 'Pending'}
                      </Badge>
                    </div>

                    {data.scorePercent !== null ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Progress value={data.scorePercent} className="flex-1 h-2" />
                          <span className={`text-sm font-medium ${getScoreColor(data.scorePercent)}`}>
                            {data.scorePercent}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {data.yesCount} of {data.totalCount} questions passed
                        </div>
                        {data.updatedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last updated: {new Date(data.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 italic">Not completed yet</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Compliance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-blue-700">
                    {Object.values(auditData).filter(a => a.scorePercent && a.scorePercent >= 80).length}
                  </div>
                  <div className="text-sm text-blue-600">High Performing Audits</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-yellow-700">
                    {Object.values(auditData).filter(a => a.scorePercent && a.scorePercent >= 60 && a.scorePercent < 80).length}
                  </div>
                  <div className="text-sm text-yellow-600">Needs Improvement</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-red-700">
                    {Object.values(auditData).filter(a => a.scorePercent && a.scorePercent < 60).length}
                  </div>
                  <div className="text-sm text-red-600">Critical Attention Required</div>
                </div>
              </div>
          </CardContent>
        </Card>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}