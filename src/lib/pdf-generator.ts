import jsPDF from 'jspdf';
// Fallback: simple word wrap for jsPDF v3+
import splitTextToSize from 'jspdf/dist/plugins/split_text_to_size';

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
  const doc = new jsPDF();
  
  // Set up document properties
  doc.setProperties({
    title: `${auditData.auditType} Audit Report`,
    subject: `Monthly Audit Report - ${auditData.home}`,
    author: auditData.completedBy,
    creator: 'CG360 Audit System'
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with automatic line wrapping
  // Simple word wrap fallback for jsPDF v3+
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    doc.setFontSize(fontSize);
    // Ensure text is a string
    const safeText = (typeof text === 'string') ? text : (text == null ? '' : String(text));
    const words = safeText.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = doc.getTextWidth(testLine);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    doc.text(lines, x, y);
    return y + (lines.length * (fontSize * 0.4));
  };

  // Header
  doc.setFillColor(59, 130, 246); // Blue background
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AUDIT REPORT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(formatAuditTypeName(auditData.auditType), pageWidth / 2, 30, { align: 'center' });

  // Reset text color for body
  doc.setTextColor(0, 0, 0);
  yPosition = 50;

  // Audit Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Information', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const auditInfo = [
    { label: 'Care Home/Facility:', value: auditData.home },
    { label: 'Audit Date:', value: formatDate(auditData.auditDate) },
    { label: 'Completed By:', value: auditData.completedBy },
    { label: 'Report Generated:', value: formatDate(new Date().toISOString()) }
  ];

  auditInfo.forEach(info => {
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(info.value, margin + 40, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Score Section (if available)
  if (auditData.scorePercent !== undefined && auditData.yesCount !== undefined && auditData.totalCount !== undefined) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Score', margin, yPosition);
    yPosition += 10;

    // Score box
    const scoreColor = auditData.scorePercent >= 80 ? [34, 197, 94] : auditData.scorePercent >= 60 ? [251, 191, 36] : [239, 68, 68];
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.rect(margin, yPosition - 5, 60, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${auditData.scorePercent}%`, margin + 30, yPosition + 8, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${auditData.yesCount} out of ${auditData.totalCount} criteria met`, margin + 70, yPosition + 5);
    
    yPosition += 30;
  }

  // Audit Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Details', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Format audit data based on type
  const formattedData = formatAuditDataForPDF(auditData.auditType, auditData.data);
  
  formattedData.forEach(section => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    yPosition = addWrappedText(section.title, margin, yPosition, contentWidth, 12);
    yPosition += 5;

    // Section content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    section.items.forEach(item => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      if (item.type === 'field') {
        doc.setFont('helvetica', 'bold');
        yPosition = addWrappedText(`${item.label}:`, margin + 5, yPosition, contentWidth - 5, 10);
        doc.setFont('helvetica', 'normal');
        yPosition = addWrappedText(item.value || 'Not specified', margin + 10, yPosition + 3, contentWidth - 10, 10);
        yPosition += 5;
      } else if (item.type === 'yes-no') {
        const answer = item.value === 'Yes' ? '✓ Yes' : item.value === 'No' ? '✗ No' : 'Not answered';
        const color = item.value === 'Yes' ? [34, 197, 94] : item.value === 'No' ? [239, 68, 68] : [107, 114, 128];
        
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.label}:`, margin + 5, yPosition);
        
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(answer, margin + 100, yPosition);
        doc.setTextColor(0, 0, 0);
        
        yPosition += 7;
      }
      // If there are embedded images for this item key, render them below the item
      try {
        const embedded = (auditData.data && (auditData.data as any)._embeddedImages) ? (auditData.data as any)._embeddedImages : null;
        // The item.label is human readable, but attachments were keyed by field name; we try both label and a normalized key
        const possibleKeys = [
          // normalized label: lowercase, remove non-word
          item.label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
          item.label.replace(/\s+/g, '').toLowerCase(),
          item.label.toLowerCase()
        ];
        if (embedded) {
          let imagesForItem: { dataUrl: string; name?: string }[] | undefined = undefined;
          for (const k of Object.keys(embedded)) {
            if (possibleKeys.includes(k.toLowerCase()) || k.toLowerCase().includes(item.label.toLowerCase()) || item.label.toLowerCase().includes(k.toLowerCase())) {
              imagesForItem = embedded[k];
              break;
            }
          }

          if (!imagesForItem && embedded[item.label]) imagesForItem = embedded[item.label];

          if (imagesForItem && imagesForItem.length > 0) {
            // Render thumbnails across the page, scale down if needed
            const maxImgWidth = Math.min(80, contentWidth - 20);
            const imgGap = 5;
            let x = margin + 10;
            let maxRowHeight = 0;
            for (const img of imagesForItem) {
              try {
                // Determine width/height of the image by creating a temporary Image object (not available in Node), so we'll assume a square thumbnail
                const w = 60;
                const h = 60;
                if (yPosition + h > 270) {
                  doc.addPage();
                  yPosition = 20;
                }
                // jsPDF addImage accepts dataURL
                doc.addImage(img.dataUrl, 'PNG', x, yPosition, w, h);
                x += w + imgGap;
                maxRowHeight = Math.max(maxRowHeight, h);
                // wrap to next line
                if (x + w > margin + contentWidth) {
                  x = margin + 10;
                  yPosition += maxRowHeight + imgGap;
                }
              } catch (imgErr) {
                console.warn('Failed to add embedded image to PDF', imgErr);
                continue;
              }
            }
            yPosition += maxRowHeight + 8;
          }
        }
      } catch (e) {
        // ignore image embedding failures
      }
    });
    
    yPosition += 10;
  });

  // Comments Section
  if (auditData.comments) {
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Comments', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(auditData.comments, margin, yPosition, contentWidth, 10);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated by CG360 - Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  return doc.output('arraybuffer') as Uint8Array;
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