"use client";

import type { Document, Folder } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerDownLeft, Share2, ExternalLink, Plus } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import Fuse from 'fuse.js';
import { useAuth } from '@/hooks/use-auth';
import { mockUser } from "@/lib/data";
import { cn } from "@/lib/utils";
import { chatWithDocuments } from "@/ai/flows/chat-with-documents";
import { chatWithFolder } from "@/ai/flows/chat-with-folder";
import { useToast } from "@/hooks/use-toast";
import { DocumentCard } from "@/components/ui/document-card";
import { UserCard } from "@/components/ui/user-card";
import { TeamCard } from "@/components/ui/team-card";
import { ActionCard } from '@/components/ui/action-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { auth, db } from '@/lib/firebase';
import { collection } from 'firebase/firestore';
import { workspaceCollectionPath, workspaceBasePath, workspaceDocPath } from '@/lib/paths';
import type { CqcRegulationMatch } from '@/lib/cqc-regulations';

const MAX_AI_STRING_FIELD = 800;
const MAX_AI_CONTEXT_LENGTH = 1600;
const MAX_AI_ARRAY_ITEMS = 10;
const MAX_AI_OBJECT_KEYS = 30;
const MAX_AI_DEPTH = 4;

const clipString = (value: string | undefined | null, limit = MAX_AI_STRING_FIELD) => {
  if (!value) return value ?? undefined;
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

const summariseExtractedJson = (extracted?: Record<string, any>) => {
  if (!extracted || typeof extracted !== 'object') return undefined;
  const summary: Record<string, any> = {};

  const addString = (key: string, limit = MAX_AI_STRING_FIELD) => {
    const val = extracted[key];
    if (typeof val === 'string' && val.trim()) {
      summary[key] = clipString(val, limit);
    }
  };

  const addArray = (key: string, limit = 5) => {
    const val = extracted[key];
    if (Array.isArray(val) && val.length > 0) {
      summary[key] = val.slice(0, limit);
    }
  };

  addString('summary');
  addArray('keyFindings');
  addArray('highlights');
  addArray('risks');
  addArray('actions');

  if (Array.isArray(extracted.sections) && extracted.sections.length > 0) {
    summary.sections = extracted.sections.slice(0, 3).map((section: any) => ({
      title: section?.title,
      summary: clipString(
        typeof section?.summary === 'string'
          ? section.summary
          : typeof section?.content === 'string'
            ? section.content
            : undefined,
        MAX_AI_STRING_FIELD,
      ),
    }));
  }

  const numericEntries = Object.entries(extracted)
    .filter(([, value]) => typeof value === 'number')
    .slice(0, 10);
  if (numericEntries.length > 0) {
    summary.metrics = Object.fromEntries(numericEntries);
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
};

interface ChatMessage {
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
    regulation?: CqcRegulationMatch;
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

interface ChatPanelProps {
  selectedItem: Document | Folder;
  onFolderAdd: (folderName: string) => void;
  organisationId?: string | null;
}

interface UserIntent {
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
  [key: string]: any;
}

type DependencyPoint = {
  date: string;
  totalStaff: number;
  carers: number;
  ns: number;
  levels: Record<string, number>;
  sourceUser?: string;
  id?: string;
};

type DependencyStaffingBreakdown = {
  day: { carers: number; ns: number; total: number };
  night: { carers: number; ns: number; total: number };
  totals: { dayHours: number; nightHours: number; overallHours: number };
};

type DependencyLatest = {
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

const DEPENDENCY_LEVEL_SYNONYMS: Record<string, string[]> = {
  Low: ['low dependency', 'low dependancy', 'low', 'band 1', 'band one', 'level 1'],
  Moderate: ['moderate dependency', 'moderate dependancy', 'moderate', 'band 2', 'band two', 'level 2'],
  High: ['high dependency', 'high dependancy', 'high', 'band 3', 'band three', 'level 3'],
  'Very High': ['very high dependency', 'very high dependancy', 'very high', 'band 4', 'band four', 'level 4'],
  Complex: ['complex dependency', 'complex dependancy', 'complex', 'maximum', 'max', 'band 5', 'band five', 'level 5'],
};

type NormalizedShift = {
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

type RotaDaySummary = {
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

type RotaQuickAnswerContext = {
  question: string;
  normalizedShifts: NormalizedShift[];
  normalizedUserShifts: NormalizedShift[];
  roleCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  daySummaries: Record<string, RotaDaySummary>;
  staffMap: Record<string, { name: string; shifts: NormalizedShift[]; variants: string[] }>;
  weekRangeLabel: string;
};

const SHIFT_TYPE_SYNONYMS: Record<string, string[]> = {
  night: ['night', 'overnight', 'pm', 'late night'],
  day: ['day', 'daytime', 'am', 'morning'],
  late: ['late', 'late shift', 'twilight', 'evening'],
  early: ['early', 'early shift', 'dawn'],
};

const documentToAiContext = (doc: Document) => ({
  id: doc.id,
  name: doc.name,
  summary: clipString(doc.summary),
  folderId: doc.folderId,
  tags: Array.isArray(doc.tags) ? doc.tags.slice(0, 10) : undefined,
  renewalDate: doc.renewalDate,
  cqcRegulations: Array.isArray(doc.regulations)
    ? doc.regulations.slice(0, 5).map((reg: CqcRegulationMatch) => ({
        code: reg.code,
        label: reg.label,
        title: reg.title,
        summary: clipString(reg.summary, 200),
      }))
    : undefined,
  extracted: summariseExtractedJson(doc.extractedJson),
});

const clampForAI = (value: any, depth = 0): any => {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return clipString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (depth >= MAX_AI_DEPTH) {
      return value.slice(0, MAX_AI_ARRAY_ITEMS).map((item) =>
        typeof item === 'string'
          ? clipString(item)
          : typeof item === 'number' || typeof item === 'boolean'
            ? item
            : '[nested]'
      );
    }
    return value
      .slice(0, MAX_AI_ARRAY_ITEMS)
      .map((item) => clampForAI(item, depth + 1));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).slice(0, MAX_AI_OBJECT_KEYS);
    const result: Record<string, any> = {};
    for (const [key, val] of entries) {
      result[key] = clampForAI(val, depth + 1);
    }
    return result;
  }
  const asString = String(value);
  return clipString(asString);
};

const serializeForAI = (value: any) => {
  if (value === undefined) return undefined;
  try {
    const clamped = clampForAI(value);
    return JSON.stringify(clamped);
  } catch (err) {
    const fallback = clipString(String(value), MAX_AI_CONTEXT_LENGTH);
    try {
      return JSON.stringify(fallback);
    } catch {
      return fallback;
    }
  }
};

const serializeJsonForAI = (value: any) => {
  if (value === undefined) return undefined;
  const clamped = clampForAI(value);
  try {
    return JSON.stringify(clamped);
  } catch {
    return JSON.stringify(clampForAI(String(value)));
  }
};

const askAIWithWorkspaceData = async (
  query: string,
  {
    documentData,
    relatedDocuments,
    workspaceExtras,
    extraContext,
  }: {
    documentData?: any;
    relatedDocuments?: any;
    workspaceExtras?: Record<string, any>;
    extraContext?: Record<string, any>;
  },
  buildWorkspaceContext: (extras?: Record<string, any>) => string | undefined
) => {
  const documentJson = serializeJsonForAI(documentData ?? {});
  const relatedJson = serializeJsonForAI(relatedDocuments);
  const workspaceContext = buildWorkspaceContext(workspaceExtras) ?? '{}';
  const extrasJson = serializeForAI(extraContext);

  const result = await chatWithDocuments({
    query,
    documentJson: documentJson ?? '{}',
    relatedDocumentsJson: relatedJson,
    workspaceContext,
    extraContext: extrasJson,
  });

  return result.answer;
};

export function ChatPanel({ selectedItem, onFolderAdd, organisationId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = React.useRef<ChatMessage[]>(messages);
  const appendMessages = (newMsgs: ChatMessage[] | ChatMessage) => {
    const toAppend = Array.isArray(newMsgs) ? newMsgs : [newMsgs];
    messagesRef.current = [...messagesRef.current, ...toAppend];
    setMessages(messagesRef.current);
  };
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [lastContext, setLastContext] = useState<{ doc?: Document; topic?: string } | null>(null);
  const { user } = useAuth();
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user?.avatarUrl ?? mockUser.avatarUrl ?? undefined);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const getAllDocuments = (items: (Document | Folder)[]): Document[] => {
    const documents: Document[] = [];
    for (const item of items) {
      if ((item as any).type === 'document') documents.push(item as Document);
      else if ((item as any).type === 'folder') documents.push(...getAllDocuments((item as any).items || []));
    }
    return documents;
  };

  // Listen for user doc changes to keep profilePicture in sync
  useEffect(() => {
    let unsub: (() => void) | null = null;
    const load = async () => {
      try {
        if (!user?.id) return;
        const { doc, onSnapshot } = await import('firebase/firestore');
        const userDocRef = doc(db, 'users', user.id);
        unsub = onSnapshot(userDocRef, (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as any;
          // keep profilePicture in sync
          if (data?.profilePicture) setProfilePicture(data.profilePicture as string ?? undefined);
        });
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => { if (unsub) unsub(); };
  }, [user?.id]);

  // Enhanced natural language intent detection
  const detectIntent = (userInput: string): UserIntent => {
    const raw = userInput || '';
    const normalized = raw.replace(/[’‘`]/g, "'");
    const input = normalized.toLowerCase().trim();
    
    // Audit query patterns - check these FIRST before document search
    const auditPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?audit\s+(results?|scores?|status|completion)/i,
      /(audit|audits)\s+(results?|scores?|status|completion)/i,
      /(what\s+is\s+the\s+status\s+of|check)\s+(the\s+)?audit/i,
      /(are\s+there\s+any|list)\s+(overdue|pending|completed)\s+audits/i
    ];

    for (const pattern of auditPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'audit_query',
          originalInput: userInput
        };
      }
    }

    // Dependency/staffing query patterns - check before document search
    const dependencyPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?(dependency|dependencies|staffing|staff)\s+(data|levels?|calculations?|requirements?|breakdown|analysis)/i,
      /(dependency|dependencies|staffing|staff)\s+(data|levels?|calculations?|requirements?|breakdown|analysis)/i,
      /(what\s+is\s+the|check|calculate)\s+(dependency|staffing)\s+(level|requirement|data)/i,
      /(how\s+many|what)\s+(staff|carers?|nurses?)\s+(do\s+we\s+need|are\s+required)/i,
      /(staffing\s+calculator|dependency\s+calculator|staffing\s+breakdown)/i,
      /(show\s+me|get)\s+(staffing|dependency)\s+(for|at)\s+(.+)/i,
      // Explicitly match 'staffing trends' and similar phrasing so it does not fall through to document search
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?(staffing|staff)\s+(trends|trend|history|changes|overview|summary)/i,
      /(staffing|staff)\s+(trends|trend|history|changes|overview|summary)/i,
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(staffing|staff)\s+(trend|history|overview|summary)/i
    ];

    for (const pattern of dependencyPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'dependency_query',
          originalInput: userInput
        };
      }
    }

    if (/(how\s+many|number|count|total)\s+(of\s+)?(residents?|people|individuals?)/i.test(input)) {
      return {
        type: 'dependency_query',
        originalInput: userInput
      };
    }

    if (/(low|moderate|high|very\s+high|complex)\s+depend(?:e|a)nc(?:y|ies)?\s+residents?/i.test(input)) {
      return {
        type: 'dependency_query',
        originalInput: userInput
      };
    }

    if (/depend(?:e|a)nc(?:y|ies)?\s+(levels?|bands?).*(residents?|people)/i.test(input)) {
      return {
        type: 'dependency_query',
        originalInput: userInput
      };
    }

    if (/(residents?|people).*(depend(?:e|a)nc(?:y|ies)?)/i.test(input)) {
      return {
        type: 'dependency_query',
        originalInput: userInput
      };
    }

    // Multi-document query patterns
    const multiDocPatterns = [
      /(compare|difference|differences|similarities|all|list|summarize all|summarise all|overview of|across|between|versus|vs\.?|compare .* and .*)/i
    ];
    for (const pattern of multiDocPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'multi_document_query',
          originalInput: userInput
        };
      }
    }

    // Policy opening patterns - check these before open modal patterns
    const policyOpeningPatterns = [
      /(?:show|open|view|display|get|find|bring\s+up|pull\s+up)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+policy/i,
      /(?:show|open|view|display|get|find)\s+(?:me\s+)?(?:the\s+)?policy\s+(?:for|about|on)\s+(.+)/i,
      /(?:let's|let\s+us)\s+(?:look\s+at|check\s+out|see)\s+(?:the\s+)?(.+?)\s+policy/i,
      /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:see|view|open)\s+(?:the\s+)?(.+?)\s+policy/i,
      /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:show|open|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+policy/i,
      /(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(.+?)\s+policy/i
    ];

    for (const pattern of policyOpeningPatterns) {
      const match = input.match(pattern);
      if (match) {
        let policyName = (match[1] || match[2] || '').trim();

        // Remove common words that aren't part of the policy name
        policyName = policyName.replace(/\b(the|me|my|an|a|for|about|on|let's|let\s+us|can\s+you|could\s+you|please|take\s+me|go\s+to|navigate\s+to|i\s+want|i\s+need|to\s+see|to\s+view|to\s+open|policy)\b/g, '').trim();

        return {
          type: 'open_policy',
          specificPolicy: policyName,
          originalInput: userInput
        };
      }
    }

    // Open modal patterns - check these AFTER policy patterns
    const openModalPatterns = [
      // Specific appraisal patterns - must contain appraisal-related keywords
      /(open|show|launch|start|how)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
      /(go\s+to|navigate\s+to)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
      /(open|show|how)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)\s+(page|form)/i,
      // Handle "show me" and "how me" patterns with appraisal keywords
      /(show|how)\s+me\s+(.+?)\s+(appraisal|evaluation|assessment)/i,
      /(show|how)\s+me\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
      // Existing patterns for backward compatibility - specific modal types
      /(open|start|launch|show|how)\s+(the\s+)?(tracker|appraisal|audit)\s+(modal|window|form)/i,
      /(open|start|launch|show|how)\s+(tracker|appraisal|audit)/i,
      /(i\s+want\s+to|let's)\s+(track|appraise|audit)/i,
      // Direct appraisal name patterns - must have appraisal context
      /(i\s+want\s+to|let's)\s+(see|open|do)\s+(.+?)\s+(appraisal|evaluation|assessment)/i
    ];

    for (const pattern of openModalPatterns) {
      const match = input.match(pattern);
      if (match) {
        // Extract modal type from different capture group positions
        let modalType = '';
        let specificAppraisal = '';

        // Handle new direct appraisal patterns (patterns 1-4)
        if (pattern.source.includes('me\\s+(.+)') && match[2]) {
          // Pattern 1: /(show|open|launch|start|how)\s+me\s+(.+)/i
          specificAppraisal = match[2].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        } else if (pattern.source.includes('the\\s+)?(.+)') && !pattern.source.includes('appraisal|evaluation|assessment') && match[3]) {
          // Pattern 2: /(show|open|launch|start|how)\s+(the\s+)?(.+)/i
          specificAppraisal = match[3].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        } else if (pattern.source.includes('go\\s+to|navigate\\s+to') && match[2]) {
          // Pattern 3: /(go\s+to|navigate\s+to)\s+(.+)/i
          specificAppraisal = match[2].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        } else if (pattern.source.includes('want\\s+to|let\'s') && match[3]) {
          // Pattern 4: /(i\s+want\s+to|let's)\s+(see|open|do)\s+(.+)/i
          specificAppraisal = match[3].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        }
        // Handle existing patterns
        else if (match[3] && ['tracker', 'appraisal', 'audit'].includes(match[3].toLowerCase())) {
          modalType = match[3].toLowerCase(); // For pattern 5: tracker/appraisal/audit
        } else if (match[2] && ['tracker', 'appraisal', 'audit'].includes(match[2].toLowerCase())) {
          modalType = match[2].toLowerCase(); // For pattern 6: tracker/appraisal/audit
        } else if (match[3] && ['track', 'appraise', 'audit'].includes(match[3].toLowerCase())) {
          // Convert verb forms to modal types
          const verbToModal = { 'track': 'tracker', 'appraise': 'appraisal', 'audit': 'audit' };
          modalType = verbToModal[match[3].toLowerCase() as keyof typeof verbToModal] || '';
        } else if (match[3] || match[4] || match[5] || match[6]) {
          // Specific appraisal name detected - check multiple capture groups (patterns 7-11)
          specificAppraisal = (match[3] || match[4] || match[5] || match[6] || '').trim().toLowerCase();
          // Remove common words that aren't part of the appraisal name
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        }

        if (modalType) {
          return {
            type: 'open_modal',
            modalType: modalType,
            specificAppraisal: specificAppraisal,
            originalInput: userInput
          };
        }
      }
    }

    // Navigate page patterns - check these before document search
    const navigatePagePatterns = [
      /(go\s+to|navigate\s+to|open|show)\s+(the\s+)?(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)\s+(page|section)/i,
      /(go\s+to|navigate\s+to|open)\s+(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)/i,
      /(take\s+me\s+to|bring\s+me\s+to)\s+(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)/i
    ];

    for (const pattern of navigatePagePatterns) {
      const match = input.match(pattern);
      if (match) {
        const pagePath = (match[2] || match[3] || '').toLowerCase().replace(/\s+/g, '-');
        return {
          type: 'navigate_page',
          pagePath: pagePath,
          originalInput: userInput
        };
      }
    }

    // Special case: Handle "summarise this" and similar phrases that should use active document
    const summariseThisPatterns = [
      /\b(summaris|summarize|summarise)\s+(this|it|the\s+document|the\s+policy|the\s+file)\b/i,
      /\b(tell\s+me\s+about|what\s+is|explain)\s+(this|it|the\s+document|the\s+policy|the\s+file)\b/i,
      /\b(give\s+me\s+a\s+summary|provide\s+a\s+summary)\s+(of\s+)?(?:this|it|the\s+document|the\s+policy|the\s+file)\b/i
    ];

    for (const pattern of summariseThisPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'general_query',
          originalInput: userInput
        };
      }
    }

    // Document search patterns - much more flexible
    const searchPatterns = [
      // Direct requests
      /^(please\s+)?(find|show|get|give|display|locate|open|view|search|look\s+for|bring\s+up|pull\s+up|summarize|summarise|summarise\s+for\s+me|summarize\s+for\s+me)\s+(me\s+)?(the\s+)?(.+)/i,
      // Question formats
      /^(can\s+you\s+|could\s+you\s+|would\s+you\s+)?(please\s+)?(find|show|get|give|display|locate|search|look\s+for|bring\s+up|pull\s+up)\s+(me\s+)?(the\s+)?(.+)/i,
      // "I need" formats
      /^(i\s+need|i\s+want|i\s+require|i\s+am\s+looking\s+for|i\s+would\s+like)\s+(to\s+see\s+|to\s+find\s+|to\s+access\s+|the\s+)?(.+)/i,
      // "Where is" formats
      /^(where\s+is|where\s+can\s+i\s+find|where\s+are|do\s+you\s+have)\s+(the\s+)?(.+)/i,
      // "Help me" formats
      /^(help\s+me\s+|assist\s+me\s+with\s+|guide\s+me\s+to\s+)?(find|locate|access|get|summarize|summarise|summarize\s+the|summarise\s+the)\s+(the\s+)?(.+)/i,
      // Document type requests
      /^(what|which)\s+(documents?|policies|files?|papers?)\s+(do\s+we\s+have\s+|are\s+there\s+|exist\s+)?(about|for|regarding|on|related\s+to)\s+(.+)/i,
      // Status/info requests
      /^(what\s+is\s+the\s+status\s+of|when\s+is|tell\s+me\s+about|information\s+about|details\s+about|summarize|summarise)\s+(the\s+)?(.+)/i,
      // Folder-specific requests
      /^(look\s+in\s+the\s+(.+?)\s+folder\s+and\s+find\s+me\s+the\s+(.+))$/i,
      /^(in\s+the\s+(.+?)\s+folder\s+find\s+me\s+the\s+(.+))$/i,
      /^(find\s+me\s+the\s+(.+?)\s+folder)$/i
    ];

    // Check for document search intent
    for (const pattern of searchPatterns) {
      const match = input.match(pattern);
      if (match) {
        // Extract the search term from various capture groups (use raw for preserving case in locations)
        let searchTerm = (match[match.length - 1] || match[match.length - 2] || match[4] || match[5] || match[6] || '') as string;
        searchTerm = searchTerm.trim();
        if (searchTerm) {
          // Also detect verbs that imply the user wants to open/view the document rather than just get info
          const openVerbs = /\b(open|view|expand|show\s+me\s+the|open\s+the)\b/i;
          const wantsOpen = openVerbs.test(input);

          // try to extract a location/workspace phrase like 'in Wilton Manor' or 'for Wilton Manor'
          // prefer matching at end but also support inline
          const locationRegexEnd = /(?:in|at|for|from)\s+([A-Z0-9][\w\-\s&']{1,60})\.?$/i;
          const locationRegex = /(?:in|at|for|from)\s+([A-Z0-9][\w\-\s&']{1,60})/i;
          let folderName: string | undefined = undefined;
          const rawMatchEnd = raw.match(locationRegexEnd);
          const rawMatch = raw.match(locationRegex);
          if (rawMatchEnd && rawMatchEnd[1]) folderName = rawMatchEnd[1].trim();
          else if (rawMatch && rawMatch[1]) folderName = rawMatch[1].trim();

          // Remove trailing 'in <place>' from the searchTerm if present
          if (folderName) {
            const trailingPattern = new RegExp("\\b(?:in|at|for|from)\\s+" + folderName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "\\b\\.?$", 'i');
            searchTerm = searchTerm.replace(trailingPattern, '').trim();
          }

          return {
            type: 'document_search',
            openDocument: wantsOpen,
            searchTerm: searchTerm || undefined,
            folderName: folderName || undefined,
            originalInput: userInput
          };
        }
      }
    }

    // Folder creation patterns
    const folderPatterns = [
      /(create|add|make|new)\s+(a\s+|the\s+|another\s+)?folder(\s+called|\s+named|\s+titled|\s+with\s+name)?\s*(.+)?/i,
      /^(can\s+you\s+|could\s+you\s+|please\s+)?(create|add|make)\s+(a\s+|the\s+)?folder(\s+called|\s+named|\s+titled)?\s*(.+)?/i,
      /^(i\s+need|i\s+want)\s+(a\s+|to\s+create\s+a\s+)?new\s+folder(\s+called|\s+named)?\s*(.+)?/i
    ];
    
    for (const pattern of folderPatterns) {
      const match = input.match(pattern);
      if (match) {
        const folderName = (match[4] || match[5] || '').trim() || 'Untitled Folder';
        return {
          type: 'folder_creation',
          folderName,
          originalInput: userInput
        };
      }
    }
    
    // File name patterns (existing logic)
    const filePattern = /([\w\-. ]+\.(pdf|docx?|txt|csv|xlsx))/i;
    const fileMatch = userInput.match(filePattern);
    if (fileMatch) {
      return {
        type: 'file_search',
        fileName: fileMatch[1],
        originalInput: userInput
      };
    }

    // Send email patterns
    const emailPatterns = [
      /(send|email|mail)\s+(an?\s+)?email\s+(to\s+)?(the\s+)?(.+)/i,
      /(notify|alert)\s+(the\s+)?team\s+(about|regarding)\s+(.+)/i,
      /(message|contact)\s+(the\s+)?(.+)\s+(about|regarding)\s+(.+)/i
    ];

    for (const pattern of emailPatterns) {
      const match = input.match(pattern);
      if (match) {
        const content = (match[5] || match[4] || match[3] || '').trim();
        return {
          type: 'send_email',
          emailSubject: `Message from CG360 Chat`,
          emailBody: content || 'Please check your CG360 workspace for updates.',
          originalInput: userInput
        };
      }
    }

    // User search patterns
    const userPatterns = [
      /(find|search|look\s+for|who\s+is|get)\s+(me\s+)?(information\s+about|details\s+on|the\s+)?user\s+(.+)/i,
      /(who\s+is|tell\s+me\s+about)\s+(.+)/i,
      /(search\s+for|find)\s+(user|person)\s+(.+)/i
    ];

    // If the captured phrase looks like a rota/shift/query (e.g. "who is on rota this week"), skip user search
    const ROTA_HINTS = /(rota|shift|roster|schedule|on duty|on-duty|working|cover|covering)/i;
    for (const pattern of userPatterns) {
      const match = input.match(pattern);
      if (match) {
        const captured = (match[4] || match[2] || match[3] || '').trim();
        if (captured && ROTA_HINTS.test(captured)) {
          // skip - let rota detection handle this input
          continue;
        }
        const userName = captured;
        return {
          type: 'user_search',
          userName: userName,
          originalInput: userInput
        };
      }
    }

    // Audit opening patterns - handle various ways users ask to open audits
    const auditOpeningPatterns = [
      /(?:show|open|view|display|get|find|bring\s+up|pull\s+up)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit/i,
      /(?:show|open|view|display|get|find)\s+(?:me\s+)?(?:the\s+)?audit\s+(?:for|about|on)\s+(.+)/i,
      /(?:let's|let\s+us)\s+(?:look\s+at|check\s+out|see)\s+(?:the\s+)?(.+?)\s+audit/i,
      /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:see|view|open)\s+(?:the\s+)?(.+?)\s+audit/i,
      /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:show|open|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit/i,
      /(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(.+?)\s+audit/i
    ];

    for (const pattern of auditOpeningPatterns) {
      const match = input.match(pattern);
      if (match) {
        const auditName = (match[1] || match[2] || '').trim()
          .replace(/\b(the|me|my|an|a|for|about|on|let's|let\s+us|can\s+you|could\s+you|please|take\s+me|go\s+to|navigate\s+to|i\s+want|i\s+need|to\s+see|to\s+view|to\s+open)\b/g, '')
          .trim();

        const resolved = resolveAuditTypeFromName(auditName);
        const fallback = auditName
          ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : '';
        const auditType = resolved || (fallback && fallback !== 'audit' ? fallback : null);
        if (!auditType) continue;

        return {
          type: 'open_audit',
          specificAudit: auditType,
          originalInput: userInput
        };
      }
    }

    // Audit data querying patterns
    const auditDataPatterns = [
      /(?:show|tell|get|give)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit\s+(?:data|results|information|details|trends|comments|scores|overview|summary|status|report|insights?)/i,
      /(?:what\s+(?:are|is)\s+)?(?:the\s+)?(.+?)\s+audit\s+(?:results|data|comments|scores|trends|overview|summary|status|report|insights?)/i,
      /(?:show|tell|get)\s+(?:me\s+)?(?:the\s+)?audit\s+(?:data|results|information|overview|summary|status|report)\s+(?:for|about|on)\s+(.+)/i,
      /(?:what\s+(?:are|is)\s+)?(?:the\s+)?comments?\s+(?:in|for|from)\s+(?:the\s+)?(.+?)\s+audit/i,
      /(?:how\s+did|what\s+were)\s+(?:the\s+)?(.+?)\s+audit\s+(?:results|scores|perform)/i,
      /(?:audit\s+)?(?:data|results|information|trends|overview|summary|status|report|insights?)\s+(?:for|about|on)\s+(.+?)\s+audit/i
    ];

    for (const pattern of auditDataPatterns) {
      const match = input.match(pattern);
      if (match) {
        let auditName = (match[1] || match[2] || '').trim();

        // Remove common words that aren't part of the audit name
        auditName = auditName.replace(/\b(the|me|my|an|a|for|about|on|in|from|are|is|what|show|tell|get|give|how|did|were|audit|data|results|information|details|trends|comments|scores|perform|latest|all|recent)\b/g, '').trim();

        let auditType: string | null = null;

        // Handle special cases for "latest" or "all" queries
        if (input.toLowerCase().includes('latest') || input.toLowerCase().includes('all')) {
          auditType = 'all';
        } else {
          auditType = resolveAuditTypeFromName(auditName);
        }

        if (!auditType) {
          const fallback = auditName
            ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            : '';
          auditType = fallback && fallback !== 'audit' ? fallback : 'all';
        }

        return {
          type: 'audit_query',
          auditType,
          originalInput: userInput
        };
      }
    }

    const simpleAuditStatusMatch = input.match(/^(?:show|give|provide|get|tell|share)?\s*(?:me\s+)?(?:the\s+)?(.+?)\s+audit(?:\s+(?:overview|summary|status|information|info|details|report|insights?))?$/i);
    if (simpleAuditStatusMatch) {
      const auditName = simpleAuditStatusMatch[1]?.trim() || '';
      const resolved = resolveAuditTypeFromName(auditName);
      const fallback = auditName
        ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : '';
      const auditType = resolved || (fallback && fallback !== 'audit' ? fallback : 'all');
      return {
        type: 'audit_query',
        auditType,
        originalInput: userInput,
      };
    }

    // Create audit patterns
    const createAuditPatterns = [
      /(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+|new\s+)?(.+?)\s+audit/i,
      /(?:i\s+want\s+to|i\s+need\s+to|i\s+would\s+like\s+to)\s+(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
      /(?:let's|let\s+us)\s+(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
      /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
      /(?:new|create)\s+audit\s+(?:for|about|on)\s+(.+)/i
    ];

    for (const pattern of createAuditPatterns) {
      const match = input.match(pattern);
      if (match) {
        const auditName = (match[1] || match[2] || '').trim()
          .replace(/\b(a|an|new|the|let's|let\s+us|can\s+you|could\s+you|please|i\s+want|i\s+need|i\s+would\s+like|to\s+create|to\s+start|to\s+begin|to\s+make|to\s+do|to\s+perform|to\s+conduct|for|about|on)\b/g, '')
          .trim();

        const resolved = resolveAuditTypeFromName(auditName);
        const fallback = auditName
          ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : '';
        const auditType = resolved || (fallback && fallback !== 'audit' ? fallback : null);
        if (!auditType) continue;

        return {
          type: 'create_audit',
          auditType,
          createAudit: true,
          originalInput: userInput
        };
      }
    }

    // Document connection patterns
    const connectionPatterns = [
      /(link|connect|relate|associate)\s+(this|these|the)\s+(document|documents|file|files)\s+(to|with)\s+(.+)/i,
      /(find|show|get)\s+(related|connected|linked|associated)\s+(documents?|files?)\s+(to|for|about)\s+(.+)/i,
      /(what\s+(documents?|files?)\s+are\s+(related|connected|linked)\s+to)\s+(.+)/i
    ];

    for (const pattern of connectionPatterns) {
      const match = input.match(pattern);
      if (match) {
        const searchTerm = (match[5] || match[4] || '').trim();
        return {
          type: 'document_connection',
          searchTerm: searchTerm,
          originalInput: userInput
        };
      }
    }

    // User profile patterns
    const userProfilePatterns = [
      /(show|display|get|tell)\s+(me\s+)?(my\s+)?(user\s+)?profile/i,
      /(what\s+is\s+my|what's\s+my)\s+(user\s+)?info(rmation)?/i,
      /(user\s+)?details\s+(for\s+me|about\s+me)/i,
      /(my\s+)?account\s+(info|details)/i
    ];

    for (const pattern of userProfilePatterns) {
      if (pattern.test(input)) {
        return {
          type: 'user_profile',
          originalInput: userInput
        };
      }
    }

    // Team info patterns
    const teamInfoPatterns = [
      /(show|list|display|get)\s+(me\s+)?(the\s+)?teams?/i,
      /(what\s+)?team(s?)\s+(do\s+we\s+have|are\s+there|exist)/i,
      /(team|teams)\s+(information|details|members)/i,
      /(who\s+is\s+in|members\s+of)\s+(the\s+)?team/i
    ];

    for (const pattern of teamInfoPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'team_info',
          originalInput: userInput
        };
      }
    }

    // Workspace info patterns
    const workspaceInfoPatterns = [
      /(show|display|get|tell)\s+(me\s+)?(the\s+)?workspace\s+(info|details|stats|information)/i,
      /(workspace|care\s+home)\s+(details|information|stats)/i,
      /(what\s+is\s+the|tell\s+me\s+about)\s+(workspace|care\s+home)/i
    ];

    for (const pattern of workspaceInfoPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'workspace_info',
          originalInput: userInput
        };
      }
    }



    // Fetch notifications patterns
    const fetchNotificationsPatterns = [
      /(show|display|get|tell)\s+(me\s+)?(the\s+)?notifications?/i,
      /(what\s+)?recent\s+(activity|notifications?|updates?)/i,
      /(notifications?|activity|updates?)\s+(feed|list)/i,
      /(what's\s+)?new/i
    ];

    for (const pattern of fetchNotificationsPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'fetch_notifications',
          originalInput: userInput
        };
      }
    }

    // Create document patterns
    const createDocumentPatterns = [
      /(create|make|add|new)\s+(a\s+|an\s+|the\s+)?(document|policy|file)/i,
      /(i\s+want\s+to|i\s+need\s+to)\s+(create|make|add)\s+(a\s+|an\s+)?(document|policy|file)/i,
      /(new|create)\s+(document|policy|file)\s+(called|named|titled)?\s*(.+)?/i
    ];

    for (const pattern of createDocumentPatterns) {
      const match = input.match(pattern);
      if (match) {
        const documentType = (match[2] || match[4] || '').trim();
        return {
          type: 'create_document',
          documentType: documentType,
          originalInput: userInput
        };
      }
    }

    // Edit document patterns
    const editDocumentPatterns = [
      /(edit|modify|update|change)\s+(the\s+)?(.+)/i,
      /(i\s+want\s+to|i\s+need\s+to)\s+(edit|modify|update)\s+(the\s+)?(.+)/i
    ];

    for (const pattern of editDocumentPatterns) {
      const match = input.match(pattern);
      if (match) {
        const searchTerm = (match[3] || match[4] || '').trim();
        return {
          type: 'edit_document',
          searchTerm: searchTerm,
          originalInput: userInput
        };
      }
    }

    // Occupancy data patterns
    const occupancyPatterns = [
      /(show|display|get|tell)\s+(me\s+)?(the\s+)?occupancy\s+(data|rates?|stats?|information)/i,
      /(bed|occupancy)\s+(occupancy|rates?|stats?|data)/i,
      /(how\s+many|what\s+is\s+the)\s+(beds?|occupancy)\s+(rate|level)/i,
      /(occupancy|bed)\s+(information|details)/i
    ];

    for (const pattern of occupancyPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'occupancy_data',
          originalInput: userInput
        };
      }
    }

    // Agentic workflow patterns
    const workflowPatterns = [
      /(create|setup|set\s+up|configure)\s+(a\s+|an\s+|new\s+)?workflow/i,
      /(show|list|display|get)\s+(me\s+)?(the\s+)?workflows?/i,
      /(enable|disable|activate|deactivate)\s+(workflow|automation)/i,
      /(run|execute|trigger)\s+(workflow|automation)/i,
      /(workflow|automation)\s+(status|history|executions?)/i,
      /(schedule|automate)\s+(reminder|report|audit|task)/i
    ];

    for (const pattern of workflowPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'agentic_workflow',
          originalInput: userInput
        };
      }
    }

    // Action Plans query patterns
    const actionPlansPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?action\s+plans?/i,
      /(action\s+plans?|plans?)\s+(status|summary|overview|list)/i,
      /(what\s+is\s+the\s+status\s+of|check)\s+(the\s+)?action\s+plans?/i,
      /(are\s+there\s+any|list)\s+(overdue|pending|completed)\s+action\s+plans?/i,
      /(show|display|get)\s+(me\s+)?action\s+plans?\s+(for|in)\s+(.+)/i,
      /(action\s+plans?|plans?)\s+(assignments?|assigned\s+to\s+me)/i
    ];

    for (const pattern of actionPlansPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'action_plans_query',
          originalInput: userInput
        };
      }
    }

    // Holiday / annual leave patterns - handle before rotas or user search
    const holidayPatterns = [
      /(who|which|anyone)\s+(is|are)\s+(on\s+)?(holiday|annual\s+leave|leave)\s+(this|next|last)\s+week/i,
      /(show|list|display|get|give|tell)\s+(me\s+)?(who\s+is\s+)?(on\s+)?(holiday|annual\s+leave|leave)/i,
      /(who|which\s+staff)\s+(is|are)\s+(away|off)\s+(today|tomorrow|this\s+week|next\s+week)/i,
      /(annual\s+leave|holiday)\s+schedule/i
    ];

    for (const pattern of holidayPatterns) {
      if (pattern.test(input)) {
        const timeframe = input.includes('next week')
          ? 'next-week'
          : input.includes('last week')
            ? 'last-week'
            : input.includes('tomorrow')
              ? 'tomorrow'
              : input.includes('today')
                ? 'today'
                : input.includes('next month')
                  ? 'next-month'
                  : input.includes('this month')
                    ? 'this-month'
                    : 'this-week';

        return {
          type: 'holiday_query',
          timeframe,
          originalInput: userInput
        };
      }
    }

    // Rotas query patterns
    const rotasPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?rotas?/i,
      /(rotas?|schedules?|shifts?)\s+(status|summary|overview|list)/i,
      /(what\s+is\s+my|check\s+my)\s+(rota|schedule|shifts?)/i,
      /(show|display|get)\s+(me\s+)?rota\s+(for|in)\s+(.+)/i,
      /(rota|schedule)\s+(this\s+week|next\s+week|upcoming)/i,
      /(my\s+)?shifts?\s+(this\s+week|next\s+week|for\s+the\s+week)/i
    ];

    for (const pattern of rotasPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'rotas_query',
          originalInput: userInput
        };
      }
    }

    if (/(shift|rota|roster|schedule)/i.test(input) && /(who|when|how many|coverage|cover|working|on duty|today|tonight|tomorrow|week|next|this|staff|team)/i.test(input)) {
      return {
        type: 'rotas_query',
        originalInput: userInput
      };
    }

    if (/(when\s+am\s+i\s+working|what\s+are\s+my\s+shifts|do\s+i\s+work\s+(today|tomorrow)|is\s+my\s+shift)/i.test(input)) {
      return {
        type: 'rotas_query',
        originalInput: userInput
      };
    }

    if (/(who(?:'s|’s)?\s+on|who\s+is\s+on|who(?:'s|’s)?\s+working|who\s+is\s+working|who(?:'s|’s)?\s+in|who\s+is\s+in|who(?:'s|’s)?\s+on\s+duty|who\s+is\s+on\s+duty)/i.test(input)
      && /(today|tonight|tomorrow|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|weekend|weekday|shift|floor|cover|duty)/i.test(input)) {
      return {
        type: 'rotas_query',
        originalInput: userInput
      };
    }

    // Lessons Learned and RCA query patterns
    const lessonsRcaPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?lessons?\s+learned/i,
      /(lessons?\s+learned|rca|root\s+cause\s+analysis)\s+(records?|summary|overview|list)/i,
      /(what\s+are\s+the|check)\s+(lessons?\s+learned|rca\s+records?)/i,
      /(show|display|get)\s+(me\s+)?lessons?\s+learned\s+(for|about|regarding)\s+(.+)/i,
      /(rca|root\s+cause)\s+(analysis|records?)\s+(for|about)\s+(.+)/i
    ];

    for (const pattern of lessonsRcaPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'lessons_rca_query',
          originalInput: userInput
        };
      }
    }


    // default fallback - treat as a general query when nothing else matches
    return {
      type: 'general_query',
      originalInput: userInput
    };
  };

  // Safe date formatter: returns empty string for invalid/empty dates
  const formatDateSafe = (dateLike?: string | number | Date | null | undefined) => {
    if (!dateLike) return '';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike as any);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const buildDependencyQuickAnswer = (question: string, latest?: DependencyLatest | null) => {
    if (!question || !latest) return null;

    const cleaned = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim();

    if (!cleaned) return null;

    const answers: string[] = [];
    const hasCountIntent = /(how many|how much|number|count|total)/.test(cleaned);
    const mentionsResidents = /(resident|people|individual)/.test(cleaned);

    const safeNumber = (value: unknown) => {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const formatStaff = (value: unknown) => {
      const num = safeNumber(value);
      return Number.isInteger(num) ? num.toString() : num.toFixed(1);
    };

    if ((hasCountIntent || cleaned.includes('resident count')) && mentionsResidents) {
      answers.push(`Total residents assessed: ${safeNumber(latest.residentsCount)}`);
    }

    const dependencyLevels = latest.dependencyLevels || {};
    for (const [level, count] of Object.entries(dependencyLevels)) {
      const synonyms = DEPENDENCY_LEVEL_SYNONYMS[level] || [];
      const matches = synonyms.some((syn) => cleaned.includes(syn));
      if (matches && (hasCountIntent || cleaned.includes('resident'))) {
        answers.push(`${level} residents: ${safeNumber(count)}`);
      }
    }

    const wantsStaff = /(staff|headcount|workforce|team)/.test(cleaned);
    const wantsCarers = /(carers?|care staff|caregivers?|support workers?)/.test(cleaned);
    const wantsNurses = /(nurses?|nursing|senior|registered|rgns?|rgns?|ns\b)/.test(cleaned);
    const wantsTotals = /(total|overall|combined|across)/.test(cleaned);
    const wantsRequirement = /(require|need|needed|recommended|should)/.test(cleaned);
    const mentionsDay = /(day|daytime|day-shift|day shift|am)/.test(cleaned);
    const mentionsNight = /(night|overnight|nighttime|pm)/.test(cleaned);
    const staffing = latest.staffing;

    if (staffing && (wantsStaff || wantsCarers || wantsNurses) && (hasCountIntent || wantsRequirement)) {
      const day = staffing.day ?? { carers: 0, ns: 0, total: 0 };
      const night = staffing.night ?? { carers: 0, ns: 0, total: 0 };

      if ((wantsStaff && !mentionsDay && !mentionsNight) || wantsTotals) {
        const carersTotal = safeNumber(day.carers) + safeNumber(night.carers);
        const nsTotal = safeNumber(day.ns) + safeNumber(night.ns);
        const aggregateTotal = safeNumber(latest.totalStaff || carersTotal + nsTotal);
        answers.push(
          `Recommended total staff across 24h: ${formatStaff(aggregateTotal)} (Carers ${formatStaff(carersTotal)}, Nurses/Seniors ${formatStaff(nsTotal)})`
        );
      }

      if (mentionsDay) {
        const detailParts: string[] = [];
        if (wantsCarers || wantsStaff) detailParts.push(`Carers ${formatStaff(day.carers)}`);
        if (wantsNurses || wantsStaff) detailParts.push(`Nurses/Seniors ${formatStaff(day.ns)}`);
        const total = formatStaff(day.total);
        const detail = detailParts.length ? detailParts.join(', ') : `Total ${total}`;
        answers.push(`Day shift recommended: ${detail}${detailParts.length ? ` (Total ${total})` : ''}`);
      }

      if (mentionsNight) {
        const detailParts: string[] = [];
        if (wantsCarers || wantsStaff) detailParts.push(`Carers ${formatStaff(night.carers)}`);
        if (wantsNurses || wantsStaff) detailParts.push(`Nurses/Seniors ${formatStaff(night.ns)}`);
        const total = formatStaff(night.total);
        const detail = detailParts.length ? detailParts.join(', ') : `Total ${total}`;
        answers.push(`Night shift recommended: ${detail}${detailParts.length ? ` (Total ${total})` : ''}`);
      }

      if (!mentionsDay && !mentionsNight && wantsCarers) {
        answers.push(
          `Carers required → Day ${formatStaff(day.carers)}, Night ${formatStaff(night.carers)}`
        );
      }

      if (!mentionsDay && !mentionsNight && wantsNurses) {
        answers.push(
          `Nurses/Seniors required → Day ${formatStaff(day.ns)}, Night ${formatStaff(night.ns)}`
        );
      }
    }

    if (!answers.length) return null;

    const savedLabel = formatDateSafe(latest.savedAt) || '';
    const header = savedLabel ? `latest dependency snapshot from ${savedLabel}` : 'latest dependency snapshot';
    return `Here’s what I found from the ${header}:
${answers.map((ans) => `- ${ans}`).join('\n')}`;
  };

  const buildRotaQuickAnswer = (context: RotaQuickAnswerContext): string | null => {
    const {
      question,
      normalizedShifts,
      normalizedUserShifts,
      roleCounts,
      typeCounts,
      daySummaries,
      staffMap,
      weekRangeLabel,
    } = context;

    if (!question || !normalizedShifts || normalizedShifts.length === 0) return null;

    const asciiQuestion = question.replace(/[’‘`]/g, "'");

    const cleaned = asciiQuestion
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;

    const totalShifts = normalizedShifts.length;
    const uniqueStaffNames = new Set<string>();
    normalizedShifts.forEach((shift) => {
      if (shift.staffName && shift.staffName.toLowerCase() !== 'unassigned') {
        uniqueStaffNames.add(shift.staffName);
      }
    });
    const uniqueStaffCount = uniqueStaffNames.size;

    let weekendShifts = 0;
    let weekdayShifts = 0;
    normalizedShifts.forEach((shift) => {
      if (shift.dayNumber === 0 || shift.dayNumber === 6) weekendShifts += 1;
      else if (shift.dayNumber >= 1 && shift.dayNumber <= 5) weekdayShifts += 1;
    });

    const formatCounts = (counts: Record<string, number>, limit = 5) => {
      const entries = Object.entries(counts || {})
        .filter(([, value]) => Number.isFinite(value) && value > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => `${label} (${value})`);
      return entries.length ? entries.join(', ') : 'Not recorded';
    };

    const describeShiftLine = (shift: NormalizedShift) => {
      const staff = shift.staffName || 'Unassigned';
      const role = shift.role ? ` – ${shift.role}` : '';
      let time = 'Time TBC';
      if (shift.startTime && shift.endTime) time = `${shift.startTime}–${shift.endTime}`;
      else if (shift.startTime) time = `Start ${shift.startTime}`;
      else if (shift.endTime) time = `Ends ${shift.endTime}`;
      const location = shift.location ? ` @ ${shift.location}` : '';
      return `• ${staff}${role} • ${time}${location}`;
    };

    const daySummariesList = Object.values(daySummaries || {});

    const dayAliasList = [
      { name: 'Sunday', patterns: ['sunday', 'sun'] },
      { name: 'Monday', patterns: ['monday', 'mon'] },
      { name: 'Tuesday', patterns: ['tuesday', 'tue', 'tues'] },
      { name: 'Wednesday', patterns: ['wednesday', 'wed'] },
      { name: 'Thursday', patterns: ['thursday', 'thu', 'thur', 'thurs'] },
      { name: 'Friday', patterns: ['friday', 'fri'] },
      { name: 'Saturday', patterns: ['saturday', 'sat'] },
    ];

    const requestedDays: string[] = [];
    let tomorrowRequested = false;
    for (const alias of dayAliasList) {
      if (alias.patterns.some((pattern) => cleaned.includes(pattern))) {
        requestedDays.push(alias.name);
      }
    }

    const todayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowName = tomorrowDate.toLocaleDateString('en-GB', { weekday: 'long' });

    if (cleaned.includes('today')) requestedDays.push(todayName);
    if (cleaned.includes('tomorrow')) {
      requestedDays.push(tomorrowName);
      tomorrowRequested = true;
    }
    if (cleaned.includes('tonight')) requestedDays.push(todayName);

    const requestedDaySet = Array.from(new Set(requestedDays));
    const weekendRequested = /weekend/.test(cleaned);
    const weekdaysRequested = /weekdays?/.test(cleaned);

    const wantsWho = /\bwho\b/.test(cleaned) || cleaned.includes("who's") || cleaned.includes('whos');
    const wantsCount = /(how many|number|count|total)/.test(cleaned);
    const mentionsShiftWord = /(shift|rota|roster|schedule)/.test(cleaned);
    const wantsNext = /\bnext\b/.test(cleaned) || cleaned.includes('upcoming') || cleaned.includes('soon');
    const referencesSelf = /(\bmy\b|\bi\b|\bme\b|i\sam|am\si)/.test(cleaned) && mentionsShiftWord;
    const mentionsCover = /(cover|coverage|on duty|on-duty|duty|staffing)/.test(cleaned);
    const mentionsStaffWord = /(staff|team|people|personnel|workers|employees)/.test(cleaned);
    const mentionsTypeWord = /(night|overnight|day shift|daytime|morning|evening|late|early|pm|am|tonight)/.test(cleaned);

    const staffEntries = Object.values(staffMap || {});
    let matchedStaffEntry: { name: string; shifts: NormalizedShift[]; variants: string[] } | null = null;
    outerStaff: for (const entry of staffEntries) {
      if (!entry || !entry.name || entry.name.toLowerCase() === 'unassigned') continue;
      for (const variant of entry.variants) {
        if (!variant || variant.length < 3) continue;
        if (cleaned.includes(variant)) {
          matchedStaffEntry = entry;
          break outerStaff;
        }
      }
    }

    let matchedRoleLabel: string | null = null;
    const roleEntries = Object.entries(roleCounts || {});
    const ROLE_SYNONYM_HINTS: Record<string, string[]> = {
      nurse: ['nurse', 'nurses', 'registered nurse', 'rgn', 'rgns'],
      carer: ['carer', 'carers', 'care assistant', 'support worker', 'care staff'],
      senior: ['senior', 'senior carer', 'senior staff'],
      manager: ['manager', 'managers', 'home manager'],
      therapy: ['therapy', 'therapist', 'physio', 'physiotherapist'],
      doctor: ['doctor', 'doctors', 'gp', 'physician'],
      chef: ['chef', 'chefs', 'cook', 'kitchen'],
      domestic: ['domestic', 'housekeeper', 'cleaner', 'cleaning'],
      admin: ['admin', 'administrator', 'administration'],
      maintenance: ['maintenance', 'handyman', 'estates'],
    };

    for (const [roleLabel] of roleEntries) {
      const roleLower = roleLabel.toLowerCase();
      const candidateSet = new Set<string>([roleLower]);
      const tokens = roleLower.split(/[^a-z0-9]+/).filter(Boolean);
      tokens.forEach((token) => candidateSet.add(token));
      if (roleLower.endsWith('s')) candidateSet.add(roleLower.slice(0, -1));
      for (const [hintKey, hintVariants] of Object.entries(ROLE_SYNONYM_HINTS)) {
        if (roleLower.includes(hintKey)) {
          hintVariants.forEach((variant) => candidateSet.add(variant));
        }
      }
      for (const candidate of candidateSet) {
        if (candidate.length < 3) continue;
        if (cleaned.includes(candidate)) {
          matchedRoleLabel = roleLabel;
          break;
        }
      }
      if (matchedRoleLabel) break;
    }

    let matchedTypeLabel: string | null = null;
    const typeEntries = Object.entries(typeCounts || {});
    for (const [typeLabel] of typeEntries) {
      const typeLower = typeLabel.toLowerCase();
      const candidateSet = new Set<string>([typeLower, typeLower.replace(/\s+/g, '')]);
      const synonyms = SHIFT_TYPE_SYNONYMS[typeLower];
      if (synonyms) synonyms.forEach((variant) => candidateSet.add(variant));
      if (typeLower.endsWith('s')) candidateSet.add(typeLower.slice(0, -1));
      for (const candidate of candidateSet) {
        if (candidate.length < 3) continue;
        if (cleaned.includes(candidate)) {
          matchedTypeLabel = typeLabel;
          break;
        }
      }
      if (matchedTypeLabel) break;
    }

    if (!matchedTypeLabel && mentionsTypeWord) {
      if (typeCounts['Night'] && (cleaned.includes('night') || cleaned.includes('overnight'))) {
        matchedTypeLabel = 'Night';
      } else if (typeCounts['Day'] && (cleaned.includes('day shift') || cleaned.includes('day'))) {
        matchedTypeLabel = 'Day';
      }
    }

    const formatShiftTime = (shift: NormalizedShift) => {
      if (shift.startTime && shift.endTime) return `${shift.startTime}–${shift.endTime}`;
      if (shift.startTime) return `Start ${shift.startTime}`;
      if (shift.endTime) return `Ends ${shift.endTime}`;
      return 'Time TBC';
    };

    const describeUserShift = (shift: NormalizedShift) => {
      const dateLabel = shift.displayDate || shift.dayName || shift.dayKey || 'Date not set';
      const timeLabel = formatShiftTime(shift);
      const roleLabel = shift.role ? ` (${shift.role})` : '';
      const locationLabel = shift.location ? ` @ ${shift.location}` : '';
      return `- ${dateLabel}: ${timeLabel}${roleLabel}${locationLabel}`;
    };

    // ========== New quick answers: per-person shifts, next shift, unassigned shifts, tonight counts, dependency-gap ===========

    // Helper: get shifts for a staff name (case-insensitive match against variants and names)
    const findStaffEntryByName = (name: string) => {
      if (!name) return null;
      const low = name.toLowerCase();
      for (const entry of staffEntries) {
        if (!entry || !entry.name) continue;
        if (entry.name.toLowerCase() === low) return entry;
        for (const v of entry.variants || []) {
          if (v && low.includes(v.toLowerCase())) return entry;
        }
      }
      return null;
    };

    // Next shift for the current user (references normalizedUserShifts)
    if (referencesSelf) {
      const now = new Date();
      const upcoming = [...normalizedUserShifts]
        .map(s => ({ s, dt: convertToDateTime(s) }))
        .filter(o => o.dt && o.dt.getTime() >= now.getTime())
        .sort((a, b) => (a.dt as Date).getTime() - (b.dt as Date).getTime());
      if (upcoming.length === 0) {
        // still handle generic 'my shifts' requests above; fall through
      } else if (cleaned.includes('next') || cleaned.includes('upcoming') || cleaned.includes('when is my next') || cleaned.includes("what's my next")) {
        const next = upcoming[0].s;
        return `Your next shift: ${next.displayDate || next.dayName || next.dayKey} • ${formatShiftTime(next)}${next.role ? ` (${next.role})` : ''}${next.location ? ` @ ${next.location}` : ''}`;
      }
    }

    // Specific person shifts: "what shifts does Alice have this week"
    const personMatch = cleaned.match(/what\s+shifts\s+does\s+([a-z ]{2,50})\s+have|when\s+is\s+([a-z ]{2,50})\s+working|what\s+shifts\s+does\s+([a-z ]{2,50})/i);
    if (personMatch) {
      const name = (personMatch[1] || personMatch[2] || personMatch[3] || '').trim();
      const entry = findStaffEntryByName(name);
      if (!entry) return `I couldn't find a staff member matching "${name}" in this rota.`;
      if (!entry.shifts || entry.shifts.length === 0) return `${entry.name} has no shifts scheduled for ${weekRangeLabel}.`;
      const lines = entry.shifts
        .map((s) => `${s.displayDate || s.dayName || s.dayKey}: ${formatShiftTime(s)}${s.role ? ` (${s.role})` : ''}${s.location ? ` @ ${s.location}` : ''}`);
      return `${entry.name}'s shifts for ${weekRangeLabel}:
${lines.map(l => `- ${l}`).join('\n')}`;
    }

    // Unassigned shifts this week / unassigned night shifts
    if (cleaned.includes('unassigned') || cleaned.includes('no one assigned') || cleaned.includes('not assigned')) {
      const unassigned = normalizedShifts.filter(s => !s.staffName || s.staffName.toLowerCase() === 'unassigned');
      const nightOnly = cleaned.includes('night') || cleaned.includes('overnight');
      const filtered = nightOnly ? unassigned.filter(s => (s.type || '').toLowerCase().includes('night')) : unassigned;
      if (!filtered.length) return `No unassigned ${nightOnly ? 'night ' : ''}shifts found for ${weekRangeLabel}.`;
      const list = filtered.slice(0, 20).map(s => `- ${s.dayName} ${s.displayDate || s.dayKey || ''} • ${s.role || 'Role not set'} • ${formatShiftTime(s)}${s.location ? ` @ ${s.location}` : ''}`);
      return [`Unassigned ${nightOnly ? 'night ' : ''}shifts for ${weekRangeLabel}:`, ...list].join('\n');
    }

    // How many carers/nurses tonight
    if (cleaned.includes('tonight') || cleaned.includes('today') || cleaned.includes('this evening')) {
      const tonightName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
      const tonightKey = new Date().toISOString().slice(0,10);
      const tonightShifts = normalizedShifts.filter(s => s.dayKey === tonightKey || s.dayName === tonightName);
      if (cleaned.includes('how many') || cleaned.includes('how many carers') || cleaned.includes('carers') || cleaned.includes('nurses')) {
        const carers = tonightShifts.filter(s => (s.role || '').toLowerCase().includes('carer') || (s.role || '').toLowerCase().includes('support')).length;
        const nurses = tonightShifts.filter(s => (s.role || '').toLowerCase().includes('nurse') || (s.role || '').toLowerCase().includes('rgn')).length;
        return `Tonight (${weekRangeLabel}): Carers ${carers}, Nurses ${nurses}, Total shifts: ${tonightShifts.length}`;
      }
    }

    // Dependency-gap check (requires dependency snapshot) — if user mentions 'shortage' or 'understaff' or 'requirement'
    if (/(shortage|understaff|short-staff|under-staffed|requirement|recommended|need|should)/i.test(cleaned) && (cleaned.includes('staff') || cleaned.includes('carer') || cleaned.includes('nurse'))) {
      // We cannot call server endpoints here directly in the quick-answer; instruct caller to use AI fallback if not available.
      // But we have workspace extras in scope in the caller; the caller passes dependency snapshot into workspaceExtras for AI. For quickanswer we'll attempt a minimal check using roleCounts vs staffing if available in daySummaries.
      try {
        // Compare total scheduled carers and nurses vs roleCounts recommendation if present in daySummaries metadata (not always available)
        const aggregated = Object.values(daySummaries).reduce((acc: any, ds: RotaDaySummary) => {
          acc.carers = (acc.carers || 0) + (ds.roles?.Carer || ds.roles?.carer || 0);
          acc.nurses = (acc.nurses || 0) + (ds.roles?.Nurse || ds.roles?.nurse || 0);
          acc.days = (acc.days || 0) + 1;
          return acc;
        }, {} as any);
        if (!aggregated.days) return null;
        return `Scheduled this week: ~${aggregated.carers} carers and ~${aggregated.nurses} nurses across ${aggregated.days} day(s). For a detailed gap analysis I can compare the rota to the latest dependency snapshot — would you like that?`;
      } catch (e) {
        // noop - fallthrough to other answers or AI
      }
    }


    const convertToDateTime = (shift: NormalizedShift) => {
      if (!shift.dayKey) return null;
      const time = shift.startTime && /^\d{2}:\d{2}$/.test(shift.startTime) ? `${shift.startTime}:00` : '00:00:00';
      const isoString = `${shift.dayKey}T${time}`;
      const dt = new Date(isoString);
      return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const describeDaySummary = (summary: RotaDaySummary) => {
      const header = `**${summary.dayName}${summary.displayDate ? ` (${summary.displayDate})` : ''}**`;
      const staffList = summary.staff.length
        ? summary.staff.slice(0, wantsWho ? 12 : 8).join(', ')
        : 'No named staff recorded';
      const roleBreakdown = formatCounts(summary.roles);
      const typeBreakdown = Object.keys(summary.types || {}).length ? formatCounts(summary.types) : null;
      const highlightLines: string[] = [];
      if (matchedRoleLabel) {
        const roleCount = summary.roles?.[matchedRoleLabel] || 0;
        highlightLines.push(`${matchedRoleLabel}: ${roleCount} shift(s)`);
      }
      if (matchedTypeLabel) {
        const typeCount = summary.types?.[matchedTypeLabel] || 0;
        highlightLines.push(`${matchedTypeLabel} shifts: ${typeCount}`);
      }
      const detailLines = summary.shifts
        .slice(0, wantsWho ? 12 : 8)
        .map((shift) => describeShiftLine(shift))
        .join('\n');

      return [
        header,
        `- Total shifts: ${summary.total}`,
        `- Staff: ${staffList}`,
        `- Roles: ${roleBreakdown}`,
        typeBreakdown ? `- Shift types: ${typeBreakdown}` : null,
        highlightLines.length ? `- Highlights: ${highlightLines.join(' • ')}` : null,
        detailLines ? `\n${detailLines}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    };

    if (referencesSelf) {
      if (!normalizedUserShifts.length) {
        return `I couldn’t find any shifts assigned to you for ${weekRangeLabel}.`;
      }

      const sortedUserShifts = [...normalizedUserShifts].sort((a, b) => {
        const aDt = convertToDateTime(a);
        const bDt = convertToDateTime(b);
        if (aDt && bDt) return aDt.getTime() - bDt.getTime();
        if (aDt) return -1;
        if (bDt) return 1;
        return (a.dayKey || '').localeCompare(b.dayKey || '');
      });

      const userLines = sortedUserShifts.map((shift) => describeUserShift(shift)).join('\n');
      let response = `Here are your shifts for ${weekRangeLabel}:
${userLines}`;

      if (wantsNext) {
        const now = new Date();
        const nextShift = sortedUserShifts.find((shift) => {
          const dt = convertToDateTime(shift);
          return dt && dt.getTime() >= now.getTime();
        });
        if (nextShift) {
          response += `
Next shift: ${nextShift.displayDate || nextShift.dayName || nextShift.dayKey} • ${formatShiftTime(nextShift)}${
            nextShift.location ? ` @ ${nextShift.location}` : ''
          }`;
        }
      }

      return response;
    }

    if (matchedStaffEntry) {
      const filteredShifts = requestedDaySet.length
        ? matchedStaffEntry.shifts.filter((shift) => requestedDaySet.includes(shift.dayName))
        : matchedStaffEntry.shifts;

      if (!filteredShifts.length) {
        const dayLabel = requestedDaySet.length ? requestedDaySet.join(' & ') : 'this rota';
        return `${matchedStaffEntry.name} is not scheduled ${requestedDaySet.length ? `on ${dayLabel}` : `for ${weekRangeLabel}`} in the current rota.`;
      }

      const sortedShifts = [...filteredShifts].sort((a, b) => {
        const aDt = convertToDateTime(a);
        const bDt = convertToDateTime(b);
        if (aDt && bDt) return aDt.getTime() - bDt.getTime();
        if (aDt) return -1;
        if (bDt) return 1;
        return (a.dayKey || '').localeCompare(b.dayKey || '');
      });

      const staffLines = sortedShifts.map((shift) => describeUserShift(shift)).join('\n');
      const dayLabel = requestedDaySet.length ? requestedDaySet.join(' & ') : 'this week';
      return `${matchedStaffEntry.name} has ${sortedShifts.length} shift${sortedShifts.length === 1 ? '' : 's'} scheduled for ${dayLabel}.
${staffLines}`;
    }

    if (requestedDaySet.length > 0) {
      const sections: string[] = [];
      for (const dayName of requestedDaySet) {
        const matches = daySummariesList.filter((summary) => summary.dayName.toLowerCase() === dayName.toLowerCase());
        if (!matches.length) {
          sections.push(`**${dayName}**
- No shifts recorded in this rota.`);
          continue;
        }
        const summary = matches.sort((a, b) => (a.dayKey || '').localeCompare(b.dayKey || ''))[0];
        sections.push(describeDaySummary(summary));
      }
      const dayLabel = requestedDaySet.join(' & ');
      const baseResponse = `Coverage for ${dayLabel} (${weekRangeLabel}):

    ${sections.join('\n\n')}`;
      if (tomorrowRequested && !sections.some((section) => !section.includes('No shifts'))) {
        return `${baseResponse}

    If you were expecting named staff for tomorrow, please ensure tomorrow's rota has been published.`;
      }
      return baseResponse;
    }

    if (weekendRequested) {
      const weekendSummaries = daySummariesList.filter((summary) => summary.dayNumber === 0 || summary.dayNumber === 6);
      if (!weekendSummaries.length) {
        return `No weekend shifts recorded for ${weekRangeLabel}.`;
      }

      const weekendTotal = weekendSummaries.reduce((sum, summary) => sum + summary.total, 0);
      const weekendStaff = new Set<string>();
      const weekendRoles: Record<string, number> = {};
      const weekendTypes: Record<string, number> = {};

      weekendSummaries.forEach((summary) => {
        summary.staff.forEach((staff) => {
          if (staff && staff.toLowerCase() !== 'unassigned') weekendStaff.add(staff);
        });
        Object.entries(summary.roles || {}).forEach(([role, count]) => {
          weekendRoles[role] = (weekendRoles[role] || 0) + count;
        });
        Object.entries(summary.types || {}).forEach(([type, count]) => {
          weekendTypes[type] = (weekendTypes[type] || 0) + count;
        });
      });

      const highlightLines: string[] = [];
      if (matchedRoleLabel) highlightLines.push(`${matchedRoleLabel}: ${weekendRoles[matchedRoleLabel] || 0}`);
      if (matchedTypeLabel) highlightLines.push(`${matchedTypeLabel}: ${weekendTypes[matchedTypeLabel] || 0}`);

      const weekendSample = weekendSummaries
        .flatMap((summary) => summary.shifts)
        .slice(0, wantsWho ? 12 : 8)
        .map((shift) => describeShiftLine(shift))
        .join('\n');

      return [
        `Weekend coverage (${weekRangeLabel}):`,
        `- Total shifts: ${weekendTotal}`,
        `- Staff: ${weekendStaff.size ? Array.from(weekendStaff).join(', ') : 'No named staff recorded'}`,
        `- Roles: ${formatCounts(weekendRoles)}`,
        Object.keys(weekendTypes).length ? `- Shift types: ${formatCounts(weekendTypes)}` : null,
        highlightLines.length ? `- Highlights: ${highlightLines.join(' • ')}` : null,
        weekendSample ? `\n${weekendSample}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (weekdaysRequested) {
      const weekdaySummaries = daySummariesList.filter((summary) => summary.dayNumber >= 1 && summary.dayNumber <= 5);
      if (!weekdaySummaries.length) {
        return `No weekday shifts recorded for ${weekRangeLabel}.`;
      }

      const weekdayTotal = weekdaySummaries.reduce((sum, summary) => sum + summary.total, 0);
      const weekdayStaff = new Set<string>();
      const weekdayRoles: Record<string, number> = {};
      const weekdayTypes: Record<string, number> = {};

      weekdaySummaries.forEach((summary) => {
        summary.staff.forEach((staff) => {
          if (staff && staff.toLowerCase() !== 'unassigned') weekdayStaff.add(staff);
        });
        Object.entries(summary.roles || {}).forEach(([role, count]) => {
          weekdayRoles[role] = (weekdayRoles[role] || 0) + count;
        });
        Object.entries(summary.types || {}).forEach(([type, count]) => {
          weekdayTypes[type] = (weekdayTypes[type] || 0) + count;
        });
      });

      const weekdaySample = weekdaySummaries
        .flatMap((summary) => summary.shifts)
        .slice(0, wantsWho ? 12 : 8)
        .map((shift) => describeShiftLine(shift))
        .join('\n');

      return [
        `Weekday coverage (${weekRangeLabel}):`,
        `- Total shifts: ${weekdayTotal}`,
        `- Staff: ${weekdayStaff.size ? Array.from(weekdayStaff).join(', ') : 'No named staff recorded'}`,
        `- Roles: ${formatCounts(weekdayRoles)}`,
        Object.keys(weekdayTypes).length ? `- Shift types: ${formatCounts(weekdayTypes)}` : null,
        weekdaySample ? `\n${weekdaySample}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (matchedTypeLabel) {
      const totalTypeCount = typeCounts[matchedTypeLabel] || 0;
      const perDayLines = daySummariesList
        .filter((summary) => (summary.types?.[matchedTypeLabel] || 0) > 0)
        .sort((a, b) => (a.dayKey || '').localeCompare(b.dayKey || ''))
        .map((summary) => `${summary.dayName}: ${summary.types?.[matchedTypeLabel] || 0}`)
        .join(', ');

      return [
        `${matchedTypeLabel} shifts for ${weekRangeLabel}:`,
        `- Total: ${totalTypeCount}`,
        perDayLines ? `- By day: ${perDayLines}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (matchedRoleLabel) {
      const totalRoleCount = roleCounts[matchedRoleLabel] || 0;
      const perDayLines = daySummariesList
        .filter((summary) => (summary.roles?.[matchedRoleLabel] || 0) > 0)
        .sort((a, b) => (a.dayKey || '').localeCompare(b.dayKey || ''))
        .map((summary) => `${summary.dayName}: ${summary.roles?.[matchedRoleLabel] || 0}`)
        .join(', ');

      return [
        `${matchedRoleLabel} shifts for ${weekRangeLabel}:`,
        `- Total: ${totalRoleCount}`,
        perDayLines ? `- By day: ${perDayLines}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (wantsCount || mentionsCover || mentionsStaffWord || cleaned.includes('overview') || cleaned.includes('summary')) {
      // Direct weekly 'who' query: prefer explicit 'this week' phrasing but allow generic 'week' when no specific day was requested
      const weekRequested = cleaned.includes('this week') || cleaned.includes('this-week') || (cleaned.includes('week') && requestedDaySet.length === 0);
      if (wantsWho && weekRequested) {
        const staffSummary = staffEntries
          .filter((entry) => entry && entry.name && entry.name.toLowerCase() !== 'unassigned')
          .map((entry) => ({ name: entry.name, count: entry.shifts.length }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20)
          .map((s) => `${s.name}: ${s.count} shift${s.count === 1 ? '' : 's'}`);

        if (!staffSummary.length) {
          return `No named staff scheduled for ${weekRangeLabel}.`;
        }

        return [
          `Staff scheduled for ${weekRangeLabel}:`,
          ...staffSummary.map((line) => `- ${line}`),
        ].join('\n');
      }

      const topStaff = staffEntries
        .filter((entry) => entry.name && entry.name.toLowerCase() !== 'unassigned')
        .sort((a, b) => b.shifts.length - a.shifts.length)
        .slice(0, 3)
        .map((entry) => `${entry.name} (${entry.shifts.length})`)
        .join(', ');

      const busiestDay = daySummariesList
        .filter((summary) => summary.dayNumber >= 0)
        .sort((a, b) => b.total - a.total)[0];

      return [
        `Rota summary for ${weekRangeLabel}:`,
        `- Total shifts: ${totalShifts}`,
        `- Unique staff scheduled: ${uniqueStaffCount}`,
        `- Weekday shifts: ${weekdayShifts}; Weekend shifts: ${weekendShifts}`,
        busiestDay ? `- Busiest day: ${busiestDay.dayName} (${busiestDay.displayDate}) with ${busiestDay.total} shift(s)` : null,
        Object.keys(roleCounts || {}).length ? `- Top roles: ${formatCounts(roleCounts)}` : null,
        Object.keys(typeCounts || {}).length ? `- Shift types: ${formatCounts(typeCounts)}` : null,
        topStaff ? `- Busiest team members: ${topStaff}` : null,
        normalizedUserShifts.length ? `- Your scheduled shifts: ${normalizedUserShifts.length}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    // If we reached here, fall back to AI
    return null;
  };


  const AUDIT_NAME_MAP: Record<string, string> = {
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

  const AUDIT_SLUG_SYNONYMS: Record<string, string> = {
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

  const resolveAuditTypeFromName = (rawName?: string | null) => {
    if (!rawName) return null;
    const cleaned = rawName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return null;
    if (AUDIT_NAME_MAP[cleaned]) return cleaned;
    if (AUDIT_SLUG_SYNONYMS[cleaned]) return AUDIT_SLUG_SYNONYMS[cleaned];
    const dashed = cleaned.replace(/\s+/g, '-');
    if (AUDIT_NAME_MAP[dashed]) return dashed;
    if (AUDIT_SLUG_SYNONYMS[dashed]) return AUDIT_SLUG_SYNONYMS[dashed];
    for (const [key, slug] of Object.entries(AUDIT_SLUG_SYNONYMS)) {
      if (cleaned.includes(key)) return slug;
    }
    return null;
  };

  const formatAuditName = (auditType: string | undefined | null) => {
    if (!auditType) return 'Audit';
    const slug = auditType.toLowerCase();
    if (AUDIT_NAME_MAP[slug]) return AUDIT_NAME_MAP[slug];
    const words = slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
    return words.length > 0 ? `${words.join(' ')} Audit` : 'Audit';
  };

  const extractCompletedBy = (latest: any): string | null => {
    if (!latest || typeof latest !== 'object') return null;
    const candidateObjects = [
      latest.completedBy,
      latest.auditor,
      latest.assessor,
      latest.inspector,
      latest.manager,
      latest.owner,
      latest.user,
      latest.staff,
    ];
    for (const item of candidateObjects) {
      if (item && typeof item === 'object') {
        const nestedName = item.name || item.fullName || item.displayName;
        if (typeof nestedName === 'string' && nestedName.trim()) return nestedName.trim();
      }
    }
    const candidateKeys = [
      'completedBy',
      'completed_by',
      'completedByName',
      'completedByFullName',
      'completedByUser',
      'auditor',
      'auditedBy',
      'auditorName',
      'inspector',
      'inspectorName',
      'performedBy',
      'conductedBy',
      'author',
      'authorName',
      'submittedBy',
      'reviewedBy',
      'managerName',
      'ownerName',
      'staffName',
      'userName',
      'assessorName',
      'recordedBy',
      'createdBy',
    ];
    for (const key of candidateKeys) {
      const value = latest[key] ?? latest?.meta?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };

  const extractAuditHighlightLines = (latest: any): string[] => {
    if (!latest || typeof latest !== 'object') return [];
    const lines: string[] = [];
    const addLine = (label: string, value: string | null | undefined) => {
      if (typeof value === 'string' && value.trim()) {
        lines.push(`${label}${label.endsWith(':') ? '' : ':'} ${value.trim()}`);
      }
    };
    addLine('Comments', latest.comments);
    addLine('Summary', latest.summary ?? latest.finalComments);
    if (Array.isArray(latest.areasForImprovement) && latest.areasForImprovement.length > 0) {
      lines.push(`Areas for improvement: ${latest.areasForImprovement.slice(0, 3).join('; ')}`);
    }
    if (Array.isArray(latest.goodPractice) && latest.goodPractice.length > 0) {
      lines.push(`Good practice: ${latest.goodPractice.slice(0, 3).join('; ')}`);
    }
    if (Array.isArray(latest.actionRequired) && latest.actionRequired.length > 0) {
      lines.push(`Action required: ${latest.actionRequired.slice(0, 3).join('; ')}`);
    }
    return lines.slice(0, 4);
  };

  const resolveAuditDocumentInfo = async (
    workspaceId: string,
    orgId: string | null | undefined,
    latest: any
  ): Promise<{ downloadUrl: string | null; documentId: string | null }> => {
    let downloadUrl: string | null = null;
    let documentId: string | null = null;
    try {
      const maybeDocId =
        latest?.pdfDocId ||
        latest?.extractedJson?.pdfDocId ||
        latest?.documentId ||
        latest?.extractedJson?.documentId ||
        null;
      const maybeStoragePath = latest?.storagePath || latest?.extractedJson?.storagePath || null;
      if (!maybeDocId && !maybeStoragePath) {
        return { downloadUrl, documentId };
      }
      const docsColPath = workspaceCollectionPath(workspaceId, 'documents', orgId || null);
      const { collection, doc, getDoc, query, where, getDocs } = await import('firebase/firestore');
      if (maybeDocId) {
        const docRef = doc(collection(db, docsColPath), maybeDocId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          downloadUrl = data.downloadUrl ?? null;
          documentId = snap.id;
          return { downloadUrl, documentId };
        }
      }
      if (maybeStoragePath) {
        const q = query(collection(db, docsColPath), where('storagePath', '==', maybeStoragePath));
        const snaps = await getDocs(q);
        if (!snaps.empty) {
          const refDoc = snaps.docs[0];
          const data = refDoc.data() as any;
          downloadUrl = data.downloadUrl ?? null;
          documentId = refDoc.id;
        }
      }
    } catch (err) {
      console.warn('resolveAuditDocumentInfo failed', err);
    }
    return { downloadUrl, documentId };
  };


  const handleSend = async () => {

  const inputVal = input;
  const intent = detectIntent(inputVal);

  const baseWorkspaceContext = {
    workspaceId: selectedItem.workspaceId ?? null,
    organisationId: organisationId ?? null,
    selectedItem: {
      id: (selectedItem as any)?.id ?? null,
      name: (selectedItem as any)?.name ?? null,
      type: selectedItem.type,
    },
    activeDocumentId: activeDoc?.id ?? null,
    lastContextDocumentId: lastContext?.doc?.id ?? null,
    user: user
      ? {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        }
      : null,
  };

  const buildWorkspaceContext = (extras?: Record<string, any>) =>
    serializeForAI({
      ...baseWorkspaceContext,
      intent: intent.type,
      ...extras,
    });

    // Multi-document query support
    if (intent && intent.type === 'multi_document_query') {
      // Search for all relevant documents (client-side first)
      let allDocs: Document[] = [];
      if (selectedItem && selectedItem.type === 'folder') {
        allDocs = getAllDocuments([selectedItem]);
      }
      // Use Fuse.js to get multiple relevant docs
      let multiResults: Document[] = [];
      try {
        const fuse = new Fuse(allDocs, {
          keys: [
            { name: 'name', weight: 0.5 },
            { name: 'tags', weight: 0.3 },
            { name: 'summary', weight: 0.2 }
          ],
          threshold: 0.45,
          ignoreLocation: true,
          minMatchCharLength: 2,
        });
        const fuseRes = fuse.search(inputVal);
        multiResults = fuseRes.map(r => r.item as Document);
      } catch {}
      // If not enough, fallback to server
      if (multiResults.length < 2) {
        const workspaceId = selectedItem.workspaceId;
        const orgId =
          organisationId ||
          (selectedItem as any)?.organisationId ||
          (selectedItem as any)?.organisation?.id ||
          null;
        if (workspaceId) {
          const searchRes = await fetch('/api/search-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, organisationId: orgId, query: inputVal }),
          });
          if (searchRes.ok) {
            const { results } = await searchRes.json();
            if (results && results.length > 1) {
              multiResults = results;
            }
          }
        }
      }
      if (multiResults.length < 2) {
    appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'I could not find enough relevant documents to compare or synthesize.' }]);
        setInput('');
        setIsTyping(false);
        return;
      }
      // Synthesize answer using all selected documents
      const documentData = {
        mode: 'multi_document_query',
        totalDocuments: multiResults.length,
        documents: multiResults.slice(0, 3).map((doc) => ({
          ...documentToAiContext(doc),
          extractedJson: doc.extractedJson,
        })),
        additionalDocuments: multiResults.slice(3, 6).map(documentToAiContext),
      };

      const aiAnswer = await askAIWithWorkspaceData(
        inputVal,
        {
          documentData,
          relatedDocuments: multiResults.slice(0, 5).map(documentToAiContext),
          workspaceExtras: {
            mode: 'multi_document_query',
            workspaceId: selectedItem.workspaceId,
            organisationId,
          },
          extraContext: {
            intent: intent.type,
            originalQuery: inputVal,
            consideredDocumentIds: multiResults.slice(0, 5).map((doc) => doc.id),
          },
        },
        buildWorkspaceContext
      );
      // Prepare cards for UI
      const documentCards = multiResults.slice(0, 3).map(doc => ({
        id: doc.id,
        name: doc.name,
        status: 'current' as const,
        url: `/documents/${doc.id}`,
        subtitle: doc.folderId ? `Folder: ${doc.folderId}` : undefined,
        summary: doc.summary,
        regulations: doc.regulations,
      }));
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: aiAnswer, documents: documentCards }]);
      setInput('');
      setIsTyping(false);
      return;
    }

    if (inputVal.trim() === '') return;

    // Handle audit query
    if (intent.type === 'audit_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching audit information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for audit query.' });
          setIsTyping(false);
          return;
        }

        const originalInput = intent.originalInput?.toLowerCase() || '';
        const orgContext = organisationId || null;
        const auditPayload: Record<string, any> = {
          mode: 'audit_query',
          variant: 'status',
          originalInput: inputVal,
          requestedAudit: intent.auditType || 'all',
        };
        let variant: 'trend' | 'comments' | 'scores' | 'status' = 'status';
        let hasData = false;

        if (originalInput.includes('trend') || originalInput.includes('performance')) {
          variant = 'trend';
          auditPayload.variant = 'trend';
          const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
          const snapshots = await getMonthlyAuditSnapshots(workspaceId, undefined, orgContext);
          const trendData = Object.entries(snapshots || {})
            .map(([auditType, auditHistory]) => {
              const history = (auditHistory as any[]).slice(0, 6).map((entry) => ({
                snapshotCreatedAt: entry.snapshotCreatedAt,
                scorePercent: entry.scorePercent,
                comments: entry.comments,
                areasForImprovement: entry.areasForImprovement,
                goodPractice: entry.goodPractice,
                actionRequired: entry.actionRequired,
              }));
              return {
                auditType,
                latest: history[0] || null,
                historyLength: history.length,
                history,
              };
            })
            .filter((entry) => entry.historyLength > 0);
          if (trendData.length === 0) {
            appendMessages({ sender: 'ai', text: 'No audit data found for recent trends.' });
            setIsTyping(false);
            return;
          }
          hasData = true;
          auditPayload.trends = trendData;
        } else if (originalInput.includes('comment')) {
          variant = 'comments';
          auditPayload.variant = 'comments';
          const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
          const snapshots = await getMonthlyAuditSnapshots(workspaceId, undefined, orgContext);
          const commentData = Object.entries(snapshots || {})
            .map(([auditType, auditHistory]) => {
              const latestWithNotes = (auditHistory as any[]).find((entry) =>
                Boolean(entry.comments || entry.areasForImprovement || entry.goodPractice || entry.actionRequired)
              );
              if (!latestWithNotes) return null;
              return {
                auditType,
                comments: latestWithNotes.comments,
                areasForImprovement: latestWithNotes.areasForImprovement,
                goodPractice: latestWithNotes.goodPractice,
                actionRequired: latestWithNotes.actionRequired,
                snapshotCreatedAt: latestWithNotes.snapshotCreatedAt,
              };
            })
            .filter(Boolean);
          if (commentData.length === 0) {
            appendMessages({ sender: 'ai', text: 'No audit comments found for this month.' });
            setIsTyping(false);
            return;
          }
          hasData = true;
          auditPayload.comments = commentData;
        } else if (originalInput.includes('score') || originalInput.includes('result')) {
          variant = 'scores';
          auditPayload.variant = 'scores';
          const { getLatestAuditData, getMonthlyAuditCompletionStatus } = await import('@/lib/firestore');
          const requestedAudit = intent.auditType || 'all';
          if (requestedAudit === 'all') {
            const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId, orgContext);
            const auditTypes = Object.keys(completionStatus || {});
            const scoreEntries: Array<{ auditType: string; scorePercent?: number | null; snapshotCreatedAt?: string | null }> = [];
            for (const type of auditTypes) {
              const latest = await getLatestAuditData(workspaceId, type, undefined, orgContext);
              if (latest) {
                hasData = true;
                scoreEntries.push({
                  auditType: type,
                  scorePercent: latest.scorePercent ?? null,
                  snapshotCreatedAt: latest.snapshotCreatedAt ?? null,
                });
              }
            }
            if (!hasData) {
              appendMessages({ sender: 'ai', text: 'No audit scores found for this month.' });
              setIsTyping(false);
              return;
            }
            auditPayload.latestScores = scoreEntries;
          } else {
            const latest = await getLatestAuditData(workspaceId, requestedAudit, undefined, orgContext);
            if (!latest) {
              appendMessages({ sender: 'ai', text: `No recent scores found for ${requestedAudit.replace(/-/g, ' ')} audit.` });
              setIsTyping(false);
              return;
            }
            hasData = true;
            auditPayload.latestScore = {
              auditType: requestedAudit,
              scorePercent: latest.scorePercent ?? null,
              snapshotCreatedAt: latest.snapshotCreatedAt ?? null,
              comments: latest.comments ?? null,
            };
          }
        } else {
          variant = 'status';
          auditPayload.variant = 'status';
          const { getMonthlyAuditCompletionStatus, getLatestAuditData } = await import('@/lib/firestore');
          const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId, orgContext);
          const requestedAudit = auditPayload.requestedAudit || 'all';

          if (requestedAudit !== 'all') {
            hasData = true;
            const latest = await getLatestAuditData(workspaceId, requestedAudit, undefined, orgContext);
            const isCompletedThisMonth = Boolean(completionStatus?.[requestedAudit]);
            const friendlyName = formatAuditName(requestedAudit);
            let resolvedDoc: { downloadUrl: string | null; documentId: string | null } = {
              downloadUrl: null,
              documentId: null,
            };
            if (latest) {
              resolvedDoc = await resolveAuditDocumentInfo(workspaceId, orgContext || null, latest);
            }
            const downloadUrl = isCompletedThisMonth ? resolvedDoc.downloadUrl : null;
            const documentId = isCompletedThisMonth ? resolvedDoc.documentId : null;
            const snapshotDate = isCompletedThisMonth
              ? latest?.snapshotCreatedAt ?? latest?.auditDate ?? null
              : null;
            const scorePercent = isCompletedThisMonth ? latest?.scorePercent ?? null : null;

            const auditEntry: NonNullable<ChatMessage['audits']>[number] = {
              auditType: requestedAudit,
              name: friendlyName,
              isCompletedThisMonth,
              scorePercent,
              snapshotCreatedAt: snapshotDate,
              downloadUrl,
              documentId,
            };

            const completedDate = formatDateSafe(latest?.auditDate || latest?.snapshotCreatedAt);
            const completedBy = extractCompletedBy(latest);
            const scoreText = typeof scorePercent === 'number' ? `Score: ${scorePercent}%` : null;
            const highlightLines = isCompletedThisMonth ? extractAuditHighlightLines(latest) : [];
            let messageText: string;

            if (isCompletedThisMonth && latest) {
              const summaryParts: string[] = [`The ${friendlyName} is completed for this month.`];
              if (completedDate) summaryParts.push(`Completed on ${completedDate}`);
              if (completedBy) summaryParts.push(`by ${completedBy}`);
              if (scoreText) summaryParts.push(scoreText);
              messageText = summaryParts.join(' ') + '.';
              if (highlightLines.length > 0) {
                messageText += `\n\nKey notes:\n${highlightLines.slice(0, 3).map((line: string) => `• ${line}`).join('\n')}`;
              }
              messageText += `\n\nLet me know if you'd like to review or share this audit.`;
            } else {
              messageText = `I can't find a ${friendlyName.toLowerCase()} completed for this month yet. Would you like me to open the ${friendlyName.toLowerCase()} form so you can complete it now?`;
            }

            appendMessages({ sender: 'ai', text: messageText, audits: [auditEntry] });
            setIsTyping(false);
            return;
          }

          const auditTypes = Object.keys(completionStatus || {});
          if (auditTypes.length === 0) {
            appendMessages({ sender: 'ai', text: 'No audit status information available yet.' });
            setIsTyping(false);
            return;
          }
          hasData = true;
          const statusEntries = auditTypes.map((type) => ({
            auditType: type,
            isCompletedThisMonth: Boolean(completionStatus?.[type]),
          }));

          const latestScores: Array<{ auditType: string; scorePercent?: number | null }> = [];
          for (const type of auditTypes.slice(0, 12)) {
            const latest = await getLatestAuditData(workspaceId, type, undefined, orgContext);
            if (latest && latest.scorePercent !== undefined) {
              latestScores.push({ auditType: type, scorePercent: latest.scorePercent });
            }
          }

          auditPayload.status = {
            completion: statusEntries,
            latestScores,
          };
        }

        if (!hasData) {
          appendMessages({ sender: 'ai', text: 'No audit information could be retrieved.' });
          setIsTyping(false);
          return;
        }

        // Build an audits array for UI cards (completed vs incomplete)
        let auditsArray: ChatMessage['audits'] = [];
        try {
          const { getMonthlyAuditCompletionStatus, getLatestAuditData } = await import('@/lib/firestore');
          const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId, orgContext);
          const requestedAudit = auditPayload.requestedAudit || 'all';
          const auditTypes = requestedAudit === 'all'
            ? Object.keys(completionStatus || {})
            : [requestedAudit];
          for (const type of auditTypes) {
            try {
              const latest = await getLatestAuditData(workspaceId, type, undefined, orgContext);
              const friendlyName = formatAuditName(type);
              const isCompletedThisMonth = Boolean(completionStatus?.[type]);
              let resolvedDoc: { downloadUrl: string | null; documentId: string | null } = {
                downloadUrl: null,
                documentId: null,
              };
              if (latest) {
                resolvedDoc = await resolveAuditDocumentInfo(workspaceId, orgContext || null, latest);
              }
              const downloadUrl = isCompletedThisMonth ? resolvedDoc.downloadUrl : null;
              const documentId = isCompletedThisMonth ? resolvedDoc.documentId : null;
              const snapshotCreatedAt = isCompletedThisMonth
                ? latest?.snapshotCreatedAt ?? latest?.auditDate ?? null
                : null;
              const scorePercent = isCompletedThisMonth ? latest?.scorePercent ?? null : null;

              auditsArray.push({
                auditType: type,
                name: friendlyName,
                isCompletedThisMonth,
                scorePercent,
                snapshotCreatedAt,
                downloadUrl,
                documentId,
              });
            } catch (e) {
              auditsArray.push({
                auditType: type,
                name: formatAuditName(type),
                isCompletedThisMonth: Boolean(completionStatus?.[type]),
              });
            }
          }
        } catch (e) {
          auditsArray = [];
        }

        // Sanitize AI answer: strip raw Firebase storage download URLs to avoid exposing long storage links
        const aiRawAnswer = await askAIWithWorkspaceData(
          inputVal,
          {
            documentData: auditPayload,
            workspaceExtras: { auditVariant: variant, requestedAudit: auditPayload.requestedAudit },
            extraContext: {
              variant,
              requestedAudit: auditPayload.requestedAudit,
              originalInput,
            },
          },
          buildWorkspaceContext
        );

        // Remove firebase storage URLs like https://firebasestorage.googleapis.com/ and long gs:// links
        const storageUrlPattern = /(https?:\/\/[^\s)]+(?:firebasestorage|storage\.googleapis)[^\s)]*|gs:\/\/[\w\-/.]+)/gi;
        const aiAnswer = String(aiRawAnswer || '').replace(storageUrlPattern, '[document attached below]');

        appendMessages({ sender: 'ai', text: aiAnswer, audits: auditsArray });
      } catch (error) {
        console.error('Error fetching audit data:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the audit information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle dependency query
    if (intent.type === 'dependency_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching dependency data...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for dependency query.' });
          setIsTyping(false);
          return;
        }

        const orgId =
          organisationId ||
          (selectedItem as any)?.organisationId ||
          (selectedItem as any)?.organisation?.id ||
          null;

        const respondWithDependencySummary = async (
          variant: 'trend' | 'latest',
          payload: Record<string, any>,
          summaryText: string
        ) => {
          const aiAnswer = await askAIWithWorkspaceData(
            inputVal,
            {
              documentData: {
                mode: 'dependency_query',
                variant,
                summaryText,
                data: payload,
              },
              workspaceExtras: {
                dependencyVariant: variant,
              },
              extraContext: {
                variant,
                requestedTerms: intent.originalInput,
              },
            },
            buildWorkspaceContext
          );

          appendMessages({ sender: 'ai', text: aiAnswer });
        };

        const wantsTrend = /trend|history|over time|over the last|last week|last month|change|changes|compare|since/i.test(
          intent.originalInput?.toLowerCase() || ''
        );

        const headers: Record<string, string> = {};

        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            if (idToken) headers.authorization = `Bearer ${idToken}`;
          }
        } catch (tokenErr) {
          console.warn('Failed to resolve auth token for dependency trends API', tokenErr);
        }

        if (typeof window !== 'undefined' && !headers.authorization) {
          const adminSecret = (window as any)?.__ADMIN_SECRET;
          if (adminSecret) headers['x-admin-secret'] = adminSecret;
        }

        if (!headers.authorization && !headers['x-admin-secret']) {
          appendMessages({
            sender: 'ai',
            text: 'Authentication is required to view dependency data. Please sign in again.',
          });
          setIsTyping(false);
          return;
        }

        const apiUrl =
          `/api/workspaces/${workspaceId}/dependency-trends` +
          (orgId ? `?orgId=${encodeURIComponent(orgId)}` : '');

        const apiRes = await fetch(apiUrl, { headers });

        if (!apiRes.ok) {
          const fallbackText =
            apiRes.status === 403
              ? 'You do not have permission to view the dependency data for this workspace.'
              : apiRes.status === 401
              ? 'Authentication expired. Please refresh and sign in again to view dependency data.'
              : 'Sorry, I couldn’t fetch the dependency information. Please try again later.';
          console.error('Dependency trends API returned error', apiRes.status, await apiRes.text().catch(() => ''));
          appendMessages({ sender: 'ai', text: fallbackText });
          setIsTyping(false);
          return;
        }

        const apiData = (await apiRes.json()) as {
          points?: DependencyPoint[];
          latest?: DependencyLatest | null;
        };

        const points = Array.isArray(apiData?.points) ? apiData.points : [];
        const latest = apiData?.latest ?? null;

        if (wantsTrend) {
          if (!points.length) {
            appendMessages({
              sender: 'ai',
              text: 'No dependency history found. Please create a few Dependency Calculator snapshots first.',
            });
            setIsTyping(false);
            return;
          }

          const sortedPoints = [...points].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const trimmedPoints = sortedPoints.slice(-12);
          const first = trimmedPoints[0];
          const last = trimmedPoints[trimmedPoints.length - 1];
          const diff = last.totalStaff - first.totalStaff;
          const pctChange = first.totalStaff > 0 ? (diff / first.totalStaff) * 100 : NaN;

          const bandDeltas: Record<string, number> = {};
          const bandKeys = new Set<string>([
            ...Object.keys(first.levels || {}),
            ...Object.keys(last.levels || {}),
          ]);
          bandKeys.forEach((key) => {
            const startValue = first.levels?.[key] ?? 0;
            const endValue = last.levels?.[key] ?? 0;
            bandDeltas[key] = endValue - startValue;
          });

          const periodText = `${formatDateSafe(first.date) || first.date} → ${
            formatDateSafe(last.date) || last.date
          }`;
          let summary = `📈 **Dependency Trends (${trimmedPoints.length} snapshots)**\n\n`;
          summary += `• Period: ${periodText}\n`;
          summary += `• Recommended total staff: ${first.totalStaff} → ${last.totalStaff}`;
          if (!Number.isNaN(pctChange)) {
            summary += ` (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%)`;
          }
          summary += `\n`;
          summary += `• Carers: ${first.carers} → ${last.carers}\n`;
          summary += `• Nurses/Seniors: ${first.ns} → ${last.ns}\n\n`;
          summary += `**Band changes:**\n`;
          if (bandKeys.size === 0) {
            summary += '• No band data recorded.\n';
          } else {
            bandKeys.forEach((key) => {
              const startValue = first.levels?.[key] ?? 0;
              const endValue = last.levels?.[key] ?? 0;
              const delta = bandDeltas[key];
              const sign = delta > 0 ? '+' : '';
              summary += `• ${key}: ${startValue} → ${endValue} (${sign}${delta})\n`;
            });
          }
          summary += `\n**Snapshot totals:**\n`;
          summary += trimmedPoints
            .map((point) => `${formatDateSafe(point.date) || point.date}: ${point.totalStaff}`)
            .join(' | ');

          await respondWithDependencySummary(
            'trend',
            {
              points: trimmedPoints,
              first,
              last,
              diff,
              pctChange: Number.isNaN(pctChange) ? null : pctChange,
              bandDeltas,
              source: 'workspace_api',
            },
            summary
          );
          setIsTyping(false);
          return;
        }

        if (!latest) {
          appendMessages({
            sender: 'ai',
            text: 'No dependency data found. Please use the Dependency Calculator to create staffing calculations first.',
          });
          setIsTyping(false);
          return;
        }

        const quickAnswer = buildDependencyQuickAnswer(intent.originalInput ?? inputVal, latest);
        if (quickAnswer) {
          appendMessages({ sender: 'ai', text: quickAnswer });
          setIsTyping(false);
          return;
        }

        const savedLabel = formatDateSafe(latest.savedAt) || new Date(latest.savedAt).toLocaleString();
        const dependencyLevels = latest.dependencyLevels || {};
        const levelEntries = Object.entries(dependencyLevels);
        const levelSection = levelEntries.length
          ? levelEntries.map(([level, count]) => `• ${level}: ${count} resident(s)`).join('\n')
          : 'No dependency level breakdown available.';

        const staffing = latest.staffing;
        const dayHours = Number.isFinite(staffing.totals.dayHours) ? staffing.totals.dayHours : 0;
        const nightHours = Number.isFinite(staffing.totals.nightHours) ? staffing.totals.nightHours : 0;
        const overallHours = Number.isFinite(staffing.totals.overallHours)
          ? staffing.totals.overallHours
          : dayHours + nightHours;

        const summaryText =
          `📊 **Latest Dependency Analysis**\n\n` +
          `Saved at: ${savedLabel}\n` +
          `Residents assessed: ${latest.residentsCount ?? 0}\n` +
          `Recommended total staff (24h): ${latest.totalStaff}\n\n` +
          `**Dependency Levels:**\n${levelSection}\n\n` +
          `**Staffing Requirements:**\n` +
          `Day shift → Carers ${staffing.day.carers}, Nurses/Seniors ${staffing.day.ns}, Total ${staffing.day.total}\n` +
          `Night shift → Carers ${staffing.night.carers}, Nurses/Seniors ${staffing.night.ns}, Total ${staffing.night.total}\n\n` +
          `**Total Hours:**\n` +
          `Day: ${dayHours.toFixed(1)} hours | Night: ${nightHours.toFixed(1)} hours | Overall: ${overallHours.toFixed(1)} hours`;

        const trimmedPoints = points.slice(-6);

        await respondWithDependencySummary(
          'latest',
          {
            latest,
            recentPoints: trimmedPoints,
            source: 'workspace_api',
          },
          summaryText
        );
      } catch (error) {
        console.error('Error fetching dependency data:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn’t fetch the dependency information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle send email
    if (intent.type === 'send_email') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Preparing to send email...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for sending email.' });
          setIsTyping(false);
          return;
        }

        // Get teams for the workspace from workspace subcollection
        const { collection, getDocs } = await import('firebase/firestore');
        const orgId = organisationId || null;
        const teamsCol = collection(db, workspaceCollectionPath(workspaceId, 'teams', orgId));
        const snapshot = await getDocs(teamsCol);
        const teams = snapshot.docs.map(d => ({ id: d.id, name: d.data().name ?? 'Untitled Team' }));

        if (teams.length === 0) {
          appendMessages({ sender: 'ai', text: 'No teams found in this workspace to send email to.' });
          setIsTyping(false);
          return;
        }

        // For now, send to all teams (can be enhanced to specify which team)
        const recipientEmails: string[] = [];
        for (const team of teams) {
          // Get team members - this is simplified, in a real implementation, you'd search users by name/email
          // For now, we'll use a placeholder
        }

        if (recipientEmails.length === 0) {
          appendMessages({ sender: 'ai', text: 'No email recipients found. Please ensure teams have members with email addresses.' });
          setIsTyping(false);
          return;
        }

        const { sendFolderAccessEmail } = await import('@/actions/email');
        await sendFolderAccessEmail({
          teamName: teams.map(t => t.name).join(', '),
          folderNames: [],
          workspaceName: selectedItem.name || 'Workspace',
          grantedBy: user?.name || user?.email || 'CG360 User',
          recipientEmails
        });

        appendMessages({ sender: 'ai', text: `Email sent successfully to ${teams.length} team(s).` });
      } catch (error) {
        console.error('Error sending email:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t send the email. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle user search
    if (intent.type === 'user_search') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Searching for user...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const { getUserById } = await import('@/lib/firestore');
        // This is simplified - in a real implementation, you'd search users by name/email
        // For now, assume userName is an ID or search term
        const userData = await getUserById(intent.userName || '');
        if (userData) {
          appendMessages({ sender: 'ai', text: `Found user: ${userData.name || userData.email || 'Unknown'} (${userData.email || 'No email'})` });
        } else {
          appendMessages({ sender: 'ai', text: `No user found with the name "${intent.userName}".` });
        }
      } catch (error) {
        console.error('Error searching user:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t search for the user. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle create audit
    if (intent.type === 'create_audit') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Preparing to create audit...' }]);
      setInput('');
      setIsTyping(true);
      try {
        // Navigate to audit page or provide instructions
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('navigate-to-audits', { detail: { auditType: intent.auditType } }));
        }
        appendMessages({ sender: 'ai', text: `I've opened the audits page for you${intent.auditType ? ` to create a ${intent.auditType} audit` : ''}. You can start creating your audit there.` });
      } catch (error) {
        console.error('Error creating audit:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t navigate to the audit creation page. Please go to the Audits section manually.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle open audit
    if (intent.type === 'open_audit') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Opening audit...' }]);
      setInput('');
      setIsTyping(true);
      try {
        // Navigate to audit page and open specific audit
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('navigate-to-audits'));
          // Small delay to ensure page loads, then open specific audit
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-specific-audit', { detail: { auditType: intent.specificAudit } }));
          }, 500);
        }
        appendMessages({ sender: 'ai', text: `I've opened the audits page and navigated to the ${intent.specificAudit || 'requested'} audit.` });
      } catch (error) {
        console.error('Error opening audit:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t open the audit. Please go to the Audits section manually.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle document connection
    if (intent.type === 'document_connection') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Finding related documents...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for document search.' });
          setIsTyping(false);
          return;
        }

        const orgId2 = organisationId || null;
        const { searchDocumentsInWorkspace } = await import('@/lib/firestore');
  const relatedDocs = await searchDocumentsInWorkspace(workspaceId, intent.searchTerm || '', orgId2);

        if (relatedDocs.length > 0) {
          const docList = relatedDocs.slice(0, 5).map(doc => `- ${doc.name}`).join('\n');
          appendMessages({ sender: 'ai', text: `Found ${relatedDocs.length} related document(s):\n${docList}` });
        } else {
          appendMessages({ sender: 'ai', text: `No related documents found for "${intent.searchTerm}".` });
        }
      } catch (error) {
        console.error('Error finding related documents:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t find related documents. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle user profile
    if (intent.type === 'user_profile') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching your profile information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const userIdToUse = user?.id ?? mockUser.id;
        if (!userIdToUse) {
          appendMessages({ sender: 'ai', text: 'User authentication required to view profile.' });
          setIsTyping(false);
          return;
        }

        const { getUserById } = await import('@/lib/firestore');
        const userData = await getUserById(userIdToUse);
        
        if (userData) {
          const userCard = {
            id: userData.id || userIdToUse,
            name: userData.name || 'Unknown',
            email: userData.email || 'No email',
            role: 'User', // Default role since it's not in the User type
            avatarUrl: userData.avatarUrl || user?.avatarUrl || undefined,
            createdAt: 'Unknown' // Not available in User type
          };
          
          appendMessages({ sender: 'ai', text: 'Here\'s your profile information:', users: [userCard] });
        } else {
          appendMessages({ sender: 'ai', text: 'Could not retrieve your profile information.' });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch your profile information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle team info
    if (intent.type === 'team_info') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching team information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for team information.' });
          setIsTyping(false);
          return;
        }

        const { collection, getDocs } = await import('firebase/firestore');
        const orgId3 = organisationId || null;
        const teamsCol = collection(db, workspaceCollectionPath(workspaceId, 'teams', orgId3));
        const snapshot = await getDocs(teamsCol);
        const workspaceTeams = snapshot.docs.map(d => ({
            id: d.id,
            name: d.data().name ?? 'Untitled Team',
            memberCount: d.data().members?.length || 0,
            description: d.data().description || 'No description available'
        }));

        if (workspaceTeams.length > 0) {
          appendMessages({ sender: 'ai', text: `Found ${workspaceTeams.length} team(s) in this workspace:`, teams: workspaceTeams });
        } else {
          appendMessages({ sender: 'ai', text: 'No teams found in this workspace.' });
        }
      } catch (error) {
        console.error('Error fetching team information:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch team information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle workspace info
    if (intent.type === 'workspace_info') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching workspace information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected.' });
          setIsTyping(false);
          return;
        }

        const { getAllWorkspaces } = await import('@/lib/firestore');
        const workspaces = await getAllWorkspaces((selectedItem as any)?.organisationId || organisationId || undefined);
        const workspace = workspaces.find(w => w.id === workspaceId) || ((selectedItem as any)?.type === 'workspace' ? (selectedItem as any) : null);

        if (!workspace) {
          appendMessages({ sender: 'ai', text: 'Could not retrieve workspace information.' });
          setIsTyping(false);
          return;
        }

        const memberCount = Array.isArray(workspace.members) ? workspace.members.length : 0;
        const occupancyRate =
          workspace.totalBeds && workspace.occupiedBeds !== undefined && workspace.totalBeds > 0
            ? (workspace.occupiedBeds / workspace.totalBeds) * 100
            : null;

        const summaryText =
          `Workspace "${workspace.name || 'Unnamed'}" has ${memberCount} member(s)` +
          (occupancyRate !== null
            ? ` and is currently at ${occupancyRate.toFixed(1)}% bed occupancy (${workspace.occupiedBeds}/${workspace.totalBeds}).`
            : '.');

        const aiAnswer = await askAIWithWorkspaceData(
          inputVal,
          {
            documentData: {
              mode: 'workspace_info',
              workspace: {
                id: workspace.id,
                name: workspace.name || null,
                ownerId: workspace.ownerId || null,
                members: memberCount,
                organisationId: (workspace as any).organisationId || organisationId || null,
                region: (workspace as any).region || null,
                workspaceGroup: (workspace as any).workspaceGroup || null,
                workspaceGroupColor: (workspace as any).workspaceGroupColor || null,
                createdAt: (workspace as any).createdAt || null,
              },
              occupancy: occupancyRate !== null
                ? {
                    occupiedBeds: workspace.occupiedBeds,
                    totalBeds: workspace.totalBeds,
                    occupancyRate: Number(occupancyRate.toFixed(2)),
                  }
                : undefined,
              summaryText,
            },
            workspaceExtras: {
              memberCount,
              hasOccupancy: occupancyRate !== null,
            },
            extraContext: {
              originalInput: intent.originalInput,
              infoType: 'workspace_overview',
            },
          },
          buildWorkspaceContext
        );

        appendMessages({ sender: 'ai', text: aiAnswer });
      } catch (error) {
        console.error('Error fetching workspace information:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch workspace information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle open modal
    if (intent.type === 'open_modal') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Opening modal...' }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          if (intent.modalType === 'specific-appraisal') {
            // Handle specific appraisal opening
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-specific-appraisal', { detail: { appraisalName: intent.specificAppraisal } }));
            }, 500);
            appendMessages({ sender: 'ai', text: `I've opened the appraisals page and navigated to "${intent.specificAppraisal}".` });
          } else if (intent.modalType?.includes('tracker')) {
            // Navigate to appraisals page and switch to tracker tab
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            // Small delay to ensure page loads, then switch to tracker tab
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-tracker-tab'));
            }, 500);
            appendMessages({ sender: 'ai', text: 'I\'ve opened the Tracker tab for you.' });
          } else if (intent.modalType?.includes('appraisal')) {
            // First navigate to appraisals page, then open appraisal modal
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-appraisal-modal'));
            }, 500);
            appendMessages({ sender: 'ai', text: 'I\'ve opened the Appraisal modal for you.' });
          } else if (intent.modalType?.includes('audit')) {
            window.dispatchEvent(new CustomEvent('open-audit-modal'));
            appendMessages({ sender: 'ai', text: 'I\'ve opened the Audit modal for you.' });
          } else {
            appendMessages({ sender: 'ai', text: 'I\'m not sure which modal you want to open. Try "open tracker", "open appraisal", or "open audit".' });
          }
        } else {
          appendMessages({ sender: 'ai', text: 'Unable to open modal in this context.' });
        }
      } catch (error) {
        console.error('Error opening modal:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t open the modal. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle navigate page
    if (intent.type === 'navigate_page') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Navigating to page...' }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          if (intent.pagePath?.includes('action-plan')) {
            window.dispatchEvent(new CustomEvent('navigate-to-action-plans'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Action Plans page.' });
          } else if (intent.pagePath?.includes('admin')) {
            window.dispatchEvent(new CustomEvent('navigate-to-admin'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Admin page.' });
          } else if (intent.pagePath?.includes('dashboard')) {
            window.dispatchEvent(new CustomEvent('navigate-to-dashboard'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Dashboard.' });
          } else if (intent.pagePath?.includes('audit')) {
            window.dispatchEvent(new CustomEvent('navigate-to-audits'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Audits page.' });
          } else if (intent.pagePath?.includes('appraisal')) {
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Appraisals page.' });
          } else if (intent.pagePath?.includes('polic')) {
            window.dispatchEvent(new CustomEvent('navigate-to-policies'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Policies page.' });
          } else {
            appendMessages({ sender: 'ai', text: 'I\'m not sure which page you want to navigate to.' });
          }
        } else {
          appendMessages({ sender: 'ai', text: 'Unable to navigate in this context.' });
        }
      } catch (error) {
        console.error('Error navigating to page:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t navigate to that page. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle fetch notifications
    if (intent.type === 'fetch_notifications') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching recent notifications...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for notifications.' });
          setIsTyping(false);
          return;
        }

        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
  const notificationsCol = collection(db, workspaceCollectionPath(workspaceId, 'notifications'));
        const notificationsQuery = query(notificationsCol, orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(notificationsQuery);

        if (!snapshot.empty) {
          let response = `🔔 **Recent Notifications**\n\n`;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Unknown';
            response += `• ${data.title || 'Untitled'} (${date})\n`;
          });
          appendMessages({ sender: 'ai', text: response });
        } else {
          appendMessages({ sender: 'ai', text: 'No recent notifications found.' });
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch notifications. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle create document
    if (intent.type === 'create_document') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Preparing to create document...' }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('create-new-document', { detail: { type: intent.documentType } }));
          appendMessages({ sender: 'ai', text: `I've opened the document creation interface${intent.documentType ? ` for a ${intent.documentType}` : ''}. You can create your document there.` });
        } else {
          appendMessages({ sender: 'ai', text: 'Unable to create document in this context.' });
        }
      } catch (error) {
        console.error('Error creating document:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t create the document. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle edit document
    if (intent.type === 'edit_document') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Finding document to edit...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for document editing.' });
          setIsTyping(false);
          return;
        }

        const { searchDocumentsInWorkspace } = await import('@/lib/firestore');
  const orgIdForSearch = organisationId || null;
  const docs = await searchDocumentsInWorkspace(workspaceId, intent.searchTerm || '', orgIdForSearch);

        if (docs.length > 0) {
          const doc = docs[0];
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('edit-document', { detail: { documentId: doc.id, documentName: doc.name } }));
            appendMessages({ sender: 'ai', text: `I've opened "${doc.name}" for editing.` });
          } else {
            appendMessages({ sender: 'ai', text: `Found document "${doc.name}" but unable to open editor in this context.` });
          }
        } else {
          appendMessages({ sender: 'ai', text: `Could not find a document matching "${intent.searchTerm}".` });
        }
      } catch (error) {
        console.error('Error editing document:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t edit the document. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle occupancy data
    if (intent.type === 'occupancy_data') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching occupancy data...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for occupancy data.' });
          setIsTyping(false);
          return;
        }

        const { getAllWorkspaces } = await import('@/lib/firestore');
        const workspaces = await getAllWorkspaces((selectedItem as any)?.organisationId || organisationId || undefined);
        const workspace = workspaces.find(w => w.id === workspaceId) || ((selectedItem as any)?.type === 'workspace' ? (selectedItem as any) : null);

        if (!workspace || workspace.totalBeds === undefined || workspace.occupiedBeds === undefined) {
          appendMessages({ sender: 'ai', text: 'No occupancy data available for this workspace.' });
          setIsTyping(false);
          return;
        }

        const occupancyRate = workspace.totalBeds > 0 ? (workspace.occupiedBeds / workspace.totalBeds) * 100 : 0;
        const availableBeds = workspace.totalBeds - workspace.occupiedBeds;
        const status = occupancyRate > 90 ? 'high' : occupancyRate > 70 ? 'moderate' : 'low';

        const summaryText =
          `🏥 Occupancy overview for ${workspace.name || 'this workspace'}:\n` +
          `Beds occupied ${workspace.occupiedBeds}/${workspace.totalBeds} (${occupancyRate.toFixed(1)}%). Available beds: ${availableBeds}. Overall status: ${status.toUpperCase()}.`;

        const aiAnswer = await askAIWithWorkspaceData(
          inputVal,
          {
            documentData: {
              mode: 'occupancy_data',
              workspace: {
                id: workspace.id,
                name: workspace.name || null,
                region: (workspace as any).region || null,
                workspaceGroup: (workspace as any).workspaceGroup || null,
              },
              totals: {
                totalBeds: workspace.totalBeds,
                occupiedBeds: workspace.occupiedBeds,
                availableBeds,
                occupancyRate: Number(occupancyRate.toFixed(2)),
                status,
              },
              summaryText,
            },
            workspaceExtras: {
              occupancyRate: Number(occupancyRate.toFixed(2)),
              availableBeds,
            },
            extraContext: {
              originalInput: intent.originalInput,
              metricType: 'occupancy',
            },
          },
          buildWorkspaceContext
        );

        appendMessages({ sender: 'ai', text: aiAnswer });
      } catch (error) {
        console.error('Error fetching occupancy data:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch occupancy data. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle advanced analytics
    if (intent.type === 'advanced_analytics') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Generating advanced analytics report...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for analytics.' });
          setIsTyping(false);
          return;
        }

        const { generateAdvancedAnalytics } = await import('@/lib/advanced-analytics');
        const analytics = await generateAdvancedAnalytics(workspaceId);

        // Format the analytics response
        let response = '📊 **Advanced Analytics Report**\n\n';

        // Performance Metrics
        response += '🏆 **Performance Metrics**\n';
        response += `• Audit Completion Rate: ${analytics.metrics.auditPerformance.completionRate}%\n`;
        response += `• Average Audit Score: ${analytics.metrics.auditPerformance.averageScore}%\n`;
        response += `• Trend: ${analytics.metrics.auditPerformance.trendDirection === 'improving' ? '📈 Improving' : analytics.metrics.auditPerformance.trendDirection === 'declining' ? '📉 Declining' : '➡️ Stable'}\n\n`;

        // Staffing Efficiency
        response += '👥 **Staffing Efficiency**\n';
        response += `• Utilization Rate: ${analytics.metrics.staffingEfficiency.utilizationRate}%\n`;
        response += `• Cost Efficiency: ${analytics.metrics.staffingEfficiency.costEfficiency}%\n`;
        response += `• Day Shift Coverage: ${analytics.metrics.staffingEfficiency.shiftCoverage.day}%\n`;
        response += `• Night Shift Coverage: ${analytics.metrics.staffingEfficiency.shiftCoverage.night}%\n\n`;

        // Compliance Health
        response += '✅ **Compliance Health**\n';
        response += `• Overall Score: ${analytics.metrics.complianceHealth.overallScore}%\n`;
        response += `• Critical Issues: ${analytics.metrics.complianceHealth.criticalIssues}\n`;
        response += `• Upcoming Deadlines: ${analytics.metrics.complianceHealth.upcomingDeadlines}\n`;
        response += `• Policy Adherence: ${analytics.metrics.complianceHealth.policyAdherence}%\n\n`;

        // Risk Areas
        if (analytics.metrics.auditPerformance.riskAreas.length > 0) {
          response += '⚠️ **Risk Areas**\n';
          analytics.metrics.auditPerformance.riskAreas.forEach(area => {
            response += `• ${area.replace(/-/g, ' ')}\n`;
          });
          response += '\n';
        }

        // Top Performing Areas
        if (analytics.metrics.auditPerformance.topPerformingAudits.length > 0) {
          response += '🌟 **Top Performing Areas**\n';
          analytics.metrics.auditPerformance.topPerformingAudits.forEach(area => {
            response += `• ${area.replace(/-/g, ' ')}\n`;
          });
          response += '\n';
        }

        // Predictive Insights
        if (analytics.metrics.predictiveInsights.riskPredictions.length > 0) {
          response += '🔮 **Predictive Insights**\n';
          analytics.metrics.predictiveInsights.riskPredictions.slice(0, 3).forEach(prediction => {
            response += `• **${prediction.type}** (${Math.round(prediction.probability * 100)}% probability within ${prediction.timeframe})\n`;
            response += `  - ${prediction.recommendedActions[0]}\n`;
          });
          response += '\n';
        }

        // Benchmark Comparison
        response += '📈 **Benchmark Comparison**\n';
        response += `• Your Score: ${analytics.comparisons.benchmarkComparison.workspaceScore.toFixed(1)}\n`;
        response += `• Industry Average: ${analytics.comparisons.benchmarkComparison.industryAverage}%\n`;
        response += `• Percentile Rank: ${analytics.comparisons.benchmarkComparison.percentile.toFixed(0)}th percentile\n\n`;

        // Time Period Comparison
        response += '⏱️ **Period Comparison**\n';
        response += `• Current Period: ${analytics.comparisons.timePeriodComparison.current.toFixed(1)}\n`;
        response += `• Previous Period: ${analytics.comparisons.timePeriodComparison.previous.toFixed(1)}\n`;
        const changeSymbol = analytics.comparisons.timePeriodComparison.change >= 0 ? '📈' : '📉';
        response += `• Change: ${changeSymbol} ${analytics.comparisons.timePeriodComparison.changePercent.toFixed(1)}%\n\n`;

        // Key Insights
        if (analytics.insights.length > 0) {
          response += '💡 **Key Insights**\n';
          analytics.insights.slice(0, 3).forEach(insight => {
            const icon = insight.type === 'trend' ? '📊' : insight.type === 'risk' ? '⚠️' : insight.type === 'opportunity' ? '🎯' : '🔍';
            response += `• ${icon} ${insight.title}\n`;
            response += `  ${insight.description}\n`;
          });
          response += '\n';
        }

        // Top Recommendations
        if (analytics.recommendations.length > 0) {
          response += '🎯 **Top Recommendations**\n';
          analytics.recommendations.slice(0, 3).forEach(rec => {
            const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            response += `• ${priorityIcon} **${rec.title}**\n`;
            response += `  ${rec.description}\n`;
            response += `  Impact: ${rec.impact}/10 | Effort: ${rec.effort}/10\n`;
          });
        }

        appendMessages({ sender: 'ai', text: response });
      } catch (error) {
        console.error('Error generating analytics:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t generate the analytics report. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle agentic workflow
    if (intent.type === 'agentic_workflow') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Managing workflows...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        const orgId = organisationId || null;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for workflow management.' });
          setIsTyping(false);
          return;
        }

        const { WORKFLOW_TEMPLATES, executeWorkflow, checkWorkflowTriggers } = await import('@/lib/agentic-workflows');

        // Determine the specific workflow action from the user input
        const inputLower = inputVal.toLowerCase();

        if (inputLower.includes('create') || inputLower.includes('setup') || inputLower.includes('set up')) {
          // Create a new workflow
          // Map user words to the template keys defined in src/lib/agentic-workflows
          let workflowType: keyof typeof WORKFLOW_TEMPLATES = 'audit_reminder'; // default

          if (inputLower.includes('compliance')) workflowType = 'compliance_monitoring';
          else if (inputLower.includes('performance')) workflowType = 'performance_report';
          else if (inputLower.includes('risk')) workflowType = 'risk_assessment';
          else if (inputLower.includes('training')) workflowType = 'staff_training_reminder';

          const template = WORKFLOW_TEMPLATES[workflowType];
          if (template) {
            // Create workflow in Firestore
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflows', orgId || null));

            const workflowData = {
              ...template,
              id: `${workflowType}_${Date.now()}`,
              createdAt: serverTimestamp(),
              createdBy: user?.id || 'system',
              status: 'active',
              lastExecuted: null,
              executionCount: 0
            };

            await addDoc(workflowsCol, workflowData);

            appendMessages({ sender: 'ai', text: `✅ **Workflow Created Successfully**\n\nI've set up the "${template.name}" workflow for you.\n\n**What it does:**\n${template.description}\n\n**Triggers:** ${(template as any).trigger ? JSON.stringify((template as any).trigger) : ''}\n\n**Actions:** ${(template as any).actions ? (template as any).actions.map((a: any) => a.type).join(', ') : ''}\n\nThe workflow is now active and will run automatically based on the configured triggers.` });
          } else {
            appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t identify which type of workflow you want to create. Try specifying "audit reminders", "compliance monitoring", "performance reports", "risk assessments", or "training reminders".' });
          }
        } else if (inputLower.includes('list') || inputLower.includes('show') || inputLower.includes('status')) {
          // List existing workflows
          const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
          const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflows', orgId || null));
          const workflowsQuery = query(workflowsCol, orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(workflowsQuery);

          if (!snapshot.empty) {
            let response = '🔄 **Active Workflows**\n\n';
            snapshot.docs.forEach((doc, index) => {
              const data = doc.data();
              const statusIcon = data.status === 'active' ? '🟢' : '🔴';
              const lastExec = data.lastExecuted ? new Date(data.lastExecuted.toDate()).toLocaleDateString() : 'Never';
              response += `${index + 1}. ${statusIcon} **${data.name}**\n`;
              response += `   Status: ${data.status}\n`;
              response += `   Last executed: ${lastExec}\n`;
              response += `   Executions: ${data.executionCount || 0}\n\n`;
            });
            appendMessages({ sender: 'ai', text: response });
          } else {
            appendMessages({ sender: 'ai', text: 'No workflows are currently set up. Try creating one with "create audit reminders workflow" or similar.' });
          }
        } else if (inputLower.includes('enable') || inputLower.includes('activate')) {
          // Enable/activate workflows
          const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
          const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflows', orgId || null));
          const snapshot = await getDocs(workflowsCol);

          let activatedCount = 0;
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.status !== 'active') {
              await updateDoc(doc(db, workspaceCollectionPath(workspaceId, 'workflows', orgId), docSnap.id), {
                status: 'active'
              });
              activatedCount++;
            }
          }

          if (activatedCount > 0) {
            appendMessages({ sender: 'ai', text: `✅ Activated ${activatedCount} workflow(s). All workflows are now running.` });
          } else {
            appendMessages({ sender: 'ai', text: 'All workflows are already active.' });
          }
        } else if (inputLower.includes('disable') || inputLower.includes('deactivate')) {
          // Disable/deactivate workflows
          const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
          const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflows', orgId || null));
          const snapshot = await getDocs(workflowsCol);

          let deactivatedCount = 0;
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.status === 'active') {
              await updateDoc(doc(db, workspaceCollectionPath(workspaceId, 'workflows', orgId), docSnap.id), {
                status: 'inactive'
              });
              deactivatedCount++;
            }
          }

          if (deactivatedCount > 0) {
            appendMessages({ sender: 'ai', text: `⏸️ Deactivated ${deactivatedCount} workflow(s).` });
          } else {
            appendMessages({ sender: 'ai', text: 'No active workflows to deactivate.' });
          }
        } else if (inputLower.includes('run') || inputLower.includes('execute') || inputLower.includes('trigger')) {
          // Manually execute workflows
          const { collection, getDocs } = await import('firebase/firestore');
          const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflows', orgId || null));
          const snapshot = await getDocs(workflowsCol);

          if (!snapshot.empty) {
            let executedCount = 0;
            for (const docSnap of snapshot.docs) {
              const workflowData = docSnap.data();
              if (workflowData.status === 'active') {
                try {
                  // executeWorkflow expects (workspaceId, workflowId, triggerData?)
                  // workflowData may be a plain object from Firestore; ensure we pass the id
                  const wfId = (workflowData && workflowData.id) ? workflowData.id : docSnap.id;
                  await executeWorkflow(workspaceId, String(wfId));
                  executedCount++;
                } catch (error) {
                  console.error(`Failed to execute workflow ${workflowData?.name || docSnap.id}:`, error);
                }
              }
            }

            if (executedCount > 0) {
              appendMessages({ sender: 'ai', text: `🚀 Executed ${executedCount} active workflow(s) manually.` });
            } else {
              appendMessages({ sender: 'ai', text: 'No active workflows to execute.' });
            }
          } else {
            appendMessages({ sender: 'ai', text: 'No workflows found to execute.' });
          }
        } else {
          // Show available workflow templates
          let response = '🤖 **Available Workflow Templates**\n\n';
          response += 'Here are the automated workflows I can set up for you:\n\n';

          Object.values(WORKFLOW_TEMPLATES).forEach((template, index) => {
            const tpl = template as any; // Type assertion for template
            response += `${index + 1}. **${tpl.name}**\n`;
            response += `   ${tpl.description}\n`;
            response += `   Triggers: ${tpl.triggers.join(', ')}\n\n`;
          });

          response += '**Commands you can use:**\n';
          response += '• "Create audit reminders workflow"\n';
          response += '• "Show me my workflows"\n';
          response += '• "Enable all workflows"\n';
          response += '• "Run workflows now"\n';

          appendMessages({ sender: 'ai', text: response });
        }
      } catch (error) {
        console.error('Error managing workflows:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t manage the workflows. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle action plans query
    if (intent.type === 'action_plans_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching action plans information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for action plans query.' });
          setIsTyping(false);
          return;
        }

        const orgId = organisationId || null;
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const actionPlansCol = collection(db, workspaceCollectionPath(workspaceId, 'action-plans', orgId));
        const actionPlansQuery = query(actionPlansCol, orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(actionPlansQuery);

        if (snapshot.empty) {
          appendMessages({ sender: 'ai', text: 'No action plans found in this workspace.' });
          setIsTyping(false);
          return;
        }

        const plans = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          const items = Array.isArray(data.items) ? data.items.slice(0, 25) : undefined;
          const normalizedItems = items?.map((item: any) => ({
            id: item.id ?? null,
            title: item.title ?? item.text ?? null,
            status: item.status ?? null,
            owner: item.owner ?? item.assignedTo ?? null,
            dueDate: item.dueDate ?? null,
            completedAt: item.completedAt ?? null,
          }));
          return {
            id: docSnap.id,
            monthKey: data.monthKey || 'Unknown',
            totalItems: data.totalItems ?? (Array.isArray(items) ? items.length : 0),
            completedItems: data.completedItems ?? (Array.isArray(items) ? items.filter((i: any) => i.status === 'complete').length : 0),
            overdueItems: data.overdueItems ?? null,
            isComplete: Boolean(data.isComplete),
            summary: data.summary || null,
            owner: data.ownerName || data.createdBy || null,
            tags: Array.isArray(data.tags) ? data.tags.slice(0, 10) : undefined,
            updatedAt: data.updatedAt || data.modifiedAt || null,
            itemsPreview: normalizedItems,
          };
        });

        const totalPlans = plans.length;
        const completedPlans = plans.filter((plan) => plan.isComplete).length;
        const inProgressPlans = totalPlans - completedPlans;
        const totalItems = plans.reduce((acc, plan) => acc + (plan.totalItems || 0), 0);
        const completedItems = plans.reduce((acc, plan) => acc + (plan.completedItems || 0), 0);
        const outstandingItems = totalItems - completedItems;

        let summaryText = '📋 Recent Action Plans\n\n';
        summaryText += `Total plans reviewed: ${totalPlans}. Completed: ${completedPlans}. In progress: ${inProgressPlans}.\n`;
        summaryText += `Across these plans there are ${totalItems} tracked items with ${outstandingItems} still outstanding.`;

        const aiAnswer = await askAIWithWorkspaceData(
          inputVal,
          {
            documentData: {
              mode: 'action_plans_query',
              plans,
              metrics: {
                totalPlans,
                completedPlans,
                inProgressPlans,
                totalItems,
                completedItems,
                outstandingItems,
              },
              summaryText,
            },
            workspaceExtras: {
              actionPlanCount: totalPlans,
              outstandingActionItems: outstandingItems,
            },
            extraContext: {
              originalInput: intent.originalInput,
              resultScope: 'recent_action_plans',
            },
          },
          buildWorkspaceContext
        );

        appendMessages({ sender: 'ai', text: aiAnswer });
      } catch (error) {
        console.error('Error fetching action plans:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the action plans information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle holiday/annual leave query
    if (intent.type === 'holiday_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Checking who is on leave...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected to check holidays.' });
          setIsTyping(false);
          return;
        }

        const orgId = organisationId || null;
        const timeframe: string = intent.timeframe || 'this-week';

        const toStartOfDay = (date: Date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          return d;
        };

        const toEndOfDay = (date: Date) => {
          const d = new Date(date);
          d.setHours(23, 59, 59, 999);
          return d;
        };

        const addDays = (date: Date, days: number) => {
          const d = new Date(date);
          d.setDate(d.getDate() + days);
          return d;
        };

        const startOfWeek = (date: Date) => {
          const d = toStartOfDay(date);
          const diff = d.getDay();
          d.setDate(d.getDate() - diff);
          return d;
        };

        const endOfWeek = (start: Date) => toEndOfDay(addDays(start, 6));

        const now = new Date();
        let rangeStart: Date;
        let rangeEnd: Date;

        switch (timeframe) {
          case 'next-week': {
            const start = addDays(startOfWeek(now), 7);
            rangeStart = start;
            rangeEnd = endOfWeek(start);
            break;
          }
          case 'last-week': {
            const start = addDays(startOfWeek(now), -7);
            rangeStart = start;
            rangeEnd = endOfWeek(start);
            break;
          }
          case 'today': {
            rangeStart = toStartOfDay(now);
            rangeEnd = toEndOfDay(now);
            break;
          }
          case 'tomorrow': {
            const tomorrow = addDays(now, 1);
            rangeStart = toStartOfDay(tomorrow);
            rangeEnd = toEndOfDay(tomorrow);
            break;
          }
          case 'this-month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            rangeStart = toStartOfDay(start);
            rangeEnd = toEndOfDay(end);
            break;
          }
          case 'next-month': {
            const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            rangeStart = toStartOfDay(start);
            rangeEnd = toEndOfDay(end);
            break;
          }
          default: {
            const start = startOfWeek(now);
            rangeStart = start;
            rangeEnd = endOfWeek(start);
          }
        }

        const periodLabel = (() => {
          const sameDay = rangeStart.toDateString() === rangeEnd.toDateString();
          if (sameDay) return formatDateSafe(rangeStart) || 'the selected day';
          const startText = formatDateSafe(rangeStart) || '';
          const endText = formatDateSafe(rangeEnd) || '';
          return `${startText} – ${endText}`.trim();
        })();

        const weekKeys = new Set<string>();
        const cursor = new Date(rangeStart);
        while (cursor <= rangeEnd) {
          const wkStart = startOfWeek(cursor);
          const weekKey = wkStart.toISOString().split('T')[0];
          weekKeys.add(weekKey);
          cursor.setDate(cursor.getDate() + 1);
        }

        const { doc, getDoc } = await import('firebase/firestore');

        const leaveByStaff = new Map<string, { name: string; entries: Array<{ date: Date; hours?: number | null; notes?: string | null }> }>();

        for (const weekKey of weekKeys.values()) {
          const rotaRef = doc(db, workspaceCollectionPath(workspaceId, 'rotas', orgId), weekKey);
          const rotaSnap = await getDoc(rotaRef);
          if (!rotaSnap.exists()) continue;

          const rotaData = rotaSnap.data() as { shifts?: Array<any> } | undefined;
          const shifts = Array.isArray(rotaData?.shifts) ? rotaData!.shifts : [];

          for (const shift of shifts) {
            if (!shift || shift.type !== 'AnnualLeave') continue;
            if (!shift.date) continue;

            const shiftDate = new Date(shift.date);
            if (Number.isNaN(shiftDate.getTime())) continue;
            if (shiftDate < rangeStart || shiftDate > rangeEnd) continue;

            const staffName = typeof shift.staffName === 'string' && shift.staffName.trim()
              ? shift.staffName.trim()
              : typeof shift.staffFullName === 'string' && shift.staffFullName.trim()
                ? shift.staffFullName.trim()
                : typeof shift.staffDisplayName === 'string' && shift.staffDisplayName.trim()
                  ? shift.staffDisplayName.trim()
                  : String(shift.staffId || 'Unknown staff');

            const staffKey = String(shift.staffId || staffName);
            const entry = leaveByStaff.get(staffKey) || {
              name: staffName,
              entries: [] as Array<{ date: Date; hours?: number | null; notes?: string | null }>,
            };
            entry.entries.push({ date: shiftDate, hours: shift.leave?.totalHours ?? null, notes: shift.notes ?? null });
            leaveByStaff.set(staffKey, entry);
          }
        }

        if (leaveByStaff.size === 0) {
          appendMessages({ sender: 'ai', text: `No one appears to be on annual leave for ${periodLabel}.` });
          setIsTyping(false);
          return;
        }

        const sortedStaff = Array.from(leaveByStaff.values()).sort((a, b) => a.name.localeCompare(b.name));

        let response = `🌴 **Annual Leave (${periodLabel})**\n\n`;
        for (const staff of sortedStaff) {
          const days = staff.entries
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map((entry) => {
              const dateText = formatDateSafe(entry.date) || entry.date.toISOString().split('T')[0];
              const hoursText = typeof entry.hours === 'number' && entry.hours > 0 ? ` (${entry.hours.toFixed(1)}h)` : '';
              return `• ${dateText}${hoursText}`;
            });

          response += `**${staff.name}**\n${days.join('\n')}\n\n`;
        }

        appendMessages({ sender: 'ai', text: response.trimEnd() });
      } catch (error) {
        console.error('Error fetching holiday information:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I could not check holiday information right now.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle rotas query
    if (intent.type === 'rotas_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching rota information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for rotas query.' });
          setIsTyping(false);
          return;
        }

        const orgId = organisationId || null;
        const userId = user?.id;
        
        if (!userId) {
          appendMessages({ sender: 'ai', text: 'User authentication required to view rotas.' });
          setIsTyping(false);
          return;
        }

        // Get current week's rota (match app: week starts on Monday)
        const today = new Date();
        // compute days since Monday (0..6)
        const todayDay = today.getDay();
        const daysSinceMonday = (todayDay + 6) % 7; // if today is Monday -> 0, Sunday -> 6
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - daysSinceMonday);

        // Build local yyyy-mm-dd week key (use local date, not UTC iso) to match rotas storage
        const localDateKey = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        };
        const weekKey = localDateKey(startOfWeek);

        const { doc, getDoc } = await import('firebase/firestore');
        const rotaCollectionPath = workspaceCollectionPath(workspaceId, 'rotas', orgId);
        const rotaRef = doc(db, rotaCollectionPath, weekKey);
        const rotaSnap = await getDoc(rotaRef);

        if (!rotaSnap.exists()) {
          appendMessages({ sender: 'ai', text: 'No rota data found for the current week.' });
          // Debug helper: show which document path was checked so we can verify alignment with the UI
          appendMessages({ sender: 'ai', text: `Checked rota document path: ${rotaCollectionPath}/${weekKey}` });
          setIsTyping(false);
          return;
        }

        const rotaData = rotaSnap.data() as any;
        const shifts: any[] = Array.isArray(rotaData?.shifts) ? rotaData.shifts : [];

        if (shifts.length === 0) {
          appendMessages({ sender: 'ai', text: 'No scheduled shifts were found for this week.' });
          setIsTyping(false);
          return;
        }

        const weekEnd = new Date(startOfWeek);
        weekEnd.setDate(startOfWeek.getDate() + 6);
        const weekLabel = formatDateSafe(startOfWeek) || startOfWeek.toLocaleDateString();
        const weekEndLabel = formatDateSafe(weekEnd) || weekEnd.toLocaleDateString();
        const weekRangeLabel = `${weekLabel} – ${weekEndLabel}`;

        const normalizeName = (value?: string | null) =>
          typeof value === 'string' ? value.trim() : undefined;

        const normalizedShifts: NormalizedShift[] = shifts.slice(0, 120).map((shift) => {
          let resolvedDate: Date | null = null;
          const rawDate = shift.date ?? shift.day ?? shift.dayKey ?? null;
          if (rawDate instanceof Date) {
            resolvedDate = rawDate;
          } else if (rawDate && typeof rawDate === 'object' && typeof rawDate?.toDate === 'function') {
            try {
              const tsDate = rawDate.toDate();
              if (tsDate && !Number.isNaN(tsDate.getTime())) resolvedDate = tsDate;
            } catch (err) {}
          } else if (typeof rawDate === 'number') {
            const numDate = new Date(rawDate);
            if (!Number.isNaN(numDate.getTime())) resolvedDate = numDate;
          } else if (typeof rawDate === 'string' && rawDate.trim().length > 0) {
            const strDate = new Date(rawDate);
            if (!Number.isNaN(strDate.getTime())) resolvedDate = strDate;
          }

          const parsedLegacy = !resolvedDate && shift.dayKey && typeof shift.dayKey === 'string'
            ? new Date(shift.dayKey)
            : null;
          if (!resolvedDate && parsedLegacy && !Number.isNaN(parsedLegacy.getTime())) {
            resolvedDate = parsedLegacy;
          }

          const validDate = resolvedDate && !Number.isNaN(resolvedDate.getTime()) ? resolvedDate : null;
          const isoDate = validDate ? validDate.toISOString().split('T')[0] : (typeof shift.dayKey === 'string' ? shift.dayKey : null);
          const dayName = validDate
            ? validDate.toLocaleDateString('en-GB', { weekday: 'long' })
            : 'Unscheduled';
          const dayNumber = validDate ? validDate.getDay() : -1;
          const displayDate = validDate
            ? validDate.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
            : (typeof shift.displayDate === 'string' && shift.displayDate.length > 0
                ? shift.displayDate
                : typeof shift.date === 'string'
                  ? shift.date
                  : 'Date not set');

          return {
            id: shift.id ?? null,
            staffId: shift.staffId ?? null,
            staffName: normalizeName(
              shift.staffName ||
              shift.staffFullName ||
              shift.staffDisplayName ||
              shift.staff ||
              shift.staffEmail ||
              shift.userName ||
              (typeof shift.staff === 'object' ? shift.staff?.name : undefined) ||
              (typeof shift.user === 'object' ? shift.user?.name : undefined)
            ) || null,
            role: shift.role || shift.staffRole || null,
            type: shift.type || shift.shiftType || shift.category || null,
            location: shift.location || shift.unit || shift.floor || shift.area || null,
            date: typeof shift.date === 'string' ? shift.date : isoDate,
            dayKey: isoDate,
            dayName,
            dayNumber,
            displayDate,
            startTime: shift.startTime || shift.start || shift.start_time || null,
            endTime: shift.endTime || shift.end || shift.end_time || null,
            notes: shift.notes || shift.comment || shift.description || null,
          };
        });

        const userIdentifiers = new Set(
          [user?.id, user?.email, user?.name]
            .filter(Boolean)
            .map((val) => String(val).trim().toLowerCase())
        );

        const normalizedUserShifts = normalizedShifts.filter((shift) => {
          if (!shift) return false;
          if (shift.staffId && userIdentifiers.has(String(shift.staffId).toLowerCase())) return true;
          if (!shift.staffName) return false;
          const lower = shift.staffName.toLowerCase();
          for (const ident of userIdentifiers) {
            if (!ident) continue;
            if (lower === ident || lower.includes(ident)) return true;
          }
          return false;
        });

        const shiftsByDay: Record<string, RotaDaySummary> = {};
        const roleCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        const staffMap: Record<string, { name: string; shifts: NormalizedShift[]; variants: string[] }> = {};
        normalizedShifts.forEach((shift) => {
          if (!shift) return;

          const staffName = (shift.staffName || 'Unassigned').trim();
          const staffKey = staffName.toLowerCase();
          if (!staffMap[staffKey]) {
            const nameParts = staffName.split(/\s+/).filter((part) => part.length > 2);
            const variants = new Set<string>([staffKey]);
            nameParts.forEach((part) => variants.add(part.toLowerCase()));
            staffMap[staffKey] = {
              name: staffName,
              shifts: [],
              variants: Array.from(variants),
            };
          }
          staffMap[staffKey].shifts.push(shift);

          const dayKey = shift.dayKey || 'unscheduled';
          if (!shiftsByDay[dayKey]) {
            shiftsByDay[dayKey] = {
              dayKey,
              dayName: shift.dayName,
              dayNumber: shift.dayNumber,
              displayDate: shift.displayDate,
              total: 0,
              roles: {},
              types: {},
              staff: [],
              shifts: [],
            };
          }

          const daySummary = shiftsByDay[dayKey];
          daySummary.total += 1;
          daySummary.shifts.push(shift);

          if (staffName && !daySummary.staff.includes(staffName)) {
            daySummary.staff.push(staffName);
          }

          if (shift.role) {
            daySummary.roles[shift.role] = (daySummary.roles[shift.role] || 0) + 1;
            roleCounts[shift.role] = (roleCounts[shift.role] || 0) + 1;
          }

          if (shift.type) {
            daySummary.types[shift.type] = (daySummary.types[shift.type] || 0) + 1;
            typeCounts[shift.type] = (typeCounts[shift.type] || 0) + 1;
          }
        });

        let summaryText = `📅 Rota overview for ${weekLabel} to ${weekEndLabel}\n\n`;
        if (normalizedUserShifts.length > 0) {
          summaryText += `You have ${normalizedUserShifts.length} shift(s) scheduled this week.`;
        } else {
          summaryText += 'No personal shifts were found for this account. Showing workspace coverage overview instead.';
        }

        const quickAnswer = buildRotaQuickAnswer({
          question: intent.originalInput ?? inputVal,
          normalizedShifts,
          normalizedUserShifts,
          roleCounts,
          typeCounts,
          daySummaries: shiftsByDay,
          staffMap,
          weekRangeLabel,
        });

        if (quickAnswer) {
          appendMessages({ sender: 'ai', text: quickAnswer });
          setIsTyping(false);
          return;
        }

        // If user asked about shortages/requirements, perform a dependency-gap check using server dependency-trends
        const shortageHint = /(shortage|understaff|short-staff|under-staffed|requirement|recommended|need|should|gap|shortfall)/i;
        const wantsGapAnalysis = shortageHint.test((intent.originalInput || inputVal) as string);
        if (wantsGapAnalysis) {
          try {
            // get id token for auth
            const currentUser = auth.currentUser as any;
            const idToken = currentUser ? await currentUser.getIdToken() : null;
            if (!idToken) {
              appendMessages({ sender: 'ai', text: 'I need you to be signed in to check staffing requirements.' });
              setIsTyping(false);
              return;
            }

            const dtUrl = `/api/workspaces/${workspaceId}/dependency-trends${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`;
            const dtRes = await fetch(dtUrl, { headers: { Authorization: `Bearer ${idToken}` } });
            if (!dtRes.ok) {
              appendMessages({ sender: 'ai', text: `Could not fetch dependency recommendations (${dtRes.status}). Falling back to a basic summary.` });
              setIsTyping(false);
              return;
            }
            const dtJson = await dtRes.json();
            const latest = dtJson?.latest;
            if (!latest || !latest.staffing) {
              appendMessages({ sender: 'ai', text: `No dependency recommendations available to compare. I can still summarise scheduled staff if that helps.` });
              setIsTyping(false);
              return;
            }

            // Build per-day scheduled carers/nurses
            const perDay: Record<string, { carers: number; nurses: number; total: number; dayName: string }> = {};
            for (const [dayKey, summary] of Object.entries(shiftsByDay)) {
              const carers = Object.entries(summary.roles || {}).reduce((sum, [r, c]) => sum + (/(carer|care|support)/i.test(r) ? c : 0), 0);
              const nurses = Object.entries(summary.roles || {}).reduce((sum, [r, c]) => sum + (/(nurse|rgn|registered)/i.test(r) ? c : 0), 0);
              perDay[dayKey] = { carers, nurses, total: summary.total, dayName: summary.dayName };
            }

            const recDayCarers = Number(latest.staffing?.day?.carers ?? 0);
            const recDayNurses = Number(latest.staffing?.day?.ns ?? 0);
            const recNightCarers = Number(latest.staffing?.night?.carers ?? 0);
            const recNightNurses = Number(latest.staffing?.night?.ns ?? 0);

            const shortages: string[] = [];
            for (const [dayKey, vals] of Object.entries(perDay)) {
              // For simplicity compare day vs recommended day and night vs recommended night using counts from summary.types if available
              const dayCarersScheduled = vals.carers; // coarse
              const dayNursesScheduled = vals.nurses;

              if (dayCarersScheduled < recDayCarers) {
                shortages.push(`${vals.dayName}: carers short by ${recDayCarers - dayCarersScheduled}`);
              }
              if (dayNursesScheduled < recDayNurses) {
                shortages.push(`${vals.dayName}: nurses short by ${recDayNurses - dayNursesScheduled}`);
              }
            }

            if (shortages.length === 0) {
              appendMessages({ sender: 'ai', text: `Based on the latest dependency recommendations, this rota meets recommended staffing levels for the week (${weekRangeLabel}).` });
            } else {
              appendMessages({ sender: 'ai', text: `Staffing gaps detected for ${weekRangeLabel}:
${shortages.map(s => `- ${s}`).join('\n')}

I used the latest dependency recommendation (day carers ${recDayCarers}, day nurses ${recDayNurses}). I can propose extra shifts to close these gaps if you'd like.` });
            }
            setIsTyping(false);
            return;
          } catch (err) {
            console.error('Dependency gap check failed:', err);
            appendMessages({ sender: 'ai', text: 'Could not complete dependency gap analysis — try again or ask me to run a summary.' });
            setIsTyping(false);
            return;
          }
        }

        const aiAnswer = await askAIWithWorkspaceData(
          inputVal,
          {
            documentData: {
              mode: 'rota_query',
              variant: normalizedUserShifts.length > 0 ? 'user_specific' : 'workspace_overview',
              week: {
                start: startOfWeek.toISOString(),
                end: weekEnd.toISOString(),
                label: `Week of ${weekLabel}`,
              },
              totalShifts: normalizedShifts.length,
              userShifts: normalizedUserShifts,
              coverageByDay: shiftsByDay,
              roleCounts,
              typeCounts,
              allShiftsPreview: normalizedShifts,
              summaryText,
            },
            workspaceExtras: {
              rotaWeekStart: weekKey,
              rotaTotalShifts: normalizedShifts.length,
              rotaUserShiftCount: normalizedUserShifts.length,
            },
            extraContext: {
              originalInput: intent.originalInput,
              weekKey,
              queryVariant: normalizedUserShifts.length > 0 ? 'user_specific' : 'workspace_overview',
            },
          },
          buildWorkspaceContext
        );

        appendMessages({ sender: 'ai', text: aiAnswer });
      } catch (error) {
        console.error('Error fetching rotas:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the rota information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle lessons learned and RCA query
    if (intent.type === 'lessons_rca_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching lessons learned and RCA records...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for lessons learned/RCA query.' });
          setIsTyping(false);
          return;
        }

        const orgId = organisationId || null;
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        
        // Fetch lessons learned
        const lessonsCol = collection(db, workspaceCollectionPath(workspaceId, 'lessons-learned', orgId));
        const lessonsQuery = query(lessonsCol, orderBy('createdAt', 'desc'), limit(3));
        const lessonsSnap = await getDocs(lessonsQuery);
        
        // Fetch RCA records
        const rcaCol = collection(db, workspaceCollectionPath(workspaceId, 'rca-records', orgId));
        const rcaQuery = query(rcaCol, orderBy('createdAt', 'desc'), limit(3));
        const rcaSnap = await getDocs(rcaQuery);

        let response = '📚 **Lessons Learned & Root Cause Analysis**\n\n';

        if (!lessonsSnap.empty) {
          response += '**Recent Lessons Learned:**\n';
          lessonsSnap.docs.forEach((doc, index) => {
            const data = doc.data() as any;
            const createdAt = data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown';
            response += `${index + 1}. ${createdAt}: ${data.form?.title || 'Untitled'}\n`;
          });
          response += '\n';
        }

        if (!rcaSnap.empty) {
          response += '**Recent RCA Records:**\n';
          rcaSnap.docs.forEach((doc, index) => {
            const data = doc.data() as any;
            const createdAt = data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown';
            response += `${index + 1}. ${createdAt}: ${data.form?.incidentTitle || 'Untitled'}\n`;
          });
        }

        if (lessonsSnap.empty && rcaSnap.empty) {
          response = 'No lessons learned or RCA records found in this workspace.';
        }

        appendMessages({ sender: 'ai', text: response });
      } catch (error) {
        console.error('Error fetching lessons learned/RCA:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the lessons learned and RCA information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle open policy
    if (intent.type === 'open_policy') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Opening policy...' }]);
      setInput('');
      setIsTyping(true);
      try {
        // Navigate to policies page and open specific policy
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          // Persist the requested policy name so the policies page can open it after navigation
          try {
            if (window.sessionStorage) {
              window.sessionStorage.setItem('docuflow.pendingPolicy', String(intent.specificPolicy || ''));
            }
          } catch (e) {
            // ignore storage errors
          }

          // First navigate to policies page
          window.dispatchEvent(new CustomEvent('navigate-to-policies'));
          // Small delay to ensure page loads, then open specific policy
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-specific-policy', { detail: { policyName: intent.specificPolicy } }));
          }, 500);
        }
        appendMessages({ sender: 'ai', text: `I've opened the policies page and navigated to the "${intent.specificPolicy || 'requested'}" policy.` });
      } catch (error) {
        console.error('Error opening policy:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t open the policy. Please go to the Policies section manually.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle folder creation (existing)
    if (intent.type === 'folder_creation') {
  appendMessages({ sender: 'user', text: input });
      setInput('');
      setIsTyping(true);
      try {
        if (typeof onFolderAdd === 'function') {
          const folderName = intent.folderName || 'Untitled Folder';
          onFolderAdd(folderName);
          setMessages(prev => [...prev, { sender: 'ai', text: `Creating a new folder named "${folderName}"...` }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I can't create folders in this context.` }]);
        }
      } catch (e) {
        setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, something went wrong while creating the folder.` }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    try {
      let result;
      // Contextual memory: check for follow-up queries using pronouns or references
      const followUpPatterns = [/\b(it|this|that|the document|the policy|the file|its|their|them|those)\b/i];
      let usedContextDoc: Document | null = null;
      if (
        intent.type === 'general_query' &&
        lastContext &&
        followUpPatterns.some((pat) => pat.test(userInput)) &&
        lastContext.doc
      ) {
        // Use last discussed document as context
        usedContextDoc = lastContext.doc;
      }

      // If the chat was opened while viewing a specific document we previously
      // always used that document as the context. However, when the user query
      // is an explicit document/file search (e.g. "Show me the COSHH Policy" or
      // a filename) we should perform a workspace search instead of assuming the
      // current selected document is the intended target. Only use the
      // selectedItem document when the intent is NOT a document/file search.
      if (!usedContextDoc && selectedItem.type === 'document' && intent.type !== 'document_search' && intent.type !== 'file_search') {
        const workspaceContextStr = buildWorkspaceContext({ entryPoint: 'selected_document' });
        const relatedDocumentsStr = serializeForAI([documentToAiContext(selectedItem)]);
        const extraContextStr = serializeForAI({
          source: 'selected_document_chat',
          createdAt: selectedItem.createdAt,
          renewalDate: (selectedItem as any)?.renewalDate ?? null,
        });

        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(selectedItem.extractedJson || {}),
          workspaceContext: workspaceContextStr,
          relatedDocumentsJson: relatedDocumentsStr,
          extraContext: extraContextStr,
        });

        const createdDate = formatDateSafe(selectedItem.createdAt);
        const documentCard = {
          id: selectedItem.id,
          name: selectedItem.name,
          status: 'current' as const,
          url: `/documents/${selectedItem.id}`,
          subtitle: createdDate ? `Created: ${createdDate}` : undefined,
          regulations: (selectedItem as Document).regulations,
        };

        appendMessages({ sender: 'ai', text: result.answer, documents: [documentCard] });
        
        setLastContext({ doc: selectedItem });
        setIsTyping(false);
        return;
      }

      // If selectedItem is a folder and no specific document context, use folder chat
      if (!usedContextDoc && selectedItem.type === 'folder' && intent.type === 'general_query') {
        try {
          const folderDocs = getAllDocuments([selectedItem]);
          const workspaceContextStr = buildWorkspaceContext({
            entryPoint: 'folder_general_query',
            folderId: (selectedItem as any)?.id ?? null,
            folderName: (selectedItem as any)?.name ?? null,
            documentCount: folderDocs.length,
          });
          const extraContextStr = serializeForAI({
            query: userInput,
            folderId: (selectedItem as any)?.id ?? null,
          });
          result = await chatWithFolder({
            query: userInput,
            documentsJson: JSON.stringify(folderDocs),
            workspaceContext: workspaceContextStr,
            extraContext: extraContextStr,
          });
          appendMessages({ sender: 'ai', text: result.answer });
          setIsTyping(false);
          return;
        } catch (folderError) {
          console.warn('Folder chat failed, falling back to document search', folderError);
          // Fall through to document search
        }
      }

      // At this point selectedItem is a folder/workspace
      const shouldSearchNewDocument = intent.type === 'document_search' || intent.type === 'file_search' || !activeDoc;

      if ((activeDoc && !shouldSearchNewDocument) || usedContextDoc) {
        const docToUse = usedContextDoc || activeDoc;
        const workspaceContextStr = buildWorkspaceContext({
          entryPoint: usedContextDoc ? 'follow_up_document' : 'active_document',
          referenceDocumentId: docToUse?.id ?? null,
        });
        const relatedDocumentsStr = serializeForAI(docToUse ? [documentToAiContext(docToUse)] : []);
        const extraContextStr = serializeForAI({
          source: usedContextDoc ? 'follow_up' : 'active_document',
          query: userInput,
        });

        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(docToUse?.extractedJson || {}),
          workspaceContext: workspaceContextStr,
          relatedDocumentsJson: relatedDocumentsStr,
          extraContext: extraContextStr,
        });

        const activeCreated = formatDateSafe(docToUse?.createdAt);
        const documentCard = {
          id: docToUse?.id,
          name: docToUse?.name,
          status: 'current' as const,
          url: `/documents/${docToUse?.id}`,
          subtitle: docToUse?.folderId ? `Folder: ${docToUse?.folderId}` : (activeCreated ? `Created: ${activeCreated}` : undefined),
          regulations: docToUse?.regulations,
        };

        appendMessages({ sender: 'ai', text: result.answer, documents: [{ ...documentCard, id: documentCard.id || '', name: documentCard.name || 'Untitled' }] });
        setLastContext({ doc: docToUse! });
        setIsTyping(false);
        return;
      }

      // Search the workspace for relevant documents
      const workspaceId = selectedItem.workspaceId;
      if (!workspaceId) {
        setMessages([...newMessages, { sender: 'ai', text: 'Workspace ID not found for this folder.' }]);
        setIsTyping(false);
        return;
      }

      const searchQuery = intent.type === 'document_search' || intent.type === 'file_search'
        ? (intent.searchTerm || intent.fileName || userInput)
        : userInput;

      // Fast client-side search in the selected folder's nested documents
      let clientResults: Document[] = [];
      try {
        if (selectedItem && selectedItem.type === 'folder') {
          const allDocs = getAllDocuments([selectedItem]);
          // Use Fuse.js for flexible fuzzy matching. We weight name higher than tags and summary.
          const fuse = new Fuse(allDocs, {
            keys: [
              { name: 'name', weight: 0.5 },
              { name: 'tags', weight: 0.3 },
              { name: 'summary', weight: 0.2 }
            ],
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
          });

          const fuseRes = fuse.search(searchQuery || '');
          clientResults = fuseRes.map(r => r.item as Document);
        }
      } catch (err) {
        clientResults = [];
      }

      if (clientResults && clientResults.length > 0) {
        const bestDoc = clientResults[0];
        setActiveDoc(bestDoc);
        setLastContext({ doc: bestDoc });

        // If the user explicitly asked to open/view the document, navigate/open it instead of running the chat
        if (intent.openDocument) {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestDoc.id, documentName: bestDoc.name } })); } catch (e) {}
            try { localStorage.setItem('lastHighlightedDocumentId', bestDoc.id); localStorage.setItem('lastHighlightedDocumentName', bestDoc.name); } catch (e) {}
            setTimeout(() => {
              try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestDoc.id } })); } catch (e) {}
            }, 150);
          }

    appendMessages({ sender: 'ai', text: `Opening "${bestDoc.name}" for you.`, documents: [{ id: bestDoc.id, name: bestDoc.name, url: `/documents/${bestDoc.id}`, regulations: bestDoc.regulations }] });
          setIsTyping(false);
          return;
        }

        const workspaceContextStr = buildWorkspaceContext({
          entryPoint: 'client_search',
          searchSource: 'client',
          clientResultCount: clientResults.length,
        });
        const relatedDocumentsStr = serializeForAI(clientResults.slice(0, 5).map(documentToAiContext));
        const extraContextStr = serializeForAI({
          searchTerm: searchQuery,
          matchedDocumentId: bestDoc.id,
        });

        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(bestDoc.extractedJson || {}),
          workspaceContext: workspaceContextStr,
          relatedDocumentsJson: relatedDocumentsStr,
          extraContext: extraContextStr,
        });
        const documentCard = {
          id: bestDoc.id,
          name: bestDoc.name,
          status: 'current' as const,
          url: `/documents/${bestDoc.id}`,
          subtitle: bestDoc.folderId ? `Folder: ${bestDoc.folderId}` : undefined,
          regulations: bestDoc.regulations,
        };

        // If the user explicitly asked to open the document we navigate; otherwise only highlight
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { localStorage.setItem('lastHighlightedDocumentId', bestDoc.id); localStorage.setItem('lastHighlightedDocumentName', bestDoc.name); } catch (e) {}
          if (intent.openDocument) {
            try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestDoc.id, documentName: bestDoc.name } })); } catch (e) {}
          }
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestDoc.id } })); } catch (e) {}
          }, 150);
        }

        setMessages([
          ...newMessages,
          {
            sender: 'ai',
            text: result.answer,
            documents: [documentCard]
          },
        ]);
        setIsTyping(false);
        return;
      }

      // Fall back to server search for policies
      const searchRes = await fetch('/api/policies/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, query: searchQuery }),
      });

      if (!searchRes.ok) {
        setMessages([...newMessages, { sender: 'ai', text: 'Failed to search for relevant documents.' }]);
        setIsTyping(false);
        return;
      }

      const { results, bestMatch } = await searchRes.json();
      if (!results || results.length === 0 || !bestMatch) {
        let noResultsMessage = 'No relevant documents found in this workspace.';
        if (intent.type === 'document_search') {
          noResultsMessage = `I couldn't find any documents related to "${intent.searchTerm}". Please try a different search term or check if the document exists in this workspace.`;
        } else if (intent.type === 'file_search') {
          noResultsMessage = `I couldn't find the file "${intent.fileName}". Please check the filename and try again.`;
        }
        setMessages([...newMessages, { sender: 'ai', text: noResultsMessage }]);
        setIsTyping(false);
        return;
      }

  const bestDoc = bestMatch;
  setActiveDoc(bestDoc);
  setLastContext({ doc: bestDoc });

      // If the user asked to open/view the document, navigate/open the best match and return
      if (intent.openDocument) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.id, documentName: bestMatch.name } })); } catch (e) {}
          try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.id); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.id } })); } catch (e) {}
          }, 150);
        }

        setMessages(prev => [...prev, { sender: 'ai', text: `Opening "${bestMatch.name}" for you.`, documents: [{ id: bestMatch.id, name: bestMatch.name, url: `/documents/${bestMatch.id}` }] }]);
        setIsTyping(false);
        return;
      }

      const workspaceContextStr = buildWorkspaceContext({
        entryPoint: 'server_search',
        searchSource: 'server',
        totalMatches: Array.isArray(results) ? results.length : undefined,
      });
      const relatedDocumentsStr = serializeForAI(
        Array.isArray(results)
          ? (results as Document[]).slice(0, 5).map((doc) => documentToAiContext(doc))
          : []
      );
      const extraContextStr = serializeForAI({
        searchTerm: searchQuery,
        matchedDocumentId: bestDoc.id,
      });

      result = await chatWithDocuments({
        query: userInput,
        documentJson: JSON.stringify(bestDoc.extractedJson || {}),
        workspaceContext: workspaceContextStr,
        relatedDocumentsJson: relatedDocumentsStr,
        extraContext: extraContextStr,
      });

      // If the user explicitly asked to open the document we navigate; otherwise only highlight
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.id); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
        if (intent.openDocument) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.id, documentName: bestMatch.name } })); } catch (e) {}
        }
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.id } })); } catch (e) {}
        }, 150);
      }

      const documentCards = results.slice(0, 3).map((doc: any) => {
        const created = formatDateSafe(doc.createdAt);
        const lastReviewed = doc.lastReviewed || created || '';
        const nextReview = doc.nextReviewRequired || (doc.renewalDate ? `by ${formatDateSafe(doc.renewalDate)}` : '');
        return {
          id: doc.id,
          name: doc.name,
          status: doc.status || (doc.renewalDate ? (new Date(doc.renewalDate) < new Date() ? 'overdue' : new Date(doc.renewalDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) ? 'due-soon' : 'current') : 'current'),
          statusText: doc.statusText,
          subtitle: doc.subtitle || (created ? `Created: ${created}` : undefined),
          url: doc.url || `/documents/${doc.id}`,
          lastReviewed: lastReviewed || undefined,
          nextReviewRequired: nextReview || undefined,
          summary: doc.summary,
          regulations: doc.regulations,
        };
      });

      let responsePrefix = '';
      if (intent.type === 'document_search') {
        responsePrefix = `I found information about "${intent.searchTerm}". `;
      } else if (intent.type === 'file_search') {
        responsePrefix = `Here's the information from "${intent.fileName}". `;
      }

        interface ServerSearchResult {
          id: string;
          name: string;
          status?: 'current' | 'due-soon' | 'overdue' | 'updated';
          statusText?: string;
          subtitle?: string;
          url?: string;
          lastReviewed?: string;
          nextReviewRequired?: string;
          renewalDate?: string | Date;
          createdAt?: string | Date;
          summary?: string;
          regulations?: CqcRegulationMatch[];
        }

        interface DocumentCardData {
          id: string;
          name: string;
          status?: 'current' | 'due-soon' | 'overdue' | 'updated';
          statusText?: string;
          subtitle?: string;
          url?: string;
          lastReviewed?: string;
          nextReviewRequired?: string;
          summary?: string;
          regulations?: CqcRegulationMatch[];
        }

        appendMessages({ sender: 'ai', text: responsePrefix + (result.answer as string), documents: (documentCards as DocumentCardData[]).map((doc: DocumentCardData) => ({ ...doc, id: doc.id || '', name: doc.name || 'Untitled' })) });

    } catch (error: any) {
      console.error("Error chatting:", error);
      let errorMessage = "Failed to get an answer from the AI. Please try again.";
      if (error.message && (error.message.includes('503') || error.message.includes('overloaded'))) {
        errorMessage = "The AI is currently busy, please try again in a moment.";
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
  // remove last user message (failed to get AI response)
  messagesRef.current = messagesRef.current.slice(0, -1);
  setMessages(messagesRef.current);
      setInput(userInput);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render a chat message. Declared inside the component so it can access
  // handlers like toast and window events.
  const renderMessage = (message: ChatMessage) => {
    return (
      <div>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
        
        {/* Document cards */}
        {message.documents && message.documents.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.documents.map((doc) => (
              <div key={doc.id} className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <DocumentCard
                      id={doc.id}
                      name={String(doc.name || 'Untitled')}
                      status={(doc.status as any) || 'current'}
                      statusText={doc.statusText}
                      subtitle={doc.subtitle}
                      summary={doc.summary}
                      url={doc.url}
                      onClick={() => onOpenDocument(doc)}
                      lastReviewed={doc.lastReviewed}
                      nextReviewRequired={doc.nextReviewRequired}
                    />

                    {doc.regulations && doc.regulations.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {doc.regulations.slice(0, 6).map((reg) => (
                            <a
                              key={`${doc.id}-${reg.code}`}
                              href={reg.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              aria-label={`View guidance for Regulation ${reg.code}`}
                            >
                              View guidance
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 sm:pt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="ghost" className="whitespace-nowrap">
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <Command>
                          <CommandInput placeholder="Search teams..." onValueChange={(v: any) => setTeamFilter(String(v || ''))} />
                          <CommandList>
                            {teams.filter(t => t.name.toLowerCase().includes(teamFilter.toLowerCase())).length === 0 && <CommandEmpty>No teams found</CommandEmpty>}
                            <CommandGroup heading="Teams">
                              {teams
                                .filter(t => t.name.toLowerCase().includes(teamFilter.toLowerCase()))
                                .map((team) => (
                                  <CommandItem key={team.id} onSelect={() => handleShareToTeam(team.id, doc)}>
                                    {team.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Regulation card */}
        {message.regulation && (
          <div className="mt-3 flex">
            <a href={message.regulation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50">
              View guidance
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Audits */}
        {message.audits && message.audits.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.audits.map((a) => (
              <div key={a.auditType} className="flex items-center justify-between bg-gray-50 border border-gray-100 p-3 rounded-md">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{a.name || (a.auditType ? a.auditType.replace(/-/g, ' ') : 'Unnamed audit')}</div>
                  {(a.scorePercent !== null && a.scorePercent !== undefined) && (
                    <div className="text-xs text-gray-500 mt-1">Latest score: {a.scorePercent}%{a.snapshotCreatedAt ? ` • ${formatDateSafe(a.snapshotCreatedAt)}` : ''}</div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4 flex items-center gap-2">
                  {a.downloadUrl ? (
                    <Button size="sm" variant="outline" onClick={() => { window.open(a.downloadUrl || '', '_blank'); }}>
                      Download
                    </Button>
                  ) : a.isCompletedThisMonth ? (
                    <Button size="sm" variant="outline" onClick={() => {
                      if (typeof window !== 'undefined' && window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('navigate-to-audits'));
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('open-specific-audit', { detail: { auditType: a.auditType } }));
                        }, 300);
                      }
                    }}>
                      View audit
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (typeof window !== 'undefined' && window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('navigate-to-audits', { detail: { auditType: a.auditType } }));
                      }
                    }}>
                      <Plus className="w-4 h-4 mr-1" /> Complete audit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User cards */}
        {message.users && message.users.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.users.map((user) => (
              <UserCard
                    key={user.id}
                    id={user.id}
                    name={String(user.name || 'Unknown')}
                    email={user.email}
                    role={user.role}
                    avatarUrl={user.avatarUrl}
                    createdAt={user.createdAt}
                    onClick={() => handleUserCardClick(user)}
                  />
            ))}
          </div>
        )}

        {/* Team cards */}
        {message.teams && message.teams.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.teams.map((team) => (
              <TeamCard
                key={team.id}
                id={team.id}
                name={team.name}
                memberCount={team.memberCount}
                description={team.description}
                onClick={() => handleTeamCardClick(team)}
              />
            ))}
          </div>
        )}

        {/* Action cards */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.actions.map((action) => (
              <ActionCard
                key={action.id}
                id={action.id}
                title={String(action.title || 'Untitled')}
                description={action.description}
                status={(action.status as any) || 'pending'}
                dueDate={action.dueDate}
                priority={(action.priority as any) || 'medium'}
                onClick={() => handleActionCardClick(action)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Action handlers for document actions
  const onOpenDocument = (doc: { id?: string; name?: string; url?: string }) => {
    const documentId = doc.id || (doc.name || '').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: doc.name } }));
        localStorage.setItem('lastHighlightedDocumentId', documentId);
        if (doc.name) localStorage.setItem('lastHighlightedDocumentName', doc.name);
        setTimeout(() => { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId } })); }, 150);
      }
    } catch (e) {}
    toast({ title: 'Opened document', description: doc.name || documentId });
  };

  // Reminder functionality removed from UI; keep placeholder if needed later
  // Teams state for sharing
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [teamFilter, setTeamFilter] = useState('');

  // Users state for user cards
  const [users, setUsers] = useState<Array<{ id: string; name: string; email?: string; role?: string; avatarUrl?: string; createdAt?: string }>>([]);
  const [userFilter, setUserFilter] = useState('');

  // Actions state for action cards
  const [actions, setActions] = useState<Array<{ id: string; title: string; description?: string; status?: 'pending' | 'completed' | 'overdue'; dueDate?: string; priority?: 'low' | 'medium' | 'high' }>>([]);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    // Fetch teams from Firestore for the current workspace
    let cancelled = false;
    (async () => {
      try {
        if (!selectedItem || !selectedItem.workspaceId) {
          setTeams([]);
          return;
        }
  // Use a simple approach to fetch teams from Firestore (similar to TeamsView)
  const { collection, getDocs } = await import('firebase/firestore');
        // Prefer organisation-scoped workspace teams path to respect security rules.
        const wsId = selectedItem.workspaceId;
        const orgId = organisationId || null;
        const teamsCol = collection(db, workspaceCollectionPath(wsId, 'teams', orgId));
        const snapshot = await getDocs(teamsCol);
        const fetched = snapshot.docs.map(d => ({ id: d.id, name: (d.data() as any)?.name ?? 'Untitled Team' }));
        if (!cancelled) setTeams(fetched);
      } catch (e) {
        console.error('Failed to fetch teams for share popover', e);
        if (!cancelled) setTeams([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedItem?.workspaceId, organisationId]);

  // Listen for policy opening events to set active document context
  useEffect(() => {
    // On mount, try to restore active document persisted in sessionStorage
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem('docuflow.activeDocument');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.extractedJson) {
            setActiveDoc(parsed);
            setLastContext({ doc: parsed });
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const handleSetActiveDocument = (event: CustomEvent) => {
      const { documentId, documentName, documentData } = event.detail;
      try {
        if (documentData) {
          // Set the active document for chat interactions
          setActiveDoc(documentData);
          setLastContext({ doc: documentData });
        } else {
          // Debug logging removed: set-active-document received with empty documentData
        }
      } catch (e) {
        console.error('[ChatPanel] Error handling set-active-document', e);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('set-active-document', handleSetActiveDocument as EventListener);
      return () => window.removeEventListener('set-active-document', handleSetActiveDocument as EventListener);
    }
  }, []);

  const handleShareToTeam = async (teamId: string, doc: { id?: string; name?: string; url?: string }) => {
    const documentUrl = doc.url || (doc.id ? `${typeof window !== 'undefined' ? window.location.origin : ''}/documents/${doc.id}` : window.location.href);
    try {
      // Build a simple email body to send to the backend
      const teamObj = teams.find(t => t.id === teamId);
      const sharerName = (user && (user.name || user.email)) || 'A colleague';
      const subject = `Document shared: ${doc.name || 'Untitled'}`;
      const emailBody = `Hi ${teamObj?.name || 'team'},\n\n${sharerName} has shared a document with your team.\n\nDocument: ${doc.name || 'Untitled'}\nLink: ${documentUrl}\n\nRegards,\nYour Docs`;

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, url: documentUrl, name: doc.name, subject, emailBody }),
      });
      if (res.ok) {
        toast({ title: 'Shared', description: `Document sent to team.` });
        return;
      }
      // If server returned error, try clipboard fallback
      throw new Error('Share failed');
    } catch (e) {
      try {
        await navigator.clipboard.writeText(documentUrl);
        toast({ title: 'Link copied', description: 'Document link copied to clipboard (share fallback)' });
      } catch (err) {
        toast({ title: 'Unable to share', description: 'Could not share or copy the document link.' });
      }
    }
  };

  const handleUserCardClick = (user: { id?: string; name?: string; email?: string }) => {
    if (user.id) {
      // Navigate to user profile or open user modal
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('open-user-profile', { detail: { userId: user.id, userName: user.name } }));
      }
      toast({ title: 'User Profile', description: `Opening profile for ${user.name || user.email || 'user'}` });
    }
  };

  const handleTeamCardClick = (team: { id?: string; name?: string }) => {
    if (team.id) {
      // Navigate to team page or open team modal
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('open-team-details', { detail: { teamId: team.id, teamName: team.name } }));
      }
      toast({ title: 'Team Details', description: `Opening details for ${team.name || 'team'}` });
    }
  };

  const handleActionCardClick = (action: { id?: string; title?: string }) => {
    if (action.id) {
      // Navigate to action plans page or open action modal
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('open-action-details', { detail: { actionId: action.id, actionTitle: action.title } }));
      }
      toast({ title: 'Action Details', description: `Opening details for ${action.title || 'action'}` });
    }
  };

  const handleRegulationFollowUp = (regulation: CqcRegulationMatch, documentName?: string) => {
    const prompt = `Explain how Regulation ${regulation.code} (${regulation.title}) applies to the "${documentName || 'policy'}" policy.`;
    setInput(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const onShareDocument = (doc: { id?: string; name?: string; url?: string }) => {
    // This function is intentionally left to be used as a trigger that opens the Popover.
    // Actual share occurs when selecting a team in the Popover.
    // Keep for compatibility with existing callers.
    toast({ title: 'Share', description: 'Choose a team to share with.' });
  };


  return (
    <div className="flex flex-col h-full bg-background rounded-lg overflow-hidden border border-blue-200/50 shadow-lg">
      {/* Header matching the Doc design */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-blue-200">
            <AvatarImage src={profilePicture || '/Neurodiversity_Symbol.png'} alt="CareBot AI" />
            <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">Doc - Document Assistant</h3>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30" ref={scrollAreaRef}>
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center text-gray-600">
            <Avatar className="w-16 h-16 border-2 border-blue-200 mb-4">
              <AvatarImage src={profilePicture || '/Neurodiversity_Symbol.png'} alt="CareBot AI" />
              <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
            </Avatar>
            <h4 className="text-lg font-semibold text-gray-800">Doc - Document Assistant</h4>
            <p className="mt-2 text-sm max-w-[60%]">Ask a question about your policies or documents. Try one of the suggested prompts below to get started.</p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me advanced analytics'); setTimeout(() => handleSend(), 60); }}>
                Show advanced analytics
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Performance metrics analysis'); setTimeout(() => handleSend(), 60); }}>
                Performance analysis
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Predictive insights report'); setTimeout(() => handleSend(), 60); }}>
                Predictive insights
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Risk assessment analysis'); setTimeout(() => handleSend(), 60); }}>
                Risk assessment
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Benchmark comparison'); setTimeout(() => handleSend(), 60); }}>
                Benchmark comparison
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me action plans'); setTimeout(() => handleSend(), 60); }}>
                Show action plans
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('What is my rota this week?'); setTimeout(() => handleSend(), 60); }}>
                Show my rota
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show lessons learned'); setTimeout(() => handleSend(), 60); }}>
                Lessons learned
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Create audit reminders workflow'); setTimeout(() => handleSend(), 60); }}>
                Create audit workflow
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me my workflows'); setTimeout(() => handleSend(), 60); }}>
                Show workflows
              </Button>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? 'justify-end' : '')}>
              {message.sender === 'ai' && (
                <Avatar className="w-10 h-10 border-2 border-blue-200">
                  <AvatarImage src={profilePicture || mockUser.avatarUrl || '/Neurodiversity_Symbol.png'} alt={mockUser.name || undefined} />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                  "max-w-[75%] min-w-0 rounded-2xl p-4 text-sm shadow-sm",
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
                    : 'bg-white border border-gray-200'
              )}>
                {message.sender === 'ai' ? renderMessage(message) : (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                )}
              </div>
               {message.sender === 'user' && (
                <Avatar className="w-10 h-10 border-2 border-blue-200">
                  <AvatarImage src={profilePicture || mockUser.avatarUrl || undefined} alt={mockUser.name || undefined} />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">
                    {mockUser.name ? mockUser.name.charAt(0) : '?'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
         {isTyping && (
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 border-2 border-blue-200">
              <AvatarImage src={profilePicture || '/Neurodiversity_Symbol.png'} alt="AI" />
              <AvatarFallback className="bg-blue-500 text-white text-sm font-semibold">AI</AvatarFallback>
            </Avatar>
            <div className="max-w-[75%] rounded-2xl p-4 text-sm bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-white shrink-0">
        <div className="relative">
          <Textarea
            placeholder="Ask me anything... 'Show advanced analytics', 'Performance analysis', 'Predictive insights', 'Risk assessment', 'Benchmark comparison', 'Show action plans', 'What is my rota?', 'Show lessons learned', 'Create audit workflow', 'Show workflows'..."
            className="w-full resize-none pr-12 min-h-[48px] border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-300 transition-colors"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isTyping}
            rows={1}
            ref={inputRef}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost" 
              onClick={handleSend} 
              disabled={isTyping || !input.trim()}
              className="hover:bg-blue-50 text-blue-600"
            >
              <CornerDownLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

