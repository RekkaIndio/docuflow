import { StandardPdfBuilder, StandardPdfMetaItem } from '@/lib/pdf/standard-layout';
import { format, parseISO } from 'date-fns';

export type TriState = boolean | null | undefined;

export type LinkedActions = Array<{ action: string; owner: string; timescale: string; status: string }>;

export type LessonsRecordDetailForPdf = {
  id: string;
  form?: Record<string, any>;
  actions?: LinkedActions;
  createdAt?: string | null;
  recordType?: string;
};

export type RcaRecordDetailForPdf = {
  id: string;
  form?: Record<string, any>;
  actions?: LinkedActions;
  createdAt?: string | null;
  recordType?: string;
};

export type SovaLogDetailForPdf = {
  id: string;
  runningLogNumber: number;
  incidentDate?: string;
  dateSovaRaised?: string;
  dateClosed?: string;
  incidentDetails?: string;
  dutyOfCandourUpheld?: TriState;
  investigationComplete?: TriState;
  lessonsLearntComplete?: TriState;
  rootCauseAnalysisComplete?: TriState;
  outcome?: string;
  createdAt?: string | null;
};

export type CqcLogDetailForPdf = {
  id: string;
  runningLogNumber: number;
  uniqueReferenceNumber?: string;
  incidentDate?: string;
  cqcNotificationDate?: string;
  dateClosed?: string;
  incidentDetails?: string;
  dutyOfCandourUpheld?: TriState;
  investigationComplete?: TriState;
  lessonsLearntComplete?: TriState;
  rootCauseAnalysisComplete?: TriState;
  sovaCompleted?: TriState;
  outcome?: string;
  createdAt?: string | null;
};

export type SafeguardingLogForPdf = {
  runningLogNumber: number;
  residentName?: string;
  incidentDate?: string;
  dateSovaRaised?: string;
  dateClosed?: string;
  createdAt?: string | null;
  incidentDetails?: string;
  outcome?: string;
  sovaComments?: string;
  dutyOfCandourUpheld?: TriState;
  investigationComplete?: TriState;
  cqcNotificationSubmitted?: TriState;
  lessonsLearntComplete?: TriState;
  rootCauseAnalysisComplete?: TriState;
  lessonsLearntRecordId?: string | null;
  rootCauseAnalysisRecordId?: string | null;
  linkedCqcLogId?: string | null;
};

export type CqcLogForPdf = {
  runningLogNumber: number;
  uniqueReferenceNumber?: string;
  residentName?: string;
  cqcNotificationDate?: string;
  incidentDate?: string;
  dateClosed?: string;
  createdAt?: string | null;
  incidentDetails?: string;
  outcome?: string;
  sovaComments?: string;
  cqcAcknowledgementReceived?: TriState;
  dutyOfCandourUpheld?: TriState;
  investigationComplete?: TriState;
  lessonsLearntComplete?: TriState;
  rootCauseAnalysisComplete?: TriState;
  sovaCompleted?: TriState;
  lessonsLearntRecordId?: string | null;
  rootCauseAnalysisRecordId?: string | null;
  linkedSovaLogId?: string | null;
};

export type SafeguardingPdfParams = {
  entry: SafeguardingLogForPdf;
  workspaceName?: string;
  generatedAt?: Date;
  lessonsLabel?: string;
  rcaLabel?: string;
  cqcLabel?: string;
  lessonsDetail?: LessonsRecordDetailForPdf | null;
  rcaDetail?: RcaRecordDetailForPdf | null;
  cqcDetail?: CqcLogDetailForPdf | null;
};

