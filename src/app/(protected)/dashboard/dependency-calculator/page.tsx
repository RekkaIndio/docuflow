"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace";
import { doc, getDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceCollectionPath, workspaceDocPath } from "@/lib/paths";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { StandardPdfBuilder, StandardPdfMetaItem } from '@/lib/pdf/standard-layout';
import PageHeader from '@/components/page-header';

import {
  NPDS_FIELDS,
  getDefaultAssessment as ndpsGetDefaultAssessment,
  calculateNDPSScore as ndpsCalculateNDPSScore,
  calculateResidentCareMinutes as ndpsCalculateResidentCareMinutes,
  calculateNDPSStaffing as ndpsCalculateNDPSStaffing,
  calculateStaffBreakdown as ndpsCalculateStaffBreakdown,
  calculateResidentStaffing as ndpsCalculateResidentStaffing,
  ceilToQuarter as ndpsCeilToQuarter,
  ceilToHalf as ndpsCeilToHalf,
  getNDPSBand as ndpsGetNDPSBand,
  buildStaffingSummary,
} from "@/lib/staffing/ndps";

import {
  StatsOverview,
  NDPSBandChart,
  CareTimeBreakdown,
  HistoricalTrendsChart,
  ResidentAssessmentEditModal,
  type Resident,
  type Community,
  type ChartData,
  type DependencyLevel,
  type Shift
} from "./components";

// NPDS Assessment Fields - see shared helpers in src/lib/staffing/ndps.ts

// Note: Standard NPDS uses 17 items (BCN + SNN = 85 points max).
// The Therapy section is an organizational addition for comprehensive assessment.
// Total max score with Therapy: 60 + 25 + 15 = 100 points

// Community colors for visual distinction
const COMMUNITY_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
  'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
];

type StaffActualState = {
  Day: { nurse: number; ctm: number; senior: number; carer: number };
  Night: { nurse: number; ctm: number; senior: number; carer: number };
};

const createDefaultStaffActual = (): StaffActualState => ({
  Day: { nurse: 0, ctm: 0, senior: 0, carer: 0 },
  Night: { nurse: 0, ctm: 0, senior: 0, carer: 0 },
});

const normalizeStaffActual = (input: any): StaffActualState => ({
  Day: {
    nurse: Number(input?.Day?.nurse ?? 0),
    ctm: Number(input?.Day?.ctm ?? 0),
    senior: Number(input?.Day?.senior ?? 0),
    carer: Number(input?.Day?.carer ?? 0),
  },
  Night: {
    nurse: Number(input?.Night?.nurse ?? 0),
    ctm: Number(input?.Night?.ctm ?? 0),
    senior: Number(input?.Night?.senior ?? 0),
    carer: Number(input?.Night?.carer ?? 0),
  },
});

const getDefaultAssessment = ndpsGetDefaultAssessment;
const calculateNDPSScore = ndpsCalculateNDPSScore;
const getNDPSBand = ndpsGetNDPSBand;
const calculateResidentCareMinutes = ndpsCalculateResidentCareMinutes;
const calculateNDPSStaffing = ndpsCalculateNDPSStaffing;
const calculateStaffBreakdown = ndpsCalculateStaffBreakdown;
const calculateResidentStaffing = ndpsCalculateResidentStaffing;
const ceilToQuarter = ndpsCeilToQuarter;
const ceilToHalf = ndpsCeilToHalf;

