"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Target, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  auditType: string;
  auditName: string;
  currentScore: number | null;
  onStartAudit?: (auditType: string) => void;
}

interface AuditEntry {
  id: string;
  auditType: string;
  scorePercent: number;
  yesCount: number;
  totalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AuditDetailModal = ({
  isOpen,
  onClose,
  workspaceId,
  auditType,
  auditName,
  currentScore,
  onStartAudit
}: AuditDetailModalProps) => {
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>('90d');

  // Load audit history
  useEffect(() => {
    if (!workspaceId || !isOpen || !auditType) return;

    setLoading(true);
    try {
      const colRef = collection(db, 'audits');
      const now = new Date();
      const periodDays = selectedPeriod === '30d' ? 30 : selectedPeriod === '90d' ? 90 : 365;
      const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

      const q = query(
        colRef,
        where('workspaceId', '==', workspaceId),
        where('auditType', '==', auditType),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsub = onSnapshot(q, (snap) => {
        const entries = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
        })) as AuditEntry[];

        setAuditHistory(entries);
        setLoading(false);
      }, (err) => {
        console.error('Failed to load audit history', err);
        setLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.error('Failed to set up audit history listener', e);
      setLoading(false);
    }
  }, [workspaceId, isOpen, auditType, selectedPeriod]);

  const calculateStats = () => {
    if (auditHistory.length === 0) return null;

    const scores = auditHistory.map(entry => entry.scorePercent);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const latest = scores[0];
    const previous = scores[1];
    const scoreTrend = previous ? ((latest - previous) / previous) * 100 : 0;

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const completedAudits = auditHistory.filter(entry => entry.scorePercent >= 100).length;
    const avgQuestions = auditHistory.length > 0 ?
      auditHistory.reduce((sum, entry) => sum + entry.totalCount, 0) / auditHistory.length : 0;

    return {
      avgScore: Math.round(avgScore),
      scoreTrend,
      minScore,
      maxScore,
      latest,
      totalEntries: auditHistory.length,
      completedAudits,
      avgQuestions: Math.round(avgQuestions)
    };
  };

  const stats = calculateStats();

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-green-600';
    if (trend < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Improvement';
    return 'Critical';
  };

  const handleStartAudit = () => {
    if (onStartAudit) {
      onStartAudit(auditType);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl p-0 max-h-[90vh] overflow-hidden">
        {/* Dark hero header to match dashboard style */}
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white p-6 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">{auditName} Audit Details</DialogTitle>
                <p className="text-slate-300 text-sm mt-1">Monitor audit performance and historical trends</p>
              </div>
            </div>
            {onStartAudit && (
              <Button
                onClick={handleStartAudit}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Start Audit
              </Button>
            )}
          </div>
        </div>

        <Card className="rounded-b-lg border-0 shadow-none max-h-[calc(90vh-120px)] overflow-y-auto">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Current Status */}
              <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl font-bold ${getScoreColor(currentScore || 0)}`}>
                        {currentScore !== null ? `${currentScore}%` : 'Not Started'}
                      </div>
                      <div>
                        <div className={`text-lg font-semibold ${getScoreColor(currentScore || 0)}`}>
                          {currentScore !== null ? getScoreStatus(currentScore) : 'Pending'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {currentScore !== null ? 'Current score' : 'No audit completed yet'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentScore !== null ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Period Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Period:</span>
                <div className="flex gap-1">
                  {[
                    { key: '30d', label: '30 Days' },
                    { key: '90d', label: '90 Days' },
                    { key: '1y', label: '1 Year' }
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={selectedPeriod === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPeriod(key as any)}
                      className={selectedPeriod === key ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-300 hover:bg-gray-50'}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading audit data...</p>
                </div>
              ) : stats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Target className="h-4 w-4 text-blue-600" />
                          Average Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}%</div>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(stats.scoreTrend)}
                          <span className={`text-sm ${getTrendColor(stats.scoreTrend)}`}>
                            {stats.scoreTrend > 0 ? '+' : ''}{stats.scoreTrend.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          Best Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getScoreColor(stats.maxScore)}`}>{stats.maxScore}%</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Peak performance
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Completions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats.completedAudits}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          of {stats.totalEntries} audits
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          Total Audits
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stats.totalEntries}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Records in period
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Score Range */}
                  <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">Score Range</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200/50">
                          <div className="text-sm text-red-600 font-medium">Lowest</div>
                          <div className="text-2xl font-bold text-red-700">{stats.minScore}%</div>
                          <div className="text-xs text-red-500">Minimum score</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200/50">
                          <div className="text-sm text-blue-600 font-medium">Average</div>
                          <div className="text-2xl font-bold text-blue-700">{stats.avgScore}%</div>
                          <div className="text-xs text-blue-500">Typical performance</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200/50">
                          <div className="text-sm text-green-600 font-medium">Highest</div>
                          <div className="text-2xl font-bold text-green-700">{stats.maxScore}%</div>
                          <div className="text-xs text-green-500">Best performance</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Audit History */}
                  <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">Recent Audit History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {auditHistory.slice(0, 10).map((entry, index) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-gray-600">
                                {entry.createdAt.toLocaleDateString()}
                              </div>
                              {index === 0 && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Latest</Badge>
                              )}
                              {entry.scorePercent >= 100 && (
                                <Badge className="text-xs bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-sm text-gray-500">Score</div>
                                <div className={`font-bold text-lg ${getScoreColor(entry.scorePercent)}`}>{entry.scorePercent}%</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-500">Questions</div>
                                <div className="font-semibold text-gray-900">{entry.yesCount}/{entry.totalCount}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-500">Status</div>
                                <div className={`font-semibold ${getScoreColor(entry.scorePercent)}`}>{getScoreStatus(entry.scorePercent)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12">
                  <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No audit history available for the selected period</p>
                  <p className="text-sm text-gray-500 mt-1">Complete your first {auditName.toLowerCase()} audit to see trends</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export { AuditDetailModal };