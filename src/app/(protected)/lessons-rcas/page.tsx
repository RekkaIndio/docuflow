'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, NotebookPen, Loader2, RefreshCcw, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Info, Lightbulb, Target, type LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/page-header';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { saveLessonsLearnedRecord, saveRcaRecord } from '@/actions/lessons-rcas';
import { workspaceCollectionPath } from '@/lib/paths';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';

const EMPTY_ACTION_ROW = { action: '', owner: '', timescale: '', status: '' };

const LESSONS_FORM_TEMPLATE = {
  date: '',
  eventType: '',
  location: '',
  peopleInvolved: '',
  description: '',
  summaryOfEvents: '',
  immediateActions: '',
  impact: '',
  positives: '',
  improvements: '',
  lessonsLearned: '',
  underlyingCauses: '',
  monitoring: '',
  oversight: '',
  reviewDate: '',
  sharingPlan: '',
  familiesInformed: '',
  externalAgencies: '',
};

const RCA_FORM_TEMPLATE = {
  date: '',
  eventType: '',
  location: '',
  peopleInvolved: '',
  summary: '',
  infoSources: '',
  impactResidents: '',
  impactStaff: '',
  impactService: '',
  contributing: {
    human: false,
    environment: false,
    systems: false,
    equipment: false,
    leadership: false,
    external: false,
    other: '',
  },
  rootWhy: '',
  underlyingIssues: '',
  lessonsTakeaway: '',
  lessonsPrevention: '',
  reviewDate: '',
  reviewOwner: '',
  reviewMeasurement: '',
};

type TrackerRecord = {
  id: string;
  recordType: 'lessons-learned' | 'root-cause-analysis';
  createdAt: Date;
  form: Record<string, any>;
  actions: Array<{ action: string; owner: string; timescale: string; status: string }>;
  timeline?: string[];
  createdBy?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
};

const RECORD_LABELS: Record<TrackerRecord['recordType'], string> = {
  'lessons-learned': 'Lessons Learned',
  'root-cause-analysis': 'Root Cause Analysis',
};

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
  'December',
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
  'Dec',
] as const;

const monthLabelFromKey = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split('-');
  const monthIndex = Number(monthPart) - 1;
  if (!yearPart || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }
  return `${MONTH_LABELS[monthIndex]} ${yearPart}`;
};

const getMonthKeyFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const monthKeyToDate = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart) - 1;
  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
    return null;
  }
  return new Date(year, month, 1);
};

const getMonthIndex = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split('-');
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

const RECORD_TYPE_TO_TAB: Record<TrackerRecord['recordType'], 'lessons' | 'rca'> = {
  'lessons-learned': 'lessons',
  'root-cause-analysis': 'rca',
};

type TrackerCardMeta = {
  type: TrackerRecord['recordType'];
  title: string;
  description: string;
  accentGradient: string;
  iconGradient: string;
  iconColor: string;
  icon: LucideIcon;
  emptyHint: string;
};

const TRACKER_CARD_META: TrackerCardMeta[] = [
  {
    type: 'lessons-learned',
    title: 'Lessons Learned Entry',
    description: 'Capture insights and improvements identified after incidents or reviews.',
    accentGradient: 'from-amber-500 to-orange-500',
    iconGradient: 'from-amber-100 to-orange-100',
    iconColor: 'text-amber-600',
    icon: Lightbulb,
    emptyHint: 'Switch to the Lessons tab to record what was learned this month.',
  },
  {
    type: 'root-cause-analysis',
    title: 'Root Cause Analysis',
    description: 'Document findings from detailed investigations and assure follow-up.',
    accentGradient: 'from-indigo-500 to-blue-500',
    iconGradient: 'from-indigo-100 to-blue-100',
    iconColor: 'text-indigo-600',
    icon: Target,
    emptyHint: 'Use the RCA tab to add a new investigation and track resulting actions.',
  },
];

const formatDateTime = (value: Date) => {
  try {
    return value.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value.toISOString();
  }
};

const formatInputDateTime = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return parsed.toISOString();
  }
};

const formatDateOnly = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return parsed.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return parsed.toISOString();
  }
};

type FieldDescriptor = {
  key: string;
  label: string;
  fullWidth?: boolean;
  format?: (value: any) => string;
};

