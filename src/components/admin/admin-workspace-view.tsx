"use client";
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import type { Workspace, Folder, Document } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TeamsView } from '@/components/dashboard/teams-view';
import { NewTeamDialog } from '@/components/dashboard/new-team-dialog';
import { collection, query as fsQuery, orderBy, limit, onSnapshot, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc, getDocs } from 'firebase/firestore';
import { MonthlyActionPlan, ActionPlanItem } from '@/lib/action-plans';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';

type TrackerRecord = {
  id: string;
  recordType: 'risk-assessment' | 'appraisal-supervision';
  createdAt: Date;
  form: Record<string, any>;
  createdBy?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
};

type TrackerRoleSummary = {
  role: string;
  completedSlugs: string[];
  remainingSlugs: string[];
  percentComplete: number;
  totalAppraisals: number;
  slugStatus: Record<string, { hasSnapshot: boolean }>;
};

const RECORD_LABELS: Record<TrackerRecord['recordType'], string> = {
  'risk-assessment': 'Risk Assessment',
  'appraisal-supervision': 'Appraisal/Supervision',
};

const MONTH_NAMES = [
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
  return `${MONTH_NAMES[monthIndex]} ${yearPart}`;
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

// Helper function for appraisals tracker
const getTrackerMonthKey = (month: number, year: number) => `${year}-${String(month + 1).padStart(2, "0")}`;

// Parse completion map keys which are stored as either:
// - `${slug}-${year}-${month}` (recommended)
// - legacy: `${slug}-${month}`
const parseCompletionKey = (key: string) => {
  // Try new format: slug-YYYY-M
  const newMatch = key.match(/^(.+)-(\d{4})-(\d{1,2})$/);
  if (newMatch) {
    const slug = newMatch[1];
    const year = parseInt(newMatch[2], 10);
    const month = parseInt(newMatch[3], 10);
    return { slug, year, month };
  }

  // Try legacy format: slug-M
  const legacyMatch = key.match(/^(.+)-(\d{1,2})$/);
  if (legacyMatch) {
    const slug = legacyMatch[1];
    const month = parseInt(legacyMatch[2], 10);
    const year = new Date().getFullYear(); // Default to current year for legacy
    return { slug, year, month };
  }

  // Fallback to current month/year and use full key as slug
  const now = new Date();
  return { slug: key, year: now.getFullYear(), month: now.getMonth() };
};

const TRACKER_CARD_META = [
  {
    type: 'risk-assessment' as const,
    title: 'Risk Assessment Entry',
    description: 'Document risk assessments and mitigation strategies.',
    accentGradient: 'from-red-500 to-orange-500',
    iconGradient: 'from-red-100 to-orange-100',
    iconColor: 'text-red-600',
    icon: Shield,
    emptyHint: 'No risk assessments saved for this month.',
  },
  {
    type: 'appraisal-supervision' as const,
    title: 'Appraisal/Supervision Entry',
    description: 'Staff appraisals and supervision records.',
    accentGradient: 'from-blue-500 to-indigo-500',
    iconGradient: 'from-blue-100 to-indigo-100',
    iconColor: 'text-blue-600',
    icon: UserCheck,
    emptyHint: 'No appraisals/supervisions saved for this month.',
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
    residents: 'Residents',
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

const renderAppraisalDetail = (form: Record<string, any>) => {
  const sections: { title: string; fields: FieldDescriptor[] }[] = [
    {
      title: 'Appraisal Details',
      fields: [
        { key: 'staffName', label: 'Staff Name' },
        { key: 'position', label: 'Position' },
        { key: 'appraisalDate', label: 'Appraisal Date', format: formatInputDate },
        { key: 'supervisor', label: 'Supervisor' },
      ],
    },
    {
      title: 'Performance Review',
      fields: [
        { key: 'performanceRating', label: 'Performance Rating' },
        { key: 'strengths', label: 'Strengths', fullWidth: true },
        { key: 'areasForImprovement', label: 'Areas for Improvement', fullWidth: true },
      ],
    },
    {
      title: 'Goals and Development',
      fields: [
        { key: 'goals', label: 'Goals', fullWidth: true },
        { key: 'trainingNeeds', label: 'Training Needs', fullWidth: true },
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
    </div>
  );
};

const renderActionPlanDetail = (form: Record<string, any>) => {
  const sections: { title: string; fields: FieldDescriptor[] }[] = [
    {
      title: 'Action Plan Details',
      fields: [
        { key: 'issue', label: 'Issue' },
        { key: 'auditType', label: 'Audit Type' },
        { key: 'assignedTeam', label: 'Assigned Team' },
        { key: 'ragRating', label: 'Priority (RAG Rating)' },
        { key: 'status', label: 'Status' },
        { key: 'dueDate', label: 'Due Date', format: formatInputDate },
      ],
    },
    {
      title: 'Description',
      fields: [
        { key: 'description', label: 'Description', fullWidth: true },
      ],
    },
    {
      title: 'Actions Taken',
      fields: [
        { key: 'actions', label: 'Actions Taken', fullWidth: true },
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
    </div>
  );
};
import { db } from '@/lib/firebase';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';
import { Folder as FolderIcon, FileText, FileSpreadsheet, FileX2, Home, ChevronRight, ArrowLeft, PlusSquare, Users, Tag, Clock, TrendingUp, Activity, Shield, CheckCircle, AlertTriangle, Calendar, Zap, UserCheck, Phone, Mail, Plus, Trash2, Edit, Save, X, BarChart2, Loader2, CheckCircle2, AlertCircle, Info, CalendarIcon, CheckSquare } from 'lucide-react';
// AdminDependencyTable and OccupancyPie were removed as they're not used in this view
import StatsView from '@/components/admin/admin-stats-view';
import AuditsView from './admin-audits-view';
import { AdminRotasView } from './admin-rotas-view';
import { useIsMobile } from '@/hooks/use-mobile';

interface Manager {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Nurse {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CTM {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Domestic {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Maintenance {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Kitchen {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Activities {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminWorkspaceViewProps {
  workspace: Workspace;
  onClose: () => void;
}

const getFileIcon = (fileType: Document['fileType']) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'csv':
      return <FileSpreadsheet className="w-8 h-8 text-green-700" />;
    case 'xlsx':
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    default:
      return <FileX2 className="w-8 h-8 text-gray-400" />;
  }
};

export default function AdminWorkspaceView({ workspace, onClose }: AdminWorkspaceViewProps) {
  const isMobile = useIsMobile();
  const [stack, setStack] = React.useState<string[]>([]);

  const rootWrapper: Folder = React.useMemo(() => ({ id: 'root', name: workspace.name, type: 'folder', items: workspace.folders || [], workspaceId: workspace.id }), [workspace]);

  const getCurrentFolder = React.useCallback((): Folder => {
    if (stack.length === 0) return rootWrapper;
    let current: Folder | null = null;
    const find = (items: (Folder | Document)[], id: string): Folder | null => {
      for (const it of items) {
        if (it.type === 'folder' && it.id === id) return it as Folder;
        if (it.type === 'folder') {
          const sub = find(it.items, id);
          if (sub) return sub;
        }
      }
      return null;
    };
    current = find(workspace.folders || [], stack[stack.length - 1]) || null;
    return current || rootWrapper;
  }, [stack, workspace, rootWrapper]);

  const currentFolder = getCurrentFolder();

  // Local wrapper to expose the NewTeamDialog trigger in the admin view
  function NewTeamDialogWrapper({ workspaceId }: { workspaceId?: string }) {
    return (
      <NewTeamDialog onTeamCreated={() => { /* handled inside TeamsView via realtime fetch */ }} workspaceId={workspaceId}>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white border border-transparent">
          <Plus className="mr-2 h-4 w-4 text-white" />
          Create New Team
        </Button>
      </NewTeamDialog>
    );
  }

  const pushFolder = (id: string) => setStack(s => [...s, id]);
  const popFolder = () => setStack(s => s.slice(0, -1));

  // onFolderAdd helper intentionally removed — folder creation in the
  // admin view is handled elsewhere or via backend APIs. Keeping the
  // in-memory mutator caused unused code and lint noise.

  const breadcrumb = React.useMemo(() => {
    const crumbs: { id: string; name: string }[] = [{ id: 'root', name: workspace.name }];
    if (stack.length > 0) {
      // Find names for ids in stack
      const findName = (items: (Folder | Document)[], id: string): string | null => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === id) return it.name;
          if (it.type === 'folder') {
            const sub = findName(it.items, id);
            if (sub) return sub;
          }
        }
        return null;
      };
      for (const id of stack) {
        const n = findName(workspace.folders || [], id) || id;
        crumbs.push({ id, name: n });
      }
    }
    return crumbs;
  }, [stack, workspace]);

  // Helper to navigate to a crumb by index (0 = root)
  const navigateToCrumb = (index: number) => {
    if (index <= 0) {
      setStack([]);
      return;
    }
    // Keep first `index` entries in stack
    setStack(s => s.slice(0, index));
  };

  const totalFolders = useMemo(() => workspace.folders?.length || 0, [workspace]);
  const totalDocuments = useMemo(() => {
    const countDocuments = (items: (Folder | Document)[]): number => {
      return items.reduce((count, item) => {
        if (item.type === 'document') return count + 1;
        if (item.type === 'folder') return count + countDocuments(item.items);
        return count;
      }, 0);
    };
    return countDocuments(workspace.folders || []);
  }, [workspace]);

  const { fileTypeCounts, recentUploads } = useMemo(() => {
    const ft: Record<string, number> = {};
    const uploads: Array<{ name: string; createdAt?: string }> = [];

    const walk = (items: (Folder | Document)[]) => {
      for (const it of items) {
        if (it.type === 'document') {
          const parts = (it.name || '').split('.');
          const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
          ft[ext] = (ft[ext] || 0) + 1;
          uploads.push({ name: it.name || 'Untitled', createdAt: it.createdAt ? String(it.createdAt) : undefined });
        } else if (it.type === 'folder') {
          walk(it.items || []);
        }
      }
    };

    walk(workspace.folders || []);
    uploads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { fileTypeCounts: ft, recentUploads: uploads.slice(0, 5) };
  }, [workspace]);

  // compute occupancy percent if available on workspace
  const occupancyPercent = useMemo(() => {
    const w = workspace as any;
    if (typeof w.occupancy === 'number') return Math.round((w.occupancy || 0) * 100);
    if (typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number' && w.totalBeds > 0) {
      return Math.round((w.occupiedBeds / w.totalBeds) * 100);
    }
    return undefined;
  }, [workspace]);

  // Staffing data state
  const [staffingData, setStaffingData] = useState<{ day: number; night: number; total: number; lastUpdated?: string } | null>(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingTimeframe, setStaffingTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [staffingHistory, setStaffingHistory] = useState<Array<{ date: string; day: number; night: number; total: number }>>([]);

  // Dependency data (residents & communities)
  const [residents, setResidents] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  // Aggregates for stats (workspace-scoped)
  const [aggregateWoundsData, setAggregateWoundsData] = useState<any>(null);
  const [aggregateFallsData, setAggregateFallsData] = useState<any>(null);
  const [aggregateInfectionData, setAggregateInfectionData] = useState<any>(null);
  const [aggregateAuditData, setAggregateAuditData] = useState<any>(null);

  // Management data state
  const [managers, setManagers] = useState<Manager[]>([]);
  const [newManager, setNewManager] = useState({ name: '', roles: '', email: '', phone: '' });
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [editingManager, setEditingManager] = useState<string | null>(null);

  // Nurses data state
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [newNurse, setNewNurse] = useState({ name: '', roles: '', email: '', phone: '' });
  const [nursesLoading, setNursesLoading] = useState(false);
  const [nursesError, setNursesError] = useState<string | null>(null);
  const [editingNurse, setEditingNurse] = useState<string | null>(null);

  // CTM data state
  const [ctms, setCTMs] = useState<CTM[]>([]);
  const [newCTM, setNewCTM] = useState({ name: '', roles: '', email: '', phone: '' });
  const [ctmsLoading, setCTMsLoading] = useState(false);
  const [ctmsError, setCTMsError] = useState<string | null>(null);
  const [editingCTM, setEditingCTM] = useState<string | null>(null);

  // Domestic data state
  const [domestics, setDomestics] = useState<Domestic[]>([]);
  const [newDomestic, setNewDomestic] = useState({ name: '', roles: '', email: '', phone: '' });
  const [domesticsLoading, setDomesticsLoading] = useState(false);
  const [domesticsError, setDomesticsError] = useState<string | null>(null);
  const [editingDomestic, setEditingDomestic] = useState<string | null>(null);

  // Maintenance data state
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [newMaintenance, setNewMaintenance] = useState({ name: '', roles: '', email: '', phone: '' });
  const [maintenancesLoading, setMaintenancesLoading] = useState(false);
  const [maintenancesError, setMaintenancesError] = useState<string | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<string | null>(null);

  // Kitchen data state
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [newKitchen, setNewKitchen] = useState({ name: '', roles: '', email: '', phone: '' });
  const [kitchensLoading, setKitchensLoading] = useState(false);
  const [kitchensError, setKitchensError] = useState<string | null>(null);
  const [editingKitchen, setEditingKitchen] = useState<string | null>(null);

  // Activities data state
  const [activities, setActivities] = useState<Activities[]>([]);
  const [newActivity, setNewActivity] = useState({ name: '', roles: '', email: '', phone: '' });
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

  // Risk Assessments tracker state
  const [riskAssessments, setRiskAssessments] = useState<TrackerRecord[]>([]);
  const [riskAssessmentsLoading, setRiskAssessmentsLoading] = useState(false);
  const [selectedRiskAssessment, setSelectedRiskAssessment] = useState<TrackerRecord | null>(null);
  const [selectedAppraisal, setSelectedAppraisal] = useState<any>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Appraisals & Supervisions tracker state
  const [appraisalsSupervisions, setAppraisalsSupervisions] = useState<{ completionStatus: Record<string, any>; appraisalData: Record<string, any> }>({ completionStatus: {}, appraisalData: {} });
  const [appraisalsSupervisionsLoading, setAppraisalsSupervisionsLoading] = useState(false);
  const [selectedAppraisalSupervision, setSelectedAppraisalSupervision] = useState<TrackerRecord | null>(null);
  const [selectedAppraisalsMonthKey, setSelectedAppraisalsMonthKey] = useState<string | null>(null);
  const [selectedAppraisalsMonthDate, setSelectedAppraisalsMonthDate] = useState<Date | null>(null);
  const [appraisalsDatePickerOpen, setAppraisalsDatePickerOpen] = useState(false);
  const [appraisalsSupervisionsError, setAppraisalsSupervisionsError] = useState<string | null>(null);

  // Action Plans tracker state
  const [actionPlans, setActionPlans] = useState<any[]>([]);
  const [actionPlansLoading, setActionPlansLoading] = useState(false);
  const [actionPlansError, setActionPlansError] = useState<string | null>(null);
  const [selectedActionPlan, setSelectedActionPlan] = useState<any | null>(null);
  const [selectedActionPlansMonthKey, setSelectedActionPlansMonthKey] = useState<string | null>(null);
  const [selectedActionPlansMonthDate, setSelectedActionPlansMonthDate] = useState<Date | null>(null);
  const [actionPlansDatePickerOpen, setActionPlansDatePickerOpen] = useState(false);

  // Fetch latest staffing data from daily check-ins
  useEffect(() => {
    if (!workspace?.id) return;
    
    setStaffingLoading(true);
    
    try {
      const colRef = collection(db, workspaceCollectionPath(workspace.id, 'daily-checkins', (workspace as any).organisationId));
      
      // Calculate date range based on timeframe
      let startDate = new Date();
      switch (staffingTimeframe) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      const q = fsQuery(colRef, where('createdAt', '>=', startDate), orderBy('createdAt', 'desc'));
      
      const unsub = onSnapshot(q, (snap) => {
        const historyData: Array<{ date: string; day: number; night: number; total: number }> = [];
        let latestStaffing: { day: number; night: number; total: number; lastUpdated: string } | null = null;
        
        if (!snap.empty) {
          snap.docs.forEach((doc) => {
            const data = doc.data();
            const day = parseInt(String(data.staffingDay || data.staffing?.day || '0')) || 0;
            const night = parseInt(String(data.staffingNight || data.staffing?.night || '0')) || 0;
            const total = day + night;
            
            const recordDate = data.createdAt ? 
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) :
              new Date(data.recordedAt || Date.now());
            
            historyData.push({
              date: recordDate.toISOString().split('T')[0],
              day,
              night,
              total
            });
            
            // Set latest data from the first (most recent) record
            if (!latestStaffing) {
              latestStaffing = {
                day,
                night,
                total,
                lastUpdated: recordDate.toLocaleDateString()
              };
            }
          });
        }
        
        // Sort by date and group by date for aggregation
        const groupedData = historyData.reduce((acc, curr) => {
          if (!acc[curr.date] || acc[curr.date].total < curr.total) {
            acc[curr.date] = curr;
          }
          return acc;
        }, {} as Record<string, { date: string; day: number; night: number; total: number }>);
        
        const sortedHistory = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
        
        setStaffingHistory(sortedHistory);
        setStaffingData(latestStaffing);
        setStaffingLoading(false);
      }, (err) => {
        console.error('Failed to listen to daily checkins for staffing in admin view', err);
        setStaffingLoading(false);
      });
      
      return () => unsub();
    } catch (e) {
      console.error('Failed to set up daily checkins listener in admin view', e);
      setStaffingLoading(false);
    }
  }, [workspace?.id, staffingTimeframe]);

  // Load dependency calculator data (residents & communities) from workspace-scoped doc
  useEffect(() => {
    if (!workspace?.id) return;
    setDependencyLoading(true);

    try {
      const depCol = collection(db, workspaceCollectionPath(workspace.id, 'dependency_calculator', (workspace as any).organisationId));
      const depRef = doc(depCol, 'default');
      const unsub = onSnapshot(depRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setResidents(Array.isArray(data.residents) ? data.residents : []);
          setCommunities(Array.isArray(data.communities) ? data.communities : []);
        } else {
          setResidents([]);
          setCommunities([]);
        }
        setDependencyLoading(false);
      }, (err) => {
        console.error('Failed to load dependency calculator data', err);
        setDependencyLoading(false);
      });

      return () => unsub();
    } catch (e) {
      console.error('Failed to set up dependency listener', e);
      setDependencyLoading(false);
    }
  }, [workspace?.id]);

  // Compute workspace-scoped aggregates for wounds/falls/infections from daily-checkins (last 30 days)
  useEffect(() => {
    if (!workspace?.id) return;

    let unsub: (() => void) | undefined;
    (async () => {
      try {
  const colRef = collection(db, workspaceCollectionPath(workspace.id, 'daily-checkins', (workspace as any).organisationId));
        // we'll do a one-time getDocs to compute aggregates for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const q = fsQuery(colRef, where('createdAt', '>=', thirtyDaysAgo));
  const { getDocs: _getDocs } = await import('firebase/firestore');
  const snaps = await _getDocs(q);

        // default accumulators
        let pressure = 0, brk = 0, fracture = 0, bruise = 0, skintear = 0;
        let totalFalls = 0;
        let uti = 0, chest = 0, wound = 0;

        if (!snaps.empty) {
          snaps.docs.forEach((docSnap: any) => {
            const d: any = docSnap.data();
            const wounds = d.wounds?.types || {};
            pressure += Number(wounds.pressure || 0);
            brk += Number(wounds.break || 0);
            fracture += Number(wounds.fracture || 0);
            bruise += Number(wounds.bruise || 0);
            skintear += Number(wounds.skintear || 0);

            // falls
            if (d.falls) {
              if (typeof d.falls === 'object') totalFalls += Number(d.falls.count || 0);
              else totalFalls += Number(d.falls || 0);
            }

            // infections
            if (d.infections) {
              uti += Number(d.infections.uti || 0);
              chest += Number(d.infections.chest || 0);
              wound += Number(d.infections.wound || 0);
            }
          });
        }

        const totalWounds = pressure + brk + fracture + bruise + skintear;

        setAggregateWoundsData({ total: totalWounds, pressure, break: brk, fracture, bruise, skintear, workspacesWithData: totalWounds > 0 ? 1 : 0 });
        setAggregateFallsData({ totalFalls, workspacesWithData: totalFalls > 0 ? 1 : 0 });
        const totalInfections = uti + chest + wound;
        setAggregateInfectionData({ totalInfections, uti, chest, wound, workspacesWithData: totalInfections > 0 ? 1 : 0 });

        // Also listen for audit_latest_scores doc in workspace settings for compliance info
  const settingsCol = collection(db, workspaceCollectionPath(workspace.id, 'settings', (workspace as any).organisationId));
  const auditRef = doc(settingsCol, 'audit_latest_scores');
        unsub = onSnapshot(auditRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as any;
            // reuse dashboard calculation approach
            const auditTypes = ['care-plan', 'health-safety', 'maintenance', 'restrictive-practice', 'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'];
            let totalYes = 0, totalQuestions = 0, completed = 0;
            auditTypes.forEach((t) => {
              const a = data?.[t];
              if (a && typeof a.yesCount === 'number' && typeof a.totalCount === 'number') {
                totalYes += a.yesCount;
                totalQuestions += a.totalCount;
                completed += 1;
              }
            });
            const overallPercentage = totalQuestions > 0 ? Math.round((totalYes / totalQuestions) * 100) : null;
            setAggregateAuditData({ totalYesCount: totalYes, totalQuestions, overallPercentage, auditsCompleted: completed, totalAudits: auditTypes.length, workspacesWithData: completed > 0 ? 1 : 0 });
          } else {
            setAggregateAuditData(null);
          }
        }, (err) => {
          console.warn('Failed to listen to audit_latest_scores for workspace', err);
        });

      } catch (error) {
        console.warn('Failed to compute workspace aggregates for admin stats', error);
        setAggregateWoundsData({ total: 0, pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0, workspacesWithData: 0 });
        setAggregateFallsData({ totalFalls: 0, workspacesWithData: 0 });
        setAggregateInfectionData({ totalInfections: 0, uti: 0, chest: 0, wound: 0, workspacesWithData: 0 });
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [workspace?.id]);

  // Load managers from Firebase
  useEffect(() => {
    const loadManagers = async () => {
      if (!workspace?.id) return;
      
      setManagersLoading(true);
      setManagersError(null);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
  const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const managersData = data.managers || [];
          setManagers(managersData);
        }
      } catch (error) {
        console.error('Failed to load managers:', error);
        setManagersError('Failed to load managers');
      } finally {
        setManagersLoading(false);
      }
    };
    
    loadManagers();
  }, [workspace?.id]);

  // Load nurses from Firebase
  useEffect(() => {
    const loadNurses = async () => {
      if (!workspace?.id) return;
      
      setNursesLoading(true);
      setNursesError(null);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
  const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const nursesData = data.nurses || [];
          setNurses(nursesData);
        }
      } catch (error) {
        console.error('Failed to load nurses:', error);
        setNursesError('Failed to load nurses');
      } finally {
        setNursesLoading(false);
      }
    };
    
    loadNurses();
  }, [workspace?.id]);

  // Load CTMs from Firebase
  useEffect(() => {
    const loadCTMs = async () => {
      if (!workspace?.id) return;
      
      setCTMsLoading(true);
      setCTMsError(null);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
  const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const ctmsData = data.ctms || [];
          setCTMs(ctmsData);
        }
      } catch (error) {
        console.error('Failed to load CTMs:', error);
        setCTMsError('Failed to load CTMs');
      } finally {
        setCTMsLoading(false);
      }
    };
    
    loadCTMs();
  }, [workspace?.id]);

  // Load Domestics from Firebase
  useEffect(() => {
    const loadDomestics = async () => {
      if (!workspace?.id) return;
      
      setDomesticsLoading(true);
      setDomesticsError(null);
      
      try {
  const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
  const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const domesticsData = data.domestics || [];
          setDomestics(domesticsData);
        }
      } catch (error) {
        console.error('Failed to load Domestics:', error);
        setDomesticsError('Failed to load Domestics');
      } finally {
        setDomesticsLoading(false);
      }
    };
    
    loadDomestics();
  }, [workspace?.id]);

  // Load Maintenances from Firebase
  useEffect(() => {
    const loadMaintenances = async () => {
      if (!workspace?.id) return;
      
      setMaintenancesLoading(true);
      setMaintenancesError(null);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const maintenancesData = data.maintenances || [];
          setMaintenances(maintenancesData);
        }
      } catch (error) {
        console.error('Failed to load Maintenances:', error);
        setMaintenancesError('Failed to load Maintenances');
      } finally {
        setMaintenancesLoading(false);
      }
    };
    
    loadMaintenances();
  }, [workspace?.id]);

  // Load Kitchens from Firebase
  useEffect(() => {
    const loadKitchens = async () => {
      if (!workspace?.id) return;
      
      setKitchensLoading(true);
      setKitchensError(null);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const kitchensData = data.kitchens || [];
          setKitchens(kitchensData);
        }
      } catch (error) {
        console.error('Failed to load Kitchens:', error);
        setKitchensError('Failed to load Kitchens');
      } finally {
        setKitchensLoading(false);
      }
    };
    
    loadKitchens();
  }, [workspace?.id]);

  // Load Activities from Firebase
  useEffect(() => {
    const loadActivities = async () => {
      if (!workspace?.id) return;
      
      setActivitiesLoading(true);
      setActivitiesError(null);
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const activitiesData = data.activities || [];
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error('Failed to load Activities:', error);
        setActivitiesError('Failed to load Activities');
      } finally {
        setActivitiesLoading(false);
      }
    };
    
    loadActivities();
  }, [workspace?.id]);

  // Load Risk Assessments from Firebase
  useEffect(() => {
    const loadRiskAssessments = async () => {
      if (!workspace?.id) return;

      setRiskAssessmentsLoading(true);

      try {
        const collectionPath = workspaceCollectionPath(workspace.id, 'risk-assessments', (workspace as any).organisationId ?? undefined);
        if (!collectionPath) {
          setRiskAssessments([]);
          return;
        }
        const q = fsQuery(collection(db, collectionPath), orderBy('createdAt', 'desc'));
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
          };
        });
        setRiskAssessments(records);
      } catch (error) {
        console.error('Failed to load risk assessments:', error);
        setRiskAssessments([]);
      } finally {
        setRiskAssessmentsLoading(false);
      }
    };

    loadRiskAssessments();
  }, [workspace?.id]);

  // Load Appraisals & Supervisions from Firebase
  useEffect(() => {
    const loadAppraisalsSupervisions = async () => {
      if (!workspace?.id) return;

      setAppraisalsSupervisionsLoading(true);

      try {
        // Load from appraisal-tracker collection which contains completion data
        const trackerCol = collection(db, workspaceCollectionPath(workspace.id, 'appraisal-tracker', (workspace as any).organisationId));
        const trackerSnapshot = await getDocs(trackerCol);

        const completionStatus: Record<string, Record<string, boolean>> = {};
        const appraisalData: Record<string, any> = {};

        // Aggregate data from all users
        trackerSnapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as any;
          
          // Aggregate completion status
          if (data.completionStatus) {
            Object.entries(data.completionStatus).forEach(([role, roleMap]: [string, any]) => {
              if (!completionStatus[role]) {
                completionStatus[role] = {};
              }
              Object.entries(roleMap).forEach(([key, completed]: [string, any]) => {
                completionStatus[role][key] = completed;
              });
            });
          }

          // Aggregate appraisal data
          if (data.appraisalData) {
            Object.entries(data.appraisalData).forEach(([key, value]: [string, any]) => {
              appraisalData[key] = value;
            });
          }
        });

        setAppraisalsSupervisions({ completionStatus, appraisalData });
      } catch (error) {
        console.error('Failed to load appraisals/supervisions:', error);
        setAppraisalsSupervisions({ completionStatus: {}, appraisalData: {} });
      } finally {
        setAppraisalsSupervisionsLoading(false);
      }
    };

    loadAppraisalsSupervisions();
  }, [workspace?.id]);

  // Computed values for tracker
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    riskAssessments.forEach(record => {
      const key = getMonthKeyFromDate(record.createdAt);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [riskAssessments]);

  const monthsWithData = useMemo(() => Object.keys(monthCounts).sort(sortMonthKeysDesc), [monthCounts]);

  const earliestYear = useMemo(() => {
    if (riskAssessments.length === 0) {
      return null;
    }
    const oldest = riskAssessments[riskAssessments.length - 1]?.createdAt;
    return oldest ? oldest.getFullYear() : null;
  }, [riskAssessments]);

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
      result[year] = MONTH_NAMES.map((label, index) => {
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
    const map: Record<string, typeof riskAssessments> = {};
    riskAssessments.forEach(record => {
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
  }, [riskAssessments]);

  const selectedMonthRecords = selectedMonthKey ? recordsByMonth[selectedMonthKey] ?? [] : [];

  const selectedMonthRecordsByType = useMemo(() => {
    const map: Record<TrackerRecord['recordType'], TrackerRecord[]> = {
      'risk-assessment': [],
      'appraisal-supervision': [],
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

  // Helper function to parse appraisal completion keys
  const parseAppraisalCompletionKey = (key: string) => {
    const newMatch = key.match(/^(.+)-(\d{4})-(\d{1,2})$/);
    if (newMatch) {
      const slug = newMatch[1];
      const year = parseInt(newMatch[2], 10);
      const month = parseInt(newMatch[3], 10);
      return { slug, year, month };
    }
    const legacyMatch = key.match(/^(.+)-(\d{1,2})$/);
    if (legacyMatch) {
      const slug = legacyMatch[1];
      const month = parseInt(legacyMatch[2], 10);
      const year = month <= new Date().getMonth() ? new Date().getFullYear() : new Date().getFullYear() - 1;
      return { slug, year, month };
    }
    return null;
  };

  // Computed values for appraisals/supervisions tracker
  const appraisalsMonthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Count completed appraisals across all roles for each month
    Object.values(appraisalsSupervisions.completionStatus || {}).forEach(roleMap => {
      Object.keys(roleMap).forEach(key => {
        if (roleMap[key]) {
          const parsed = parseAppraisalCompletionKey(key);
          if (parsed) {
            const monthKey = `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}`;
            counts[monthKey] = (counts[monthKey] || 0) + 1;
          }
        }
      });
    });
    return counts;
  }, [appraisalsSupervisions.completionStatus]);

  const appraisalsMonthsWithData = useMemo(() => Object.keys(appraisalsMonthCounts).sort(sortMonthKeysDesc), [appraisalsMonthCounts]);

  const appraisalsEarliestYear = useMemo(() => {
    if (appraisalsMonthsWithData.length === 0) {
      return null;
    }
    const oldest = appraisalsMonthsWithData[appraisalsMonthsWithData.length - 1];
    const year = parseInt(oldest.split('-')[0]);
    return year;
  }, [appraisalsMonthsWithData]);

  const appraisalsCurrentYear = useMemo(() => new Date().getFullYear(), []);

  const appraisalsAvailableYears = useMemo(() => {
    if (appraisalsEarliestYear === null) {
      return [] as number[];
    }
    const years: number[] = [];
    for (let year = appraisalsCurrentYear; year >= appraisalsEarliestYear; year -= 1) {
      years.push(year);
    }
    return years;
  }, [appraisalsCurrentYear, appraisalsEarliestYear]);

  const appraisalsMonthsGroupedByYear = useMemo(() => {
    if (appraisalsAvailableYears.length === 0) {
      return {} as Record<number, { monthKey: string; monthIndex: number; label: string; count: number }[]>;
    }
    const result: Record<number, { monthKey: string; monthIndex: number; label: string; count: number }[]> = {};
    appraisalsAvailableYears.forEach(year => {
      result[year] = MONTH_NAMES.map((label, index) => {
        const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
        return {
          monthKey,
          monthIndex: index,
          label,
          count: appraisalsMonthCounts[monthKey] ?? 0,
        };
      });
    });
    return result;
  }, [appraisalsAvailableYears, appraisalsMonthCounts]);

  // Tracker months computation (similar to appraisals page)
  const appraisalsMonths = useMemo(() => {
    type RoleEntry = { statusBySlug: Map<string, { hasSnapshot: boolean }> };
    type MonthEntry = { month: number; year: number; roles: Map<string, RoleEntry> };

    const monthMap = new Map<string, MonthEntry>();

    const ensureMonthEntry = (month: number, year: number) => {
      const key = getTrackerMonthKey(month, year);
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month,
          year,
          roles: new Map<string, RoleEntry>(),
        });
      }
      return monthMap.get(key)!;
    };

    const ensureRoleEntry = (entry: MonthEntry, role: string) => {
      if (!entry.roles.has(role)) {
        entry.roles.set(role, { statusBySlug: new Map() });
      }
      return entry.roles.get(role)!;
    };

    const recordCompletion = (role: string, slug: string, month: number, year: number, hasSnapshot: boolean) => {
      if (!Number.isFinite(month) || month < 0 || month > 11 || !Number.isFinite(year)) return;
      const monthEntry = ensureMonthEntry(month, year);
      const roleEntry = ensureRoleEntry(monthEntry, role);
      const existing = roleEntry.statusBySlug.get(slug);
      roleEntry.statusBySlug.set(slug, {
        hasSnapshot: existing?.hasSnapshot || hasSnapshot,
      });
    };

    // Mapping of tracker roles to their appraisals (from appraisals page)
    const trackerAppraisalMapping = {
      'Deputy/ies': ['deputy-supervision'],
      'Clinical lead & Nurses': ['carers-supervision', 'clinical-lead-supervision', 'nurses-supervision'],
      'Senior/Care team managers': ['deputy-supervision', 'senior-carer-supervision'],
      'Admin staff': ['reception-supervision', 'admin-supervision'],
      'Maintenance staff': ['maintenence-person-supervision'],
      'Activities staff': ['activities-supervision'],
      'Kitchen staff': ['chef-supervision', 'kitchen-assistant-supervision'],
      'Domestic staff': ['domestic-staff-supervision', 'housekeeping-supervision'],
    };

    Object.entries(appraisalsSupervisions.completionStatus || {}).forEach(([role, roleMap]) => {
      Object.entries(roleMap || {}).forEach(([key, completed]) => {
        if (!completed) return;
        const parsed = parseAppraisalCompletionKey(key);
        if (!parsed) return;
        const resolvedRole = trackerAppraisalMapping[role as keyof typeof trackerAppraisalMapping] ? role : null;
        if (!resolvedRole) return;
        recordCompletion(resolvedRole, parsed.slug, parsed.month, parsed.year, false);
      });
    });

    Object.entries(appraisalsSupervisions.appraisalData || {}).forEach(([key]) => {
      const parsed = parseAppraisalCompletionKey(key);
      if (!parsed) return;
      // Find role for this slug
      let role = null;
      for (const [r, slugs] of Object.entries(trackerAppraisalMapping)) {
        if (slugs.includes(parsed.slug)) {
          role = r;
          break;
        }
      }
      if (!role) return;
      recordCompletion(role, parsed.slug, parsed.month, parsed.year, true);
    });

    // Ensure current active month exists
    const now = new Date();
    ensureMonthEntry(now.getMonth(), now.getFullYear());

    const rolesArray = Object.keys(trackerAppraisalMapping);

    const summaries = Array.from(monthMap.entries()).map(([key, monthEntry]) => {
      const roles: TrackerRoleSummary[] = rolesArray.map(role => {
        const slugs = trackerAppraisalMapping[role as keyof typeof trackerAppraisalMapping];
        const roleEntry = monthEntry.roles.get(role);
        const completedSlugs = slugs.filter(slug => roleEntry?.statusBySlug.has(slug));
        const remainingSlugs = slugs.filter(slug => !roleEntry?.statusBySlug.has(slug));
        const slugStatus = completedSlugs.reduce((acc, slug) => {
          acc[slug] = {
            hasSnapshot: roleEntry?.statusBySlug.get(slug)?.hasSnapshot ?? false,
          };
          return acc;
        }, {} as Record<string, { hasSnapshot: boolean }>);
        const totalAppraisals = slugs.length;
        const percentComplete = totalAppraisals === 0 ? 0 : Math.round((completedSlugs.length / totalAppraisals) * 100);
        return {
          role,
          completedSlugs,
          remainingSlugs,
          percentComplete,
          totalAppraisals,
          slugStatus,
        };
      });

      const totalAppraisals = roles.reduce((sum, role) => sum + role.totalAppraisals, 0);
      const totalCompleted = roles.reduce((sum, role) => sum + role.completedSlugs.length, 0);
      const percentComplete = totalAppraisals === 0 ? 0 : Math.round((totalCompleted / totalAppraisals) * 100);
      const hasData = totalCompleted > 0;

      return {
        key,
        month: monthEntry.month,
        year: monthEntry.year,
        roles,
        totalAppraisals,
        totalCompleted,
        percentComplete,
        hasData,
      };
    });

    return summaries.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [appraisalsSupervisions.completionStatus, appraisalsSupervisions.appraisalData]);

  const appraisalsMonthByKey = useMemo(() => {
    const map = new Map<string, typeof appraisalsMonths[0]>();
    appraisalsMonths.forEach(month => {
      map.set(month.key, month);
    });
    return map;
  }, [appraisalsMonths]);

  const appraisalsTrackedYears = useMemo(() => {
    const set = new Set<number>();
    appraisalsMonths.forEach(month => set.add(month.year));
    set.add(appraisalsCurrentYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [appraisalsMonths, appraisalsCurrentYear]);

  const appraisalsMonthKeysWithData = useMemo(() => {
    return new Set(appraisalsMonths.filter(month => month.hasData).map(month => month.key));
  }, [appraisalsMonths]);

  const selectedAppraisalsMonth = useMemo(() => {
    return appraisalsMonthByKey.get(selectedAppraisalsMonthKey || '') || null;
  }, [appraisalsMonthByKey, selectedAppraisalsMonthKey]);

  const selectedAppraisalsMonthLabel = useMemo(() => {
    if (!selectedAppraisalsMonth) return null;
    return `${MONTH_NAMES[selectedAppraisalsMonth.month]} ${selectedAppraisalsMonth.year}`;
  }, [selectedAppraisalsMonth]);

  const selectedAppraisalsProgress = useMemo(() => {
    if (!selectedAppraisalsMonth) return '0/0';
    return `${selectedAppraisalsMonth.totalCompleted}/${selectedAppraisalsMonth.totalAppraisals}`;
  }, [selectedAppraisalsMonth]);

  const isViewingPastAppraisalsMonth = useMemo(() => {
    if (!selectedAppraisalsMonth) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return selectedAppraisalsMonth.year < currentYear || (selectedAppraisalsMonth.year === currentYear && selectedAppraisalsMonth.month < currentMonth);
  }, [selectedAppraisalsMonth]);

  const isSelectedAppraisalsMonthActive = useMemo(() => {
    if (!selectedAppraisalsMonth) return false;
    const now = new Date();
    return selectedAppraisalsMonth.year === now.getFullYear() && selectedAppraisalsMonth.month === now.getMonth();
  }, [selectedAppraisalsMonth]);

  const openAppraisalsReadOnlyViewer = useCallback((slug: string, month: number, year: number) => {
    // This would open a read-only viewer for the appraisal
    // For now, we'll just log it as this is a read-only admin view
    console.log(`Opening read-only view for ${slug} in ${month}/${year}`);
  }, []);

  const getAppraisalTitle = useCallback((slug: string) => {
    const titleMap: Record<string, string> = {
      'deputy-supervision': 'Deputy Supervision',
      'carers-supervision': 'Carers Supervision',
      'clinical-lead-supervision': 'Clinical Lead Supervision',
      'nurses-supervision': 'Nurses Supervision',
      'senior-carer-supervision': 'Senior Carer Supervision',
      'reception-supervision': 'Reception Supervision',
      'admin-supervision': 'Admin Supervision',
      'maintenence-person-supervision': 'Maintenance Person Supervision',
      'activities-supervision': 'Activities Supervision',
      'chef-supervision': 'Chef Supervision',
      'kitchen-assistant-supervision': 'Kitchen Assistant Supervision',
      'domestic-staff-supervision': 'Domestic Staff Supervision',
      'housekeeping-supervision': 'Housekeeping Supervision',
    };
    return titleMap[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  const totalAppraisalsPerMonth = useMemo(() => {
    const trackerAppraisalMapping = {
      'Deputy/ies': ['deputy-supervision'],
      'Clinical lead & Nurses': ['carers-supervision', 'clinical-lead-supervision', 'nurses-supervision'],
      'Senior/Care team managers': ['deputy-supervision', 'senior-carer-supervision'],
      'Admin staff': ['reception-supervision', 'admin-supervision'],
      'Maintenance staff': ['maintenence-person-supervision'],
      'Activities staff': ['activities-supervision'],
      'Kitchen staff': ['chef-supervision', 'kitchen-assistant-supervision'],
      'Domestic staff': ['domestic-staff-supervision', 'housekeeping-supervision'],
    };
    return Object.values(trackerAppraisalMapping).reduce((sum, slugs) => sum + slugs.length, 0);
  }, []);

  // Effect to manage selected month state
  useEffect(() => {
    if (riskAssessments.length === 0) {
      if (selectedMonthKey !== null) {
        setSelectedMonthKey(null);
      }
      if (selectedMonthDate !== null) {
        setSelectedMonthDate(null);
      }
      return;
    }

    if (!selectedMonthKey) {
      const fallbackKey = monthsWithData[0] ?? getMonthKeyFromDate(new Date());
      setSelectedMonthKey(fallbackKey);
      setSelectedMonthDate(monthKeyToDate(fallbackKey) ?? null);
      return;
    }

    if (!selectedMonthDate) {
      setSelectedMonthDate(monthKeyToDate(selectedMonthKey) ?? null);
    }
  }, [riskAssessments, monthsWithData, selectedMonthKey, selectedMonthDate]);

  // Effect to load appraisals/supervisions data
  useEffect(() => {
    const loadAppraisalsSupervisions = async () => {
      if (!workspace?.id) return;

      try {
        setAppraisalsSupervisionsLoading(true);
        setAppraisalsSupervisionsError(null);

        const collectionPath = workspaceCollectionPath(workspace.id, 'appraisal-tracker', (workspace as any).organisationId);
        const snapshot = await getDocs(collection(db, collectionPath));

        const completionStatus: Record<string, any> = {};
        const appraisalData: Record<string, any> = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          const key = doc.id;

          if (data.completionStatus) {
            completionStatus[key] = data.completionStatus;
          }

          if (data.appraisalData) {
            appraisalData[key] = data.appraisalData;
          }
        });

        setAppraisalsSupervisions({
          completionStatus,
          appraisalData,
        });

        // Set initial selected month if not set
        if (!selectedAppraisalsMonthKey && Object.keys(completionStatus).length > 0) {
          const currentDate = new Date();
          const currentMonthKey = getTrackerMonthKey(currentDate.getMonth(), currentDate.getFullYear());
          setSelectedAppraisalsMonthKey(currentMonthKey);
          setSelectedAppraisalsMonthDate(currentDate);
        }

      } catch (error) {
        console.error('Error loading appraisals/supervisions data:', error);
        setAppraisalsSupervisionsError('Failed to load appraisals/supervisions data');
      } finally {
        setAppraisalsSupervisionsLoading(false);
      }
    };

    loadAppraisalsSupervisions();
  }, [workspace?.id]);

  // Load action plans data
  useEffect(() => {
    if (!workspace?.id) return;

    const loadActionPlans = async () => {
      try {
        setActionPlansLoading(true);
        setActionPlansError(null);

        const actionPlansRef = collection(db, workspaceCollectionPath(workspace.id, 'action-plans', workspace.organisationId));
        const actionPlansSnapshot = await getDocs(actionPlansRef);
        const actionPlansData = actionPlansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MonthlyActionPlan[];

        setActionPlans(actionPlansData);

        // Set initial selected month if not set
        if (!selectedActionPlansMonthKey && actionPlansData.length > 0) {
          const currentDate = new Date();
          const currentMonthKey = getTrackerMonthKey(currentDate.getMonth(), currentDate.getFullYear());
          setSelectedActionPlansMonthKey(currentMonthKey);
          setSelectedActionPlansMonthDate(currentDate);
        }

      } catch (error) {
        console.error('Error loading action plans data:', error);
        setActionPlansError('Failed to load action plans data');
      } finally {
        setActionPlansLoading(false);
      }
    };

    loadActionPlans();
  }, [workspace?.id]);

  const actionPlansTrackedYears = useMemo(() => {
    const set = new Set<number>();
    actionPlans.forEach(plan => {
      const year = parseInt(plan.monthKey.split('-')[0]);
      set.add(year);
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [actionPlans]);

  const actionPlansMonthKeysWithData = useMemo(() => {
    return new Set(actionPlans.map(plan => plan.monthKey));
  }, [actionPlans]);

  const selectedActionPlansMonth = useMemo(() => {
    if (!selectedActionPlansMonthKey) return null;
    return actionPlans.find(plan => plan.monthKey === selectedActionPlansMonthKey) || null;
  }, [actionPlans, selectedActionPlansMonthKey]);

  const selectedActionPlansMonthLabel = useMemo(() => {
    if (!selectedActionPlansMonth) return null;
    const [year, month] = selectedActionPlansMonth.monthKey.split('-');
    return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
  }, [selectedActionPlansMonth]);

  const selectedActionPlansProgress = useMemo(() => {
    if (!selectedActionPlansMonth) return '0/0';
    return `${selectedActionPlansMonth.completedItems}/${selectedActionPlansMonth.totalItems}`;
  }, [selectedActionPlansMonth]);

  const isViewingPastActionPlansMonth = useMemo(() => {
    if (!selectedActionPlansMonth) return false;
    const now = new Date();
    const [year, month] = selectedActionPlansMonth.monthKey.split('-');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) - 1 < currentMonth);
  }, [selectedActionPlansMonth]);

  const isSelectedActionPlansMonthActive = useMemo(() => {
    if (!selectedActionPlansMonth) return false;
    const now = new Date();
    const [year, month] = selectedActionPlansMonth.monthKey.split('-');
    return parseInt(year) === now.getFullYear() && parseInt(month) - 1 === now.getMonth();
  }, [selectedActionPlansMonth]);

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

  // Appraisals handlers
  const handleSelectAppraisalsMonth = (monthKey: string) => {
    setSelectedAppraisalsMonthKey(monthKey);
    setSelectedAppraisalsMonthDate(monthKeyToDate(monthKey) ?? null);
  };

  const handleAppraisalsDatePickerSelect = (value?: Date) => {
    if (!value) {
      return;
    }
    const monthKey = getMonthKeyFromDate(value);
    handleSelectAppraisalsMonth(monthKey);
    setAppraisalsDatePickerOpen(false);
  };

  // Action Plans handlers
  const handleSelectActionPlansMonth = (monthKey: string) => {
    setSelectedActionPlansMonthKey(monthKey);
    setSelectedActionPlansMonthDate(monthKeyToDate(monthKey) ?? null);
  };

  const handleActionPlansDatePickerSelect = (value?: Date) => {
    if (!value) {
      return;
    }
    const monthKey = getMonthKeyFromDate(value);
    handleSelectActionPlansMonth(monthKey);
    setActionPlansDatePickerOpen(false);
  };

  // Add manager to Firebase
  const addManagerToFirebase = async (manager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        managers: arrayUnion(manager)
      });
      return true;
    } catch (error) {
      console.error('Failed to add manager to Firebase:', error);
      setManagersError('Failed to save manager');
      return false;
    }
  };

  // Remove manager from Firebase
  const removeManagerFromFirebase = async (manager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        managers: arrayRemove(manager)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove manager from Firebase:', error);
      setManagersError('Failed to remove manager');
      return false;
    }
  };

  // Update manager in Firebase
  const updateManagerInFirebase = async (oldManager: Manager, newManager: Manager) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        managers: arrayRemove(oldManager)
      });
      await updateDoc(workspaceRef, {
        managers: arrayUnion(newManager)
      });
      return true;
    } catch (error) {
      console.error('Failed to update manager in Firebase:', error);
      setManagersError('Failed to update manager');
      return false;
    }
  };

  // Add nurse to Firebase
  const addNurseToFirebase = async (nurse: Nurse) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        nurses: arrayUnion(nurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to add nurse to Firebase:', error);
      return false;
    }
  };

  // Remove nurse from Firebase
  const removeNurseFromFirebase = async (nurse: Nurse) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        nurses: arrayRemove(nurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove nurse from Firebase:', error);
      return false;
    }
  };

  // Update nurse in Firebase
  const updateNurseInFirebase = async (oldNurse: Nurse, newNurse: Nurse) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        nurses: arrayRemove(oldNurse)
      });
      await updateDoc(workspaceRef, {
        nurses: arrayUnion(newNurse)
      });
      return true;
    } catch (error) {
      console.error('Failed to update nurse in Firebase:', error);
      return false;
    }
  };

  // Add CTM to Firebase
  const addCTMToFirebase = async (ctm: CTM) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        ctms: arrayUnion(ctm)
      });
      return true;
    } catch (error) {
      console.error('Failed to add CTM to Firebase:', error);
      return false;
    }
  };

  // Remove CTM from Firebase
  const removeCTMFromFirebase = async (ctm: CTM) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        ctms: arrayRemove(ctm)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove CTM from Firebase:', error);
      return false;
    }
  };

  // Update CTM in Firebase
  const updateCTMInFirebase = async (oldCTM: CTM, newCTM: CTM) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        ctms: arrayRemove(oldCTM)
      });
      await updateDoc(workspaceRef, {
        ctms: arrayUnion(newCTM)
      });
      return true;
    } catch (error) {
      console.error('Failed to update CTM in Firebase:', error);
      return false;
    }
  };

  // Add Domestic to Firebase
  const addDomesticToFirebase = async (domestic: Domestic) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        domestics: arrayUnion(domestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Domestic to Firebase:', error);
      return false;
    }
  };

  // Remove Domestic from Firebase
  const removeDomesticFromFirebase = async (domestic: Domestic) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        domestics: arrayRemove(domestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Domestic from Firebase:', error);
      return false;
    }
  };

  // Update Domestic in Firebase
  const updateDomesticInFirebase = async (oldDomestic: Domestic, newDomestic: Domestic) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        domestics: arrayRemove(oldDomestic)
      });
      await updateDoc(workspaceRef, {
        domestics: arrayUnion(newDomestic)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Domestic in Firebase:', error);
      return false;
    }
  };

  // Add Maintenance to Firebase
  const addMaintenanceToFirebase = async (maintenance: Maintenance) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        maintenances: arrayUnion(maintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Maintenance to Firebase:', error);
      return false;
    }
  };

  // Remove Maintenance from Firebase
  const removeMaintenanceFromFirebase = async (maintenance: Maintenance) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        maintenances: arrayRemove(maintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Maintenance from Firebase:', error);
      return false;
    }
  };

  // Update Maintenance in Firebase
  const updateMaintenanceInFirebase = async (oldMaintenance: Maintenance, newMaintenance: Maintenance) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        maintenances: arrayRemove(oldMaintenance)
      });
      await updateDoc(workspaceRef, {
        maintenances: arrayUnion(newMaintenance)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Maintenance in Firebase:', error);
      return false;
    }
  };

  // Add Kitchen to Firebase
  const addKitchenToFirebase = async (kitchen: Kitchen) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        kitchens: arrayUnion(kitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Kitchen to Firebase:', error);
      return false;
    }
  };

  // Remove Kitchen from Firebase
  const removeKitchenFromFirebase = async (kitchen: Kitchen) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        kitchens: arrayRemove(kitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Kitchen from Firebase:', error);
      return false;
    }
  };

  // Update Kitchen in Firebase
  const updateKitchenInFirebase = async (oldKitchen: Kitchen, newKitchen: Kitchen) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        kitchens: arrayRemove(oldKitchen)
      });
      await updateDoc(workspaceRef, {
        kitchens: arrayUnion(newKitchen)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Kitchen in Firebase:', error);
      return false;
    }
  };

  // Add Activity to Firebase
  const addActivityToFirebase = async (activity: Activities) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        activities: arrayUnion(activity)
      });
      return true;
    } catch (error) {
      console.error('Failed to add Activity to Firebase:', error);
      return false;
    }
  };

  // Remove Activity from Firebase
  const removeActivityFromFirebase = async (activity: Activities) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      await updateDoc(workspaceRef, {
        activities: arrayRemove(activity)
      });
      return true;
    } catch (error) {
      console.error('Failed to remove Activity from Firebase:', error);
      return false;
    }
  };

  // Update Activity in Firebase
  const updateActivityInFirebase = async (oldActivity: Activities, newActivity: Activities) => {
    if (!workspace?.id) return false;
    
    try {
      const workspaceRef = doc(db, workspaceDocPath(workspace.id, undefined, (workspace as any).organisationId));
      // Remove old and add new (atomic operation alternative)
      await updateDoc(workspaceRef, {
        activities: arrayRemove(oldActivity)
      });
      await updateDoc(workspaceRef, {
        activities: arrayUnion(newActivity)
      });
      return true;
    } catch (error) {
      console.error('Failed to update Activity in Firebase:', error);
      return false;
    }
  };

  const handleUpdateManager = async (managerId: string, updatedData: Partial<Manager>) => {
    const originalManager = managers.find(m => m.id === managerId);
    if (!originalManager) return;
    
    const updatedManager: Manager = {
      ...originalManager,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setManagers(prev => prev.map(m => m.id === managerId ? updatedManager : m));
    setEditingManager(null);
    setManagersError(null);
    
    // Update in Firebase
    const success = await updateManagerInFirebase(originalManager, updatedManager);
    if (!success) {
      // Revert optimistic update on failure
      setManagers(prev => prev.map(m => m.id === managerId ? originalManager : m));
    }
  };

  const handleUpdateNurse = async (nurseId: string, updatedData: Partial<Nurse>) => {
    const originalNurse = nurses.find(n => n.id === nurseId);
    if (!originalNurse) return;
    
    const updatedNurse: Nurse = {
      ...originalNurse,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setNurses(prev => prev.map(n => n.id === nurseId ? updatedNurse : n));
    setEditingNurse(null);
    setNursesError(null);
    
    // Update in Firebase
    const success = await updateNurseInFirebase(originalNurse, updatedNurse);
    if (!success) {
      // Revert optimistic update on failure
      setNurses(prev => prev.map(n => n.id === nurseId ? originalNurse : n));
    }
  };

  const handleUpdateCTM = async (ctmId: string, updatedData: Partial<CTM>) => {
    const originalCTM = ctms.find(c => c.id === ctmId);
    if (!originalCTM) return;
    
    const updatedCTM: CTM = {
      ...originalCTM,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setCTMs(prev => prev.map(c => c.id === ctmId ? updatedCTM : c));
    setEditingCTM(null);
    setCTMsError(null);
    
    // Update in Firebase
    const success = await updateCTMInFirebase(originalCTM, updatedCTM);
    if (!success) {
      // Revert optimistic update on failure
      setCTMs(prev => prev.map(c => c.id === ctmId ? originalCTM : c));
    }
  };

  const handleUpdateDomestic = async (domesticId: string, updatedData: Partial<Domestic>) => {
    const originalDomestic = domestics.find(d => d.id === domesticId);
    if (!originalDomestic) return;
    
    const updatedDomestic: Domestic = {
      ...originalDomestic,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setDomestics(prev => prev.map(d => d.id === domesticId ? updatedDomestic : d));
    setEditingDomestic(null);
    setDomesticsError(null);
    
    // Update in Firebase
    const success = await updateDomesticInFirebase(originalDomestic, updatedDomestic);
    if (!success) {
      // Revert optimistic update on failure
      setDomestics(prev => prev.map(d => d.id === domesticId ? originalDomestic : d));
    }
  };

  const handleUpdateMaintenance = async (maintenanceId: string, updatedData: Partial<Maintenance>) => {
    const originalMaintenance = maintenances.find(m => m.id === maintenanceId);
    if (!originalMaintenance) return;
    
    const updatedMaintenance: Maintenance = {
      ...originalMaintenance,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setMaintenances(prev => prev.map(m => m.id === maintenanceId ? updatedMaintenance : m));
    setEditingMaintenance(null);
    setMaintenancesError(null);
    
    // Update in Firebase
    const success = await updateMaintenanceInFirebase(originalMaintenance, updatedMaintenance);
    if (!success) {
      // Revert optimistic update on failure
      setMaintenances(prev => prev.map(m => m.id === maintenanceId ? originalMaintenance : m));
    }
  };

  const handleUpdateKitchen = async (kitchenId: string, updatedData: Partial<Kitchen>) => {
    const originalKitchen = kitchens.find(k => k.id === kitchenId);
    if (!originalKitchen) return;
    
    const updatedKitchen: Kitchen = {
      ...originalKitchen,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setKitchens(prev => prev.map(k => k.id === kitchenId ? updatedKitchen : k));
    setEditingKitchen(null);
    setKitchensError(null);
    
    // Update in Firebase
    const success = await updateKitchenInFirebase(originalKitchen, updatedKitchen);
    if (!success) {
      // Revert optimistic update on failure
      setKitchens(prev => prev.map(k => k.id === kitchenId ? originalKitchen : k));
    }
  };

  const handleUpdateActivity = async (activityId: string, updatedData: Partial<Activities>) => {
    const originalActivity = activities.find(a => a.id === activityId);
    if (!originalActivity) return;
    
    const updatedActivity: Activities = {
      ...originalActivity,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    // Optimistically update UI
    setActivities(prev => prev.map(a => a.id === activityId ? updatedActivity : a));
    setEditingActivity(null);
    setActivitiesError(null);
    
    // Update in Firebase
    const success = await updateActivityInFirebase(originalActivity, updatedActivity);
    if (!success) {
      // Revert optimistic update on failure
      setActivities(prev => prev.map(a => a.id === activityId ? originalActivity : a));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Slim admin header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-3xl shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 py-6 sm:py-8 lg:py-10 px-8 md:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
            {/* Main content - left side */}
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                {workspace.name}
              </h1>
            </div>

            {/* Key metrics cards - right side */}
            <div className="w-full lg:w-auto">
              <div className="w-full lg:w-auto">
                <div className="grid grid-cols-1 gap-0">
                  {/* Occupancy (kept) */}
                  <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    <div className="flex items-center gap-2 lg:gap-3 h-full">
                      <div className="p-2 bg-rose-500/20 rounded-xl group-hover:bg-rose-500/30 transition-colors duration-300">
                        <Users className="w-4 h-4 lg:w-5 lg:h-5 text-rose-400" />
                      </div>
                      <div>
                        <div className="text-xl lg:text-2xl font-bold text-white">{typeof occupancyPercent === 'number' ? `${occupancyPercent}%` : 'n/a'}</div>
                        <div className="text-xs text-rose-200 font-medium uppercase tracking-wide">Occupancy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  {/* Main content */}
  <main className="flex-1 overflow-y-auto">
    <div className="min-h-full bg-gray-50">
      <div className="w-full p-6 space-y-6">

        <Tabs defaultValue="folders" className="w-full">
          <TabsList className="flex flex-row flex-nowrap items-start justify-start overflow-x-auto bg-white border border-gray-200 rounded-lg gap-2 p-1 w-auto">
            <TabsTrigger value="folders" className="flex items-center gap-2 whitespace-nowrap">
              <FolderIcon className="w-4 h-4" />
              Folders
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2 whitespace-nowrap">
              <Users className="w-4 h-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="audits" className="flex items-center gap-2 whitespace-nowrap">
              <Tag className="w-4 h-4" />
              Audits
            </TabsTrigger>
            <TabsTrigger value="rotas" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4" />
              Rotas
            </TabsTrigger>
            <TabsTrigger value="risk-assessments" className="flex items-center gap-2 whitespace-nowrap">
              <Shield className="w-4 h-4" />
              Risk Assessments
            </TabsTrigger>
            <TabsTrigger value="appraisals-supervisions" className="flex items-center gap-2 whitespace-nowrap">
              <UserCheck className="w-4 h-4" />
              Appraisals & Supervisions
            </TabsTrigger>
            <TabsTrigger value="action-plans" className="flex items-center gap-2 whitespace-nowrap">
              <CheckCircle className="w-4 h-4" />
              Action Plans
            </TabsTrigger>
            {/* Management / staff-category triggers removed — TeamsView handles those categories */}
          </TabsList>
          { /* Dependency tab disabled for now */ }
          
          <TabsContent value="folders" className="mt-6 flex-1">
            <div className="flex flex-col lg:flex-row gap-8 flex-1">
              <div className="flex-1 flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Location</div>
                    <nav className="text-sm text-muted-foreground mt-1">
                      {breadcrumb.map((b, index) => (
                        <button
                          key={b.id}
                          onClick={() => navigateToCrumb(index)}
                          className={`mr-2 inline-flex items-center ${index < breadcrumb.length - 1 ? 'text-blue-600 hover:underline' : 'text-slate-700 font-medium'}`}
                        >
                          {b.name}{index < breadcrumb.length - 1 ? ' / ' : ''}
                        </button>
                      ))}
                    </nav>
                  </div>
                  <div>
                    {stack.length > 0 ? (
                      <button
                        onClick={() => setStack(s => s.slice(0, -1))}
                        className="text-sm text-muted-foreground hover:text-slate-900"
                      >
                        ← Back
                      </button>
                    ) : null}
                  </div>
                </div>

                <main className="overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {currentFolder.items?.map((item) => (
                      <Card
                        key={item.id}
                        className="hover:shadow-lg transition-all duration-300 cursor-pointer min-h-[100px] w-full border border-gray-200 hover:border-gray-300"
                        onClick={() => {
                          if (item.type === 'folder') {
                            pushFolder(item.id);
                            return;
                          }
                          // If it's a document, dispatch the shared navigation event so
                          // the admin page can listen and open DocumentView.
                          try {
                            const documentId = item.id;
                            if (typeof window !== 'undefined' && window.dispatchEvent) {
                              window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: item.name } }));
                              try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                              if (item.name) try { localStorage.setItem('lastHighlightedDocumentName', item.name); } catch (e) {}
                            }
                          } catch (e) {
                            // ignore
                          }
                        }}
                      >
                        <CardHeader className="p-0">
                          <div className="flex items-stretch">
                            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-l flex-shrink-0 border-r border-blue-100/50">
                              {item.type === 'folder' ? (
                                <FolderIcon className="w-7 h-7 text-yellow-500" />
                              ) : (
                                getFileIcon(item.fileType)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Title bar with subtle colored background */}
                              <div className="px-3 py-2 bg-gradient-to-r from-slate-50/40 via-transparent to-transparent dark:from-slate-800/40 rounded-r">
                                <p className="font-medium break-words text-slate-900 dark:text-slate-100">{item.name}</p>
                                {item.type === 'folder' && (
                                  <p className="text-sm text-muted-foreground">{item.items?.filter(c => c.type === 'document').length} document{(item.items?.filter(c => c.type === 'document').length === 1) ? '' : 's'}</p>
                                )}
                                {item.type === 'document' && (
                                  <p className="text-sm text-muted-foreground">Uploaded: {new Date(item.createdAt).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </main>
              </div>

              <aside className="w-full lg:w-80">
                <div className="space-y-4">
                  <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="text-sm font-semibold text-gray-900">Recent uploads</div>
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y divide-blue-100/50">
                        {recentUploads.length === 0 && <div className="text-sm text-muted-foreground">No recent uploads</div>}
                        {recentUploads.map((r, idx) => (
                          <li key={r.name + String(r.createdAt) + idx} className="py-2">
                            <button
                              onClick={() => {
                                try {
                                  let documentId = (r as any).id || (r as any).documentId || null;

                                  // If no explicit id, try to find the document by name in the workspace folders
                                  if (!documentId && r && r.name) {
                                    const targetName = String(r.name).toLowerCase().trim();
                                    const findDoc = (items: any[]): string | null => {
                                      for (const it of items || []) {
                                        if (it.type === 'document') {
                                          const n = String(it.name || '').toLowerCase().trim();
                                          if (n === targetName || n.includes(targetName) || targetName.includes(n)) return it.id;
                                        } else if (it.type === 'folder') {
                                          const res = findDoc(it.items || []);
                                          if (res) return res;
                                        }
                                      }
                                      return null;
                                    };
                                    try {
                                      const found = findDoc(workspace.folders || []);
                                      if (found) documentId = found;
                                    } catch (e) {
                                      // ignore
                                    }

                                    // last-resort: slugify name (legacy behavior)
                                    if (!documentId) {
                                      documentId = String(r.name).replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    }
                                  }

                                  if (documentId && typeof window !== 'undefined' && window.dispatchEvent) {
                                    window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: r.name } }));
                                    try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                                    if (r.name) try { localStorage.setItem('lastHighlightedDocumentName', r.name); } catch (e) {}
                                  } else {
                                    console.warn('Could not locate document for recent upload:', r.name);
                                  }
                                } catch (e) { console.warn('Recent upload click error', e); }
                              }}
                              className="w-full text-left cursor-pointer hover:underline"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm truncate">{r.name}</div>
                                <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="text-sm font-semibold text-gray-900">Top file types</div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {Object.entries(fileTypeCounts).length === 0 && <div className="text-sm text-muted-foreground">No documents</div>}
                        {Object.entries(fileTypeCounts).slice(0, 8).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400" /> {k}</div>
                            <div className="font-medium">{v}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {/* occupancy moved to header */}
                </div>
              </aside>
            </div>
          </TabsContent>
          
          <TabsContent value="teams" className="mt-6">
            {/* Render TeamsView without its full-width header when embedded in admin view */}
            <div className="mb-4 flex items-center justify-between">
              <div />
              <NewTeamDialogWrapper workspaceId={workspace.id} />
            </div>
            <TeamsView workspace={workspace} hideHeader />
          </TabsContent>
          
          <TabsContent value="stats" className="mt-6">
            <StatsView
              workspace={workspace}
              totalFolders={totalFolders}
              totalDocuments={totalDocuments}
              occupancyPercent={occupancyPercent as any}
              fileTypeCounts={fileTypeCounts}
              recentUploads={recentUploads}
              staffingData={staffingData}
              staffingHistory={staffingHistory}
              residents={residents}
              communities={communities}
              aggregateWoundsData={aggregateWoundsData}
              aggregateFallsData={aggregateFallsData}
              aggregateInfectionData={aggregateInfectionData}
              aggregateAuditData={aggregateAuditData}
            />
          </TabsContent>
          
          <TabsContent value="audits" className="mt-6">
            <AuditsView
              workspace={workspace}
              recentUploads={recentUploads}
              aggregateAuditData={aggregateAuditData}
            />
          </TabsContent>
          
          <TabsContent value="rotas" className="mt-6">
            <AdminRotasView workspace={workspace} />
          </TabsContent>
          
          <TabsContent value="risk-assessments" className="mt-6">
            <div className="space-y-6">
              {riskAssessmentsLoading && riskAssessments.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-14">
                  <Loader2 className="h-6 w-6 animate-spin text-red-700" />
                </div>
              ) : riskAssessments.length === 0 ? (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      Risk Assessments
                    </h3>
                    <p className="text-sm text-gray-600">Read-only view of all risk assessments in this workspace</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No risk assessments found</p>
                      <p className="text-sm text-gray-400 mt-1">Risk assessments will appear here when created</p>
                    </div>
                  </CardContent>
                </Card>
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
                                      <Calendar className="h-4 w-4" />
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
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
                        {TRACKER_CARD_META.map(meta => {
                          const recordsForType = selectedMonthRecordsByType[meta.type];
                          const latestRecord = recordsForType[0] ?? null;
                          const hasRecord = recordsForType.length > 0;
                          const isCurrentSelection = selectedMonthKey === getMonthKeyFromDate(new Date());
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
                                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                      Saved {latestRecord ? formatDateTime(latestRecord.createdAt) : '—'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                                      {recordsForType.length === 1 ? '1 entry captured' : `${recordsForType.length} entries captured`}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">No risk assessments saved for this month.</p>
                                )}
                                <div className="flex items-center gap-3">
                                  {hasRecord ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => latestRecord && setSelectedRiskAssessment(latestRecord)}
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
                                    <Button size="sm" variant="outline" onClick={() => setSelectedRiskAssessment(record)}>
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
          </TabsContent>
          
          <TabsContent value="appraisals-supervisions" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {appraisalsSupervisionsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{appraisalsSupervisionsError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAppraisalsSupervisionsError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {appraisalsSupervisionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <span>Loading appraisals/supervisions data...</span>
                  </div>
                </div>
              ) : appraisalsMonths.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-current">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No appraisals/supervisions data yet</h3>
                  <p className="mb-4">Appraisals and supervisions will appear here once staff members complete them.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-blue-900">Appraisals &amp; Supervisions Tracker</h2>
                        <p className="text-sm text-blue-900/80">Monitor monthly completion progress across teams.</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-blue-900">
                        <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                          {selectedAppraisalsMonth?.percentComplete ?? 0}% complete
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {appraisalsTrackedYears.map((year) => {
                      const monthsForYear = appraisalsMonths.filter(month => month.year === year);
                      const savedCount = monthsForYear.filter(month => month.hasData).length;
                      const isSelectedYear = selectedAppraisalsMonth?.year === year;

                      return (
                        <div key={year} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h2 className="text-lg font-semibold text-gray-900">{year} tracker</h2>
                              <p className="text-sm text-gray-500">Select a month to review completions.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                {savedCount} saved
                              </span>
                              {isSelectedYear && (
                                <Popover open={appraisalsDatePickerOpen} onOpenChange={setAppraisalsDatePickerOpen}>
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
                                      selected={selectedAppraisalsMonthDate ?? undefined}
                                      defaultMonth={selectedAppraisalsMonthDate ?? new Date(year, 0, 1)}
                                      onSelect={handleAppraisalsDatePickerSelect}
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
                            {MONTH_NAMES.map((monthLabel, index) => {
                              const monthKey = getTrackerMonthKey(index, year);
                              const monthSummary = appraisalsMonthByKey.get(monthKey);
                              const isSelected = selectedAppraisalsMonthKey === monthKey;
                              const hasData = appraisalsMonthKeysWithData.has(monthKey);
                              const completionPercent = monthSummary?.percentComplete ?? 0;
                              const completedCount = monthSummary?.totalCompleted ?? 0;
                              const totalCount = monthSummary?.totalAppraisals ?? totalAppraisalsPerMonth;
                              return (
                                <button
                                  key={monthKey}
                                  type="button"
                                  onClick={() => handleSelectAppraisalsMonth(monthKey)}
                                  className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                                    hasData ? 'bg-white hover:border-indigo-400 hover:shadow-md' : 'border-dashed border-gray-300 bg-slate-50 text-gray-500 hover:border-gray-300'
                                  } ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-sm font-semibold ${hasData ? 'text-gray-900' : 'text-gray-500'}`}>
                                      {monthLabel.slice(0, 3)}
                                    </span>
                                    {hasData ? (
                                      <span className="text-xs font-semibold text-indigo-600">{completionPercent}%</span>
                                    ) : (
                                      <span className="text-xs text-gray-400">No data</span>
                                    )}
                                  </div>
                                  <div className="mt-3 text-xs text-gray-600">
                                    {hasData ? `${completedCount}/${totalCount} complete` : 'Tracker not started'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedAppraisalsMonth && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{selectedAppraisalsMonthLabel || 'Tracker summary'}</h3>
                          <p className="text-sm text-gray-600">{selectedAppraisalsProgress} appraisals completed</p>
                          {isViewingPastAppraisalsMonth && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              Reviewing a past month
                            </div>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {selectedAppraisalsMonth.percentComplete}% complete
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {selectedAppraisalsMonth.roles.map(roleSummary => {
                          const isComplete = roleSummary.percentComplete === 100;
                          const outstandingCount = roleSummary.remainingSlugs.length;
                          return (
                            <div
                              key={roleSummary.role}
                              className="group relative flex h-full flex-col justify-between rounded-xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50/40 p-5 shadow-sm transition-all hover:shadow-lg"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-base font-semibold text-gray-900">{roleSummary.role}</h4>
                                  <p className="text-xs text-gray-500">{roleSummary.completedSlugs.length}/{roleSummary.totalAppraisals} completed</p>
                                </div>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                                  isComplete ? 'bg-emerald-500 text-white' : roleSummary.percentComplete > 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {isComplete ? '✓' : `${roleSummary.percentComplete}%`}
                                </div>
                              </div>

                              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className={`${isComplete ? 'bg-emerald-500' : 'bg-blue-500'} h-2 rounded-full transition-all`}
                                  style={{ width: `${roleSummary.percentComplete}%` }}
                                />
                              </div>

                              <div className="mt-5 space-y-4 text-sm">
                                {roleSummary.completedSlugs.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                                    <div className="mt-2 space-y-2">
                                      {roleSummary.completedSlugs.map(slug => (
                                        <div key={slug} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                                          <span className="font-medium">{getAppraisalTitle(slug)}</span>
                                          <button
                                            onClick={() => openAppraisalsReadOnlyViewer(slug, selectedAppraisalsMonth.month, selectedAppraisalsMonth.year)}
                                            className="text-xs font-semibold text-emerald-700 underline decoration-emerald-400 hover:text-emerald-800"
                                          >
                                            View
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {roleSummary.remainingSlugs.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Outstanding</p>
                                    <div className="mt-2 space-y-2">
                                      {roleSummary.remainingSlugs.map(slug => (
                                        <div key={slug} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700">
                                          <span>{getAppraisalTitle(slug)}</span>
                                          <span className="text-xs text-gray-500">Read-only view</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
                                {outstandingCount > 0 && isSelectedAppraisalsMonthActive && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                                    {outstandingCount} outstanding
                                  </span>
                                )}
                                {roleSummary.completedSlugs.length === 0 && outstandingCount === 0 && (
                                  <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-gray-500">No appraisals configured</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="action-plans" className="mt-6">
            <div className="space-y-6">
              {/* Error Display */}
              {actionPlansError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">Error</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{actionPlansError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActionPlansError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {actionPlansLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <span>Loading action plans data...</span>
                  </div>
                </div>
              ) : actionPlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-current">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No action plans data yet</h3>
                  <p className="mb-4">Action plans will appear here once corrective actions are created.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-blue-900">Action Plans Tracker</h2>
                        <p className="text-sm text-blue-900/80">Monitor monthly corrective action progress across teams.</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-blue-900">
                        <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                          {actionPlans.length} plans tracked
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {actionPlansTrackedYears.map((year) => {
                      const plansForYear = actionPlans.filter(plan => plan.monthKey.slice(0, 4) === year);
                      const savedCount = plansForYear.length;
                      const isSelectedYear = selectedActionPlansMonth?.monthKey.startsWith(year);

                      return (
                        <div key={year} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h2 className="text-lg font-semibold text-gray-900">{year} tracker</h2>
                              <p className="text-sm text-gray-500">Select a month to review action plans.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                {savedCount} saved
                              </span>
                              {isSelectedYear && (
                                <Popover open={actionPlansDatePickerOpen} onOpenChange={setActionPlansDatePickerOpen}>
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
                                      selected={selectedActionPlansMonthDate ?? undefined}
                                      defaultMonth={selectedActionPlansMonthDate ?? new Date(Number(year), 0, 1)}
                                      onSelect={handleActionPlansDatePickerSelect}
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
                            {MONTH_NAMES.map((monthLabel, index) => {
                              const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                              const plan = actionPlans.find(p => p.monthKey === monthKey);
                              const isSelected = selectedActionPlansMonthKey === monthKey;
                              const hasData = Boolean(plan);
                              const completionPercent = plan?.progressPercent ?? 0;
                              const completedCount = plan?.completedItems ?? 0;
                              const totalCount = plan?.totalItems ?? 0;
                              return (
                                <button
                                  key={monthKey}
                                  type="button"
                                  onClick={() => handleSelectActionPlansMonth(monthKey)}
                                  className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                                    hasData ? 'bg-white hover:border-indigo-400 hover:shadow-md' : 'border-dashed border-gray-300 bg-slate-50 text-gray-500 hover:border-gray-300'
                                  } ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-sm font-semibold ${hasData ? 'text-gray-900' : 'text-gray-500'}`}>
                                      {monthLabel.slice(0, 3)}
                                    </span>
                                    {hasData ? (
                                      <span className="text-xs font-semibold text-indigo-600">{completionPercent}%</span>
                                    ) : (
                                      <span className="text-xs text-gray-400">No data</span>
                                    )}
                                  </div>
                                  <div className="mt-3 text-xs text-gray-600">
                                    {hasData ? `${completedCount}/${totalCount} complete` : 'No action plan'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedActionPlansMonth && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{selectedActionPlansMonthLabel || 'Action plan summary'}</h3>
                          <p className="text-sm text-gray-600">{selectedActionPlansMonth.completedItems} of {selectedActionPlansMonth.totalItems} actions completed</p>
                          {isViewingPastActionPlansMonth && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              Reviewing a past month
                            </div>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {selectedActionPlansMonth.progressPercent}% complete
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {selectedActionPlansMonth.items.map((item: ActionPlanItem) => {
                          const isComplete = item.status === 'completed';
                          return (
                            <div
                              key={item.id}
                              className="group relative flex h-full flex-col justify-between rounded-xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50/40 p-5 shadow-sm transition-all hover:shadow-lg"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-base font-semibold text-gray-900">{item.issue}</h4>
                                  <p className="text-xs text-gray-500">{item.auditType.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                                </div>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                                  isComplete ? 'bg-emerald-500 text-white' : item.status === 'in-progress' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {isComplete ? '✓' : item.status === 'in-progress' ? '○' : '○'}
                                </div>
                              </div>

                              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className={`${isComplete ? 'bg-emerald-500' : 'bg-blue-500'} h-2 rounded-full transition-all`}
                                  style={{ width: `${item.status === 'completed' ? 100 : item.status === 'in-progress' ? 50 : 0}%` }}
                                />
                              </div>

                              <div className="mt-5 space-y-4 text-sm">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Status</p>
                                  <div className="mt-2 space-y-2">
                                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700">
                                      <span className="font-medium">{item.status.replace('-', ' ').toUpperCase()}</span>
                                      <span className="text-xs text-gray-500">Read-only view</span>
                                    </div>
                                  </div>
                                </div>

                                {item.assignedTeam && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Assigned To</p>
                                    <div className="mt-2 space-y-2">
                                      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                                        <span className="font-medium">{item.assignedTeam}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {item.ragRating && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Priority</p>
                                    <div className="mt-2 space-y-2">
                                      <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                                        item.ragRating === 'red' ? 'border-red-200 bg-red-50 text-red-700' :
                                        item.ragRating === 'amber' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                                        'border-green-200 bg-green-50 text-green-700'
                                      }`}>
                                        <span className="font-medium">{item.ragRating.toUpperCase()}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
                                {item.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                    Completed
                                  </span>
                                )}
                                {item.status === 'in-progress' && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                                    In progress
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </main>

  {/* Risk Assessment Detail Dialog */}
  <Dialog open={!!selectedRiskAssessment} onOpenChange={(open) => setSelectedRiskAssessment(open ? selectedRiskAssessment : null)}>
    <DialogContent className="flex max-h-[85vh] min-h-[60vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl p-0">
      {selectedRiskAssessment ? (
        <>
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-red-600" />
              <span>Risk Assessment Details</span>
            </DialogTitle>
            <DialogDescription>
              Created {selectedRiskAssessment!.createdAt.toLocaleDateString()}
              {selectedRiskAssessment!.createdBy?.name ? ` • ${selectedRiskAssessment!.createdBy!.name}` : selectedRiskAssessment!.createdBy?.email ? ` • ${selectedRiskAssessment!.createdBy!.email}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6">
            <div className="mx-auto w-full max-w-3xl space-y-8 py-6 pr-2">
              {renderRiskAssessmentDetail(selectedRiskAssessment!.form)}
            </div>
          </div>
        </>
      ) : null}
    </DialogContent>
  </Dialog>

  {/* Appraisals & Supervisions Detail Dialog */}
  <Dialog open={!!selectedAppraisal} onOpenChange={(open) => setSelectedAppraisal(open ? selectedAppraisal : null)}>
    <DialogContent className="flex max-h-[85vh] min-h-[60vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl p-0">
      {selectedAppraisal ? (
        <>
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Appraisal & Supervision Details</span>
            </DialogTitle>
            <DialogDescription>
              Created {selectedAppraisal!.createdAt.toLocaleDateString()}
              {selectedAppraisal!.createdBy?.name ? ` • ${selectedAppraisal!.createdBy!.name}` : selectedAppraisal!.createdBy?.email ? ` • ${selectedAppraisal!.createdBy!.email}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6">
            <div className="mx-auto w-full max-w-3xl space-y-8 py-6 pr-2">
              {renderAppraisalDetail(selectedAppraisal!.form)}
            </div>
          </div>
        </>
      ) : null}
    </DialogContent>
  </Dialog>

  {/* Action Plans Detail Dialog */}
  <Dialog open={!!selectedActionPlan} onOpenChange={(open) => setSelectedActionPlan(open ? selectedActionPlan : null)}>
    <DialogContent className="flex max-h-[85vh] min-h-[60vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl p-0">
      {selectedActionPlan ? (
        <>
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckSquare className="w-5 h-5 text-green-600" />
              <span>Action Plan Details</span>
            </DialogTitle>
            <DialogDescription>
              Created {selectedActionPlan!.createdAt.toLocaleDateString()}
              {selectedActionPlan!.createdBy?.name ? ` • ${selectedActionPlan!.createdBy!.name}` : selectedActionPlan!.createdBy?.email ? ` • ${selectedActionPlan!.createdBy!.email}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-muted/20 px-6 pb-6">
            <div className="mx-auto w-full max-w-3xl space-y-8 py-6 pr-2">
              {renderActionPlanDetail(selectedActionPlan!.form)}
            </div>
          </div>
        </>
      ) : null}
    </DialogContent>
  </Dialog>
</div>
  );
}
