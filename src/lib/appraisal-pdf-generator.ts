import jsPDF from 'jspdf';

/**
 * PDF Generator for Appraisal Reports
 * Creates formatted PDF documents from appraisal form data
 */

export interface AppraisalPDFData {
  appraisalType: string;
  formData: Record<string, any>;
  month: number;
  year?: number;
}

export function generateAppraisalPDF(appraisalData: AppraisalPDFData): Uint8Array {
  const doc = new jsPDF();

  const { appraisalType, formData, month, year = 2025 } = appraisalData;

  // Set up document properties
  doc.setProperties({
    title: `${appraisalType} Report`,
    subject: `Monthly Appraisal Report - ${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`,
    creator: 'CG360 Appraisal System'
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with automatic line wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    doc.setFontSize(fontSize);
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

    lines.forEach((line, index) => {
      doc.text(line, x, y + (index * (fontSize * 0.4)));
    });

    return y + (lines.length * (fontSize * 0.4));
  };

  // Load and add logo
  try {
    // Create a temporary image element to load the logo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/Neurodiversity_Symbol.png';

    // For now, we'll add a placeholder logo area - in a real implementation,
    // you'd wait for the image to load and then add it to the PDF
    // Since this is synchronous PDF generation, we'll add a styled logo area
  } catch (error) {
    console.warn('Could not load logo:', error);
  }

  // Enhanced Header with Logo Area
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Add a subtle border
  doc.setDrawColor(59, 130, 246); // Blue border
  doc.setLineWidth(0.5);
  doc.rect(0, 0, pageWidth, 50);

  // Logo placeholder area (left side)
  doc.setFillColor(248, 250, 252); // Light gray background for logo
  doc.rect(margin, 10, 30, 30, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.3);
  doc.rect(margin, 10, 30, 30);

  // Logo icon (simplified representation)
  doc.setFontSize(16);
  doc.setTextColor(59, 130, 246);
  doc.text('🧠', margin + 8, 28);

  // Company info (right side)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Dark gray
  doc.text('CG360', margin + 40, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray
  doc.text('Professional Document Management System', margin + 40, 30);

  // Document title and info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(formatAppraisalTypeName(appraisalType), margin, 48);

  yPosition = 65;

  // Information Box
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.rect(margin, yPosition - 5, contentWidth, 25, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPosition - 5, contentWidth, 25);

  // Appraisal Information Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Appraisal Information', margin + 5, yPosition + 3);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  const appraisalInfo = [
    { label: 'Period:', value: `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}` },
    { label: 'Generated:', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
  ];

  appraisalInfo.forEach((info, index) => {
    const xPos = margin + 5 + (index * 80);
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, xPos, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(info.value, xPos, yPosition + 5);
  });

  yPosition += 25;

  // Format appraisal data into sections
  const sections = formatAppraisalDataForPDF(formData);

  sections.forEach(section => {
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Section header with enhanced styling
    doc.setFillColor(59, 130, 246); // Blue background
    doc.rect(margin, yPosition - 3, contentWidth, 10, 'F');

    doc.setTextColor(255, 255, 255); // White text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(section.title, margin + 3, yPosition + 3);
    yPosition += 12;

    // Section content
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    section.groups.forEach(group => {
      if (group.title && group.title.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246); // Blue for subsection titles
        yPosition = addWrappedText(group.title, margin + 5, yPosition, contentWidth - 5, 10);
        yPosition += 5;
        doc.setTextColor(31, 41, 55); // Back to dark gray
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      // Fields with enhanced styling
      group.fields.forEach(field => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        // Field background
        doc.setFillColor(249, 250, 251); // Very light gray
        doc.rect(margin + 5, yPosition - 2, contentWidth - 5, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246); // Blue for labels
        yPosition = addWrappedText(`${field.label}:`, margin + 8, yPosition + 3, contentWidth - 10, 9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55); // Dark gray for values
        yPosition = addWrappedText(field.value || 'Not provided', margin + 8, yPosition + 4, contentWidth - 10, 9);
        yPosition += 8;
      });

      // Objectives (if any)
      if (group.objectives && group.objectives.length > 0) {
        yPosition += 3;
        group.objectives.forEach((obj: any, idx: number) => {
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }

          // Objective background
          doc.setFillColor(255, 255, 255);
          doc.rect(margin + 8, yPosition - 2, contentWidth - 11, 12, 'F');
          doc.setDrawColor(209, 213, 219); // Light border
          doc.setLineWidth(0.2);
          doc.rect(margin + 8, yPosition - 2, contentWidth - 11, 12);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text(`Objective ${idx + 1}:`, margin + 12, yPosition + 3);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(31, 41, 55);
          yPosition = addWrappedText(obj.text || 'Not specified', margin + 12, yPosition + 8, contentWidth - 20, 8);
          yPosition += 6;

          if (obj.status) {
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(107, 114, 128);
            doc.text(`Status: ${obj.status}`, margin + 12, yPosition);
            yPosition += 4;
          }

          if (obj.comments) {
            doc.setFont('helvetica', 'italic');
            yPosition = addWrappedText(`Comments: ${obj.comments}`, margin + 12, yPosition, contentWidth - 20, 8);
            yPosition += 4;
          }

          yPosition += 8;
        });
      }

      yPosition += 5;
    });

    yPosition += 8;
  });

  // Enhanced Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 15;

    // Footer background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, footerY - 5, pageWidth, 15, 'F');

    // Footer border
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.line(0, footerY - 5, pageWidth, footerY - 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);

    // Left side - company info
    doc.text('CG360 - Professional Document Management', margin, footerY + 2);

    // Center - page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY + 2, { align: 'center' });

    // Right side - generation info
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, pageWidth - margin, footerY + 2, { align: 'right' });
  }

  return doc.output('arraybuffer') as Uint8Array;
}

