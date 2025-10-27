"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import { FileText, Calendar, Target, Users, RefreshCcw, Loader2, Clock, CheckCircle2, AlertCircle, Info } from "lucide-react";
import AdminPageHeader from '@/components/admin/admin-page-header';
import ManagerSearchSelect from "@/components/admin/manager-search-select";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { db } from '@/lib/firebase';
import { workspaceDocPath } from '@/lib/paths';
import { doc, getDoc } from 'firebase/firestore';
import type { Supervision } from "@/types";
import { useToast } from "@/hooks/use-toast";

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

type SupervisionTrackerRecord = Supervision & {
  id: string;
  supervisionDateParsed: Date;
  nextSupervisionDueParsed: Date | null;
  createdAtParsed: Date | null;
  updatedAtParsed: Date | null;
  managerId: string;
  managerName: string;
  workspaceName?: string;
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

const safeParseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
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

const LOCATION_LABELS: Record<Supervision['location'], string> = {
  'in-person': 'In person',
  'virtual': 'Virtual / online',
  'care-home-site': 'Care home site',
};

export default function SupervisionPage() {
  const adminWorkspaces = useAdminWorkspaces();
  const defaultAdminWorkspace = adminWorkspaces && adminWorkspaces.length > 0 ? adminWorkspaces[0] : null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'form' | 'tracker'>('form');

  // Managers and supervision records for tracker
  const [managers, setManagers] = useState<Manager[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SupervisionTrackerRecord | null>(null);
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

  const loadSupervisions = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setTrackerLoading(true);
      const res = await fetch('/api/admin/supervisions');
      if (!isMountedRef.current) return;
      if (!res.ok) {
        setSupervisions([]);
        return;
      }
      const data = await res.json();
      const items = Array.isArray(data?.supervisions)
        ? data.supervisions
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
      setSupervisions(items as Supervision[]);
    } catch (err) {
      console.error('Error loading supervisions', err);
      if (isMountedRef.current) {
        setSupervisions([]);
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
    void loadSupervisions();
  }, [loadSupervisions]);

  const trackerRecords = useMemo(() => {
    if (!supervisions || supervisions.length === 0) {
      return [] as SupervisionTrackerRecord[];
    }
    return supervisions
      .map(record => {
        const supervisionDate = safeParseDate(record.supervisionDate) ?? safeParseDate(record.createdAt) ?? new Date();
        const nextDue = safeParseDate(record.nextSupervisionDue);
        const createdAtParsed = safeParseDate(record.createdAt);
        const updatedAtParsed = safeParseDate(record.updatedAt);
        const id = record.id ?? `${record.managerId}-${supervisionDate.toISOString()}`;
        return {
          ...record,
          id,
          supervisionDateParsed: supervisionDate,
          nextSupervisionDueParsed: nextDue,
          createdAtParsed,
          updatedAtParsed,
        } satisfies SupervisionTrackerRecord;
      })
      .sort((a, b) => b.supervisionDateParsed.getTime() - a.supervisionDateParsed.getTime());
  }, [supervisions]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    trackerRecords.forEach(record => {
      const key = getMonthKeyFromDate(record.supervisionDateParsed);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [trackerRecords]);

  const monthsWithData = useMemo(() => Object.keys(monthCounts).sort(sortMonthKeysDesc), [monthCounts]);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonthKey = useMemo(() => getMonthKeyFromDate(new Date()), []);

  const earliestYear = useMemo(() => {
    if (trackerRecords.length === 0) return null;
    return trackerRecords.reduce((min, record) => Math.min(min, record.supervisionDateParsed.getFullYear()), Number.POSITIVE_INFINITY);
  }, [trackerRecords]);

  const latestYear = useMemo(() => {
    if (trackerRecords.length === 0) return null;
    return trackerRecords.reduce((max, record) => Math.max(max, record.supervisionDateParsed.getFullYear()), Number.NEGATIVE_INFINITY);
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
    const map: Record<string, SupervisionTrackerRecord[]> = {};
    trackerRecords.forEach(record => {
      const key = getMonthKeyFromDate(record.supervisionDateParsed);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(record);
    });
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => b.supervisionDateParsed.getTime() - a.supervisionDateParsed.getTime());
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
  const latestMonthRecord = selectedMonthRecords.length > 0 ? selectedMonthRecords[0] : null;

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
        title: 'Completed supervisions',
        count: statusCounts['completed'] ?? 0,
        description:
          statusCounts['completed'] && statusCounts['completed'] > 0
            ? `${completedManagerCount} manager${completedManagerCount === 1 ? '' : 's'} supervised`
            : 'No completed records yet',
        accentGradient: 'from-emerald-500 to-teal-500',
        iconGradient: 'from-emerald-100 to-teal-100',
        iconColor: 'text-emerald-600',
        icon: CheckCircle2,
      },
      {
        key: 'draft',
        title: 'Draft notes',
        count: statusCounts['draft'] ?? 0,
        description:
          statusCounts['draft'] && statusCounts['draft'] > 0
            ? 'Follow up to complete'
            : 'No drafts saved',
        accentGradient: 'from-amber-500 to-orange-500',
        iconGradient: 'from-amber-100 to-orange-100',
        iconColor: 'text-amber-600',
        icon: AlertCircle,
      },
      {
        key: 'pending',
        title: 'Managers pending',
        count: pendingManagers.length,
        description:
          totalManagers > 0
            ? `${pendingManagers.length} of ${totalManagers} manager${totalManagers === 1 ? '' : 's'} outstanding`
            : 'Managers without a supervision this month',
        accentGradient: 'from-slate-500 to-slate-700',
        iconGradient: 'from-slate-100 to-slate-200',
        iconColor: 'text-slate-700',
        icon: Users,
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
  const [supervisor, setSupervisor] = useState("");
  const [supervisionDate, setSupervisionDate] = useState("");
  const [location, setLocation] = useState("");
  const [nextSupervisionDue, setNextSupervisionDue] = useState("");

  // Section states
  const [previousActions, setPreviousActions] = useState("");
  const [regulatoryCompliance, setRegulatoryCompliance] = useState("");
  const [careQuality, setCareQuality] = useState("");
  const [auditResults, setAuditResults] = useState("");
  const [staffingLevels, setStaffingLevels] = useState("");
  const [occupancyPerformance, setOccupancyPerformance] = useState("");
  const [leadershipSupport, setLeadershipSupport] = useState("");
  const [staffCulture, setStaffCulture] = useState("");
  const [positiveLeadership, setPositiveLeadership] = useState("");
  const [trainingCompleted, setTrainingCompleted] = useState("");
  const [learningNeeds, setLearningNeeds] = useState("");
  const [careerAspirations, setCareerAspirations] = useState("");
  const [workloadManagement, setWorkloadManagement] = useState("");
  const [additionalSupport, setAdditionalSupport] = useState("");
  const [wellbeingConcerns, setWellbeingConcerns] = useState("");
  const [agreedActions, setAgreedActions] = useState("");
  const [superviseeSignature, setSuperviseeSignature] = useState("");
  const [superviseeSignatureDate, setSuperviseeSignatureDate] = useState("");
  const [supervisorSignature, setSupervisorSignature] = useState("");
  const [supervisorSignatureDate, setSupervisorSignatureDate] = useState("");

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setRole('');
    setSupervisor('');
    setSupervisionDate('');
    setLocation('');
    setNextSupervisionDue('');
    setPreviousActions('');
    setRegulatoryCompliance('');
    setCareQuality('');
    setAuditResults('');
    setStaffingLevels('');
    setOccupancyPerformance('');
    setLeadershipSupport('');
    setStaffCulture('');
    setPositiveLeadership('');
    setTrainingCompleted('');
    setLearningNeeds('');
    setCareerAspirations('');
    setWorkloadManagement('');
    setAdditionalSupport('');
    setWellbeingConcerns('');
    setAgreedActions('');
    setSuperviseeSignature('');
    setSuperviseeSignatureDate('');
    setSupervisorSignature('');
    setSupervisorSignatureDate('');
  }, []);

  const prefillSupervisionForManager = useCallback(
    (manager: Manager, monthKey?: string) => {
      setSelectedManager(manager);
      setRole(prev => prev || 'Home Manager');
      if (monthKey) {
        const targetDate = monthKeyToDate(monthKey);
        if (targetDate) {
          setSupervisionDate(targetDate.toISOString().split('T')[0]);
        }
      }
      setActiveTab('form');
    },
    [setActiveTab, setRole, setSelectedManager, setSupervisionDate]
  );

  useEffect(() => {
    if (!managers || managers.length === 0) return;
    const managerId = searchParams?.get?.('managerId');
    const year = searchParams?.get?.('year');
    if (!managerId) return;
    const found = managers.find(m => m.id === managerId || `${m.name}-${m.id}` === managerId || m.name === managerId);
    if (found) {
      prefillSupervisionForManager(found, year ? `${year}-01` : undefined);
    }
  }, [managers, searchParams, prefillSupervisionForManager]);

  const resolveWorkspaceId = useCallback(
    (manager: Manager | null) => manager?.workspaceId ?? defaultAdminWorkspace?.id ?? null,
    [defaultAdminWorkspace?.id]
  );

  const resolveManagerId = (manager: Manager | null) => manager?.id ?? (manager as any)?.managerId ?? null;
  const resolveManagerName = (manager: Manager | null) => manager?.name ?? (manager as any)?.managerName ?? '';

  const handleSaveSupervision = async (status: 'draft' | 'completed') => {
    const resolvedWorkspaceId = resolveWorkspaceId(selectedManager);
    const resolvedManagerId = resolveManagerId(selectedManager);
    const resolvedManagerName = resolveManagerName(selectedManager);

    if (!resolvedManagerId || !resolvedWorkspaceId) {
      toast({
        title: 'Select a supervisee',
        description: 'Choose a manager with a linked workspace before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (!supervisionDate) {
      toast({
        title: 'Session date required',
        description: 'Provide the supervision date to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (!location) {
      toast({
        title: 'Select a location',
        description: 'Choose where the supervision took place.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const supervisionData = {
        workspaceId: resolvedWorkspaceId,
        managerId: resolvedManagerId,
        managerName: resolvedManagerName,
        role,
        supervisor,
        supervisionDate,
        location: location as 'in-person' | 'virtual' | 'care-home-site',
        nextSupervisionDue,
        previousActions,
        regulatoryCompliance,
        careQuality,
        auditResults,
        staffingLevels,
        occupancyPerformance,
        leadershipSupport,
        staffCulture,
        positiveLeadership,
        trainingCompleted,
        learningNeeds,
        careerAspirations,
        workloadManagement,
        additionalSupport,
        wellbeingConcerns,
        agreedActions,
        superviseeSignature,
        superviseeSignatureDate,
        supervisorSignature,
        supervisorSignatureDate,
        status,
        createdBy: 'admin' // TODO: Get from auth context
      };

      const response = await fetch('/api/admin/supervisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supervisionData),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? 'Failed to save supervision');
      }

      await response.json().catch(() => null);
      toast({
        title: status === 'completed' ? 'Supervision completed' : 'Draft saved',
        description: status === 'completed'
          ? 'The supervision record has been stored and added to the tracker.'
          : 'Draft saved. You can return to complete it later.',
      });

      const savedMonthKey = (() => {
        const parsed = safeParseDate(supervisionDate);
        return parsed ? getMonthKeyFromDate(parsed) : null;
      })();

      await loadSupervisions();

      if (savedMonthKey) {
        setSelectedMonthKey(savedMonthKey);
        setSelectedMonthDate(monthKeyToDate(savedMonthKey));
      }

      setActiveTab('tracker');
      resetForm();

    } catch (error) {
      console.error('Error saving supervision:', error);
      toast({
        title: 'Unable to save supervision',
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => handleSaveSupervision('draft');
  const handleCompleteSupervision = () => handleSaveSupervision('completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <>
        <AdminPageHeader
          title="Home Manager Supervision Record"
          subtitle="Regular supervision and development for Home Managers"
          icon={<Users className="w-5 h-5 text-white" />}
        />
      </>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'form' | 'tracker')} className="mt-10 space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:self-start dark:border-slate-700 dark:bg-slate-800">
              <TabsTrigger
                value="form"
                className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-white dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Supervision form
              </TabsTrigger>
              <TabsTrigger
                value="tracker"
                className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-white dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Tracker
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveTab('form')}
              >
                Start supervision
              </Button>
              <Button
                variant="secondary"
                onClick={() => void loadSupervisions()}
                disabled={trackerLoading}
                className="flex items-center gap-2"
              >
                {trackerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh data
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Capture new sessions or review historic activity across your managers from one place.
          </p>

          <TabsContent value="form" className="space-y-6 data-[state=inactive]:hidden">
            <div className="w-full rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 shadow-2xl dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="w-full flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl lg:sticky lg:top-24 lg:mb-0 lg:w-[420px] xl:w-[460px] dark:bg-slate-800 dark:border-slate-700">
                  <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Home Manager Supervision</h3>
                      <p className="text-sm text-slate-500">Document each session and keep follow-up actions visible.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supervisee-name">Supervisee</Label>
                      <ManagerSearchSelect
                        value={selectedManager?.name || ""}
                        workspaceId={defaultAdminWorkspace?.id}
                        organisationId={defaultAdminWorkspace?.organisationId}
                        onChange={manager => {
                          setSelectedManager(manager);
                          if (manager) {
                            setRole(prev => prev || 'Home Manager');
                          } else {
                            setRole('');
                          }
                        }}
                        placeholder="Search for manager..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" placeholder="Role" value={role} onChange={event => setRole(event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="supervisor">Supervisor</Label>
                      <Input id="supervisor" placeholder="Supervisor name & role" value={supervisor} onChange={event => setSupervisor(event.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="supervision-date">Session date</Label>
                        <Input id="supervision-date" type="date" value={supervisionDate} onChange={event => setSupervisionDate(event.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="next-supervision">Next due</Label>
                        <Input id="next-supervision" type="date" value={nextSupervisionDue} onChange={event => setNextSupervisionDue(event.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['in-person', 'virtual', 'care-home-site'] as const).map(option => (
                            <SelectItem key={option} value={option}>
                              {LOCATION_LABELS[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

                <div className="min-w-0 flex-1">
                  <form onSubmit={event => { event.preventDefault(); handleCompleteSupervision(); }} className="space-y-6">
                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">1. Review of previous actions</CardTitle>
                      <CardDescription>Summarise progress since the last supervision.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Textarea
                        placeholder="List actions agreed at last supervision and progress updates"
                        value={previousActions}
                        onChange={event => setPreviousActions(event.target.value)}
                        className="min-h-[100px]"
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">2. Operational performance</CardTitle>
                      <CardDescription>Capture the latest compliance, quality, and business position.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Regulatory compliance (CQC, LA, safeguarding)</Label>
                        <Textarea value={regulatoryCompliance} onChange={event => setRegulatoryCompliance(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Care quality and resident outcomes</Label>
                        <Textarea value={careQuality} onChange={event => setCareQuality(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Audit results, complaints, compliments</Label>
                        <Textarea value={auditResults} onChange={event => setAuditResults(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Staffing levels, recruitment, retention</Label>
                        <Textarea value={staffingLevels} onChange={event => setStaffingLevels(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Occupancy and business performance</Label>
                        <Textarea value={occupancyPerformance} onChange={event => setOccupancyPerformance(event.target.value)} className="min-h-[60px]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">3. Leadership &amp; management</CardTitle>
                      <CardDescription>Reflect on supervision, culture, and leadership impact.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Supporting, supervising, and appraising the team</Label>
                        <Textarea value={leadershipSupport} onChange={event => setLeadershipSupport(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Challenges with staff culture, morale, performance</Label>
                        <Textarea value={staffCulture} onChange={event => setStaffCulture(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Examples of positive leadership since last supervision</Label>
                        <Textarea value={positiveLeadership} onChange={event => setPositiveLeadership(event.target.value)} className="min-h-[60px]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">4. Professional development</CardTitle>
                      <CardDescription>Track learning completed and future growth needs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Training completed since last supervision</Label>
                        <Textarea value={trainingCompleted} onChange={event => setTrainingCompleted(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Learning or leadership development needs</Label>
                        <Textarea value={learningNeeds} onChange={event => setLearningNeeds(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Career aspirations &amp; support required</Label>
                        <Textarea value={careerAspirations} onChange={event => setCareerAspirations(event.target.value)} className="min-h-[60px]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">5. Reflection &amp; wellbeing</CardTitle>
                      <CardDescription>Discuss workload, support requirements, and wellbeing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Managing workload, pressure, responsibilities</Label>
                        <Textarea value={workloadManagement} onChange={event => setWorkloadManagement(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Additional support needed from senior management</Label>
                        <Textarea value={additionalSupport} onChange={event => setAdditionalSupport(event.target.value)} className="min-h-[60px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Wellbeing concerns or reasonable adjustments</Label>
                        <Textarea value={wellbeingConcerns} onChange={event => setWellbeingConcerns(event.target.value)} className="min-h-[60px]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">6. Agreed actions &amp; support</CardTitle>
                      <CardDescription>Define measurable follow-up with responsibilities and timescales.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Textarea value={agreedActions} onChange={event => setAgreedActions(event.target.value)} className="min-h-[100px]" />
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:bg-slate-800 dark:border-slate-700">
                      <CardTitle className="text-lg dark:text-white">7. Signatures</CardTitle>
                      <CardDescription>Confirm the record has been reviewed and agreed.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <Label className="text-sm font-medium">Supervisee signature</Label>
                          <Input value={superviseeSignature} onChange={event => setSuperviseeSignature(event.target.value)} placeholder="Signature" />
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-slate-500">Date</Label>
                            <Input type="date" value={superviseeSignatureDate} onChange={event => setSuperviseeSignatureDate(event.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-sm font-medium">Supervisor signature</Label>
                          <Input value={supervisorSignature} onChange={event => setSupervisorSignature(event.target.value)} placeholder="Signature" />
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-slate-500">Date</Label>
                            <Input type="date" value={supervisorSignatureDate} onChange={event => setSupervisorSignatureDate(event.target.value)} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                        {isSaving ? 'Saving…' : 'Save draft'}
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                        {isSaving ? 'Submitting…' : 'Complete supervision'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6 data-[state=inactive]:hidden">
            <div className="w-full rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 shadow-2xl dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 sm:flex-row sm:items-start sm:justify-between dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl dark:text-white">Supervision tracker</CardTitle>
                    <CardDescription className="text-sm">Monitor monthly coverage across managers.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('form')}>
                    <Target className="mr-2 h-4 w-4" />
                    New supervision
                  </Button>
                  <Button type="button" variant="secondary" className="flex items-center justify-center" onClick={() => void loadSupervisions()} disabled={trackerLoading}>
                    {trackerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {trackerRecords.length === 0 && !trackerLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    No supervisions recorded yet. Capture a session to see it appear here.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      {trackerSummaryCards.map(card => {
                        const Icon = card.icon;
                        return (
                          <div key={card.key} className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-lg dark:border-slate-700 dark:from-slate-800 dark:to-slate-700/60">
                            <div className={`h-1 w-full rounded-full bg-gradient-to-r ${card.accentGradient}`} />
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.title}</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.count}</p>
                              </div>
                              <div className={`rounded-xl bg-gradient-to-br p-2.5 shadow-sm ${card.iconGradient}`}>
                                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                              </div>
                            </div>
                            <p className="text-xs text-slate-500">{card.description}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-6">
                      {availableYears.map(year => {
                        const entries = monthsGroupedByYear[year] ?? [];
                        const isSelectedYear = selectedMonthKey?.startsWith(String(year)) ?? false;
                        const savedMonthsCount = entries.reduce((total, entry) => total + (entry.count > 0 ? 1 : 0), 0);
                        return (
                          <div key={year} className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{year} coverage</h3>
                                <p className="text-sm text-slate-500">Select a month to review saved supervisions.</p>
                              </div>
                              {isSelectedYear ? (
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="flex items-center gap-2 border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50">
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
                              ) : (
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{savedMonthsCount} months saved</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                              {entries.map(entry => {
                                const hasData = entry.count > 0;
                                const isSelected = selectedMonthKey === entry.monthKey;
                                return (
                                  <button
                                    key={entry.monthKey}
                                    type="button"
                                    onClick={() => handleSelectMonth(entry.monthKey)}
                                    className={`rounded-xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                                      hasData ? 'bg-white hover:border-blue-300 hover:shadow-md dark:bg-slate-700 dark:hover:border-blue-400' : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500'
                                    } ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-semibold ${hasData ? 'text-slate-900' : 'text-slate-500'}`}>{MONTH_SHORT_LABELS[entry.monthIndex]}</span>
                                      {hasData ? (
                                        <span className="text-xs font-medium text-blue-600">{entry.count === 1 ? '1 entry' : `${entry.count} entries`}</span>
                                      ) : (
                                        <span className="text-xs">No records</span>
                                      )}
                                    </div>
                                    <div className="mt-3 text-xs text-slate-600">{entry.label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedMonthKey && (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800">
                          <div>
                            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{selectedMonthLabel || 'Month summary'}</h4>
                            <p className="text-sm text-slate-600">{selectedMonthRecordCount} supervision{selectedMonthRecordCount === 1 ? '' : 's'} saved</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              <Clock className="h-3.5 w-3.5" />
                              {selectedMonthRecordCount} recorded
                            </span>
                            <Button type="button" variant="outline" onClick={() => void loadSupervisions()} disabled={trackerLoading}>
                              {trackerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                              Refresh
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/60 to-slate-100/40 p-5 shadow-sm transition hover:border-blue-200 hover:shadow-lg dark:border-slate-700 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-600/40">
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                                <Users className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest supervision</p>
                                <h5 className="text-base font-semibold text-slate-900">{latestMonthRecord?.managerName ?? 'No record saved yet'}</h5>
                                <p className="text-sm text-slate-500">
                                  {latestMonthRecord
                                    ? `${formatDateOnly(latestMonthRecord.supervisionDateParsed)} • ${LOCATION_LABELS[latestMonthRecord.location]}`
                                    : 'Capture your first supervision to populate the tracker.'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {latestMonthRecord?.status ?? 'No status'}
                              </Badge>
                              {latestMonthRecord?.nextSupervisionDueParsed ? (
                                <Badge variant="secondary">Next due {formatDateOnly(latestMonthRecord.nextSupervisionDueParsed)}</Badge>
                              ) : null}
                              {latestMonthRecord ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedRecord(latestMonthRecord)}
                                >
                                  <Info className="mr-2 h-4 w-4" /> View details
                                </Button>
                              ) : (
                                <Button type="button" size="sm" variant="outline" onClick={() => setActiveTab('form')}>
                                  <Target className="mr-2 h-4 w-4" /> New supervision
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex h-full flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-800">
                            <p className="text-sm font-medium text-slate-700">Managers without a supervision this month</p>
                            {pendingManagers.length === 0 ? (
                              <p className="text-sm text-slate-500">Everyone is up to date — great work.</p>
                            ) : (
                              <div className="space-y-2">
                                {pendingManagers.slice(0, 5).map(manager => (
                                  <button
                                    key={manager.id}
                                    type="button"
                                    onClick={() => prefillSupervisionForManager(manager, selectedMonthKey ?? undefined)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm text-slate-600 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                                  >
                                    {manager.name}
                                  </button>
                                ))}
                                {pendingManagers.length > 5 ? (
                                  <p className="text-xs text-slate-500">+{pendingManagers.length - 5} more manager{pendingManagers.length - 5 === 1 ? '' : 's'} to schedule</p>
                                ) : null}
                              </div>
                            )}
                            {pendingManagers.length > 0 ? (
                              <Button type="button" size="sm" variant="secondary" onClick={() => setActiveTab('form')}>
                                <Target className="mr-2 h-4 w-4" /> Schedule supervision
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                          {selectedMonthRecords.length === 0 ? (
                            <div className="p-10 text-center text-sm text-slate-500">No supervisions recorded for this month.</div>
                          ) : (
                            <Table>
                              <TableHeader className="bg-muted/60">
                                <TableRow className="text-xs uppercase tracking-wide">
                                  <TableHead className="w-48">Manager</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="w-40">Session date</TableHead>
                                  <TableHead className="w-40">Next due</TableHead>
                                  <TableHead className="w-32 text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedMonthRecords.map(record => (
                                  <TableRow key={`${record.id}-${record.supervisionDateParsed.toISOString()}`} className="transition-colors hover:bg-muted/40">
                                    <TableCell>
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-900">{record.managerName || 'Unknown manager'}</p>
                                        <p className="text-xs text-slate-500">{record.role || 'Role not set'}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                        {record.status || 'unknown'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-foreground">{formatDateOnly(record.supervisionDateParsed)}</TableCell>
                                    <TableCell className="text-sm text-slate-600">{formatDateOnly(record.nextSupervisionDueParsed)}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedRecord(record)}>
                                          <Info className="mr-2 h-4 w-4" />
                                          View
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            const managerForRecord = managers.find(manager => manager.id === record.managerId);
                                            if (!managerForRecord) return;
                                            prefillSupervisionForManager(managerForRecord, getMonthKeyFromDate(record.supervisionDateParsed));
                                            setSelectedRecord(null);
                                          }}
                                        >
                                          <Target className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
        <Dialog open={!!selectedRecord} onOpenChange={open => setSelectedRecord(open ? selectedRecord : null)}>
          <DialogContent className="flex max-h-[85vh] min-h-[60vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            {selectedRecord ? (
              <>
                <DialogHeader className="border-b px-6 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <DialogTitle className="text-lg font-semibold text-slate-900">{selectedRecord.managerName}</DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        {selectedRecord.role || 'Role not specified'} • {formatDateOnly(selectedRecord.supervisionDateParsed)}
                      </DialogDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={selectedRecord.status === 'completed' ? 'secondary' : 'outline'} className="capitalize">
                        {selectedRecord.status ?? 'unknown'}
                      </Badge>
                      <Badge variant="outline">{LOCATION_LABELS[selectedRecord.location]}</Badge>
                      <Badge variant="outline">{selectedRecord.workspaceName ?? selectedRecord.workspaceId}</Badge>
                      {(() => {
                        const managerForRecord = managers.find(manager => manager.id === selectedRecord.managerId);
                        if (!managerForRecord) return null;
                        return (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              prefillSupervisionForManager(managerForRecord, getMonthKeyFromDate(selectedRecord.supervisionDateParsed));
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
                <ScrollArea className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6 dark:bg-muted/10">
                  <div className="mx-auto w-full max-w-3xl space-y-6 py-6 pr-2">
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Session overview</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Supervisor</p>
                          <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{selectedRecord.supervisor || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Location</p>
                          <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{LOCATION_LABELS[selectedRecord.location]}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Next supervision due</p>
                          <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{formatDateOnly(selectedRecord.nextSupervisionDueParsed)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Recorded on</p>
                          <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{formatDateTime(selectedRecord.createdAtParsed ?? selectedRecord.supervisionDateParsed)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Review of previous actions</h3>
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {selectedRecord.previousActions || '—'}
                      </p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Operational performance</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {[{
                          label: 'Regulatory compliance',
                          value: selectedRecord.regulatoryCompliance,
                        }, {
                          label: 'Care quality & resident outcomes',
                          value: selectedRecord.careQuality,
                        }, {
                          label: 'Audit results, complaints, compliments',
                          value: selectedRecord.auditResults,
                        }, {
                          label: 'Staffing levels, recruitment, retention',
                          value: selectedRecord.staffingLevels,
                        }, {
                          label: 'Occupancy & business performance',
                          value: selectedRecord.occupancyPerformance,
                        }].map(item => (
                          <div key={item.label} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{item.label}</p>
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              {item.value || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Leadership, development & wellbeing</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {[{
                          label: 'Supporting, supervising, appraising the team',
                          value: selectedRecord.leadershipSupport,
                        }, {
                          label: 'Staff culture, morale, performance',
                          value: selectedRecord.staffCulture,
                        }, {
                          label: 'Positive leadership examples',
                          value: selectedRecord.positiveLeadership,
                        }, {
                          label: 'Training completed',
                          value: selectedRecord.trainingCompleted,
                        }, {
                          label: 'Learning & leadership development needs',
                          value: selectedRecord.learningNeeds,
                        }, {
                          label: 'Career aspirations & support required',
                          value: selectedRecord.careerAspirations,
                        }, {
                          label: 'Workload management',
                          value: selectedRecord.workloadManagement,
                        }, {
                          label: 'Additional support required',
                          value: selectedRecord.additionalSupport,
                        }, {
                          label: 'Wellbeing concerns / adjustments',
                          value: selectedRecord.wellbeingConcerns,
                        }].map(item => (
                          <div key={item.label} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{item.label}</p>
                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              {item.value || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Agreed actions</h3>
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {selectedRecord.agreedActions || '—'}
                      </p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Signatures</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Supervisee signature</p>
                          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{selectedRecord.superviseeSignature || '—'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Date: {formatDateOnly(selectedRecord.superviseeSignatureDate)}</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Supervisor signature</p>
                          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{selectedRecord.supervisorSignature || '—'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Date: {formatDateOnly(selectedRecord.supervisorSignatureDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}