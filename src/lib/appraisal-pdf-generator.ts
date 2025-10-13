import { StandardPdfBuilder, StandardPdfMetaItem } from '@/lib/pdf/standard-layout';

export interface AppraisalPDFData {
  appraisalType: string;
  formData: Record<string, any>;
  month: number;
  year?: number;
}

export function generateAppraisalPDF(appraisalData: AppraisalPDFData): Uint8Array {
  return buildAppraisalPdf(appraisalData);
}

export async function generateAppraisalPDFWithLogo(appraisalData: AppraisalPDFData): Promise<Uint8Array> {
  return buildAppraisalPdf(appraisalData);
}

function buildAppraisalPdf(appraisalData: AppraisalPDFData): Uint8Array {
  const { appraisalType, formData, month, year = new Date().getFullYear() } = appraisalData;
  const periodLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const meta: StandardPdfMetaItem[] = [
    { label: 'Period', value: periodLabel },
    { label: 'Generated', value: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { label: 'Employee', value: formData.employeeName },
    { label: 'Role', value: formData.role },
    { label: 'Appraiser', value: formData.appraiser },
  ];

  const builder = new StandardPdfBuilder({
    title: 'Appraisal Report',
    subtitle: formatAppraisalTypeName(appraisalType),
    meta,
  });

  builder.doc.setProperties({
    title: `${formatAppraisalTypeName(appraisalType)} Report`,
    subject: `Appraisal Report - ${periodLabel}`,
    creator: 'CG360 Appraisal System',
  });

  const sections = formatAppraisalDataForPDF(formData);

  sections.forEach((section) => {
    builder.addSection(section.title);

    section.groups.forEach((group) => {
      if (group.title) {
        builder.addSubheading(group.title, { marginTop: 6, accent: false });
      }

      group.fields.forEach((field) => {
        builder.addField(field.label, field.value || 'Not provided');
      });

      if (group.objectives && group.objectives.length > 0) {
        const summary = group.objectives.map((objective, index) => {
          const parts: string[] = [];
          const label = objective.text || `Objective ${index + 1}`;
          parts.push(label);
          if (objective.status) parts.push(`Status: ${objective.status}`);
          if (objective.comments) parts.push(`Comments: ${objective.comments}`);
          return parts.join(' — ');
        });

        builder.addBulletList(summary, { bullet: '•' });
      }
    });
  });

  builder.addFooter();
  return builder.doc.output('arraybuffer') as Uint8Array;
}

function formatAppraisalTypeName(appraisalType: string): string {
  return appraisalType
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Supervision', 'Supervision Report');
}

interface PDFSection {
  title: string;
  groups: Array<{
    title: string;
    fields: Array<{
      label: string;
      value: string;
    }>;
    objectives?: Array<{
      text: string;
      status?: string;
      comments?: string;
    }>;
  }>;
}

function formatAppraisalDataForPDF(formData: Record<string, any>): PDFSection[] {
  const sections: PDFSection[] = [];

  const employeeDetails: Array<{ label: string; value: string }> = [];
  if (formData.employeeName) employeeDetails.push({ label: 'Employee Name', value: toDisplayValue(formData.employeeName) });
  if (formData.role) employeeDetails.push({ label: 'Role', value: toDisplayValue(formData.role) });
  if (formData.appraiser) employeeDetails.push({ label: 'Appraiser', value: toDisplayValue(formData.appraiser) });
  if (formData.date) employeeDetails.push({ label: 'Date of Appraisal', value: toDisplayValue(formData.date) });
  if (formData.period) employeeDetails.push({ label: 'Period Covered', value: toDisplayValue(formData.period) });

  if (employeeDetails.length > 0) {
    sections.push({
      title: 'Employee Details',
      groups: [{ title: '', fields: employeeDetails }],
    });
  }

  if (Array.isArray(formData.objectives) && formData.objectives.length > 0) {
    sections.push({
      title: 'Review of Previous Objectives',
      groups: [{ title: '', fields: [], objectives: normalizeObjectives(formData.objectives) }],
    });
  }

  const performanceFields: Array<{ label: string; value: string }> = [];
  if (formData.qualityOfWork) performanceFields.push({ label: 'Quality of Work', value: toDisplayValue(formData.qualityOfWork) });
  if (formData.teamwork) performanceFields.push({ label: 'Teamwork & Communication', value: toDisplayValue(formData.teamwork) });
  if (formData.residentFocus) performanceFields.push({ label: 'Resident/Service User Focus', value: toDisplayValue(formData.residentFocus) });
  if (formData.reliability) performanceFields.push({ label: 'Reliability & Professionalism', value: toDisplayValue(formData.reliability) });

  if (performanceFields.length > 0) {
    sections.push({
      title: 'Performance Review',
      groups: [{ title: '', fields: performanceFields }],
    });
  }

  if (formData.strengths) {
    sections.push({
      title: 'Strengths & Achievements',
      groups: [{ title: '', fields: [{ label: 'Key Strengths and Achievements', value: toDisplayValue(formData.strengths) }] }],
    });
  }

  if (formData.development) {
    sections.push({
      title: 'Development Needs',
      groups: [{ title: '', fields: [{ label: 'Areas Requiring Improvement', value: toDisplayValue(formData.development) }] }],
    });
  }

  if (Array.isArray(formData.nextObjectives) && formData.nextObjectives.length > 0) {
    sections.push({
      title: 'Objectives for the Next Year (SMART)',
      groups: [{ title: '', fields: [], objectives: normalizeObjectives(formData.nextObjectives) }],
    });
  }

  if (formData.training) {
    sections.push({
      title: 'Training & Career Development',
      groups: [{ title: '', fields: [{ label: 'Training Completed and Required', value: toDisplayValue(formData.training) }] }],
    });
  }

  if (formData.wellbeing) {
    sections.push({
      title: 'Wellbeing & Support',
      groups: [{ title: '', fields: [{ label: 'Workload and Support Assessment', value: toDisplayValue(formData.wellbeing) }] }],
    });
  }

  if (formData.overallRating) {
    sections.push({
      title: 'Overall Appraisal Rating',
      groups: [{ title: '', fields: [{ label: 'Rating', value: toDisplayValue(formData.overallRating) }] }],
    });
  }

  const comments: Array<{ label: string; value: string }> = [];
  if (formData.appraiserComments) comments.push({ label: 'Appraiser Comments', value: toDisplayValue(formData.appraiserComments) });
  if (formData.appraiseeComments) comments.push({ label: 'Appraisee Comments', value: toDisplayValue(formData.appraiseeComments) });

  if (comments.length > 0) {
    sections.push({ title: 'Comments', groups: [{ title: '', fields: comments }] });
  }

  const signatureFields: Array<{ label: string; value: string }> = [];
  if (formData.employeeSignature) signatureFields.push({ label: 'Employee (Appraisee) Signature', value: toDisplayValue(formData.employeeSignature) });
  if (formData.employeeSignatureDate) signatureFields.push({ label: 'Employee Signature Date', value: toDisplayValue(formData.employeeSignatureDate) });
  if (formData.appraiserSignature) signatureFields.push({ label: 'Appraiser Signature', value: toDisplayValue(formData.appraiserSignature) });
  if (formData.appraiserSignatureDate) signatureFields.push({ label: 'Appraiser Signature Date', value: toDisplayValue(formData.appraiserSignatureDate) });
  if (formData.signature && !formData.employeeSignature) signatureFields.push({ label: 'Signature', value: toDisplayValue(formData.signature) });
  if (formData.date && !formData.employeeSignatureDate) signatureFields.push({ label: 'Date Signed', value: toDisplayValue(formData.date) });

  if (signatureFields.length > 0) {
    sections.push({ title: 'Digital Signature & Verification', groups: [{ title: '', fields: signatureFields }] });
  }

  const reservedKeys = new Set([
    'employeeName',
    'role',
    'appraiser',
    'date',
    'period',
    'objectives',
    'qualityOfWork',
    'teamwork',
    'residentFocus',
    'reliability',
    'strengths',
    'development',
    'nextObjectives',
    'training',
    'wellbeing',
    'overallRating',
    'appraiserComments',
    'appraiseeComments',
    'signature',
    'employeeSignature',
    'employeeSignatureDate',
    'appraiserSignature',
    'appraiserSignatureDate',
  ]);

  const additional = Object.entries(formData)
    .filter(([key]) => !reservedKeys.has(key))
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
      value: toDisplayValue(value),
    }))
    .filter((item) => item.value.length > 0);

  if (additional.length > 0) {
    sections.push({ title: 'Additional Information', groups: [{ title: '', fields: additional }] });
  }

  return sections;
}

function normalizeObjectives(objectives: any[]): Array<{ text: string; status?: string; comments?: string }> {
  return objectives.map((objective) => {
    if (typeof objective === 'string') {
      return { text: objective };
    }

    return {
      text: toDisplayValue(objective.text ?? ''),
      status: toDisplayValue(objective.status ?? ''),
      comments: toDisplayValue(objective.comments ?? ''),
    };
  });
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toDisplayValue(item)).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function getAppraisalPDFFilename(appraisalType: string, month: number, year: number = new Date().getFullYear()): string {
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
  const sanitizedAppraisalType = appraisalType.replace(/-/g, '_').replace(/\s+/g, '_');
  return `${sanitizedAppraisalType}_${monthName}_${year}.pdf`;
}