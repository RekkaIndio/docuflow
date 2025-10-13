import { StandardPdfBuilder, StandardPdfMetaItem } from '@/lib/pdf/standard-layout';

export interface ActionPlanPDFData {
  workspaceName: string;
  monthLabel: string;
  generatedBy: string;
  items: Array<{
    auditType: string;
    issue: string;
    assigned?: string;
    ragRating?: string;
    status?: string;
    completedAt?: string;
  }>;
}

export function getActionPlanPDFFilename(
  workspaceName: string,
  monthLabel: string,
  year: number = new Date().getFullYear()
): string {
  const safeName = workspaceName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
  return `action-plan_${safeName}_${safeMonth}_${year}.pdf`;
}

export async function generateActionPlanPDF(data: ActionPlanPDFData): Promise<Uint8Array> {
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const meta: StandardPdfMetaItem[] = [
    { label: 'Workspace', value: data.workspaceName },
    { label: 'Month', value: data.monthLabel },
    { label: 'Created By', value: data.generatedBy },
    { label: 'Total Actions', value: data.items.length },
    { label: 'Generated', value: generatedAt },
  ];

  const builder = new StandardPdfBuilder({
    title: 'Action Plan',
    subtitle: 'Audit Remediation Summary',
    orientation: 'landscape',
    meta,
  });

  builder.doc.setProperties({
    title: `Action Plan - ${data.workspaceName}`,
    subject: `Action Plan (${data.monthLabel})`,
    creator: 'CG360 Action Plan Generator',
  });

  if (data.items.length === 0) {
    builder.addSection('Overview');
    builder.addParagraph('No outstanding action plan items were found for the selected period.');
    builder.addFooter();
    return builder.doc.output('arraybuffer') as Uint8Array;
  }

  const ragCounts = data.items.reduce(
    (acc, item) => {
      const ragKey = (item.ragRating || 'unknown').toLowerCase();
      if (ragKey === 'red') acc.red += 1;
      else if (ragKey === 'amber' || ragKey === 'orange') acc.amber += 1;
      else if (ragKey === 'green') acc.green += 1;
      else acc.unknown += 1;
      return acc;
    },
    { red: 0, amber: 0, green: 0, unknown: 0 }
  );

  builder.addSection('Executive Summary');
  builder.addInfoGrid(
    [
      { label: 'Critical (Red)', value: ragCounts.red },
      { label: 'Medium (Amber)', value: ragCounts.amber },
      { label: 'On Track (Green)', value: ragCounts.green },
      { label: 'Unrated', value: ragCounts.unknown },
    ],
    { columns: 4 }
  );

  builder.addParagraph(
    'This action plan consolidates outstanding follow-up items from recent audits. Use the prioritisation bands above to assign owners and schedule completion dates.'
  );

  const groupedByAudit = data.items.reduce<Record<string, number>>((acc, item) => {
    const key = item.auditType || 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  builder.addSubheading('Actions by audit area', { marginTop: 12 });
  builder.addBulletList(
    Object.entries(groupedByAudit).map(([audit, count]) => `${formatAuditName(audit)} — ${count} item${count === 1 ? '' : 's'}`)
  );

  builder.addSection('Detailed Actions', { marginTop: 16 });

  const rows = data.items.map((item, index) => ({
    index: `#${index + 1}`,
    auditType: formatAuditName(item.auditType),
    issue: item.issue || 'Not specified',
    assigned: item.assigned || 'Unassigned',
    rag: (item.ragRating || 'Unknown').toUpperCase(),
    status: item.status || 'Open',
    completedAt: item.completedAt || '—',
  }));

  builder.addTable({
    columns: [
      { key: 'index', header: '#', width: 20, align: 'center' },
      { key: 'auditType', header: 'Audit Type', width: 70 },
      { key: 'issue', header: 'Issue / Required Action', width: 160 },
      { key: 'assigned', header: 'Owner', width: 60 },
      { key: 'rag', header: 'RAG', width: 35, align: 'center' },
      { key: 'status', header: 'Status', width: 60 },
      { key: 'completedAt', header: 'Completed', width: 55 },
    ],
    rows,
    stripe: true,
  });

  builder.addSection('Next Steps', { marginTop: 10 });
  builder.addBulletList([
    'Assign owners to high-priority actions and set due dates in the dashboard.',
    'Document resolutions and upload supporting evidence where required.',
    'Schedule follow-up audits for any recurring issues or overdue actions.',
  ]);

  builder.addFooter();
  return builder.doc.output('arraybuffer') as Uint8Array;
}

function formatAuditName(auditType: string): string {
  return auditType
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
