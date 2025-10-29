import { MAX_AI_STRING_FIELD, MAX_AI_CONTEXT_LENGTH, MAX_AI_ARRAY_ITEMS, MAX_AI_OBJECT_KEYS, MAX_AI_DEPTH, DEPENDENCY_LEVEL_SYNONYMS, AUDIT_NAME_MAP, AUDIT_SLUG_SYNONYMS, type DependencyLatest } from './types';
import type { Document } from "@/lib/types";
import type { CqcRegulationMatch } from '@/lib/cqc-regulations';
import { chatWithDocuments } from '@/ai/flows/chat-with-documents';

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

const REGULATION_MESSAGE_TEMPLATE = (detail: CqcRegulationMatch, summary?: string) => {
  const heading = detail.label || (detail.code ? `Regulation ${detail.code}` : 'CQC Guidance');
  const body = (summary ?? detail.summary ?? '').trim();
  const urlLine = detail.url ? `Source: ${detail.url}` : '';
  return [heading, body, urlLine].filter(Boolean).join('\n\n');
};

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
  ];
  for (const key of candidateKeys) {
    const val = latest[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
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

const extractAuditHighlightLines = (latest: any): string[] => {
  if (!latest || typeof latest !== 'object') return [];
  const lines: string[] = [];
  const addLine = (label: string, value: any) => {
    if (typeof value === 'string' && value.trim()) {
      lines.push(`${label}${label.endsWith(':') ? '' : ':'} ${value.trim()}`);
    }
  };
  addLine('Comments', latest.comments);
  addLine('Summary', latest.summary ?? latest.meta?.summary);
  addLine('Areas for Improvement', latest.areasForImprovement);
  addLine('Good Practice', latest.goodPractice);
  addLine('Action Required', latest.actionRequired);
  return lines;
};

const formatAuditName = (auditType: string): string => {
  return auditType
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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

export {
  clipString,
  summariseExtractedJson,
  documentToAiContext,
  REGULATION_MESSAGE_TEMPLATE,
  clampForAI,
  serializeForAI,
  serializeJsonForAI,
  askAIWithWorkspaceData,
  formatDateSafe,
  extractCompletedBy,
  resolveAuditTypeFromName,
  formatAuditName,
  extractAuditHighlightLines,
  buildDependencyQuickAnswer,
};