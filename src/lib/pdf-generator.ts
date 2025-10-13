import { StandardPdfBuilder, StandardPdfMetaItem } from '@/lib/pdf/standard-layout';

/**
 * PDF Generator for Audit Reports
 * Creates formatted PDF documents from audit data
 */

export interface AuditPDFData {
  auditType: string;
  home: string;
  auditDate: string;
  completedBy: string;
  data: Record<string, any>;
  comments?: string;
  scorePercent?: number;
  yesCount?: number;
  totalCount?: number;
}

export function generateAuditPDF(auditData: AuditPDFData): Uint8Array {
  const meta: StandardPdfMetaItem[] = [
    { label: 'Facility', value: auditData.home },
    { label: 'Audit Date', value: formatDate(auditData.auditDate) },
    { label: 'Completed By', value: auditData.completedBy },
    { label: 'Report Generated', value: formatDate(new Date().toISOString()) },
  ];

  if (typeof auditData.scorePercent === 'number') {
    meta.push({ label: 'Score', value: `${auditData.scorePercent}%` });
  }

  if (typeof auditData.yesCount === 'number' && typeof auditData.totalCount === 'number') {
    meta.push({ label: 'Criteria Met', value: `${auditData.yesCount}/${auditData.totalCount}` });
  }

  const builder = new StandardPdfBuilder({
    title: 'Audit Report',
    subtitle: formatAuditTypeName(auditData.auditType),
    meta,
  });

  builder.doc.setProperties({
    title: `${auditData.auditType} Audit Report`,
    subject: `Audit Report - ${auditData.home}`,
    author: auditData.completedBy,
    creator: 'CG360 Audit System',
  });

  const formattedData = formatAuditDataForPDF(auditData.auditType, auditData.data);
  const embeddedImages = extractEmbeddedImages(auditData.data);

  const renderImages = (label: string) => {
    if (!embeddedImages) return;

    const normalizedKeys = [
      label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      label.replace(/\s+/g, '').toLowerCase(),
      label.toLowerCase(),
    ];

    let images: { dataUrl: string; name?: string }[] | undefined;

    for (const key of Object.keys(embeddedImages)) {
      const lowerKey = key.toLowerCase();
      if (normalizedKeys.includes(lowerKey) || lowerKey.includes(label.toLowerCase()) || label.toLowerCase().includes(lowerKey)) {
        images = embeddedImages[key];
        break;
      }
    }

    if (!images && embeddedImages[label]) {
      images = embeddedImages[label];
    }

    if (!images || images.length === 0) {
      return;
    }

    const doc = builder.doc;
    const thumbWidth = Math.min(70, builder.contentWidth / 3);
    const thumbHeight = thumbWidth * 0.75;
    const gap = 8;

    builder.ensureSpace(thumbHeight + 14);
    let cursorY = builder.getCursorY();
    let x = builder.margin;
    let rowHeight = 0;

    images.forEach((img) => {
      if (cursorY + thumbHeight > doc.internal.pageSize.getHeight() - builder.margin) {
        builder.addPage();
        cursorY = builder.getCursorY();
        x = builder.margin;
        rowHeight = 0;
      }

      try {
        doc.roundedRect(x - 2, cursorY - 2, thumbWidth + 4, thumbHeight + 12, 2, 2, 'S');
        doc.addImage(img.dataUrl, 'PNG', x, cursorY, thumbWidth, thumbHeight);
        if (img.name) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(img.name, x + thumbWidth / 2, cursorY + thumbHeight + 6, { align: 'center' });
        }
      } catch (error) {
        console.warn('Failed to add embedded image to PDF', error);
      }

      rowHeight = Math.max(rowHeight, thumbHeight + 12);

      if (x + thumbWidth + gap > builder.margin + builder.contentWidth) {
        x = builder.margin;
        cursorY += rowHeight + gap;
        rowHeight = 0;
        builder.ensureSpace(thumbHeight + 14);
        cursorY = builder.getCursorY();
      } else {
        x += thumbWidth + gap;
      }
    });

    builder.setCursorY(cursorY + rowHeight + 10);
  };

  formattedData.forEach((section) => {
    builder.addSection(section.title);

    section.items.forEach((item) => {
      if (item.type === 'yes-no') {
        const chip = item.value === 'Yes' ? 'yes' : item.value === 'No' ? 'no' : undefined;
        builder.addField(item.label, item.value ?? 'Not answered', chip ? { chip } : undefined);
      } else {
        builder.addField(item.label, item.value || 'Not specified');
      }

      renderImages(item.label);
    });
  });

  if (auditData.comments) {
    builder.addSection('Comments');
    builder.addParagraph(auditData.comments);
  }

  builder.addFooter();
  return builder.doc.output('arraybuffer') as Uint8Array;
}
function extractEmbeddedImages(data: Record<string, any> | null | undefined) {
  if (!data) return undefined;
  const embedded = (data as any)._embeddedImages;
  if (!embedded || typeof embedded !== 'object') {
    return undefined;
  }
  return embedded as Record<string, { dataUrl: string; name?: string }[]>;
}