export async function generateAppraisalPDFWithLogo(appraisalData: AppraisalPDFData): Promise<Uint8Array> {
  const doc = new jsPDF();

  const { appraisalType, formData, month, year = 2025 } = appraisalData;

  // Set up document properties
  doc.setProperties({
    title: `${appraisalType} Report`,
    subject: `Monthly Appraisal Report - ${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`,
    creator: 'CG360 Appraisal System'
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with automatic line wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    doc.setFontSize(fontSize);
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

    lines.forEach((line, index) => {
      doc.text(line, x, y + (index * (fontSize * 0.4)));
    });

    return y + (lines.length * (fontSize * 0.4));
  };

  // Load logo image
  let logoImageData: string | null = null;
  try {
    const logoResponse = await fetch('/Neurodiversity_Symbol.png');
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob();
      logoImageData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
    }
  } catch (error) {
    console.warn('Could not load logo image:', error);
  }

  // Enhanced Header with Logo Area
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Add a subtle border
  doc.setDrawColor(59, 130, 246); // Blue border
  doc.setLineWidth(0.5);
  doc.rect(0, 0, pageWidth, 50);

  // Logo area (left side)
  doc.setFillColor(248, 250, 252); // Light gray background for logo
  doc.rect(margin, 10, 30, 30, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.3);
  doc.rect(margin, 10, 30, 30);

  // Add actual logo if available, otherwise use icon
  if (logoImageData) {
    try {
      doc.addImage(logoImageData, 'PNG', margin + 2, 12, 26, 26);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
      // Fallback to icon
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text('🧠', margin + 8, 28);
    }
  } else {
    // Fallback icon
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('🧠', margin + 8, 28);
  }

  // Company info (right side)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Dark gray
  doc.text('CG360', margin + 40, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray
  doc.text('Professional Document Management System', margin + 40, 30);

  // Document title and info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(formatAppraisalTypeName(appraisalType), margin, 48);

  yPosition = 65;

  // Information Box
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.rect(margin, yPosition - 5, contentWidth, 25, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPosition - 5, contentWidth, 25);

  // Appraisal Information Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Appraisal Information', margin + 5, yPosition + 3);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  const appraisalInfo = [
    { label: 'Period:', value: `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}` },
    { label: 'Generated:', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
  ];

  appraisalInfo.forEach((info, index) => {
    const xPos = margin + 5 + (index * 80);
    doc.setFont('helvetica', 'bold');
    doc.text(info.label, xPos, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(info.value, xPos, yPosition + 5);
  });

  yPosition += 25;

  // Format appraisal data into sections
  const sections = formatAppraisalDataForPDF(formData);

  sections.forEach(section => {
    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Section header with enhanced styling
    doc.setFillColor(59, 130, 246); // Blue background
    doc.rect(margin, yPosition - 3, contentWidth, 10, 'F');

    doc.setTextColor(255, 255, 255); // White text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(section.title, margin + 3, yPosition + 3);
    yPosition += 12;

    // Section content
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    section.groups.forEach(group => {
      if (group.title && group.title.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246); // Blue for subsection titles
        yPosition = addWrappedText(group.title, margin + 5, yPosition, contentWidth - 5, 10);
        yPosition += 5;
        doc.setTextColor(31, 41, 55); // Back to dark gray
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      // Fields with enhanced styling
      group.fields.forEach(field => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        // Field background
        doc.setFillColor(249, 250, 251); // Very light gray
        doc.rect(margin + 5, yPosition - 2, contentWidth - 5, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246); // Blue for labels
        yPosition = addWrappedText(`${field.label}:`, margin + 8, yPosition + 3, contentWidth - 10, 9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55); // Dark gray for values
        yPosition = addWrappedText(field.value || 'Not provided', margin + 8, yPosition + 4, contentWidth - 10, 9);
        yPosition += 8;
      });

      // Objectives (if any)
      if (group.objectives && group.objectives.length > 0) {
        yPosition += 3;
        group.objectives.forEach((obj: any, idx: number) => {
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }

          // Objective background
          doc.setFillColor(255, 255, 255);
          doc.rect(margin + 8, yPosition - 2, contentWidth - 11, 12, 'F');
          doc.setDrawColor(209, 213, 219); // Light border
          doc.setLineWidth(0.2);
          doc.rect(margin + 8, yPosition - 2, contentWidth - 11, 12);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text(`Objective ${idx + 1}:`, margin + 12, yPosition + 3);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(31, 41, 55);
          yPosition = addWrappedText(obj.text || 'Not specified', margin + 12, yPosition + 8, contentWidth - 20, 8);
          yPosition += 6;

          if (obj.status) {
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(107, 114, 128);
            doc.text(`Status: ${obj.status}`, margin + 12, yPosition);
            yPosition += 4;
          }

          if (obj.comments) {
            doc.setFont('helvetica', 'italic');
            yPosition = addWrappedText(`Comments: ${obj.comments}`, margin + 12, yPosition, contentWidth - 20, 8);
            yPosition += 4;
          }

          yPosition += 8;
        });
      }

      yPosition += 5;
    });

    yPosition += 8;
  });

  // Enhanced Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 15;

    // Footer background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, footerY - 5, pageWidth, 15, 'F');

    // Footer border
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.line(0, footerY - 5, pageWidth, footerY - 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);

    // Left side - company info
    doc.text('CG360 - Professional Document Management', margin, footerY + 2);

    // Center - page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY + 2, { align: 'center' });

    // Right side - generation info
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, pageWidth - margin, footerY + 2, { align: 'right' });
  }

  return doc.output('arraybuffer') as Uint8Array;
}