const renderReadOnlyField = (form: Record<string, any>, descriptor: FieldDescriptor) => {
  const raw = form?.[descriptor.key];
  const value = descriptor.format ? descriptor.format(raw) : (raw ? String(raw) : '—');
  const colSpanClass = descriptor.fullWidth ? 'md:col-span-2' : '';
  return (
    <div key={descriptor.key} className={`space-y-1 ${colSpanClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{descriptor.label}</p>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-slate-700">
        {value || '—'}
      </div>
    </div>
  );
};

const renderActionsList = (actions: Array<{ action: string; owner: string; timescale: string; status: string }>) => {
  if (!actions || actions.length === 0) {
    return (
  <div className="rounded-md border border-dashed border-muted/60 bg-muted/10 p-4 text-sm text-slate-500">
        No actions recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <div key={`${action.action}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">{action.action || 'Action item'}</p>
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-500 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Owner</p>
              <p className="text-slate-800">{action.owner || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Timescale</p>
              <p className="text-slate-800">{action.timescale || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <p className="text-slate-800">{action.status || '—'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const renderLessonsDetail = (
  form: Record<string, any>,
  actions: Array<{ action: string; owner: string; timescale: string; status: string }>
) => {
  const sections: { title: string; fields: FieldDescriptor[] }[] = [
    {
      title: 'Event Overview',
      fields: [
        { key: 'date', label: 'Date & Time', format: formatInputDateTime },
        { key: 'eventType', label: 'Type of Event' },
        { key: 'location', label: 'Location / Unit' },
        { key: 'peopleInvolved', label: 'People Involved', fullWidth: true },
      ],
    },
    {
      title: 'Narrative',
      fields: [
        { key: 'description', label: 'Brief Description', fullWidth: true },
        { key: 'summaryOfEvents', label: 'Summary of Events', fullWidth: true },
        { key: 'immediateActions', label: 'Immediate Actions Taken', fullWidth: true },
        { key: 'impact', label: 'Impact on Residents / Staff / Service', fullWidth: true },
      ],
    },
    {
      title: 'Learning & Reflection',
      fields: [
        { key: 'positives', label: 'What Went Well?', fullWidth: true },
        { key: 'improvements', label: 'What Could Have Been Better?', fullWidth: true },
        { key: 'lessonsLearned', label: 'Lessons Learned', fullWidth: true },
        { key: 'underlyingCauses', label: 'Underlying Causes', fullWidth: true },
      ],
    },
    {
      title: 'Follow-up & Sharing',
      fields: [
        { key: 'monitoring', label: 'Monitoring & Follow-up', fullWidth: true },
        { key: 'oversight', label: 'Responsible for Oversight' },
  { key: 'reviewDate', label: 'Review Date', format: formatDateOnly },
        { key: 'sharingPlan', label: 'Sharing with Staff', fullWidth: true },
        { key: 'familiesInformed', label: 'Families / Residents Informed', fullWidth: true },
        { key: 'externalAgencies', label: 'External Agencies Notified', fullWidth: true },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map(section => (
        <div key={section.title} className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-blue-900">{section.title}</h3>
            <span className="block h-px w-full bg-border/60" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {section.fields.map(field => renderReadOnlyField(form, field))}
          </div>
        </div>
      ))}

  <div className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-blue-900">Actions for Improvement</h3>
          <span className="block h-px w-full bg-border/60" />
        </div>
        {renderActionsList(actions)}
      </div>
    </div>
  );
};

const RCA_CONTRIBUTING_LABELS: Record<string, string> = {
  human: 'Human factors',
  environment: 'Environment',
  systems: 'Systems / Processes',
  equipment: 'Equipment / Resources',
  leadership: 'Leadership / Management',
  external: 'External',
};

const renderRcaDetail = (
  form: Record<string, any>,
  actions: Array<{ action: string; owner: string; timescale: string; status: string }>,
  timeline: string[]
) => {
  const contributing = form?.contributing ?? {};
  const selectedFactors = Object.keys(RCA_CONTRIBUTING_LABELS).filter(key => contributing[key]);
  const otherFactor = contributing.other ? String(contributing.other) : '';

  const sections: { title: string; fields: FieldDescriptor[] }[] = [
    {
      title: 'Event Details',
      fields: [
        { key: 'date', label: 'Date & Time of Event', format: formatInputDateTime },
        { key: 'eventType', label: 'Type of Event' },
        { key: 'location', label: 'Location / Unit' },
        { key: 'peopleInvolved', label: 'People Involved', fullWidth: true },
        { key: 'summary', label: 'Brief Summary', fullWidth: true },
        { key: 'infoSources', label: 'Sources of Information', fullWidth: true },
      ],
    },
    {
      title: 'Impact Assessment',
      fields: [
        { key: 'impactResidents', label: 'Resident(s) Affected', fullWidth: true },
        { key: 'impactStaff', label: 'Staff Impact', fullWidth: true },
        { key: 'impactService', label: 'Wider Service Impact', fullWidth: true },
      ],
    },
    {
      title: 'Root Cause Exploration',
      fields: [
        { key: 'rootWhy', label: 'Why did this happen?', fullWidth: true },
        { key: 'underlyingIssues', label: 'Underlying Issues Identified', fullWidth: true },
        { key: 'lessonsTakeaway', label: 'Lessons Learned', fullWidth: true },
        { key: 'lessonsPrevention', label: 'How to Prevent Recurrence', fullWidth: true },
      ],
    },
    {
      title: 'Review & Monitoring',
      fields: [
        { key: 'reviewDate', label: 'Follow-up Review Date', format: formatDateOnly },
        { key: 'reviewOwner', label: 'Person Responsible for Review' },
        { key: 'reviewMeasurement', label: 'How Improvements Will Be Measured', fullWidth: true },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map(section => (
        <div key={section.title} className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-blue-900">{section.title}</h3>
            <span className="block h-px w-full bg-border/60" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {section.fields.map(field => renderReadOnlyField(form, field))}
          </div>
        </div>
      ))}

  <div className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-blue-900">Timeline of Events</h3>
          <span className="block h-px w-full bg-border/60" />
        </div>
        {timeline && timeline.length > 0 ? (
          <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
            {timeline.map((step, idx) => (
              <li key={`${step}-${idx}`} className="relative text-sm leading-relaxed text-slate-500">
                <span className="absolute -left-[17px] mt-1 h-3 w-3 rounded-full border border-background bg-primary" />
                <span className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-muted/10 p-4 text-sm text-slate-500">No timeline provided.</div>
        )}
      </div>

  <div className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-blue-900">Contributing Factors</h3>
          <span className="block h-px w-full bg-border/60" />
        </div>
        {selectedFactors.length > 0 || otherFactor ? (
          <div className="flex flex-wrap gap-2">
            {selectedFactors.map(key => (
              <Badge key={key} variant="outline">{RCA_CONTRIBUTING_LABELS[key]}</Badge>
            ))}
            {otherFactor ? <Badge variant="secondary">Other: {otherFactor}</Badge> : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-muted/10 p-4 text-sm text-slate-500">No contributing factors recorded.</div>
        )}
      </div>

  <div className="space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-blue-900">Action Plan</h3>
          <span className="block h-px w-full bg-border/60" />
        </div>
        {renderActionsList(actions)}
      </div>
    </div>
  );
};

export default function LessonsRcasPage() {
  const { toast } = useToast();
  const workspace = useWorkspace();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'lessons' | 'rca' | 'tracker'>('lessons');

  const workspaceId = workspace?.id ?? '';
  const organisationId = workspace?.organisationId ?? null;
  const workspaceName = workspace?.name ?? '';
  const isWorkspaceSelected = Boolean(workspaceId);

  const [lessonsForm, setLessonsForm] = useState({ ...LESSONS_FORM_TEMPLATE });

  const [lessonsActions, setLessonsActions] = useState([{ ...EMPTY_ACTION_ROW }]);

  const [rcaForm, setRcaForm] = useState({ ...RCA_FORM_TEMPLATE });

  const [rcaTimeline, setRcaTimeline] = useState(['']);

  const [rcaActions, setRcaActions] = useState([{ ...EMPTY_ACTION_ROW }]);

  const [lessonsSaving, setLessonsSaving] = useState(false);
  const [rcaSaving, setRcaSaving] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerRecords, setTrackerRecords] = useState<TrackerRecord[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TrackerRecord | null>(null);

  const currentMonthKey = useMemo(() => getMonthKeyFromDate(new Date()), []);

  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    trackerRecords.forEach(record => {
      const key = getMonthKeyFromDate(record.createdAt);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [trackerRecords]);

  const monthsWithData = useMemo(() => Object.keys(monthCounts).sort(sortMonthKeysDesc), [monthCounts]);

  const earliestYear = useMemo(() => {
    if (trackerRecords.length === 0) {
      return null;
    }
    const oldest = trackerRecords[trackerRecords.length - 1]?.createdAt;
    return oldest ? oldest.getFullYear() : null;
  }, [trackerRecords]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const availableYears = useMemo(() => {
    if (earliestYear === null) {
      return [] as number[];
    }
    const years: number[] = [];
    for (let year = currentYear; year >= earliestYear; year -= 1) {
      years.push(year);
    }
    return years;
  }, [currentYear, earliestYear]);

  const monthsGroupedByYear = useMemo(() => {
    if (availableYears.length === 0) {
      return {} as Record<number, { monthKey: string; monthIndex: number; label: string; count: number }[]>;
    }
    const result: Record<number, { monthKey: string; monthIndex: number; label: string; count: number }[]> = {};
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
    const map: Record<string, TrackerRecord[]> = {};
    trackerRecords.forEach(record => {
      const key = getMonthKeyFromDate(record.createdAt);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(record);
    });
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    });
    return map;
  }, [trackerRecords]);

  const selectedMonthRecords = selectedMonthKey ? recordsByMonth[selectedMonthKey] ?? [] : [];

  const selectedMonthRecordsByType = useMemo(() => {
    const map: Record<TrackerRecord['recordType'], TrackerRecord[]> = {
      'lessons-learned': [],
      'root-cause-analysis': [],
    };
    selectedMonthRecords.forEach(record => {
      map[record.recordType].push(record);
    });
    return map;
  }, [selectedMonthRecords]);

  const selectedMonthLabel = useMemo(() => (selectedMonthKey ? monthLabelFromKey(selectedMonthKey) : null), [selectedMonthKey]);
  const selectedMonthRecordCount = selectedMonthRecords.length;
  const totalRecordTypes = TRACKER_CARD_META.length;
  const completedRecordTypes = TRACKER_CARD_META.reduce((count, meta) => count + (selectedMonthRecordsByType[meta.type].length > 0 ? 1 : 0), 0);

  useEffect(() => {
    if (trackerRecords.length === 0) {
      if (selectedMonthKey !== null) {
        setSelectedMonthKey(null);
      }
      if (selectedMonthDate !== null) {
        setSelectedMonthDate(null);
      }
      return;
    }

    if (!selectedMonthKey) {
      const fallbackKey = monthsWithData[0] ?? currentMonthKey;
      setSelectedMonthKey(fallbackKey);
      setSelectedMonthDate(monthKeyToDate(fallbackKey) ?? null);
      return;
    }

    if (!selectedMonthDate) {
      setSelectedMonthDate(monthKeyToDate(selectedMonthKey) ?? null);
    }
  }, [trackerRecords, monthsWithData, selectedMonthKey, selectedMonthDate, currentMonthKey]);

  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonthKey(monthKey);
    setSelectedMonthDate(monthKeyToDate(monthKey) ?? null);
  };

  const handleDatePickerSelect = (value?: Date) => {
    if (!value) {
      return;
    }
    const monthKey = getMonthKeyFromDate(value);
    handleSelectMonth(monthKey);
    setDatePickerOpen(false);
  };

  const loadTrackerRecords = useCallback(async () => {
    if (!workspaceId) {
      setTrackerRecords([]);
      return;
    }

    setTrackerLoading(true);
    try {
      const lessonsPath = workspaceCollectionPath(workspaceId, 'lessons-learned', organisationId ?? undefined);
      const rcaPath = workspaceCollectionPath(workspaceId, 'rca-records', organisationId ?? undefined);

      const fetchCollection = async (path: string | undefined | null, recordType: TrackerRecord['recordType']) => {
        if (!path) return [] as TrackerRecord[];
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id: docSnap.id,
            recordType,
            createdAt,
            form: data.form ?? {},
            actions: Array.isArray(data.actions) ? data.actions : [],
            timeline: Array.isArray(data.timeline) ? data.timeline : undefined,
            createdBy: data.createdBy ?? null,
          } as TrackerRecord;
        });
      };

      const [lessonsRecords, rcaRecords] = await Promise.all([
        fetchCollection(lessonsPath, 'lessons-learned'),
        fetchCollection(rcaPath, 'root-cause-analysis'),
      ]);

      const combined = [...lessonsRecords, ...rcaRecords].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setTrackerRecords(combined);
    } catch (error) {
      console.error('Failed to load tracker records', error);
      toast({ title: 'Unable to load records', description: 'Please refresh the page and try again.', variant: 'destructive' });
    } finally {
      setTrackerLoading(false);
    }
  }, [workspaceId, organisationId, toast]);

  useEffect(() => {
    if (!workspaceId) {
      setTrackerRecords([]);
      return;
    }
    void loadTrackerRecords();
  }, [workspaceId, organisationId, loadTrackerRecords]);

  const updateLessonsField = (field: keyof typeof lessonsForm, value: string) => {
    setLessonsForm(prev => ({ ...prev, [field]: value }));
  };

  const updateLessonsAction = (index: number, field: keyof (typeof lessonsActions)[number], value: string) => {
    setLessonsActions(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const updateRcaField = <K extends keyof typeof rcaForm>(field: K, value: (typeof rcaForm)[K]) => {
    setRcaForm(prev => ({ ...prev, [field]: value }));
  };

  const updateTimelineStep = (index: number, value: string) => {
    setRcaTimeline(prev => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addTimelineStep = () => setRcaTimeline(prev => [...prev, '']);

  const removeTimelineStep = (index: number) => {
    setRcaTimeline(prev => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const toggleContributingFactor = (key: keyof typeof rcaForm.contributing) => {
    if (key === 'other') return;
    setRcaForm(prev => ({
      ...prev,
      contributing: {
        ...prev.contributing,
        [key]: !prev.contributing[key],
      },
    }));
  };

  const updateRcaAction = (index: number, field: keyof (typeof rcaActions)[number], value: string) => {
    setRcaActions(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const handleLessonsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId) {
      toast({ title: 'No workspace selected', description: 'Select a workspace before saving.', variant: 'destructive' });
      return;
    }

    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'You need to be signed in to save records.', variant: 'destructive' });
      return;
    }

    try {
      setLessonsSaving(true);
      const filteredActions = lessonsActions.filter(action => action.action.trim() || action.owner.trim() || action.timescale.trim() || action.status.trim());

      await saveLessonsLearnedRecord({
        workspaceId,
        organisationId,
        actor: { id: user.id, name: user.name, email: user.email },
        payload: {
          form: lessonsForm,
          actions: filteredActions,
        },
      });

      setLessonsForm({ ...LESSONS_FORM_TEMPLATE });
      setLessonsActions([{ ...EMPTY_ACTION_ROW }]);
      await loadTrackerRecords();
      toast({ title: 'Lessons Learned saved', description: 'Your record has been saved to the workspace.' });
    } catch (error) {
      console.error('Failed to save lessons learned record', error);
      toast({ title: 'Unable to save', description: 'Please try again or contact an administrator.', variant: 'destructive' });
    } finally {
      setLessonsSaving(false);
    }
  };

  const handleRcaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspaceId) {
      toast({ title: 'No workspace selected', description: 'Select a workspace before saving.', variant: 'destructive' });
      return;
    }

    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'You need to be signed in to save records.', variant: 'destructive' });
      return;
    }

    try {
      setRcaSaving(true);
      const filteredActions = rcaActions.filter(action => action.action.trim() || action.owner.trim() || action.timescale.trim() || action.status.trim());
      const filteredTimeline = rcaTimeline.map(step => step.trim()).filter(Boolean);

      await saveRcaRecord({
        workspaceId,
        organisationId,
        actor: { id: user.id, name: user.name, email: user.email },
        payload: {
          form: rcaForm,
          actions: filteredActions,
          timeline: filteredTimeline,
        },
      });

      setRcaForm({ ...RCA_FORM_TEMPLATE });
      setRcaTimeline(['']);
      setRcaActions([{ ...EMPTY_ACTION_ROW }]);
      await loadTrackerRecords();
      toast({ title: 'RCA saved', description: 'Root cause analysis has been stored for this workspace.' });
    } catch (error) {
      console.error('Failed to save RCA record', error);
      toast({ title: 'Unable to save', description: 'Please try again or contact an administrator.', variant: 'destructive' });
    } finally {
      setRcaSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Lessons Learned & RCA"
          subtitle="Capture learning, complete root cause investigations, and keep corrective actions on track."
          leading={<NotebookPen className="h-6 w-6" />}
        />

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1800px]">
            {!isWorkspaceSelected ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Select a workspace</CardTitle>
                  <CardDescription>
                    Choose a workspace from the sidebar to capture lessons learned and root cause analysis records.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'lessons' | 'rca' | 'tracker')} className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <TabsTrigger
                      className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      value="lessons"
                    >
                      Lessons Learned
                    </TabsTrigger>
                    <TabsTrigger
                      className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      value="rca"
                    >
                      Root Cause Analysis
                    </TabsTrigger>
                    <TabsTrigger
                      className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      value="tracker"
                    >
                      Tracker
                    </TabsTrigger>
                  </TabsList>
                </div>

                <p className="text-sm text-slate-600">
                  Capture new insights, complete investigations, or revisit historic submissions from a single page.
                </p>

                <TabsContent value="lessons" className="mt-6 space-y-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                      <div className="flex flex-col gap-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <NotebookPen className="h-6 w-6" />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-blue-900">Lessons Learned</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                  Capture reflective learning following incidents, audits, or improvement work.
                                </p>
                              </div>
                            </div>
                            {workspaceName ? (
                              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">Workspace:</span> {workspaceName}
                              </div>
                            ) : null}
                          </div>

                          <Card className="rounded-2xl border border-slate-200 bg-white shadow-md">
                            <CardHeader className="space-y-1 border-b border-slate-200 bg-slate-50/60">
                              <CardTitle className="text-lg text-blue-900">Quick record options</CardTitle>
                              <CardDescription>Prefill key context before completing the full lessons learned form.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                              <div className="space-y-2">
                                <Label htmlFor="quick-lessons-date">Date &amp; Time</Label>
                                <Input
                                  id="quick-lessons-date"
                                  type="datetime-local"
                                  value={lessonsForm.date}
                                  onChange={event => updateLessonsField('date', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quick-lessons-event">Type of Event</Label>
                                <Input
                                  id="quick-lessons-event"
                                  placeholder="e.g. inspection, fall"
                                  value={lessonsForm.eventType}
                                  onChange={event => updateLessonsField('eventType', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quick-lessons-location">Location / Unit</Label>
                                <Input
                                  id="quick-lessons-location"
                                  placeholder="Location / Unit"
                                  value={lessonsForm.location}
                                  onChange={event => updateLessonsField('location', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quick-lessons-people">People Involved</Label>
                                <Textarea
                                  id="quick-lessons-people"
                                  rows={3}
                                  placeholder="Staff, residents, families"
                                  value={lessonsForm.peopleInvolved}
                                  onChange={event => updateLessonsField('peopleInvolved', event.target.value)}
                                />
                              </div>
                              <Button type="button" variant="outline" className="w-full" onClick={() => setActiveTab('rca')}>
                                Switch to RCA
                              </Button>
                            </CardContent>
                          </Card>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                          <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                            <CardTitle className="text-2xl font-semibold text-blue-900">Lessons Learned Record</CardTitle>
                            <CardDescription className="text-base text-slate-500">
                              Capture reflective learning following incidents, audits, or improvement work.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 sm:p-8">
                            <form className="space-y-8" onSubmit={handleLessonsSubmit}>
                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Event Overview</h3>
                      <p className="text-sm text-slate-500">Key context for the learning captured.</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="lessons-date">Date &amp; Time</Label>
                        <Input id="lessons-date" type="datetime-local" value={lessonsForm.date} onChange={e => updateLessonsField('date', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lessons-type">Type of Event</Label>
                        <Input id="lessons-type" placeholder="e.g. inspection, safeguarding" value={lessonsForm.eventType} onChange={e => updateLessonsField('eventType', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lessons-location">Location / Unit</Label>
                        <Input id="lessons-location" value={lessonsForm.location} onChange={e => updateLessonsField('location', e.target.value)} />
                      </div>
                      <div className="sm:col-span-2 xl:col-span-3 space-y-2">
                        <Label htmlFor="lessons-people">People Involved</Label>
                        <Textarea id="lessons-people" rows={3} placeholder="Staff, residents, families, professionals" value={lessonsForm.peopleInvolved} onChange={e => updateLessonsField('peopleInvolved', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Narrative &amp; Impact</h3>
                      <p className="text-sm text-slate-500">Document what happened and the immediate effect on people or services.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="lessons-description">Brief Description</Label>
                        <Textarea id="lessons-description" rows={4} value={lessonsForm.description} onChange={e => updateLessonsField('description', e.target.value)} />
                      </div>
                      <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="lessons-summary">Summary of Events</Label>
                        <Textarea id="lessons-summary" rows={4} value={lessonsForm.summaryOfEvents} onChange={e => updateLessonsField('summaryOfEvents', e.target.value)} />
                      </div>
                      <div className="lg:col-span-1 space-y-2">
                        <Label htmlFor="lessons-actions">Immediate Actions Taken</Label>
                        <Textarea id="lessons-actions" rows={3} value={lessonsForm.immediateActions} onChange={e => updateLessonsField('immediateActions', e.target.value)} />
                      </div>
                      <div className="lg:col-span-1 space-y-2">
                        <Label htmlFor="lessons-impact">Impact on Residents / Staff / Service</Label>
                        <Textarea id="lessons-impact" rows={3} value={lessonsForm.impact} onChange={e => updateLessonsField('impact', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Reflection &amp; Learning</h3>
                      <p className="text-sm text-slate-500">Capture the positives, gaps, and key takeaways.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="lessons-positives">What Went Well?</Label>
                        <Textarea id="lessons-positives" rows={4} value={lessonsForm.positives} onChange={e => updateLessonsField('positives', e.target.value)} placeholder="Good practice, effective teamwork, positive feedback" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lessons-improvements">What Could Have Been Better?</Label>
                        <Textarea id="lessons-improvements" rows={4} value={lessonsForm.improvements} onChange={e => updateLessonsField('improvements', e.target.value)} placeholder="Challenges, gaps, resource issues" />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="lessons-learned">Lessons Learned</Label>
                        <Textarea id="lessons-learned" rows={4} value={lessonsForm.lessonsLearned} onChange={e => updateLessonsField('lessonsLearned', e.target.value)} placeholder="Key insights and takeaways" />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="lessons-causes">Underlying Causes Identified</Label>
                        <Textarea id="lessons-causes" rows={4} value={lessonsForm.underlyingCauses} onChange={e => updateLessonsField('underlyingCauses', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-blue-900">Actions for Improvement</h3>
                        <p className="text-sm text-slate-500">Track follow-up tasks with owners and timelines.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setLessonsActions(prev => [...prev, { ...EMPTY_ACTION_ROW }])}>
                        <Plus className="mr-2 h-4 w-4" /> Add Action
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {lessonsActions.map((row, index) => (
                        <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                          <div className="grid gap-4 lg:grid-cols-5">
                            <div className="space-y-2 lg:col-span-2">
                              <Label>Action Required</Label>
                              <Textarea rows={2} value={row.action} onChange={e => updateLessonsAction(index, 'action', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Responsible Person</Label>
                              <Input value={row.owner} onChange={e => updateLessonsAction(index, 'owner', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Timescale</Label>
                              <Input value={row.timescale} onChange={e => updateLessonsAction(index, 'timescale', e.target.value)} placeholder="e.g. 4 weeks" />
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Input value={row.status} onChange={e => updateLessonsAction(index, 'status', e.target.value)} placeholder="e.g. In progress" />
                            </div>
                          </div>
                          {lessonsActions.length > 1 && (
                            <div className="flex justify-end">
                              <Button type="button" variant="ghost" className="text-destructive" onClick={() => setLessonsActions(prev => prev.filter((_, idx) => idx !== index))}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Monitoring &amp; Oversight</h3>
                      <p className="text-sm text-slate-500">Outline who will monitor the actions and when they will be reviewed.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="lessons-monitoring">Monitoring &amp; Follow-up</Label>
                        <Textarea id="lessons-monitoring" rows={4} value={lessonsForm.monitoring} onChange={e => updateLessonsField('monitoring', e.target.value)} placeholder="How will improvements be measured?" />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="lessons-oversight">Responsible for Oversight</Label>
                          <Input id="lessons-oversight" value={lessonsForm.oversight} onChange={e => updateLessonsField('oversight', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lessons-review">Review Date</Label>
                          <Input id="lessons-review" type="date" value={lessonsForm.reviewDate} onChange={e => updateLessonsField('reviewDate', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Communication &amp; Sharing</h3>
                      <p className="text-sm text-slate-500">Plan how the learning will be cascaded to staff, residents, and external partners.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="lessons-sharing">Sharing with Staff</Label>
                        <Textarea id="lessons-sharing" rows={3} value={lessonsForm.sharingPlan} onChange={e => updateLessonsField('sharingPlan', e.target.value)} placeholder="Handover, meetings, newsletters" />
                      </div>
                      <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="lessons-families">Families / Residents Informed?</Label>
                        <Textarea id="lessons-families" rows={3} value={lessonsForm.familiesInformed} onChange={e => updateLessonsField('familiesInformed', e.target.value)} />
                      </div>
                      <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="lessons-external">External Agencies Notified?</Label>
                        <Textarea id="lessons-external" rows={3} value={lessonsForm.externalAgencies} onChange={e => updateLessonsField('externalAgencies', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={lessonsSaving} className="min-w-[160px] bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow-md px-4 py-2 disabled:opacity-60">
                      {lessonsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {lessonsSaving ? 'Saving…' : 'Save Lessons Learned'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

                <TabsContent value="rca" className="mt-6 space-y-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                      <div className="flex flex-col gap-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <NotebookPen className="h-6 w-6" />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-blue-900">Root Cause Analysis</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                  Document investigative findings, contributing factors, and corrective actions.
                                </p>
                              </div>
                            </div>
                            {workspaceName ? (
                              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">Workspace:</span> {workspaceName}
                              </div>
                            ) : null}
                          </div>

                          <Card className="rounded-2xl border border-slate-200 bg-white shadow-md">
                            <CardHeader className="space-y-1 border-b border-slate-200 bg-slate-50/60">
                              <CardTitle className="text-lg text-blue-900">Quick investigation setup</CardTitle>
                              <CardDescription>Capture the essentials before working through the full RCA.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                              <div className="space-y-2">
                                <Label htmlFor="quick-rca-date">Date &amp; Time of Event</Label>
                                <Input
                                  id="quick-rca-date"
                                  type="datetime-local"
                                  value={rcaForm.date}
                                  onChange={event => updateRcaField('date', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quick-rca-event">Type of Event</Label>
                                <Input
                                  id="quick-rca-event"
                                  placeholder="e.g. fall, medication error"
                                  value={rcaForm.eventType}
                                  onChange={event => updateRcaField('eventType', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quick-rca-location">Location / Unit</Label>
                                <Input
                                  id="quick-rca-location"
                                  placeholder="Location / Unit"
                                  value={rcaForm.location}
                                  onChange={event => updateRcaField('location', event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quick-rca-people">People Involved</Label>
                                <Textarea
                                  id="quick-rca-people"
                                  rows={3}
                                  placeholder="Staff, residents, witnesses"
                                  value={rcaForm.peopleInvolved}
                                  onChange={event => updateRcaField('peopleInvolved', event.target.value)}
                                />
                              </div>
                              <Button type="button" variant="outline" className="w-full" onClick={() => setActiveTab('lessons')}>
                                Switch to Lessons
                              </Button>
                            </CardContent>
                          </Card>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                          <CardTitle className="text-2xl font-semibold text-blue-900">Root Cause Analysis</CardTitle>
                          <CardDescription className="text-base text-slate-500">
                            Document investigative findings, contributing factors, and corrective actions.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8">
                          <form className="space-y-8" onSubmit={handleRcaSubmit}>
                            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Investigation Overview</h3>
                      <p className="text-sm text-slate-500">Summarise the event under investigation and the evidence gathered.</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="rca-date">Date &amp; Time of Event</Label>
                        <Input id="rca-date" type="datetime-local" value={rcaForm.date} onChange={e => updateRcaField('date', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rca-type">Type of Event</Label>
                        <Input id="rca-type" placeholder="e.g. fall, medication error" value={rcaForm.eventType} onChange={e => updateRcaField('eventType', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rca-location">Location / Unit</Label>
                        <Input id="rca-location" value={rcaForm.location} onChange={e => updateRcaField('location', e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                        <Label htmlFor="rca-people">People Involved</Label>
                        <Textarea id="rca-people" rows={3} value={rcaForm.peopleInvolved} onChange={e => updateRcaField('peopleInvolved', e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="rca-summary">Brief Summary of What Happened</Label>
                        <Textarea id="rca-summary" rows={4} value={rcaForm.summary} onChange={e => updateRcaField('summary', e.target.value)} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="rca-info">Sources of Information</Label>
                        <Textarea id="rca-info" rows={4} placeholder="Incident reports, witness statements, care plans..." value={rcaForm.infoSources} onChange={e => updateRcaField('infoSources', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-blue-900">Timeline &amp; Key Moments</h3>
                        <p className="text-sm text-slate-500">Reconstruct the sequence of events leading up to and following the incident.</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={addTimelineStep}>
                        <Plus className="mr-2 h-4 w-4" /> Add Step
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {rcaTimeline.map((step, index) => (
                        <div key={index} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start">
                          <Input value={step} onChange={e => updateTimelineStep(index, e.target.value)} placeholder={`Timeline entry ${index + 1}`} className="flex-1" />
                          {rcaTimeline.length > 1 && (
                            <Button type="button" variant="ghost" className="text-destructive" onClick={() => removeTimelineStep(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Impact Assessment</h3>
                      <p className="text-sm text-slate-500">Capture the effect on residents, staff, and wider service delivery.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="rca-impact-resident">Resident(s) Affected</Label>
                        <Textarea id="rca-impact-resident" rows={3} placeholder="Physical, emotional, social impact" value={rcaForm.impactResidents} onChange={e => updateRcaField('impactResidents', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rca-impact-staff">Staff Impact</Label>
                        <Textarea id="rca-impact-staff" rows={3} value={rcaForm.impactStaff} onChange={e => updateRcaField('impactStaff', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rca-impact-service">Wider Service Impact</Label>
                        <Textarea id="rca-impact-service" rows={3} placeholder="Compliance risk, reputation, disruption" value={rcaForm.impactService} onChange={e => updateRcaField('impactService', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Contributing Factors</h3>
                      <p className="text-sm text-slate-500">Highlight the factors that influenced the incident.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {([
                        { key: 'human', label: 'Human factors (training, fatigue, stress, communication)' },
                        { key: 'environment', label: 'Environment (layout, lighting, equipment, signage)' },
                        { key: 'systems', label: 'Systems / Processes (policies, procedures, record keeping)' },
                        { key: 'equipment', label: 'Equipment / Resources (availability, maintenance, suitability)' },
                        { key: 'leadership', label: 'Leadership / Management (supervision, culture, workload)' },
                        { key: 'external', label: 'External (family dynamics, visiting professionals, providers)' },
                      ] as const).map(option => (
                        <label key={option.key} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                          <Checkbox checked={rcaForm.contributing[option.key]} onCheckedChange={() => toggleContributingFactor(option.key)} />
                          <span className="leading-snug text-slate-500">{option.label}</span>
                        </label>
                      ))}
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="rca-contributing-other">Other</Label>
                        <Textarea id="rca-contributing-other" rows={2} value={rcaForm.contributing.other} onChange={e => updateRcaField('contributing', { ...rcaForm.contributing, other: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Root Cause &amp; Learning</h3>
                      <p className="text-sm text-slate-500">Analyse why the event occurred and how to prevent recurrence.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="rca-why">Why did this happen?</Label>
                        <Textarea id="rca-why" rows={4} placeholder="Use 5 Whys or Fishbone analysis" value={rcaForm.rootWhy} onChange={e => updateRcaField('rootWhy', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rca-issues">Underlying Issues Identified</Label>
                        <Textarea id="rca-issues" rows={4} value={rcaForm.underlyingIssues} onChange={e => updateRcaField('underlyingIssues', e.target.value)} />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="rca-lessons">Lessons Learned</Label>
                        <Textarea id="rca-lessons" rows={4} value={rcaForm.lessonsTakeaway} onChange={e => updateRcaField('lessonsTakeaway', e.target.value)} placeholder="Key takeaways from the event" />
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="rca-prevention">How to Prevent Recurrence</Label>
                        <Textarea id="rca-prevention" rows={4} value={rcaForm.lessonsPrevention} onChange={e => updateRcaField('lessonsPrevention', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-blue-900">Action Plan</h3>
                        <p className="text-sm text-slate-500">Assign responsibilities and monitor progress.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setRcaActions(prev => [...prev, { ...EMPTY_ACTION_ROW }])}>
                        <Plus className="mr-2 h-4 w-4" /> Add Action
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {rcaActions.map((row, index) => (
                        <div key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                          <div className="grid gap-4 lg:grid-cols-5">
                            <div className="space-y-2 lg:col-span-2">
                              <Label>Action Required</Label>
                              <Textarea rows={2} value={row.action} onChange={e => updateRcaAction(index, 'action', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Responsible Person</Label>
                              <Input value={row.owner} onChange={e => updateRcaAction(index, 'owner', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Timescale</Label>
                              <Input value={row.timescale} onChange={e => updateRcaAction(index, 'timescale', e.target.value)} placeholder="e.g. 6 weeks" />
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Input value={row.status} onChange={e => updateRcaAction(index, 'status', e.target.value)} placeholder="e.g. Not started" />
                            </div>
                          </div>
                          {rcaActions.length > 1 && (
                            <div className="flex justify-end">
                              <Button type="button" variant="ghost" className="text-destructive" onClick={() => setRcaActions(prev => prev.filter((_, idx) => idx !== index))}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-blue-900">Review &amp; Monitoring</h3>
                      <p className="text-sm text-slate-500">Schedule future checks and define how success will be measured.</p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="rca-review-date">Follow-up Review Date</Label>
                        <Input id="rca-review-date" type="date" value={rcaForm.reviewDate} onChange={e => updateRcaField('reviewDate', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rca-review-owner">Person Responsible for Review</Label>
                        <Input id="rca-review-owner" value={rcaForm.reviewOwner} onChange={e => updateRcaField('reviewOwner', e.target.value)} />
                      </div>
                      <div className="space-y-2 lg:col-span-1">
                        <Label htmlFor="rca-measurement">How Improvements Will Be Measured</Label>
                        <Textarea id="rca-measurement" rows={3} value={rcaForm.reviewMeasurement} onChange={e => updateRcaField('reviewMeasurement', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={rcaSaving} className="min-w-[160px] bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow-md px-4 py-2 disabled:opacity-60">
                      {rcaSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {rcaSaving ? 'Saving…' : 'Save RCA'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            </div>
          </div>
        </TabsContent>

                <TabsContent value="tracker" className="mt-6 space-y-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                      <div className="flex flex-col gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <NotebookPen className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-blue-900">History &amp; Insights</h2>
                              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Drill into saved lessons learned entries and root cause analyses organised by month.
                              </p>
                            </div>
                          </div>
                          {workspaceName ? (
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                              <span className="font-semibold text-slate-800">Workspace:</span> {workspaceName}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-blue-900">Capture something new</h3>
                            <p className="text-sm text-slate-500">Start a fresh submission or refresh the tracker to pull the latest updates.</p>
                          </div>
                          <div className="mt-4 grid gap-3">
                            <Button type="button" variant="outline" onClick={() => setActiveTab('lessons')}>
                              New Lessons Learned
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setActiveTab('rca')}>
                              New Root Cause Analysis
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void loadTrackerRecords()}
                              disabled={trackerLoading}
                              className="flex items-center justify-center"
                            >
                              {trackerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                              Refresh Records
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-6">
                      {trackerLoading && trackerRecords.length === 0 ? (
                        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-14">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                        </div>
                      ) : trackerRecords.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            No records saved yet. Capture a lesson learned or RCA to see it appear here.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-6">
                            {availableYears.map(year => {
                              const entries = monthsGroupedByYear[year] ?? [];
                              const isSelectedYear = selectedMonthKey?.startsWith(String(year)) ?? false;
                              const savedMonthsCount = entries.reduce((total, entry) => total + (entry.count > 0 ? 1 : 0), 0);
                              return (
                                <div key={year} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <h2 className="text-lg font-semibold text-blue-900">{year} Tracker</h2>
                                      <p className="text-sm text-slate-500">Choose a month to review lessons learned and RCA history.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{savedMonthsCount} months saved</span>
                                      {isSelectedYear && (
                                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className="flex items-center gap-2 border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                                            >
                                              <CalendarIcon className="h-4 w-4" />
                                              <span>Jump to month</span>
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
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                    {entries.map(entry => {
                                      const hasData = entry.count > 0;
                                      const isSelected = selectedMonthKey === entry.monthKey;
                                      return (
                                        <button
                                          key={entry.monthKey}
                                          type="button"
                                          onClick={() => handleSelectMonth(entry.monthKey)}
                                          className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                                            hasData
                                              ? 'bg-white hover:border-blue-300 hover:shadow-md'
                                              : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300'
                                          } ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className={`text-sm font-semibold ${hasData ? 'text-slate-900' : 'text-slate-500'}`}>
                                              {MONTH_SHORT_LABELS[entry.monthIndex]}
                                            </span>
                                            {hasData ? (
                                              <span className="text-xs font-medium text-blue-600">
                                                {entry.count === 1 ? '1 entry' : `${entry.count} entries`}
                                              </span>
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
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <h3 className="text-xl font-semibold text-blue-900">{selectedMonthLabel || 'Tracker history'}</h3>
                                  <p className="text-sm text-slate-600">
                                    {completedRecordTypes} of {totalRecordTypes} record types captured • {selectedMonthRecordCount} total entries
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                    <Clock className="h-3.5 w-3.5" />
                                    {selectedMonthRecordCount} saved
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void loadTrackerRecords()}
                                    disabled={trackerLoading}
                                    className="w-full sm:w-auto"
                                  >
                                    {trackerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Refresh
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {TRACKER_CARD_META.map(meta => {
                                  const recordsForType = selectedMonthRecordsByType[meta.type];
                                  const latestRecord = recordsForType[0] ?? null;
                                  const hasRecord = recordsForType.length > 0;
                                  const isCurrentSelection = selectedMonthKey === currentMonthKey;
                                  const statusBadgeClasses = hasRecord
                                    ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
                                    : isCurrentSelection
                                      ? 'border border-blue-200 bg-blue-50 text-blue-600'
                                      : 'border border-slate-200 bg-slate-100 text-slate-600';
                                  const statusText = hasRecord ? 'Saved' : isCurrentSelection ? 'Pending' : 'No records';
                                  const Icon = meta.icon;
                                  return (
                                    <div
                                      key={meta.type}
                                      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm transition-all hover:shadow-lg"
                                    >
                                      <div className={`relative h-1 w-full rounded-full bg-gradient-to-r ${meta.accentGradient}`} />
                                      <div className="relative z-10 mt-4 flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                          <div className={`rounded-xl bg-gradient-to-br p-2.5 shadow-sm ${meta.iconGradient}`}>
                                            <Icon className={`h-4 w-4 ${meta.iconColor}`} />
                                          </div>
                                          <div>
                                            <h4 className="text-base font-semibold text-slate-900">{meta.title}</h4>
                                            <p className="text-xs text-slate-500">{meta.description}</p>
                                          </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClasses}`}>
                                          {hasRecord ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                          {statusText}
                                        </span>
                                      </div>
                                      <div className="relative z-10 mt-4 flex flex-1 flex-col justify-between gap-3 text-sm text-slate-700">
                                        {hasRecord ? (
                                          <div className="space-y-2 text-xs text-slate-600">
                                            <div className="flex items-center gap-2">
                                              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                                              Saved {latestRecord ? formatDateTime(latestRecord.createdAt) : '—'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                                              {recordsForType.length === 1 ? '1 entry captured' : `${recordsForType.length} entries captured`}
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-slate-500">{meta.emptyHint}</p>
                                        )}
                                        <div className="flex items-center gap-3">
                                          {hasRecord ? (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => latestRecord && setSelectedRecord(latestRecord)}
                                              className="flex-1"
                                            >
                                              <Info className="mr-2 h-4 w-4" />
                                              View latest entry
                                            </Button>
                                          ) : (
                                            <div className="text-xs text-slate-500">
                                              {isCurrentSelection ? 'No records captured yet this month.' : 'No records saved for this month.'}
                                            </div>
                                          )}
                                          {isCurrentSelection && (
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => setActiveTab(RECORD_TYPE_TO_TAB[meta.type])}
                                              className="ml-auto h-9 w-9 rounded-full border border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100"
                                            >
                                              <Plus className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {selectedMonthRecords.length === 0 ? (
                                  <div className="p-10 text-center text-sm text-slate-500">
                                    No records saved for {selectedMonthLabel ?? 'this month'} yet.
                                  </div>
                                ) : (
                                  <Table>
                                    <TableHeader className="bg-muted/60">
                                      <TableRow className="text-xs uppercase tracking-wide">
                                        <TableHead className="w-48">Type</TableHead>
                                        <TableHead>Summary</TableHead>
                                        <TableHead className="w-48">Date &amp; Time</TableHead>
                                        <TableHead className="w-48">Recorded By</TableHead>
                                        <TableHead className="w-32 text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedMonthRecords.map(record => (
                                        <TableRow key={`${record.recordType}-${record.id}`} className="transition-colors hover:bg-muted/40">
                                          <TableCell>
                                            <Badge variant={record.recordType === 'lessons-learned' ? 'secondary' : 'default'}>
                                              {RECORD_LABELS[record.recordType]}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm text-slate-500">
                                            <span className="line-clamp-2">
                                              {record.recordType === 'lessons-learned'
                                                ? record.form.summaryOfEvents || record.form.description || '—'
                                                : record.form.summary || record.form.eventType || '—'}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-sm font-medium text-foreground">{formatDateTime(record.createdAt)}</TableCell>
                                          <TableCell className="text-sm text-slate-500">{record.createdBy?.name || record.createdBy?.email || 'Unknown'}</TableCell>
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
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={open => setSelectedRecord(open ? selectedRecord : null)}>
          <DialogContent className="flex max-h-[85vh] min-h-[60vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl p-0">
            {selectedRecord ? (
              <>
                <DialogHeader className="border-b px-6 py-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Badge variant={selectedRecord.recordType === 'lessons-learned' ? 'secondary' : 'default'}>
                      {RECORD_LABELS[selectedRecord.recordType]}
                    </Badge>
                    <span>
                      {selectedRecord.recordType === 'lessons-learned'
                        ? selectedRecord.form.eventType || 'Lessons Learned Record'
                        : selectedRecord.form.eventType || 'Root Cause Analysis'}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    Saved {formatDateTime(selectedRecord.createdAt)}
                    {selectedRecord.createdBy?.name ? ` • ${selectedRecord.createdBy.name}` : selectedRecord.createdBy?.email ? ` • ${selectedRecord.createdBy.email}` : ''}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6">
                  <div className="mx-auto w-full max-w-3xl space-y-8 py-6 pr-2">
                    {selectedRecord.recordType === 'lessons-learned'
                      ? renderLessonsDetail(selectedRecord.form, selectedRecord.actions)
                      : renderRcaDetail(selectedRecord.form, selectedRecord.actions, selectedRecord.timeline ?? [])}
                  </div>
                </ScrollArea>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
    </>
  );
}