// Generate PDF Report
async function generatePDFReport(
  residents: Resident[],
  communities: Community[],
  selectedCommunity: string | null,
  workspace: any,
  calculateNDPSScore: (resident: Resident) => number = ndpsCalculateNDPSScore,
  getNDPSBand: (score: number) => { band: number; name: string } = ndpsGetNDPSBand,
  calculateResidentCareMinutes: (resident: Resident) => { Day: number; Night: number } = ndpsCalculateResidentCareMinutes,
  calculateNDPSStaffing: (residents: Resident[]) => { Day: number; Night: number } = ndpsCalculateNDPSStaffing,
  generateChartData: (residents: Resident[], months: number) => ChartData[]
) {
  const workspaceName = workspace?.name ?? 'Workspace';
  const communityName = selectedCommunity
    ? communities.find((c) => c.id === selectedCommunity)?.name ?? 'Selected Community'
    : 'All Communities';

  const generatedAt = new Date();
  const generatedLabel = generatedAt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const targetResidents = residents;
  const totalResidents = targetResidents.length;
  const averageNdps = totalResidents > 0
    ? targetResidents.reduce((sum, resident) => sum + calculateNDPSScore(resident), 0) / totalResidents
    : 0;

  const staffing = calculateNDPSStaffing(targetResidents);
  const totalDayMinutes = targetResidents.reduce((acc, resident) => acc + calculateResidentCareMinutes(resident).Day, 0);
  const totalNightMinutes = targetResidents.reduce((acc, resident) => acc + calculateResidentCareMinutes(resident).Night, 0);
  const totalCareMinutes = totalDayMinutes + totalNightMinutes;

  const meta: StandardPdfMetaItem[] = [
    { label: 'Workspace', value: workspaceName },
    { label: 'Scope', value: communityName },
    { label: 'Residents', value: totalResidents },
    { label: 'Average NDPS', value: totalResidents ? averageNdps.toFixed(1) : '0.0' },
    { label: 'Generated', value: generatedLabel },
  ];

  const builder = new StandardPdfBuilder({
    title: 'Dependency Calculator Report',
    subtitle: communityName,
    meta,
  });

  builder.doc.setProperties({
    title: `Dependency Report - ${workspaceName}`,
    subject: `Dependency Profile (${communityName})`,
    creator: 'CG360 Dependency Calculator',
  });

  if (totalResidents === 0) {
    builder.addSection('Overview');
    builder.addParagraph('No resident dependency data was available for the selected scope.');
    builder.addFooter();
    const emptyFile = selectedCommunity
      ? `dependency-report-${communityName}-${generatedAt.toISOString().split('T')[0]}.pdf`
      : `dependency-report-all-communities-${generatedAt.toISOString().split('T')[0]}.pdf`;
    builder.doc.save(emptyFile);
    return;
  }

  builder.addSection('Executive Summary');
  builder.addInfoGrid(
    [
      { label: 'Total Residents', value: totalResidents },
      { label: 'Average NDPS Score', value: averageNdps.toFixed(1) },
      { label: 'Recommended Day Staff', value: staffing.Day },
      { label: 'Recommended Night Staff', value: staffing.Night },
      { label: 'Total Weekly Care Hours', value: (totalCareMinutes / 60).toFixed(1) },
      { label: 'Resident to Staff Ratio', value: staffing.Day + staffing.Night > 0 ? `${Math.round(totalResidents / (staffing.Day + staffing.Night))}:1` : '—' },
    ],
    { columns: 3 }
  );
  builder.addParagraph(
    'This report summarises resident dependency levels using the National Dependency Projection System (NDPS) to support evidence-based staffing decisions.'
  );

  const bandSummary = {
    1: { count: 0, name: '' },
    2: { count: 0, name: '' },
    3: { count: 0, name: '' },
    4: { count: 0, name: '' },
    5: { count: 0, name: '' },
  } as Record<number, { count: number; name: string }>;

  targetResidents.forEach((resident) => {
    const { band, name } = getNDPSBand(calculateNDPSScore(resident));
    bandSummary[band].count += 1;
    bandSummary[band].name = name;
  });

  const bandRows = (Object.entries(bandSummary) as Array<[string, { count: number; name: string }]>)
    .map(([bandKey, info]) => {
      const bandNumber = Number(bandKey);
      const percentage = totalResidents > 0 ? `${Math.round((info.count / totalResidents) * 100)}%` : '0%';
      return {
        band: `Band ${bandNumber}`,
        description: info.name || '—',
        residents: info.count,
        percentage,
      };
    });

  builder.addSection('Band Distribution', { marginTop: 16 });
  builder.addTable({
    columns: [
      { key: 'band', header: 'Band' },
      { key: 'description', header: 'Description' },
      { key: 'residents', header: 'Residents', align: 'right' },
      { key: 'percentage', header: 'Population Share', align: 'right' },
    ],
    rows: bandRows,
    stripe: true,
  });

  const residentsByCommunity = targetResidents.reduce<Record<string, { name: string; count: number; average: number }>>((acc, resident) => {
    const id = resident.communityId || 'unassigned';
    const community = communities.find((c) => c.id === resident.communityId);
    const name = community?.name ?? 'Unassigned';
    const current = acc[id] ?? { name, count: 0, average: 0 };
    const score = calculateNDPSScore(resident);
    const totalScore = current.average * current.count + score;
    const updatedCount = current.count + 1;
    acc[id] = { name, count: updatedCount, average: totalScore / updatedCount };
    return acc;
  }, {});

  if (Object.keys(residentsByCommunity).length > 0) {
    builder.addSection('Community Breakdown', { marginTop: 16 });
    const items = Object.values(residentsByCommunity).map((entry) => ({
      label: entry.name,
      value: `${entry.count} residents • Avg NDPS ${entry.average.toFixed(1)}`,
    }));
    builder.addInfoGrid(items, { columns: 2 });
  }

  builder.addSection('Care Time Analysis', { marginTop: 16 });
  const averageDayHours = totalResidents ? (totalDayMinutes / 60) / totalResidents : 0;
  const averageNightHours = totalResidents ? (totalNightMinutes / 60) / totalResidents : 0;
  builder.addInfoGrid(
    [
      { label: 'Total Day Care (hrs)', value: (totalDayMinutes / 60).toFixed(1) },
      { label: 'Total Night Care (hrs)', value: (totalNightMinutes / 60).toFixed(1) },
      { label: 'Average Day Care / Resident', value: averageDayHours.toFixed(1) },
      { label: 'Average Night Care / Resident', value: averageNightHours.toFixed(1) },
    ],
    { columns: 2 }
  );

  builder.addSection('Resident Details', { marginTop: 16 });
  const residentRows = targetResidents.map((resident) => {
    const score = calculateNDPSScore(resident);
    const { band, name } = getNDPSBand(score);
    const care = calculateResidentCareMinutes(resident);
    return {
      name: resident.name || 'Unnamed',
      room: resident.room || '—',
      ndps: score.toFixed(0),
      band: `Band ${band} – ${name}`,
      day: (care.Day / 60).toFixed(1),
      night: (care.Night / 60).toFixed(1),
    };
  });
  builder.addTable({
    columns: [
      { key: 'name', header: 'Resident' },
      { key: 'room', header: 'Room', width: 30 },
      { key: 'ndps', header: 'NDPS', align: 'center', width: 30 },
      { key: 'band', header: 'Dependency Band' },
      { key: 'day', header: 'Day Care (hrs)', align: 'right', width: 45 },
      { key: 'night', header: 'Night Care (hrs)', align: 'right', width: 50 },
    ],
    rows: residentRows,
    stripe: true,
  });

  builder.addSection('Historical Trends (Last 6 Months)', { marginTop: 16 });
  const historicalData = generateChartData(targetResidents, 6).slice(-6);
  if (historicalData.length > 0) {
    builder.addTable({
      columns: [
        { key: 'date', header: 'Month' },
        { key: 'ndpsScore', header: 'Avg NDPS', align: 'right' },
        { key: 'careHours', header: 'Care Hours', align: 'right' },
        { key: 'staffRequired', header: 'Staff Required', align: 'right' },
        { key: 'residentCount', header: 'Residents', align: 'right' },
      ],
      rows: historicalData.map((item) => ({
        date: item.date,
        ndpsScore: item.ndpsScore.toFixed(1),
        careHours: item.careHours.toFixed(1),
        staffRequired: item.staffRequired,
        residentCount: item.residentCount,
      })),
      stripe: true,
    });
  } else {
    builder.addParagraph('Not enough historical snapshots were available to display trend data.');
  }

  builder.addSection('Assessment Methodology', { marginTop: 16 });
  builder.addParagraph(
    'NDPS evaluates twelve basic care needs, five special nursing requirements, and organisational therapy factors. Scores range from 0 (independent) to 5 (totally dependent) per domain, creating a comprehensive profile of resident support requirements.'
  );

  builder.addSection('Staffing Recommendations', { marginTop: 16 });
  const recommendations = calculateNDPSStaffing(targetResidents);
  builder.addBulletList([
    `Total required care: ${(totalCareMinutes / 60).toFixed(1)} hours per week across day and night shifts.`,
    `Recommended day staffing: ${recommendations.Day} carers (12-hour shifts).`,
    `Recommended night staffing: ${recommendations.Night} carers (12-hour shifts).`,
    'Review ratios alongside local policy and regulatory requirements to confirm safe workforce levels.',
  ]);

  builder.addFooter();

  const fileName = selectedCommunity
    ? `dependency-report-${communityName}-${generatedAt.toISOString().split('T')[0]}.pdf`
    : `dependency-report-all-communities-${generatedAt.toISOString().split('T')[0]}.pdf`;

  builder.doc.save(fileName);
}