function formatAuditTypeName(auditType: string): string {
  return auditType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') + ' Audit';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

interface PDFSection {
  title: string;
  items: Array<{
    type: 'field' | 'yes-no';
    label: string;
    value: string;
  }>;
}

function formatAuditDataForPDF(auditType: string, data: Record<string, any>): PDFSection[] {
  const sections: PDFSection[] = [];

  switch (auditType) {
    case 'infection-control':
      sections.push(
        {
          title: 'Basic Information',
          items: [
            { type: 'field', label: 'Date', value: data.date },
            { type: 'field', label: 'Person Completing Audit', value: data.completedBy },
            { type: 'field', label: 'Location', value: data.location }
          ]
        },
        {
          title: 'Audit Questions',
          items: [
            { type: 'yes-no', label: 'Hand hygiene facilities available', value: data.handHygieneFacilities },
            { type: 'yes-no', label: 'Staff following hand hygiene protocols', value: data.handHygieneProtocols },
            { type: 'yes-no', label: 'PPE available and used correctly', value: data.ppeAvailable },
            { type: 'yes-no', label: 'Isolation procedures followed', value: data.isolationProcedures },
            { type: 'yes-no', label: 'Cleaning schedules up to date', value: data.cleaningSchedules },
            { type: 'yes-no', label: 'Waste disposal appropriate', value: data.wasteDisposal },
            { type: 'yes-no', label: 'Staff training records current', value: data.trainingRecords },
            { type: 'yes-no', label: 'Infection control policies displayed', value: data.policiesDisplayed }
          ]
        }
      );
      break;

    case 'accident-incident':
      sections.push(
        {
          title: 'Incident Information',
          items: [
            { type: 'field', label: 'Incident Date', value: data.incidentDate },
            { type: 'field', label: 'Incident Time', value: data.incidentTime },
            { type: 'field', label: 'Resident Name', value: data.residentName },
            { type: 'field', label: 'Type of Occurrence', value: data.accidentOrIncident },
            { type: 'field', label: 'Details of Incident', value: data.details }
          ]
        },
        {
          title: 'Response & Actions',
          items: [
            { type: 'field', label: 'Actions Taken', value: data.actionsTaken },
            { type: 'field', label: 'Preventative Measures', value: data.preventative }
          ]
        },
        {
          title: 'Notifications',
          items: [
            { type: 'field', label: 'CQC Notification Required', value: data.cqcNotification },
            { type: 'field', label: 'Safeguarding Notification', value: data.safeguardNotification }
          ]
        }
      );
      break;

    default:
      // Generic formatting for other audit types
      const basicFields = ['home', 'auditDate', 'completedBy'];
      const basicItems = basicFields
        .filter(field => data[field])
        .map(field => ({
          type: 'field' as const,
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
          value: data[field]
        }));

      if (basicItems.length > 0) {
        sections.push({
          title: 'Basic Information',
          items: basicItems
        });
      }

      // Add other fields
      const otherFields = Object.keys(data).filter(key => !basicFields.includes(key) && data[key]);
      if (otherFields.length > 0) {
        sections.push({
          title: 'Audit Data',
          items: otherFields.map(field => ({
            type: (data[field] === 'Yes' || data[field] === 'No') ? 'yes-no' as const : 'field' as const,
            label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
            value: data[field]
          }))
        });
      }
  }

  return sections;
}

export function getAuditPDFFilename(auditType: string, home: string, date: string): string {
  const formattedDate = new Date(date).toISOString().split('T')[0];
  const sanitizedHome = home.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedAuditType = auditType.replace(/-/g, '_');
  
  return `${sanitizedAuditType}_audit_${sanitizedHome}_${formattedDate}.pdf`;
}