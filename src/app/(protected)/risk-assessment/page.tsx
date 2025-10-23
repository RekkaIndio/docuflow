'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertTriangle, Loader2, RefreshCcw, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Info, Target } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/page-header';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { saveRiskAssessmentRecord } from '@/actions/risk-assessments';
import { workspaceCollectionPath } from '@/lib/paths';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';

const RISK_ASSESSMENT_FORM_TEMPLATE = {
  careHomeName: '',
  risk: '',
  assessmentConductedBy: '',
  position: '',
  dateOfAssessment: '',
  reviewDate: '',
  describeHazard: '',
  personsAtRisk: {
    relatives: false,
    staff: false,
    visitors: false,
    contractors: false,
    deliveryPersonnel: false,
  },
  likelihood: '',
  riskPrevention: '',
  whatMayOccur: '',
  responsible: '',
  reviewPeriod: '',
};

type TrackerRecord = {
  id: string;
  recordType: 'risk-assessment';
  createdAt: Date;
  form: Record<string, any>;
  createdBy?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
};

const RECORD_LABELS: Record<TrackerRecord['recordType'], string> = {
  'risk-assessment': 'Risk Assessment',
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

const RECORD_TYPE_TO_TAB: Record<TrackerRecord['recordType'], 'assessment'> = {
  'risk-assessment': 'assessment',
};

const TRACKER_CARD_META = [
  {
    type: 'risk-assessment' as const,
    title: 'Risk Assessment Entry',
    description: 'Document risk assessments and mitigation strategies.',
    accentGradient: 'from-red-500 to-orange-500',
    iconGradient: 'from-red-100 to-orange-100',
    iconColor: 'text-red-600',
    icon: AlertTriangle,
    emptyHint: 'Switch to the Assessment tab to record a new risk assessment.',
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

const formatInputDate = (value?: string) => {
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

const renderRiskAssessmentDetail = (form: Record<string, any>) => {
  const likelihoodLabels = {
    '1': 'Rare – unlikely to occur (Low)',
    '2': 'Possible – could happen (Medium)',
    '3': 'Likely – happens sometimes (High)',
    '4': 'Very Likely – occurs often (Extremely High)',
  };

  const personsAtRisk = form?.personsAtRisk ?? {};
  const selectedPersons = Object.keys(personsAtRisk).filter(key => personsAtRisk[key]);
  const personLabels = {
    relatives: 'Relatives',
    staff: 'Staff',
    visitors: 'Visitors',
    contractors: 'Contractors',
    deliveryPersonnel: 'Delivery Personnel',
  };

  const sections: { title: string; fields: FieldDescriptor[] }[] = [
    {
      title: 'Assessment Details',
      fields: [
        { key: 'careHomeName', label: 'Care Home Name' },
        { key: 'risk', label: 'Risk' },
        { key: 'assessmentConductedBy', label: 'Assessment Conducted By' },
        { key: 'position', label: 'Position' },
        { key: 'dateOfAssessment', label: 'Date of Assessment', format: formatInputDate },
        { key: 'reviewDate', label: 'Review Date', format: formatInputDate },
      ],
    },
    {
      title: 'Hazard Description',
      fields: [
        { key: 'describeHazard', label: 'Describe Hazard/Risk', fullWidth: true },
      ],
    },
    {
      title: 'Persons at Risk',
      fields: [],
    },
    {
      title: 'Risk Rating',
      fields: [],
    },
    {
      title: 'Prevention and Responsibility',
      fields: [
        { key: 'riskPrevention', label: 'Risk Prevention', fullWidth: true },
        { key: 'whatMayOccur', label: 'What May Occur if Preventatives Not in Place', fullWidth: true },
        { key: 'responsible', label: 'Who is Responsible for Ensuring Preventatives', fullWidth: true },
        { key: 'reviewPeriod', label: 'Review Time Period' },
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
          {section.title === 'Persons at Risk' ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Persons at Risk</p>
              {selectedPersons.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPersons.map(key => (
                    <Badge key={key} variant="outline">{personLabels[key as keyof typeof personLabels]}</Badge>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">None selected</div>
              )}
            </div>
          ) : section.title === 'Risk Rating' ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Likelihood</p>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {likelihoodLabels[form?.likelihood as keyof typeof likelihoodLabels] || 'Not specified'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {section.fields.map(field => renderReadOnlyField(form, field))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function RiskAssessmentPage() {
  const { toast } = useToast();
  const workspace = useWorkspace();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'assessment' | 'tracker'>('assessment');

  const workspaceId = workspace?.id ?? '';
  const organisationId = workspace?.organisationId ?? null;
  const workspaceName = workspace?.name ?? '';
  const isWorkspaceSelected = Boolean(workspaceId);

  const [form, setForm] = useState({ ...RISK_ASSESSMENT_FORM_TEMPLATE });
  const [saving, setSaving] = useState(false);
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
      'risk-assessment': [],
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
      const collectionPath = workspaceCollectionPath(workspaceId, 'risk-assessments', organisationId ?? undefined);
      if (!collectionPath) {
        setTrackerRecords([]);
        return;
      }
      const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
          id: docSnap.id,
          recordType: 'risk-assessment' as const,
          createdAt,
          form: data.form ?? {},
          createdBy: data.createdBy ?? null,
        } as TrackerRecord;
      });
      setTrackerRecords(records);
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

  const updateField = (field: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updatePersonsAtRisk = (key: keyof typeof form.personsAtRisk, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      personsAtRisk: { ...prev.personsAtRisk, [key]: checked },
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      setSaving(true);
      await saveRiskAssessmentRecord({
        workspaceId,
        organisationId,
        actor: { id: user.id, name: user.name, email: user.email },
        payload: { form },
      });

      setForm({ ...RISK_ASSESSMENT_FORM_TEMPLATE });
      await loadTrackerRecords();
      toast({ title: 'Risk Assessment saved', description: 'Your record has been saved to the workspace.' });
    } catch (error) {
      console.error('Failed to save risk assessment record', error);
      toast({ title: 'Unable to save', description: 'Please try again or contact an administrator.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Risk Assessment"
          subtitle="Document and assess potential risks with mitigation strategies."
          leading={<AlertTriangle className="h-6 w-6" />}
        />

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1800px]">
            {!isWorkspaceSelected ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Select a workspace</CardTitle>
                  <CardDescription>
                    Choose a workspace from the sidebar to create risk assessments.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'assessment' | 'tracker')} className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <TabsTrigger
                      className="rounded-xl px-4 py-1.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      value="assessment"
                    >
                      Risk Assessment
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
                  Create new risk assessments or review historical records.
                </p>

                <TabsContent value="assessment" className="mt-6 space-y-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="w-full flex-shrink-0 lg:w-[360px] xl:w-[400px] lg:self-start lg:sticky lg:top-24 lg:h-fit">
                      <div className="flex flex-col gap-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700">
                                <AlertTriangle className="h-6 w-6" />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-red-900">Risk Assessment</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                  Document potential risks and implement prevention strategies.
                                </p>
                              </div>
                            </div>
                            {workspaceName ? (
                              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">Workspace:</span> {workspaceName}
                              </div>
                            ) : null}
                          </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                          <CardHeader className="space-y-2 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                            <CardTitle className="text-2xl font-semibold text-red-900">Risk Assessment Form</CardTitle>
                            <CardDescription className="text-base text-slate-500">
                              Complete the risk assessment to identify and mitigate potential hazards.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 sm:p-8">
                            <form className="space-y-8" onSubmit={handleSubmit}>
                              <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold text-red-900">Assessment Details</h3>
                                  <p className="text-sm text-slate-500">Basic information about the assessment.</p>
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="careHomeName">Care Home Name</Label>
                                    <Input id="careHomeName" value={form.careHomeName} onChange={e => updateField('careHomeName', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="risk">Risk</Label>
                                    <Input id="risk" value={form.risk} onChange={e => updateField('risk', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="assessmentConductedBy">Assessment Conducted By</Label>
                                    <Input id="assessmentConductedBy" value={form.assessmentConductedBy} onChange={e => updateField('assessmentConductedBy', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="position">Position</Label>
                                    <Input id="position" value={form.position} onChange={e => updateField('position', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="dateOfAssessment">Date of Assessment</Label>
                                    <Input id="dateOfAssessment" type="date" value={form.dateOfAssessment} onChange={e => updateField('dateOfAssessment', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="reviewDate">Review Date</Label>
                                    <Input id="reviewDate" type="date" value={form.reviewDate} onChange={e => updateField('reviewDate', e.target.value)} />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold text-red-900">Hazard Description</h3>
                                  <p className="text-sm text-slate-500">Describe the hazard or risk in detail.</p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="describeHazard">Describe Hazard/Risk</Label>
                                  <Textarea id="describeHazard" rows={4} value={form.describeHazard} onChange={e => updateField('describeHazard', e.target.value)} />
                                </div>
                              </div>

                              <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold text-red-900">Persons at Risk</h3>
                                  <p className="text-sm text-slate-500">Select all persons who may be at risk.</p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  {[
                                    { key: 'relatives' as const, label: 'Relatives' },
                                    { key: 'staff' as const, label: 'Staff' },
                                    { key: 'visitors' as const, label: 'Visitors' },
                                    { key: 'contractors' as const, label: 'Contractors' },
                                    { key: 'deliveryPersonnel' as const, label: 'Delivery Personnel' },
                                  ].map(option => (
                                    <label key={option.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                      <Checkbox checked={form.personsAtRisk[option.key]} onCheckedChange={checked => updatePersonsAtRisk(option.key, !!checked)} />
                                      <span className="leading-snug text-slate-500">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold text-red-900">Risk Rating Matrix</h3>
                                  <p className="text-sm text-slate-500">Assess the likelihood of the risk occurring.</p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Likelihood</Label>
                                  <RadioGroup value={form.likelihood} onValueChange={value => updateField('likelihood', value)}>
                                    <div className="grid gap-2">
                                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                        <RadioGroupItem value="1" />
                                        <span>Rare – unlikely to occur (Low)</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                        <RadioGroupItem value="2" />
                                        <span>Possible – could happen (Medium)</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                        <RadioGroupItem value="3" />
                                        <span>Likely – happens sometimes (High)</span>
                                      </label>
                                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                        <RadioGroupItem value="4" />
                                        <span>Very Likely – occurs often (Extremely High)</span>
                                      </label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              </div>

                              <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold text-red-900">Prevention and Responsibility</h3>
                                  <p className="text-sm text-slate-500">Outline prevention measures and responsibilities.</p>
                                </div>
                                <div className="grid gap-6 lg:grid-cols-2">
                                  <div className="space-y-2 lg:col-span-2">
                                    <Label htmlFor="riskPrevention">Risk Prevention</Label>
                                    <Textarea id="riskPrevention" rows={4} placeholder="Describe the preventions you have put into place" value={form.riskPrevention} onChange={e => updateField('riskPrevention', e.target.value)} />
                                  </div>
                                  <div className="space-y-2 lg:col-span-2">
                                    <Label htmlFor="whatMayOccur">What May Occur if These Preventatives Are Not in Place</Label>
                                    <Textarea id="whatMayOccur" rows={4} value={form.whatMayOccur} onChange={e => updateField('whatMayOccur', e.target.value)} />
                                  </div>
                                  <div className="space-y-2 lg:col-span-2">
                                    <Label htmlFor="responsible">Who is Responsible for Ensuring These Preventatives Are in Place</Label>
                                    <Textarea id="responsible" rows={4} value={form.responsible} onChange={e => updateField('responsible', e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Review Time Period</Label>
                                    <RadioGroup value={form.reviewPeriod} onValueChange={value => updateField('reviewPeriod', value)}>
                                      <div className="grid gap-2 md:grid-cols-2">
                                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                          <RadioGroupItem value="6" />
                                          <span>6 months</span>
                                        </label>
                                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                          <RadioGroupItem value="12" />
                                          <span>12 months</span>
                                        </label>
                                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                          <RadioGroupItem value="18" />
                                          <span>18 months</span>
                                        </label>
                                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                                          <RadioGroupItem value="24" />
                                          <span>24 months</span>
                                        </label>
                                      </div>
                                    </RadioGroup>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end gap-3">
                                <Button type="submit" disabled={saving} className="min-w-[160px] bg-red-800 hover:bg-red-900 text-white rounded-xl shadow-md px-4 py-2 disabled:opacity-60">
                                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  {saving ? 'Saving…' : 'Save Risk Assessment'}
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
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700">
                              <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-red-900">History &amp; Insights</h2>
                              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Review saved risk assessments organised by month.
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
                            <h3 className="text-lg font-semibold text-red-900">Create new assessment</h3>
                            <p className="text-sm text-slate-500">Switch to the Assessment tab to add a new risk assessment.</p>
                          </div>
                          <div className="mt-4 grid gap-3">
                            <Button type="button" variant="outline" onClick={() => setActiveTab('assessment')}>
                              New Risk Assessment
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
                          <Loader2 className="h-6 w-6 animate-spin text-red-700" />
                        </div>
                      ) : trackerRecords.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            No risk assessments saved yet. Create your first assessment to see it appear here.
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
                                      <h2 className="text-lg font-semibold text-red-900">{year} Tracker</h2>
                                      <p className="text-sm text-slate-500">Choose a month to review risk assessments.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{savedMonthsCount} months saved</span>
                                      {isSelectedYear && (
                                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              className="flex items-center gap-2 border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-red-300 hover:bg-red-50"
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
                                          className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-red-200 ${
                                            hasData
                                              ? 'bg-white hover:border-red-300 hover:shadow-md'
                                              : 'border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300'
                                          } ${isSelected ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className={`text-sm font-semibold ${hasData ? 'text-slate-900' : 'text-slate-500'}`}>
                                              {MONTH_SHORT_LABELS[entry.monthIndex]}
                                            </span>
                                            {hasData ? (
                                              <span className="text-xs font-medium text-red-600">
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
                                  <h3 className="text-xl font-semibold text-red-900">{selectedMonthLabel || 'Tracker history'}</h3>
                                  <p className="text-sm text-slate-600">
                                    {completedRecordTypes} of {totalRecordTypes} record types captured • {selectedMonthRecordCount} total entries
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
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

                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
                                {TRACKER_CARD_META.map(meta => {
                                  const recordsForType = selectedMonthRecordsByType[meta.type];
                                  const latestRecord = recordsForType[0] ?? null;
                                  const hasRecord = recordsForType.length > 0;
                                  const isCurrentSelection = selectedMonthKey === currentMonthKey;
                                  const statusBadgeClasses = hasRecord
                                    ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
                                    : isCurrentSelection
                                      ? 'border border-red-200 bg-red-50 text-red-600'
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
                                              onClick={() => setActiveTab('assessment')}
                                              className="ml-auto h-9 w-9 rounded-full border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100"
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
                                    No risk assessments saved for {selectedMonthLabel ?? 'this month'} yet.
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
                                            <Badge variant="default">
                                              {RECORD_LABELS[record.recordType]}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm text-slate-500">
                                            <span className="line-clamp-2">
                                              {record.form.risk || record.form.describeHazard || '—'}
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
                    <Badge variant="default">
                      {RECORD_LABELS[selectedRecord.recordType]}
                    </Badge>
                    <span>
                      {selectedRecord.form.risk || 'Risk Assessment Record'}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    Saved {formatDateTime(selectedRecord.createdAt)}
                    {selectedRecord.createdBy?.name ? ` • ${selectedRecord.createdBy.name}` : selectedRecord.createdBy?.email ? ` • ${selectedRecord.createdBy.email}` : ''}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6">
                  <div className="mx-auto w-full max-w-3xl space-y-8 py-6 pr-2">
                    {renderRiskAssessmentDetail(selectedRecord.form)}
                  </div>
                </ScrollArea>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
    </>
  );
}