export type CqcPdfParams = {
  entry: CqcLogForPdf;
  workspaceName?: string;
  generatedAt?: Date;
  lessonsLabel?: string;
  rcaLabel?: string;
  sovaLabel?: string;
  lessonsDetail?: LessonsRecordDetailForPdf | null;
  rcaDetail?: RcaRecordDetailForPdf | null;
  sovaDetail?: SovaLogDetailForPdf | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return undefined;
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch (error) {
    const fallback = new Date(value);
    if (!Number.isNaN(fallback.getTime())) {
      return format(fallback, 'dd MMM yyyy');
    }
    return value;
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return undefined;
  try {
    return format(parseISO(value), 'dd MMM yyyy • HH:mm');
  } catch (error) {
    const fallback = new Date(value);
    if (!Number.isNaN(fallback.getTime())) {
      return format(fallback, 'dd MMM yyyy • HH:mm');
    }
    return value;
  }
};

const formatGeneratedAt = (value?: Date) => {
  const date = value ?? new Date();
  return format(date, 'dd MMM yyyy • HH:mm');
};

const toStatusLabel = (value: TriState) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not recorded';
};

const toChip = (value: TriState) => {
  if (value === true) return 'yes' as const;
  if (value === false) return 'no' as const;
  return undefined;
};

const addStatusBlock = (builder: StandardPdfBuilder, items: Array<{ label: string; value: TriState }>, options?: { asSubsection?: boolean }) => {
  if (!items.length) return;
  if (options?.asSubsection) {
    builder.addSubheading('Status overview', { accent: true, marginTop: 12 });
  } else {
    builder.addSection('Status overview');
  }
  items.forEach((item) => {
    builder.addField(item.label, toStatusLabel(item.value), toChip(item.value) ? { chip: toChip(item.value) } : undefined);
  });
};

type LinkedRecordBase<TDetail> = {
  label: string;
  reference?: string | null;
  detail?: TDetail | null;
  fields?: StandardPdfMetaItem[];
};

type LinkedRecordOptions =
  | (LinkedRecordBase<LessonsRecordDetailForPdf> & { type: 'lessons'; actions?: LinkedActions })
  | (LinkedRecordBase<RcaRecordDetailForPdf> & { type: 'rca'; actions?: LinkedActions })
  | (LinkedRecordBase<SovaLogDetailForPdf> & { type: 'sova'; actions?: LinkedActions })
  | (LinkedRecordBase<CqcLogDetailForPdf> & { type: 'cqc' });

