'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { ChevronRight, ShieldAlert, Loader2, PlusCircle, RefreshCw, Save, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath } from '@/lib/paths';
import { generateSafeguardingLogPdf, getSafeguardingLogPdfFilename } from '@/lib/safeguarding-log-pdf';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { addSovaLogEntry, updateSovaLogEntry } from '@/actions/cqc-logs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const YES_VALUE = 'yes';
const NO_VALUE = 'no';
const NA_VALUE = 'na';
const NO_LINK_VALUE = '__none__';

const normaliseDateValue = (value?: string | Date | null) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const buildSearchTokens = (...parts: Array<string | number | null | undefined>) => {
  return parts
    .map((part) => (part ?? '').toString().trim().toLowerCase())
    .filter((part) => part.length > 0)
    .join(' ');
};

type YesNoValue = typeof YES_VALUE | typeof NO_VALUE | typeof NA_VALUE;

type SovaFormState = {
  residentName: string;
  incidentDate: string;
  dateSovaRaised: string;
  incidentDetails: string;
  dutyOfCandourUpheld: YesNoValue;
  investigationComplete: YesNoValue;
  cqcNotificationSubmitted: YesNoValue;
  lessonsLearntComplete: YesNoValue;
  rootCauseAnalysisComplete: YesNoValue;
  outcome: string;
  dateClosed: string;
  lessonsLearntRecordId: string | null;
  rootCauseAnalysisRecordId: string | null;
  linkedCqcLogId: string | null;
};

type SovaLogRecord = {
  id: string;
  runningLogNumber: number;
  residentName: string;
  incidentDate?: string;
  dateSovaRaised?: string;
  incidentDetails?: string;
  dutyOfCandourUpheld: boolean | null;
  investigationComplete: boolean | null;
  cqcNotificationSubmitted: boolean | null;
  lessonsLearntComplete: boolean | null;
  rootCauseAnalysisComplete: boolean | null;
  outcome?: string;
  dateClosed?: string;
  createdAt?: string | null;
  lessonsLearntRecordId?: string | null;
  rootCauseAnalysisRecordId?: string | null;
  linkedCqcLogId?: string | null;
};

type LessonsRecordSummary = {
  id: string;
  label: string;
  dateLabel?: string;
  dateValue?: string;
  reference?: string;
  searchTokens: string;
};

type RcaRecordSummary = {
  id: string;
  label: string;
  dateLabel?: string;
  dateValue?: string;
  reference?: string;
  searchTokens: string;
};

type CqcLogSummary = {
  id: string;
  runningLogNumber: number;
  residentName: string;
  incidentDate?: string;
  dateValue?: string;
  reference?: string;
  searchTokens: string;
};

type LessonsRecordDetail = {
  id: string;
  form?: Record<string, any>;
  actions?: Array<{ action: string; owner: string; timescale: string; status: string }>;
  createdAt?: string | null;
  recordType?: string;
};

type RcaRecordDetail = {
  id: string;
  form?: Record<string, any>;
  actions?: Array<{ action: string; owner: string; timescale: string; status: string }>;
  createdAt?: string | null;
  recordType?: string;
};

type CqcLogDetail = CqcLogSummary & {
  uniqueReferenceNumber?: string;
  cqcNotificationDate?: string;
  incidentDetails?: string;
  dutyOfCandourUpheld?: boolean | null;
  investigationComplete?: boolean | null;
  lessonsLearntComplete?: boolean | null;
  rootCauseAnalysisComplete?: boolean | null;
  sovaCompleted?: boolean | null;
  outcome?: string;
  dateClosed?: string;
  createdAt?: string | null;
};

type PickerType = 'lessons' | 'rca' | 'cqc';

type PickerOption = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  dateValue?: string;
  reference?: string;
  tokens: string;
};

const createSovaFormState = (): SovaFormState => ({
  residentName: '',
  incidentDate: '',
  dateSovaRaised: '',
  incidentDetails: '',
  dutyOfCandourUpheld: NA_VALUE,
  investigationComplete: NA_VALUE,
  cqcNotificationSubmitted: NA_VALUE,
  lessonsLearntComplete: NA_VALUE,
  rootCauseAnalysisComplete: NA_VALUE,
  outcome: '',
  dateClosed: '',
  lessonsLearntRecordId: null,
  rootCauseAnalysisRecordId: null,
  linkedCqcLogId: null,
});

const yesNoToTriState = (value: YesNoValue): boolean | null => {
  if (value === YES_VALUE) return true;
  if (value === NO_VALUE) return false;
  return null;
};

const triStateToYesNo = (value: boolean | null | undefined): YesNoValue => {
  if (value === true) return YES_VALUE;
  if (value === false) return NO_VALUE;
  return NA_VALUE;
};

const mapSovaRecordToFormState = (entry: SovaLogRecord): SovaFormState => ({
  residentName: entry.residentName ?? '',
  incidentDate: entry.incidentDate ?? '',
  dateSovaRaised: entry.dateSovaRaised ?? '',
  incidentDetails: entry.incidentDetails ?? '',
  dutyOfCandourUpheld: triStateToYesNo(entry.dutyOfCandourUpheld),
  investigationComplete: triStateToYesNo(entry.investigationComplete),
  cqcNotificationSubmitted: triStateToYesNo(entry.cqcNotificationSubmitted),
  lessonsLearntComplete: triStateToYesNo(entry.lessonsLearntComplete),
  rootCauseAnalysisComplete: triStateToYesNo(entry.rootCauseAnalysisComplete),
  outcome: entry.outcome ?? '',
  dateClosed: entry.dateClosed ?? '',
  lessonsLearntRecordId: entry.lessonsLearntRecordId ?? null,
  rootCauseAnalysisRecordId: entry.rootCauseAnalysisRecordId ?? null,
  linkedCqcLogId: entry.linkedCqcLogId ?? null,
});

const safeFormatDate = (value?: string) => {
  if (!value) return '—';
  try {
    const parsed = parseISO(value);
    return format(parsed, 'dd MMM yyyy');
  } catch (err) {
    const fallback = new Date(value);
    if (!Number.isNaN(fallback.getTime())) {
      return format(fallback, 'dd MMM yyyy');
    }
    return value;
  }
};

const safeFormatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    const parsed = parseISO(value);
    return format(parsed, 'dd MMM yyyy • HH:mm');
  } catch (err) {
    const fallback = new Date(value);
    if (!Number.isNaN(fallback.getTime())) {
      return format(fallback, 'dd MMM yyyy • HH:mm');
    }
    return value;
  }
};

function YesNoBadge({ value }: { value: boolean | null | undefined }) {
  if (value === true) {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90 border-transparent">Yes</Badge>
    );
  }
  if (value === false) {
    return (
      <Badge className="border-slate-300 text-slate-600 hover:bg-slate-100">No</Badge>
    );
  }
  return (
    <Badge className="border border-dashed border-slate-300 bg-white text-slate-500">N/A</Badge>
  );
}

type YesNoSelectFieldProps = {
  id: string;
  label: string;
  value: YesNoValue;
  onChange: (value: YesNoValue) => void;
};

function YesNoSelectField({ id, label, value, onChange }: YesNoSelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(val) => onChange(val as YesNoValue)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={YES_VALUE}>Yes</SelectItem>
          <SelectItem value={NO_VALUE}>No</SelectItem>
          <SelectItem value={NA_VALUE}>N/A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0);

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm text-slate-900 whitespace-pre-line">
        {isEmpty ? '—' : value}
      </div>
    </div>
  );
}

function CardField({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0);

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm font-medium text-slate-800">
        {isEmpty ? '—' : value}
      </div>
    </div>
  );
}

function CardSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-3 ${className ?? ''}`.trim()}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function ActionsList({
  actions,
}: {
  actions?: Array<{ action: string; owner: string; timescale: string; status: string }>;
}) {
  if (!actions || actions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white/50 p-4 text-sm text-slate-500">
        No actions recorded.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map((item, index) => (
        <div key={`${item.action}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">{item.action || 'Action item'}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-wide text-slate-400">Owner</p>
              <p className="text-slate-700">{item.owner || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-wide text-slate-400">Timescale</p>
              <p className="text-slate-700">{item.timescale || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <p className="text-slate-700">{item.status || '—'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
      {children}
    </div>
  );
}

export default function SafeguardingLogsPage() {
  const workspace = useWorkspace();
  const workspaceId = workspace?.id ?? '';
  const organisationId = workspace?.organisationId ?? null;

  const { user } = useAuth();
  const { toast } = useToast();

  const [sovaForm, setSovaForm] = useState<SovaFormState>(() => createSovaFormState());
  const [sovaEntries, setSovaEntries] = useState<SovaLogRecord[]>([]);
  const [sovaLoading, setSovaLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SovaLogRecord | null>(null);
  const [editingEntry, setEditingEntry] = useState<SovaLogRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [lessonsRecords, setLessonsRecords] = useState<LessonsRecordSummary[]>([]);
  const [rcaRecords, setRcaRecords] = useState<RcaRecordSummary[]>([]);
  const [cqcSummaries, setCqcSummaries] = useState<CqcLogSummary[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  // status filters for history view
  const [filterCqcAcknowledgement, setFilterCqcAcknowledgement] = useState(false);
  const [filterDutyOfCandour, setFilterDutyOfCandour] = useState(false);
  const [filterInvestigationComplete, setFilterInvestigationComplete] = useState(false);
  const [filterLessonsLearntComplete, setFilterLessonsLearntComplete] = useState(false);
  const [filterRcaComplete, setFilterRcaComplete] = useState(false);
  const [filterSovaCompleted, setFilterSovaCompleted] = useState(false);
  const [lessonsDetail, setLessonsDetail] = useState<LessonsRecordDetail | null>(null);
  const [lessonsDetailLoading, setLessonsDetailLoading] = useState(false);
  const [rcaDetail, setRcaDetail] = useState<RcaRecordDetail | null>(null);
  const [rcaDetailLoading, setRcaDetailLoading] = useState(false);
  const [cqcDetail, setCqcDetail] = useState<CqcLogDetail | null>(null);
  const [cqcDetailLoading, setCqcDetailLoading] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerReference, setPickerReference] = useState('');
  const [pickerDateFrom, setPickerDateFrom] = useState('');
  const [pickerDateTo, setPickerDateTo] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const openPicker = useCallback((type: PickerType) => {
    setActivePicker(type);
    setPickerSearch('');
    setPickerReference('');
    setPickerDateFrom('');
    setPickerDateTo('');
  }, []);

  const closePicker = useCallback(() => {
    setActivePicker(null);
    setPickerSearch('');
    setPickerReference('');
    setPickerDateFrom('');
    setPickerDateTo('');
  }, []);

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setSovaForm(() => createSovaFormState());
  };

  const [isAddingSova, startAddSova] = useTransition();

  const isWorkspaceSelected = Boolean(workspaceId);

  const lessonsRecordMap = useMemo(() => {
    const map = new Map<string, LessonsRecordSummary>();
    lessonsRecords.forEach((record) => {
      map.set(record.id, record);
    });
    return map;
  }, [lessonsRecords]);

  const rcaRecordMap = useMemo(() => {
    const map = new Map<string, RcaRecordSummary>();
    rcaRecords.forEach((record) => {
      map.set(record.id, record);
    });
    return map;
  }, [rcaRecords]);

  const cqcRecordMap = useMemo(() => {
    const map = new Map<string, CqcLogSummary>();
    cqcSummaries.forEach((record) => {
      map.set(record.id, record);
    });
    return map;
  }, [cqcSummaries]);

  const downloadSovaPdf = useCallback(async () => {
    if (!selectedEntry) {
      toast({
        title: 'Select a record first',
        description: 'Choose a safeguarding record to export before downloading the PDF.',
      });
      return;
    }

    if (lessonsDetailLoading || rcaDetailLoading || cqcDetailLoading) {
      toast({
        title: 'Still loading linked records',
        description: 'Please wait for the linked tabs to finish loading before exporting.',
      });
      return;
    }

    setIsExportingPdf(true);
    try {
      const lessonsLabel = selectedEntry.lessonsLearntRecordId
        ? lessonsRecordMap.get(selectedEntry.lessonsLearntRecordId)?.label ?? `Record ${selectedEntry.lessonsLearntRecordId}`
        : null;
      const rcaLabel = selectedEntry.rootCauseAnalysisRecordId
        ? rcaRecordMap.get(selectedEntry.rootCauseAnalysisRecordId)?.label ?? `Record ${selectedEntry.rootCauseAnalysisRecordId}`
        : null;
      const cqcSummary = selectedEntry.linkedCqcLogId ? cqcRecordMap.get(selectedEntry.linkedCqcLogId) : null;
      const cqcLabel = cqcSummary
        ? `CQC log #${cqcSummary.runningLogNumber}${cqcSummary.residentName ? ` • ${cqcSummary.residentName}` : ''}`
        : selectedEntry.linkedCqcLogId
        ? `CQC log ${selectedEntry.linkedCqcLogId}`
        : null;

      const pdfData = generateSafeguardingLogPdf({
        workspaceName: workspace?.name ?? 'Workspace',
        generatedBy: user?.name ?? user?.email ?? undefined,
        entry: {
          runningLogNumber: selectedEntry.runningLogNumber,
          residentName: selectedEntry.residentName,
          incidentDate: selectedEntry.incidentDate ?? null,
          dateSovaRaised: selectedEntry.dateSovaRaised ?? null,
          dateClosed: selectedEntry.dateClosed ?? null,
          createdAt: selectedEntry.createdAt ?? null,
          dutyOfCandourUpheld: selectedEntry.dutyOfCandourUpheld ?? null,
          investigationComplete: selectedEntry.investigationComplete ?? null,
          cqcNotificationSubmitted: selectedEntry.cqcNotificationSubmitted ?? null,
          lessonsLearntComplete: selectedEntry.lessonsLearntComplete ?? null,
          rootCauseAnalysisComplete: selectedEntry.rootCauseAnalysisComplete ?? null,
          incidentDetails: selectedEntry.incidentDetails ?? null,
          outcome: selectedEntry.outcome ?? null,
          lessonsLearntRecordLabel: lessonsLabel,
          rootCauseAnalysisRecordLabel: rcaLabel,
          cqcLogLabel: cqcLabel,
        },
        lessonsRecord: lessonsDetail ?? undefined,
        rcaRecord: rcaDetail ?? undefined,
        linkedCqcRecord: cqcDetail ?? undefined,
      });

      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getSafeguardingLogPdfFilename(
        workspace?.name ?? 'workspace',
        selectedEntry.runningLogNumber,
        selectedEntry.residentName
      );
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to generate safeguarding PDF', error);
      toast({
        title: 'Could not export PDF',
        description: 'Something went wrong while preparing the safeguarding report.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    cqcDetail,
    cqcDetailLoading,
    cqcRecordMap,
    lessonsDetail,
    lessonsDetailLoading,
    lessonsRecordMap,
    rcaDetail,
    rcaDetailLoading,
    rcaRecordMap,
    selectedEntry,
    toast,
    user?.email,
    user?.name,
    workspace?.name,
  ]);

  const loadSovaLogs = useCallback(async () => {
    if (!workspaceId) {
      setSovaEntries([]);
      setSovaLoading(false);
      return;
    }
    const path = workspaceCollectionPath(workspaceId, 'sova-log', organisationId ?? undefined);
    if (!path) {
      setSovaEntries([]);
      setSovaLoading(false);
      return;
    }

    setSovaLoading(true);
    try {
      const sovaQuery = query(collection(db, path), orderBy('runningLogNumber', 'asc'));
      const snapshot = await getDocs(sovaQuery);
      const records: SovaLogRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt = (data.createdAt as any)?.toDate?.();
        return {
          id: docSnap.id,
          runningLogNumber: Number(data.runningLogNumber ?? 0),
          residentName: data.residentName ?? '',
          incidentDate: data.incidentDate ?? '',
          dateSovaRaised: data.dateSovaRaised ?? '',
          incidentDetails: data.incidentDetails ?? '',
          dutyOfCandourUpheld: data.dutyOfCandourUpheld ?? null,
          investigationComplete: data.investigationComplete ?? null,
          cqcNotificationSubmitted: data.cqcNotificationSubmitted ?? null,
          lessonsLearntComplete: data.lessonsLearntComplete ?? null,
          rootCauseAnalysisComplete: data.rootCauseAnalysisComplete ?? null,
          outcome: data.outcome ?? '',
          dateClosed: data.dateClosed ?? '',
          createdAt: createdAt ? createdAt.toISOString() : null,
          lessonsLearntRecordId: data.lessonsLearntRecordId ?? null,
          rootCauseAnalysisRecordId: data.rootCauseAnalysisRecordId ?? null,
          linkedCqcLogId: data.linkedCqcLogId ?? null,
        };
      });
      setSovaEntries(records);
    } catch (error) {
      console.error('Failed to load SOVA logs', error);
      toast({ title: 'Unable to load SOVA log entries', description: 'Please try again shortly.', variant: 'destructive' });
    } finally {
      setSovaLoading(false);
    }
  }, [workspaceId, organisationId, toast]);

  const loadLessonsRecords = useCallback(async () => {
    if (!workspaceId) {
      setLessonsRecords([]);
      return;
    }
    const path = workspaceCollectionPath(workspaceId, 'lessons-learned', organisationId ?? undefined);
    if (!path) {
      setLessonsRecords([]);
      return;
    }

    try {
      const lessonsQuery = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(lessonsQuery);
      const records: LessonsRecordSummary[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const form = (data.form ?? {}) as Record<string, any>;
        const createdAt = (data.createdAt as any)?.toDate?.();
        const primaryTitle = form.eventType || form.description || form.summary || 'Lessons record';
        const secondary = form.location || form.peopleInvolved;
        const label = [primaryTitle, secondary].filter(Boolean).join(' • ') || `Lessons record ${docSnap.id.slice(-6)}`;
        const primaryDate = form.date || (createdAt ? createdAt.toISOString() : undefined);
        const reference = form.referenceNumber || form.reference || data.referenceNumber || '';
        const dateValue = normaliseDateValue(primaryDate);
        return {
          id: docSnap.id,
          label,
          dateLabel: primaryDate ? safeFormatDate(primaryDate) : undefined,
          dateValue,
          reference: reference || undefined,
          searchTokens: buildSearchTokens(
            label,
            primaryTitle,
            secondary,
            reference,
            form.peopleInvolved,
            form.location,
            docSnap.id,
            dateValue,
          ),
        };
      });
      setLessonsRecords(records);
    } catch (error) {
      console.error('Failed to load lessons learned records', error);
      setLessonsRecords([]);
    }
  }, [workspaceId, organisationId]);

  const loadRcaRecords = useCallback(async () => {
    if (!workspaceId) {
      setRcaRecords([]);
      return;
    }
    const path = workspaceCollectionPath(workspaceId, 'rca-records', organisationId ?? undefined);
    if (!path) {
      setRcaRecords([]);
      return;
    }

    try {
      const rcaQuery = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(rcaQuery);
      const records: RcaRecordSummary[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const form = (data.form ?? {}) as Record<string, any>;
        const createdAt = (data.createdAt as any)?.toDate?.();
        const primaryTitle = form.eventType || form.summary || 'RCA record';
        const secondary = form.location || form.peopleInvolved;
        const label = [primaryTitle, secondary].filter(Boolean).join(' • ') || `RCA record ${docSnap.id.slice(-6)}`;
        const primaryDate = form.date || (createdAt ? createdAt.toISOString() : undefined);
        const reference = form.referenceNumber || form.reference || data.referenceNumber || '';
        const dateValue = normaliseDateValue(primaryDate);
        return {
          id: docSnap.id,
          label,
          dateLabel: primaryDate ? safeFormatDate(primaryDate) : undefined,
          dateValue,
          reference: reference || undefined,
          searchTokens: buildSearchTokens(
            label,
            primaryTitle,
            secondary,
            reference,
            form.peopleInvolved,
            form.location,
            docSnap.id,
            dateValue,
          ),
        };
      });
      setRcaRecords(records);
    } catch (error) {
      console.error('Failed to load RCA records', error);
      setRcaRecords([]);
    }
  }, [workspaceId, organisationId]);

  const loadCqcSummaries = useCallback(async () => {
    if (!workspaceId) {
      setCqcSummaries([]);
      return;
    }
    const path = workspaceCollectionPath(workspaceId, 'cqc-log', organisationId ?? undefined);
    if (!path) {
      setCqcSummaries([]);
      return;
    }

    try {
      const cqcQuery = query(collection(db, path), orderBy('runningLogNumber', 'asc'));
      const snapshot = await getDocs(cqcQuery);
      const records: CqcLogSummary[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const incidentDate = data.incidentDate ?? '';
        const dateValue = normaliseDateValue(incidentDate);
        const runningLogNumber = Number(data.runningLogNumber ?? 0);
        const referenceCandidate = data.uniqueReferenceNumber || data.referenceNumber;
        const reference = referenceCandidate || (runningLogNumber ? String(runningLogNumber) : '');
        return {
          id: docSnap.id,
          runningLogNumber,
          residentName: data.residentName ?? 'Unknown resident',
          incidentDate,
          dateValue,
          reference: reference || undefined,
          searchTokens: buildSearchTokens(
            `cqc #${runningLogNumber}`,
            data.residentName,
            incidentDate,
            reference,
            docSnap.id,
            dateValue,
          ),
        };
      });
      setCqcSummaries(records);
    } catch (error) {
      console.error('Failed to load CQC log summaries', error);
      setCqcSummaries([]);
    }
  }, [workspaceId, organisationId]);

  useEffect(() => {
    loadSovaLogs();
  }, [loadSovaLogs]);

  useEffect(() => {
    loadLessonsRecords();
    loadRcaRecords();
    loadCqcSummaries();
  }, [loadLessonsRecords, loadRcaRecords, loadCqcSummaries]);

  const nextSovaNumber = useMemo(() => {
    return sovaEntries.reduce((max, entry) => Math.max(max, entry.runningLogNumber || 0), 0) + 1;
  }, [sovaEntries]);

  const filteredSovaEntries = useMemo(() => {
    const anyStatusFilter = filterCqcAcknowledgement || filterDutyOfCandour || filterInvestigationComplete || filterLessonsLearntComplete || filterRcaComplete || filterSovaCompleted;
    if (!historyStartDate && !historyEndDate && !anyStatusFilter) {
      return sovaEntries;
    }

    const start = historyStartDate ? new Date(historyStartDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = historyEndDate ? new Date(historyEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const toComparableTimestamp = (entry: SovaLogRecord) => {
      const candidates = [entry.incidentDate, entry.dateSovaRaised, entry.dateClosed, entry.createdAt];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const timestamp = Date.parse(candidate);
        if (!Number.isNaN(timestamp)) {
          return timestamp;
        }
      }
      return null;
    };

    return sovaEntries.filter((entry) => {
      const comparable = toComparableTimestamp(entry);
      if (comparable === null) {
        if (!anyStatusFilter) return true;
      }
      if (start && comparable !== null && comparable < start.getTime()) {
        return false;
      }
      if (end && comparable !== null && comparable > end.getTime()) {
        return false;
      }

      // apply status filters
      if (filterCqcAcknowledgement && entry.cqcNotificationSubmitted !== true) return false;
      if (filterDutyOfCandour && entry.dutyOfCandourUpheld !== true) return false;
      if (filterInvestigationComplete && entry.investigationComplete !== true) return false;
      if (filterLessonsLearntComplete && entry.lessonsLearntComplete !== true) return false;
      if (filterRcaComplete && entry.rootCauseAnalysisComplete !== true) return false;
      if (filterSovaCompleted && !entry.dateClosed) return false;

      return true;
    });
  }, [
    sovaEntries,
    historyStartDate,
    historyEndDate,
    filterCqcAcknowledgement,
    filterDutyOfCandour,
    filterInvestigationComplete,
    filterLessonsLearntComplete,
    filterRcaComplete,
    filterSovaCompleted,
  ]);

  const pickerOptions = useMemo<PickerOption[]>(() => {
    if (!activePicker) {
      return [];
    }

    if (activePicker === 'lessons') {
      return lessonsRecords.map((record) => ({
        id: record.id,
        title: record.label,
        subtitle: record.dateLabel ? `Date ${record.dateLabel}` : undefined,
        meta: record.reference ? `Reference ${record.reference}` : undefined,
        dateValue: record.dateValue,
        reference: record.reference,
        tokens: record.searchTokens,
      }));
    }

    if (activePicker === 'rca') {
      return rcaRecords.map((record) => ({
        id: record.id,
        title: record.label,
        subtitle: record.dateLabel ? `Date ${record.dateLabel}` : undefined,
        meta: record.reference ? `Reference ${record.reference}` : undefined,
        dateValue: record.dateValue,
        reference: record.reference,
        tokens: record.searchTokens,
      }));
    }

    return cqcSummaries.map((record) => {
      const metaParts: string[] = [];
      if (record.reference) {
        metaParts.push(`Reference ${record.reference}`);
      }
      if (record.incidentDate) {
        metaParts.push(`Incident ${safeFormatDate(record.incidentDate)}`);
      }

      return {
        id: record.id,
        title: `CQC log #${record.runningLogNumber}`,
        subtitle: record.residentName,
        meta: metaParts.length ? metaParts.join(' • ') : undefined,
        dateValue: record.dateValue,
        reference: record.reference ?? String(record.runningLogNumber || ''),
        tokens: record.searchTokens,
      } satisfies PickerOption;
    });
  }, [activePicker, cqcSummaries, lessonsRecords, rcaRecords]);

  const filteredPickerOptions = useMemo(() => {
    if (!activePicker) {
      return [];
    }

    const searchTerm = pickerSearch.trim().toLowerCase();
    const referenceTerm = pickerReference.trim().toLowerCase();
    const dateFrom = pickerDateFrom ? normaliseDateValue(pickerDateFrom) : undefined;
    const dateTo = pickerDateTo ? normaliseDateValue(pickerDateTo) : undefined;

    return pickerOptions.filter((option) => {
      if (searchTerm && !option.tokens.includes(searchTerm)) {
        return false;
      }

      if (referenceTerm) {
        const referenceMatch = option.reference?.toLowerCase().includes(referenceTerm) || option.tokens.includes(referenceTerm);
        if (!referenceMatch) {
          return false;
        }
      }

      if (dateFrom) {
        if (!option.dateValue || option.dateValue < dateFrom) {
          return false;
        }
      }

      if (dateTo) {
        if (!option.dateValue || option.dateValue > dateTo) {
          return false;
        }
      }

      return true;
    });
  }, [activePicker, pickerDateFrom, pickerDateTo, pickerOptions, pickerReference, pickerSearch]);

  const updateSovaField = useCallback(<K extends keyof SovaFormState>(field: K, value: SovaFormState[K]) => {
    setSovaForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePickerSelect = useCallback(
    (recordId: string) => {
      if (!activePicker) {
        return;
      }

      if (activePicker === 'lessons') {
        updateSovaField('lessonsLearntRecordId', recordId);
      } else if (activePicker === 'rca') {
        updateSovaField('rootCauseAnalysisRecordId', recordId);
      } else if (activePicker === 'cqc') {
        updateSovaField('linkedCqcLogId', recordId);
        updateSovaField('cqcNotificationSubmitted', YES_VALUE);
      }

      closePicker();
    },
    [activePicker, closePicker, updateSovaField],
  );

  const handleSovaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isWorkspaceSelected) {
      toast({ title: 'Select a workspace', description: 'Choose a workspace to save safeguarding entries.', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'You must be signed in', description: 'Sign in again to add log entries.', variant: 'destructive' });
      return;
    }
    if (!sovaForm.residentName.trim()) {
      toast({ title: 'Missing information', description: 'Resident name is required for SOVA logs.', variant: 'destructive' });
      return;
    }

    startAddSova(async () => {
      try {
        const payload = {
          residentName: sovaForm.residentName,
          incidentDate: sovaForm.incidentDate,
          dateSovaRaised: sovaForm.dateSovaRaised,
          incidentDetails: sovaForm.incidentDetails,
          dutyOfCandourUpheld: yesNoToTriState(sovaForm.dutyOfCandourUpheld),
          investigationComplete: yesNoToTriState(sovaForm.investigationComplete),
          cqcNotificationSubmitted: yesNoToTriState(sovaForm.cqcNotificationSubmitted),
          lessonsLearntComplete: yesNoToTriState(sovaForm.lessonsLearntComplete),
          rootCauseAnalysisComplete: yesNoToTriState(sovaForm.rootCauseAnalysisComplete),
          outcome: sovaForm.outcome,
          dateClosed: sovaForm.dateClosed,
          lessonsLearntRecordId: sovaForm.lessonsLearntRecordId,
          rootCauseAnalysisRecordId: sovaForm.rootCauseAnalysisRecordId,
          linkedCqcLogId: sovaForm.linkedCqcLogId,
        };

        if (editingEntry) {
          await updateSovaLogEntry({
            workspaceId,
            organisationId,
            actor: { id: user.id, name: user.name ?? null, email: user.email ?? null },
            entryId: editingEntry.id,
            payload,
          });
          toast({ title: 'Safeguarding log updated', description: 'Changes have been saved to the SOVA running log.' });
        } else {
          await addSovaLogEntry({
            workspaceId,
            organisationId,
            actor: { id: user.id, name: user.name ?? null, email: user.email ?? null },
            payload,
          });
          toast({ title: 'Safeguarding log saved', description: 'The entry has been added to the SOVA running log.' });
        }

        setIsDetailsOpen(false);
        handleCancelEdit();
        await loadSovaLogs();
        setActiveTab('history');
      } catch (error) {
        console.error('Failed to save SOVA log', error);
        toast({ title: 'Unable to save SOVA log', description: 'Please try again shortly.', variant: 'destructive' });
      }
    });
  };

  const resetSovaForm = () => handleCancelEdit();

  const openEntryDetails = (entry: SovaLogRecord) => {
    setActiveTab('history');
    setSelectedEntry(entry);
    setIsDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setIsDetailsOpen(open);
    if (!open) {
      setSelectedEntry(null);
    }
  };

  const beginEditingEntry = (entry: SovaLogRecord) => {
    setSovaForm(() => mapSovaRecordToFormState(entry));
    setEditingEntry(entry);
    setActiveTab('form');
    setIsDetailsOpen(false);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const resetDetails = () => {
      setLessonsDetail(null);
      setRcaDetail(null);
      setCqcDetail(null);
      setLessonsDetailLoading(false);
      setRcaDetailLoading(false);
      setCqcDetailLoading(false);
    };

    if (!selectedEntry || !workspaceId) {
      resetDetails();
      return;
    }

    resetDetails();

    const loadRelatedRecords = async () => {
      if (selectedEntry.lessonsLearntRecordId) {
        setLessonsDetailLoading(true);
        try {
          const path = workspaceCollectionPath(workspaceId, 'lessons-learned', organisationId ?? undefined);
          if (path) {
            const ref = doc(db, path, selectedEntry.lessonsLearntRecordId);
            const snap = await getDoc(ref);
            if (!isCancelled && snap.exists()) {
              const data = snap.data() as Record<string, any>;
              const createdAt = (data.createdAt as any)?.toDate?.();
              setLessonsDetail({
                id: snap.id,
                form: data.form,
                actions: data.actions,
                createdAt: createdAt ? createdAt.toISOString() : null,
                recordType: data.recordType,
              });
            }
          }
        } catch (error) {
          console.error('Failed to load linked lessons learned record', error);
        } finally {
          if (!isCancelled) {
            setLessonsDetailLoading(false);
          }
        }
      }

      if (selectedEntry.rootCauseAnalysisRecordId) {
        setRcaDetailLoading(true);
        try {
          const path = workspaceCollectionPath(workspaceId, 'rca-records', organisationId ?? undefined);
          if (path) {
            const ref = doc(db, path, selectedEntry.rootCauseAnalysisRecordId);
            const snap = await getDoc(ref);
            if (!isCancelled && snap.exists()) {
              const data = snap.data() as Record<string, any>;
              const createdAt = (data.createdAt as any)?.toDate?.();
              setRcaDetail({
                id: snap.id,
                form: data.form,
                actions: data.actions,
                createdAt: createdAt ? createdAt.toISOString() : null,
                recordType: data.recordType,
              });
            }
          }
        } catch (error) {
          console.error('Failed to load linked RCA record', error);
        } finally {
          if (!isCancelled) {
            setRcaDetailLoading(false);
          }
        }
      }

      if (selectedEntry.linkedCqcLogId) {
        setCqcDetailLoading(true);
        try {
          const path = workspaceCollectionPath(workspaceId, 'cqc-log', organisationId ?? undefined);
          if (path) {
            const ref = doc(db, path, selectedEntry.linkedCqcLogId);
            const snap = await getDoc(ref);
            if (!isCancelled && snap.exists()) {
              const data = snap.data() as Record<string, any>;
              const createdAt = (data.createdAt as any)?.toDate?.();
              const runningLogNumber = Number(data.runningLogNumber ?? 0);
              const incidentDate = data.incidentDate ?? '';
              const dateValue = normaliseDateValue(incidentDate);
              const referenceCandidate = data.uniqueReferenceNumber || data.referenceNumber;
              const reference = referenceCandidate || (runningLogNumber ? String(runningLogNumber) : '');
              setCqcDetail({
                id: snap.id,
                runningLogNumber,
                residentName: data.residentName ?? '',
                incidentDate,
                dateValue,
                reference: reference || undefined,
                searchTokens: buildSearchTokens(
                  `cqc #${runningLogNumber}`,
                  data.residentName,
                  incidentDate,
                  reference,
                  data.uniqueReferenceNumber,
                  snap.id,
                  dateValue,
                ),
                uniqueReferenceNumber: data.uniqueReferenceNumber ?? '',
                cqcNotificationDate: data.cqcNotificationDate ?? '',
                incidentDetails: data.incidentDetails ?? '',
                dutyOfCandourUpheld: data.dutyOfCandourUpheld ?? null,
                investigationComplete: data.investigationComplete ?? null,
                lessonsLearntComplete: data.lessonsLearntComplete ?? null,
                rootCauseAnalysisComplete: data.rootCauseAnalysisComplete ?? null,
                sovaCompleted: data.sovaCompleted ?? null,
                outcome: data.outcome ?? '',
                dateClosed: data.dateClosed ?? '',
                createdAt: createdAt ? createdAt.toISOString() : null,
              });
            }
          }
        } catch (error) {
          console.error('Failed to load linked CQC log', error);
        } finally {
          if (!isCancelled) {
            setCqcDetailLoading(false);
          }
        }
      }
    };

    loadRelatedRecords();

    return () => {
      isCancelled = true;
    };
  }, [selectedEntry, workspaceId, organisationId]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Safeguarding (SOVA) Log"
        subtitle="Record safeguarding alerts, track duty of candour, and evidence closure actions for regulatory reviews."
        leading={<ShieldAlert className="h-6 w-6" />}
      />

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1800px] space-y-8">
          {!isWorkspaceSelected ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Select a workspace</CardTitle>
                <CardDescription>
                  Choose a workspace from the sidebar to start logging safeguarding notifications.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'form' | 'history')} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid h-auto w-full max-w-md grid-cols-2 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <TabsTrigger
                  value="form"
                  className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Log entry
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Log history
                </TabsTrigger>
              </TabsList>
              <Button variant="ghost" size="sm" onClick={loadSovaLogs} disabled={sovaLoading}>
                {sovaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>

            <TabsContent value="form" className="mt-6 space-y-6">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="space-y-2 border-b border-slate-200 bg-slate-50/60">
                  <CardTitle className="text-xl">Log a safeguarding notification</CardTitle>
                  <CardDescription>
                    Capture the core details required for SOVA referrals and internal safeguarding tracking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  <form className="space-y-8" onSubmit={handleSovaSubmit}>
                  {editingEntry ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">Editing log #{editingEntry.runningLogNumber}</p>
                          <p className="text-xs text-amber-800/80">
                            {`Changes will update the existing safeguarding entry${editingEntry.createdAt ? ` last revised ${safeFormatDateTime(editingEntry.createdAt)}` : ''}.`}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                          Cancel edit
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="sova-running">Running log number</Label>
                      <Input id="sova-running" value={nextSovaNumber} readOnly tabIndex={-1} className="cursor-not-allowed bg-slate-100" />
                    </div>
                    <div>
                      <Label htmlFor="sova-resident">Resident name</Label>
                      <Input
                        id="sova-resident"
                        placeholder="Resident"
                        value={sovaForm.residentName}
                        onChange={(event) => updateSovaField('residentName', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sova-incident-date">Incident date</Label>
                      <Input
                        id="sova-incident-date"
                        type="date"
                        value={sovaForm.incidentDate}
                        onChange={(event) => updateSovaField('incidentDate', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sova-raised-date">Date SOVA raised</Label>
                      <Input
                        id="sova-raised-date"
                        type="date"
                        value={sovaForm.dateSovaRaised}
                        onChange={(event) => updateSovaField('dateSovaRaised', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <YesNoSelectField
                      id="sova-duty"
                      label="Duty of candour upheld"
                      value={sovaForm.dutyOfCandourUpheld}
                      onChange={(value) => updateSovaField('dutyOfCandourUpheld', value)}
                    />
                    <YesNoSelectField
                      id="sova-investigation"
                      label="Investigation complete"
                      value={sovaForm.investigationComplete}
                      onChange={(value) => {
                        updateSovaField('investigationComplete', value);
                      }}
                    />
                    <div className="space-y-3 md:col-span-2">
                      <YesNoSelectField
                        id="sova-cqc-submitted"
                        label="CQC notification submitted"
                        value={sovaForm.cqcNotificationSubmitted}
                        onChange={(value) => {
                          updateSovaField('cqcNotificationSubmitted', value);
                          if (value !== YES_VALUE) {
                            updateSovaField('linkedCqcLogId', null);
                          }
                        }}
                      />
                      {sovaForm.cqcNotificationSubmitted === YES_VALUE ? (
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                          <Label htmlFor="sova-cqc-record">Link CQC notification log</Label>
                          <Select
                            value={sovaForm.linkedCqcLogId ?? NO_LINK_VALUE}
                            onValueChange={(val) => updateSovaField('linkedCqcLogId', val === NO_LINK_VALUE ? null : val)}
                          >
                            <SelectTrigger id="sova-cqc-record" className="w-full">
                              <SelectValue placeholder={cqcSummaries.length ? 'Select a log' : 'No logs available'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_LINK_VALUE}>No log linked</SelectItem>
                              {cqcSummaries.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  <div className="flex flex-col">
                                    <span>{`Log #${record.runningLogNumber} • ${record.residentName}`}</span>
                                    {record.incidentDate ? (
                                      <span className="text-xs text-slate-500">Incident {safeFormatDate(record.incidentDate)}</span>
                                    ) : null}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" onClick={() => openPicker('cqc')} className="w-full sm:w-auto">
                            Search CQC logs
                          </Button>
                          {sovaForm.linkedCqcLogId ? (
                            <p className="text-xs text-slate-500">
                              Linked to CQC log #{cqcRecordMap.get(sovaForm.linkedCqcLogId)?.runningLogNumber ?? ''}.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      <YesNoSelectField
                        id="sova-lessons"
                        label="Lessons learnt complete"
                        value={sovaForm.lessonsLearntComplete}
                        onChange={(value) => {
                          updateSovaField('lessonsLearntComplete', value);
                          if (value !== YES_VALUE) {
                            updateSovaField('lessonsLearntRecordId', null);
                          }
                        }}
                      />
                      {sovaForm.lessonsLearntComplete === YES_VALUE ? (
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                          <Label htmlFor="sova-lessons-record">Link lessons learned record</Label>
                          <Select
                            value={sovaForm.lessonsLearntRecordId ?? NO_LINK_VALUE}
                            onValueChange={(val) => updateSovaField('lessonsLearntRecordId', val === NO_LINK_VALUE ? null : val)}
                          >
                            <SelectTrigger id="sova-lessons-record" className="w-full">
                              <SelectValue placeholder={lessonsRecords.length ? 'Select a record' : 'No records available'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_LINK_VALUE}>No record linked</SelectItem>
                              {lessonsRecords.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  <div className="flex flex-col">
                                    <span>{record.label}</span>
                                    {record.dateLabel ? (
                                      <span className="text-xs text-slate-500">{record.dateLabel}</span>
                                    ) : null}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" onClick={() => openPicker('lessons')} className="w-full sm:w-auto">
                            Search records
                          </Button>
                          {sovaForm.lessonsLearntRecordId ? (
                            <p className="text-xs text-slate-500">
                              Linked to {lessonsRecordMap.get(sovaForm.lessonsLearntRecordId)?.label ?? 'selected record'}.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      <YesNoSelectField
                        id="sova-rca"
                        label="Root cause analysis complete"
                        value={sovaForm.rootCauseAnalysisComplete}
                        onChange={(value) => {
                          updateSovaField('rootCauseAnalysisComplete', value);
                          if (value !== YES_VALUE) {
                            updateSovaField('rootCauseAnalysisRecordId', null);
                          }
                        }}
                      />
                      {sovaForm.rootCauseAnalysisComplete === YES_VALUE ? (
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                          <Label htmlFor="sova-rca-record">Link root cause analysis</Label>
                          <Select
                            value={sovaForm.rootCauseAnalysisRecordId ?? NO_LINK_VALUE}
                            onValueChange={(val) => updateSovaField('rootCauseAnalysisRecordId', val === NO_LINK_VALUE ? null : val)}
                          >
                            <SelectTrigger id="sova-rca-record" className="w-full">
                              <SelectValue placeholder={rcaRecords.length ? 'Select a record' : 'No records available'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_LINK_VALUE}>No record linked</SelectItem>
                              {rcaRecords.map((record) => (
                                <SelectItem key={record.id} value={record.id}>
                                  <div className="flex flex-col">
                                    <span>{record.label}</span>
                                    {record.dateLabel ? (
                                      <span className="text-xs text-slate-500">{record.dateLabel}</span>
                                    ) : null}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" onClick={() => openPicker('rca')} className="w-full sm:w-auto">
                            Search RCA records
                          </Button>
                          {sovaForm.rootCauseAnalysisRecordId ? (
                            <p className="text-xs text-slate-500">
                              Linked to {rcaRecordMap.get(sovaForm.rootCauseAnalysisRecordId)?.label ?? 'selected record'}.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="sova-date-closed">Date closed</Label>
                      <Input
                        id="sova-date-closed"
                        type="date"
                        value={sovaForm.dateClosed}
                        onChange={(event) => updateSovaField('dateClosed', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="sova-incident-details">Brief details of incident</Label>
                      <Textarea
                        id="sova-incident-details"
                        rows={4}
                        placeholder="Provide brief details and context"
                        value={sovaForm.incidentDetails}
                        onChange={(event) => updateSovaField('incidentDetails', event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="sova-outcome">Outcome</Label>
                      <Textarea
                        id="sova-outcome"
                        rows={3}
                        placeholder="Outcome and actions"
                        value={sovaForm.outcome}
                        onChange={(event) => updateSovaField('outcome', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button type="button" variant="outline" onClick={resetSovaForm} className="sm:w-auto">
                      {editingEntry ? 'Cancel edit' : 'Clear form'}
                    </Button>
                    <Button type="submit" disabled={isAddingSova} className="sm:w-auto">
                      {isAddingSova ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : editingEntry ? (
                        <Save className="mr-2 h-4 w-4" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      {editingEntry ? 'Update entry' : 'Save entry'}
                    </Button>
                  </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-6">
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="space-y-2 border-b border-slate-200 bg-slate-50/60">
                  <CardTitle className="text-xl">Safeguarding (SOVA) log</CardTitle>
                  <CardDescription>
                    Review safeguarding alerts and open any entry to view full details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-4 p-6 pb-0">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="sova-history-start">From date</Label>
                        <Input
                          id="sova-history-start"
                          type="date"
                          value={historyStartDate}
                          onChange={(event) => setHistoryStartDate(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sova-history-end">To date</Label>
                        <Input
                          id="sova-history-end"
                          type="date"
                          value={historyEndDate}
                          onChange={(event) => setHistoryEndDate(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status filters</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="w-full justify-start">
                              <span className="text-xs">Status filters</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <Checkbox checked={filterCqcAcknowledgement} onCheckedChange={(v) => setFilterCqcAcknowledgement(!!v)} />
                                <span className="text-sm">CQC notification submitted</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <Checkbox checked={filterDutyOfCandour} onCheckedChange={(v) => setFilterDutyOfCandour(!!v)} />
                                <span className="text-sm">Duty of candour upheld</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <Checkbox checked={filterInvestigationComplete} onCheckedChange={(v) => setFilterInvestigationComplete(!!v)} />
                                <span className="text-sm">Investigation complete</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <Checkbox checked={filterLessonsLearntComplete} onCheckedChange={(v) => setFilterLessonsLearntComplete(!!v)} />
                                <span className="text-sm">Lessons learnt complete</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <Checkbox checked={filterRcaComplete} onCheckedChange={(v) => setFilterRcaComplete(!!v)} />
                                <span className="text-sm">Root cause analysis complete</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <Checkbox checked={filterSovaCompleted} onCheckedChange={(v) => setFilterSovaCompleted(!!v)} />
                                <span className="text-sm">SOVA completed</span>
                              </label>
                              <div className="pt-2 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFilterCqcAcknowledgement(false);
                                    setFilterDutyOfCandour(false);
                                    setFilterInvestigationComplete(false);
                                    setFilterLessonsLearntComplete(false);
                                    setFilterRcaComplete(false);
                                    setFilterSovaCompleted(false);
                                  }}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-end sm:col-span-2 lg:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!historyStartDate && !historyEndDate && !filterCqcAcknowledgement && !filterDutyOfCandour && !filterInvestigationComplete && !filterLessonsLearntComplete && !filterRcaComplete && !filterSovaCompleted}
                          onClick={() => {
                            setHistoryStartDate('');
                            setHistoryEndDate('');
                            setFilterCqcAcknowledgement(false);
                            setFilterDutyOfCandour(false);
                            setFilterInvestigationComplete(false);
                            setFilterLessonsLearntComplete(false);
                            setFilterRcaComplete(false);
                            setFilterSovaCompleted(false);
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Showing {filteredSovaEntries.length} of {sovaEntries.length} entries</span>
                      {(historyStartDate || historyEndDate || filterCqcAcknowledgement || filterDutyOfCandour || filterInvestigationComplete || filterLessonsLearntComplete || filterRcaComplete || filterSovaCompleted) ? (
                        <span>
                          Filters active
                          {historyStartDate ? ` • From ${safeFormatDate(historyStartDate)}` : ''}
                          {historyEndDate ? ` • To ${safeFormatDate(historyEndDate)}` : ''}
                          {filterCqcAcknowledgement ? ' • CQC notification' : ''}
                          {filterDutyOfCandour ? ' • Duty of candour' : ''}
                          {filterInvestigationComplete ? ' • Investigation complete' : ''}
                          {filterLessonsLearntComplete ? ' • Lessons learnt' : ''}
                          {filterRcaComplete ? ' • RCA complete' : ''}
                          {filterSovaCompleted ? ' • SOVA completed' : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {sovaLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 border-t py-12 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      Loading log entries...
                    </div>
                  ) : filteredSovaEntries.length === 0 ? (
                    <div className="border-t py-12 text-center text-sm text-slate-500">
                      {sovaEntries.length === 0 ? 'No entries recorded yet.' : 'No entries match the selected filters.'}
                    </div>
                  ) : (
                    <div className="space-y-4 border-t bg-slate-50/40 p-6">
                      {filteredSovaEntries.map((entry) => {
                        const lessonsLabel = entry.lessonsLearntRecordId
                          ? lessonsRecordMap.get(entry.lessonsLearntRecordId)?.label ?? entry.lessonsLearntRecordId
                          : null;
                        const rcaLabel = entry.rootCauseAnalysisRecordId
                          ? rcaRecordMap.get(entry.rootCauseAnalysisRecordId)?.label ?? entry.rootCauseAnalysisRecordId
                          : null;
                        const cqcLabel = entry.linkedCqcLogId
                          ? `CQC log #${cqcRecordMap.get(entry.linkedCqcLogId)?.runningLogNumber ?? entry.linkedCqcLogId}`
                          : null;

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            aria-label={`View details for log ${entry.runningLogNumber}`}
                            onClick={() => openEntryDetails(entry)}
                            className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <div className="space-y-6">
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <span>Log #{entry.runningLogNumber}</span>
                                {entry.createdAt ? (
                                  <span className="font-normal text-slate-400">Recorded {safeFormatDateTime(entry.createdAt)}</span>
                                ) : null}
                              </div>

                              <div className="text-lg font-semibold text-slate-900">
                                {entry.residentName || 'Unknown resident'}
                              </div>

                              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                                <CardSection title="Key details">
                                  <CardField label="Running log number" value={`#${entry.runningLogNumber}`} />
                                  <CardField label="Recorded" value={safeFormatDateTime(entry.createdAt)} />
                                </CardSection>
                                <CardSection title="Timeline">
                                  <CardField label="Incident date" value={safeFormatDate(entry.incidentDate)} />
                                  <CardField label="Date SOVA raised" value={safeFormatDate(entry.dateSovaRaised)} />
                                  <CardField label="Date closed" value={safeFormatDate(entry.dateClosed)} />
                                </CardSection>
                                <CardSection title="Status checks">
                                  <CardField label="Duty of candour upheld" value={<YesNoBadge value={entry.dutyOfCandourUpheld} />} />
                                  <CardField label="Investigation complete" value={<YesNoBadge value={entry.investigationComplete} />} />
                                  <CardField label="CQC notification submitted" value={<YesNoBadge value={entry.cqcNotificationSubmitted} />} />
                                  <CardField label="Lessons learnt complete" value={<YesNoBadge value={entry.lessonsLearntComplete} />} />
                                  <CardField label="Root cause analysis complete" value={<YesNoBadge value={entry.rootCauseAnalysisComplete} />} />
                                </CardSection>
                                <CardSection title="Linked records">
                                  <CardField label="Lessons learned" value={lessonsLabel} />
                                  <CardField label="RCA record" value={rcaLabel} />
                                  <CardField label="CQC log" value={cqcLabel} />
                                </CardSection>
                              </div>

                              <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                                <span>View details</span>
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={Boolean(activePicker)} onOpenChange={(open) => { if (!open) closePicker(); }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {activePicker === 'lessons'
                    ? 'Select lessons learned record'
                    : activePicker === 'rca'
                      ? 'Select root cause analysis record'
                      : activePicker === 'cqc'
                        ? 'Select CQC notification log'
                        : 'Select record'}
                </DialogTitle>
                <DialogDescription>
                  Filter by keywords, reference, or date to find the record you need, then click it to link the safeguarding entry.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="sova-picker-search">Keyword</Label>
                    <Input
                      id="sova-picker-search"
                      placeholder="Search by resident or description"
                      value={pickerSearch}
                      onChange={(event) => setPickerSearch(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sova-picker-reference">Reference</Label>
                    <Input
                      id="sova-picker-reference"
                      placeholder="Reference number"
                      value={pickerReference}
                      onChange={(event) => setPickerReference(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sova-picker-date-from">Date from</Label>
                    <Input
                      id="sova-picker-date-from"
                      type="date"
                      value={pickerDateFrom}
                      onChange={(event) => setPickerDateFrom(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sova-picker-date-to">Date to</Label>
                    <Input
                      id="sova-picker-date-to"
                      type="date"
                      value={pickerDateTo}
                      onChange={(event) => setPickerDateTo(event.target.value)}
                    />
                  </div>
                </div>
                <ScrollArea className="max-h-80 rounded-lg border">
                  <div className="divide-y">
                    {filteredPickerOptions.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No matching records. Adjust your filters and try again.</p>
                    ) : (
                      filteredPickerOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handlePickerSelect(option.id)}
                          className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          <span className="text-sm font-medium text-slate-900">{option.title}</span>
                          {option.subtitle ? <span className="text-xs text-slate-600">{option.subtitle}</span> : null}
                          {option.meta ? <span className="text-xs text-slate-500">{option.meta}</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closePicker}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDetailsOpen} onOpenChange={handleDetailsOpenChange}>
            <DialogContent className="max-w-4xl">
              {selectedEntry ? (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      Log #{selectedEntry.runningLogNumber}
                      {selectedEntry.residentName ? ` — ${selectedEntry.residentName}` : ''}
                    </DialogTitle>
                    <DialogDescription>
                      Created {safeFormatDateTime(selectedEntry.createdAt)}
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="overview" className="mt-4 space-y-6">
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-4">
                      <TabsTrigger
                        value="overview"
                        className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Overview
                      </TabsTrigger>
                      <TabsTrigger
                        value="lessons"
                        className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Lessons learned
                      </TabsTrigger>
                      <TabsTrigger
                        value="rca"
                        className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        Root cause analysis
                      </TabsTrigger>
                      <TabsTrigger
                        value="cqc"
                        className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        CQC log
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
                      <div className="grid gap-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <DetailField label="Resident" value={selectedEntry.residentName} />
                          <DetailField label="Running log number" value={`#${selectedEntry.runningLogNumber}`} />
                          <DetailField label="Incident date" value={safeFormatDate(selectedEntry.incidentDate)} />
                          <DetailField label="Date SOVA raised" value={safeFormatDate(selectedEntry.dateSovaRaised)} />
                          <DetailField label="Date closed" value={safeFormatDate(selectedEntry.dateClosed)} />
                          <DetailField label="Recorded" value={safeFormatDateTime(selectedEntry.createdAt)} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <DetailField label="Duty of candour upheld" value={<YesNoBadge value={selectedEntry.dutyOfCandourUpheld} />} />
                          <DetailField label="Investigation complete" value={<YesNoBadge value={selectedEntry.investigationComplete} />} />
                          <DetailField label="CQC notification submitted" value={<YesNoBadge value={selectedEntry.cqcNotificationSubmitted} />} />
                          <DetailField label="Lessons learnt complete" value={<YesNoBadge value={selectedEntry.lessonsLearntComplete} />} />
                          <DetailField label="Root cause analysis complete" value={<YesNoBadge value={selectedEntry.rootCauseAnalysisComplete} />} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <DetailField
                            label="Lessons learned record"
                            value={selectedEntry.lessonsLearntRecordId ? (lessonsRecordMap.get(selectedEntry.lessonsLearntRecordId)?.label ?? selectedEntry.lessonsLearntRecordId) : '—'}
                          />
                          <DetailField
                            label="RCA record"
                            value={selectedEntry.rootCauseAnalysisRecordId ? (rcaRecordMap.get(selectedEntry.rootCauseAnalysisRecordId)?.label ?? selectedEntry.rootCauseAnalysisRecordId) : '—'}
                          />
                          <DetailField
                            label="CQC log"
                            value={selectedEntry.linkedCqcLogId ? `Log #${cqcRecordMap.get(selectedEntry.linkedCqcLogId)?.runningLogNumber ?? selectedEntry.linkedCqcLogId}` : '—'}
                          />
                        </div>

                        <DetailField label="Incident details" value={selectedEntry.incidentDetails} />
                        <DetailField label="Outcome" value={selectedEntry.outcome} />
                      </div>

                    </TabsContent>

                    <TabsContent value="lessons" className="space-y-4 focus-visible:outline-none">
                      {selectedEntry.lessonsLearntComplete !== true ? (
                        <InfoMessage>Lessons learned for this safeguarding incident are not marked as complete yet.</InfoMessage>
                      ) : selectedEntry.lessonsLearntRecordId ? (
                        lessonsDetailLoading ? (
                          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading lessons learned record…
                          </div>
                        ) : lessonsDetail ? (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <DetailField label="Event type" value={lessonsDetail.form?.eventType} />
                              <DetailField label="Event date" value={safeFormatDate(lessonsDetail.form?.date)} />
                              <DetailField label="Location" value={lessonsDetail.form?.location} />
                              <DetailField label="People involved" value={lessonsDetail.form?.peopleInvolved} />
                            </div>
                            <DetailField label="Summary of events" value={lessonsDetail.form?.summaryOfEvents || lessonsDetail.form?.description} />
                            <DetailField label="Lessons learned" value={lessonsDetail.form?.lessonsLearned} />
                            <DetailField label="Monitoring & oversight" value={[
                              lessonsDetail.form?.monitoring,
                              lessonsDetail.form?.oversight,
                            ].filter(Boolean).join('\n\n')} />
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                              <ActionsList actions={lessonsDetail.actions} />
                            </div>
                          </div>
                        ) : (
                          <InfoMessage>
                            The linked lessons learned record could not be loaded. Open it in a new tab to review.
                          </InfoMessage>
                        )
                      ) : (
                        <InfoMessage>No lessons learned record has been linked yet.</InfoMessage>
                      )}
                    </TabsContent>

                    <TabsContent value="rca" className="space-y-4 focus-visible:outline-none">
                      {selectedEntry.rootCauseAnalysisComplete !== true ? (
                        <InfoMessage>The root cause analysis is not marked as complete yet.</InfoMessage>
                      ) : selectedEntry.rootCauseAnalysisRecordId ? (
                        rcaDetailLoading ? (
                          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading RCA record…
                          </div>
                        ) : rcaDetail ? (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <DetailField label="Event type" value={rcaDetail.form?.eventType} />
                              <DetailField label="Event date" value={safeFormatDate(rcaDetail.form?.date)} />
                              <DetailField label="Location" value={rcaDetail.form?.location} />
                              <DetailField label="People involved" value={rcaDetail.form?.peopleInvolved} />
                            </div>
                            <DetailField label="Summary" value={rcaDetail.form?.summary} />
                            <DetailField label="Underlying issues" value={rcaDetail.form?.underlyingIssues} />
                            <DetailField label="Lessons / prevention" value={[
                              rcaDetail.form?.lessonsTakeaway,
                              rcaDetail.form?.lessonsPrevention,
                            ].filter(Boolean).join('\n\n')} />
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                              <ActionsList actions={rcaDetail.actions} />
                            </div>
                          </div>
                        ) : (
                          <InfoMessage>
                            The linked RCA record could not be loaded. Open it in a new tab to review.
                          </InfoMessage>
                        )
                      ) : (
                        <InfoMessage>No RCA record has been linked yet.</InfoMessage>
                      )}
                    </TabsContent>

                    <TabsContent value="cqc" className="space-y-4 focus-visible:outline-none">
                      {selectedEntry.linkedCqcLogId ? (
                        cqcDetailLoading ? (
                          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading CQC log…
                          </div>
                        ) : cqcDetail ? (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <DetailField label="Running log" value={`#${cqcDetail.runningLogNumber}`} />
                              <DetailField label="Unique reference" value={cqcDetail.uniqueReferenceNumber} />
                              <DetailField label="Incident date" value={safeFormatDate(cqcDetail.incidentDate)} />
                              <DetailField label="CQC notification date" value={safeFormatDate(cqcDetail.cqcNotificationDate)} />
                              <DetailField label="Date closed" value={safeFormatDate(cqcDetail.dateClosed)} />
                              <DetailField label="Recorded" value={safeFormatDateTime(cqcDetail.createdAt)} />
                            </div>
                            <DetailField label="Incident details" value={cqcDetail.incidentDetails} />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <DetailField label="Duty of candour upheld" value={<YesNoBadge value={cqcDetail.dutyOfCandourUpheld ?? null} />} />
                              <DetailField label="Investigation complete" value={<YesNoBadge value={cqcDetail.investigationComplete ?? null} />} />
                              <DetailField label="Lessons learnt complete" value={<YesNoBadge value={cqcDetail.lessonsLearntComplete ?? null} />} />
                              <DetailField label="RCA complete" value={<YesNoBadge value={cqcDetail.rootCauseAnalysisComplete ?? null} />} />
                              <DetailField label="SOVA completed" value={<YesNoBadge value={cqcDetail.sovaCompleted ?? null} />} />
                            </div>
                            <DetailField label="Outcome" value={cqcDetail.outcome} />
                          </div>
                        ) : (
                          <InfoMessage>
                            The linked CQC log could not be loaded. Open it in a new tab to continue.
                          </InfoMessage>
                        )
                      ) : (
                        <InfoMessage>No CQC log has been linked yet.</InfoMessage>
                      )}
                    </TabsContent>
                  </Tabs>

                  <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button type="button" variant="outline" onClick={() => handleDetailsOpenChange(false)}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={downloadSovaPdf}
                      disabled={isExportingPdf || lessonsDetailLoading || rcaDetailLoading || cqcDetailLoading}
                    >
                      {isExportingPdf ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Preparing PDF…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FileDown className="h-4 w-4" /> Download PDF
                        </span>
                      )}
                    </Button>
                    <Button type="button" onClick={() => beginEditingEntry(selectedEntry)}>
                      Edit entry
                    </Button>
                  </DialogFooter>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