function formatAppraisalTypeName(appraisalType: string): string {
  return appraisalType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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

  // Employee Details Section
  const employeeDetails = [];
  if (formData.employeeName) employeeDetails.push({ label: 'Employee Name', value: formData.employeeName });
  if (formData.role) employeeDetails.push({ label: 'Role', value: formData.role });
  if (formData.appraiser) employeeDetails.push({ label: 'Appraiser', value: formData.appraiser });
  if (formData.date) employeeDetails.push({ label: 'Date of Appraisal', value: formData.date });
  if (formData.period) employeeDetails.push({ label: 'Period Covered', value: formData.period });

  if (employeeDetails.length > 0) {
    sections.push({
      title: 'Employee Details',
      groups: [{
        title: '',
        fields: employeeDetails,
        objectives: undefined
      }]
    });
  }

  // Previous Objectives Section
  if (formData.objectives && Array.isArray(formData.objectives) && formData.objectives.length > 0) {
    sections.push({
      title: 'Review of Previous Objectives',
      groups: [{
        title: '',
        fields: [],
        objectives: formData.objectives
      }]
    });
  }

  // Performance Review Section
  const performanceFields = [];
  if (formData.qualityOfWork) performanceFields.push({ label: 'Quality of Work', value: formData.qualityOfWork });
  if (formData.teamwork) performanceFields.push({ label: 'Teamwork & Communication', value: formData.teamwork });
  if (formData.residentFocus) performanceFields.push({ label: 'Resident/Service User Focus', value: formData.residentFocus });
  if (formData.reliability) performanceFields.push({ label: 'Reliability & Professionalism', value: formData.reliability });

  if (performanceFields.length > 0) {
    sections.push({
      title: 'Performance Review',
      groups: [{
        title: '',
        fields: performanceFields,
        objectives: undefined
      }]
    });
  }

  // Strengths & Achievements Section
  if (formData.strengths) {
    sections.push({
      title: 'Strengths & Achievements',
      groups: [{
        title: '',
        fields: [{ label: 'Key Strengths and Achievements', value: formData.strengths }],
        objectives: undefined
      }]
    });
  }

  // Development Needs Section
  if (formData.development) {
    sections.push({
      title: 'Development Needs',
      groups: [{
        title: '',
        fields: [{ label: 'Areas Requiring Improvement', value: formData.development }],
        objectives: undefined
      }]
    });
  }

  // Next Year Objectives Section
  if (formData.nextObjectives && Array.isArray(formData.nextObjectives) && formData.nextObjectives.length > 0) {
    sections.push({
      title: 'Objectives for the Next Year (SMART)',
      groups: [{
        title: '',
        fields: [],
        objectives: formData.nextObjectives.map((obj: any) => ({
          text: obj.text || obj,
          status: obj.status || '',
          comments: obj.comments || ''
        }))
      }]
    });
  }

  // Training & Career Development Section
  if (formData.training) {
    sections.push({
      title: 'Training & Career Development',
      groups: [{
        title: '',
        fields: [{ label: 'Training Completed and Required', value: formData.training }],
        objectives: undefined
      }]
    });
  }

  // Wellbeing & Support Section
  if (formData.wellbeing) {
    sections.push({
      title: 'Wellbeing & Support',
      groups: [{
        title: '',
        fields: [{ label: 'Workload and Support Assessment', value: formData.wellbeing }],
        objectives: undefined
      }]
    });
  }

  // Overall Rating Section
  if (formData.overallRating) {
    sections.push({
      title: 'Overall Appraisal Rating',
      groups: [{
        title: '',
        fields: [{ label: 'Rating', value: formData.overallRating }],
        objectives: undefined
      }]
    });
  }

  // Comments Section
  const commentsFields = [];
  if (formData.appraiserComments) commentsFields.push({ label: 'Appraiser Comments', value: formData.appraiserComments });
  if (formData.appraiseeComments) commentsFields.push({ label: 'Appraisee Comments', value: formData.appraiseeComments });

  if (commentsFields.length > 0) {
    sections.push({
      title: 'Comments',
      groups: [{
        title: '',
        fields: commentsFields,
        objectives: undefined
      }]
    });
  }

  // Signature Section
  const signatureFields = [];
  if (formData.employeeSignature) signatureFields.push({ label: 'Employee (Appraisee) Signature', value: formData.employeeSignature });
  if (formData.employeeSignatureDate) signatureFields.push({ label: 'Employee Signature Date', value: formData.employeeSignatureDate });
  if (formData.appraiserSignature) signatureFields.push({ label: 'Appraiser Signature', value: formData.appraiserSignature });
  if (formData.appraiserSignatureDate) signatureFields.push({ label: 'Appraiser Signature Date', value: formData.appraiserSignatureDate });
  if (formData.signature && !formData.employeeSignature) signatureFields.push({ label: 'Signature', value: formData.signature });
  if (formData.date && !formData.employeeSignatureDate) signatureFields.push({ label: 'Date Signed', value: formData.date });

  if (signatureFields.length > 0) {
    sections.push({
      title: 'Digital Signature & Verification',
      groups: [{
        title: '',
        fields: signatureFields,
        objectives: undefined
      }]
    });
  }

  // Fallback: Add any remaining fields that weren't categorized
  const categorizedFields = new Set([
    'employeeName', 'role', 'appraiser', 'date', 'period',
    'objectives', 'qualityOfWork', 'teamwork', 'residentFocus', 'reliability',
    'strengths', 'development', 'nextObjectives', 'training', 'wellbeing',
    'overallRating', 'appraiserComments', 'appraiseeComments',
    'signature', 'employeeSignature', 'employeeSignatureDate', 'appraiserSignature', 'appraiserSignatureDate'
  ]);

  const remainingFields = Object.entries(formData)
    .filter(([key]) => !categorizedFields.has(key))
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      value: value as string
    }));

  if (remainingFields.length > 0) {
    sections.push({
      title: 'Additional Information',
      groups: [{
        title: '',
        fields: remainingFields,
        objectives: undefined
      }]
    });
  }

  return sections;
}

export function getAppraisalPDFFilename(appraisalType: string, month: number, year: number = 2025): string {
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
  const sanitizedAppraisalType = appraisalType.replace(/-/g, '_').replace(/\s+/g, '_');

  return `${sanitizedAppraisalType}_${monthName}_${year}.pdf`;
}