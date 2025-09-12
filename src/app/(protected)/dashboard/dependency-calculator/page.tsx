"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import jsPDF from 'jspdf';

import {
  StatsOverview,
  NDPSBandChart,
  CareTimeBreakdown,
  HistoricalTrendsChart,
  ResidentAssessmentModal,
  ResidentAssessmentEditModal,
  type Resident,
  type Community,
  type ChartData,
  type DependencyLevel,
  type Shift
} from "./components";

// NPDS Assessment Fields - Based on authentic Northwick Park Dependency Score methodology
const NPDS_FIELDS = [
  // Basic Care Needs (BCN) - 12 items, max score 65
  { key: "bcn_mobility", label: "Mobility", section: "BCN", maxScore: 5 },
  { key: "bcn_transfers", label: "Transfers", section: "BCN", maxScore: 5 },
  { key: "bcn_washing", label: "Washing", section: "BCN", maxScore: 5 },
  { key: "bcn_dressing", label: "Dressing", section: "BCN", maxScore: 5 },
  { key: "bcn_toileting", label: "Toileting", section: "BCN", maxScore: 5 },
  { key: "bcn_continence", label: "Continence", section: "BCN", maxScore: 5 },
  { key: "bcn_feeding", label: "Feeding", section: "BCN", maxScore: 5 },
  { key: "bcn_turning", label: "Turning in Bed", section: "BCN", maxScore: 5 },
  { key: "bcn_getting_up", label: "Getting Up", section: "BCN", maxScore: 5 },
  { key: "bcn_bed_mobility", label: "Bed Mobility", section: "BCN", maxScore: 5 },
  { key: "bcn_walking", label: "Walking", section: "BCN", maxScore: 5 },
  { key: "bcn_stairs", label: "Stairs", section: "BCN", maxScore: 5 },

  // Special Nursing Needs (SNN) - 5 items, max score 25
  { key: "snn_breathing", label: "Breathing", section: "SNN", maxScore: 5 },
  { key: "snn_drugs", label: "Drugs/Medication", section: "SNN", maxScore: 5 },
  { key: "snn_skin_care", label: "Skin Care", section: "SNN", maxScore: 5 },
  { key: "snn_treatment", label: "Treatment", section: "SNN", maxScore: 5 },
  { key: "snn_observation", label: "Observation", section: "SNN", maxScore: 5 },

  // Therapy Needs - 3 items, max score 10
  { key: "therapy_communication", label: "Communication", section: "THERAPY", maxScore: 5 },
  { key: "therapy_cognitive", label: "Cognitive", section: "THERAPY", maxScore: 5 },
  { key: "therapy_behaviour", label: "Behaviour", section: "THERAPY", maxScore: 5 },
];

// Community colors for visual distinction
const COMMUNITY_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
  'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
];

// Returns an object with all NPDS fields set to ""
function getDefaultAssessment(): Omit<Resident, "name" | "room"> {
  const assessment: any = {};
  NPDS_FIELDS.forEach(field => {
    assessment[field.key] = "";
  });
  return assessment;
}

