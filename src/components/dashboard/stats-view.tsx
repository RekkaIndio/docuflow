"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { doc, onSnapshot, collection, query, orderBy, limit, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';
import { TrendingUp, TrendingDown, Minus, FileText, Shield, Wrench, Lock, Flame, Biohazard, Utensils, Moon, Users, Soup, AlertTriangle, BarChart3, Target, CheckCircle, CheckCircle2, Clock, Award, Activity, Folder, Calendar, Bell, ClipboardCheck, UserCheck, Building2, Bed, Briefcase, TrendingUpIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, RadialBarChart, RadialBar, Legend } from 'recharts';
import PageHeader from '../page-header';
import DetailedAuditCards from './stats/detailed-audit-cards';
import RotaTrends from './rota-trends';
import { AUDIT_TYPES, AUDIT_DISPLAY_NAMES, type AuditType } from '@/lib/audit-types';
import { Badge } from '@/components/ui/badge';

export function StatsView({ workspaceId, organisationId }: { workspaceId?: string, organisationId?: string }) {
  const [carePlanScore, setCarePlanScore] = useState<number | null>(null);
  const [carePlanYesCount, setCarePlanYesCount] = useState<number | null>(null);
  const [carePlanTotalCount, setCarePlanTotalCount] = useState<number | null>(null);
  const [carePlanUpdatedAt, setCarePlanUpdatedAt] = useState<string | null>(null);

  const [hsScore, setHsScore] = useState<number | null>(null);
  const [hsYesCount, setHsYesCount] = useState<number | null>(null);
  const [hsTotalCount, setHsTotalCount] = useState<number | null>(null);
  const [hsUpdatedAt, setHsUpdatedAt] = useState<string | null>(null);

  const [maintenanceScore, setMaintenanceScore] = useState<number | null>(null);
  const [maintenanceYesCount, setMaintenanceYesCount] = useState<number | null>(null);
  const [maintenanceTotalCount, setMaintenanceTotalCount] = useState<number | null>(null);
  const [maintenanceUpdatedAt, setMaintenanceUpdatedAt] = useState<string | null>(null);

  const [restrictiveScore, setRestrictiveScore] = useState<number | null>(null);
  const [restrictiveYesCount, setRestrictiveYesCount] = useState<number | null>(null);
  const [restrictiveTotalCount, setRestrictiveTotalCount] = useState<number | null>(null);
  const [restrictiveUpdatedAt, setRestrictiveUpdatedAt] = useState<string | null>(null);

  const [fireScore, setFireScore] = useState<number | null>(null);
  const [fireYesCount, setFireYesCount] = useState<number | null>(null);
  const [fireTotalCount, setFireTotalCount] = useState<number | null>(null);
  const [fireUpdatedAt, setFireUpdatedAt] = useState<string | null>(null);

  const [infectionScore, setInfectionScore] = useState<number | null>(null);
  const [infectionYesCount, setInfectionYesCount] = useState<number | null>(null);
  const [infectionTotalCount, setInfectionTotalCount] = useState<number | null>(null);
  const [infectionUpdatedAt, setInfectionUpdatedAt] = useState<string | null>(null);

  const [mealtimeScore, setMealtimeScore] = useState<number | null>(null);
  const [mealtimeYesCount, setMealtimeYesCount] = useState<number | null>(null);
  const [mealtimeTotalCount, setMealtimeTotalCount] = useState<number | null>(null);
  const [mealtimeUpdatedAt, setMealtimeUpdatedAt] = useState<string | null>(null);

  const [nightScore, setNightScore] = useState<number | null>(null);
  const [nightYesCount, setNightYesCount] = useState<number | null>(null);
  const [nightTotalCount, setNightTotalCount] = useState<number | null>(null);
  const [nightUpdatedAt, setNightUpdatedAt] = useState<string | null>(null);

  const [staffFileScore, setStaffFileScore] = useState<number | null>(null);
  const [staffFileYesCount, setStaffFileYesCount] = useState<number | null>(null);
  const [staffFileTotalCount, setStaffFileTotalCount] = useState<number | null>(null);
  const [staffFileUpdatedAt, setStaffFileUpdatedAt] = useState<string | null>(null);

  const [kitchenScore, setKitchenScore] = useState<number | null>(null);
  const [kitchenYesCount, setKitchenYesCount] = useState<number | null>(null);
  const [kitchenTotalCount, setKitchenTotalCount] = useState<number | null>(null);
  const [kitchenUpdatedAt, setKitchenUpdatedAt] = useState<string | null>(null);

  const [fallsScore, setFallsScore] = useState<number | null>(null);
  const [fallsYesCount, setFallsYesCount] = useState<number | null>(null);
  const [fallsTotalCount, setFallsTotalCount] = useState<number | null>(null);
  const [fallsUpdatedAt, setFallsUpdatedAt] = useState<string | null>(null);

  // Historical data for trend calculation
  const [historicalData, setHistoricalData] = useState<Record<string, any>>({});
  const [trends, setTrends] = useState<Record<string, { direction: 'up' | 'down' | 'stable', change: number }>>({});

  // Additional dashboard metrics
  const [documentsCount, setDocumentsCount] = useState<number>(0);
  const [documentsByType, setDocumentsByType] = useState<Record<string, number>>({});
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);

  const [actionPlansStats, setActionPlansStats] = useState<{ total: number; completed: number; pending: number; overdue: number }>({ total: 0, completed: 0, pending: 0, overdue: 0 });

  const [teamStats, setTeamStats] = useState<{ managers: number; nurses: number; carers: number; domestics: number; kitchen: number; activities: number; maintenance: number }>({
    managers: 0, nurses: 0, carers: 0, domestics: 0, kitchen: 0, activities: 0, maintenance: 0
  });

  const [notificationsCount, setNotificationsCount] = useState<{ total: number; unread: number }>({ total: 0, unread: 0 });

  const [dailyCheckInsStats, setDailyCheckInsStats] = useState<{ thisWeek: number; thisMonth: number; avgCompletionTime: number }>({
    thisWeek: 0, thisMonth: 0, avgCompletionTime: 0
  });

  const [workspaceInfo, setWorkspaceInfo] = useState<{ name: string; totalBeds?: number; occupiedBeds?: number; occupancyRate?: number }>({
    name: '', totalBeds: undefined, occupiedBeds: undefined, occupancyRate: undefined
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  // Raw latest audit scores snapshot (keys are audit keys like 'care-plan')
  const [latestScores, setLatestScores] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!workspaceId) return;
    try {
      if (!organisationId) {
        console.warn('No organisationId provided to StatsView. Cannot subscribe to org-scoped audit_latest_scores.');
        return;
      }
      const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', organisationId)), 'audit_latest_scores');
      const unsub = onSnapshot(docRef, (snap) => {
        const data: any = snap.exists() ? snap.data() : {};
        // keep raw snapshot so we can render all audits dynamically
        setLatestScores(data || {});
        // DEV DEBUG: attach raw snapshot to window so developers can inspect in console
        try { (window as any).__DEBUG_audit_latest_scores = data; } catch (e) { }
        const cp = data['care-plan'] ?? null;
        const hs = data['health-safety'] ?? null;
        const m = data['maintenance'] ?? null;
        const r = data['restrictive-practice'] ?? null;
        const f = data['fire-safety'] ?? null;
        const ic = data['infection-control'] ?? null;
        const mt = data['mealtime'] ?? null;
        const nv = data['night-visit'] ?? null;
        const sf = data['staff-file'] ?? null;
        const k = data['kitchen'] ?? null;
        const falls = data['falls'] ?? null;

        if (cp) {
          setCarePlanScore(typeof cp.scorePercent === 'number' ? cp.scorePercent : null);
          setCarePlanYesCount(typeof cp.yesCount === 'number' ? cp.yesCount : null);
          setCarePlanTotalCount(typeof cp.totalCount === 'number' ? cp.totalCount : null);
          setCarePlanUpdatedAt(cp.updatedAt ?? null);
        } else {
          setCarePlanScore(null);
          setCarePlanYesCount(null);
          setCarePlanTotalCount(null);
          setCarePlanUpdatedAt(null);
        }

        if (hs) {
          setHsScore(typeof hs.scorePercent === 'number' ? hs.scorePercent : null);
          setHsYesCount(typeof hs.yesCount === 'number' ? hs.yesCount : null);
          setHsTotalCount(typeof hs.totalCount === 'number' ? hs.totalCount : null);
          setHsUpdatedAt(hs.updatedAt ?? null);
        } else {
          setHsScore(null);
          setHsYesCount(null);
          setHsTotalCount(null);
          setHsUpdatedAt(null);
        }

        if (m) {
          setMaintenanceScore(typeof m.scorePercent === 'number' ? m.scorePercent : null);
          setMaintenanceYesCount(typeof m.yesCount === 'number' ? m.yesCount : null);
          setMaintenanceTotalCount(typeof m.totalCount === 'number' ? m.totalCount : null);
          setMaintenanceUpdatedAt(m.updatedAt ?? null);
        } else {
          setMaintenanceScore(null);
          setMaintenanceYesCount(null);
          setMaintenanceTotalCount(null);
          setMaintenanceUpdatedAt(null);
        }

        if (r) {
          setRestrictiveScore(typeof r.scorePercent === 'number' ? r.scorePercent : null);
          setRestrictiveYesCount(typeof r.yesCount === 'number' ? r.yesCount : null);
          setRestrictiveTotalCount(typeof r.totalCount === 'number' ? r.totalCount : null);
          setRestrictiveUpdatedAt(r.updatedAt ?? null);
        } else {
          setRestrictiveScore(null);
          setRestrictiveYesCount(null);
          setRestrictiveTotalCount(null);
          setRestrictiveUpdatedAt(null);
        }

        if (f) {
          setFireScore(typeof f.scorePercent === 'number' ? f.scorePercent : null);
          setFireYesCount(typeof f.yesCount === 'number' ? f.yesCount : null);
          setFireTotalCount(typeof f.totalCount === 'number' ? f.totalCount : null);
          setFireUpdatedAt(f.updatedAt ?? null);
        } else {
          setFireScore(null);
          setFireYesCount(null);
          setFireTotalCount(null);
          setFireUpdatedAt(null);
        }

        if (ic) {
          setInfectionScore(typeof ic.scorePercent === 'number' ? ic.scorePercent : null);
          setInfectionYesCount(typeof ic.yesCount === 'number' ? ic.yesCount : null);
          setInfectionTotalCount(typeof ic.totalCount === 'number' ? ic.totalCount : null);
          setInfectionUpdatedAt(ic.updatedAt ?? null);
        } else {
          setInfectionScore(null);
          setInfectionYesCount(null);
          setInfectionTotalCount(null);
          setInfectionUpdatedAt(null);
        }

        if (mt) {
          setMealtimeScore(typeof mt.scorePercent === 'number' ? mt.scorePercent : null);
          setMealtimeYesCount(typeof mt.yesCount === 'number' ? mt.yesCount : null);
          setMealtimeTotalCount(typeof mt.totalCount === 'number' ? mt.totalCount : null);
          setMealtimeUpdatedAt(mt.updatedAt ?? null);
        } else {
          setMealtimeScore(null);
          setMealtimeYesCount(null);
          setMealtimeTotalCount(null);
          setMealtimeUpdatedAt(null);
        }

        if (nv) {
          setNightScore(typeof nv.scorePercent === 'number' ? nv.scorePercent : null);
          setNightYesCount(typeof nv.yesCount === 'number' ? nv.yesCount : null);
          setNightTotalCount(typeof nv.totalCount === 'number' ? nv.totalCount : null);
          setNightUpdatedAt(nv.updatedAt ?? null);
        } else {
          setNightScore(null);
          setNightYesCount(null);
          setNightTotalCount(null);
          setNightUpdatedAt(null);
        }

        if (sf) {
          setStaffFileScore(typeof sf.scorePercent === 'number' ? sf.scorePercent : null);
          setStaffFileYesCount(typeof sf.yesCount === 'number' ? sf.yesCount : null);
          setStaffFileTotalCount(typeof sf.totalCount === 'number' ? sf.totalCount : null);
          setStaffFileUpdatedAt(sf.updatedAt ?? null);
        } else {
          setStaffFileScore(null);
          setStaffFileYesCount(null);
          setStaffFileTotalCount(null);
          setStaffFileUpdatedAt(null);
        }

        if (k) {
          setKitchenScore(typeof k.scorePercent === 'number' ? k.scorePercent : null);
          setKitchenYesCount(typeof k.yesCount === 'number' ? k.yesCount : null);
          setKitchenTotalCount(typeof k.totalCount === 'number' ? k.totalCount : null);
          setKitchenUpdatedAt(k.updatedAt ?? null);
        } else {
          setKitchenScore(null);
          setKitchenYesCount(null);
          setKitchenTotalCount(null);
          setKitchenUpdatedAt(null);
        }

        if (falls) {
          setFallsScore(typeof falls.scorePercent === 'number' ? falls.scorePercent : null);
          setFallsYesCount(typeof falls.yesCount === 'number' ? falls.yesCount : null);
          setFallsTotalCount(typeof falls.totalCount === 'number' ? falls.totalCount : null);
          setFallsUpdatedAt(falls.updatedAt ?? null);
        } else {
          setFallsScore(null);
          setFallsYesCount(null);
          setFallsTotalCount(null);
          setFallsUpdatedAt(null);
        }

        // Calculate trends by comparing with previous month's data
        calculateTrends(data);
      }, (err) => console.error('Failed to subscribe to audit_latest_scores', err));
      return () => unsub();
    } catch (e) {
      console.error('Failed to listen for audit_latest_scores', e);
    }
  }, [workspaceId]);

  // Fetch documents statistics
  useEffect(() => {
    if (!workspaceId || !organisationId) return;

    const unsubscribers: (() => void)[] = [];

    try {
      // Listen to documents collection
      const docsRef = collection(db, workspaceCollectionPath(workspaceId, 'documents', organisationId));
      const docsQuery = query(docsRef, orderBy('createdAt', 'desc'), limit(100));

      const unsub = onSnapshot(docsQuery, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDocumentsCount(docs.length);

        // Count by file type
        const byType: Record<string, number> = {};
        docs.forEach((doc: any) => {
          const type = doc.fileType || 'other';
          byType[type] = (byType[type] || 0) + 1;
        });
        setDocumentsByType(byType);

        // Recent documents (last 5)
        setRecentDocuments(docs.slice(0, 5));
      }, (err) => console.error('Failed to fetch documents', err));

      unsubscribers.push(unsub);
    } catch (e) {
      console.error('Failed to setup documents listener', e);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [workspaceId, organisationId]);

  // Fetch action plans statistics
  useEffect(() => {
    if (!workspaceId || !organisationId) return;

    const fetchActionPlans = async () => {
      try {
        const plansRef = collection(db, workspaceCollectionPath(workspaceId, 'action-plans', organisationId));
        const snapshot = await getDocs(plansRef);

        let total = 0;
        let completed = 0;
        let pending = 0;
        let overdue = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const items = Array.isArray(data.items) ? data.items : [];

          items.forEach((item: any) => {
            total++;
            if (item.status === 'completed' || item.completed) {
              completed++;
            } else {
              pending++;
              // Check if overdue (dueDate in the past)
              if (item.dueDate) {
                const dueDate = new Date(item.dueDate);
                if (dueDate < new Date()) {
                  overdue++;
                }
              }
            }
          });
        });

        setActionPlansStats({ total, completed, pending, overdue });
      } catch (e) {
        console.error('Failed to fetch action plans', e);
      }
    };

    fetchActionPlans();
  }, [workspaceId, organisationId]);

  // Fetch team statistics
  useEffect(() => {
    if (!workspaceId || !organisationId) return;

    const fetchTeamStats = async () => {
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId));
        const workspaceSnap = await getDoc(workspaceRef);

        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();

          setTeamStats({
            managers: Array.isArray(data.managers) ? data.managers.length : 0,
            nurses: Array.isArray(data.nurses) ? data.nurses.length : 0,
            carers: Array.isArray(data.carers) ? data.carers.length : 0,
            domestics: Array.isArray(data.domestics) ? data.domestics.length : 0,
            kitchen: Array.isArray(data.kitchens) ? data.kitchens.length : 0,
            activities: Array.isArray(data.activities) ? data.activities.length : 0,
            maintenance: Array.isArray(data.maintenances) ? data.maintenances.length : 0,
          });

          // Workspace info
          setWorkspaceInfo({
            name: data.name || 'Workspace',
            totalBeds: data.totalBeds,
            occupiedBeds: data.occupiedBeds,
            occupancyRate: data.totalBeds && data.occupiedBeds ? (data.occupiedBeds / data.totalBeds) * 100 : undefined
          });
        }
      } catch (e) {
        console.error('Failed to fetch team stats', e);
      }
    };

    fetchTeamStats();
  }, [workspaceId, organisationId]);

  // Fetch notifications statistics
  useEffect(() => {
    if (!workspaceId || !organisationId) return;

    try {
      const notifsRef = collection(db, workspaceCollectionPath(workspaceId, 'notifications', organisationId));
      const notifsQuery = query(notifsRef, orderBy('createdAt', 'desc'), limit(50));

      const unsub = onSnapshot(notifsQuery, (snapshot) => {
        const total = snapshot.size;
        const unread = snapshot.docs.filter(doc => !doc.data().read).length;
        setNotificationsCount({ total, unread });

        // Set recent activity from notifications
        const activities = snapshot.docs.slice(0, 10).map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentActivity(activities);
      }, (err) => console.error('Failed to fetch notifications', err));

      return () => unsub();
    } catch (e) {
      console.error('Failed to setup notifications listener', e);
    }
  }, [workspaceId, organisationId]);

  // Fetch daily check-ins statistics
  useEffect(() => {
    if (!workspaceId || !organisationId) return;

    const fetchDailyCheckIns = async () => {
      try {
        const checkInsRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', organisationId));

        // This week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekQuery = query(checkInsRef, where('createdAt', '>=', weekAgo), orderBy('createdAt', 'desc'));
        const weekSnapshot = await getDocs(weekQuery);

        // This month
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);

        const monthQuery = query(checkInsRef, where('createdAt', '>=', monthAgo), orderBy('createdAt', 'desc'));
        const monthSnapshot = await getDocs(monthQuery);

        setDailyCheckInsStats({
          thisWeek: weekSnapshot.size,
          thisMonth: monthSnapshot.size,
          avgCompletionTime: 0 // Could calculate from data if timestamps available
        });
      } catch (e) {
        console.error('Failed to fetch daily check-ins', e);
      }
    };

    fetchDailyCheckIns();
  }, [workspaceId, organisationId]);

  // Function to calculate trends
  const calculateTrends = (currentData: any) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Store current month's data
    setHistoricalData(prev => ({
      ...prev,
      [monthKey]: currentData
    }));

    // Calculate previous month
    const prevDate = new Date(currentYear, currentMonth - 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // Get previous month's data from localStorage or state
    let savedHistory: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        savedHistory = localStorage.getItem(`audit_history_${workspaceId}`);
      }
    } catch (e) {
      console.warn('Failed to read from localStorage', e);
    }
    const history = savedHistory ? JSON.parse(savedHistory) : {};

    const prevData = history[prevMonthKey];

    if (prevData && currentData) {
      const newTrends: Record<string, { direction: 'up' | 'down' | 'stable', change: number }> = {};

      const auditTypes = ['care-plan', 'health-safety', 'maintenance', 'restrictive-practice',
        'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen', 'falls'];

      // Calculate individual audit trends
      auditTypes.forEach(auditType => {
        const current = currentData[auditType]?.scorePercent;
        const previous = prevData[auditType]?.scorePercent;

        if (typeof current === 'number' && typeof previous === 'number') {
          const change = current - previous;
          const direction = change > 2 ? 'up' : change < -2 ? 'down' : 'stable';
          newTrends[auditType] = { direction, change: Math.round(change) };
        }
      });

      // Calculate overall trend
      const currentOverall = calculateOverallStatsFromData(currentData);
      const prevOverall = calculateOverallStatsFromData(prevData);

      if (currentOverall.overallPercentage !== null && prevOverall.overallPercentage !== null) {
        const overallChange = currentOverall.overallPercentage - prevOverall.overallPercentage;
        const overallDirection = overallChange > 2 ? 'up' : overallChange < -2 ? 'down' : 'stable';
        newTrends['overall'] = { direction: overallDirection, change: Math.round(overallChange) };
      }

      setTrends(newTrends);
    }

    // Save current data to localStorage for next month comparison
    // Save current data to localStorage for next month comparison
    try {
      if (typeof window !== 'undefined') {
        const updatedHistory = { ...history, [monthKey]: currentData };
        localStorage.setItem(`audit_history_${workspaceId}`, JSON.stringify(updatedHistory));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  };

  // Helper function to calculate overall stats from raw data
  const calculateOverallStatsFromData = (data: any) => {
    const auditTypes = ['care-plan', 'health-safety', 'maintenance', 'restrictive-practice',
      'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen', 'falls'];

    let totalYes = 0;
    let totalQuestions = 0;
    let completedAudits = 0;

    auditTypes.forEach(auditType => {
      const audit = data[auditType];
      if (audit && typeof audit.yesCount === 'number' && typeof audit.totalCount === 'number') {
        totalYes += audit.yesCount;
        totalQuestions += audit.totalCount;
        completedAudits++;
      }
    });

    const overallPercentage = totalQuestions > 0 ? Math.round((totalYes / totalQuestions) * 100) : null;

    return {
      overallPercentage,
      totalYes,
      totalQuestions,
      completedAudits
    };
  };

  const calculateOverallStats = () => {
    // Use AUDIT_TYPES to determine expected audits and use latestScores map for values
    const auditKeys = (Array.isArray(AUDIT_TYPES) ? AUDIT_TYPES : []) as AuditType[];

    let totalYesCount = 0;
    let totalQuestions = 0;
    let completed = 0;

    auditKeys.forEach((key: AuditType) => {
      const item = latestScores?.[key as any];
      if (item && typeof item.yesCount === 'number' && typeof item.totalCount === 'number') {
        totalYesCount += item.yesCount;
        totalQuestions += item.totalCount;
        completed++;
      }
    });

    const overallPercentage = totalQuestions > 0 ? Math.round((totalYesCount / totalQuestions) * 100) : null;

    return {
      totalYesCount,
      totalQuestions,
      overallPercentage,
      auditsCompleted: completed,
      totalAudits: auditKeys.length || 0
    };
  };

  const overallStats = calculateOverallStats();

  // Component to display trend indicators
  const TrendIndicator = ({ auditType }: { auditType: string }) => {
    const trend = trends[auditType];
    if (!trend) return null;

    const { direction, change } = trend;
    const isPositive = direction === 'up';
    const isNegative = direction === 'down';

    return (
      <div className="flex items-center gap-1 text-xs">
        {isPositive && (
          <>
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span className="text-green-600">+{change}%</span>
          </>
        )}
        {isNegative && (
          <>
            <TrendingDown className="h-3 w-3 text-red-600" />
            <span className="text-red-600">{change}%</span>
          </>
        )}
        {direction === 'stable' && (
          <>
            <Minus className="h-3 w-3 text-gray-500" />
            <span className="text-gray-500">No change</span>
          </>
        )}
      </div>
    );
  };

  // Helper functions for charts and data
  const getAuditChartData = () => {
    return ((Array.isArray(AUDIT_TYPES) ? AUDIT_TYPES : []) as AuditType[])
      .map((key: AuditType) => ({ name: AUDIT_DISPLAY_NAMES[key] || key, score: latestScores?.[key as any]?.scorePercent ?? null }))
      .filter(a => a.score !== null);
  };

  const getAuditStatusData = () => {
    return ((Array.isArray(AUDIT_TYPES) ? AUDIT_TYPES : []) as AuditType[]).map((key: AuditType) => {
      const score = latestScores?.[key as any]?.scorePercent ?? null;
      return {
        key,
        name: AUDIT_DISPLAY_NAMES[key] || key,
        score,
        status: score === null ? 'pending' : score >= 80 ? 'completed' : 'in-progress'
      };
    });
  };

  const getTrendSummary = () => {
    const trendsData = [
      { category: 'Overall', direction: trends['overall']?.direction || 'stable', change: trends['overall']?.change || 0 },
      { category: 'Care Plan', direction: trends['care-plan']?.direction || 'stable', change: trends['care-plan']?.change || 0 },
      { category: 'Health & Safety', direction: trends['health-safety']?.direction || 'stable', change: trends['health-safety']?.change || 0 }
    ];
    return trendsData;
  };

  const getTrendChartData = () => {
    // Mock data for demonstration - in real app this would come from historical data
    return [
      { month: 'Jan', overall: 75 },
      { month: 'Feb', overall: 78 },
      { month: 'Mar', overall: 82 },
      { month: 'Apr', overall: overallStats.overallPercentage || 0 }
    ];
  };

  // Detailed audit cards moved to a modular component

  // Function to get color based on score percentage
  const getScoreColor = (score: number | null) => {
    if (score === null) return '#cbd5e1'; // Gray for N/A
    if (score >= 80) return '#10b981'; // Green for high scores (80%+)
    if (score >= 20) return '#f59e0b'; // Amber for medium scores (20-79%)
    return '#ef4444'; // Red for low scores (0-19%)
  };

  // Function to get gradient colors based on score percentage
  const getGradientColors = (score: number | null) => {
    if (score === null) return { start: '#e5e7eb', end: '#cbd5e1' }; // Gray gradient for N/A
    if (score >= 80) return { start: '#34d399', end: '#059669' }; // Green gradient for high scores
    if (score >= 20) return { start: '#fbbf24', end: '#d97706' }; // Amber gradient for medium scores  
    return { start: '#f87171', end: '#dc2626' }; // Red gradient for low scores
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <PageHeader
        title="Analytics & Performance Dashboard"
        subtitle="Comprehensive insights across audits, documents, teams, and operations"
        leading={(
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
        )}
        actions={(
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Clock className="w-3 h-3 mr-1" />
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Target className="w-3 h-3 mr-1" />
              Overall: {overallStats.overallPercentage ?? 'N/A'}%
            </Badge>
          </div>
        )}
      />

      {/* Content */}
      <div className="p-6 space-y-8">

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overall Compliance Score */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                {trends['overall'] && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trends['overall'].direction === 'up' ? 'bg-green-500/20' :
                    trends['overall'].direction === 'down' ? 'bg-red-500/20' : 'bg-white/10'
                    }`}>
                    {trends['overall'].direction === 'up' ? <ArrowUp className="w-3 h-3" /> :
                      trends['overall'].direction === 'down' ? <ArrowDown className="w-3 h-3" /> :
                        <Minus className="w-3 h-3" />}
                    {trends['overall'].change}%
                  </div>
                )}
              </div>
              <div className="text-4xl font-bold mb-2">
                {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : 'N/A'}
              </div>
              <div className="text-sm text-white/80">Overall Compliance</div>
              <div className="text-xs text-white/60 mt-1">
                {overallStats.auditsCompleted}/{overallStats.totalAudits} audits completed
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  +{recentDocuments.length} recent
                </Badge>
              </div>
              <div className="text-4xl font-bold mb-2">{documentsCount}</div>
              <div className="text-sm text-white/80">Total Documents</div>
              <div className="text-xs text-white/60 mt-1">
                {Object.keys(documentsByType).length} document types
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  7 roles
                </Badge>
              </div>
              <div className="text-4xl font-bold mb-2">
                {Object.values(teamStats).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-sm text-white/80">Team Members</div>
              <div className="text-xs text-white/60 mt-1">
                Across all departments
              </div>
            </CardContent>
          </Card>

          {/* Action Plans */}
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                {actionPlansStats.overdue > 0 && (
                  <Badge variant="secondary" className="bg-red-500/80 text-white border-0">
                    {actionPlansStats.overdue} overdue
                  </Badge>
                )}
              </div>
              <div className="text-4xl font-bold mb-2">
                {actionPlansStats.completed}/{actionPlansStats.total}
              </div>
              <div className="text-sm text-white/80">Action Plans</div>
              <div className="text-xs text-white/60 mt-1">
                {actionPlansStats.total > 0 ? Math.round((actionPlansStats.completed / actionPlansStats.total) * 100) : 0}% completion rate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Info & Occupancy */}
        {(workspaceInfo.totalBeds || workspaceInfo.occupancyRate !== undefined) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  Facility Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Facility Name</span>
                    <span className="font-semibold">{workspaceInfo.name}</span>
                  </div>
                  {workspaceInfo.totalBeds && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Beds</span>
                      <span className="font-semibold">{workspaceInfo.totalBeds}</span>
                    </div>
                  )}
                  {workspaceInfo.occupiedBeds !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Occupied</span>
                      <span className="font-semibold">{workspaceInfo.occupiedBeds}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {workspaceInfo.occupancyRate !== undefined && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bed className="h-5 w-5 text-pink-600" />
                    Occupancy Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                    <div className="w-32 h-32 flex-shrink-0">
                      <OccupancyPie
                        percent={Math.round(workspaceInfo.occupancyRate)}
                        size={128}
                        strokeWidth={12}
                        gradientColors={{ start: '#ec4899', end: '#db2777' }}
                        centerFontSize={24}
                      />
                    </div>
                    <div className="flex-1 w-full text-center sm:text-left">
                      <div className="text-3xl font-bold text-pink-600 mb-2">
                        {Math.round(workspaceInfo.occupancyRate)}%
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        {workspaceInfo.occupiedBeds} of {workspaceInfo.totalBeds} beds occupied
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-pink-50 rounded-lg">
                          <div className="text-2xl font-bold text-pink-600">{workspaceInfo.occupiedBeds}</div>
                          <div className="text-xs text-gray-600">Occupied</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">
                            {workspaceInfo.totalBeds && workspaceInfo.occupiedBeds
                              ? workspaceInfo.totalBeds - workspaceInfo.occupiedBeds
                              : 0}
                          </div>
                          <div className="text-xs text-gray-600">Available</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Audit Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audit Performance Chart */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Audit Performance Overview
              </CardTitle>
              <CardDescription>Current scores across all audit categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                score: { label: "Score", color: "#3b82f6" }
              }} className="h-80">
                <BarChart data={getAuditChartData()}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="var(--color-score)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Audit Status Grid */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Audit Status
              </CardTitle>
              <CardDescription>Quick overview of all audit categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {getAuditStatusData().map((audit) => (
                  <div key={audit.key} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${audit.status === 'completed' ? 'bg-green-500' :
                      audit.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{audit.name}</p>
                      <p className="text-xs text-gray-600">
                        {audit.score !== null ? `${audit.score}%` : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Distribution & Document Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Distribution */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Team Distribution
              </CardTitle>
              <CardDescription>Staff members across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Managers', count: teamStats.managers, color: 'bg-blue-500', icon: Briefcase },
                  { label: 'Nurses', count: teamStats.nurses, color: 'bg-green-500', icon: UserCheck },
                  { label: 'Care Staff', count: teamStats.carers, color: 'bg-purple-500', icon: Users },
                  { label: 'Domestic', count: teamStats.domestics, color: 'bg-pink-500', icon: Users },
                  { label: 'Kitchen', count: teamStats.kitchen, color: 'bg-orange-500', icon: Utensils },
                  { label: 'Activities', count: teamStats.activities, color: 'bg-cyan-500', icon: Activity },
                  { label: 'Maintenance', count: teamStats.maintenance, color: 'bg-yellow-500', icon: Wrench },
                ].map((dept) => {
                  const Icon = dept.icon;
                  const totalStaff = Object.values(teamStats).reduce((a, b) => a + b, 0);
                  const percentage = totalStaff > 0 ? (dept.count / totalStaff) * 100 : 0;

                  return (
                    <div key={dept.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{dept.label}</span>
                        </div>
                        <span className="text-gray-600">{dept.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${dept.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Document Statistics */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-emerald-600" />
                Document Statistics
              </CardTitle>
              <CardDescription>Document types and distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{documentsCount}</div>
                    <div className="text-xs text-gray-600">Total Docs</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{documentsByType['pdf'] || 0}</div>
                    <div className="text-xs text-gray-600">PDFs</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{Object.keys(documentsByType).length}</div>
                    <div className="text-xs text-gray-600">Types</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Recent Documents</h4>
                  {recentDocuments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No recent documents</p>
                  ) : (
                    <div className="space-y-2">
                      {recentDocuments.slice(0, 5).map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name || 'Untitled'}</p>
                            <p className="text-xs text-gray-500">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Analysis */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Performance Trends
            </CardTitle>
            <CardDescription>Monthly performance changes and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {getTrendSummary().map((trend) => (
                <div key={trend.category} className="text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${trend.direction === 'up' ? 'bg-green-100 text-green-800' :
                    trend.direction === 'down' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {trend.direction === 'up' ? <TrendingUp className="h-4 w-4" /> :
                      trend.direction === 'down' ? <TrendingDown className="h-4 w-4" /> :
                        <Minus className="h-4 w-4" />}
                    {trend.change !== 0 ? `${trend.change > 0 ? '+' : ''}${trend.change}%` : 'No change'}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{trend.category}</p>
                </div>
              ))}
            </div>
            <ChartContainer config={{
              overall: { label: "Overall Score", color: "#6366f1" }
            }} className="h-64">
              <AreaChart data={getTrendChartData()}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke="var(--color-overall)"
                  fill="var(--color-overall)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>

            {/* Rota trends card inserted here */}
            <div className="mt-6">
              <RotaTrends workspaceId={workspaceId} organisationId={organisationId} />
            </div>
          </CardContent>
        </Card>

        {/* Activity & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                ) : (
                  recentActivity.slice(0, 6).map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title || 'Activity'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.createdAt?.toDate?.()
                            ? activity.createdAt.toDate().toLocaleString()
                            : 'Recent'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Stats */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                System Activity
              </CardTitle>
              <CardDescription>Daily operations and check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <div className="text-3xl font-bold text-teal-600">{dailyCheckInsStats.thisWeek}</div>
                    <div className="text-sm text-gray-600 mt-1">Check-ins This Week</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{dailyCheckInsStats.thisMonth}</div>
                    <div className="text-sm text-gray-600 mt-1">Check-ins This Month</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Notifications</span>
                    <Badge variant="secondary">
                      {notificationsCount.unread} unread
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Bell className="w-4 h-4" />
                    <span>{notificationsCount.total} total notifications</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-3">Quick Stats</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pending Actions</span>
                      <span className="font-semibold text-amber-600">{actionPlansStats.pending}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Completed Actions</span>
                      <span className="font-semibold text-green-600">{actionPlansStats.completed}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overdue Actions</span>
                      <span className="font-semibold text-red-600">{actionPlansStats.overdue}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Audit Cards */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Detailed Audit Results</h2>
            <Badge variant="outline" className="text-sm">
              {overallStats.auditsCompleted} of {overallStats.totalAudits} completed
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailedAuditCards latestScores={latestScores} trends={trends} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsView;