const addLinkedRecordSection = (
  builder: StandardPdfBuilder,
  options: LinkedRecordOptions,
) => {
  const { label, reference } = options;
  builder.addSection(label, { subtitle: reference ? `Reference ${reference}` : undefined });

  if (!options.detail) {
    builder.addParagraph('Linked record could not be loaded.');
    return;
  }

  if (options.fields && options.fields.length) {
    builder.addInfoGrid(options.fields.filter((item) => item.value));
  }

  if ('actions' in options && options.actions) {
    if (options.actions.length > 0) {
      builder.addSubheading('Actions');
      const bulletItems = options.actions.map((action, index) => {
        const title = action.action && action.action.trim().length > 0 ? action.action : `Action ${index + 1}`;
        const metaParts = [action.owner, action.timescale, action.status]
          .map((part) => (part && part.trim().length > 0 ? part : null))
          .filter((part): part is string => Boolean(part));
        return metaParts.length ? `${title} — ${metaParts.join(' • ')}` : title;
      });
      builder.addBulletList(bulletItems);
    } else {
      builder.addSubheading('Actions');
      builder.addParagraph('No actions recorded.');
    }
  }

  if (options.type === 'lessons' && options.detail && 'form' in options.detail) {
    const lessonsForm = options.detail.form ?? {};
    builder.addParagraph(lessonsForm.summaryOfEvents || lessonsForm.description || 'Summary not recorded.');
    if (lessonsForm.lessonsLearned) {
      builder.addSubheading('Lessons Learned');
      builder.addParagraph(lessonsForm.lessonsLearned);
    }
    const oversight = [lessonsForm.monitoring, lessonsForm.oversight].filter(Boolean).join('\n\n');
    if (oversight) {
      builder.addSubheading('Monitoring & Oversight');
      builder.addParagraph(oversight);
    }
  }

  if (options.type === 'rca' && options.detail && 'form' in options.detail) {
    const rcaForm = options.detail.form ?? {};
    builder.addParagraph(rcaForm.summary || 'Summary not recorded.');
    if (rcaForm.underlyingIssues) {
      builder.addSubheading('Underlying Issues');
      builder.addParagraph(rcaForm.underlyingIssues);
    }
    const lessons = [rcaForm.lessonsTakeaway, rcaForm.lessonsPrevention].filter(Boolean).join('\n\n');
    if (lessons) {
      builder.addSubheading('Lessons & Prevention');
      builder.addParagraph(lessons);
    }
  }

  if (options.type === 'sova' && options.detail) {
    const detail = options.detail;
    builder.addInfoGrid(
      [
        { label: 'Running log', value: detail.runningLogNumber ? `#${detail.runningLogNumber}` : undefined },
        { label: 'Incident date', value: formatDate(detail.incidentDate) },
        { label: 'Date SOVA raised', value: formatDate(detail.dateSovaRaised) },
        { label: 'Date closed', value: formatDate(detail.dateClosed) },
      ].filter((item) => item.value),
    );
    addStatusBlock(builder, [
      { label: 'Duty of candour upheld', value: detail.dutyOfCandourUpheld },
      { label: 'Investigation complete', value: detail.investigationComplete },
      { label: 'Lessons learnt complete', value: detail.lessonsLearntComplete },
      { label: 'Root cause analysis complete', value: detail.rootCauseAnalysisComplete },
    ], { asSubsection: true });
    if (detail.incidentDetails) {
      builder.addSubheading('Incident details');
      builder.addParagraph(detail.incidentDetails);
    }
    if (detail.outcome) {
      builder.addSubheading('Outcome');
      builder.addParagraph(detail.outcome);
    }
  }

  if (options.type === 'cqc' && options.detail) {
    const detail = options.detail;
    builder.addInfoGrid(
      [
        { label: 'Running log', value: detail.runningLogNumber ? `#${detail.runningLogNumber}` : undefined },
        { label: 'Unique reference', value: detail.uniqueReferenceNumber },
        { label: 'Incident date', value: formatDate(detail.incidentDate) },
        { label: 'Notification date', value: formatDate(detail.cqcNotificationDate) },
        { label: 'Date closed', value: formatDate(detail.dateClosed) },
      ].filter((item) => item.value),
    );
    addStatusBlock(builder, [
      { label: 'Duty of candour upheld', value: detail.dutyOfCandourUpheld },
      { label: 'Investigation complete', value: detail.investigationComplete },
      { label: 'Lessons learnt complete', value: detail.lessonsLearntComplete },
      { label: 'Root cause analysis complete', value: detail.rootCauseAnalysisComplete },
      { label: 'Safeguarding completed', value: detail.sovaCompleted },
    ], { asSubsection: true });
    if (detail.incidentDetails) {
      builder.addSubheading('Incident details');
      builder.addParagraph(detail.incidentDetails);
    }
    if (detail.outcome) {
      builder.addSubheading('Outcome');
      builder.addParagraph(detail.outcome);
    }
  }
};

const filterMeta = (items: StandardPdfMetaItem[]) => items.filter((item) => {
  if (item.value === null || item.value === undefined) return false;
  if (typeof item.value === 'string' && item.value.trim().length === 0) return false;
  return true;
});

