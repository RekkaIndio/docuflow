'use client';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath } from '@/lib/paths';
import { useWorkspace } from '@/context/workspace';
import { getMonthlyAuditCompletionStatus, getMonthlyAuditSnapshots, listAuditMonths, getCurrentMonthKey, AuditMonthSummary } from '@/lib/firestore';
import { AUDIT_DISPLAY_NAMES, AUDIT_TYPES } from '@/lib/audit-types';
import AccidentIncidentAuditPage from "./accident-incident/page";
import CallBellMonitoringAuditPage from "./call-bell-monitoring/page";
import CarePlanAuditPage from "./care-plan/page";
import MedicationAuditPage from "./medication/page";
import AuditHeader from '@/components/audit-header';
import EquipmentAuditPage from "./equipment/page";
import FireSafetyAuditPage from "./fire-safety/page";
import HandHygieneAuditPage from "./hand-hygiene/page";
import HealthSafetyAuditPage from "./health-safety/page";
import InfectionControlAuditPage from "./infection-control/page";
import KitchenAuditPage from "./kitchen/page";
import MaintenanceAuditPage from "./maintenance/page";
import ManagersWeeklyAuditPage from "./managers-weekly/page";
import ManagersMonthlyAuditPage from "./managers-monthly/page";
import MealtimeAuditPage from "./mealtime/page";
import NightVisitAuditPage from "./night-visit/page";
import RestrictivePracticeAuditPage from "./restrictive-practice/page";
import StaffFileAuditPage from "./staff-file/page";
import WeightMonitoringAuditPage from "./weight-monitoring/page";
import WoundMonitoringAuditPage from "./wound-monitoring/page";
import RiskRegisterAuditPage from "./risk-register/page";
import PageHeader from '@/components/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';
import { Loader2, FileDown, Info, Calendar as CalendarIcon, Clock, CheckCircle as CheckIcon, AlertCircle, Plus, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AuditSnapshot = Record<string, any> & { id: string; auditType: string; monthKey: string };

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

const monthLabelFromKey = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split('-');
  const monthIndex = Number(monthPart) - 1;
  if (!yearPart || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }
  return `${MONTH_LABELS[monthIndex]} ${yearPart}`;
};

const getMonthKeyFromIso = (iso?: string | null) => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthIndexFromKey = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (Number.isNaN(year) || Number.isNaN(month)) return null;
  return year * 12 + (month - 1);
};

