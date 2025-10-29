import type { Document, Folder } from "@/lib/types";
import type { CqcRegulationMatch } from '@/lib/cqc-regulations';

export const MAX_AI_STRING_FIELD = 800;
export const MAX_AI_CONTEXT_LENGTH = 1600;
export const MAX_AI_ARRAY_ITEMS = 10;
export const MAX_AI_OBJECT_KEYS = 30;
export const MAX_AI_DEPTH = 4;

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  documents?: Array<{
    id?: string;
    name?: string;
    status?: 'current' | 'due-soon' | 'overdue' | 'updated';
    statusText?: string;
    subtitle?: string;
    url?: string;
    summary?: string;
    lastReviewed?: string;
    nextReviewRequired?: string;
    regulations?: CqcRegulationMatch[];
  }>;
  users?: Array<{ id?: string; name?: string; email?: string; role?: string; avatarUrl?: string; createdAt?: string }>;
  teams?: Array<{ id: string; name: string; memberCount?: number; description?: string }>;
  actions?: Array<{ id: string; title: string; description?: string; status?: string; dueDate?: string; priority?: string }>;
  regulation?: (CqcRegulationMatch & { snippet?: string });
  audits?: Array<{
    auditType?: string;
    name?: string;
    isCompletedThisMonth?: boolean;
    scorePercent?: number | null;
    snapshotCreatedAt?: string | null;
    downloadUrl?: string | null;
    documentId?: string | null;
  }>;
}

export interface ChatPanelProps {
  selectedItem: Document | Folder;
  onFolderAdd: (folderName: string) => void;
  organisationId?: string | null;
}

export interface UserIntent {
  type: string;
  originalInput?: string;
  auditType?: string;
  modalType?: string;
  specificAppraisal?: string;
  specificPolicy?: string;
  searchTerm?: string;
  folderName?: string;
  userName?: string;
  pagePath?: string;
  openDocument?: boolean;
  fileName?: string;
  emailSubject?: string;
  emailBody?: string;
  specificAudit?: string;
  createAudit?: boolean;
  documentType?: string;
  regulationCode?: string;
  regulationFocus?: string;
  regulationQuestion?: string;
  [key: string]: any;
}

export interface RegulationConversationContext {
  code?: string | null;
  title?: string;
  summary: string;
  question: string;
  url?: string | null;
  focus?: string | null;
  sources?: Array<{ title?: string; url: string }>;
}

export type DependencyPoint = {
  date: string;
  totalStaff: number;
  carers: number;
  ns: number;
  levels: Record<string, number>;
  sourceUser?: string;
  id?: string;
};

export type DependencyStaffingBreakdown = {
  day: { carers: number; ns: number; total: number };
  night: { carers: number; ns: number; total: number };
  totals: { dayHours: number; nightHours: number; overallHours: number };
};

export type DependencyLatest = {
  savedAt: string;
  totalStaff: number;
  carers: number;
  ns: number;
  residentsCount: number;
  dependencyLevels: Record<string, number>;
  staffing: DependencyStaffingBreakdown;
  sourceUser?: string;
  id?: string;
};

export const DEPENDENCY_LEVEL_SYNONYMS: Record<string, string[]> = {
  Low: ['low dependency', 'low dependancy', 'low', 'band 1', 'band one', 'level 1'],
  Moderate: ['moderate dependency', 'moderate dependancy', 'moderate', 'band 2', 'band two', 'level 2'],
  High: ['high dependency', 'high dependancy', 'high', 'band 3', 'band three', 'level 3'],
  'Very High': ['very high dependency', 'very high dependancy', 'very high', 'band 4', 'band four', 'level 4'],
  Complex: ['complex dependency', 'complex dependancy', 'complex', 'maximum', 'max', 'band 5', 'band five', 'level 5'],
};

export type NormalizedShift = {
  id: string | null;
  staffId: string | null;
  staffName: string | null;
  role: string | null;
  type: string | null;
  location: string | null;
  date: string | null;
  dayKey: string | null;
  dayName: string;
  dayNumber: number;
  displayDate: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
};