export function generateSafeguardingLogPdf(params: SafeguardingPdfParams): Uint8Array {
  const { entry, workspaceName, lessonsLabel, rcaLabel, cqcLabel, lessonsDetail, rcaDetail, cqcDetail } = params;
  const generatedAt = formatGeneratedAt(params.generatedAt);

  const builder = new StandardPdfBuilder({
    title: 'Safeguarding (SOVA) Log',
    subtitle: entry.residentName ? `${entry.residentName} — Log #${entry.runningLogNumber}` : `Log #${entry.runningLogNumber}`,
    generatedAt,
    meta: filterMeta([
      { label: 'Organisation', value: workspaceName },
      { label: 'Running log', value: `#${entry.runningLogNumber}` },
      { label: 'Recorded', value: formatDateTime(entry.createdAt) },
      { label: 'Incident date', value: formatDate(entry.incidentDate) },
      { label: 'Date SOVA raised', value: formatDate(entry.dateSovaRaised) },
      { label: 'Date closed', value: formatDate(entry.dateClosed) },
    ]),
  });

  builder.doc.setProperties({
    title: `Safeguarding Log #${entry.runningLogNumber}`,
    subject: entry.residentName ? `Safeguarding log for ${entry.residentName}` : 'Safeguarding log export',
    author: workspaceName ?? 'Docuflow',
    creator: 'Docuflow',
  });

  addStatusBlock(builder, [
    { label: 'Duty of candour upheld', value: entry.dutyOfCandourUpheld },
    { label: 'Investigation complete', value: entry.investigationComplete },
    { label: 'CQC notification submitted', value: entry.cqcNotificationSubmitted },
    { label: 'Lessons learnt complete', value: entry.lessonsLearntComplete },
    { label: 'Root cause analysis complete', value: entry.rootCauseAnalysisComplete },
  ]);

  builder.addSection('Incident overview');
  builder.addField('Resident', entry.residentName ?? 'Not recorded');
  builder.addField('Incident details', entry.incidentDetails ?? 'Not recorded');
  builder.addField('Outcome', entry.outcome ?? 'Not recorded');
  if (entry.sovaComments) {
    builder.addField('SOVA comments', entry.sovaComments);
  }

  builder.addSection('Linked records');
  builder.addInfoGrid(
    filterMeta([
      { label: 'Lessons learned record', value: lessonsLabel },
      { label: 'Root cause analysis record', value: rcaLabel },
      { label: 'CQC notification log', value: cqcLabel },
    ]),
  );

  if (entry.lessonsLearntRecordId) {
    addLinkedRecordSection(builder, {
      label: 'Lessons learned record',
      reference: lessonsLabel,
      detail: lessonsDetail,
      type: 'lessons',
      actions: lessonsDetail?.actions,
      fields: filterMeta([
        { label: 'Event type', value: lessonsDetail?.form?.eventType },
        { label: 'Event date', value: formatDate(lessonsDetail?.form?.date) },
        { label: 'Location', value: lessonsDetail?.form?.location },
        { label: 'People involved', value: lessonsDetail?.form?.peopleInvolved },
      ]),
    });
  }

  if (entry.rootCauseAnalysisRecordId) {
    addLinkedRecordSection(builder, {
      label: 'Root cause analysis record',
      reference: rcaLabel,
      detail: rcaDetail,
      type: 'rca',
      actions: rcaDetail?.actions,
      fields: filterMeta([
        { label: 'Event type', value: rcaDetail?.form?.eventType },
        { label: 'Event date', value: formatDate(rcaDetail?.form?.date) },
        { label: 'Location', value: rcaDetail?.form?.location },
        { label: 'People involved', value: rcaDetail?.form?.peopleInvolved },
      ]),
    });
  }

  if (entry.linkedCqcLogId) {
    addLinkedRecordSection(builder, {
      label: 'CQC notification log',
      reference: cqcLabel,
      detail: cqcDetail,
      type: 'cqc',
      fields: [],
    });
  }

  builder.addFooter();
  return builder.doc.output('arraybuffer') as Uint8Array;
}