// Generate PDF Report
function generatePDFReport(
  residents: Resident[],
  communities: Community[],
  selectedCommunity: string | null,
  workspace: any,
  calculateNDPSScore: (resident: Resident) => number,
  getNDPSBand: (score: number) => { band: number; name: string },
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number },
  calculateNDPSStaffing: (residents: Resident[]) => { Day: number; Night: number },
  generateChartData: (residents: Resident[], months: number) => ChartData[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Helper function to draw a simple bar chart
  const drawBarChart = (data: { label: string; value: number; color: string }[], x: number, y: number, width: number, height: number) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = width / data.length;
    const scale = height / maxValue;

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = item.value * scale;
      const barX = x + (index * barWidth) + 2;
      const barY = y + height - barHeight;

      doc.setFillColor(item.color);
      doc.rect(barX, barY, barWidth - 4, barHeight, 'F');

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, barX + (barWidth - 4) / 2, y + height + 8, { align: 'center' });

      // Value
      doc.text(item.value.toString(), barX + (barWidth - 4) / 2, barY - 2, { align: 'center' });
    });
  };

  // Header with Logo and Company Info
  doc.setFillColor(41, 128, 185); // Blue background
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Simple logo placeholder (you can replace with actual logo)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 10, 25, 20, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 128, 185);
  doc.text('DF', 22, 22);

  // Company header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DocuFlow', 50, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Care Documentation Platform', 50, 30);

  yPosition = 50;

  // Workspace/Home Name
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Workspace:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(workspace?.name || 'Default Workspace', 70, yPosition);
  yPosition += 10;

  // Report Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Dependency Calculator Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date and Community
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Generated: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  if (selectedCommunity) {
    const communityName = communities.find(c => c.id === selectedCommunity)?.name;
    doc.text(`Community: ${communityName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  } else {
    doc.text('All Communities', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Executive Summary
  checkNewPage(80);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, yPosition);
  yPosition += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const totalResidents = residents.length;
  const filteredResidents = selectedCommunity ? residents.filter(r => r.communityId === selectedCommunity) : residents;
  const avgNDPSScore = filteredResidents.length > 0
    ? filteredResidents.reduce((sum, r) => sum + calculateNDPSScore(r), 0) / filteredResidents.length
    : 0;

  const staffing = calculateNDPSStaffing(filteredResidents);

  // Summary metrics in a nice layout
  const summaryMetrics = [
    { label: 'Total Residents:', value: filteredResidents.length.toString() },
    { label: 'Average NDPS Score:', value: avgNDPSScore.toFixed(1) },
    { label: 'Recommended Day Staff:', value: staffing.Day.toString() },
    { label: 'Recommended Night Staff:', value: staffing.Night.toString() },
  ];

  summaryMetrics.forEach((metric, index) => {
    const colX = index % 2 === 0 ? 20 : pageWidth / 2;
    const colY = yPosition + Math.floor(index / 2) * 8;
    doc.text(`${metric.label} ${metric.value}`, colX, colY);
  });

  yPosition += 25;

  //Band Distribution Chart
  checkNewPage(80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Band Distribution', 20, yPosition);
  yPosition += 10;

  // Calculate band distribution
  const bandCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  filteredResidents.forEach(resident => {
    const score = calculateNDPSScore(resident);
    const band = getNDPSBand(score).band;
    bandCounts[band as keyof typeof bandCounts]++;
  });

  const bandData = [
    { label: 'Band 1', value: bandCounts[1], color: '#10B981' },
    { label: 'Band 2', value: bandCounts[2], color: '#3B82F6' },
    { label: 'Band 3', value: bandCounts[3], color: '#F59E0B' },
    { label: 'Band 4', value: bandCounts[4], color: '#F97316' },
    { label: 'Band 5', value: bandCounts[5], color: '#EF4444' },
  ];

  drawBarChart(bandData, 20, yPosition, pageWidth - 40, 60);
  yPosition += 80;

  // Community Breakdown
  if (communities.length > 0) {
    checkNewPage(60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Community Breakdown', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    communities.forEach(community => {
      const communityResidents = residents.filter(r => r.communityId === community.id);
      if (communityResidents.length > 0) {
        checkNewPage(15);
        doc.text(`${community.name}: ${communityResidents.length} residents`, 20, yPosition);
        yPosition += 6;

        // Show NDPS distribution for this community
        const communityBands = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        communityResidents.forEach(resident => {
          const score = calculateNDPSScore(resident);
          const band = getNDPSBand(score).band;
          communityBands[band as keyof typeof communityBands]++;
        });

        const bandSummary = Object.entries(communityBands)
          .filter(([_, count]) => count > 0)
          .map(([band, count]) => `Band ${band}: ${count}`)
          .join(', ');

        doc.setFontSize(8);
        doc.text(`NDPS Distribution: ${bandSummary}`, 30, yPosition);
        yPosition += 6;
        doc.setFontSize(10);
      }
    });
    yPosition += 10;
  }

  // Care Time Analysis
  checkNewPage(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Care Time Analysis', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const totalDayMinutes = filteredResidents.reduce((s, r) => s + calculateResidentCareMinutes(r).Day, 0);
  const totalNightMinutes = filteredResidents.reduce((s, r) => s + calculateResidentCareMinutes(r).Night, 0);
  const totalDayHours = Math.round((totalDayMinutes / 60) * 100) / 100;
  const totalNightHours = Math.round((totalNightMinutes / 60) * 100) / 100;

  doc.text(`Total Day Care Time: ${totalDayHours} hours`, 20, yPosition);
  yPosition += 6;
  doc.text(`Total Night Care Time: ${totalNightHours} hours`, 20, yPosition);
  yPosition += 6;
  doc.text(`Average Day Care per Resident: ${(totalDayHours / filteredResidents.length).toFixed(1)} hours`, 20, yPosition);
  yPosition += 6;
  doc.text(`Average Night Care per Resident: ${(totalNightHours / filteredResidents.length).toFixed(1)} hours`, 20, yPosition);
  yPosition += 15;

  // Resident Details Table
  checkNewPage(100);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resident Details', 20, yPosition);
  yPosition += 10;

  // Table headers
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const headers = ['Name', 'Room', 'NDPS Score', 'Band', 'Day Care (h)', 'Night Care (h)'];
  const colWidths = [35, 20, 25, 30, 30, 30];
  let xPos = 20;

  headers.forEach((header, index) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[index];
  });

  yPosition += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  filteredResidents.forEach(resident => {
    checkNewPage(12);
    xPos = 20;

    const ndpsScore = calculateNDPSScore(resident);
    const ndpsBand = getNDPSBand(ndpsScore);
    const careTime = calculateResidentCareMinutes(resident);

    const rowData = [
      resident.name || 'Unnamed',
      resident.room || '-',
      ndpsScore.toString(),
      `Band ${ndpsBand.band}`,
      (careTime.Day / 60).toFixed(1),
      (careTime.Night / 60).toFixed(1)
    ];

    rowData.forEach((data, index) => {
      // Truncate long names if necessary
      const displayText = data.length > 15 ? data.substring(0, 12) + '...' : data;
      doc.text(displayText, xPos, yPosition);
      xPos += colWidths[index];
    });

    yPosition += 6;
  });

  yPosition += 10;

  // Historical Trends (last 6 months)
  checkNewPage(80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Historical Trends (Last 6 Months)', 20, yPosition);
  yPosition += 10;

  const historicalData = generateChartData(filteredResidents, 6);
  if (historicalData.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Simple trend table
    const trendHeaders = ['Month', 'Avg NDPS', 'Care Hours', 'Staff Required'];
    xPos = 20;

    trendHeaders.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += 35;
    });

    yPosition += 8;

    historicalData.slice(-6).forEach(data => {
      checkNewPage(12);
      xPos = 20;
      const rowData = [
        data.date,
        data.ndpsScore.toFixed(1),
        data.careHours.toFixed(1),
        data.staffRequired.toString()
      ];

      rowData.forEach((data, index) => {
        doc.text(data, xPos, yPosition);
        xPos += 35;
      });

      yPosition += 6;
    });
  }

  // Methodology Section
  checkNewPage(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Assessment Methodology', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const methodologyText = 'This report uses the National Dependency Projection System (NDPS) methodology, which provides an evidence-based approach to assessing resident dependency levels and calculating required staffing ratios. The NDPS system categorizes residents into five dependency bands based on their care needs and activities of daily living.';
  const methodologyLines = doc.splitTextToSize(methodologyText, pageWidth - 40);
  doc.text(methodologyLines, 20, yPosition);
  yPosition += methodologyLines.length * 5 + 10;

  // Recommendations Section
  checkNewPage(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Staffing Recommendations', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const totalCareHours = filteredResidents.reduce((total, resident) => {
    const care = calculateResidentCareMinutes(resident);
    return total + (care.Day + care.Night) / 60;
  }, 0);
  const recommendedStaffing = calculateNDPSStaffing(filteredResidents);

  const recommendationsText = `Based on the current resident dependency profile, the following staffing recommendations are suggested:

• Total Required Care Hours: ${totalCareHours.toFixed(1)} hours per week
• Recommended Day Staff: ${recommendedStaffing.Day} carers (12-hour shifts)
• Recommended Night Staff: ${recommendedStaffing.Night} carers (12-hour shifts)
• Resident-to-Staff Ratio: ${Math.round(filteredResidents.length / (recommendedStaffing.Day + recommendedStaffing.Night))}:1

These recommendations should be reviewed in conjunction with local policies and regulatory requirements. The NDPS methodology provides evidence-based staffing calculations that ensure appropriate care levels for all dependency bands.`;
  const recommendationLines = doc.splitTextToSize(recommendationsText, pageWidth - 40);
  doc.text(recommendationLines, 20, yPosition);
  yPosition += recommendationLines.length * 5 + 10;

  // Footer with generation info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated by DocuFlow - ${workspace?.name || 'Default Workspace'}`, 20, pageHeight - 15);
  doc.text(`Report Date: ${reportDate}`, 20, pageHeight - 10);
  doc.text(`Total Residents: ${filteredResidents.length}`, pageWidth - 60, pageHeight - 15);
  doc.text(`NDPS Methodology v2.0`, pageWidth - 60, pageHeight - 10);

  // Save the PDF
  const fileName = selectedCommunity
    ? `dependency-report-${communities.find(c => c.id === selectedCommunity)?.name}-${new Date().toISOString().split('T')[0]}.pdf`
    : `dependency-report-all-communities-${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(fileName);
}

// Generate chart data for historical trends
function generateChartData(residents: Resident[], months: number): ChartData[] {
  const data: ChartData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Simulate historical data with some variation
    const baseMultiplier = 0.8 + Math.random() * 0.4; // 80-120% variation
    const residentCount = Math.round(residents.length * baseMultiplier);

    let totalNDPSScore = 0;
    let totalCareHours = 0;

    residents.forEach(resident => {
      const score = calculateNDPSScore(resident);
      const care = calculateResidentCareMinutes(resident);
      totalNDPSScore += score * baseMultiplier;
      totalCareHours += (care.Day + care.Night) / 60 * baseMultiplier;
    });

    const avgNDPSScore = residentCount > 0 ? totalNDPSScore / residentCount : 0;
    const staffRequired = calculateNDPSStaffing(residents);

    data.push({
      date: dateStr,
      ndpsScore: Math.round(avgNDPSScore * 10) / 10,
      careHours: Math.round(totalCareHours * 10) / 10,
      staffRequired: staffRequired.Day + staffRequired.Night,
      residentCount
    });
  }

  return data;
}

// Care minutes per dependency level for each care area (values from provided screenshot).
// Separate maps for Day and Night so day/night estimates use distinct values per field.
const MINUTES_BY_FIELD_DAY: Record<string, Record<DependencyLevel, number>> = {
  personalCare: { "": 0, None: 0, Low: 10, Medium: 20, High: 30 },
  eatingDrinking: { "": 0, None: 0, Low: 5, Medium: 15, High: 25 },
  medical: { "": 0, None: 0, Low: 5, Medium: 10, High: 20 },
  mobility: { "": 0, None: 0, Low: 5, Medium: 15, High: 25 },
  continence: { "": 0, None: 0, Low: 5, Medium: 10, High: 20 },
  skinIntegrity: { "": 0, None: 0, Low: 5, Medium: 10, High: 20 },
  medication: { "": 0, None: 0, Low: 5, Medium: 10, High: 15 },
  emotionalSupport: { "": 0, None: 0, Low: 5, Medium: 10, High: 15 },
  cognition: { "": 0, None: 0, Low: 5, Medium: 10, High: 20 },
  nightNeeds: { "": 0, None: 0, Low: 5, Medium: 10, High: 20 },
  additionalNeeds: { "": 0, None: 0, Low: 0, Medium: 10, High: 20 },
  behaviours: { "": 0, None: 0, Low: 0, Medium: 10, High: 20 },
  breathing: { "": 0, None: 0, Low: 0, Medium: 10, High: 20 },
};

const MINUTES_BY_FIELD_NIGHT: Record<string, Record<DependencyLevel, number>> = {
  personalCare: { "": 0, None: 0, Low: 5, Medium: 10, High: 15 },
  eatingDrinking: { "": 0, None: 0, Low: 3, Medium: 8, High: 13 },
  medical: { "": 0, None: 0, Low: 3, Medium: 5, High: 10 },
  mobility: { "": 0, None: 0, Low: 3, Medium: 8, High: 13 },
  continence: { "": 0, None: 0, Low: 3, Medium: 5, High: 10 },
  skinIntegrity: { "": 0, None: 0, Low: 3, Medium: 5, High: 10 },
  medication: { "": 0, None: 0, Low: 3, Medium: 5, High: 8 },
  emotionalSupport: { "": 0, None: 0, Low: 3, Medium: 5, High: 8 },
  cognition: { "": 0, None: 0, Low: 3, Medium: 5, High: 10 },
  nightNeeds: { "": 0, None: 0, Low: 3, Medium: 5, High: 10 },
  additionalNeeds: { "": 0, None: 0, Low: 0, Medium: 5, High: 10 },
  behaviours: { "": 0, None: 0, Low: 0, Medium: 5, High: 10 },
  breathing: { "": 0, None: 0, Low: 0, Medium: 5, High: 10 },
};

// Mapping from NPDS field keys to care time calculation keys
const FIELD_MAPPING: Record<string, string> = {
  // Basic Care Needs (BCN) - Mobility
  "bcn_mobility": "mobility",
  "bcn_transfers": "mobility",
  "bcn_bed_mobility": "mobility",
  "bcn_walking": "mobility",
  "bcn_stairs": "mobility",

  // Basic Care Needs (BCN) - Personal Care
  "bcn_washing": "personalCare",
  "bcn_dressing": "personalCare",
  "bcn_toileting": "personalCare",

  // Basic Care Needs (BCN) - Other
  "bcn_continence": "continence",
  "bcn_feeding": "eatingDrinking",
  "bcn_turning": "mobility",
  "bcn_getting_up": "mobility",

  // Special Nursing Needs (SNN)
  "snn_breathing": "breathing",
  "snn_drugs": "medication",
  "snn_skin_care": "skinIntegrity",
  "snn_treatment": "medical",
  "snn_observation": "medical",

  // Therapy Needs
  "therapy_communication": "emotionalSupport",
  "therapy_cognitive": "cognition",
  "therapy_behaviour": "behaviours",
};

// Helper to ceil to nearest 0.25
function ceilToQuarter(x: number) {
  return Math.ceil(x * 4) / 4;
}

// Ceil to nearest half (0.5)
function ceilToHalf(x: number) {
  return Math.ceil(x * 2) / 2;
}

// Return per-resident totals in minutes for Day and Night
function calculateResidentCareMinutes(resident: Resident): { Day: number; Night: number } {
  let dayMinutes = 0;
  let nightMinutes = 0;
  for (const field of NPDS_FIELDS) {
    const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
    const careTimeKey = FIELD_MAPPING[field.key];
    if (careTimeKey) {
      const dayMap = MINUTES_BY_FIELD_DAY[careTimeKey] as Record<DependencyLevel, number> | undefined;
      const nightMap = MINUTES_BY_FIELD_NIGHT[careTimeKey] as Record<DependencyLevel, number> | undefined;
      dayMinutes += dayMap?.[level as DependencyLevel] ?? 0;
      nightMinutes += nightMap?.[level as DependencyLevel] ?? 0;
    }
  }
  return { Day: Math.round(dayMinutes), Night: Math.round(nightMinutes) };
}

// Calculate NPDS score for a resident (0-100 scale)
function calculateNDPSScore(resident: Resident): number {
  let bcnScore = 0;
  let snnScore = 0;
  let therapyScore = 0;

  for (const field of NPDS_FIELDS) {
    const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
    let score = 0;

    // Convert dependency level to numeric score
    switch (level) {
      case "None": score = 0; break;
      case "Low": score = 1; break;
      case "Medium": score = 2; break;
      case "High": score = 3; break;
      default: score = 0;
    }

    // Add to appropriate section total
    switch (field.section) {
      case "BCN": bcnScore += score; break;
      case "SNN": snnScore += score; break;
      case "THERAPY": therapyScore += score; break;
    }
  }

  // Cap section scores at maximums
  bcnScore = Math.min(bcnScore, 65);
  snnScore = Math.min(snnScore, 25);
  therapyScore = Math.min(therapyScore, 10);

  return bcnScore + snnScore + therapyScore;
}

// Get NDPS band from score
function getNDPSBand(score: number): { band: number; name: string } {
  if (score <= 5) return { band: 1, name: "Independent" };
  if (score <= 10) return { band: 2, name: "Low Dependency" };
  if (score <= 15) return { band: 3, name: "Medium Dependency" };
  if (score <= 20) return { band: 4, name: "High Dependency" };
  return { band: 5, name: "Very High Dependency" };
}

// NDPS staffing ratios for 12-hour shifts (carers per resident)
const NDPS_STAFFING_RATIOS_DAY = {
  1: 1 / 8,  // 1 carer per 8 residents (higher staffing during day)
  2: 1 / 5,  // 1 carer per 5 residents
  3: 1 / 3,  // 1 carer per 3 residents
  4: 1 / 2,  // 1 carer per 2 residents
  5: 1 / 1.5, // 1 carer per 1.5 residents (very high dependency)
};

const NDPS_STAFFING_RATIOS_NIGHT = {
  1: 1 / 15, // 1 carer per 15 residents (lower staffing at night)
  2: 1 / 10, // 1 carer per 10 residents
  3: 1 / 6,  // 1 carer per 6 residents
  4: 1 / 4,  // 1 carer per 4 residents
  5: 1 / 2.5, // 1 carer per 2.5 residents
};

// Calculate NDPS-based staffing for a list of residents
function calculateNDPSStaffing(residents: Resident[]): { Day: number; Night: number } {
  const bandCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  residents.forEach(resident => {
    const score = calculateNDPSScore(resident);
    const band = getNDPSBand(score).band;
    bandCounts[band as keyof typeof bandCounts]++;
  });

  let dayStaff = 0;
  let nightStaff = 0;

  for (const band of [1, 2, 3, 4, 5] as const) {
    dayStaff += bandCounts[band] * NDPS_STAFFING_RATIOS_DAY[band];
    nightStaff += bandCounts[band] * NDPS_STAFFING_RATIOS_NIGHT[band];
  }

  return {
    Day: Math.ceil(dayStaff),
    Night: Math.ceil(nightStaff),
  };
}

// Calculate breakdown of nurses and CTMs from total staff
function calculateStaffBreakdown(residents: Resident[]): { 
  Day: { nurses: number; ctms: number; carers: number; total: number }; 
  Night: { nurses: number; ctms: number; carers: number; total: number } 
} {
  const totalStaffing = calculateNDPSStaffing(residents);
  
  // Debug: Log the input data
  console.log('=== STAFF BREAKDOWN DEBUG ===');
  console.log('Total residents:', residents.length);
  console.log('Total staffing needed:', totalStaffing);
  
  // Fixed CTMs: 1 per shift
  const dayCTMs = 1;
  const nightCTMs = 1;
  
  // Calculate remaining staff after CTMs
  const dayRemainingStaff = Math.max(0, totalStaffing.Day - dayCTMs);
  const nightRemainingStaff = Math.max(0, totalStaffing.Night - nightCTMs);
  
  // Analyze resident dependency profile to determine nurse/carer split
  let highDependencyCount = 0; // Band 4-5
  let mediumDependencyCount = 0; // Band 3
  let lowDependencyCount = 0; // Band 1-2
  
  residents.forEach(resident => {
    const score = calculateNDPSScore(resident);
    const band = getNDPSBand(score).band;
    console.log(`Resident ${resident.name}: Score ${score}, Band ${band}`);
    
    if (band >= 4) highDependencyCount++;
    else if (band === 3) mediumDependencyCount++;
    else lowDependencyCount++;
  });
  
  console.log('Dependency breakdown:', { 
    high: highDependencyCount, 
    medium: mediumDependencyCount, 
    low: lowDependencyCount 
  });
  
  // Calculate nurse percentage based on dependency profile
  const totalResidents = residents.length;
  let dayNurses = 0;
  let nightNurses = 0;
  
  if (totalResidents > 0) {
    // More direct approach: ensure nurses for high dependency residents
    if (highDependencyCount > 0) {
      // Minimum 1 nurse per shift if any high dependency residents
      // Plus additional nurses for multiple high dependency residents
      dayNurses = Math.max(1, Math.ceil(highDependencyCount * 0.5));
      nightNurses = Math.max(1, Math.ceil(highDependencyCount * 0.3));
    } else if (mediumDependencyCount >= 3) {
      // If 3+ medium dependency residents, consider 1 nurse for day shift
      dayNurses = 1;
      nightNurses = 0;
    }
    
    // Ensure we don't exceed remaining staff
    dayNurses = Math.min(dayNurses, dayRemainingStaff);
    nightNurses = Math.min(nightNurses, nightRemainingStaff);
  }
  
  console.log('Calculated nurses - Day:', dayNurses, 'Night:', nightNurses);
  
  // Remaining staff are carers
  const dayCarers = dayRemainingStaff - dayNurses;
  const nightCarers = nightRemainingStaff - nightNurses;
  
  console.log('Staff allocation:');
  console.log('Day - Nurses:', dayNurses, 'CTMs:', dayCTMs, 'Carers:', dayCarers);
  console.log('Night - Nurses:', nightNurses, 'CTMs:', nightCTMs, 'Carers:', nightCarers);

  const result = {
    Day: {
      nurses: dayNurses,
      ctms: dayCTMs,
      carers: dayCarers,
      total: dayNurses + dayCTMs + dayCarers
    },
    Night: {
      nurses: nightNurses,
      ctms: nightCTMs,
      carers: nightCarers,
      total: nightNurses + nightCTMs + nightCarers
    }
  };
  
  console.log('Final breakdown:', result);
  console.log('=== END DEBUG ===');
  
  return result;
}

// Calculate per-resident staffing needs based on NDPS band
function calculateResidentStaffing(resident: Resident): { Day: number; Night: number } {
  const score = calculateNDPSScore(resident);
  const band = getNDPSBand(score).band;

  return {
    Day: NDPS_STAFFING_RATIOS_DAY[band as keyof typeof NDPS_STAFFING_RATIOS_DAY],
    Night: NDPS_STAFFING_RATIOS_NIGHT[band as keyof typeof NDPS_STAFFING_RATIOS_NIGHT],
  };
}

// Compare rooms numerically when possible, otherwise fallback to string compare
function compareRooms(a?: string, b?: string) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const an = parseFloat(a.replace(/[^0-9.]/g, ''));
  const bn = parseFloat(b.replace(/[^0-9.]/g, ''));
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  return a.localeCompare(b);
}

// Merge two resident arrays preferring newer per-resident updatedAt timestamps
function mergeResidents(local: any[], remote: any[]): Resident[] {
  const map = new Map<string, Resident>();
  const all = [...(local || []), ...(remote || [])]; // process local first, then remote; newer updatedAt wins
  for (const item of all) {
    const id = item.id || `${item.name || ''}-${item.room || ''}`;
    const existing = map.get(id);
    const normalized: Resident = {
      name: typeof item.name === 'string' ? item.name : '',
      room: typeof item.room === 'string' ? item.room : '',
      ...getDefaultAssessment(),
      ...item,
      id,
    } as Resident;
    if (!existing) {
      map.set(id, normalized);
      continue;
    }
    const existingTs = existing.updatedAt ?? existing.createdAt ?? 0;
    const incomingTs = normalized.updatedAt ?? normalized.createdAt ?? 0;
    if (incomingTs >= existingTs) map.set(id, { ...existing, ...normalized });
  }
  return Array.from(map.values());
}

function genId() {
  try {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function timeAgo(ts?: number) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Only one export default function
export default function DependencyCalculatorPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const { user, loading: authLoading } = useAuth();
  const workspace = useWorkspace();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [step, setStep] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
    const [form, setForm] = useState<Resident>({
      name: "",
      room: "",
      ...getDefaultAssessment(),
      communityId: null,
    });
  const [staff, setStaff] = useState<Record<Shift, number>>({ Day: 0, Night: 0 });
  const [staffActual, setStaffActual] = useState<{
    Day: { nurse: number; ctm: number; senior: number; carer: number };
    Night: { nurse: number; ctm: number; senior: number; carer: number };
  }>({
    Day: { nurse: 0, ctm: 0, senior: 0, carer: 0 },
    Night: { nurse: 0, ctm: 0, senior: 0, carer: 0 },
  });

  // UX Enhancement States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load snapshots from localStorage on mount
  React.useEffect(() => {
    // Snapshot functionality removed - data is now automatically saved
  }, []);

    function openAddModal() {
  setForm({ name: "", room: "", ...getDefaultAssessment(), communityId: selectedCommunity ?? null });
      setEditingIndex(null);
      setStep(0);
      setModalOpen(true);
    }

    function openEditAssessmentModal(resident: Resident) {
      setEditingResident(resident);
      setEditModalOpen(true);
    }

    function handleSaveAssessment(updatedResident: Resident) {
      setResidents(prev => prev.map(r => r.id === updatedResident.id ? updatedResident : r));
      setEditModalOpen(false);
      setEditingResident(null);
    }

      function deleteResidentById(id?: string | null) {
        if (!id) return;
        if (!confirm('Delete resident? This action cannot be undone.')) return;
        // remove resident from residents list
        setResidents(prev => prev.filter(r => r.id !== id));
        // remove references from communities residentIds and clear communityId from residents
        setCommunities(prev => prev.map(c => ({ ...c, residentIds: (c.residentIds || []).filter(rid => rid !== id) })));
        setResidents(prev => prev.map(r => r.communityId === id ? { ...r, communityId: null } : r));
        // close modal if the deleted resident was being edited
        if (editingIndex !== null && residents[editingIndex]?.id === id) {
          setModalOpen(false);
          setEditingIndex(null);
        }
      }

    function handleNext() {
      // add an extra step for community selection after the NPDS fields
      if (step < NPDS_FIELDS.length + 1) setStep(step + 1);
      else if (step === NPDS_FIELDS.length + 1) setStep(step + 1);
    }    const [stepError, setStepError] = React.useState<string | null>(null);

    function attemptNext() {
      if (!isStepValid(step)) {
        if (step === 0) {
          // Check for specific validation errors
          if (form.name.trim() === "" || form.room.trim() === "") {
            setStepError("Please enter a Name and Room before continuing.");
          } else {
            // Check for duplicate room
            const roomExists = residents.some((resident, index) => {
              if (editingIndex !== null && index === editingIndex) {
                return false;
              }
              return resident.room.trim().toLowerCase() === form.room.trim().toLowerCase();
            });
            if (roomExists) {
              setStepError(`Room "${form.room}" is already assigned to another resident. Please choose a different room number.`);
            } else {
              setStepError("Please enter a Name and Room before continuing.");
            }
          }
        }
        else if (step > 0 && step <= NPDS_FIELDS.length) setStepError(`Please select ${NPDS_FIELDS[step - 1].label}.`);
        else setStepError("Please select a community or choose None.");
        return;
      }
      setStepError(null);
      handleNext();
    }

    async function attemptSave() {
      if (!isAllValid()) {
        // Check for specific validation errors
        if (form.name.trim() === "" || form.room.trim() === "") {
          setStepError("Please complete all required fields before saving.");
        } else {
          // Check for duplicate room
          const roomExists = residents.some((resident, index) => {
            if (editingIndex !== null && index === editingIndex) {
              return false;
            }
            return resident.room.trim().toLowerCase() === form.room.trim().toLowerCase();
          });
          if (roomExists) {
            setStepError(`Room "${form.room}" is already assigned to another resident. Please choose a different room number.`);
          } else {
            setStepError("Please complete all steps before saving.");
          }
        }
        return;
      }
      setStepError(null);
      await handleSave();
    }
    function handleBack() {
      if (step > 0) setStep(step - 1);
    }
    function handleChange(e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  
    // Validation: ensure each step is completed before allowing Next
    function isStepValid(s: number) {
      if (s === 0) {
        // Check basic validation
        if (form.name.trim() === "" || form.room.trim() === "") {
          return false;
        }
        
        // Check for duplicate room numbers
        const roomExists = residents.some((resident, index) => {
          // If editing, exclude the current resident from the check
          if (editingIndex !== null && index === editingIndex) {
            return false;
          }
          return resident.room.trim().toLowerCase() === form.room.trim().toLowerCase();
        });
        
        if (roomExists) {
          return false;
        }
        
        return true;
      }
      if (s > 0 && s <= NPDS_FIELDS.length) {
        const key = NPDS_FIELDS[s - 1].key as keyof Resident;
        const val = form[key] as DependencyLevel | undefined;
      return val === "None" || val === "Low" || val === "Medium" || val === "High";
      }
      if (s === NPDS_FIELDS.length + 1) return true; // community selection optional
      return true;
    }

    function isAllValid() {
      if (form.name.trim() === "" || form.room.trim() === "") return false;
      
      // Check for duplicate room numbers
      const roomExists = residents.some((resident, index) => {
        if (editingIndex !== null && index === editingIndex) {
          return false;
        }
        return resident.room.trim().toLowerCase() === form.room.trim().toLowerCase();
      });
      
      if (roomExists) return false;
      
      for (const f of NPDS_FIELDS) {
        const val = form[f.key as keyof Resident] as DependencyLevel | undefined;
        if (!(val === "None" || val === "Low" || val === "Medium" || val === "High")) return false;
      }
      return true;
    }
  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const now = Date.now();
      const item: Resident = {
        ...form,
        id: form.id || genId(),
        createdAt: form.createdAt || now,
        updatedAt: now,
        updatedBy: user?.id ?? null,
      } as Resident;

      if (editingIndex !== null) {
        const updated = [...residents];
        updated[editingIndex] = item;
        setResidents(updated);
      } else {
        setResidents([...residents, item]);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setModalOpen(false);
        setStep(0);
        setForm({ name: "", room: "", ...getDefaultAssessment(), communityId: selectedCommunity ?? null });
        setEditingIndex(null);
      }, 1500);

    } catch (error) {
      setSaveError("Failed to save resident. Please try again.");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }

  // Calculate dependency counts
  const dependencyCounts = residents.reduce(
    (acc: { Low: number; Medium: number; High: number; Total: number }, r: Resident) => {
      let found = false;
      for (const f of NPDS_FIELDS) {
        const val = r[f.key as keyof Resident] as DependencyLevel | undefined;
  if (val === "High") acc.High++;
  else if (val === "Medium") acc.Medium++;
  else if (val === "Low") acc.Low++;
  // 'None' (No Needs) is intentionally not counted in Low/Medium/High
        if (val === "Low" || val === "Medium" || val === "High") found = true;
      }
      if (found) acc.Total++;
      return acc;
    },
    { Low: 0, Medium: 0, High: 0, Total: 0 }
  );

  // Persistence: load from Firestore if signed in, otherwise localStorage
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      // If user is signed in and workspace is available, prefer Firestore
      if (user && workspace) {
        try {
          const ref = doc(db, "workspaces", workspace.id, "dependency_calculator", "default");
          const snap = await getDoc(ref);

          if (snap.exists()) {
            const data = snap.data();

            if (Array.isArray(data.residents)) {
              const normalized: Resident[] = data.residents.map((p: any) => ({
                name: typeof p.name === "string" ? p.name : "",
                room: typeof p.room === "string" ? p.room : "",
                ...getDefaultAssessment(),
                ...p,
              }));
              if (!cancelled) {
                setResidents(normalized);
                localStorage.setItem("dependency_residents_v1", JSON.stringify(normalized));
              }
            }
            if (Array.isArray(data.communities)) {
              const normalizedComm: Community[] = data.communities.map((c: any) => ({
                id: c.id || genId(),
                name: c.name || "",
                residentIds: Array.isArray(c.residentIds) ? c.residentIds : [],
              }));
              if (!cancelled) {
                setCommunities(normalizedComm);
              }
            }
          } else {
            // Check for old user-scoped data and migrate if found
            try {
              const oldRef = doc(db, "users", user.id, "dependency_calculator", "default");
              const oldSnap = await getDoc(oldRef);
              
              if (oldSnap.exists()) {
                const oldData = oldSnap.data();
                
                // Migrate to new workspace-scoped path
                const migrationData = {
                  ...oldData,
                  migratedAt: serverTimestamp(),
                  migratedFrom: `users/${user.id}/dependency_calculator/default`,
                  schemaVersion: 2
                };
                
                await setDoc(ref, migrationData, { merge: true });
                
                // Set the migrated data
                if (Array.isArray(oldData.residents) && !cancelled) {
                  const normalized: Resident[] = oldData.residents.map((p: any) => ({
                    name: typeof p.name === "string" ? p.name : "",
                    room: typeof p.room === "string" ? p.room : "",
                    ...getDefaultAssessment(),
                    ...p,
                  }));
                  setResidents(normalized);
                  localStorage.setItem("dependency_residents_v1", JSON.stringify(normalized));
                }
                
                if (Array.isArray(oldData.communities) && !cancelled) {
                  const normalizedComm: Community[] = oldData.communities.map((c: any) => ({
                    id: c.id || genId(),
                    name: c.name || "",
                    residentIds: Array.isArray(c.residentIds) ? c.residentIds : [],
                  }));
                  setCommunities(normalizedComm);
                }
                
                // Don't delete old data immediately - let user verify migration worked
                
              } else {
                // fallback to localStorage if no Firebase data found
                const raw = localStorage.getItem("dependency_residents_v1");
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed) && !cancelled) {
                    const normalized: Resident[] = parsed.map((p: any) => ({
                      name: typeof p.name === "string" ? p.name : "",
                      room: typeof p.room === "string" ? p.room : "",
                      ...getDefaultAssessment(),
                      ...p,
                    }));
                    setResidents(normalized);
                  }
                }
                const rawComm = localStorage.getItem("dependency_communities_v1");
                if (rawComm) {
                  try {
                    const parsed = JSON.parse(rawComm);
                    if (Array.isArray(parsed) && !cancelled) setCommunities(parsed);
                  } catch {}
                }
              }
            } catch (migrationError) {
              
              // fallback to localStorage if migration fails
              const raw = localStorage.getItem("dependency_residents_v1");
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && !cancelled) {
                  const normalized: Resident[] = parsed.map((p: any) => ({
                    name: typeof p.name === "string" ? p.name : "",
                    room: typeof p.room === "string" ? p.room : "",
                    ...getDefaultAssessment(),
                    ...p,
                  }));
                  setResidents(normalized);
                }
              }
              const rawComm = localStorage.getItem("dependency_communities_v1");
              if (rawComm) {
                try {
                  const parsed = JSON.parse(rawComm);
                  if (Array.isArray(parsed) && !cancelled) {
                    setCommunities(parsed);
                  }
                } catch {}
              }
            }
          }
        } catch (err) {
          // fallback to localStorage
          try {
            const raw = localStorage.getItem("dependency_residents_v1");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && !cancelled) {
                const normalized: Resident[] = parsed.map((p: any) => ({
                  name: typeof p.name === "string" ? p.name : "",
                  room: typeof p.room === "string" ? p.room : "",
                  ...getDefaultAssessment(),
                  ...p,
                }));
                setResidents(normalized);
              }
            }
            const rawComm = localStorage.getItem("dependency_communities_v1");
            if (rawComm) {
              try {
                const parsed = JSON.parse(rawComm);
                if (Array.isArray(parsed) && !cancelled) {
                  setCommunities(parsed);
                }
              } catch {}
            }
          } catch (e) {
          }
        }
      } else if (user) {
        // Legacy fallback for user-scoped data
        try {
          const ref = doc(db, "users", user.id, "dependency_calculator", "default");
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.residents)) {
              const normalized: Resident[] = data.residents.map((p: any) => ({
                name: typeof p.name === "string" ? p.name : "",
                room: typeof p.room === "string" ? p.room : "",
                ...getDefaultAssessment(),
                ...p,
              }));
              if (!cancelled) {
                setResidents(normalized);
                localStorage.setItem("dependency_residents_v1", JSON.stringify(normalized));
              }
            }
            if (Array.isArray(data.communities)) {
              const normalizedComm: Community[] = data.communities.map((c: any) => ({
                id: c.id || genId(),
                name: c.name || "",
                residentIds: Array.isArray(c.residentIds) ? c.residentIds : [],
              }));
              if (!cancelled) setCommunities(normalizedComm);
            }
          }
        } catch (err) {
        }
      } else {
        // not signed in: use localStorage
        try {
          const raw = localStorage.getItem("dependency_residents_v1");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && !cancelled) {
              const normalized: Resident[] = parsed.map((p: any) => ({
                name: typeof p.name === "string" ? p.name : "",
                room: typeof p.room === "string" ? p.room : "",
                ...getDefaultAssessment(),
                ...p,
              }));
              setResidents(normalized);
            }
          }
        } catch (e) {
        }
      }
    }
  if (!authLoading) load();
    return () => { cancelled = true; };
  }, [user?.id, workspace?.id, authLoading]);

  // Persist: write to localStorage immediately and to Firestore (debounced) when signed in
  React.useEffect(() => {
    try {
      localStorage.setItem("dependency_residents_v1", JSON.stringify(residents));
      localStorage.setItem("dependency_communities_v1", JSON.stringify(communities));
  localStorage.setItem("dependency_staff_actual_v1", JSON.stringify(staffActual));
    } catch (e) {
    }

    if (!user || !workspace) {
      return;
    } // only save to Firestore for authenticated users with workspace

    const ref = doc(db, "workspaces", workspace.id, "dependency_calculator", "default");
    const t = setTimeout(async () => {
      try {
        // include staffActual so the user's main dependency_calculator document stays in sync
        await setDoc(ref, { residents, communities, staffActual, schemaVersion: 1, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
      }
    }, 600);
    return () => clearTimeout(t);
  }, [residents, communities, staffActual, user?.id, workspace?.id]);
  // Expandable resident table component. Accepts optional residentsProp to render a filtered set.
  function ResidentTable({
    residentsProp,
    communities,
    selectedCommunity,
    setSelectedCommunity,
    setCommunities,
    genId,
    openAddModal
  }: {
    residentsProp?: Resident[];
    communities: Community[];
    selectedCommunity: string | null;
    setSelectedCommunity: (community: string | null) => void;
    setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
    genId: () => string;
    openAddModal: () => void;
  }) {
  const list = (residentsProp ?? residents).slice().sort((a, b) => compareRooms(a.room, b.room));
  
  // If no residents to show after filtering, show empty state
  if (list.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {selectedCommunity ? 'No Residents in Selected Community' : 'No Residents Found'}
        </h3>
        <p className="text-gray-600 mb-4">
          {selectedCommunity 
            ? `No residents are currently assigned to ${communities.find(c => c.id === selectedCommunity)?.name}. Try selecting a different community or clear the filter.`
            : 'Get started by adding your first resident to the dependency calculator.'
          }
        </p>
        {selectedCommunity ? (
          <button
            onClick={() => setSelectedCommunity(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-3"
          >
            Clear Filter
          </button>
        ) : (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Resident
          </button>
        )}
      </div>
    );
  }
  // Pooled totals: sum minutes, convert to hours for shifts
  const totalDayMinutes = list.reduce((s, r) => s + calculateResidentCareMinutes(r).Day, 0);
  const totalNightMinutes = list.reduce((s, r) => s + calculateResidentCareMinutes(r).Night, 0);
  const totalDayHours = Math.round((totalDayMinutes / 60) * 100) / 100;
  const totalNightHours = Math.round((totalNightMinutes / 60) * 100) / 100;
  const totalDayShifts = Math.ceil((totalDayHours / 12) * 4) / 4;
  const totalNightShifts = Math.ceil((totalNightHours / 12) * 4) / 4;

  // NDPS calculations
  const ndpsStaffing = calculateNDPSStaffing(list);
  const bandCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  list.forEach(r => {
    const score = calculateNDPSScore(r);
    const band = getNDPSBand(score).band;
    bandCounts[band as keyof typeof bandCounts]++;
  });

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Table Header with Community Controls */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-800">Resident Assessment Data</div>
                <div className="text-sm text-gray-600">Click any row to edit assessment • {list.length} resident{list.length !== 1 ? 's' : ''} • NDPS-based staffing calculations</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Community Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    id="new-community-table"
                    placeholder="New community"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all w-40"
                  />
                  <button
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                    onClick={() => {
                      const el = document.getElementById('new-community-table') as HTMLInputElement | null;
                      if (!el || !el.value.trim()) return;
                      const c: Community = { id: genId(), name: el.value.trim(), residentIds: [] };
                      setCommunities(prev => [...prev, c]);
                      el.value = '';
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>

                <select
                  id="community-select-table"
                  value={selectedCommunity || ""}
                  onChange={(e) => setSelectedCommunity(e.target.value || null)}
                  className="bg-white text-gray-900 text-sm rounded-lg px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                >
                  <option value="">All Communities</option>
                  {communities.map((community) => {
                    const residentCount = residents.filter(r => r.communityId === community.id).length;
                    return (
                      <option key={community.id} value={community.id}>
                        {community.name} ({residentCount} residents)
                      </option>
                    );
                  })}
                </select>
                {selectedCommunity && (
                  <button
                    onClick={() => setSelectedCommunity(null)}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Clear community filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {selectedCommunity && (
                <div className="flex items-center gap-3 bg-blue-50 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="text-sm font-medium text-blue-800">Community: {communities.find(c => c.id === selectedCommunity)?.name}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Resident</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Room</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Band</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Day Care (h)</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Night Care (h)</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">12h Day Carer(s)</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">12h Night Carer(s)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const careMinutes = calculateResidentCareMinutes(r);
                const ndpsScore = calculateNDPSScore(r);
                const ndpsBand = getNDPSBand(ndpsScore);
                const residentStaffing = calculateResidentStaffing(r);
                return (
                  <tr 
                    key={r.id || `${r.name}-${r.room}`}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => openEditAssessmentModal(r)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-700">
                            {(r.name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{r.name || "Unnamed"}</div>
                          {r.updatedAt && (
                            <div className="text-xs text-gray-500">Updated {timeAgo(r.updatedAt)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                        {r.room || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                          ndpsBand.band === 1 ? 'bg-green-100 text-green-800' :
                          ndpsBand.band === 2 ? 'bg-blue-100 text-blue-800' :
                          ndpsBand.band === 3 ? 'bg-yellow-100 text-yellow-800' :
                          ndpsBand.band === 4 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            ndpsBand.band === 1 ? 'bg-green-500' :
                            ndpsBand.band === 2 ? 'bg-blue-500' :
                            ndpsBand.band === 3 ? 'bg-yellow-500' :
                            ndpsBand.band === 4 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}></div>
                          Band {ndpsBand.band}
                        </div>
                        <div className="text-xs text-gray-500">{ndpsBand.name}</div>
                        <div className="text-xs text-gray-400">Score: {ndpsScore}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-blue-50 px-3 py-2 rounded-lg inline-block">
                        <div className="font-mono text-sm font-semibold text-blue-800">
                          {Math.round((careMinutes.Day / 60) * 100) / 100}h
                        </div>
                        <div className="text-xs text-blue-600">
                          12h: {Math.round(ceilToQuarter((careMinutes.Day / 60 / 12)) * 100) / 100}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-indigo-50 px-3 py-2 rounded-lg inline-block">
                        <div className="font-mono text-sm font-semibold text-indigo-800">
                          {Math.round((careMinutes.Night / 60) * 100) / 100}h
                        </div>
                        <div className="text-xs text-indigo-600">
                          12h: {Math.round(ceilToQuarter((careMinutes.Night / 60 / 12)) * 100) / 100}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-green-50 px-3 py-2 rounded-lg inline-block">
                        <div className="font-mono text-sm font-semibold text-green-800">
                          {residentStaffing.Day.toFixed(3)}
                        </div>
                        <div className="text-xs text-green-600">
                          {Math.round(1 / residentStaffing.Day)}:1 ratio
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-purple-50 px-3 py-2 rounded-lg inline-block">
                        <div className="font-mono text-sm font-semibold text-purple-800">
                          {residentStaffing.Night.toFixed(3)}
                        </div>
                        <div className="text-xs text-purple-600">
                          {Math.round(1 / residentStaffing.Night)}:1 ratio
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-t-2 border-gray-200">
                <td className="px-6 py-4" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-gray-800">Summary Totals</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Band 1:</span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">{bandCounts[1]}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Band 2:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">{bandCounts[2]}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Band 3:</span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">{bandCounts[3]}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Band 4:</span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold">{bandCounts[4]}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Band 5:</span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">{bandCounts[5]}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="bg-blue-50 px-3 py-2 rounded-lg">
                    <div className="font-mono text-lg font-bold text-blue-800">{totalDayHours}h</div>
                    <div className="text-xs text-blue-600">Total day care time</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="bg-indigo-50 px-3 py-2 rounded-lg">
                    <div className="font-mono text-lg font-bold text-indigo-800">{totalNightHours}h</div>
                    <div className="text-xs text-indigo-600">Total night care time</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="bg-green-50 px-3 py-2 rounded-lg">
                    <div className="font-mono text-lg font-bold text-green-800">{ndpsStaffing.Day}</div>
                    <div className="text-xs text-green-600">NDPS recommended</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="bg-purple-50 px-3 py-2 rounded-lg">
                    <div className="font-mono text-lg font-bold text-purple-800">{ndpsStaffing.Night}</div>
                    <div className="text-xs text-purple-600">NDPS recommended</div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-500 shadow-lg rounded-b-2xl relative overflow-hidden">
        {/* Subtle background pattern with circular details */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full translate-y-32 -translate-x-32"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-blue-300 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="max-w-7xl mx-auto p-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="-ml-40 flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Dependency Calculator</h1>
              </div>
            </div>
            <div className="ml-auto hidden md:flex items-center">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                <div className="text-sm font-medium text-white">Care Overview</div>
                <div className="text-xs text-blue-100">Evidence-based assessment</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 py-8 space-y-8">
        {/* Quick Stats Overview - Dashboard Style */}
        <StatsOverview
          residents={residents}
          calculateNDPSScore={calculateNDPSScore}
          calculateResidentCareMinutes={calculateResidentCareMinutes}
          calculateNDPSStaffing={calculateNDPSStaffing}
          calculateStaffBreakdown={calculateStaffBreakdown}
          openAddModal={openAddModal}
        />

        {/* Core Functionality: Communities and Residents Management */}
        <div className="space-y-6">
          {/* Residents Table Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Resident Management</h2>
                  <p className="text-gray-600">Manage residents, communities, and dependency assessments</p>
                </div>
              </div>

              {/* PDF Download Button */}
              <button
                onClick={() => generatePDFReport(
                  selectedCommunity ? residents.filter(r => r.communityId === selectedCommunity) : residents,
                  communities,
                  selectedCommunity,
                  workspace,
                  calculateNDPSScore,
                  getNDPSBand,
                  calculateResidentCareMinutes,
                  calculateNDPSStaffing,
                  generateChartData
                )}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                title="Generate PDF Report"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </button>
            </div>
          </div>

          {/* Residents Table with integrated community selector */}
          {selectedCommunity ? (
            <ResidentTable
              residentsProp={residents.filter(r => r.communityId === selectedCommunity)}
              communities={communities}
              selectedCommunity={selectedCommunity}
              setSelectedCommunity={setSelectedCommunity}
              setCommunities={setCommunities}
              genId={genId}
              openAddModal={openAddModal}
            />
          ) : (
            <ResidentTable
              communities={communities}
              selectedCommunity={selectedCommunity}
              setSelectedCommunity={setSelectedCommunity}
              setCommunities={setCommunities}
              genId={genId}
              openAddModal={openAddModal}
            />
          )}
        </div>

        {/* Analytical Charts - Moved down after core functionality */}
        <div className="space-y-6">
          {/* Chart Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <NDPSBandChart
              residents={residents}
              calculateNDPSScore={calculateNDPSScore}
              getNDPSBand={getNDPSBand}
            />

            {/* Care Time Breakdown */}
            <CareTimeBreakdown
              residents={residents}
              calculateResidentCareMinutes={calculateResidentCareMinutes}
            />
          </div>

          {/* Historical Trends Chart */}
          <HistoricalTrendsChart
            residents={residents}
            generateChartData={generateChartData}
          />
        </div>

        {/* Resident Assessment Modal */}
        <ResidentAssessmentModal
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          editingIndex={editingIndex}
          form={form}
          setForm={setForm}
          step={step}
          setStep={setStep}
          stepError={stepError}
          setStepError={setStepError}
          communities={communities}
          FIELDS={NPDS_FIELDS}
          attemptNext={attemptNext}
          attemptSave={attemptSave}
          handleBack={handleBack}
          handleChange={handleChange}
          isStepValid={isStepValid}
          isAllValid={isAllValid}
          residents={residents}
        />

        {/* Resident Assessment Edit Modal */}
        <ResidentAssessmentEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingResident(null);
          }}
          resident={editingResident}
          communities={communities}
          onSave={handleSaveAssessment}
          FIELDS={NPDS_FIELDS}
        />

      </div>
    </div>
  );
}
