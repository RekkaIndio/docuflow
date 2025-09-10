"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Import extracted components
import {
  StatsOverview,
  NDPSBandChart,
  CareTimeBreakdown,
  HistoricalTrendsChart,
  CommunityOverview,
  ActionCards,
  ResidentCards,
  ResidentAssessmentModal,
  type Resident,
  type Community,
  type ChartData,
  type DependencyLevel,
  type Shift
} from "./components";


const FIELDS = [
  { key: "personalCare", label: "Personal Care" },
  { key: "mobility", label: "Mobility" },
  { key: "continence", label: "Continence" },
  { key: "eatingDrinking", label: "Eating & Drinking" },
  { key: "skinIntegrity", label: "Skin Integrity" },
  { key: "medication", label: "Medication" },
  { key: "medical", label: "Medical" },
  { key: "breathing", label: "Breathing" },
  { key: "emotionalSupport", label: "Emotional Support" },
  { key: "behaviours", label: "Behaviours" },
  { key: "additionalNeeds", label: "Additional Needs" },
  { key: "cognition", label: "Cognition" },
  { key: "nightNeeds", label: "Night Needs" },
];

// Community colors for visual distinction
const COMMUNITY_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
  'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
];

// Returns an object with all dependency fields set to ""
function getDefaultAssessment(): Omit<Resident, "name" | "room"> {
  return {
    personalCare: "",
    mobility: "",
    continence: "",
    eatingDrinking: "",
    skinIntegrity: "",
    medication: "",
    medical: "",
    breathing: "",
    emotionalSupport: "",
    behaviours: "",
    additionalNeeds: "",
    cognition: "",
    nightNeeds: "",
  };
}

// Generate historical chart data
function generateChartData(residents: Resident[], months: number = 6): ChartData[] {
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
  for (const field of FIELDS) {
    const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
    const dayMap = MINUTES_BY_FIELD_DAY[field.key] as Record<DependencyLevel, number> | undefined;
    const nightMap = MINUTES_BY_FIELD_NIGHT[field.key] as Record<DependencyLevel, number> | undefined;
    dayMinutes += dayMap?.[level as DependencyLevel] ?? 0;
    nightMinutes += nightMap?.[level as DependencyLevel] ?? 0;
  }
  return { Day: Math.round(dayMinutes), Night: Math.round(nightMinutes) };
}

// NDPS scoring: map dependency levels to points
const NDPS_POINTS: Record<DependencyLevel, number> = {
  "": 0,
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
};

// Calculate NDPS score for a resident
function calculateNDPSScore(resident: Resident): number {
  let score = 0;
  for (const field of FIELDS) {
    const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
    score += NDPS_POINTS[level] || 0;
  }
  return score;
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
  1: 1 / 10, // 1 carer per 10 residents
  2: 1 / 6,  // 1 carer per 6 residents
  3: 1 / 4,  // 1 carer per 4 residents
  4: 1 / 3,  // 1 carer per 3 residents
  5: 1 / 2,  // 1 carer per 2 residents
};

