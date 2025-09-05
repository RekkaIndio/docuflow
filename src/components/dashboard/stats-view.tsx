"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TrendingUp, TrendingDown, Minus, FileText, Shield, Wrench, Lock, Flame, Biohazard, Utensils, Moon, Users, Soup } from 'lucide-react';

export function StatsView({ workspaceId }: { workspaceId?: string }) {
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

  // Historical data for trend calculation
  const [historicalData, setHistoricalData] = useState<Record<string, any>>({});
  const [trends, setTrends] = useState<Record<string, { direction: 'up' | 'down' | 'stable', change: number }>>({});

  useEffect(() => {
    if (!workspaceId) return;
    try {
      const docRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_latest_scores');
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
                         'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'];
      
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
                       'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'];
    
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

  // Small debug panel (dev only) to show the raw audit_latest_scores document
  const [rawJsonVisible, setRawJsonVisible] = React.useState(false);

  // Calculate overall statistics
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
      { score: kitchenScore, yesCount: kitchenYesCount, totalCount: kitchenTotalCount }
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
        totalAudits: 10
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
      totalAudits: 10
    };
  };

  const overallStats = calculateOverallStats();

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
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Stats</h2>
      <div className="mb-4">
        <button className="text-sm text-muted-foreground underline" onClick={() => setRawJsonVisible(v => !v)}>{rawJsonVisible ? 'Hide' : 'Show'} raw audit_latest_scores</button>
        {rawJsonVisible && (
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48">{JSON.stringify((window as any).__DEBUG_audit_latest_scores ?? {}, null, 2)}</pre>
        )}
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Overall Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Score Card */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-white text-lg">Overall Score</CardTitle>
              <CardDescription className="text-blue-100">Combined score across all audits</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="w-20 h-20">
                <OccupancyPie 
                  percent={overallStats.overallPercentage ?? 0} 
                  size={80} 
                  strokeWidth={10} 
                  gradientColors={getGradientColors(overallStats.overallPercentage)}
                  centerFontSize={14} 
                />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: getScoreColor(overallStats.overallPercentage) }}>
                  {overallStats.overallPercentage !== null ? `${overallStats.overallPercentage}%` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Overall Performance</div>
                {overallStats.overallPercentage !== null && (
                  <div className="mt-1">
                    <TrendIndicator auditType="overall" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Questions Card */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="text-white text-lg">Total Questions</CardTitle>
              <CardDescription className="text-green-100">Questions answered correctly</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {overallStats.totalYesCount}
                </div>
                <div className="text-lg text-muted-foreground">
                  of {overallStats.totalQuestions}
                </div>
                <div className="text-sm text-muted-foreground mt-1">questions passed</div>
              </div>
            </CardContent>
          </Card>

          {/* Audits Completed Card */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-white text-lg">Audits Completed</CardTitle>
              <CardDescription className="text-purple-100">Number of audits with data</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {overallStats.auditsCompleted}
                </div>
                <div className="text-lg text-muted-foreground">
                  of {overallStats.totalAudits}
                </div>
                <div className="text-sm text-muted-foreground mt-1">audits completed</div>
              </div>
            </CardContent>
          </Card>

          {/* Completion Rate Card */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="text-white text-lg">Completion Rate</CardTitle>
              <CardDescription className="text-orange-100">Percentage of audits completed</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {Math.round((overallStats.auditsCompleted / overallStats.totalAudits) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">audits have data</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Individual Audit Scores</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-300" />
              <div>
                <CardTitle className="text-white">Care Plan Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved care plan audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={carePlanScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(carePlanScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{carePlanScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{carePlanYesCount !== null && carePlanTotalCount !== null ? `${carePlanYesCount} of ${carePlanTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{carePlanUpdatedAt ? `Last saved: ${new Date(carePlanUpdatedAt).toLocaleString()}` : ''}</div>
              {carePlanScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="care-plan" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-300" />
              <div>
                <CardTitle className="text-white">Health & Safety Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved health & safety audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={hsScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(hsScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{hsScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{hsYesCount !== null && hsTotalCount !== null ? `${hsYesCount} of ${hsTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{hsUpdatedAt ? `Last saved: ${new Date(hsUpdatedAt).toLocaleString()}` : ''}</div>
              {hsScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="health-safety" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-yellow-300" />
              <div>
                <CardTitle className="text-white">Maintenance Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved maintenance audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={maintenanceScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(maintenanceScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{maintenanceScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{maintenanceYesCount !== null && maintenanceTotalCount !== null ? `${maintenanceYesCount} of ${maintenanceTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{maintenanceUpdatedAt ? `Last saved: ${new Date(maintenanceUpdatedAt).toLocaleString()}` : ''}</div>
              {maintenanceScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="maintenance" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-300" />
              <div>
                <CardTitle className="text-white">Restrictive Practice Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved restrictive practice audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={restrictiveScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(restrictiveScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{restrictiveScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{restrictiveYesCount !== null && restrictiveTotalCount !== null ? `${restrictiveYesCount} of ${restrictiveTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{restrictiveUpdatedAt ? `Last saved: ${new Date(restrictiveUpdatedAt).toLocaleString()}` : ''}</div>
              {restrictiveScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="restrictive-practice" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-400" />
              <div>
                <CardTitle className="text-white">Fire Safety Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved fire safety audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={fireScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(fireScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{fireScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{fireYesCount !== null && fireTotalCount !== null ? `${fireYesCount} of ${fireTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{fireUpdatedAt ? `Last saved: ${new Date(fireUpdatedAt).toLocaleString()}` : ''}</div>
              {fireScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="fire-safety" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Biohazard className="h-5 w-5 text-pink-400" />
              <div>
                <CardTitle className="text-white">Infection Control Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved infection control audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={infectionScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(infectionScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{infectionScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{infectionYesCount !== null && infectionTotalCount !== null ? `${infectionYesCount} of ${infectionTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{infectionUpdatedAt ? `Last saved: ${new Date(infectionUpdatedAt).toLocaleString()}` : ''}</div>
              {infectionScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="infection-control" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Utensils className="h-5 w-5 text-orange-300" />
              <div>
                <CardTitle className="text-white">Meal Time Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved mealtime audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={mealtimeScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(mealtimeScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{mealtimeScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{mealtimeYesCount !== null && mealtimeTotalCount !== null ? `${mealtimeYesCount} of ${mealtimeTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{mealtimeUpdatedAt ? `Last saved: ${new Date(mealtimeUpdatedAt).toLocaleString()}` : ''}</div>
              {mealtimeScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="mealtime" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-300" />
              <div>
                <CardTitle className="text-white">Night Visit Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved night visit audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={nightScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(nightScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{nightScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{nightYesCount !== null && nightTotalCount !== null ? `${nightYesCount} of ${nightTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{nightUpdatedAt ? `Last saved: ${new Date(nightUpdatedAt).toLocaleString()}` : ''}</div>
              {nightScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="night-visit" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-300" />
              <div>
                <CardTitle className="text-white">Staff File Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved staff file audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={staffFileScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(staffFileScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{staffFileScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{staffFileYesCount !== null && staffFileTotalCount !== null ? `${staffFileYesCount} of ${staffFileTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{staffFileUpdatedAt ? `Last saved: ${new Date(staffFileUpdatedAt).toLocaleString()}` : ''}</div>
              {staffFileScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="staff-file" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex items-center gap-2">
              <Soup className="h-5 w-5 text-lime-400" />
              <div>
                <CardTitle className="text-white">Kitchen & Kitchenettes Score</CardTitle>
                <CardDescription className="text-slate-200">Based on the most recent saved kitchen audit.</CardDescription>
              </div>
            </CardHeader>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-24 h-24">
              <OccupancyPie 
                percent={kitchenScore ?? 0} 
                size={96} 
                strokeWidth={12} 
                gradientColors={getGradientColors(kitchenScore)}
                centerFontSize={16} 
              />
            </div>
            <div>
              <div className="text-lg font-semibold">{kitchenScore !== null ? 'Score Available' : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{kitchenYesCount !== null && kitchenTotalCount !== null ? `${kitchenYesCount} of ${kitchenTotalCount} questions` : 'No data'}</div>
              <div className="text-xs text-muted-foreground mt-2">{kitchenUpdatedAt ? `Last saved: ${new Date(kitchenUpdatedAt).toLocaleString()}` : ''}</div>
              {kitchenScore !== null && (
                <div className="mt-2">
                  <TrendIndicator auditType="kitchen" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StatsView;