export default function AuditsPage() {
  const activeWorkspace = useWorkspace();
  const [auditScheduleMap, setAuditScheduleMap] = useState<Record<string, string | null>>({});
  const [auditStatusMap, setAuditStatusMap] = useState<Record<string, string>>({});
  const [monthlyCompletionStatus, setMonthlyCompletionStatus] = useState<Record<string, boolean>>({});
  const [monthlySnapshotsCount, setMonthlySnapshotsCount] = useState<Record<string, number>>({});
  const [latestAuditScores, setLatestAuditScores] = useState<Record<string, { scorePercent?: number | null; yesCount?: number | null; totalCount?: number | null }>>({});
  const [pendingCreateAuditType, setPendingCreateAuditType] = useState<string | null>(null);
  const [accidentAuditStartFresh, setAccidentAuditStartFresh] = useState(false);
  const [tab, setTab] = useState<'current' | 'tracker'>('current');
  const [auditMonths, setAuditMonths] = useState<AuditMonthSummary[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [monthSnapshots, setMonthSnapshots] = useState<Record<string, AuditSnapshot[]>>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AuditSnapshot | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [monthKeysWithData, setMonthKeysWithData] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    if (!activeWorkspace?.id) return;
    
    // Load monthly completion status
    const loadMonthlyStatus = async () => {
      try {
        const status = await getMonthlyAuditCompletionStatus(activeWorkspace.id, activeWorkspace.organisationId || null);
        if (mounted) setMonthlyCompletionStatus(status);
        // also compute snapshots counts for progress indicators
        try {
          const snaps = await getMonthlyAuditSnapshots(activeWorkspace.id, undefined, activeWorkspace.organisationId || null);
          const counts: Record<string, number> = {};
          Object.keys(snaps || {}).forEach(k => { counts[k] = Array.isArray(snaps[k]) ? snaps[k].length : 0; });
          if (mounted) setMonthlySnapshotsCount(counts);
        } catch (e) {
          console.warn('Failed to load monthly snapshots for progress', e);
        }
      } catch (e) {
        console.warn('Failed to load monthly audit completion status', e);
      }
    };
    
    loadMonthlyStatus();
    
    try {
      const settingsCol = collection(db, workspaceCollectionPath(activeWorkspace.id, 'settings', activeWorkspace.organisationId));
      const schedRef = doc(settingsCol, 'audit_schedule');
      const statusRef = doc(settingsCol, 'audit_status');
      const scoresRef = doc(settingsCol, 'audit_latest_scores');

      const unsubSched = onSnapshot(schedRef, (snap) => {
        if (!mounted) return;
        if (!snap.exists()) return setAuditScheduleMap({});
        setAuditScheduleMap(snap.data() as Record<string, string | null>);
      }, (err) => console.warn('Audit schedule snapshot error', err));

      const unsubStatus = onSnapshot(statusRef, (snap) => {
        if (!mounted) return;
        if (!snap.exists()) return setAuditStatusMap({});
        setAuditStatusMap(snap.data() as Record<string, string>);
        // Reload monthly status when audit status changes
        loadMonthlyStatus();
      }, (err) => console.warn('Audit status snapshot error', err));

      const unsubScores = onSnapshot(scoresRef, (snap) => {
        if (!mounted) return;
        if (!snap.exists()) return setLatestAuditScores({});
        const raw = snap.data() as Record<string, { scorePercent?: number; yesCount?: number; totalCount?: number }>;
        setLatestAuditScores(raw);
      }, (err) => console.warn('Audit score snapshot error', err));

      return () => {
        mounted = false;
        unsubSched();
        unsubStatus();
        unsubScores();
      };
    } catch (e) {
      console.warn('Failed to subscribe to audit schedules/status/scores', e);
    }
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);
  const [currentView, setCurrentView] = useState<'list' | 'accident-incident' | 'call-bell-monitoring' | 'care-plan' | 'medication' | 'equipment' | 'fire-safety' | 'hand-hygiene' | 'health-safety' | 'infection-control' | 'kitchen' | 'maintenance' | 'managers-weekly' | 'managers-monthly' | 'night-visit' | 'restrictive-practice' | 'staff-file' | 'weight-monitoring' | 'wound-monitoring' | 'mealtime' | 'risk-register'>('list');

  // Check if we should auto-open a specific audit (from compliance card clicks)
  useEffect(() => {
    const openAuditType = localStorage.getItem('openAuditType');
    if (openAuditType) {
      // Clear the stored audit type
      localStorage.removeItem('openAuditType');
      // Set the current view to the specified audit type
  if (openAuditType === 'accident-incident' || 
          openAuditType === 'call-bell-monitoring' ||
          openAuditType === 'care-plan' ||
      openAuditType === 'medication' ||
      openAuditType === 'managers-monthly' ||
          openAuditType === 'equipment' ||
          openAuditType === 'fire-safety' ||
          openAuditType === 'hand-hygiene' ||
          openAuditType === 'health-safety' ||
          openAuditType === 'infection-control' ||
          openAuditType === 'kitchen' ||
          openAuditType === 'maintenance' ||
          openAuditType === 'managers-weekly' ||
          openAuditType === 'night-visit' ||
          openAuditType === 'restrictive-practice' ||
          openAuditType === 'staff-file' ||
          openAuditType === 'weight-monitoring' ||
          openAuditType === 'wound-monitoring' ||
          openAuditType === 'mealtime' ||
          openAuditType === 'risk-register') {
            setTab('current');
        setCurrentView(openAuditType as any);
      }
    }
  }, []);

  const handleAuditCardClick = (auditType: string, options?: { bypassCompletionCheck?: boolean; startFresh?: boolean }) => {
    const isCompleted = monthlyCompletionStatus[auditType];
    if (isCompleted && !options?.bypassCompletionCheck) {
      alert('This audit has already been completed for this month. You can edit it if needed.');
      return;
    }
    setTab('current');
    setAccidentAuditStartFresh(auditType === 'accident-incident' ? !!options?.startFresh : false);
    setCurrentView(auditType as any);
  };

  const handleEditAudit = (auditType: string) => {
    setTab('current');
    setAccidentAuditStartFresh(false);
    setCurrentView(auditType as any);
  };

  // Calculate next reset date (7th of next month) and days remaining
  const calculateResetInfo = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Determine the next reset date (7th of next month, or this month if we haven't passed the 7th yet)
    let resetMonth = currentMonth;
    let resetYear = currentYear;
    
    if (currentDay >= 7) {
      // If we've passed the 7th this month, next reset is 7th of next month
      resetMonth = currentMonth + 1;
      if (resetMonth > 11) {
        resetMonth = 0;
        resetYear = currentYear + 1;
      }
    }
    
    const resetDate = new Date(resetYear, resetMonth, 7);
    const timeDiff = resetDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return { resetDate, daysRemaining };
  };

  const { resetDate, daysRemaining } = calculateResetInfo();
  
  // Determine color based on days remaining
  const getCountdownColor = (days: number) => {
    if (days > 15) return { text: 'text-green-800', bg: 'bg-green-100' };
    if (days > 5) return { text: 'text-amber-800', bg: 'bg-amber-100' };
    return { text: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const buildScoreTheme = (percent: number | null) => {
    if (typeof percent !== 'number') {
      return {
        scorePercent: null,
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-600',
        accent: { bar: 'from-blue-500 to-blue-600', iconBg: 'from-blue-100 to-blue-200', iconText: 'text-blue-600' },
        ring: '',
        titleText: 'text-gray-900'
      };
    }

    const normalized = Math.max(0, Math.min(100, Math.round(percent)));

    if (normalized < 86) {
      return {
        scorePercent: normalized,
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-700',
        accent: { bar: 'from-red-500 to-red-600', iconBg: 'from-red-100 to-red-200', iconText: 'text-red-600' },
        ring: 'ring-2 ring-red-200',
        titleText: 'text-red-700'
      };
    }

    if (normalized < 95) {
      return {
        scorePercent: normalized,
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
        accent: { bar: 'from-amber-500 to-amber-600', iconBg: 'from-amber-100 to-amber-200', iconText: 'text-amber-600' },
        ring: 'ring-2 ring-amber-200',
        titleText: 'text-amber-700'
      };
    }

    return {
      scorePercent: normalized,
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-700',
      accent: { bar: 'from-emerald-500 to-emerald-600', iconBg: 'from-emerald-100 to-emerald-200', iconText: 'text-emerald-600' },
      ring: 'ring-2 ring-emerald-200',
      titleText: 'text-emerald-700'
    };
  };

  const getScoreDetails = (auditType: string) => {
    const latest = latestAuditScores?.[auditType];
    if (!latest) {
      return buildScoreTheme(null);
    }

    const computedPercent = typeof latest.scorePercent === 'number'
      ? latest.scorePercent
      : (typeof latest.yesCount === 'number' && typeof latest.totalCount === 'number' && latest.totalCount > 0
        ? (latest.yesCount / latest.totalCount) * 100
        : null);

    return buildScoreTheme(computedPercent);
  };

  const AuditCard = ({
    auditType,
    title,
    description,
    onClick,
    onCreateNew,
  }: {
    auditType: string;
    title: string;
    description: string;
    onClick: () => void;
    onCreateNew?: () => void;
  }) => {
    const isCompleted = monthlyCompletionStatus[auditType];
    const snapshotCount = monthlySnapshotsCount[auditType] ?? 0;
    const progressPercent = auditType === 'managers-weekly' ? Math.min(100, Math.round((snapshotCount / 4) * 100)) : undefined;
    const scheduleIso = auditScheduleMap?.[auditType] ?? null;
    const completedIso = auditStatusMap?.[auditType] ?? null;
    const dueDate = scheduleIso ? new Date(scheduleIso) : null;
    const parsedDueDate = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
    const dueMonthKey = getMonthKeyFromIso(scheduleIso);
    const completedMonthKey = getMonthKeyFromIso(completedIso);
    const dueMonthIndex = dueMonthKey ? getMonthIndexFromKey(dueMonthKey) : null;
    const completedMonthIndex = completedMonthKey ? getMonthIndexFromKey(completedMonthKey) : null;
    const currentMonthIndex = getMonthIndexFromKey(currentMonthKey);
    const deadlinePassed = parsedDueDate ? Date.now() > parsedDueDate.getTime() : false;
    const missedDeadline = !isCompleted && (deadlinePassed || (typeof dueMonthIndex === 'number' && typeof currentMonthIndex === 'number' && dueMonthIndex < currentMonthIndex && (typeof completedMonthIndex !== 'number' || completedMonthIndex < dueMonthIndex)));
    const canStartNew = !isCompleted && !missedDeadline;
    const dueDateLabel = parsedDueDate
      ? parsedDueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : null;
    const completedDate = completedIso ? new Date(completedIso) : null;
    const completedDateLabel = completedDate && !Number.isNaN(completedDate.getTime())
      ? completedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : null;
    const isUrgent = canStartNew && typeof daysRemaining === 'number' && daysRemaining < 5;
    const score = getScoreDetails(auditType);
    const topAccentGradient = score.accent.bar;
    const iconGradient = score.accent.iconBg;
    const iconColor = score.accent.iconText;
    const ringClass = score.scorePercent === null
      ? (isCompleted ? 'ring-2 ring-green-200' : isUrgent ? 'ring-2 ring-red-200' : '')
      : score.ring;

    const handleStart = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!canStartNew) return;
      onClick();
    };

    const handleCreateNew = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!canStartNew) return;
      if (onCreateNew) {
        onCreateNew();
        return;
      }
      onClick();
    };

    return (
      <div className={`group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50/50 shadow-sm transition-all duration-300 hover:shadow-lg ${ringClass}`}>
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute top-0 right-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-gray-900 to-transparent"></div>
          <div className="absolute bottom-0 left-0 h-24 w-24 translate-y-12 -translate-x-12 rounded-full bg-gradient-to-tr from-gray-900 to-transparent"></div>
        </div>

        <div className={`h-1 w-full bg-gradient-to-r ${score.scorePercent === null ? (isCompleted ? 'from-green-500 to-green-600' : isUrgent ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600') : topAccentGradient}`}></div>

        <div className="relative z-10 flex flex-1 flex-col p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-xl p-3 shadow-sm bg-gradient-to-br ${score.scorePercent === null ? (isCompleted ? 'from-green-100 to-green-200' : isUrgent ? 'from-red-100 to-red-200' : 'from-blue-100 to-blue-200') : iconGradient}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${score.scorePercent === null ? (isCompleted ? 'text-green-600' : isUrgent ? 'text-red-600' : 'text-blue-600') : iconColor}`}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className={`text-lg font-semibold transition-colors ${score.scorePercent === null ? (isCompleted ? 'text-green-800 group-hover:text-green-700' : 'text-gray-900 group-hover:text-gray-800') : `${score.titleText} group-hover:opacity-90`}`}>
                  {title}
                </h3>
                {typeof score.scorePercent === 'number' && (
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${score.badgeBg} ${score.badgeText} border border-white/40 shadow-sm`}>
                    {score.scorePercent}%
                  </span>
                )}
                {auditType === 'managers-weekly' && !isCompleted && typeof progressPercent === 'number' && (
                  <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{progressPercent}%</span>
                )}
              </div>
              <p className={`mt-1 text-sm transition-colors ${isCompleted ? 'text-green-700' : 'text-gray-600 group-hover:text-gray-700'}`}>
                {description}
              </p>
            </div>

            {!isCompleted && (
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={!canStartNew}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-colors ${
                  canStartNew
                    ? 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100'
                    : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                }`}
                aria-label="Start new audit"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-2 text-sm">
              {parsedDueDate && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                  Due {dueDateLabel}
                </div>
              )}
              {completedDateLabel && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  Last done {completedDateLabel}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {isCompleted ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed this month
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAudit(auditType);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    Review
                  </button>
                </div>
              ) : (
                missedDeadline ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                      <Ban className="h-3.5 w-3.5" />
                      Deadline missed — review previous audit
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAudit(auditType);
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
                    >
                      Review existing audit
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Use the plus button to begin this month&apos;s audit.</p>
                )
              )}

              {auditType === 'managers-weekly' && !isCompleted && (
                <div className="w-full max-w-[200px]">
                  <div className="mb-1 text-xs text-gray-600">Progress: {snapshotCount}/4</div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-2 bg-blue-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalAuditTypes = AUDIT_TYPES.length;

  useEffect(() => {
    setAuditMonths([]);
    setSelectedMonthKey(null);
    setMonthSnapshots({});
    setTrackerError(null);
    setMonthKeysWithData([]);
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  const loadAuditMonths = useCallback(async () => {
    if (!activeWorkspace?.id) {
      return;
    }

    setMonthsLoading(true);
    setTrackerError(null);

    try {
      const months = await listAuditMonths(activeWorkspace.id, activeWorkspace.organisationId || null);
      const monthMap = new Map<string, AuditMonthSummary>();

      months.forEach((month) => {
        if (month?.monthKey) {
          monthMap.set(month.monthKey, month);
        }
      });

      const dataMonthKeys = Array.from(monthMap.keys());

      const currentMonthKey = getCurrentMonthKey();
      if (!monthMap.has(currentMonthKey)) {
        monthMap.set(currentMonthKey, {
          folderId: `virtual-${currentMonthKey}`,
          monthKey: currentMonthKey,
          name: monthLabelFromKey(currentMonthKey),
        });
      }

      setMonthKeysWithData(dataMonthKeys);

      const sorted = Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      setAuditMonths(sorted);

      setSelectedMonthKey((prev) => {
        if (prev && monthMap.has(prev)) {
          return prev;
        }
        if (monthMap.has(currentMonthKey)) {
          return currentMonthKey;
        }
        return sorted.length > 0 ? sorted[0].monthKey : null;
      });
    } catch (error) {
      console.error('Failed to load audit months', error);
      setTrackerError('Unable to load audit history. Please try again.');
      setAuditMonths([]);
    } finally {
      setMonthsLoading(false);
    }
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  const loadSnapshotsForMonth = useCallback(async (monthKey: string) => {
    if (!activeWorkspace?.id) {
      return;
    }

    setSnapshotsLoading(true);
    setTrackerError(null);

    try {
      const data = await getMonthlyAuditSnapshots(activeWorkspace.id, monthKey, activeWorkspace.organisationId || null);
      const normalized: Record<string, AuditSnapshot[]> = Object.fromEntries(
        AUDIT_TYPES.map((type) => [type, [] as AuditSnapshot[]])
      );

      AUDIT_TYPES.forEach((type) => {
        const rawList = Array.isArray((data as any)?.[type]) ? (data as any)[type] : [];
        normalized[type] = rawList.map((item: any, index: number) => {
          const snapshotCreatedAt = item?.snapshotCreatedAt?.toDate?.()
            ? item.snapshotCreatedAt.toDate().toISOString()
            : item?.snapshotCreatedAt;
          const snapshotId = typeof item?.id === 'string' ? item.id : `${type}-${monthKey}-${index}`;
          return {
            ...item,
            id: snapshotId,
            snapshotCreatedAt,
            auditType: type,
            monthKey,
          } as AuditSnapshot;
        });
      });

      setMonthSnapshots(normalized);
    } catch (error) {
      console.error('Failed to load audit snapshots for month', error);
      setMonthSnapshots({});
      setTrackerError('Unable to load audit details for this month.');
    } finally {
      setSnapshotsLoading(false);
    }
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  useEffect(() => {
    if (tab !== 'tracker') return;
    if (!activeWorkspace?.id) return;
    loadAuditMonths();
  }, [tab, activeWorkspace?.id, loadAuditMonths]);

  useEffect(() => {
    if (tab !== 'tracker') return;
    if (!activeWorkspace?.id) return;
    if (!selectedMonthKey) return;
    loadSnapshotsForMonth(selectedMonthKey);
  }, [tab, activeWorkspace?.id, selectedMonthKey, loadSnapshotsForMonth]);

  const completedCountForSelectedMonth = useMemo(() => {
    return AUDIT_TYPES.reduce((count, type) => {
      const entries = monthSnapshots[type];
      return count + (entries && entries.length > 0 ? 1 : 0);
    }, 0);
  }, [monthSnapshots]);

  const monthsGroupedByYear = useMemo(() => {
    return auditMonths.reduce((acc, month) => {
      const year = month.monthKey.slice(0, 4);
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(month);
      return acc;
    }, {} as Record<string, AuditMonthSummary[]>);
  }, [auditMonths]);

  const monthsWithDataSet = useMemo(() => new Set(monthKeysWithData), [monthKeysWithData]);

  const availableYears = useMemo(() => {
    return Object.keys(monthsGroupedByYear).sort((a, b) => Number(b) - Number(a));
  }, [monthsGroupedByYear]);

  const handleSelectMonth = useCallback((monthKey: string) => {
    setSelectedMonthKey(monthKey);
    setAuditMonths((prev) => {
      if (prev.some((month) => month.monthKey === monthKey)) {
        return prev;
      }
      const nextEntry: AuditMonthSummary = {
        folderId: `virtual-${monthKey}`,
        monthKey,
        name: monthLabelFromKey(monthKey),
      };
      const next = [...prev, nextEntry];
      next.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      return next;
    });
  }, []);

  const handleOpenSnapshot = useCallback((snapshot: AuditSnapshot) => {
    setSelectedSnapshot(snapshot);
    setSnapshotModalOpen(true);
  }, []);

  const handleCloseSnapshot = useCallback(() => {
    setSnapshotModalOpen(false);
    setSelectedSnapshot(null);
    setPdfDownloading(false);
  }, []);

  const handleDatePickerSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthKey = `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}`;
    handleSelectMonth(monthKey);
    setDatePickerOpen(false);
  }, [handleSelectMonth, setDatePickerOpen]);

  const formatFieldLabel = useCallback((label: string) => {
    return label
      .replace(/[-_]/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  const formatFieldValue = useCallback((value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();

    if (value && typeof value === 'object') {
      if (typeof (value as any).toDate === 'function') {
        try {
          return (value as any).toDate().toLocaleString();
        } catch (err) {
          return String((value as any).toDate());
        }
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        const mapped = value.map((item) => {
          if (item === null || item === undefined) return 'Not provided';
          if (typeof item === 'object') {
            return JSON.stringify(item, null, 2);
          }
          return String(item);
        });
        return mapped.join('\n');
      }

      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }, []);

  const renderFieldValue = useCallback((displayValue: string) => {
    if (/\n/.test(displayValue)) {
      return (
        <pre className="whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
          {displayValue}
        </pre>
      );
    }

    return <span className="text-sm text-gray-700">{displayValue}</span>;
  }, []);

  const selectedMonthLabel = useMemo(() => (selectedMonthKey ? monthLabelFromKey(selectedMonthKey) : ''), [selectedMonthKey]);
  const selectedMonthDate = useMemo(() => {
    if (!selectedMonthKey) return undefined;
    const [yearPart, monthPart] = selectedMonthKey.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);
    if (Number.isNaN(year) || Number.isNaN(month)) return undefined;
    const date = new Date(year, month - 1, 1);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }, [selectedMonthKey]);

  const snapshotSummary = useMemo(() => {
    if (!selectedSnapshot) return [] as Array<{ label: string; value: string }>;

    const entries = [
      { label: 'Audit Date', value: selectedSnapshot.auditDate },
      { label: 'Completed By', value: selectedSnapshot.completedBy },
      {
        label: 'Home',
        value: selectedSnapshot.home || selectedSnapshot.facility || selectedSnapshot.location,
      },
      typeof selectedSnapshot.scorePercent === 'number'
        ? { label: 'Score', value: `${selectedSnapshot.scorePercent}%` }
        : null,
      typeof selectedSnapshot.yesCount === 'number' && typeof selectedSnapshot.totalCount === 'number'
        ? { label: 'Responses', value: `${selectedSnapshot.yesCount} / ${selectedSnapshot.totalCount}` }
        : null,
      { label: 'Snapshot Created', value: selectedSnapshot.snapshotCreatedAt },
    ].filter(Boolean) as Array<{ label: string; value: unknown }>;

    return entries.map((entry) => ({
      label: entry.label,
      value: formatFieldValue(entry.value),
    }));
  }, [selectedSnapshot, formatFieldValue]);

  const snapshotTopLevelDetails = useMemo(() => {
    if (!selectedSnapshot) return [] as Array<{ label: string; value: string }>;

    const ignoreKeys = new Set([
      'data',
      'auditType',
      'monthKey',
      'snapshotCreatedAt',
      'organisationId',
      'orgId',
      'workspaceId',
      'id',
      'scorePercent',
      'yesCount',
      'totalCount',
      'completedBy',
      'auditDate',
      'home',
      'facility',
      'location',
    ]);

    return Object.entries(selectedSnapshot)
      .filter(([key, value]) => !ignoreKeys.has(key) && typeof value !== 'function')
      .map(([key, value]) => ({
        label: formatFieldLabel(key),
        value: formatFieldValue(value),
      }))
      .filter((item) => item.value && item.value !== 'Not provided');
  }, [selectedSnapshot, formatFieldLabel, formatFieldValue]);

  const snapshotResponses = useMemo(() => {
    if (!selectedSnapshot?.data || typeof selectedSnapshot.data !== 'object') {
      return [] as Array<{ key: string; label: string; value: string }>;
    }

    return Object.entries(selectedSnapshot.data as Record<string, unknown>)
      .filter(([key]) => key !== '_embeddedImages')
      .map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        value: formatFieldValue(value),
      }));
  }, [selectedSnapshot, formatFieldLabel, formatFieldValue]);

  const handleDownloadSnapshotPdf = useCallback(async () => {
    if (!selectedSnapshot) return;

    try {
      setPdfDownloading(true);
      const { generateAuditPDF, getAuditPDFFilename } = await import('@/lib/pdf-generator');
      const homeName = selectedSnapshot.home || selectedSnapshot.facility || selectedSnapshot.location || activeWorkspace?.name || 'Workspace';
      const auditDate = selectedSnapshot.auditDate || selectedSnapshot.completedAt || selectedSnapshot.snapshotCreatedAt || new Date().toISOString();

      const pdfOutput = generateAuditPDF({
        auditType: selectedSnapshot.auditType,
        home: homeName,
        auditDate,
        completedBy: selectedSnapshot.completedBy || 'Unknown',
        data: selectedSnapshot.data ?? selectedSnapshot,
        comments: selectedSnapshot.comments || selectedSnapshot.finalComments,
        scorePercent: selectedSnapshot.scorePercent,
        yesCount: selectedSnapshot.yesCount,
        totalCount: selectedSnapshot.totalCount,
      });

      let arrayBuffer: ArrayBuffer;
      if (pdfOutput instanceof ArrayBuffer) {
        arrayBuffer = pdfOutput;
      } else if (ArrayBuffer.isView(pdfOutput)) {
        const view = pdfOutput;
        const sourceBuffer = view.buffer;
        if (sourceBuffer instanceof ArrayBuffer) {
          const isFullView = view.byteOffset === 0 && view.byteLength === sourceBuffer.byteLength;
          arrayBuffer = isFullView
            ? sourceBuffer
            : sourceBuffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
        } else {
          const copy = new ArrayBuffer(view.byteLength);
          new Uint8Array(copy).set(new Uint8Array(sourceBuffer, view.byteOffset, view.byteLength));
          arrayBuffer = copy;
        }
      } else {
        throw new Error('Unexpected PDF output format');
      }

      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getAuditPDFFilename(selectedSnapshot.auditType, homeName, auditDate);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate audit PDF', error);
      toast({
        title: 'Unable to download PDF',
        description: 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setPdfDownloading(false);
    }
  }, [selectedSnapshot, activeWorkspace?.name, toast]);

  

  if (currentView === 'infection-control') {
    return (
      <div>
        <AuditHeader title="Infection Control Audit" subtitle="Procedures for infection prevention" onBack={() => setCurrentView('list')} />
        <InfectionControlAuditPage />
      </div>
    );
  }

  if (currentView === 'call-bell-monitoring') {
    return (
      <div>
        <AuditHeader title="Call Bell Monitoring Audit" subtitle="Monitor and log call bell responses" onBack={() => setCurrentView('list')} />
        <CallBellMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'care-plan') {
    return (
      <div>
        <AuditHeader title="Care Plan Audit" subtitle="Review resident care plans" onBack={() => setCurrentView('list')} />
        <CarePlanAuditPage />
      </div>
    );
  }

  if (currentView === 'medication') {
    return (
      <div>
        <AuditHeader title="Medication Audit" subtitle="Medication management and safety" onBack={() => setCurrentView('list')} />
        <MedicationAuditPage />
      </div>
    );
  }

  if (currentView === 'equipment') {
    return (
      <div>
        <AuditHeader title="Equipment Audit" subtitle="Check equipment safety and maintenance" onBack={() => setCurrentView('list')} />
        <EquipmentAuditPage />
      </div>
    );
  }

  if (currentView === 'fire-safety') {
    return (
      <div>
        <AuditHeader title="Fire Safety Audit" subtitle="Ensure fire safety compliance" onBack={() => setCurrentView('list')} />
        <FireSafetyAuditPage />
      </div>
    );
  }

  if (currentView === 'hand-hygiene') {
    return (
      <div>
        <AuditHeader title="Hand Hygiene Audit" subtitle="Track hand hygiene practices" onBack={() => setCurrentView('list')} />
        <HandHygieneAuditPage />
      </div>
    );
  }

  if (currentView === 'health-safety') {
    return (
      <div>
        <AuditHeader title="Health and Safety Audit" subtitle="General health and safety checks" onBack={() => setCurrentView('list')} />
        <HealthSafetyAuditPage />
      </div>
    );
  }

  if (currentView === 'kitchen') {
    return (
      <div>
        <AuditHeader title="Kitchen & Kitchenettes Audit" subtitle="Food safety and kitchen cleanliness" onBack={() => setCurrentView('list')} />
        <KitchenAuditPage />
      </div>
    );
  }

  if (currentView === 'maintenance') {
    return (
      <div>
        <AuditHeader title="Maintenance Audit" subtitle="Building and facility maintenance checks" onBack={() => setCurrentView('list')} />
        <MaintenanceAuditPage />
      </div>
    );
  }

  if (currentView === 'managers-weekly') {
    return (
      <div>
        <AuditHeader title="Weekly Managers Walkaround Audit" subtitle="Weekly leadership checks" onBack={() => setCurrentView('list')} />
        <ManagersWeeklyAuditPage />
      </div>
    );
  }

  if (currentView === 'mealtime') {
    return (
      <div>
        <AuditHeader title="Meal Time Audit" subtitle="Monitor meal service quality" onBack={() => setCurrentView('list')} />
        <MealtimeAuditPage />
      </div>
    );
  }

  if (currentView === 'managers-monthly') {
    return (
      <div>
        <AuditHeader title="Managers Monthly Audit" subtitle="Comprehensive monthly leadership checks" onBack={() => setCurrentView('list')} />
        <ManagersMonthlyAuditPage />
      </div>
    );
  }

  if (currentView === 'night-visit') {
    return (
      <div>
        <AuditHeader title="Night Visit Audit" subtitle="Night-time checks and observations" onBack={() => setCurrentView('list')} />
        <NightVisitAuditPage />
      </div>
    );
  }

  if (currentView === 'restrictive-practice') {
    return (
      <div>
        <AuditHeader title="Restrictive Practice Audit" subtitle="Assess restrictive practice use" onBack={() => setCurrentView('list')} />
        <RestrictivePracticeAuditPage />
      </div>
    );
  }

  if (currentView === 'weight-monitoring') {
    return (
      <div>
        <AuditHeader title="Weight Monitoring Audit" subtitle="Track resident weight changes" onBack={() => setCurrentView('list')} />
        <WeightMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'staff-file') {
    return (
      <div>
        <AuditHeader title="Staff File Audit" subtitle="Check staff records and training" onBack={() => setCurrentView('list')} />
        <StaffFileAuditPage />
      </div>
    );
  }

  if (currentView === 'wound-monitoring') {
    return (
      <div>
        <AuditHeader title="Wound Monitoring Audit" subtitle="Record wound status and care" onBack={() => setCurrentView('list')} />
        <WoundMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'risk-register') {
    return (
      <div>
        <AuditHeader title="Risk Register" subtitle="Overview of resident risks and mitigations" onBack={() => setCurrentView('list')} />
        <RiskRegisterAuditPage />
      </div>
    );
  }
  

  // Handle different audit views
  if (currentView === 'accident-incident') {
    return (
      <div>
        <AuditHeader
          title="Accident and Incident Audit"
          subtitle="Record and review accidents and incidents"
          onBack={() => {
            setAccidentAuditStartFresh(false);
            setCurrentView('list');
          }}
        />
        <AccidentIncidentAuditPage startFresh={accidentAuditStartFresh} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audits"
        subtitle="Complete monthly compliance audits and track performance"
        gradientClass="from-primary to-accent"
        textClass="text-primary-foreground"
        leading={(
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground w-6 h-6">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        actions={(
          <div className="text-right">
            <div className="flex flex-col items-end h-10 sm:h-12 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-sm">
              <div className="text-primary-foreground/80 text-xs">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-primary-foreground/80 text-xs">Next: {resetDate.toLocaleDateString()}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>
        )}
      />

      <div className="p-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'current' | 'tracker')} className="w-full">
          <TabsList className="grid h-auto w-full max-w-lg grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="current">
              Current Audits
            </TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="tracker">
              History &amp; Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AuditCard
                auditType="accident-incident"
                title="Accident and Incident Audit"
                description="Record and review accidents and incidents"
                onClick={() => handleAuditCardClick('accident-incident')}
                onCreateNew={() => setPendingCreateAuditType('accident-incident')}
              />

              <AuditCard
                auditType="call-bell-monitoring"
                title="Call Bell Monitoring Audit"
                description="Monitor and log call bell responses"
                onClick={() => handleAuditCardClick('call-bell-monitoring')}
              />

              <AuditCard
                auditType="care-plan"
                title="Care Plan Audit"
                description="Review resident care plans"
                onClick={() => handleAuditCardClick('care-plan')}
              />

              <AuditCard
                auditType="medication"
                title="Medication Audit"
                description="Medication management and safety"
                onClick={() => handleAuditCardClick('medication')}
              />

              <AuditCard
                auditType="equipment"
                title="Equipment Audit"
                description="Check equipment safety and maintenance"
                onClick={() => handleAuditCardClick('equipment')}
              />

              <AuditCard
                auditType="fire-safety"
                title="Fire Safety Audit"
                description="Ensure fire safety compliance"
                onClick={() => handleAuditCardClick('fire-safety')}
              />

              <AuditCard
                auditType="hand-hygiene"
                title="Hand Hygiene Audit"
                description="Track hand hygiene practices"
                onClick={() => handleAuditCardClick('hand-hygiene')}
              />

              <AuditCard
                auditType="health-safety"
                title="Health and Safety Audit"
                description="General health and safety checks"
                onClick={() => handleAuditCardClick('health-safety')}
              />

              <AuditCard
                auditType="infection-control"
                title="Infection Control Audit"
                description="Procedures for infection prevention"
                onClick={() => handleAuditCardClick('infection-control')}
              />

              <AuditCard
                auditType="kitchen"
                title="Kitchen & Kitchenettes Audit"
                description="Food safety and kitchen cleanliness"
                onClick={() => handleAuditCardClick('kitchen')}
              />

              <AuditCard
                auditType="maintenance"
                title="Maintenance Audit"
                description="Building and facility maintenance checks"
                onClick={() => handleAuditCardClick('maintenance')}
              />

              <AuditCard
                auditType="mealtime"
                title="Meal Time Audit"
                description="Monitor meal service quality"
                onClick={() => handleAuditCardClick('mealtime')}
              />

              <AuditCard
                auditType="weight-monitoring"
                title="Weight Monitoring Audit"
                description="Track resident weight changes"
                onClick={() => handleAuditCardClick('weight-monitoring')}
              />

              <AuditCard
                auditType="wound-monitoring"
                title="Wound Monitoring Audit"
                description="Record wound status and care"
                onClick={() => handleAuditCardClick('wound-monitoring')}
              />

              <AuditCard
                auditType="night-visit"
                title="Night Visit Audit"
                description="Night-time checks and observations"
                onClick={() => handleAuditCardClick('night-visit')}
              />

              <AuditCard
                auditType="managers-weekly"
                title="Weekly Managers Walkaround Audit"
                description="Weekly leadership checks"
                onClick={() => handleAuditCardClick('managers-weekly')}
              />

              <AuditCard
                auditType="managers-monthly"
                title="Managers Monthly Audit"
                description="Comprehensive monthly leadership checks"
                onClick={() => handleAuditCardClick('managers-monthly')}
              />

              <AuditCard
                auditType="restrictive-practice"
                title="Restrictive Practice Audit"
                description="Assess restrictive practice use"
                onClick={() => handleAuditCardClick('restrictive-practice')}
              />

              <AuditCard
                auditType="staff-file"
                title="Staff File Audit"
                description="Check staff records and training"
                onClick={() => handleAuditCardClick('staff-file')}
              />

              <AuditCard
                auditType="risk-register"
                title="Risk Register"
                description="Overview of resident risks and mitigations"
                onClick={() => handleAuditCardClick('risk-register')}
              />
            </div>
            <p className="mt-8 text-muted-foreground">Select an audit type to begin.</p>
          </TabsContent>

          <TabsContent value="tracker" className="mt-6">
            <div className="space-y-8">
              {trackerError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {trackerError}
                </div>
              )}

              {monthsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : auditMonths.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                  <AlertCircle className="mx-auto mb-3 h-6 w-6 text-gray-400" />
                  No audit history saved yet. Complete your first audit to start the tracker.
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {availableYears.map((year) => {
                      const isSelectedYear = selectedMonthKey?.startsWith(year);
                      return (
                        <div key={year} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h2 className="text-lg font-semibold text-gray-900">{year} Audits</h2>
                              <p className="text-sm text-gray-500">Select a month to review saved snapshots.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                {monthsGroupedByYear[year]?.length ?? 0} saved
                              </span>
                              {isSelectedYear && (
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="flex items-center gap-2 border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                                    >
                                      <CalendarIcon className="h-4 w-4" />
                                      <span>Jump to month</span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="end">
                                    <DatePickerCalendar
                                      mode="single"
                                      selected={selectedMonthDate}
                                      defaultMonth={selectedMonthDate ?? new Date()}
                                      onSelect={handleDatePickerSelect}
                                      captionLayout="dropdown"
                                      fromYear={Math.max(2020, new Date().getFullYear() - 5)}
                                      toYear={new Date().getFullYear() + 2}
                                      showOutsideDays
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                            {MONTH_LABELS.map((monthLabel, index) => {
                            const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                            const monthEntry = monthsGroupedByYear[year]?.find((m) => m.monthKey === monthKey);
                            const isSelected = selectedMonthKey === monthKey;
                            const hasData = monthsWithDataSet.has(monthKey);
                            return (
                              <button
                                key={monthKey}
                                type="button"
                                onClick={() => handleSelectMonth(monthKey)}
                                className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                                  hasData
                                    ? 'bg-white hover:border-indigo-400 hover:shadow-md'
                                    : 'border-dashed border-gray-300 bg-slate-50 text-gray-500 hover:border-gray-300'
                                } ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-semibold ${hasData ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {MONTH_SHORT_LABELS[index]}
                                  </span>
                                  {hasData ? (
                                    <span className="text-xs font-medium text-indigo-600">Saved</span>
                                  ) : (
                                    <span className="text-xs">No data</span>
                                  )}
                                </div>
                                <div className="mt-3 text-xs text-gray-600">
                                  {monthEntry?.name || monthLabelFromKey(monthKey)}
                                </div>
                              </button>
                            );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedMonthKey && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {selectedMonthLabel || 'Audit history'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {completedCountForSelectedMonth} of {totalAuditTypes} audit types saved
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <Clock className="h-3.5 w-3.5" />
                          {completedCountForSelectedMonth}/{totalAuditTypes} complete
                        </span>
                      </div>

                      {snapshotsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                          {AUDIT_TYPES.map((type) => {
                            const snapshots = monthSnapshots[type] || [];
                            const snapshot = snapshots[0];
                            const hasSnapshot = Boolean(snapshot);
                            const displayName =
                              AUDIT_DISPLAY_NAMES[type as keyof typeof AUDIT_DISPLAY_NAMES] || formatFieldLabel(type);
                            const scorePercent = typeof snapshot?.scorePercent === 'number'
                              ? Math.max(0, Math.min(100, snapshot.scorePercent))
                              : null;
                            const scheduleIso = auditScheduleMap?.[type] ?? null;
                            const completedIso = auditStatusMap?.[type] ?? null;
                            const dueDateRaw = scheduleIso ? new Date(scheduleIso) : null;
                            const dueDate = dueDateRaw && !Number.isNaN(dueDateRaw.getTime()) ? dueDateRaw : null;
                            const dueDateLabel = dueDate
                              ? dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : null;
                            const completedDateRaw = snapshot?.auditDate
                              ? new Date(snapshot.auditDate)
                              : completedIso
                                ? new Date(completedIso)
                                : null;
                            const completedDate = completedDateRaw && !Number.isNaN(completedDateRaw.getTime()) ? completedDateRaw : null;
                            const completedLabel = completedDate
                              ? completedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : null;
                            const isCurrentSelection = selectedMonthKey === currentMonthKey;
                            const isCompleted = hasSnapshot;
                            const missedDeadline = isCurrentSelection && !isCompleted && !!dueDate && Date.now() > dueDate.getTime();
                            const canStartNew = isCurrentSelection && !isCompleted && !missedDeadline;
                            const scoreTheme = typeof scorePercent === 'number' ? buildScoreTheme(scorePercent) : getScoreDetails(type);
                            const hasScore = typeof scoreTheme.scorePercent === 'number';
                            const isUrgent = isCurrentSelection && canStartNew && typeof daysRemaining === 'number' && daysRemaining < 5;
                            const isAlertState = missedDeadline || isUrgent;
                            const accentGradient = hasScore
                              ? scoreTheme.accent.bar
                              : isCompleted
                                ? 'from-green-500 to-green-600'
                                : isAlertState
                                  ? 'from-red-500 to-red-600'
                                  : 'from-blue-500 to-blue-600';
                            const iconGradient = hasScore
                              ? scoreTheme.accent.iconBg
                              : isCompleted
                                ? 'from-green-100 to-green-200'
                                : isAlertState
                                  ? 'from-red-100 to-red-200'
                                  : 'from-blue-100 to-blue-200';
                            const iconColor = hasScore
                              ? scoreTheme.accent.iconText
                              : isCompleted
                                ? 'text-green-600'
                                : isAlertState
                                  ? 'text-red-600'
                                  : 'text-blue-600';
                            let ringClass = hasScore
                              ? scoreTheme.ring
                              : isCompleted
                                ? 'ring-2 ring-green-200'
                                : isAlertState
                                  ? 'ring-2 ring-red-200'
                                  : '';
                            const statusBadgeClasses = hasSnapshot
                              ? hasScore
                                ? `border border-white/40 shadow-sm ${scoreTheme.badgeBg} ${scoreTheme.badgeText}`
                                : 'border border-green-200 bg-green-100 text-green-800'
                              : missedDeadline
                                ? 'border border-red-200 bg-red-100 text-red-700'
                                : 'border border-gray-200 bg-gray-100 text-gray-600';
                            const titleClass = hasSnapshot
                              ? hasScore
                                ? `${scoreTheme.titleText} group-hover:opacity-90`
                                : 'text-green-800 group-hover:text-green-700'
                              : missedDeadline
                                ? 'text-red-700 group-hover:text-red-600'
                                : 'text-gray-900 group-hover:text-gray-800';
                            const StatusGlyph = hasSnapshot ? CheckIcon : missedDeadline ? Ban : Clock;

                            const startAudit = () => {
                              if (!canStartNew) return;
                              if (type === 'accident-incident') {
                                setPendingCreateAuditType('accident-incident');
                                return;
                              }
                              handleAuditCardClick(type);
                            };

                            return (
                              <div
                                key={`${selectedMonthKey}-${type}`}
                                className={`group relative flex h-full min-h-[210px] flex-col justify-between overflow-hidden rounded-xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50/40 p-5 shadow-sm transition-all hover:shadow-lg ${ringClass}`}
                              >
                                <div className="absolute inset-0 opacity-[0.02]">
                                  <div className="absolute top-0 right-0 h-24 w-24 -translate-y-10 translate-x-10 rounded-full bg-gradient-to-br from-gray-900 to-transparent" />
                                  <div className="absolute bottom-0 left-0 h-20 w-20 translate-y-8 -translate-x-8 rounded-full bg-gradient-to-tr from-gray-900 to-transparent" />
                                </div>

                                <div className={`relative h-1 w-full rounded-full bg-gradient-to-r ${accentGradient}`} />

                                <div className="relative z-10 mt-4 flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className={`rounded-xl bg-gradient-to-br p-2.5 shadow-sm ${iconGradient}`}>
                                      <StatusGlyph className={`h-4 w-4 ${iconColor}`} />
                                    </div>
                                    <div>
                                      <h4 className={`text-base font-semibold transition-colors ${titleClass}`}>{displayName} Audit</h4>
                                      <p className="text-xs text-gray-500">
                                        {hasSnapshot ? 'Snapshot saved' : 'No audit saved this month'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClasses}`}>
                                      {hasSnapshot ? <CheckIcon className="h-3 w-3" /> : missedDeadline ? <Ban className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                      {hasSnapshot ? 'Saved' : missedDeadline ? 'Missed' : 'Pending'}
                                    </span>
                                    {isCurrentSelection && !isCompleted && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startAudit();
                                        }}
                                        disabled={!canStartNew}
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors ${
                                          canStartNew
                                            ? 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100'
                                            : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                                        }`}
                                        aria-label="Start audit"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="relative z-10 mt-4 flex flex-1 flex-col justify-between gap-3 text-sm text-gray-700">
                                  <div className="space-y-2 text-xs text-gray-600">
                                    {dueDateLabel && isCurrentSelection && (
                                      <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                                        Due {dueDateLabel}
                                      </div>
                                    )}
                                    {completedLabel && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                        {hasSnapshot ? 'Completed' : 'Last done'} {completedLabel}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    {hasSnapshot ? (
                                      <div className="flex flex-col gap-2">
                                        {scorePercent !== null && (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700">
                                            {scorePercent}% score
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSnapshot(snapshot)}
                                          className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                                        >
                                          <Info className="h-3.5 w-3.5" />
                                          View details
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {!canStartNew && (
                                          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
                                            {missedDeadline ? (
                                              <>
                                                <Ban className="h-3.5 w-3.5" />
                                                Deadline missed — start restricted
                                              </>
                                            ) : (
                                              <>
                                                <Clock className="h-3.5 w-3.5" />
                                                Awaiting completion
                                              </>
                                            )}
                                          </div>
                                        )}
                                        {canStartNew && (
                                          <p className="text-xs text-gray-500">Use the plus button to begin this month&apos;s audit.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={!!pendingCreateAuditType} onOpenChange={(open) => { if (!open) setPendingCreateAuditType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new Accident/Incident Audit?</AlertDialogTitle>
            <AlertDialogDescription>
              Beginning a fresh audit clears the current form so you can capture a brand new incident report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCreateAuditType) {
                  handleAuditCardClick(pendingCreateAuditType, { bypassCompletionCheck: true, startFresh: true });
                }
                setPendingCreateAuditType(null);
              }}
            >
              Create New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

          <Dialog
            open={snapshotModalOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseSnapshot();
              }
            }}
          >
            <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {selectedSnapshot
                    ? `${
                        AUDIT_DISPLAY_NAMES[
                          selectedSnapshot.auditType as keyof typeof AUDIT_DISPLAY_NAMES
                        ] || formatFieldLabel(selectedSnapshot.auditType)
                      } Audit`
                    : 'Audit details'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  {selectedMonthLabel
                    ? `Captured in ${selectedMonthLabel}.`
                    : 'Review the saved audit snapshot.'}
                </DialogDescription>
              </DialogHeader>

              {selectedSnapshot ? (
                <ScrollArea className="max-h-[70vh] pr-2">
                  <div className="space-y-6 py-1">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Audit type</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {AUDIT_DISPLAY_NAMES[selectedSnapshot.auditType as keyof typeof AUDIT_DISPLAY_NAMES] ||
                            formatFieldLabel(selectedSnapshot.auditType)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadSnapshotPdf}
                          disabled={pdfDownloading}
                          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                        >
                          {pdfDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          {pdfDownloading ? 'Generating…' : 'Download PDF'}
                        </button>
                      </div>
                    </div>

                    {snapshotSummary.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                          <Info className="h-4 w-4 text-indigo-600" />
                          Snapshot summary
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {snapshotSummary.map(({ label, value }) => (
                            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                              <p className="mt-2 text-sm font-medium text-gray-900">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {snapshotTopLevelDetails.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                          <AlertCircle className="h-4 w-4 text-indigo-600" />
                          Additional details
                        </div>
                        <div className="space-y-3">
                          {snapshotTopLevelDetails.map((detail) => (
                            <div key={detail.label} className="rounded-lg border border-gray-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{detail.label}</p>
                              <div className="mt-2">{renderFieldValue(detail.value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {snapshotResponses.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                          <CheckIcon className="h-4 w-4 text-emerald-600" />
                          Audit responses
                        </div>
                        <div className="space-y-3">
                          {snapshotResponses.map((response) => (
                            <div key={response.key} className="rounded-lg border border-gray-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{response.label}</p>
                              <div className="mt-2">{renderFieldValue(response.value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {snapshotResponses.length === 0 && snapshotTopLevelDetails.length === 0 && snapshotSummary.length === 0 && (
                      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
                        No additional details were stored for this audit snapshot.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-10 text-center text-sm text-gray-500">
                  Select an audit entry to view details.
                </div>
              )}
            </DialogContent>
          </Dialog>

    </div>
  );
}