export type RotaDaySummary = {
  dayKey: string;
  dayName: string;
  dayNumber: number;
  displayDate: string;
  total: number;
  roles: Record<string, number>;
  types: Record<string, number>;
  staff: string[];
  shifts: NormalizedShift[];
};

export type RotaQuickAnswerContext = {
  question: string;
  normalizedShifts: NormalizedShift[];
  normalizedUserShifts: NormalizedShift[];
  roleCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  daySummaries: Record<string, RotaDaySummary>;
  staffMap: Record<string, { name: string; shifts: NormalizedShift[]; variants: string[] }>;
  weekRangeLabel: string;
};

export const SHIFT_TYPE_SYNONYMS: Record<string, string[]> = {
  night: ['night', 'overnight', 'pm', 'late night'],
  day: ['day', 'daytime', 'am', 'morning'],
  late: ['late', 'late shift', 'twilight', 'evening'],
  early: ['early', 'early shift', 'dawn'],
};

export const AUDIT_NAME_MAP: Record<string, string> = {
  'accident-incident': 'Accident and Incident Audit',
  'infection-control': 'Infection Control Audit',
  'fire-safety': 'Fire Safety Audit',
  'health-safety': 'Health and Safety Audit',
  'kitchen': 'Kitchen Audit',
  'maintenance': 'Maintenance Audit',
  'equipment': 'Equipment Audit',
  'hand-hygiene': 'Hand Hygiene Audit',
  'care-plan': 'Care Plan Audit',
  'call-bell-monitoring': 'Call Bell Monitoring Audit',
  'mealtime': 'Mealtime Audit',
  'managers-weekly': 'Managers Weekly Audit',
  'managers-monthly': 'Managers Monthly Audit',
  'night-visit': 'Night Visit Audit',
  'restrictive-practice': 'Restrictive Practice Audit',
  'staff-file': 'Staff File Audit',
  'weight-monitoring': 'Weight Monitoring Audit',
  'wound-monitoring': 'Wound Monitoring Audit',
  'risk-register': 'Risk Register Audit',
};

export const AUDIT_SLUG_SYNONYMS: Record<string, string> = {
  'accident incident': 'accident-incident',
  'accidentincident': 'accident-incident',
  'accident and incident': 'accident-incident',
  'call bell monitoring': 'call-bell-monitoring',
  'callbellmonitoring': 'call-bell-monitoring',
  'call bell': 'call-bell-monitoring',
  'care plan': 'care-plan',
  'careplan': 'care-plan',
  'equipment': 'equipment',
  'fire safety': 'fire-safety',
  'firesafety': 'fire-safety',
  'health safety': 'health-safety',
  'healthsafety': 'health-safety',
  'infection control': 'infection-control',
  'infectioncontrol': 'infection-control',
  'kitchen & kitchenettes': 'kitchen',
  'kitchenettes': 'kitchen',
  'kitchen': 'kitchen',
  'maintenance': 'maintenance',
  'managers weekly': 'managers-weekly',
  'weekly managers': 'managers-weekly',
  'managersweekly': 'managers-weekly',
  'managers monthly': 'managers-monthly',
  'managersmonthly': 'managers-monthly',
  'mealtime': 'mealtime',
  'meal time': 'mealtime',
  'night visit': 'night-visit',
  'nightvisit': 'night-visit',
  'hand hygiene': 'hand-hygiene',
  'handhygiene': 'hand-hygiene',
  'restrictive practice': 'restrictive-practice',
  'restrictivepractice': 'restrictive-practice',
  'staff file': 'staff-file',
  'stafffile': 'staff-file',
  'weight monitoring': 'weight-monitoring',
  'weightmonitoring': 'weight-monitoring',
  'wound monitoring': 'wound-monitoring',
  'woundmonitoring': 'wound-monitoring',
  'risk register': 'risk-register',
  'riskregister': 'risk-register',
};