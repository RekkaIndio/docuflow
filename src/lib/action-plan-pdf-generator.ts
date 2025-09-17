import jsPDF from 'jspdf';

export interface ActionPlanPDFData {
  workspaceName: string;
  monthLabel: string;
  generatedBy: string;
  items: Array<{ auditType: string; issue: string; assigned?: string; ragRating?: string; status?: string; completedAt?: string }>;
}

export function getActionPlanPDFFilename(workspaceName: string, monthLabel: string, year: number = new Date().getFullYear()): string {
  const safeName = workspaceName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
  return `action-plan_${safeName}_${safeMonth}_${year}.pdf`;
}
export async function generateActionPlanPDF(data: ActionPlanPDFData): Promise<Uint8Array> {
  // Create landscape document for wider table
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Try to load logo from public assets
  let logoImageData: string | null = null;
  try {
    const resp = await fetch('/Neurodiversity_Symbol.png');
    if (resp.ok) {
      const blob = await resp.blob();
      logoImageData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn('Could not load logo for Action Plan PDF', e);
  }

  // Try to render a landing-hero-style background (canvas blobs) for the header so
  // action-plan PDFs match the dependency-calculator header. If that fails, fall
  // back to the previous two-rectangle gradient header.
  let headerBgAdded = false;
  try {
    const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') as HTMLCanvasElement : null;
    if (canvas) {
      canvas.width = 1200;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const c = ctx;
        c.clearRect(0, 0, canvas.width, canvas.height);

        function drawBlob(x: number, y: number, r: number, color1: string, color2: string, alpha = 0.9) {
          const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
          g.addColorStop(0, color1);
          g.addColorStop(0.5, color2);
          g.addColorStop(1, color2 + '00');
          c.globalCompositeOperation = 'screen';
          c.globalAlpha = alpha * 0.12;
          c.fillStyle = g as any;
          c.beginPath();
          c.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
          c.fill();
          c.globalCompositeOperation = 'source-over';
        }

        // position blobs towards the top so the header strip shows them
        drawBlob(canvas.width * 0.15, canvas.height * 0.18, 420, '#f472b6', '#a78bfa', 0.95);
        drawBlob(canvas.width * 0.85, canvas.height * 0.16, 480, '#06b6d4', '#3b82f6', 0.95);
        drawBlob(canvas.width * 0.45, canvas.height * 0.42, 380, '#f59e0b', '#f472b6', 0.9);

        c.globalAlpha = 0.06;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.moveTo(0, canvas.height * 0.75);
        c.bezierCurveTo(canvas.width * 0.25, canvas.height * 0.6, canvas.width * 0.5, canvas.height * 0.9, canvas.width, canvas.height * 0.7);
        c.lineTo(canvas.width, canvas.height);
        c.lineTo(0, canvas.height);
        c.closePath();
        c.fill();

        // Attempt to embed canvas as header image into the PDF (scaled to headerHeight)
        const headerHeight = 120;
        const bgDataUrl = canvas.toDataURL('image/png');
        try {
          doc.addImage(bgDataUrl, 'PNG', 0, 0, pageWidth, headerHeight);
          headerBgAdded = true;
        } catch (e) {
          console.warn('Failed to add header background image to Action Plan PDF:', e);
          headerBgAdded = false;
        }
      }
    }
  } catch (err) {
    console.warn('Could not render canvas header for Action Plan PDF:', err);
  }

  // If canvas background wasn't added, fall back to the old two-rectangle header
  if (!headerBgAdded) {
    const themeBlue = [59, 130, 246];
    const themeIndigo = [79, 70, 229];
    doc.setFillColor(themeBlue[0], themeBlue[1], themeBlue[2]);
    doc.rect(0, 0, pageWidth / 2, 60, 'F');
    doc.setFillColor(themeIndigo[0], themeIndigo[1], themeIndigo[2]);
    doc.rect(pageWidth / 2, 0, pageWidth / 2, 60, 'F');
  }

  // Add logo if available, otherwise draw placeholder box with icon
  if (logoImageData) {
    try {
      // draw a single crisp logo on the left overlay
      doc.addImage(logoImageData, 'PNG', margin, 12, 44, 44);
    } catch (e) {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, 12, 44, 36, 'F');
      doc.setFontSize(18);
      doc.setTextColor(59, 130, 246);
      doc.text('🧠', margin + 14, 36);
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, 12, 44, 36, 'F');
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('🧠', margin + 14, 36);
  }

  // Title in header (use black text to match landing hero overlay)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Action Plan', margin + 56, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.workspaceName} — ${data.monthLabel}`, margin + 56, 40);
  doc.text(`Generated by: ${data.generatedBy}`, margin + 56, 46);

  let y = 80;

  // Column layout (anchor RAG/Status to the right so Issue gets the flexible middle space)
  const auditW = 60;
  // bring Assigned closer to Audit by starting with a modest width
  let assignedW = 70;
  // make RAG much smaller so it sits inline
  const ragW = 28;

  const colAudit = margin;
  const colAssigned = colAudit + auditW;

  // right content edge (no Status column now)
  const rightEdge = margin + contentWidth;

  // small left shift to nudge columns left to fit better
  const shiftLeft = 12;

  // place RAG immediately after Assigned (shifted left)
  const colRag = colAssigned + assignedW + 8 - shiftLeft;
  // Issue sits after RAG and expands to rightEdge (with small padding, shifted left)
  const colIssue = colRag + ragW + 8 - shiftLeft;
  const issueW = Math.max(140, rightEdge - colIssue - 12);

  const lineHeight = 6; // slightly larger for safety
  const ragColors: Record<string, [number, number, number]> = {
    red: [239, 68, 68],
    amber: [245, 158, 11],
    green: [34, 197, 94]
  };

  // helper: wrap text to a maximum width (uses current font/size)
  function wrapTextToWidth(d: any, text: string, maxWidth: number) {
    if (!text) return [''];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const tentative = current ? `${current} ${w}` : w;
      const tw = d.getTextWidth(tentative);
      if (tw > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = tentative;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // helper: draw table header (call on new page)
  function drawTableHeader(startY: number) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Audit Type', colAudit, startY);
    doc.text('Assigned', colAssigned, startY);
    doc.text('RAG', colRag, startY);
    doc.text('Issue', colIssue, startY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    return startY + 8;
  }

  // draw initial header
  y = drawTableHeader(y);

  for (const item of data.items) {
    // Prepare wrapped lines for each column that may wrap
    const auditLines = wrapTextToWidth(doc, item.auditType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), auditW);
    const assignedLines = wrapTextToWidth(doc, item.assigned || 'Unassigned', assignedW);
    const issueLines = wrapTextToWidth(doc, item.issue || '', issueW);

    const maxLines = Math.max(auditLines.length, assignedLines.length, issueLines.length, 1);
    const rowHeight = maxLines * lineHeight + 6;

    // Page break if needed
    if (y + rowHeight > pageHeight - 30) {
      doc.addPage();
      y = 20;
      y = drawTableHeader(y);
    }

    // Draw Audit lines
    for (let i = 0; i < auditLines.length; i++) {
      doc.text(auditLines[i], colAudit, y + i * lineHeight);
    }

    // Draw Assigned lines
    for (let i = 0; i < assignedLines.length; i++) {
      doc.text(assignedLines[i], colAssigned, y + i * lineHeight);
    }

    // Draw Issue lines
    for (let i = 0; i < issueLines.length; i++) {
      doc.text(issueLines[i], colIssue, y + i * lineHeight);
    }

    // RAG - small colored circle + short label, placed inline with first line
    const rag = (item.ragRating || '').toLowerCase();
    if (rag && ragColors[rag]) {
      const c = ragColors[rag];
      const cx = colRag + 6;
      // Align circle to the first line baseline (text is drawn at y), place circle slightly above baseline
      const cy = y - 2;
      doc.setFillColor(c[0], c[1], c[2]);
      // even smaller circle to fit inline
      doc.circle(cx, cy, 2.4, 'F');
      doc.setTextColor(31, 41, 55);
      // draw label on the same baseline as the first line of text
      doc.text(rag.toUpperCase(), colRag + 12, y);
    }

    // Advance y by computed row height
    y += rowHeight;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated by DocuFlow — Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc.output('arraybuffer') as Uint8Array;
}

function splitText(text: string, maxCharsPerLine: number) {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  words.forEach(w => {
    if ((current + ' ' + w).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  });
  if (current) lines.push(current.trim());
  return lines;
}
