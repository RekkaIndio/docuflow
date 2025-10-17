"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, TrendingUp, TrendingDown, Users, FileText, Shield, BarChart3, Activity, Target, Zap, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer } from 'firebase/firestore';
import { workspaceCollectionPath } from '@/lib/paths';
import { cn } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/admin-page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Workspace {
  id: string;
  name: string;
  organisationId: string;
  region?: string;
  totalBeds?: number;
  occupiedBeds?: number;
  occupancy?: number;
  folders?: any[];
}

interface WorkspaceScore {
  workspaceId: string;
  workspaceName: string;
  averageScore: number | null;
  auditCount: number;
}

interface WorkspaceIncident {
  workspaceId: string;
  workspaceName: string;
  wounds: number;
  falls: number;
  infections: number;
  totalIncidents: number;
}

interface WorkspaceOccupancy {
  workspaceId: string;
  workspaceName: string;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
}

interface WorkspaceDocument {
  workspaceId: string;
  workspaceName: string;
  totalDocuments: number;
  fileTypes: Record<string, number>;
}

interface AuditTrendPoint {
  date: string;
  score: number;
  auditType?: string | null;
}

interface AuditTrendSeries {
  workspaceId: string;
  workspaceName: string;
  points: AuditTrendPoint[];
  latestScore: number | null;
  change: number | null;
}

interface IncidentTrendPoint {
  date: string;
  falls: number;
  wounds: number;
  infections: number;
  total: number;
}

interface IncidentTrendSeries {
  workspaceId: string;
  workspaceName: string;
  points: IncidentTrendPoint[];
  totalLast30Days: number;
}

interface WorkspaceActionPlanSummary {
  workspaceId: string;
  workspaceName: string;
  totalItems: number;
  completedItems: number;
  openItems: number;
  overdueItems: number;
  highPriorityOpen: number;
  completionRate: number;
  latestUpdate?: string | null;
}

interface WorkspaceLearningSummary {
  workspaceId: string;
  workspaceName: string;
  lessonsCount: number;
  rcaCount: number;
  outstandingActions: number;
  latestActivity?: string | null;
}

interface StaffingHistoryPoint {
  date: string;
  day: number;
  night: number;
}

interface WorkspaceStaffingSummary {
  workspaceId: string;
  workspaceName: string;
  currentDay: number;
  currentNight: number;
  history: StaffingHistoryPoint[];
}

interface StaffingAnalytics {
  workspaceStaffing: WorkspaceStaffingSummary[];
  totalDay: number;
  totalNight: number;
  averageDay: number;
  averageNight: number;
}

interface IncidentAnalytics {
  workspaceIncidents: WorkspaceIncident[];
  totalWounds: number;
  totalFalls: number;
  totalInfections: number;
  totalIncidents: number;
  workspaceTrends: IncidentTrendSeries[];
}

const COLOR_PALETTE = ['#2563eb', '#16a34a', '#f97316', '#8b5cf6', '#ec4899', '#0ea5e9'];

function getDateFromInput(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return new Date(input.getTime());
  if (input instanceof Timestamp) return input.toDate();
  if (typeof input.toDate === 'function') {
    try {
      const converted = input.toDate();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return converted;
      }
    } catch (e) {
      // ignore conversion failure
    }
  }
  if (typeof input === 'number') {
    const fromNumber = new Date(input);
    if (!Number.isNaN(fromNumber.getTime())) return fromNumber;
  }
  if (typeof input === 'string') {
    const fromString = new Date(input);
    if (!Number.isNaN(fromString.getTime())) return fromString;
  }
  return null;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function toDateKey(input: any): string | null {
  const date = getDateFromInput(input);
  return date ? formatIsoDate(date) : null;
}