const NDPS_STAFFING_RATIOS_NIGHT = {
  1: 1 / 15, // Night ratios are typically lower
  2: 1 / 8,
  3: 1 / 5,
  4: 1 / 4,
  5: 1 / 3,
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
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [step, setStep] = useState(0);
  const [communityOpen, setCommunityOpen] = useState<Record<string, boolean>>({});
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

  // Month-by-month snapshots
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [snapshots, setSnapshots] = useState<Record<string, { residents: Resident[]; communities: Community[]; staffActual: any; savedAt: number }>>({});

  // Load snapshots from localStorage on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('dependency_snapshots_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setSnapshots(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  async function saveSnapshot(month: string) {
    if (!month) return;
    const exists = Boolean(snapshots[month]);
    if (exists && !confirm(`A snapshot for ${month} already exists. Overwrite?`)) return;
    const payload = { residents, communities, staffActual, savedAt: Date.now() };
    const next = { ...snapshots, [month]: payload };
    try {
      localStorage.setItem('dependency_snapshots_v1', JSON.stringify(next));
      setSnapshots(next);
    } catch (e) {
      console.warn('Failed to save snapshot locally', e);
    }

    // also persist to Firestore for authenticated users
    if (user) {
      try {
        const ref = doc(db, 'users', user.id, 'dependency_calculator_snapshots', month);
        await setDoc(ref, { ...payload, schemaVersion: 1, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.warn('Failed to save snapshot to Firestore', err);
      }
    }
  }

  function loadSnapshot(month: string) {
    if (!month) return;
    const s = snapshots[month];
    if (!s) {
      alert('No snapshot found for ' + month);
      return;
    }
    // Removed confirmation pop-up for loading snapshots
    setResidents(s.residents || []);
    setCommunities(s.communities || []);
    setStaffActual(s.staffActual || { Day: { nurse: 0, ctm: 0, senior: 0, carer: 0 }, Night: { nurse: 0, ctm: 0, senior: 0, carer: 0 } });
  }

  function deleteSnapshot(month: string) {
    if (!month) return;
    if (!confirm(`Delete snapshot for ${month}? This cannot be undone.`)) return;
    const next = { ...snapshots };
    delete next[month];
    try {
      localStorage.setItem('dependency_snapshots_v1', JSON.stringify(next));
      setSnapshots(next);
    } catch (e) {
      console.warn('Failed to delete snapshot locally', e);
    }
    // Note: we don't delete from Firestore automatically to avoid accidental data loss.
  }

    function openAddModal() {
  setForm({ name: "", room: "", ...getDefaultAssessment(), communityId: selectedCommunity ?? null });
      setEditingIndex(null);
      setStep(0);
      setModalOpen(true);
    }

    function openEditModal(index: number) {
      const r = residents[index];
  setForm({ ...r, communityId: r.communityId ?? null });
      setEditingIndex(index);
      setStep(0);
      setModalOpen(true);
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
    // add an extra step for community selection after the FIELDS
    if (step < FIELDS.length + 1) setStep(step + 1);
    else if (step === FIELDS.length + 1) setStep(step + 1);
  }

    const [stepError, setStepError] = React.useState<string | null>(null);

    function attemptNext() {
      if (!isStepValid(step)) {
        if (step === 0) setStepError("Please enter a Name and Room before continuing.");
        else if (step > 0 && step <= FIELDS.length) setStepError(`Please select ${FIELDS[step - 1].label}.`);
        else setStepError("Please select a community or choose None.");
        return;
      }
      setStepError(null);
      handleNext();
    }

    async function attemptSave() {
      if (!isAllValid()) {
        setStepError("Please complete all steps before saving.");
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
        return form.name.trim() !== "" && form.room.trim() !== "";
      }
      if (s > 0 && s <= FIELDS.length) {
        const key = FIELDS[s - 1].key as keyof Resident;
        const val = form[key] as DependencyLevel | undefined;
      return val === "None" || val === "Low" || val === "Medium" || val === "High";
      }
      if (s === FIELDS.length + 1) return true; // community selection optional
      return true;
    }

    function isAllValid() {
      if (form.name.trim() === "" || form.room.trim() === "") return false;
      for (const f of FIELDS) {
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
      for (const f of FIELDS) {
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
      // If user is signed in, prefer Firestore
      if (user) {
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
          } else {
            // fallback to localStorage if Firestore doc not present
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
        } catch (err) {
          console.warn("Failed to load residents from Firestore", err);
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
                if (Array.isArray(parsed) && !cancelled) setCommunities(parsed);
              } catch {}
            }
          } catch (e) {
            console.warn("Failed to load residents from localStorage", e);
          }
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
          console.warn("Failed to load residents from localStorage", e);
        }
      }
    }
  if (!authLoading) load();
    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  // Persist: write to localStorage immediately and to Firestore (debounced) when signed in
  React.useEffect(() => {
    try {
      localStorage.setItem("dependency_residents_v1", JSON.stringify(residents));
      localStorage.setItem("dependency_communities_v1", JSON.stringify(communities));
  localStorage.setItem("dependency_staff_actual_v1", JSON.stringify(staffActual));
    } catch (e) {
      console.warn("Failed to save residents/communities to localStorage", e);
    }

    if (!user) return; // only save to Firestore for authenticated users

    const ref = doc(db, "users", user.id, "dependency_calculator", "default");
    const t = setTimeout(async () => {
      try {
        // include staffActual so the user's main dependency_calculator document stays in sync
        await setDoc(ref, { residents, communities, staffActual, schemaVersion: 1, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.warn("Failed to save residents to Firestore", err);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [residents, communities, staffActual, user?.id]);
  // Expandable resident table component. Accepts optional residentsProp to render a filtered set.
  function ResidentTable({ residentsProp }: { residentsProp?: Resident[] }) {
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const list = (residentsProp ?? residents).slice().sort((a, b) => compareRooms(a.room, b.room));
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
        {/* Table Header */}
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
                <div className="text-sm text-gray-600">Showing {list.length} resident{list.length !== 1 ? 's' : ''} • NDPS-based staffing calculations</div>
              </div>
            </div>
            {selectedCommunity && (
              <div className="flex items-center gap-3 bg-blue-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-sm font-medium text-blue-800">Community: {communities.find(c => c.id === selectedCommunity)?.name}</div>
                <button
                  className="text-blue-600 hover:text-blue-800 ml-2"
                  onClick={() => setSelectedCommunity(null)}
                  title="Clear community filter"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</span>
                  </div>
                </th>
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
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">NDPS Band</span>
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
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">12h Day Staff</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">12h Night Staff</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const careMinutes = calculateResidentCareMinutes(r);
                const ndpsScore = calculateNDPSScore(r);
                const ndpsBand = getNDPSBand(ndpsScore);
                const isOpen = expandedId === r.id;
                return (
                  <React.Fragment key={r.id || `${r.name}-${r.room}`}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <button
                          className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          aria-label={isOpen ? "Collapse details" : "Expand details"}
                          onClick={() => setExpandedId(isOpen ? null : (r.id ?? null))}
                        >
                          <svg className={`w-4 h-4 text-gray-600 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
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
                            {ndpsStaffing.Day}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="bg-purple-50 px-3 py-2 rounded-lg inline-block">
                          <div className="font-mono text-sm font-semibold text-purple-800">
                            {ndpsStaffing.Night}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gradient-to-r from-blue-50/30 to-indigo-50/30 border-b border-blue-100">
                        <td colSpan={9} className="px-6 py-6">
                          <div className="bg-white rounded-lg border border-blue-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <h3 className="text-lg font-semibold text-gray-800">Detailed Assessment</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {FIELDS.map(f => (
                                <div key={f.key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">{f.label}</label>
                                  <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    value={(r[f.key as keyof Resident] as DependencyLevel) ?? ""}
                                    onChange={e => {
                                      const val = e.target.value as DependencyLevel;
                                      // update by id
                                      setResidents(prev => prev.map(pr => pr.id === r.id ? { ...pr, [f.key]: val, id: pr.id || genId(), updatedAt: Date.now(), updatedBy: user?.id ?? null } : pr));
                                    }}
                                  >
                                    <option value="">Select...</option>
                                    <option value="None">No Needs</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                              <div className="text-sm text-gray-600">
                                Last updated: {r.updatedAt ? timeAgo(r.updatedAt) : 'Never'}
                                {r.updatedBy && ` by ${r.updatedBy}`}
                              </div>
                              <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                onClick={() => setExpandedId(null)}
                              >
                                Close Details
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-t-2 border-gray-200">
                <td className="px-6 py-4" colSpan={3}>
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
          <div className="flex items-center">
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
                <div className="text-sm font-medium text-white">NDPS Methodology</div>
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
        />

        {/* Chart Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
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
        {/* Community Overview */}
        <CommunityOverview
          communities={communities}
          residents={residents}
          selectedCommunity={selectedCommunity}
          setSelectedCommunity={setSelectedCommunity}
          calculateResidentCareMinutes={calculateResidentCareMinutes}
          calculateNDPSScore={calculateNDPSScore}
          setCommunities={setCommunities}
          setResidents={setResidents}
        />

        {/* Action Cards */}
        <ActionCards
          communities={communities}
          setCommunities={setCommunities}
          openAddModal={openAddModal}
          saveSnapshot={saveSnapshot}
          loadSnapshot={loadSnapshot}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          genId={genId}
        />

        {/* Resident Cards */}
        <ResidentCards
          residents={residents}
          selectedCommunity={selectedCommunity}
          setSelectedCommunity={setSelectedCommunity}
          communities={communities}
          calculateResidentCareMinutes={calculateResidentCareMinutes}
          calculateNDPSScore={calculateNDPSScore}
          getNDPSBand={getNDPSBand}
          openEditModal={openEditModal}
          deleteResidentById={deleteResidentById}
          openAddModal={openAddModal}
          compareRooms={compareRooms}
        />

        {/* Residents Table (Expandable Rows) */}
        {residents.length > 0 && (
          selectedCommunity ? (
            <ResidentTable residentsProp={residents.filter(r => r.communityId === selectedCommunity)} />
          ) : (
            <ResidentTable />
          )
        )}

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
          FIELDS={FIELDS}
          attemptNext={attemptNext}
          attemptSave={attemptSave}
          handleBack={handleBack}
          handleChange={handleChange}
          isStepValid={isStepValid}
          isAllValid={isAllValid}
        />

      </div>
    </div>
  );
}