export function generateCqcLogPdf(params: CqcPdfParams): Uint8Array {
  const { entry, workspaceName, lessonsLabel, rcaLabel, sovaLabel, lessonsDetail, rcaDetail, sovaDetail } = params;
  const generatedAt = formatGeneratedAt(params.generatedAt);

  const builder = new StandardPdfBuilder({
    title: 'CQC Notification Log',
    subtitle: entry.residentName ? `${entry.residentName} — Log #${entry.runningLogNumber}` : `Log #${entry.runningLogNumber}`,
    generatedAt,
    meta: filterMeta([
      { label: 'Organisation', value: workspaceName },
      { label: 'Unique reference', value: entry.uniqueReferenceNumber },
      { label: 'Running log', value: `#${entry.runningLogNumber}` },
      { label: 'Recorded', value: formatDateTime(entry.createdAt) },
      { label: 'Incident date', value: formatDate(entry.incidentDate) },
      { label: 'Notification date', value: formatDate(entry.cqcNotificationDate) },
      { label: 'Date closed', value: formatDate(entry.dateClosed) },
    ]),
  });

  builder.doc.setProperties({
    title: `CQC Notification Log #${entry.runningLogNumber}`,
    subject: entry.residentName ? `CQC notification for ${entry.residentName}` : 'CQC notification export',
    author: workspaceName ?? 'Docuflow',
    creator: 'Docuflow',
  });

  addStatusBlock(builder, [
    { label: 'CQC acknowledgement received', value: entry.cqcAcknowledgementReceived },
    { label: 'Duty of candour upheld', value: entry.dutyOfCandourUpheld },
    { label: 'Investigation complete', value: entry.investigationComplete },
    { label: 'Lessons learnt complete', value: entry.lessonsLearntComplete },
    { label: 'Root cause analysis complete', value: entry.rootCauseAnalysisComplete },
    { label: 'Safeguarding completed', value: entry.sovaCompleted },
  ]);

  builder.addSection('Notification overview');
  builder.addField('Resident', entry.residentName ?? 'Not recorded');
  builder.addField('Unique reference', entry.uniqueReferenceNumber ?? 'Not recorded');
  builder.addField('Incident details', entry.incidentDetails ?? 'Not recorded');
  builder.addField('SOVA comments', entry.sovaComments ?? 'Not recorded');
  builder.addField('Outcome', entry.outcome ?? 'Not recorded');

  builder.addSection('Linked records');
  builder.addInfoGrid(
    filterMeta([
      { label: 'Lessons learned record', value: lessonsLabel },
      { label: 'Root cause analysis record', value: rcaLabel },
      { label: 'Safeguarding (SOVA) log', value: sovaLabel },
    ]),
  );

  if (entry.lessonsLearntRecordId) {
    addLinkedRecordSection(builder, {
      label: 'Lessons learned record',
      reference: lessonsLabel,
      detail: lessonsDetail,
      type: 'lessons',
      actions: lessonsDetail?.actions,
      fields: filterMeta([
        { label: 'Event type', value: lessonsDetail?.form?.eventType },
        { label: 'Event date', value: formatDate(lessonsDetail?.form?.date) },
        { label: 'Location', value: lessonsDetail?.form?.location },
        { label: 'People involved', value: lessonsDetail?.form?.peopleInvolved },
      ]),
    });
  }

  if (entry.rootCauseAnalysisRecordId) {
    addLinkedRecordSection(builder, {
      label: 'Root cause analysis record',
      reference: rcaLabel,
      detail: rcaDetail,
      type: 'rca',
      actions: rcaDetail?.actions,
      fields: filterMeta([
        { label: 'Event type', value: rcaDetail?.form?.eventType },
        { label: 'Event date', value: formatDate(rcaDetail?.form?.date) },
        { label: 'Location', value: rcaDetail?.form?.location },
        { label: 'People involved', value: rcaDetail?.form?.peopleInvolved },
      ]),
    });
  }

  if (entry.linkedSovaLogId) {
    addLinkedRecordSection(builder, {
      label: 'Safeguarding (SOVA) log',
      reference: sovaLabel,
      detail: sovaDetail,
      type: 'sova',
      actions: [],
    });
  }

  builder.addFooter();
  return builder.doc.output('arraybuffer') as Uint8Array;
}