function toNumber(value: any): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function sortPointsByDate<T extends { date: string }>(points: T[]): T[] {
  return [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function buildIncidentTrendData(incidentData: IncidentAnalytics) {
  const globalBuckets: Record<string, { falls: number; wounds: number; infections: number; total: number }> = {};
  incidentData.workspaceTrends.forEach((series) => {
    series.points.forEach((point) => {
      if (!globalBuckets[point.date]) {
        globalBuckets[point.date] = { falls: 0, wounds: 0, infections: 0, total: 0 };
      }
      globalBuckets[point.date].falls += point.falls;
      globalBuckets[point.date].wounds += point.wounds;
      globalBuckets[point.date].infections += point.infections;
      globalBuckets[point.date].total += point.total;
    });
  });

  const globalTrend = sortPointsByDate(
    Object.entries(globalBuckets).map(([date, totals]) => ({
      date,
      ...totals,
    }))
  );

  return {
    workspaceTrends: incidentData.workspaceTrends,
    globalTrend,
  };
}

interface WorkspaceActivitySummary {
  workspaceId: string;
  workspaceName: string;
  checkinsToday: number;
}

interface UserActivityAnalytics {
  workspaceActivity: WorkspaceActivitySummary[];
  totalCheckinsToday: number;
  activeWorkspacesToday: number;
}

interface AnalyticsData {
  workspaces: Workspace[];
  auditData: {
    workspaceScores: WorkspaceScore[];
    overallAverage: number;
    totalAudits: number;
  };
  staffingData: StaffingAnalytics;
  occupancyData: {
    workspaceOccupancy: WorkspaceOccupancy[];
    totalBeds: number;
    totalOccupied: number;
    averageOccupancy: number;
  };
  incidentData: IncidentAnalytics;
  documentData: {
    workspaceDocuments: WorkspaceDocument[];
    totalDocuments: number;
    fileTypeDistribution: Record<string, number>;
  };
  userActivityData: UserActivityAnalytics;
  auditTrendData: {
    workspaceTrends: AuditTrendSeries[];
    globalTrend: Array<{ date: string; averageScore: number }>;
  };
  incidentTrendData: {
    workspaceTrends: IncidentTrendSeries[];
    globalTrend: Array<{ date: string; falls: number; wounds: number; infections: number; total: number }>;
  };
  actionPlanData: {
    workspaceActionPlans: WorkspaceActionPlanSummary[];
    totalOpen: number;
    totalOverdue: number;
    highPriorityOpen: number;
    completionRate: number;
  };
  lessonsData: {
    workspaceSummaries: WorkspaceLearningSummary[];
    totalLessons: number;
    totalRcas: number;
    totalOutstandingActions: number;
  };
}

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchAnalyticsData();
    }
  }, [user, loading, router]);

  const fetchAnalyticsData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Fetch workspaces
      const orgQuery = user && (user as any).organisationId ? `?orgId=${encodeURIComponent((user as any).organisationId)}` : '';
      const resp = await fetch(`/api/admin/workspaces${orgQuery}`);
      if (!resp.ok) throw new Error('Failed to fetch workspaces');
      const workspaceData = await resp.json();
      const workspaces: Workspace[] = workspaceData.workspaces || [];

      const [
        auditData,
        staffingData,
        occupancyData,
        incidentData,
        documentData,
        userActivityData,
        auditTrendData,
        actionPlanData,
        lessonsData,
      ] = await Promise.all([
        fetchAuditAnalytics(workspaces),
        fetchStaffingAnalytics(workspaces),
        fetchOccupancyAnalytics(workspaces),
        fetchIncidentAnalytics(workspaces),
        fetchDocumentAnalytics(workspaces),
        fetchUserActivityAnalytics(workspaces),
        fetchAuditTrendAnalytics(workspaces),
        fetchActionPlanAnalytics(workspaces),
        fetchLessonsAnalytics(workspaces),
      ]);

      const incidentTrendData = buildIncidentTrendData(incidentData);

      const analyticsData: AnalyticsData = {
        workspaces,
        auditData,
        staffingData,
        occupancyData,
        incidentData,
        documentData,
        userActivityData,
        auditTrendData,
        incidentTrendData,
        actionPlanData,
        lessonsData,
      };

      setData(analyticsData);
    } catch (err: any) {
      console.error('Failed to fetch analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoadingData(false);
    }
  };

  // Set selected workspaces to all when data loads
  useEffect(() => {
    if (data?.workspaces) {
      setSelectedWorkspaces(data.workspaces.map(ws => ws.id));
    }
  }, [data?.workspaces]);

  const fetchAuditAnalytics = async (workspaces: Workspace[]) => {
    // Implementation for audit analytics
    const auditPromises = workspaces.map(async (ws) => {
      try {
        const settingsCol = collection(db, workspaceCollectionPath(ws.id, 'settings', ws.organisationId));
        const auditRef = collection(settingsCol, 'audit_latest_scores');
        const snap = await getDocs(auditRef);

        let totalScore = 0;
        let count = 0;

        snap.forEach(docSnap => {
          const data = docSnap.data();
          const score = toNumber(data.overallScore ?? data.scorePercent ?? data.complianceScore);
          if (score !== null) {
            totalScore += score;
            count++;
          }
        });

        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          averageScore: count > 0 ? totalScore / count : null,
          auditCount: count,
        };
      } catch (error) {
        return { workspaceId: ws.id, workspaceName: ws.name, averageScore: null, auditCount: 0 };
      }
    });

    const results = await Promise.all(auditPromises);
    const validScores = results.filter((r): r is WorkspaceScore & { averageScore: number } => r.averageScore !== null);
    const overallAverage = validScores.length > 0 ? validScores.reduce((sum, r) => sum + r.averageScore, 0) / validScores.length : 0;
    return {
      workspaceScores: results,
      overallAverage,
      totalAudits: results.reduce((sum, r) => sum + r.auditCount, 0),
    };
  };

  const fetchStaffingAnalytics = async (workspaces: Workspace[]) => {
    // Implementation for staffing analytics
    const staffingPromises = workspaces.map(async (ws) => {
      try {
        const colRef = collection(db, workspaceCollectionPath(ws.id, 'daily-checkins', ws.organisationId));
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(45));
        const snap = await getDocs(q);

        const history = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const date = toDateKey(data.recordedAt ?? data.createdAt);
            if (!date) return null;
            const day = toNumber(data.staffingDay ?? data.staffing?.day) ?? 0;
            const night = toNumber(data.staffingNight ?? data.staffing?.night) ?? 0;
            return { date, day, night } as StaffingHistoryPoint;
          })
          .filter((entry): entry is StaffingHistoryPoint => entry !== null);

        const staffingHistory = sortPointsByDate(history);
        const latest = staffingHistory[staffingHistory.length - 1] || { date: formatIsoDate(new Date()), day: 0, night: 0 };
        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          currentDay: latest.day,
          currentNight: latest.night,
          history: staffingHistory,
        };
      } catch (error) {
        return { workspaceId: ws.id, workspaceName: ws.name, currentDay: 0, currentNight: 0, history: [] };
      }
    });

    const results = await Promise.all(staffingPromises);
    return {
      workspaceStaffing: results,
      totalDay: results.reduce((sum, r) => sum + r.currentDay, 0),
      totalNight: results.reduce((sum, r) => sum + r.currentNight, 0),
      averageDay: results.length > 0 ? results.reduce((sum, r) => sum + r.currentDay, 0) / results.length : 0,
      averageNight: results.length > 0 ? results.reduce((sum, r) => sum + r.currentNight, 0) / results.length : 0,
    };
  };

  const fetchOccupancyAnalytics = async (workspaces: Workspace[]) => {
    // Implementation for occupancy analytics
    const occupancyData = workspaces.map(ws => {
      const totalBeds = typeof ws.totalBeds === 'number' ? ws.totalBeds : 0;
      const occupiedBeds = typeof ws.occupiedBeds === 'number' ? ws.occupiedBeds : 0;
      const directRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : null;
      const occupancyValue = toNumber(ws.occupancy);
      const fallbackRate = occupancyValue !== null ? occupancyValue * 100 : null;
      return {
      workspaceId: ws.id,
      workspaceName: ws.name,
        totalBeds,
        occupiedBeds,
        occupancyRate: directRate ?? fallbackRate ?? 0,
      };
    });

    return {
      workspaceOccupancy: occupancyData,
      totalBeds: occupancyData.reduce((sum, o) => sum + o.totalBeds, 0),
      totalOccupied: occupancyData.reduce((sum, o) => sum + o.occupiedBeds, 0),
      averageOccupancy: occupancyData.length > 0 ? occupancyData.reduce((sum, o) => sum + o.occupancyRate, 0) / occupancyData.length : 0,
    };
  };

  const fetchIncidentAnalytics = async (workspaces: Workspace[]): Promise<IncidentAnalytics> => {
    const incidentPromises = workspaces.map(async (ws) => {
      try {
        const colRef = collection(db, workspaceCollectionPath(ws.id, 'daily-checkins', ws.organisationId));
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(60));
        const snap = await getDocs(q);

        const history = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const date = toDateKey(data.recordedAt ?? data.createdAt);
            if (!date) return null;
            const woundsCount = Object.values(data.wounds?.types || {}).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            const fallsCount = Number(data.falls?.count || 0);
            const infectionCount = [data.infections?.uti, data.infections?.chest, data.infections?.wound]
              .map((val) => Number(val || 0))
              .reduce((sum, val) => sum + val, 0);
            const total = woundsCount + fallsCount + infectionCount;
            return {
              date,
              falls: fallsCount,
              wounds: woundsCount,
              infections: infectionCount,
              total,
            } as IncidentTrendPoint;
          })
          .filter((entry): entry is IncidentTrendPoint => entry !== null);

        const sortedHistory = sortPointsByDate(history);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let wounds = 0;
        let falls = 0;
        let infections = 0;
        sortedHistory.forEach((point) => {
          const pointDate = new Date(point.date);
          if (pointDate >= thirtyDaysAgo) {
            wounds += point.wounds;
            falls += point.falls;
            infections += point.infections;
          }
        });

        const totalIncidents = wounds + falls + infections;

        return {
          incident: {
            workspaceId: ws.id,
            workspaceName: ws.name,
            wounds,
            falls,
            infections,
            totalIncidents,
          },
          trend: {
            workspaceId: ws.id,
            workspaceName: ws.name,
            points: sortedHistory,
            totalLast30Days: sortedHistory
              .filter((point) => new Date(point.date) >= thirtyDaysAgo)
              .reduce((sum, point) => sum + point.total, 0),
          },
        };
      } catch (error) {
        return {
          incident: { workspaceId: ws.id, workspaceName: ws.name, wounds: 0, falls: 0, infections: 0, totalIncidents: 0 },
          trend: { workspaceId: ws.id, workspaceName: ws.name, points: [], totalLast30Days: 0 },
        };
      }
    });

    const results = await Promise.all(incidentPromises);
    const workspaceIncidents = results.map((res) => res.incident);
    const workspaceTrends = results.map((res) => res.trend);

    return {
      workspaceIncidents,
      totalWounds: workspaceIncidents.reduce((sum, r) => sum + r.wounds, 0),
      totalFalls: workspaceIncidents.reduce((sum, r) => sum + r.falls, 0),
      totalInfections: workspaceIncidents.reduce((sum, r) => sum + r.infections, 0),
      totalIncidents: workspaceIncidents.reduce((sum, r) => sum + r.totalIncidents, 0),
      workspaceTrends,
    };
  };

  const fetchDocumentAnalytics = async (workspaces: Workspace[]) => {
    // Implementation for document analytics
    const documentData = workspaces.map(ws => {
      const totalDocs = (ws.folders || []).reduce((sum, folder) =>
        sum + (folder.items || []).filter((item: any) => item.type === 'document').length, 0);

      const fileTypes: Record<string, number> = {};
      (ws.folders || []).forEach(folder => {
        (folder.items || []).forEach((item: any) => {
          if (item.type === 'document') {
            const type = item.fileType || 'unknown';
            fileTypes[type] = (fileTypes[type] || 0) + 1;
          }
        });
      });

      return {
        workspaceId: ws.id,
        workspaceName: ws.name,
        totalDocuments: totalDocs,
        fileTypes,
      };
    });

    return {
      workspaceDocuments: documentData,
      totalDocuments: documentData.reduce((sum, d) => sum + d.totalDocuments, 0),
      fileTypeDistribution: documentData.reduce((acc, d) => {
        Object.entries(d.fileTypes).forEach(([type, count]) => {
          acc[type] = (acc[type] || 0) + count;
        });
        return acc;
      }, {} as Record<string, number>),
    };
  };

  const fetchUserActivityAnalytics = async (workspaces: Workspace[]): Promise<UserActivityAnalytics> => {
    const todayKey = formatIsoDate(new Date());

    const activityPromises = workspaces.map(async (ws) => {
      try {
        const colRef = collection(db, workspaceCollectionPath(ws.id, 'daily-checkins', ws.organisationId));
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(45));
        const snap = await getDocs(q);

        const checkinsToday = snap.docs.reduce((sum, docSnap) => {
          const data = docSnap.data();
          const dateKey = toDateKey(data.recordedAt ?? data.createdAt);
          return dateKey === todayKey ? sum + 1 : sum;
        }, 0);

        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          checkinsToday,
        };
      } catch (error) {
        return { workspaceId: ws.id, workspaceName: ws.name, checkinsToday: 0 };
      }
    });

    const results = await Promise.all(activityPromises);
    return {
      workspaceActivity: results,
      totalCheckinsToday: results.reduce((sum, r) => sum + r.checkinsToday, 0),
      activeWorkspacesToday: results.filter((r) => r.checkinsToday > 0).length,
    };
  };

  const fetchAuditTrendAnalytics = async (workspaces: Workspace[]) => {
    const trendPromises = workspaces.map(async (ws) => {
      try {
        const colRef = collection(db, workspaceCollectionPath(ws.id, 'audits', ws.organisationId));
        const q = query(colRef, orderBy('completedAt', 'desc'), limit(24));
        const snap = await getDocs(q);

        const points = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const date = toDateKey(data.completedAt ?? data.createdAt ?? data.date);
            const score = toNumber(data.scorePercent ?? data.overallScore ?? data.complianceScore);
            if (!date || score === null) return null;
            return {
              date,
              score,
              auditType: data.auditType || null,
            } as AuditTrendPoint;
          })
          .filter((entry): entry is AuditTrendPoint => entry !== null);

        const sortedPoints = sortPointsByDate(points);
        const latestScore = sortedPoints.length ? sortedPoints[sortedPoints.length - 1].score : null;
        const baselineScore = sortedPoints.length ? sortedPoints[0].score : null;
        const change = latestScore !== null && baselineScore !== null ? latestScore - baselineScore : null;

        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          points: sortedPoints,
          latestScore,
          change,
        } as AuditTrendSeries;
      } catch (error) {
        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          points: [],
          latestScore: null,
          change: null,
        } as AuditTrendSeries;
      }
    });

    const workspaceTrends = await Promise.all(trendPromises);

    const dateBuckets: Record<string, { total: number; count: number }> = {};
    workspaceTrends.forEach((series) => {
      series.points.forEach((point) => {
        if (!dateBuckets[point.date]) {
          dateBuckets[point.date] = { total: 0, count: 0 };
        }
        dateBuckets[point.date].total += point.score;
        dateBuckets[point.date].count += 1;
      });
    });

    const globalTrend = sortPointsByDate(
      Object.entries(dateBuckets).map(([date, bucket]) => ({
        date,
        averageScore: bucket.count > 0 ? bucket.total / bucket.count : 0,
      }))
    );

    return {
      workspaceTrends,
      globalTrend,
    };
  };

  const fetchActionPlanAnalytics = async (workspaces: Workspace[]) => {
    const now = new Date();

    const summaries = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          const colRef = collection(db, workspaceCollectionPath(ws.id, 'action-plans', ws.organisationId));
          const q = query(colRef, orderBy('monthKey', 'desc'), limit(6));
          const snap = await getDocs(q);

          let totalItems = 0;
          let completedItems = 0;
          let overdueItems = 0;
          let highPriorityOpen = 0;
          let latestUpdate: string | null = null;

          snap.forEach((docSnap) => {
            const data = docSnap.data() as { items?: any[]; updatedAt?: any };
            const items = Array.isArray(data.items) ? data.items : [];
            items.forEach((item: any) => {
              totalItems += 1;
              const status = (item.status || '').toLowerCase();
              const isCompleted = status === 'completed' || status === 'done';
              if (isCompleted) {
                completedItems += 1;
              } else {
                const dueDate = getDateFromInput(item.dueDate);
                if (dueDate && dueDate < now) {
                  overdueItems += 1;
                }
                if ((item.priority || '').toLowerCase() === 'high') {
                  highPriorityOpen += 1;
                }
              }
            });

            if (data.updatedAt) {
              const updatedAt = getDateFromInput(data.updatedAt);
              if (updatedAt) {
                const iso = formatIsoDate(updatedAt);
                if (!latestUpdate || iso > latestUpdate) {
                  latestUpdate = iso;
                }
              }
            }
          });

          const openItems = totalItems - completedItems;
          const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

          return {
            workspaceId: ws.id,
            workspaceName: ws.name,
            totalItems,
            completedItems,
            openItems,
            overdueItems,
            highPriorityOpen,
            completionRate,
            latestUpdate,
          } as WorkspaceActionPlanSummary;
        } catch (error) {
          return {
            workspaceId: ws.id,
            workspaceName: ws.name,
            totalItems: 0,
            completedItems: 0,
            openItems: 0,
            overdueItems: 0,
            highPriorityOpen: 0,
            completionRate: 0,
            latestUpdate: null,
          } as WorkspaceActionPlanSummary;
        }
      })
    );

    const totalItems = summaries.reduce((sum, summary) => sum + summary.totalItems, 0);
    const totalCompleted = summaries.reduce((sum, summary) => sum + summary.completedItems, 0);
    const totalOpen = summaries.reduce((sum, summary) => sum + summary.openItems, 0);
    const totalOverdue = summaries.reduce((sum, summary) => sum + summary.overdueItems, 0);
    const highPriorityOpen = summaries.reduce((sum, summary) => sum + summary.highPriorityOpen, 0);
    const completionRate = totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0;

    return {
      workspaceActionPlans: summaries,
      totalOpen,
      totalOverdue,
      highPriorityOpen,
      completionRate,
    };
  };

  const fetchLessonsAnalytics = async (workspaces: Workspace[]) => {
    const summaries = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          const lessonsCol = collection(db, workspaceCollectionPath(ws.id, 'lessons-learned', ws.organisationId));
          const rcaCol = collection(db, workspaceCollectionPath(ws.id, 'rca-records', ws.organisationId));

          const [lessonsCountSnap, rcaCountSnap] = await Promise.all([
            getCountFromServer(lessonsCol).catch(() => null),
            getCountFromServer(rcaCol).catch(() => null),
          ]);

          const lessonsDocs = await getDocs(query(lessonsCol, limit(10))).catch(() => null);
          const rcaDocs = await getDocs(query(rcaCol, limit(10))).catch(() => null);

          let outstandingActions = 0;
          let latestActivity: string | null = null;

          const updateLatest = (value: any) => {
            const date = getDateFromInput(value);
            if (!date) return;
            const iso = formatIsoDate(date);
            if (!latestActivity || iso > latestActivity) {
              latestActivity = iso;
            }
          };

          const tallyActions = (docs: typeof lessonsDocs) => {
            if (!docs) return;
            docs.forEach((docSnap) => {
              const data = docSnap.data() as any;
              const actions = Array.isArray(data.actions) ? data.actions : [];
              actions.forEach((action: any) => {
                const status = (action.status || '').toLowerCase();
                if (status !== 'completed' && status !== 'done') {
                  outstandingActions += 1;
                }
              });
              updateLatest(data.updatedAt || data.createdAt);
            });
          };

          tallyActions(lessonsDocs);
          tallyActions(rcaDocs);

          const lessonsCount = lessonsCountSnap?.data().count ?? (lessonsDocs ? lessonsDocs.size : 0);
          const rcaCount = rcaCountSnap?.data().count ?? (rcaDocs ? rcaDocs.size : 0);

          return {
            workspaceId: ws.id,
            workspaceName: ws.name,
            lessonsCount,
            rcaCount,
            outstandingActions,
            latestActivity,
          } as WorkspaceLearningSummary;
        } catch (error) {
          return {
            workspaceId: ws.id,
            workspaceName: ws.name,
            lessonsCount: 0,
            rcaCount: 0,
            outstandingActions: 0,
            latestActivity: null,
          } as WorkspaceLearningSummary;
        }
      })
    );

    return {
      workspaceSummaries: summaries,
      totalLessons: summaries.reduce((sum, summary) => sum + summary.lessonsCount, 0),
      totalRcas: summaries.reduce((sum, summary) => sum + summary.rcaCount, 0),
      totalOutstandingActions: summaries.reduce((sum, summary) => sum + summary.outstandingActions, 0),
    };
  };


  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg font-semibold">Loading Analytics Suite...</div>
          <div className="text-sm text-muted-foreground">Analysing data across all workspaces</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <div className="text-lg font-semibold text-destructive">Failed to Load Analytics</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          <Button onClick={fetchAnalyticsData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Filter data based on selected workspaces
  // If no workspaces selected, show all data
  const effectiveSelectedWorkspaces = selectedWorkspaces.length === 0 ? data.workspaces.map(ws => ws.id) : selectedWorkspaces;
  const filteredWorkspaces = data.workspaces.filter(ws => effectiveSelectedWorkspaces.includes(ws.id));
  const filteredAuditData = {
    ...data.auditData,
    workspaceScores: data.auditData.workspaceScores.filter(score => effectiveSelectedWorkspaces.includes(score.workspaceId)),
    overallAverage: (() => {
      const scores = data.auditData.workspaceScores.filter(score => effectiveSelectedWorkspaces.includes(score.workspaceId) && score.averageScore !== null);
      return scores.length > 0 ? scores.reduce((sum, score) => sum + (score.averageScore || 0), 0) / scores.length : 0;
    })(),
    totalAudits: data.auditData.workspaceScores.filter(score => effectiveSelectedWorkspaces.includes(score.workspaceId)).reduce((sum, score) => sum + score.auditCount, 0),
  };
  const filteredStaffingData = {
    ...data.staffingData,
    workspaceStaffing: data.staffingData.workspaceStaffing.filter(staff => effectiveSelectedWorkspaces.includes(staff.workspaceId)),
    totalDay: data.staffingData.workspaceStaffing.filter(staff => effectiveSelectedWorkspaces.includes(staff.workspaceId)).reduce((sum, staff) => sum + staff.currentDay, 0),
    totalNight: data.staffingData.workspaceStaffing.filter(staff => effectiveSelectedWorkspaces.includes(staff.workspaceId)).reduce((sum, staff) => sum + staff.currentNight, 0),
    averageDay: (() => {
      const staff = data.staffingData.workspaceStaffing.filter(staff => effectiveSelectedWorkspaces.includes(staff.workspaceId));
      return staff.length > 0 ? staff.reduce((sum, s) => sum + s.currentDay, 0) / staff.length : 0;
    })(),
    averageNight: (() => {
      const staff = data.staffingData.workspaceStaffing.filter(staff => effectiveSelectedWorkspaces.includes(staff.workspaceId));
      return staff.length > 0 ? staff.reduce((sum, s) => sum + s.currentNight, 0) / staff.length : 0;
    })(),
  };
  const filteredOccupancyData = {
    ...data.occupancyData,
    workspaceOccupancy: data.occupancyData.workspaceOccupancy.filter(occ => effectiveSelectedWorkspaces.includes(occ.workspaceId)),
    totalBeds: data.occupancyData.workspaceOccupancy.filter(occ => effectiveSelectedWorkspaces.includes(occ.workspaceId)).reduce((sum, occ) => sum + occ.totalBeds, 0),
    totalOccupied: data.occupancyData.workspaceOccupancy.filter(occ => effectiveSelectedWorkspaces.includes(occ.workspaceId)).reduce((sum, occ) => sum + occ.occupiedBeds, 0),
    averageOccupancy: (() => {
      const occ = data.occupancyData.workspaceOccupancy.filter(occ => effectiveSelectedWorkspaces.includes(occ.workspaceId));
      return occ.length > 0 ? occ.reduce((sum, o) => sum + o.occupancyRate, 0) / occ.length : 0;
    })(),
  };
  const filteredIncidentData = {
    ...data.incidentData,
    workspaceIncidents: data.incidentData.workspaceIncidents.filter(inc => effectiveSelectedWorkspaces.includes(inc.workspaceId)),
    totalWounds: data.incidentData.workspaceIncidents.filter(inc => effectiveSelectedWorkspaces.includes(inc.workspaceId)).reduce((sum, inc) => sum + inc.wounds, 0),
    totalFalls: data.incidentData.workspaceIncidents.filter(inc => effectiveSelectedWorkspaces.includes(inc.workspaceId)).reduce((sum, inc) => sum + inc.falls, 0),
    totalInfections: data.incidentData.workspaceIncidents.filter(inc => effectiveSelectedWorkspaces.includes(inc.workspaceId)).reduce((sum, inc) => sum + inc.infections, 0),
    totalIncidents: data.incidentData.workspaceIncidents.filter(inc => effectiveSelectedWorkspaces.includes(inc.workspaceId)).reduce((sum, inc) => sum + inc.totalIncidents, 0),
    workspaceTrends: data.incidentData.workspaceTrends.filter(trend => effectiveSelectedWorkspaces.includes(trend.workspaceId)),
  };
  const filteredDocumentData = {
    ...data.documentData,
    workspaceDocuments: data.documentData.workspaceDocuments.filter(doc => effectiveSelectedWorkspaces.includes(doc.workspaceId)),
    totalDocuments: data.documentData.workspaceDocuments.filter(doc => effectiveSelectedWorkspaces.includes(doc.workspaceId)).reduce((sum, doc) => sum + doc.totalDocuments, 0),
    fileTypeDistribution: (() => {
      const dist: Record<string, number> = {};
      data.documentData.workspaceDocuments.filter(doc => effectiveSelectedWorkspaces.includes(doc.workspaceId)).forEach(doc => {
        Object.entries(doc.fileTypes).forEach(([type, count]) => {
          dist[type] = (dist[type] || 0) + count;
        });
      });
      return dist;
    })(),
  };
  const filteredUserActivityData = {
    ...data.userActivityData,
    workspaceActivity: data.userActivityData.workspaceActivity.filter(act => effectiveSelectedWorkspaces.includes(act.workspaceId)),
    totalCheckinsToday: data.userActivityData.workspaceActivity.filter(act => effectiveSelectedWorkspaces.includes(act.workspaceId)).reduce((sum, act) => sum + act.checkinsToday, 0),
    activeWorkspacesToday: data.userActivityData.workspaceActivity.filter(act => effectiveSelectedWorkspaces.includes(act.workspaceId)).filter(act => act.checkinsToday > 0).length,
  };
  const filteredAuditTrendData = {
    ...data.auditTrendData,
    workspaceTrends: data.auditTrendData.workspaceTrends.filter(trend => effectiveSelectedWorkspaces.includes(trend.workspaceId)),
    globalTrend: (() => {
      const dateBuckets: Record<string, { total: number; count: number }> = {};
      data.auditTrendData.workspaceTrends.filter(trend => effectiveSelectedWorkspaces.includes(trend.workspaceId)).forEach((series) => {
        series.points.forEach((point) => {
          if (!dateBuckets[point.date]) {
            dateBuckets[point.date] = { total: 0, count: 0 };
          }
          dateBuckets[point.date].total += point.score;
          dateBuckets[point.date].count += 1;
        });
      });
      return sortPointsByDate(
        Object.entries(dateBuckets).map(([date, bucket]) => ({
          date,
          averageScore: bucket.count > 0 ? bucket.total / bucket.count : 0,
        }))
      );
    })(),
  };
  const filteredIncidentTrendData = buildIncidentTrendData(filteredIncidentData);
  const filteredActionPlanData = {
    ...data.actionPlanData,
    workspaceActionPlans: data.actionPlanData.workspaceActionPlans.filter(plan => effectiveSelectedWorkspaces.includes(plan.workspaceId)),
    totalOpen: data.actionPlanData.workspaceActionPlans.filter(plan => effectiveSelectedWorkspaces.includes(plan.workspaceId)).reduce((sum, plan) => sum + plan.openItems, 0),
    totalOverdue: data.actionPlanData.workspaceActionPlans.filter(plan => effectiveSelectedWorkspaces.includes(plan.workspaceId)).reduce((sum, plan) => sum + plan.overdueItems, 0),
    highPriorityOpen: data.actionPlanData.workspaceActionPlans.filter(plan => effectiveSelectedWorkspaces.includes(plan.workspaceId)).reduce((sum, plan) => sum + plan.highPriorityOpen, 0),
    completionRate: (() => {
      const plans = data.actionPlanData.workspaceActionPlans.filter(plan => effectiveSelectedWorkspaces.includes(plan.workspaceId));
      const totalItems = plans.reduce((sum, plan) => sum + plan.totalItems, 0);
      const completedItems = plans.reduce((sum, plan) => sum + plan.completedItems, 0);
      return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    })(),
  };
  const filteredLessonsData = {
    ...data.lessonsData,
    workspaceSummaries: data.lessonsData.workspaceSummaries.filter(summary => effectiveSelectedWorkspaces.includes(summary.workspaceId)),
    totalLessons: data.lessonsData.workspaceSummaries.filter(summary => effectiveSelectedWorkspaces.includes(summary.workspaceId)).reduce((sum, summary) => sum + summary.lessonsCount, 0),
    totalRcas: data.lessonsData.workspaceSummaries.filter(summary => effectiveSelectedWorkspaces.includes(summary.workspaceId)).reduce((sum, summary) => sum + summary.rcaCount, 0),
    totalOutstandingActions: data.lessonsData.workspaceSummaries.filter(summary => effectiveSelectedWorkspaces.includes(summary.workspaceId)).reduce((sum, summary) => sum + summary.outstandingActions, 0),
  };

  const filteredData: AnalyticsData = {
    workspaces: filteredWorkspaces,
    auditData: filteredAuditData,
    staffingData: filteredStaffingData,
    occupancyData: filteredOccupancyData,
    incidentData: filteredIncidentData,
    documentData: filteredDocumentData,
    userActivityData: filteredUserActivityData,
    auditTrendData: filteredAuditTrendData,
    incidentTrendData: filteredIncidentTrendData,
    actionPlanData: filteredActionPlanData,
    lessonsData: filteredLessonsData,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <AdminPageHeader
            title="Analytics Suite"
            subtitle="Comprehensive insights across all workspaces"
            icon={<BarChart3 className="w-5 h-5 text-white" />}
          />

          {/* Workspace Selection */}
          {data && (
            <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowWorkspaceSelector(!showWorkspaceSelector)}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Select Workspaces
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      {selectedWorkspaces.length}
                    </span>
                  </Button>
                  {selectedWorkspaces.length > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      Compare Mode
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedWorkspaces.length} of {data.workspaces.length} workspaces selected
                </div>
              </div>

              {showWorkspaceSelector && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Choose Workspaces</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkspaces(data.workspaces.map(ws => ws.id))}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkspaces([])}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {data.workspaces.map(workspace => (
                      <div key={workspace.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={workspace.id}
                          checked={selectedWorkspaces.includes(workspace.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedWorkspaces(prev => [...prev, workspace.id]);
                            } else {
                              setSelectedWorkspaces(prev => prev.filter(id => id !== workspace.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={workspace.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {workspace.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4 mb-8">
            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workspaces</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{filteredWorkspaces.length}</div>
                <p className="text-xs text-muted-foreground">Organizations monitored</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{Math.round(filteredAuditData.overallAverage)}%</div>
                <p className="text-xs text-muted-foreground">Average across workspaces</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-red-50 via-white to-red-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-red-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{filteredIncidentData.totalIncidents}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-amber-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Check-ins</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{filteredUserActivityData.totalCheckinsToday}</div>
                <p className="text-xs text-muted-foreground">Completed today</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-amber-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Action Items Open</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{filteredActionPlanData.totalOpen}</div>
                <p className="text-xs text-muted-foreground">Across all workspaces</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-red-50 via-white to-red-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-red-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-red-600">{filteredActionPlanData.totalOverdue}</div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-green-50 via-white to-green-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-green-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Action Completion</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{Math.round(filteredActionPlanData.completionRate)}%</div>
                <p className="text-xs text-muted-foreground">Average completion rate</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-purple-50 via-white to-purple-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-purple-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Actions</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-orange-600">{filteredLessonsData.totalOutstandingActions}</div>
                <p className="text-xs text-muted-foreground">Outstanding follow-ups</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lessons Logged</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{filteredLessonsData.totalLessons}</div>
                <p className="text-xs text-muted-foreground">In the last reviews</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RCAs Logged</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold">{filteredLessonsData.totalRcas}</div>
                <p className="text-xs text-muted-foreground">Root cause investigations</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto items-center w-full max-w-4xl grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="compliance">Compliance</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="operations">Operations</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="trends">Trends</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="incidents">Incidents</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="documents">Documents</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="actions">Actions</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="comparisons">Comparisons</TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab data={filteredData} />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceTab data={filteredData} />
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <OperationsTab data={filteredData} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <TrendsTab data={filteredData} />
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <IncidentsTab data={filteredData} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <DocumentsTab data={filteredData} />
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <ActionPlansTab data={filteredData} />
          </TabsContent>

          <TabsContent value="comparisons" className="space-y-6">
            <ComparisonsTab data={filteredData} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <InsightsTab data={filteredData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data }: { data: AnalyticsData }) {
  const globalTrend = data.auditTrendData.globalTrend;
  const latestGlobalScore = globalTrend.length ? globalTrend[globalTrend.length - 1].averageScore : null;
  const previousGlobalScore = globalTrend.length > 1 ? globalTrend[globalTrend.length - 2].averageScore : null;
  const complianceDelta = (latestGlobalScore !== null && previousGlobalScore !== null)
    ? latestGlobalScore - previousGlobalScore
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compliance Overview */}
      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Compliance</span>
              <Badge variant={data.auditData.overallAverage >= 80 ? "default" : "destructive"}>
                {Math.round(data.auditData.overallAverage)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Audits</span>
              <span className="text-sm text-muted-foreground">{data.auditData.totalAudits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Workspaces with Data</span>
              <span className="text-sm text-muted-foreground">
                {data.auditData.workspaceScores.filter((s: WorkspaceScore) => s.averageScore !== null).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Change</span>
              <span className={cn('text-sm font-semibold', complianceDelta !== null ? (complianceDelta >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-muted-foreground')}>
                {complianceDelta !== null ? `${complianceDelta >= 0 ? '+' : ''}${complianceDelta.toFixed(1)} pts` : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations Overview */}
      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-green-50 via-white to-green-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-green-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full -ml-12 -mb-12"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Operations Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Occupancy</span>
              <span className="text-sm font-semibold">{Math.round(data.occupancyData.averageOccupancy)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Beds</span>
              <span className="text-sm text-muted-foreground">{data.occupancyData.totalBeds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Staffing (Day)</span>
              <span className="text-sm text-muted-foreground">{Math.round(data.staffingData.averageDay * 10) / 10}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Overview */}
      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-red-50 via-white to-red-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-red-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-200/20 rounded-full -ml-12 -mb-12"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Incident Overview (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Incidents</span>
              <Badge variant="destructive">{data.incidentData.totalIncidents}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Wounds</span>
              <span className="text-sm text-muted-foreground">{data.incidentData.totalWounds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Falls</span>
              <span className="text-sm text-muted-foreground">{data.incidentData.totalFalls}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Infections</span>
              <span className="text-sm text-muted-foreground">{data.incidentData.totalInfections}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Overview */}
      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Documents</span>
              <span className="text-sm font-semibold">{data.documentData.totalDocuments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Most Common Type</span>
              <span className="text-sm text-muted-foreground">
                {Object.entries(data.documentData.fileTypeDistribution)
                  .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Workspaces</span>
              <span className="text-sm text-muted-foreground">{data.userActivityData.activeWorkspacesToday}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Plan Overview */}
      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-amber-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/20 rounded-full -ml-12 -mb-12"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Action Plan Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Open Items</span>
              <span className="text-sm font-semibold">{data.actionPlanData.totalOpen}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overdue</span>
              <span className="text-sm font-semibold text-red-600">{data.actionPlanData.totalOverdue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-sm font-semibold">{Math.round(data.actionPlanData.completionRate)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Overview */}
      <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-purple-50 via-white to-purple-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-purple-100/40 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full -ml-12 -mb-12"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning & RCA Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lessons Logged</span>
              <span className="text-sm font-semibold">{data.lessonsData.totalLessons}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">RCAs Logged</span>
              <span className="text-sm font-semibold">{data.lessonsData.totalRcas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Outstanding Actions</span>
              <span className="text-sm font-semibold text-orange-600">{data.lessonsData.totalOutstandingActions}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Compliance Tab Component
function ComplianceTab({ data }: { data: AnalyticsData }) {
  const complianceChartData = data.auditData.workspaceScores
    .filter((s: WorkspaceScore) => s.averageScore !== null)
    .sort((a: WorkspaceScore, b: WorkspaceScore) => (b.averageScore || 0) - (a.averageScore || 0))
    .slice(0, 10)
    .map((s: WorkspaceScore) => ({
      name: s.workspaceName,
      score: Math.round(s.averageScore || 0),
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
          <CardHeader className="relative">
            <CardTitle>Compliance Distribution</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complianceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
          <CardHeader className="relative">
            <CardTitle>Workspace Compliance Rankings</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-3">
              {data.auditData.workspaceScores
                .filter((s: WorkspaceScore) => s.averageScore !== null)
                .sort((a: WorkspaceScore, b: WorkspaceScore) => (b.averageScore || 0) - (a.averageScore || 0))
                .map((workspace: WorkspaceScore, index: number) => (
                <div key={workspace.workspaceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{workspace.workspaceName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(workspace.averageScore || 0) >= 80 ? "default" : "destructive"}>
                      {Math.round(workspace.averageScore || 0)}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {workspace.auditCount} audits
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Operations Tab Component
function OperationsTab({ data }: { data: AnalyticsData }) {
  const occupancyChartData = data.occupancyData.workspaceOccupancy
    .sort((a: WorkspaceOccupancy, b: WorkspaceOccupancy) => b.occupancyRate - a.occupancyRate)
    .slice(0, 10)
    .map((o: WorkspaceOccupancy) => ({
      name: o.workspaceName,
      occupancy: Math.round(o.occupancyRate),
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-green-50 via-white to-green-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-green-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full -ml-12 -mb-12"></div>
          <CardHeader className="relative">
            <CardTitle>Occupancy Rates</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={occupancyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupancy" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/40 transition-colors duration-300"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full -ml-12 -mb-12"></div>
          <CardHeader className="relative">
            <CardTitle>Staffing Summary</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Day Staff</span>
                <span className="text-lg font-semibold">{data.staffingData.totalDay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Night Staff</span>
                <span className="text-lg font-semibold">{data.staffingData.totalNight}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Day Staff</span>
                <span className="text-lg font-semibold">{Math.round(data.staffingData.averageDay * 10) / 10}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Night Staff</span>
                <span className="text-lg font-semibold">{Math.round(data.staffingData.averageNight * 10) / 10}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendsTab({ data }: { data: AnalyticsData }) {
  const globalAuditTrend = React.useMemo(() => data.auditTrendData.globalTrend.slice(-24), [data.auditTrendData.globalTrend]);

  const topAuditSeries = React.useMemo(() => {
    return data.auditTrendData.workspaceTrends
      .filter((series) => series.points.length >= 2)
      .sort((a, b) => Math.abs((b.change ?? 0)) - Math.abs((a.change ?? 0)))
      .slice(0, 4);
  }, [data.auditTrendData.workspaceTrends]);

  const auditLineData = React.useMemo(() => {
    const dateSet = new Set<string>();
    topAuditSeries.forEach((series) => series.points.forEach((point) => dateSet.add(point.date)));
    return Array.from(dateSet)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const row: Record<string, any> = { date };
        topAuditSeries.forEach((series) => {
          const point = series.points.find((p) => p.date === date);
          row[series.workspaceName] = point ? Math.round(point.score * 10) / 10 : null;
        });
        return row;
      });
  }, [topAuditSeries]);

  const topIncidentSeries = React.useMemo(() => {
    return data.incidentTrendData.workspaceTrends
      .filter((series) => series.points.length >= 2)
      .sort((a, b) => (b.totalLast30Days || 0) - (a.totalLast30Days || 0))
      .slice(0, 4);
  }, [data.incidentTrendData.workspaceTrends]);

  const incidentLineData = React.useMemo(() => {
    const dateSet = new Set<string>();
    topIncidentSeries.forEach((series) => series.points.forEach((point) => dateSet.add(point.date)));
    return Array.from(dateSet)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const row: Record<string, any> = { date };
        topIncidentSeries.forEach((series) => {
          const point = series.points.find((p) => p.date === date);
          row[series.workspaceName] = point ? point.total : null;
        });
        return row;
      });
  }, [topIncidentSeries]);

  const globalIncidentTrend = React.useMemo(
    () => data.incidentTrendData.globalTrend.slice(-30),
    [data.incidentTrendData.globalTrend]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Compliance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={globalAuditTrend}>
                <defs>
                  <linearGradient id="auditTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="averageScore" stroke="#2563eb" fill="url(#auditTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Compliance Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={auditLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                {topAuditSeries.map((series, index) => (
                  <Line
                    key={series.workspaceId}
                    type="monotone"
                    dataKey={series.workspaceName}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Incident Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={globalIncidentTrend}>
                <defs>
                  <linearGradient id="incidentFalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incidentWounds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incidentInfections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="wounds" stackId="1" stroke="#ef4444" fill="url(#incidentWounds)" />
                <Area type="monotone" dataKey="falls" stackId="1" stroke="#f97316" fill="url(#incidentFalls)" />
                <Area type="monotone" dataKey="infections" stackId="1" stroke="#8b5cf6" fill="url(#incidentInfections)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Hotspot Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incidentLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                {topIncidentSeries.map((series, index) => (
                  <Line
                    key={series.workspaceId}
                    type="monotone"
                    dataKey={series.workspaceName}
                    stroke={COLOR_PALETTE[(index + 2) % COLOR_PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Incidents Tab Component
function IncidentsTab({ data }: { data: AnalyticsData }) {
  const incidentTrend = data.incidentTrendData.globalTrend.slice(-30);
  const incidentChartData = [
    { name: 'Wounds', value: data.incidentData.totalWounds, color: '#ef4444' },
    { name: 'Falls', value: data.incidentData.totalFalls, color: '#f59e0b' },
    { name: 'Infections', value: data.incidentData.totalInfections, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Incident Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incidentChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {incidentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Incident Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.incidentData.workspaceIncidents
                .sort((a: WorkspaceIncident, b: WorkspaceIncident) => b.totalIncidents - a.totalIncidents)
                .slice(0, 10)
                .map((workspace: WorkspaceIncident, index: number) => (
                <div key={workspace.workspaceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{workspace.workspaceName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{workspace.totalIncidents}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({workspace.wounds}W, {workspace.falls}F, {workspace.infections}I)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Timeline (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={incidentTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="wounds" stackId="1" stroke="#ef4444" fill="#fecaca" />
              <Area type="monotone" dataKey="falls" stackId="1" stroke="#f97316" fill="#fed7aa" />
              <Area type="monotone" dataKey="infections" stackId="1" stroke="#8b5cf6" fill="#ddd6fe" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Documents Tab Component
function DocumentsTab({ data }: { data: AnalyticsData }) {
  const fileTypeData = Object.entries(data.documentData.fileTypeDistribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 8)
    .map(([type, count]) => ({ name: type.toUpperCase(), value: count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>File Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fileTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {fileTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Counts by Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.documentData.workspaceDocuments
                .sort((a: WorkspaceDocument, b: WorkspaceDocument) => b.totalDocuments - a.totalDocuments)
                .slice(0, 10)
                .map((workspace: WorkspaceDocument, index: number) => (
                <div key={workspace.workspaceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{workspace.workspaceName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{workspace.totalDocuments}</Badge>
                    <span className="text-sm text-muted-foreground">documents</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActionPlansTab({ data }: { data: AnalyticsData }) {
  const sortedPlans = React.useMemo(() => {
    return [...data.actionPlanData.workspaceActionPlans].sort((a, b) => b.openItems - a.openItems);
  }, [data.actionPlanData.workspaceActionPlans]);

  const learningSummaries = React.useMemo(() => {
    return [...data.lessonsData.workspaceSummaries].sort((a, b) => b.outstandingActions - a.outstandingActions);
  }, [data.lessonsData.workspaceSummaries]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Action Plan Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">Open Items</div>
              <div className="text-2xl font-semibold">{data.actionPlanData.totalOpen}</div>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">Overdue Items</div>
              <div className="text-2xl font-semibold text-red-600">{data.actionPlanData.totalOverdue}</div>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">High Priority Open</div>
              <div className="text-2xl font-semibold text-orange-500">{data.actionPlanData.highPriorityOpen}</div>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">Completion Rate</div>
              <div className="text-2xl font-semibold">{Math.round(data.actionPlanData.completionRate)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Action Plan Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">High Priority</TableHead>
                  <TableHead className="text-right">Latest Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlans.map((plan) => (
                  <TableRow key={plan.workspaceId}>
                    <TableCell className="font-medium">{plan.workspaceName}</TableCell>
                    <TableCell className="text-right">{Math.round(plan.completionRate)}%</TableCell>
                    <TableCell className="text-right">{plan.openItems}</TableCell>
                    <TableCell className="text-right text-red-600">{plan.overdueItems}</TableCell>
                    <TableCell className="text-right text-orange-500">{plan.highPriorityOpen}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{plan.latestUpdate ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning & RCA Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead className="text-right">Lessons</TableHead>
                  <TableHead className="text-right">RCAs</TableHead>
                  <TableHead className="text-right">Outstanding Actions</TableHead>
                  <TableHead className="text-right">Latest Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learningSummaries.map((summary) => (
                  <TableRow key={summary.workspaceId}>
                    <TableCell className="font-medium">{summary.workspaceName}</TableCell>
                    <TableCell className="text-right">{summary.lessonsCount}</TableCell>
                    <TableCell className="text-right">{summary.rcaCount}</TableCell>
                    <TableCell className="text-right text-orange-600">{summary.outstandingActions}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{summary.latestActivity ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonsTab({ data }: { data: AnalyticsData }) {
  const rows = React.useMemo(() => {
    const complianceMap = new Map(data.auditData.workspaceScores.map((score) => [score.workspaceId, score]));
    const occupancyMap = new Map(data.occupancyData.workspaceOccupancy.map((entry) => [entry.workspaceId, entry]));
    const staffingMap = new Map(data.staffingData.workspaceStaffing.map((entry) => [entry.workspaceId, entry]));
    const incidentMap = new Map(data.incidentData.workspaceIncidents.map((entry) => [entry.workspaceId, entry]));
    const actionPlanMap = new Map(data.actionPlanData.workspaceActionPlans.map((entry) => [entry.workspaceId, entry]));
    const learningMap = new Map(data.lessonsData.workspaceSummaries.map((entry) => [entry.workspaceId, entry]));

    return [...data.workspaces]
      .map((workspace) => {
        const compliance = complianceMap.get(workspace.id)?.averageScore ?? null;
        const occupancy = occupancyMap.get(workspace.id)?.occupancyRate ?? null;
        const staffing = staffingMap.get(workspace.id);
        const incident = incidentMap.get(workspace.id);
        const actionPlan = actionPlanMap.get(workspace.id);
        const learning = learningMap.get(workspace.id);

        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          compliance,
          occupancy,
          staffDay: staffing?.currentDay ?? 0,
          staffNight: staffing?.currentNight ?? 0,
          incidents: incident?.totalIncidents ?? 0,
          falls: incident?.falls ?? 0,
          wounds: incident?.wounds ?? 0,
          infections: incident?.infections ?? 0,
          actionOpen: actionPlan?.openItems ?? 0,
          actionOverdue: actionPlan?.overdueItems ?? 0,
          outstandingActions: learning?.outstandingActions ?? 0,
        };
      })
      .sort((a, b) => {
        const aScore = a.compliance ?? 101;
        const bScore = b.compliance ?? 101;
        return aScore - bScore;
      });
  }, [
    data.actionPlanData.workspaceActionPlans,
    data.incidentData.workspaceIncidents,
    data.lessonsData.workspaceSummaries,
    data.occupancyData.workspaceOccupancy,
    data.auditData.workspaceScores,
    data.staffingData.workspaceStaffing,
    data.workspaces,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Comparison Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead className="text-right">Compliance</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">Staffing (Day/Night)</TableHead>
                <TableHead className="text-right">Incidents (W/F/I)</TableHead>
                <TableHead className="text-right">Action Plans (Open/Overdue)</TableHead>
                <TableHead className="text-right">Outstanding Learning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.workspaceId}>
                  <TableCell className="font-medium">{row.workspaceName}</TableCell>
                  <TableCell className="text-right">{row.compliance !== null ? `${Math.round(row.compliance)}%` : '—'}</TableCell>
                  <TableCell className="text-right">{row.occupancy !== null ? `${Math.round(row.occupancy)}%` : '—'}</TableCell>
                  <TableCell className="text-right">{row.staffDay} / {row.staffNight}</TableCell>
                  <TableCell className="text-right">{row.wounds}/{row.falls}/{row.infections}</TableCell>
                  <TableCell className="text-right">{row.actionOpen} / <span className="text-red-600">{row.actionOverdue}</span></TableCell>
                  <TableCell className="text-right text-orange-600">{row.outstandingActions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Insights Tab Component
function InsightsTab({ data }: { data: AnalyticsData }) {
  const lowCompliance = data.auditData.workspaceScores.filter((s: WorkspaceScore) => s.averageScore !== null && s.averageScore < 70);
  const highIncidents = data.incidentData.workspaceIncidents.filter((i: WorkspaceIncident) => i.totalIncidents > 10);
  const lowOccupancy = data.occupancyData.workspaceOccupancy.filter((o: WorkspaceOccupancy) => o.occupancyRate < 50);
  const actionPlanAlerts = data.actionPlanData.workspaceActionPlans
    .filter((plan) => plan.overdueItems > 0 || plan.highPriorityOpen > 0)
    .sort((a, b) => (b.overdueItems + b.highPriorityOpen) - (a.overdueItems + a.highPriorityOpen))
    .slice(0, 5);
  const learningAlerts = data.lessonsData.workspaceSummaries
    .filter((summary) => summary.outstandingActions > 0)
    .sort((a, b) => b.outstandingActions - a.outstandingActions)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowCompliance.length > 0 ? (
                lowCompliance.map((workspace: WorkspaceScore) => (
                  <div key={workspace.workspaceId} className="p-3 bg-red-50 rounded-lg">
                    <div className="font-medium text-red-900">{workspace.workspaceName}</div>
                    <div className="text-sm text-red-700">
                      Compliance: {Math.round(workspace.averageScore || 0)}% - Needs attention
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">All workspaces meeting compliance standards</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Incident Hotspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highIncidents.length > 0 ? (
                highIncidents.map((workspace: WorkspaceIncident) => (
                  <div key={workspace.workspaceId} className="p-3 bg-orange-50 rounded-lg">
                    <div className="font-medium text-orange-900">{workspace.workspaceName}</div>
                    <div className="text-sm text-orange-700">
                      {workspace.totalIncidents} incidents - Monitor closely
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No high-incident workspaces detected</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-500" />
              Capacity Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowOccupancy.length > 0 ? (
                lowOccupancy.map((workspace: WorkspaceOccupancy) => (
                  <div key={workspace.workspaceId} className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-900">{workspace.workspaceName}</div>
                    <div className="text-sm text-blue-700">
                      Occupancy: {Math.round(workspace.occupancyRate)}% - Potential for growth
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">All workspaces at optimal capacity</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Action Plan Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actionPlanAlerts.length > 0 ? (
                actionPlanAlerts.map((plan) => (
                  <div key={plan.workspaceId} className="p-3 bg-amber-50 rounded-lg">
                    <div className="font-medium text-amber-900">{plan.workspaceName}</div>
                    <div className="text-sm text-amber-700">
                      {plan.overdueItems} overdue · {plan.highPriorityOpen} high priority open
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No outstanding action plan risks</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Learning Follow-ups Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {learningAlerts.length > 0 ? (
              learningAlerts.map((summary) => (
                <div key={summary.workspaceId} className="p-3 bg-purple-50 rounded-lg">
                  <div className="font-medium text-purple-900">{summary.workspaceName}</div>
                  <div className="text-sm text-purple-700">
                    {summary.outstandingActions} outstanding actions • lessons {summary.lessonsCount} / RCAs {summary.rcaCount}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No outstanding learning actions detected</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            Key Performance Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(data.auditData.overallAverage)}%
              </div>
              <div className="text-sm text-green-700">Avg Compliance</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(data.occupancyData.averageOccupancy)}%
              </div>
              <div className="text-sm text-blue-700">Avg Occupancy</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {data.incidentData.totalIncidents}
              </div>
              <div className="text-sm text-orange-700">Total Incidents</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {data.userActivityData.activeWorkspacesToday}
              </div>
              <div className="text-sm text-purple-700">Active Today</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {data.actionPlanData.totalOverdue}
              </div>
              <div className="text-sm text-amber-700">Overdue Actions</div>
            </div>
            <div className="text-center p-4 bg-rose-50 rounded-lg">
              <div className="text-2xl font-bold text-rose-600">
                {data.lessonsData.totalOutstandingActions}
              </div>
              <div className="text-sm text-rose-700">Outstanding Learning</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}