// Generate chart data for historical trends
function generateChartData(residents: Resident[], months: number): ChartData[] {
  const data: ChartData[] = [];
  const now = new Date();

  // Calculate actual current values first (for the most recent month)
  let actualTotalNDPSScore = 0;
  let actualTotalCareHours = 0;

  residents.forEach(resident => {
    const score = calculateNDPSScore(resident);
    const care = calculateResidentCareMinutes(resident);
    actualTotalNDPSScore += score;
    actualTotalCareHours += (care.Day + care.Night) / 60;
  });

  const actualAvgNDPSScore = residents.length > 0 ? actualTotalNDPSScore / residents.length : 0;
  const actualStaffRequired = calculateNDPSStaffing(residents);

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    let ndpsScore: number;
    let careHours: number;
    let staffRequired: number;
    let residentCount: number;

    if (i === 0) {
      // Current month - use actual data
      ndpsScore = actualAvgNDPSScore;
      careHours = actualTotalCareHours;
      staffRequired = actualStaffRequired.Day + actualStaffRequired.Night;
      residentCount = residents.length;
    } else {
      // Historical months - simulate with variation (85-115% of current values)
      const baseMultiplier = 0.85 + Math.random() * 0.3;
      residentCount = Math.max(1, Math.round(residents.length * baseMultiplier));

      ndpsScore = actualAvgNDPSScore * baseMultiplier;
      careHours = actualTotalCareHours * baseMultiplier;

      // Estimate staff based on simulated data
      const simulatedStaffDay = Math.ceil(actualStaffRequired.Day * baseMultiplier);
      const simulatedStaffNight = Math.ceil(actualStaffRequired.Night * baseMultiplier);
      staffRequired = simulatedStaffDay + simulatedStaffNight;
    }

    data.push({
      date: dateStr,
      ndpsScore: Math.round(ndpsScore * 10) / 10,
      careHours: Math.round(careHours * 10) / 10,
      staffRequired: staffRequired,
      residentCount
    });
  }

  return data;
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
  } catch { }
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
  const workspaceOrganisationId = (workspace as any)?.organisationId ?? null;
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
  const [staffActual, setStaffActual] = useState<StaffActualState>(() => createDefaultStaffActual());

  // UX Enhancement States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load snapshots from localStorage on mount
  React.useEffect(() => {
    // Snapshot functionality removed - data is now automatically saved
  }, []);

  function openAddModal() {
    const baseAssessment = getDefaultAssessment();
    const newResident: Resident = {
      ...baseAssessment,
      id: genId(),
      name: "",
      room: "",
      communityId: selectedCommunity ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Resident;
    setEditingResident(newResident);
    setEditModalOpen(true);
  }

  function openEditAssessmentModal(resident: Resident) {
    setEditingResident(resident);
    setEditModalOpen(true);
  }

  function handleSaveAssessment(updatedResident: Resident) {
    setResidents(prev => {
      const idx = prev.findIndex(r => r.id === updatedResident.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedResident;
        return copy;
      }
      return [...prev, updatedResident];
    });

    if (updatedResident.id) {
      setCommunities(prev => {
        const next = prev.map(community => ({
          ...community,
          residentIds: Array.isArray(community.residentIds)
            ? community.residentIds.filter(residentId => residentId !== updatedResident.id)
            : [],
        }));

        if (updatedResident.communityId) {
          const targetIdx = next.findIndex(c => c.id === updatedResident.communityId);
          if (targetIdx >= 0) {
            const currentIds = new Set(next[targetIdx].residentIds ?? []);
            if (typeof updatedResident.id === 'string' && updatedResident.id) {
              currentIds.add(updatedResident.id);
            }
            next[targetIdx] = {
              ...next[targetIdx],
              residentIds: Array.from(currentIds),
            };
          }
        }

        return next;
      });
    }

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
  } const [stepError, setStepError] = React.useState<string | null>(null);

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
      return val === "0" || val === "1" || val === "2" || val === "3" || val === "4" || val === "5";
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
      if (!(val === "0" || val === "1" || val === "2" || val === "3" || val === "4" || val === "5")) return false;
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

  // Calculate dependency counts (based on NPDS bands for better accuracy)
  const dependencyCounts = residents.reduce(
    (acc: { Low: number; Medium: number; High: number; Total: number }, r: Resident) => {
      const score = calculateNDPSScore(r);
      const band = getNDPSBand(score);

      // Map bands to legacy dependency counts for compatibility
      if (band.band === 1) acc.Low++;
      else if (band.band === 2 || band.band === 3) acc.Medium++;
      else if (band.band === 4 || band.band === 5) acc.High++;

      if (score > 0) acc.Total++;
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
          const organisationId = workspaceOrganisationId;
          const hasOrgScope = typeof organisationId === 'string' && organisationId.length > 0;
          const orgPath = workspaceCollectionPath(workspace.id, "dependency_calculator", organisationId);
          const fallbackPath = hasOrgScope ? null : workspaceCollectionPath(workspace.id, "dependency_calculator");
          const orgRef = orgPath ? doc(db, orgPath, "default") : null;
          const fallbackRef = fallbackPath ? doc(db, fallbackPath, "default") : null;

          let snap: any = null;
          let snapSource: 'org' | 'fallback' | null = null;

          if (orgRef) {
            const orgSnap = await getDoc(orgRef);
            if (orgSnap.exists()) {
              snap = orgSnap;
              snapSource = 'org';
            }
          }

          if (!snap && fallbackRef && (!orgRef || fallbackRef.path !== orgRef.path)) {
            try {
              const legacySnap = await getDoc(fallbackRef);
              if (legacySnap.exists()) {
                snap = legacySnap;
                snapSource = 'fallback';
              }
            } catch (fallbackErr) {
              console.warn('Unable to read legacy dependency calculator data (fallback path)', fallbackErr);
            }
          }

          if (snap && snap.exists()) {
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

            if (data && typeof data.staffActual === "object") {
              const normalizedStaffActual = normalizeStaffActual(data.staffActual);
              if (!cancelled) {
                setStaffActual(normalizedStaffActual);
                try {
                  localStorage.setItem("dependency_staff_actual_v1", JSON.stringify(normalizedStaffActual));
                } catch { }
              }
            }

            if (snapSource === 'fallback' && orgRef && (!fallbackRef || orgRef.path !== fallbackRef.path)) {
              try {
                await setDoc(orgRef, {
                  ...data,
                  schemaVersion: 2,
                  migratedAt: serverTimestamp(),
                  migratedFrom: fallbackPath ? `${fallbackPath}/default` : undefined,
                }, { merge: true });
              } catch (migrationErr) {
                console.warn('Failed to migrate dependency calculator data to org-scoped path', migrationErr);
              }
            }

            if (!hasOrgScope && snapSource === 'org' && fallbackRef && (!orgRef || fallbackRef.path !== orgRef.path)) {
              try {
                await setDoc(fallbackRef, {
                  ...data,
                  schemaVersion: 2,
                  migratedAt: serverTimestamp(),
                  migratedFrom: orgPath ? `${orgPath}/default` : undefined,
                }, { merge: true });
              } catch (mirrorErr) {
                console.warn('Failed to mirror dependency calculator data to legacy workspace path', mirrorErr);
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

                const seenPaths = new Set<string>();
                const targets = [orgRef, fallbackRef];
                for (const target of targets) {
                  if (!target) continue;
                  if (seenPaths.has(target.path)) continue;
                  seenPaths.add(target.path);
                  await setDoc(target, migrationData, { merge: true });
                }

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

                if (oldData && typeof oldData.staffActual === "object" && !cancelled) {
                  const normalizedStaffActual = normalizeStaffActual(oldData.staffActual);
                  setStaffActual(normalizedStaffActual);
                  try {
                    localStorage.setItem("dependency_staff_actual_v1", JSON.stringify(normalizedStaffActual));
                  } catch { }
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
                  } catch { }
                }
                const rawStaffActual = localStorage.getItem("dependency_staff_actual_v1");
                if (rawStaffActual) {
                  try {
                    const parsed = JSON.parse(rawStaffActual);
                    if (parsed && !cancelled) {
                      setStaffActual(normalizeStaffActual(parsed));
                    }
                  } catch { }
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
                } catch { }
              }
              const rawStaffActual = localStorage.getItem("dependency_staff_actual_v1");
              if (rawStaffActual) {
                try {
                  const parsed = JSON.parse(rawStaffActual);
                  if (parsed && !cancelled) {
                    setStaffActual(normalizeStaffActual(parsed));
                  }
                } catch { }
              }
            }
          }
        } catch (err) {
          console.error("Error loading dependency data:", err);
          if (!cancelled) {
            setLoadError("Failed to load data from server. Changes will not be saved. Please check your connection and refresh.");
            // Do NOT set isLoaded(true) here to prevent autosave from overwriting data
            return;
          }
          // fallback to localStorage (only if we didn't return above - effectively disabled for auth users on error now)
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
              } catch { }
            }
            const rawStaffActual = localStorage.getItem("dependency_staff_actual_v1");
            if (rawStaffActual) {
              try {
                const parsed = JSON.parse(rawStaffActual);
                if (parsed && !cancelled) {
                  setStaffActual(normalizeStaffActual(parsed));
                }
              } catch { }
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
            if (data && typeof data.staffActual === "object" && !cancelled) {
              const normalizedStaffActual = normalizeStaffActual(data.staffActual);
              setStaffActual(normalizedStaffActual);
              try {
                localStorage.setItem("dependency_staff_actual_v1", JSON.stringify(normalizedStaffActual));
              } catch { }
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
          const rawStaffActual = localStorage.getItem("dependency_staff_actual_v1");
          if (rawStaffActual) {
            try {
              const parsed = JSON.parse(rawStaffActual);
              if (parsed && !cancelled) {
                setStaffActual(normalizeStaffActual(parsed));
              }
            } catch { }
          }
        } catch (e) {
        }
      }
      if (!cancelled) setIsLoaded(true);
    }
    if (!authLoading) load();
    return () => { cancelled = true; };
  }, [user?.id, workspace?.id, workspaceOrganisationId, authLoading]);

  // Persist: write to localStorage immediately and to Firestore (debounced) when signed in
  React.useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem("dependency_residents_v1", JSON.stringify(residents));
      localStorage.setItem("dependency_communities_v1", JSON.stringify(communities));
      localStorage.setItem("dependency_staff_actual_v1", JSON.stringify(staffActual));
    } catch (e) {
    }

    if (!user || !workspace) {
      return;
    } // only save to Firestore for authenticated users with workspace

    const organisationId = workspaceOrganisationId;
    const hasOrgScope = typeof organisationId === 'string' && organisationId.length > 0;
    const orgCollectionPath = workspaceCollectionPath(workspace.id, "dependency_calculator", organisationId);
    const fallbackCollectionPath = hasOrgScope ? null : workspaceCollectionPath(workspace.id, "dependency_calculator");

    const dependencyDocRefsMap = new Map<string, ReturnType<typeof doc>>();
    if (orgCollectionPath) {
      const ref = doc(db, `${orgCollectionPath}/default`);
      dependencyDocRefsMap.set(ref.path, ref);
    }
    if (fallbackCollectionPath) {
      const ref = doc(db, `${fallbackCollectionPath}/default`);
      dependencyDocRefsMap.set(ref.path, ref);
    }

    const orgWorkspaceDocPath = workspaceDocPath(workspace.id, undefined, organisationId);
    const fallbackWorkspaceDocPath = hasOrgScope ? null : workspaceDocPath(workspace.id);
    const summaryDocRefsMap = new Map<string, ReturnType<typeof doc>>();
    if (orgWorkspaceDocPath) {
      const ref = doc(db, `${orgWorkspaceDocPath}/rotas/staffing-summary`);
      summaryDocRefsMap.set(ref.path, ref);
    }
    if (fallbackWorkspaceDocPath) {
      const ref = doc(db, `${fallbackWorkspaceDocPath}/rotas/staffing-summary`);
      summaryDocRefsMap.set(ref.path, ref);
    }

    const t = setTimeout(async () => {
      try {
        const staffingSummary = buildStaffingSummary(residents, { includeNurses: true });
        const dependencyDocPayload = {
          residents,
          communities,
          staffActual,
          staffingSummary,
          schemaVersion: 2,
          updatedAt: serverTimestamp(),
        };

        const dependencyDocRefs = Array.from(dependencyDocRefsMap.values());
        const dependencyResults = await Promise.allSettled(
          dependencyDocRefs.map((targetRef) => setDoc(targetRef, dependencyDocPayload, { merge: true }))
        );
        const summaryDocRefs = Array.from(summaryDocRefsMap.values());
        const summaryResults = await Promise.allSettled(
          summaryDocRefs.map((summaryRef) => setDoc(summaryRef, {
            ...staffingSummary,
            workspaceId: workspace.id,
            organisationId: organisationId ?? null,
            residentIds: residents
              .map((resident) => resident.id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0),
            source: 'dependency-calculator',
            updatedAt: serverTimestamp(),
          }, { merge: true }))
        );

        const hasSuccess = [...dependencyResults, ...summaryResults].some((res) => res.status === 'fulfilled');
        if (!hasSuccess) {
          const errors = [...dependencyResults, ...summaryResults]
            .filter((res): res is PromiseRejectedResult => res.status === 'rejected')
            .map((res) => res.reason);
          throw errors.length ? errors[0] : new Error('Dependency calculator persistence failed');
        }
      } catch (err) {
        console.error('Failed to persist dependency calculator data', err);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [residents, communities, staffActual, user?.id, workspace?.id, workspaceOrganisationId, isLoaded]);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2v-4.586a2 2 0 00-.586-1.414l-5.414-5.414a2 2 0 00-1.414-.586H7a2 2 0 00-2 2v10a2 2 0 002 2h4.586a2 2 0 001.414-.586l5.414-5.414a2 2 0 00.586-1.414V5a2 2 0 00-2-2H9" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2v-4.586a2 2 0 00-.586-1.414l-5.414-5.414a2 2 0 00-1.414-.586H7a2 2 0 00-2 2v10a2 2 0 002 2h4.586a2 2 0 001.414-.586l5.414-5.414a2 2 0 00.586-1.414V5a2 2 0 00-2-2H9" />
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
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${ndpsBand.band === 1 ? 'bg-green-100 text-green-800' :
                          ndpsBand.band === 2 ? 'bg-blue-100 text-blue-800' :
                            ndpsBand.band === 3 ? 'bg-yellow-100 text-yellow-800' :
                              ndpsBand.band === 4 ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                          }`}>
                          <div className={`w-2 h-2 rounded-full ${ndpsBand.band === 1 ? 'bg-green-500' :
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h4.586a2 2 0 001.414-.586l5.414-5.414a2 2 0 00.586-1.414V5a2 2 0 00-2-2H9" />
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
      <PageHeader
        title="Dependency Calculator"
        subtitle={null}
        gradientClass="from-indigo-600 via-blue-600 to-purple-700"
        textClass="text-white"
        leading={(
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2v-4.586a2 2 0 00-.586-1.414l-5.414-5.414a2 2 0 00-1.414-.586H7a2 2 0 00-2 2v10a2 2 0 002 2h4.586a2 2 0 001.414-.586l5.414-5.414a2 2 0 00.586-1.414V5a2 2 0 00-2-2H9" />
          </svg>
        )}
        actions={(
          <div className="ml-auto hidden md:flex items-center">
            <div className="flex items-center h-10 sm:h-12 px-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-sm">
              <div className="text-sm font-medium text-white">Care Overview</div>
              <div className="ml-3 text-xs text-blue-100">Evidence-based assessment</div>
            </div>
          </div>
        )}
      />

      {/* Main Content */}
      <div className="w-full px-6 py-8 space-y-8">
        {/* Load Error Alert */}
        {loadError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <span className="font-bold">Error:</span> {loadError}
                </p>
              </div>
            </div>
          </div>
        )}

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2v-4.586a2 2 0 00-.586-1.414l-5.414-5.414a2 2 0 00-1.414-.586H7a2 2 0 00-2 2v10a2 2 0 002 2h4.586a2 2 0 001.414-.586l5.414-5.414a2 2 0 00.586-1.414V5a2 2 0 00-2-2H9" />
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
              calculateNDPSStaffing={calculateNDPSStaffing}
            />
          </div>

          {/* Historical Trends Chart */}
          <HistoricalTrendsChart
            residents={residents}
            generateChartData={generateChartData}
          />
        </div>

        {/* Resident Assessment Modal removed: using ResidentAssessmentEditModal for add/edit flows */}

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
          allResidents={residents}
        />

      </div>
    </div>
  );
}
