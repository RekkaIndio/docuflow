"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath } from '@/lib/paths';
import { TrendingUp, TrendingDown, Minus, FileText, Shield, Wrench, Lock, Flame, Biohazard, Utensils, Moon, Users, Soup, AlertTriangle, BarChart3, Target, CheckCircle, CheckCircle2, Clock, Award, Activity } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import PageHeader from '../page-header';

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
        // DEV DEBUG: attach raw snapshot to window so developers can inspect in console
        try { (window as any).__DEBUG_audit_latest_scores = data; } catch (e) {}
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
    const savedHistory = localStorage.getItem(`audit_history_${workspaceId}`);
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
    const updatedHistory = { ...history, [monthKey]: currentData };
    localStorage.setItem(`audit_history_${workspaceId}`, JSON.stringify(updatedHistory));
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
    const scores = [
      { score: carePlanScore, yesCount: carePlanYesCount, totalCount: carePlanTotalCount },
      { score: hsScore, yesCount: hsYesCount, totalCount: hsTotalCount },
      { score: maintenanceScore, yesCount: maintenanceYesCount, totalCount: maintenanceTotalCount },
      { score: restrictiveScore, yesCount: restrictiveYesCount, totalCount: restrictiveTotalCount },
      { score: fireScore, yesCount: fireYesCount, totalCount: fireTotalCount },
      { score: infectionScore, yesCount: infectionYesCount, totalCount: infectionTotalCount },
      { score: mealtimeScore, yesCount: mealtimeYesCount, totalCount: mealtimeTotalCount },
      { score: nightScore, yesCount: nightYesCount, totalCount: nightTotalCount },
      { score: staffFileScore, yesCount: staffFileYesCount, totalCount: staffFileTotalCount },
      { score: kitchenScore, yesCount: kitchenYesCount, totalCount: kitchenTotalCount },
      { score: fallsScore, yesCount: fallsYesCount, totalCount: fallsTotalCount }
    ];

    const validScores = scores.filter(item =>
      item.score !== null && item.yesCount !== null && item.totalCount !== null
    );

    if (validScores.length === 0) {
      return {
        totalYesCount: 0,
        totalQuestions: 0,
        overallPercentage: null,
        auditsCompleted: 0,
        totalAudits: 11
      };
    }

    const totalYesCount = validScores.reduce((sum, item) => sum + item.yesCount!, 0);
    const totalQuestions = validScores.reduce((sum, item) => sum + item.totalCount!, 0);
    const overallPercentage = totalQuestions > 0 ? Math.round((totalYesCount / totalQuestions) * 100) : null;

    return {
      totalYesCount,
      totalQuestions,
      overallPercentage,
      auditsCompleted: validScores.length,
      totalAudits: 11
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
    const audits = [
      { name: 'Care Plan', score: carePlanScore },
      { name: 'Health & Safety', score: hsScore },
      { name: 'Maintenance', score: maintenanceScore },
      { name: 'Restrictive Practice', score: restrictiveScore },
      { name: 'Fire Safety', score: fireScore },
      { name: 'Infection Control', score: infectionScore },
      { name: 'Mealtime', score: mealtimeScore },
      { name: 'Night Visit', score: nightScore },
      { name: 'Staff File', score: staffFileScore },
      { name: 'Kitchen', score: kitchenScore },
      { name: 'Falls Prevention', score: fallsScore }
    ];
    return audits.filter(audit => audit.score !== null);
  };

  const getAuditStatusData = () => {
    const audits = [
      { key: 'care-plan', name: 'Care Plan', score: carePlanScore },
      { key: 'health-safety', name: 'Health & Safety', score: hsScore },
      { key: 'maintenance', name: 'Maintenance', score: maintenanceScore },
      { key: 'restrictive-practice', name: 'Restrictive Practice', score: restrictiveScore },
      { key: 'fire-safety', name: 'Fire Safety', score: fireScore },
      { key: 'infection-control', name: 'Infection Control', score: infectionScore },
      { key: 'mealtime', name: 'Mealtime', score: mealtimeScore },
      { key: 'night-visit', name: 'Night Visit', score: nightScore },
      { key: 'staff-file', name: 'Staff File', score: staffFileScore },
      { key: 'kitchen', name: 'Kitchen', score: kitchenScore },
      { key: 'falls', name: 'Falls Prevention', score: fallsScore }
    ];

    return audits.map(audit => ({
      ...audit,
      status: audit.score === null ? 'pending' : audit.score >= 80 ? 'completed' : 'in-progress'
    }));
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

  const getDetailedAuditCards = () => {
    const audits = [
      {
        title: 'Care Plan',
        score: carePlanScore,
        yesCount: carePlanYesCount,
        totalCount: carePlanTotalCount,
        updatedAt: carePlanUpdatedAt,
        icon: <FileText className="h-5 w-5 text-blue-600" />,
        trend: trends['care-plan']
      },
      {
        title: 'Health & Safety',
        score: hsScore,
        yesCount: hsYesCount,
        totalCount: hsTotalCount,
        updatedAt: hsUpdatedAt,
        icon: <Shield className="h-5 w-5 text-green-600" />,
        trend: trends['health-safety']
      },
      {
        title: 'Maintenance',
        score: maintenanceScore,
        yesCount: maintenanceYesCount,
        totalCount: maintenanceTotalCount,
        updatedAt: maintenanceUpdatedAt,
        icon: <Wrench className="h-5 w-5 text-yellow-600" />,
        trend: trends['maintenance']
      },
      {
        title: 'Restrictive Practice',
        score: restrictiveScore,
        yesCount: restrictiveYesCount,
        totalCount: restrictiveTotalCount,
        updatedAt: restrictiveUpdatedAt,
        icon: <Lock className="h-5 w-5 text-purple-600" />,
        trend: trends['restrictive-practice']
      },
      {
        title: 'Fire Safety',
        score: fireScore,
        yesCount: fireYesCount,
        totalCount: fireTotalCount,
        updatedAt: fireUpdatedAt,
        icon: <Flame className="h-5 w-5 text-red-600" />,
        trend: trends['fire-safety']
      },
      {
        title: 'Infection Control',
        score: infectionScore,
        yesCount: infectionYesCount,
        totalCount: infectionTotalCount,
        updatedAt: infectionUpdatedAt,
        icon: <Biohazard className="h-5 w-5 text-orange-600" />,
        trend: trends['infection-control']
      },
      {
        title: 'Mealtime',
        score: mealtimeScore,
        yesCount: mealtimeYesCount,
        totalCount: mealtimeTotalCount,
        updatedAt: mealtimeUpdatedAt,
        icon: <Utensils className="h-5 w-5 text-cyan-600" />,
        trend: trends['mealtime']
      },
      {
        title: 'Night Visit',
        score: nightScore,
        yesCount: nightYesCount,
        totalCount: nightTotalCount,
        updatedAt: nightUpdatedAt,
        icon: <Moon className="h-5 w-5 text-indigo-600" />,
        trend: trends['night-visit']
      },
      {
        title: 'Staff File',
        score: staffFileScore,
        yesCount: staffFileYesCount,
        totalCount: staffFileTotalCount,
        updatedAt: staffFileUpdatedAt,
        icon: <Users className="h-5 w-5 text-teal-600" />,
        trend: trends['staff-file']
      },
      {
        title: 'Kitchen',
        score: kitchenScore,
        yesCount: kitchenYesCount,
        totalCount: kitchenTotalCount,
        updatedAt: kitchenUpdatedAt,
        icon: <Soup className="h-5 w-5 text-emerald-600" />,
        trend: trends['kitchen']
      },
      {
        title: 'Falls Prevention',
        score: fallsScore,
        yesCount: fallsYesCount,
        totalCount: fallsTotalCount,
        updatedAt: fallsUpdatedAt,
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        trend: trends['falls']
      }
    ];

    return audits.filter(audit => audit.score !== null).map((audit, index) => (
      <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {audit.icon}
            {audit.title}
          </CardTitle>
          <CardDescription>
            {audit.yesCount !== null && audit.totalCount !== null
              ? `${audit.yesCount} of ${audit.totalCount} questions passed`
              : 'No data available'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <OccupancyPie
                  percent={audit.score ?? 0}
                  size={64}
                  strokeWidth={8}
                  gradientColors={getGradientColors(audit.score)}
                  centerFontSize={14}
                />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: getScoreColor(audit.score) }}>
                  {audit.score !== null ? `${audit.score}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Current Score</div>
              </div>
            </div>
            {audit.trend && (
              <div className="text-right">
                <TrendIndicator auditType={audit.title.toLowerCase().replace(' ', '-')} />
              </div>
            )}
          </div>
          {audit.updatedAt && (
            <div className="text-xs text-gray-500 mt-4">
              Last updated: {new Date(audit.updatedAt).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    ));
  };

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
        title="Audit Performance Dashboard"
        subtitle="Monitor compliance scores and track audit performance across all care home standards"
        leading={(
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <BarChart3 />
          </svg>
        )}
        actions={(
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 text-white text-sm">
              <FileText className="w-4 h-4 text-white/90" />
              <span className="font-medium">Audits: {overallStats.auditsCompleted}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 text-white text-sm">
              <Target className="w-4 h-4 text-white/90" />
              <span className="font-medium">Score: {overallStats.overallPercentage ?? 'N/A'}%</span>
            </div>
          </div>
        )}
      />
      
      {/* Reintroduce the larger KPI grid below the header so it doesn't force the header to grow */}
      <div className="mt-2 hidden xl:grid grid-cols-4 gap-6 w-full max-w-5xl mx-auto">
        {/* Reused KPI tiles from previous header actions (kept visually identical) */}
        <div className="group relative p-6 bg-white/90 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center transition-all hover:scale-[1.03] focus-within:ring-2 ring-blue-400" tabIndex={0} aria-label="Total Audits">
          <div className="mb-2 flex items-center justify-center w-14 h-14 rounded-full bg-blue-100">
            <FileText className="w-7 h-7 text-blue-500" />
          </div>
          <div className="text-4xl font-extrabold text-blue-700">
            {overallStats.totalAudits !== undefined && overallStats.totalAudits !== null ? overallStats.totalAudits : <span className="text-base text-slate-400">No data</span>}
          </div>
          <div className="text-sm text-blue-700 font-medium">Total Audits</div>
        </div>
        <div className="group relative p-6 bg-white/90 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center transition-all hover:scale-[1.03] focus-within:ring-2 ring-emerald-400" tabIndex={0} aria-label="Completed">
          <div className="mb-2 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="text-4xl font-extrabold text-emerald-600">{overallStats.totalAudits ? overallStats.auditsCompleted : '—'}</div>
          <div className="text-sm text-emerald-600 font-medium">Completed</div>
        </div>
        <div className="group relative p-6 bg-white/90 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center transition-all hover:scale-[1.03] focus-within:ring-2 ring-teal-400" tabIndex={0} aria-label="Overall Score">
          <div className="mb-2 flex items-center justify-center w-14 h-14 rounded-full bg-teal-50">
            <Target className="w-7 h-7 text-teal-400" />
          </div>
          <div className="text-4xl font-extrabold text-teal-700">{overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : 'N/A'}</div>
          <div className="text-sm text-teal-600 font-medium">Overall Score</div>
        </div>
        <div className="group relative p-6 bg-white/90 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center transition-all hover:scale-[1.03] focus-within:ring-2 ring-amber-400" tabIndex={0} aria-label="Questions">
          <div className="mb-2 flex items-center justify-center w-14 h-14 rounded-full bg-amber-50">
            <Clock className="w-7 h-7 text-amber-400" />
          </div>
          <div className="text-4xl font-extrabold text-amber-700">0/0</div>
          <div className="text-sm text-amber-600 font-medium">Questions</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audit Performance Chart */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
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
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="var(--color-score)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Audit Status Grid */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Audit Status
              </CardTitle>
              <CardDescription>Quick overview of all audit categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {getAuditStatusData().map((audit) => (
                  <div key={audit.key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className={`w-3 h-3 rounded-full ${audit.status === 'completed' ? 'bg-green-500' : audit.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{audit.name}</p>
                      <p className="text-xs text-gray-600">
                        {audit.score !== null ? `${audit.score}%` : 'Not started'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Analysis */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
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
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
                    trend.direction === 'up' ? 'bg-green-100 text-green-800' :
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
          </CardContent>
        </Card>

        {/* Detailed Audit Cards */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Audit Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getDetailedAuditCards()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsView;
