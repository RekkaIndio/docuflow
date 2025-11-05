"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { FileText, User, Calendar, Target, Award, TrendingUp, Heart, CheckCircle, CheckCircle2, AlertCircle, Info, RefreshCcw, Loader2, Clock, Plus } from "lucide-react";
import type { Appraisal } from "@/types";
import AdminPageHeader from '@/components/admin/admin-page-header';
import ManagerSearchSelect from "@/components/admin/manager-search-select";
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import Link from "next/link";
import { db } from '@/lib/firebase';
import { workspaceDocPath } from '@/lib/paths';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  workspaceId: string;
  workspaceName: string;
  createdAt?: string;
  updatedAt?: string;
}

type AppraisalTrackerRecord = Appraisal & {
  id: string;
  appraisalDateParsed: Date;
  createdAtParsed: Date | null;
  updatedAtParsed: Date | null;
  managerId: string;
  managerName: string;
  workspaceName?: string;
};

const OVERALL_RATING_LABELS: Record<Appraisal['overallRating'], string> = {
  exceeds: 'Exceeds expectations',
  meets: 'Meets expectations',
  'requires-improvement': 'Requires improvement',
  unsatisfactory: 'Unsatisfactory',
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const getMonthKeyFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const monthLabelFromKey = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split("-");
  const monthIndex = Number(monthPart) - 1;
  if (!yearPart || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }
  return `${MONTH_LABELS[monthIndex]} ${yearPart}`;
};

const monthKeyToDate = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart) - 1;
  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
    return null;
  }
  return new Date(year, month, 1);
};

const getMonthIndex = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return null;
  }
  return year * 12 + (month - 1);
};

const sortMonthKeysDesc = (a: string, b: string) => {
  const aIndex = getMonthIndex(a);
  const bIndex = getMonthIndex(b);
  if (aIndex === null || bIndex === null) {
    return 0;
  }
  return bIndex - aIndex;
};

const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return typeof value === "string" ? value : "—";
  try {
    return parsed.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return parsed.toISOString();
  }
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return typeof value === "string" ? value : "—";
  try {
    return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return parsed.toISOString();
  }
};

const safeParseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export default function AppraisalsPage() {
  const adminWorkspaces = useAdminWorkspaces();
  const defaultAdminWorkspace = adminWorkspaces && adminWorkspaces.length > 0 ? adminWorkspaces[0] : null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'form' | 'tracker'>('form');

  // Managers and appraisals for tracker
  const [managers, setManagers] = useState<Manager[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      if (!defaultAdminWorkspace || !defaultAdminWorkspace.id) {
        if (isMountedRef.current) {
          setManagers([]);
        }
        return;
      }
      const docPath = workspaceDocPath(defaultAdminWorkspace.id, undefined, defaultAdminWorkspace.organisationId);
      const ref = doc(db, docPath);
      const snap = await getDoc(ref);
      if (!isMountedRef.current) return;
      if (!snap.exists()) {
        setManagers([]);
        return;
      }
      const data = snap.data() as any;
      const mgrs = Array.isArray(data?.managers) ? data.managers : [];
      setManagers(mgrs);
    } catch (err) {
      console.error('Error loading managers for tracker', err);
      if (isMountedRef.current) {
        setManagers([]);
      }
    }
  }, [defaultAdminWorkspace]);

  const loadAppraisals = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setTrackerLoading(true);
      const res = await fetch('/api/admin/appraisals');
      if (!isMountedRef.current) return;
      if (!res.ok) {
        setAppraisals([]);
        return;
      }
      const data = await res.json();
      const items = Array.isArray(data?.appraisals)
        ? data.appraisals
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
      setAppraisals(items as Appraisal[]);
    } catch (err) {
      console.error('Error loading appraisals', err);
      if (isMountedRef.current) {
        setAppraisals([]);
      }
    } finally {
      if (isMountedRef.current) {
        setTrackerLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    void loadAppraisals();
  }, [loadAppraisals]);

  // If URL contains managerId & year, prefill the form after managers are loaded
  useEffect(() => {
    if (!managers || managers.length === 0) return;
    const mid = searchParams?.get?.('managerId');
    const year = searchParams?.get?.('year');
    if (!mid) return;
    const found = managers.find(m => m.id === mid || `${m.name}-${m.id}` === mid || `${m.name}` === mid);
    if (found) {
      setSelectedManager(found);
      // set a sensible date for the selected year (Jan 1)
      if (year) {
        setAppraisalDate(`${year}-01-01`);
      }
      setActiveTab('form');
    }
  }, [managers, searchParams]);

  const trackerRecords = useMemo(() => {
    if (!appraisals || appraisals.length === 0) {
      return [] as AppraisalTrackerRecord[];
    }
    return appraisals
      .map(appraisal => {
        const appraisalDate = safeParseDate(appraisal.appraisalDate) ?? safeParseDate(appraisal.createdAt) ?? new Date();
        const createdAtParsed = safeParseDate(appraisal.createdAt);
        const updatedAtParsed = safeParseDate(appraisal.updatedAt);
        const id = appraisal.id ?? `${appraisal.managerId}-${appraisalDate.toISOString()}`;
        return {
          ...appraisal,
          id,
          appraisalDateParsed: appraisalDate,
          createdAtParsed,
          updatedAtParsed,
        } satisfies AppraisalTrackerRecord;
      })
      .sort((a, b) => b.appraisalDateParsed.getTime() - a.appraisalDateParsed.getTime());
  }, [appraisals]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    trackerRecords.forEach(record => {
      const key = getMonthKeyFromDate(record.appraisalDateParsed);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [trackerRecords]);

  const monthsWithData = useMemo(() => Object.keys(monthCounts).sort(sortMonthKeysDesc), [monthCounts]);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonthKey = useMemo(() => getMonthKeyFromDate(new Date()), []);

  const earliestYear = useMemo(() => {
    if (trackerRecords.length === 0) return null;
    return trackerRecords.reduce((min, record) => Math.min(min, record.appraisalDateParsed.getFullYear()), Number.POSITIVE_INFINITY);
  }, [trackerRecords]);

  const latestYear = useMemo(() => {
    if (trackerRecords.length === 0) return null;
    return trackerRecords.reduce((max, record) => Math.max(max, record.appraisalDateParsed.getFullYear()), Number.NEGATIVE_INFINITY);
  }, [trackerRecords]);

  const availableYears = useMemo(() => {
    const startYear = earliestYear !== null ? Math.min(earliestYear, currentYear) : currentYear;
    const endYear = latestYear !== null ? Math.max(latestYear, currentYear) : currentYear;
    const years: number[] = [];
    for (let year = endYear; year >= startYear; year -= 1) {
      years.push(year);
    }
    return years;
  }, [earliestYear, latestYear, currentYear]);

  const monthsGroupedByYear = useMemo(() => {
    const result: Record<number, { monthKey: string; monthIndex: number; label: string; count: number }[]> = {};
    if (availableYears.length === 0) return result;
    availableYears.forEach(year => {
      result[year] = MONTH_LABELS.map((label, index) => {
        const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
        return {
          monthKey,
          monthIndex: index,
          label,
          count: monthCounts[monthKey] ?? 0,
        };
      });
    });
    return result;
  }, [availableYears, monthCounts]);

  const recordsByMonth = useMemo(() => {
    const map: Record<string, AppraisalTrackerRecord[]> = {};
    trackerRecords.forEach(record => {
      const key = getMonthKeyFromDate(record.appraisalDateParsed);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(record);
    });
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => b.appraisalDateParsed.getTime() - a.appraisalDateParsed.getTime());
    });
    return map;
  }, [trackerRecords]);

  useEffect(() => {
    const fallbackKey = monthsWithData[0] ?? currentMonthKey;
    if (!selectedMonthKey && fallbackKey) {
      setSelectedMonthKey(fallbackKey);
      setSelectedMonthDate(monthKeyToDate(fallbackKey));
      return;
    }
    if (selectedMonthKey && trackerRecords.length > 0 && !monthsWithData.includes(selectedMonthKey)) {
      setSelectedMonthKey(fallbackKey);
      setSelectedMonthDate(monthKeyToDate(fallbackKey));
    }
  }, [monthsWithData, selectedMonthKey, trackerRecords.length, currentMonthKey]);

  useEffect(() => {
    if (!selectedMonthKey) return;
    const nextDate = monthKeyToDate(selectedMonthKey);
    setSelectedMonthDate(prev => {
      if (prev && nextDate && prev.getTime() === nextDate.getTime()) {
        return prev;
      }
      return nextDate;
    });
  }, [selectedMonthKey]);

  const selectedMonthRecords = selectedMonthKey ? recordsByMonth[selectedMonthKey] ?? [] : [];
  const selectedMonthLabel = useMemo(() => (selectedMonthKey ? monthLabelFromKey(selectedMonthKey) : null), [selectedMonthKey]);
  const selectedMonthRecordCount = selectedMonthRecords.length;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedMonthRecords.forEach(record => {
      const key = record.status ?? 'unknown';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [selectedMonthRecords]);

  const managersWithRecords = useMemo(() => {
    const set = new Set<string>();
    selectedMonthRecords.forEach(record => {
      if (record.managerId) {
        set.add(record.managerId);
      }
    });
    return set;
  }, [selectedMonthRecords]);

  const pendingManagers = useMemo(() => managers.filter(manager => !managersWithRecords.has(manager.id)), [managers, managersWithRecords]);
  const completedManagerCount = useMemo(() => {
    const set = new Set<string>();
    selectedMonthRecords.forEach(record => {
      if (record.status === 'completed' && record.managerId) {
        set.add(record.managerId);
      }
    });
    return set.size;
  }, [selectedMonthRecords]);

  const trackerSummaryCards = useMemo(() => {
    const totalManagers = managers.length;
    return [
      {
        key: 'completed',
        title: 'Completed appraisals',
        count: statusCounts['completed'] ?? 0,
        description:
          statusCounts['completed'] && statusCounts['completed'] > 0
            ? `${completedManagerCount} manager${completedManagerCount === 1 ? '' : 's'} signed off`
            : 'No completed records yet',
        accentGradient: 'from-emerald-500 to-teal-500',
        iconGradient: 'from-emerald-100 to-teal-100',
        iconColor: 'text-emerald-600',
        icon: CheckCircle2,
      },
      {
        key: 'draft',
        title: 'Draft appraisals',
        count: statusCounts['draft'] ?? 0,
        description:
          statusCounts['draft'] && statusCounts['draft'] > 0
            ? 'Awaiting completion'
            : 'No drafts captured',
        accentGradient: 'from-amber-500 to-orange-500',
        iconGradient: 'from-amber-100 to-orange-100',
        iconColor: 'text-amber-600',
        icon: AlertCircle,
      },
      {
        key: 'pending',
        title: 'Pending managers',
        count: pendingManagers.length,
        description:
          totalManagers > 0
            ? `${pendingManagers.length} of ${totalManagers} manager${totalManagers === 1 ? '' : 's'} outstanding`
            : 'Managers without an appraisal this month',
        accentGradient: 'from-slate-500 to-slate-700',
        iconGradient: 'from-slate-100 to-slate-200',
        iconColor: 'text-slate-700',
        icon: User,
      },
    ];
  }, [completedManagerCount, managers.length, pendingManagers.length, statusCounts]);

  const handleSelectMonth = useCallback((monthKey: string) => {
    setSelectedMonthKey(monthKey);
    setSelectedMonthDate(monthKeyToDate(monthKey));
  }, []);

  const handleDatePickerSelect = useCallback(
    (value?: Date) => {
      if (!value) return;
      const monthKey = getMonthKeyFromDate(value);
      handleSelectMonth(monthKey);
      setDatePickerOpen(false);
    },
    [handleSelectMonth]
  );


  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [role, setRole] = useState("");
  const [appraiser, setAppraiser] = useState("");
  const [appraisalDate, setAppraisalDate] = useState("");
  const [periodCovered, setPeriodCovered] = useState("");
  
  // Previous objectives
  const [previousObjectives, setPreviousObjectives] = useState([
    { objective: "", status: "", comments: "" },
    { objective: "", status: "", comments: "" },
    { objective: "", status: "", comments: "" }
  ]);
  const [previousObjectivesOverallComments, setPreviousObjectivesOverallComments] = useState("");
  
  // Key performance areas
  const [careQualityCompliance, setCareQualityCompliance] = useState("");
  const [leadershipPeopleManagement, setLeadershipPeopleManagement] = useState("");
  const [residentOutcomesEngagement, setResidentOutcomesEngagement] = useState("");
  const [businessOperationalPerformance, setBusinessOperationalPerformance] = useState("");
  
  // Other sections
  const [strengthsAchievements, setStrengthsAchievements] = useState("");
  const [developmentNeeds, setDevelopmentNeeds] = useState("");
  const [nextObjectives, setNextObjectives] = useState(["", "", ""]);
  
  // Career development
  const [trainingCompleted, setTrainingCompleted] = useState("");
  const [trainingRequired, setTrainingRequired] = useState("");
  const [careerAspirations, setCareerAspirations] = useState("");
  
  // Wellbeing
  const [managingDemands, setManagingDemands] = useState("");
  const [seniorManagementSupport, setSeniorManagementSupport] = useState("");
  const [reasonableAdjustments, setReasonableAdjustments] = useState("");
  
  // Overall outcome
  const [overallRating, setOverallRating] = useState("");
  const [summaryCommentsAppraiser, setSummaryCommentsAppraiser] = useState("");
  const [summaryCommentsAppraisee, setSummaryCommentsAppraisee] = useState("");
  
  // Signatures
  const [managerSignature, setManagerSignature] = useState("");
  const [managerSignatureDate, setManagerSignatureDate] = useState("");
  const [appraiserSignature, setAppraiserSignature] = useState("");
  const [appraiserSignatureDate, setAppraiserSignatureDate] = useState("");
  
  // Loading state
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AppraisalTrackerRecord | null>(null);

  const prefillAppraisalForManager = useCallback(
    (manager: Manager, monthKey?: string) => {
      setSelectedManager(manager);
      setRole(prev => prev || 'Home Manager');
      if (monthKey) {
        const targetDate = monthKeyToDate(monthKey);
        if (targetDate) {
          const iso = targetDate.toISOString().split('T')[0];
          setAppraisalDate(iso);
        }
      }
      setActiveTab('form');
      if (manager?.id) {
        try {
          const params = new URLSearchParams({ managerId: manager.id });
          if (monthKey) {
            const [year] = monthKey.split('-');
            if (year) {
              params.set('year', year);
            }
          }
          router.push(`/admin/appraisals?${params.toString()}`);
        } catch (err) {
          // ignore routing errors (e.g. during static export)
          console.warn('Unable to update appraisal URL parameters', err);
        }
      }
    },
    [router, setActiveTab, setAppraisalDate, setRole, setSelectedManager]
  );

  const handleSaveAppraisal = async (status: 'draft' | 'completed') => {
    if (!selectedManager) {
      alert('Please select a manager');
      return;
    }

    setIsSaving(true);
    try {
      const appraisalData = {
        workspaceId: selectedManager.workspaceId,
        managerId: selectedManager.id,
        managerName: selectedManager.name,
        role,
        appraiser,
        appraisalDate,
        periodCovered,
        previousObjectives,
        previousObjectivesOverallComments,
        careQualityCompliance,
        leadershipPeopleManagement,
        residentOutcomesEngagement,
        businessOperationalPerformance,
        strengthsAchievements,
        developmentNeeds,
        nextObjectives,
        trainingCompleted,
        trainingRequired,
        careerAspirations,
        managingDemands,
        seniorManagementSupport,
        reasonableAdjustments,
        overallRating,
        summaryCommentsAppraiser,
        summaryCommentsAppraisee,
        managerSignature,
        managerSignatureDate,
        appraiserSignature,
        appraiserSignatureDate,
        status,
        createdBy: 'admin' // TODO: Get from auth context
      };

      const response = await fetch('/api/admin/appraisals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appraisalData),
      });

      if (!response.ok) {
        throw new Error('Failed to save appraisal');
      }

      const result = await response.json();
      alert(`Appraisal ${status === 'completed' ? 'completed' : 'saved as draft'} successfully!`);
      
    } catch (error) {
      console.error('Error saving appraisal:', error);
      alert('Failed to save appraisal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => handleSaveAppraisal('draft');
  const handleCompleteAppraisal = () => handleSaveAppraisal('completed');
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AdminPageHeader
          title="Home Manager – Annual Appraisal"
          subtitle="Annual review and development for Home Managers"
          icon={<FileText className="w-6 h-6 text-white" />}
        />         
      

        <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
          <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'form' | 'tracker')} className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <TabsTrigger
                value="form"
                className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-white dark:text-slate-300 dark:hover:bg-slate-700"
              >
                New appraisal
              </TabsTrigger>
              <TabsTrigger
                value="tracker"
                className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-white dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Tracker
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setActiveTab('form')}>
                Start appraisal
              </Button>
              <Button
                variant="secondary"
                onClick={() => void loadAppraisals()}
                disabled={trackerLoading}
                className="flex items-center gap-2"
              >
                {trackerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh data
              </Button>
            </div>
          </div>
 
          <TabsContent value="tracker" className="space-y-6 data-[state=inactive]:hidden">
            <div className="grid gap-6 xl:grid-cols-3">
              {trackerSummaryCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-6 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-700/60"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accentGradient}`} />
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl bg-gradient-to-br p-3 shadow-sm ${card.iconGradient}`}>
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                        <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{card.count}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Monthly tracker</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Jump between months to review appraisal activity and drill into records.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Jump to month
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <DatePickerCalendar
                        mode="single"
                        selected={selectedMonthDate ?? undefined}
                        defaultMonth={selectedMonthDate ?? new Date()}
                        onSelect={handleDatePickerSelect}
                        captionLayout="dropdown"
                        fromYear={Math.max(2020, availableYears[availableYears.length - 1] ?? currentYear)}
                        toYear={currentYear + 1}
                        showOutsideDays
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    onClick={() => void loadAppraisals()}
                    disabled={trackerLoading}
                    className="flex items-center gap-2"
                  >
                    {trackerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {availableYears.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700">
                    No appraisal history captured yet. Create a new record to populate this tracker.
                  </div>
                ) : (
                  availableYears.flatMap(year => {
                    const entries = monthsGroupedByYear[year] ?? [];
                    return entries.map(entry => {
                      const hasData = entry.count > 0;
                      const isSelected = selectedMonthKey === entry.monthKey;
                      return (
                        <button
                          key={entry.monthKey}
                          type="button"
                          onClick={() => handleSelectMonth(entry.monthKey)}
                          className={`relative rounded-2xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                            hasData
                              ? 'bg-white hover:border-blue-300 hover:shadow-md dark:bg-slate-700 dark:hover:border-blue-400'
                              : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500'
                          } ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                              {MONTH_SHORT_LABELS[entry.monthIndex]}
                            </span>
                            {hasData ? (
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {entry.count === 1 ? '1 record' : `${entry.count} records`}
                              </span>
                            ) : (
                              <span className="text-xs">No records</span>
                            )}
                          </div>
                          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">{entry.label}</div>
                        </button>
                      );
                    });
                  })
                )}
              </div>

              {selectedMonthKey ? (
                <div className="mt-8 space-y-6">
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-slate-700 dark:bg-slate-800">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{selectedMonthLabel ?? 'Selected month'}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMonthRecordCount} appraisal{selectedMonthRecordCount === 1 ? '' : 's'} recorded</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        <Clock className="h-3.5 w-3.5" />
                        {selectedMonthRecordCount} saved
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => void loadAppraisals()}
                        disabled={trackerLoading}
                        className="flex items-center gap-2"
                      >
                        {trackerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {pendingManagers.length > 0 ? (
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-700">
                      {pendingManagers.length} manager{pendingManagers.length === 1 ? ' is' : 's are'} still outstanding for this month.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {managers.map(manager => {
                      const hasRecord = selectedMonthRecords.some(record => record.managerId === manager.id);
                      const latestRecord = selectedMonthRecords.find(record => record.managerId === manager.id);
                      const status = latestRecord?.status ?? 'pending';
                      const statusBadgeClasses =
                        status === 'completed'
                          ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                          : status === 'draft'
                            ? 'border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900 dark:text-amber-300'
                            : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
                      return (
                        <div
                          key={manager.id}
                          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm transition-all hover:shadow-lg dark:border-slate-700 dark:from-slate-800 dark:to-slate-700/60"
                        >
                          <div className="relative flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-slate-900 dark:text-white">{manager.name}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{manager.workspaceName ?? 'Workspace not set'}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClasses}`}>
                              {status === 'completed' ? 'Completed' : status === 'draft' ? 'Draft' : 'Pending'}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-1 flex-col justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                            {hasRecord && latestRecord ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  Saved {formatDateOnly(latestRecord.appraisalDateParsed)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  Appraiser: {latestRecord.appraiser || '—'}
                                </div>
                              </>
                            ) : (
                              <p>No appraisal captured this month.</p>
                            )}
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                                                  {hasRecord && latestRecord ? (
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => setSelectedRecord(latestRecord)}
                                                      className="flex-1"
                                                    >
                                                      <Info className="mr-2 h-4 w-4" /> View record
                                                    </Button>
                                                  ) : (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">No records yet.</div>
                                                  )}
                            {!hasRecord && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => prefillAppraisalForManager(manager, selectedMonthKey ?? undefined)}
                                className="ml-auto h-9 w-9 rounded-full border border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    {selectedMonthRecords.length === 0 ? (
                      <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No appraisals saved for {selectedMonthLabel ?? 'this month'} yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/60">
                          <TableRow className="text-xs uppercase tracking-wide">
                            <TableHead className="w-48">Manager</TableHead>
                            <TableHead>Summary</TableHead>
                            <TableHead className="w-48">Appraisal date</TableHead>
                            <TableHead className="w-48">Status</TableHead>
                            <TableHead className="w-32 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedMonthRecords.map(record => (
                            <TableRow key={record.id} className="transition-colors hover:bg-muted/40">
                              <TableCell>
                                <div className="flex flex-col text-sm">
                                  <span className="font-semibold text-foreground">{record.managerName}</span>
                                  <span className="text-xs text-slate-500">{record.workspaceName ?? record.workspaceId}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="line-clamp-2">
                                  {record.summaryCommentsAppraiser || record.summaryCommentsAppraisee || record.periodCovered || '—'}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm font-medium text-foreground dark:text-white">{formatDateOnly(record.appraisalDateParsed)}</TableCell>
                              <TableCell>
                                <Badge variant={record.status === 'completed' ? 'secondary' : 'outline'}>{record.status ?? 'unknown'}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => setSelectedRecord(record)}>
                                  View details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="form" className="space-y-6 data-[state=inactive]:hidden">

            <div className="w-full rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 shadow-2xl dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">

              <div className="flex flex-col lg:flex-row gap-10">
              {/* Left panel for details, sticky and NOT part of the form */}
              <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-6 border border-slate-200 shadow-xl mb-8 lg:mb-0 self-start dark:bg-slate-800 dark:border-slate-700">
                <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-160px)] lg:overflow-auto lg:pr-2">
                  <h1 className="text-2xl lg:text-3xl font-extrabold mb-2 text-blue-900 dark:text-blue-100 tracking-tight">Home Manager – Annual Appraisal</h1>
                  <p className="mb-4 text-slate-500 dark:text-slate-400">Annual review and development for Home Managers. Complete all required fields.</p>
                  <div className="space-y-4 mt-4 p-1">
                    <div>
                      <Label htmlFor="employee-name">Employee Name</Label>
                      <ManagerSearchSelect
                        value={selectedManager?.name || ""}
                        workspaceId={defaultAdminWorkspace?.id}
                        organisationId={defaultAdminWorkspace?.organisationId}
                        onChange={(manager) => {
                          setSelectedManager(manager);
                          if (manager) {
                            setRole("Home Manager");
                          } else {
                            setRole("");
                          }
                        }}
                        placeholder="Search for manager..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        placeholder="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="appraiser">Appraiser</Label>
                      <Input
                        id="appraiser"
                        placeholder="Regional Director / Senior Role"
                        value={appraiser}
                        onChange={(e) => setAppraiser(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="appraisal-date">Date of Appraisal</Label>
                      <Input
                        id="appraisal-date"
                        type="date"
                        value={appraisalDate}
                        onChange={(e) => setAppraisalDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="period-covered">Period Covered</Label>
                      <Input
                        id="period-covered"
                        placeholder="From – To"
                        value={periodCovered}
                        onChange={(e) => setPeriodCovered(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main form right column, scrollable */}
              <div className="flex-1 min-w-0 pr-2">
                <form onSubmit={(e) => { e.preventDefault(); handleCompleteAppraisal(); }} className="flex flex-col gap-8">
                  {/* Row 1: Previous Objectives and Key Performance Areas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Review of Previous Year's Objectives */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center dark:bg-green-900">
                            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">1. Previous Objectives</h2>
                            <p className="text-sm text-muted-foreground">Assessment of previous year performance</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-lg dark:bg-slate-700">
                            <div className="space-y-1">
                              <Label className="text-sm">Objective {i}</Label>
                              <Input 
                                placeholder={`Objective ${i}`} 
                                className="h-8"
                                value={previousObjectives[i-1].objective}
                                onChange={(e) => {
                                  const newObjectives = [...previousObjectives];
                                  newObjectives[i-1].objective = e.target.value;
                                  setPreviousObjectives(newObjectives);
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-sm">Status</Label>
                                <Select
                                  value={previousObjectives[i-1].status}
                                  onValueChange={(value) => {
                                    const newObjectives = [...previousObjectives];
                                    newObjectives[i-1].status = value;
                                    setPreviousObjectives(newObjectives);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="achieved">Achieved</SelectItem>
                                    <SelectItem value="partially">Partially</SelectItem>
                                    <SelectItem value="not-achieved">Not Achieved</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-sm">Comments</Label>
                                <Input 
                                  placeholder="Comments" 
                                  className="h-8"
                                  value={previousObjectives[i-1].comments}
                                  onChange={(e) => {
                                    const newObjectives = [...previousObjectives];
                                    newObjectives[i-1].comments = e.target.value;
                                    setPreviousObjectives(newObjectives);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="space-y-2">
                          <Label className="text-sm">Overall Comments</Label>
                          <Textarea 
                            placeholder="Comments on overall performance" 
                            className="min-h-[60px]"
                            value={previousObjectivesOverallComments}
                            onChange={(e) => setPreviousObjectivesOverallComments(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 2. Key Performance Areas */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center dark:bg-purple-900">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">2. Key Performance Areas</h2>
                            <p className="text-sm text-muted-foreground">Assessment across core performance areas</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* a. Care Quality & Compliance */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">a. Care Quality & Compliance</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>CQC inspections, LA monitoring, internal audits</li>
                            <li>Safeguarding management and incident reporting</li>
                            <li>Continuous improvement in care standards</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={careQualityCompliance}
                            onChange={(e) => setCareQualityCompliance(e.target.value)}
                          />
                        </div>

                        {/* b. Leadership & People Management */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">b. Leadership & People Management</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>Staff supervision, appraisal, training compliance</li>
                            <li>Recruitment, retention, absence management</li>
                            <li>Positive team culture and staff wellbeing</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={leadershipPeopleManagement}
                            onChange={(e) => setLeadershipPeopleManagement(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 2: Resident Outcomes and Business Performance */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardContent className="p-4 space-y-4">
                        {/* c. Resident Outcomes & Engagement */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">c. Resident Outcomes & Engagement</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>Resident and family feedback (surveys, compliments)</li>
                            <li>Resident involvement in care planning</li>
                            <li>Promoting dignity, independence, choice</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={residentOutcomesEngagement}
                            onChange={(e) => setResidentOutcomesEngagement(e.target.value)}
                          />
                        </div>

                        {/* d. Business & Operational Performance */}
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm">d. Business & Operational Performance</h3>
                          <ul className="list-disc ml-4 text-xs text-muted-foreground space-y-0.5">
                            <li>Occupancy levels and financial management</li>
                            <li>Budget control and resource use</li>
                            <li>Contribution to organisational goals</li>
                          </ul>
                          <Textarea 
                            placeholder="Comments" 
                            className="min-h-[40px]"
                            value={businessOperationalPerformance}
                            onChange={(e) => setBusinessOperationalPerformance(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 3. Strengths & Achievements */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center dark:bg-yellow-900">
                            <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">3. Strengths & Achievements</h2>
                            <p className="text-sm text-muted-foreground">Notable successes and positive contributions</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <Textarea
                          placeholder="Comments for notable successes, e.g., inspection outcomes, team development, service improvements"
                          className="min-h-[120px]"
                          value={strengthsAchievements}
                          onChange={(e) => setStrengthsAchievements(e.target.value)}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 3: Development Needs and Next Objectives */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 4. Development Needs */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center dark:bg-orange-900">
                            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">4. Development Needs</h2>
                            <p className="text-sm text-muted-foreground">Areas requiring improvement and support</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <Textarea
                          placeholder="Comments areas requiring improvement, training needs, or further support"
                          className="min-h-[100px]"
                          value={developmentNeeds}
                          onChange={(e) => setDevelopmentNeeds(e.target.value)}
                        />
                      </CardContent>
                    </Card>

                    {/* 5. Objectives for the Next 12 Months */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900">
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">5. Next 12 Months Objectives</h2>
                            <p className="text-sm text-muted-foreground">SMART objectives for the coming year</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="space-y-2">
                            <Label className="text-sm">Objective {i} (SMART)</Label>
                            <Input 
                              placeholder="Specific, Measurable, Achievable, Relevant, Time-bound" 
                              className="h-8"
                              value={nextObjectives[i-1]}
                              onChange={(e) => {
                                const newObjectives = [...nextObjectives];
                                newObjectives[i-1] = e.target.value;
                                setNextObjectives(newObjectives);
                              }}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 4: Career Development and Wellbeing */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 6. Career Development & Training */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center dark:bg-indigo-900">
                            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">6. Career Development</h2>
                            <p className="text-sm text-muted-foreground">Training history and future development needs</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Training completed last year</Label>
                          <Textarea 
                            placeholder="Training completed" 
                            className="min-h-[40px]"
                            value={trainingCompleted}
                            onChange={(e) => setTrainingCompleted(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Training required next year</Label>
                          <Textarea 
                            placeholder="Training required" 
                            className="min-h-[40px]"
                            value={trainingRequired}
                            onChange={(e) => setTrainingRequired(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Career progression aspirations</Label>
                          <Textarea 
                            placeholder="Career aspirations" 
                            className="min-h-[40px]"
                            value={careerAspirations}
                            onChange={(e) => setCareerAspirations(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 7. Wellbeing & Support */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center dark:bg-pink-900">
                            <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">7. Wellbeing & Support</h2>
                            <p className="text-sm text-muted-foreground">Personal wellbeing and support requirements</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Managing demands of the role</Label>
                          <Textarea 
                            placeholder="How are you managing the demands?" 
                            className="min-h-[40px]"
                            value={managingDemands}
                            onChange={(e) => setManagingDemands(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Support from senior management</Label>
                          <Textarea 
                            placeholder="Support required" 
                            className="min-h-[40px]"
                            value={seniorManagementSupport}
                            onChange={(e) => setSeniorManagementSupport(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Reasonable adjustments needed</Label>
                          <Textarea 
                            placeholder="Any adjustments needed" 
                            className="min-h-[40px]"
                            value={reasonableAdjustments}
                            onChange={(e) => setReasonableAdjustments(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 5: Overall Outcome and Signatures */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 8. Overall Appraisal Outcome */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center dark:bg-green-900">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">8. Overall Outcome</h2>
                            <p className="text-sm text-muted-foreground">Final assessment and recommendations</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm">Overall Rating</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Exceeds Expectations", value: "exceeds" },
                              { label: "Meets Expectations", value: "meets" },
                              { label: "Requires Improvement", value: "requires-improvement" },
                              { label: "Unsatisfactory", value: "unsatisfactory" }
                            ].map((option) => (
                              <div key={option.value} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={option.value}
                                  checked={overallRating === option.value}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setOverallRating(option.value);
                                    } else {
                                      setOverallRating("");
                                    }
                                  }}
                                />
                                <Label htmlFor={option.value} className="text-xs">{option.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Summary Comments (Appraiser)</Label>
                            <Textarea 
                              placeholder="Appraiser comments" 
                              className="min-h-[60px]"
                              value={summaryCommentsAppraiser}
                              onChange={(e) => setSummaryCommentsAppraiser(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Summary Comments (Appraisee)</Label>
                            <Textarea 
                              placeholder="Appraisee comments" 
                              className="min-h-[60px]"
                              value={summaryCommentsAppraisee}
                              onChange={(e) => setSummaryCommentsAppraisee(e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Signatures */}
                    <Card className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b dark:from-slate-700 dark:to-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-700">
                            <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">Signatures</h2>
                            <p className="text-sm text-muted-foreground">Formal approval and agreement</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-3">
                            <Label className="text-base font-medium">Manager (Appraisee)</Label>
                            <Input 
                              placeholder="Signature" 
                              className="h-8"
                              value={managerSignature}
                              onChange={(e) => setManagerSignature(e.target.value)}
                            />
                            <div className="space-y-2">
                              <Label className="text-sm">Date</Label>
                              <Input 
                                type="date" 
                                className="h-8"
                                value={managerSignatureDate}
                                onChange={(e) => setManagerSignatureDate(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-base font-medium">Regional Director (Appraiser)</Label>
                            <Input 
                              placeholder="Signature" 
                              className="h-8"
                              value={appraiserSignature}
                              onChange={(e) => setAppraiserSignature(e.target.value)}
                            />
                            <div className="space-y-2">
                              <Label className="text-sm">Date</Label>
                              <Input 
                                type="date" 
                                className="h-8"
                                value={appraiserSignatureDate}
                                onChange={(e) => setAppraiserSignatureDate(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700" 
                      onClick={handleCompleteAppraisal}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Completing...' : 'Complete Appraisal'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={open => setSelectedRecord(open ? selectedRecord : null)}>
    <DialogContent className="flex max-h-[85vh] min-h-[60vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      {selectedRecord ? (
        <>
          <DialogHeader className="border-b px-6 py-4 dark:border-slate-600">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {selectedRecord.managerName}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedRecord.role || 'Role not specified'} • {formatDateOnly(selectedRecord.appraisalDateParsed)}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedRecord.status === 'completed' ? 'secondary' : 'outline'} className="capitalize">
                  {selectedRecord.status ?? 'unknown'}
                </Badge>
                <Badge variant="outline">{OVERALL_RATING_LABELS[selectedRecord.overallRating] ?? 'Rating not set'}</Badge>
                {(() => {
                  const managerForRecord = managers.find(manager => manager.id === selectedRecord.managerId);
                  if (!managerForRecord) return null;
                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        prefillAppraisalForManager(managerForRecord, getMonthKeyFromDate(selectedRecord.appraisalDateParsed));
                        setSelectedRecord(null);
                      }}
                    >
                      Prefill form
                    </Button>
                  );
                })()}
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6 dark:bg-slate-900/20">
            <div className="mx-auto w-full max-w-3xl space-y-6 py-6 pr-2">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Overview</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Appraiser</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600">{selectedRecord.appraiser || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Workspace</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600">{selectedRecord.workspaceName ?? selectedRecord.workspaceId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Period covered</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600">{selectedRecord.periodCovered || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Recorded on</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600">{formatDateTime(selectedRecord.createdAtParsed ?? selectedRecord.appraisalDateParsed)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Summary comments (appraiser)</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.summaryCommentsAppraiser || '—'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Summary comments (appraisee)</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.summaryCommentsAppraisee || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Performance insights</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'Care quality & compliance', value: selectedRecord.careQualityCompliance },
                    { label: 'Leadership & people management', value: selectedRecord.leadershipPeopleManagement },
                    { label: 'Resident outcomes & engagement', value: selectedRecord.residentOutcomesEngagement },
                    { label: 'Business & operational performance', value: selectedRecord.businessOperationalPerformance },
                  ].map(item => (
                    <div key={item.label} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{item.label}</p>
                      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                        {item.value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Objectives & development</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Previous objectives</p>
                    <div className="mt-3 space-y-3">
                      {(selectedRecord.previousObjectives ?? []).map((objective, index) => (
                        <div key={`${objective.objective}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:bg-slate-800 dark:border-slate-600">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Objective {index + 1}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status: {objective.status || '—'}</p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{objective.objective || '—'}</p>
                          {objective.comments ? (
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Comments: {objective.comments}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {selectedRecord.previousObjectivesOverallComments || 'No overall comments recorded.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Objectives for next 12 months</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                      {(selectedRecord.nextObjectives ?? []).filter(obj => obj && obj.trim().length > 0).map((obj, index) => (
                        <li key={`${obj}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2">
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Strengths & achievements</p>
                      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                        {selectedRecord.strengthsAchievements || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Development needs</p>
                      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                        {selectedRecord.developmentNeeds || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Career development & wellbeing</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Training completed</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.trainingCompleted || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Training required</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.trainingRequired || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Career aspirations</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.careerAspirations || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Managing role demands</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.managingDemands || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Senior management support</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.seniorManagementSupport || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Reasonable adjustments</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 whitespace-pre-line">
                      {selectedRecord.reasonableAdjustments || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Signatures & acknowledgement</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Manager signature</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600">{selectedRecord.managerSignature || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateOnly(selectedRecord.managerSignatureDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Appraiser signature</p>
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600">{selectedRecord.appraiserSignature || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateOnly(selectedRecord.appraiserSignatureDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </>
      ) : null}
    </DialogContent>
  </Dialog>
    </>
  );
}
