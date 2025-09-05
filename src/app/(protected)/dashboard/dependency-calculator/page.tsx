"use client";
import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"; // Import Tooltip components

type DependencyLevel = "None" | "Low" | "Medium" | "High" | "";
type Shift = "Day" | "Night";

interface Resident {
  name: string;
  room: string;
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  updatedBy?: string | null;
  communityId?: string | null;
  personalCare: DependencyLevel;
  mobility: DependencyLevel;
  continence: DependencyLevel;
  eatingDrinking: DependencyLevel;
  skinIntegrity: DependencyLevel;
  medication: DependencyLevel;
  medical: DependencyLevel;
  breathing: DependencyLevel;
  emotionalSupport: DependencyLevel;
  behaviours: DependencyLevel;
  additionalNeeds: DependencyLevel;
  cognition: DependencyLevel;
  nightNeeds: DependencyLevel;
}

interface Community {
  id: string;
  name: string;
  residentIds: string[];
}


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

    function attemptSave() {
      if (!isAllValid()) {
        setStepError("Please complete all steps before saving.");
        return;
      }
      setStepError(null);
      handleSave();
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
  function handleSave() {
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
  // communities are canonical via resident.communityId; nothing to sync here
    setModalOpen(false);
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
    return (
      <div className="overflow-x-auto rounded-xl shadow bg-white mb-8">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-sm text-gray-600">Showing {list.length} resident{list.length !== 1 ? 's' : ''}</div>
          {selectedCommunity && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Community: {communities.find(c => c.id === selectedCommunity)?.name}</div>
              <button className="text-sm text-blue-600" onClick={() => setSelectedCommunity(null)}>Clear</button>
            </div>
          )}
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left"></th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Room</th>
              <th className="px-3 py-2 text-left">
                Day (h)
                <Tooltip>
                  <TooltipTrigger>
                    <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                  </TooltipTrigger>
                  <TooltipContent>Total Care Hours (rounded to 0.25)</TooltipContent>
                </Tooltip>
              </th>
              <th className="px-3 py-2 text-left">
                Night (h)
                <Tooltip>
                  <TooltipTrigger>
                    <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                  </TooltipTrigger>
                  <TooltipContent>Total Care Hours (rounded to 0.25)</TooltipContent>
                </Tooltip>
              </th>
              <th className="px-3 py-2 text-left">
                12h Day
                <Tooltip>
                  <TooltipTrigger>
                    <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                  </TooltipTrigger>
                  <TooltipContent>Carers needed</TooltipContent>
                </Tooltip>
              </th>
              <th className="px-3 py-2 text-left">
                12h Night
                <Tooltip>
                  <TooltipTrigger>
                    <span className="ml-1 text-gray-500 cursor-pointer">(i)</span>
                  </TooltipTrigger>
                  <TooltipContent>Carers needed</TooltipContent>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const careMinutes = calculateResidentCareMinutes(r);
              const isOpen = expandedId === r.id;
              return (
                <React.Fragment key={r.id || `${r.name}-${r.room}`}>
                  <tr className="border-t">
                    <td className="px-3 py-2 text-center">
                      <button
                        className="text-blue-600 hover:text-blue-900 focus:outline-none"
                        aria-label={isOpen ? "Collapse details" : "Expand details"}
                        onClick={() => setExpandedId(isOpen ? null : (r.id ?? null))}
                      >
                        {isOpen ? "−" : "+"}
                      </button>
                    </td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 font-mono">{r.room}</td>
                    <td className="px-3 py-2 font-mono">{Math.round((careMinutes.Day / 60) * 100) / 100}</td>
                    <td className="px-3 py-2 font-mono">{Math.round((careMinutes.Night / 60) * 100) / 100}</td>
                    <td className="px-3 py-2 font-mono">{Math.round(ceilToQuarter((careMinutes.Day / 60 / 12)) * 100) / 100}</td>
                    <td className="px-3 py-2 font-mono">{Math.round(ceilToQuarter((careMinutes.Night / 60 / 12)) * 100) / 100}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={6} className="p-4 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {FIELDS.map(f => (
                            <div key={f.key} className="flex flex-col">
                              <label className="text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                              <select
                                className="border rounded px-3 py-2"
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="px-4 py-2"></td>
              <td className="px-3 py-2 text-left">Totals</td>
              <td className="px-3 py-2 font-mono"></td>
              <td className="px-3 py-2 font-mono">
                {totalDayHours}
              </td>
              <td className="px-3 py-2 font-mono">
                {totalNightHours}
              </td>
              <td className="px-3 py-2 font-mono">
                {totalDayShifts}
              </td>
              <td className="px-3 py-2 font-mono">
                {totalNightShifts}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-semibold mb-2">Dependency Calculator</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
        Assess each resident step-by-step. Each card below shows a summary. Click to edit or add a new resident.
      </p>

        <div className="flex gap-4 mb-6 items-start">
        <div className="flex-1">
        {/* Top row: Add Resident + Right-side cards */}
        <div className="w-full mb-6">
          <div className="flex items-start gap-6 mb-3 flex-col md:flex-row">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
              <div className="flex items-stretch">
                <button
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-300 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition"
                  onClick={openAddModal}
                >
                  <span className="text-4xl mb-2">+</span>
                  <span className="font-semibold">Add Resident</span>
                </button>
              </div>

              <div className="flex items-stretch">
                <div className="p-3 bg-white rounded shadow-sm border text-sm w-full">
                  <div className="text-sm font-semibold mb-2">Key</div>
                  <div className="grid gap-1 text-xs">
                    <div><span className="font-medium">No Needs</span> - No care input required</div>
                    <div><span className="font-medium">Low needs</span> - Assistance required, but can complete most of the task with prompt/support</div>
                    <div><span className="font-medium">Medium Needs</span> - Assistance required, can complete part of the task with prompt/support</div>
                    <div><span className="font-medium">High Needs</span> - Fully dependant on assistance and cannot complete the task without full input.</div>
                  </div>
                </div>
              </div>

              <div className="flex items-stretch">
                <div className="p-3 bg-white rounded shadow-sm border text-sm w-full">
                  <div className="text-sm font-semibold mb-2">Actual Staff Count</div>
                  <div className="grid gap-3 text-xs">
                    <div>
                      <div className="text-xs font-medium mb-1">Day</div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <div className="text-[11px] font-medium mb-1">Nurse</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Day.nurse}
                            onChange={e => setStaffActual(prev => ({ ...prev, Day: { ...prev.Day, nurse: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium mb-1">CTM</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Day.ctm}
                            onChange={e => setStaffActual(prev => ({ ...prev, Day: { ...prev.Day, ctm: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium mb-1">Senior</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Day.senior}
                            onChange={e => setStaffActual(prev => ({ ...prev, Day: { ...prev.Day, senior: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium mb-1">Carer</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Day.carer}
                            onChange={e => setStaffActual(prev => ({ ...prev, Day: { ...prev.Day, carer: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 21 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium mb-1">Night</div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <div className="text-[11px] font-medium mb-1">Nurse</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Night.nurse}
                            onChange={e => setStaffActual(prev => ({ ...prev, Night: { ...prev.Night, nurse: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium mb-1">CTM</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Night.ctm}
                            onChange={e => setStaffActual(prev => ({ ...prev, Night: { ...prev.Night, ctm: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium mb-1">Senior</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Night.senior}
                            onChange={e => setStaffActual(prev => ({ ...prev, Night: { ...prev.Night, senior: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium mb-1">Carer</div>
                          <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={staffActual.Night.carer}
                            onChange={e => setStaffActual(prev => ({ ...prev, Night: { ...prev.Night, carer: parseInt(e.target.value || '0', 10) } }))}
                          >
                            {Array.from({ length: 21 }).map((_, i) => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-stretch">
                <div className="p-3 bg-white rounded shadow-sm border text-sm w-full">
                  <div className="text-sm font-semibold mb-2">Monthly Snapshots</div>
                  <div className="text-xs mb-2">Choose month to save or load resident data.</div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="month"
                      className="border rounded px-2 py-1 w-full"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      onClick={() => saveSnapshot(selectedMonth)}
                    >Save</button>
                    <button
                      className="px-2 py-1 bg-gray-200 rounded text-xs"
                      onClick={() => loadSnapshot(selectedMonth)}
                    >Load</button>
                  </div>
                  <div className="text-xs font-medium mt-2 mb-1">Saved Months</div>
                  <div className="flex flex-col gap-2 max-h-40 overflow-auto">
                    {Object.keys(snapshots).length === 0 && (
                      <div className="text-xs text-gray-500">No snapshots saved</div>
                    )}
                    {Object.keys(snapshots).sort().reverse().map(m => (
                      <div key={m} className="flex items-center justify-between gap-2">
                        <div className="text-xs">{m} <span className="text-gray-400 text-[11px]">{snapshots[m].savedAt ? `(${timeAgo(snapshots[m].savedAt)})` : ''}</span></div>
                        <div className="flex items-center gap-1">
                          <button className="text-xs text-blue-600" onClick={() => { setSelectedMonth(m); loadSnapshot(m); }}>Load</button>
                          <button className="text-xs text-red-600" onClick={() => deleteSnapshot(m)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <input id="new-community" placeholder="New community name" className="border rounded px-3 py-2" />
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                const el = document.getElementById('new-community') as HTMLInputElement | null;
                if (!el || !el.value.trim()) return;
                const c: Community = { id: genId(), name: el.value.trim(), residentIds: [] };
                setCommunities(prev => [...prev, c]);
                el.value = '';
              }}
            >Create community</button>
          </div>
          <div className="flex gap-2 overflow-auto mb-3">
            {communities.map(c => (
              <div
                key={c.id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const id = e.dataTransfer.getData('text/residentId');
                  if (!id) return;
                  setResidents(prev => prev.map(r => r.id === id ? { ...r, communityId: c.id, updatedAt: Date.now(), updatedBy: user?.id ?? null } : r));
                }}
                onClick={() => setSelectedCommunity(c.id)}
                className={`min-w-[200px] p-2 rounded border bg-white cursor-pointer text-sm ${selectedCommunity === c.id ? 'ring-2 ring-blue-300' : ''}`}
              >
                  <div className="font-semibold mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{c.name}</div>
                    <button
                      className="text-xs text-gray-500"
                      onClick={e => { e.stopPropagation(); const newName = prompt('Rename community', c.name); if (newName && newName.trim()) setCommunities(prev => prev.map(pc => pc.id === c.id ? { ...pc, name: newName.trim() } : pc)); }}
                    >Rename</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400">{residents.filter(r => r.communityId === c.id).length} residents</div>
                    <button
                      className="text-xs text-gray-500"
                      onClick={e => { e.stopPropagation(); setCommunityOpen(prev => ({ ...prev, [c.id]: !prev[c.id] })); }}
                    >{communityOpen[c.id] ? 'Hide' : 'Show'}</button>
                    <button
                      className="text-xs text-red-500"
                      onClick={e => {
                        e.stopPropagation();
                        if (!confirm(`Delete community "${c.name}"? This will remove membership for its residents.`)) return;
                        // remove community and clear resident.communityId for members
                        setCommunities(prev => prev.filter(pc => pc.id !== c.id));
                        setResidents(prev => prev.map(r => r.communityId === c.id ? { ...r, communityId: null } : r));
                        if (selectedCommunity === c.id) setSelectedCommunity(null);
                      }}
                    >Delete</button>
                  </div>
                </div>
                {communityOpen[c.id] ? (
                  <div className="mt-1">
                    {residents.filter(r => r.communityId === c.id).length === 0 ? (
                      <div className="text-sm text-gray-500">No members</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {residents.filter(r => r.communityId === c.id).map(r => (
                          <div key={r.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="text-sm truncate" title={`${r.name} — ${r.room}`}>{r.name || 'Unnamed'} <span className="text-xs text-gray-400">({r.room || '-'})</span></div>
                            <div className="flex items-center gap-2">
                              <button className="text-xs text-blue-600" onClick={e => { e.stopPropagation(); const idx = residents.findIndex(rr => rr.id === r.id); if (idx >= 0) openEditModal(idx); }}>Edit</button>
                              <button className="text-xs text-red-500" onClick={e => { e.stopPropagation(); setResidents(prev => prev.map(rr => rr.id === r.id ? { ...rr, communityId: null } : rr)); }} aria-label={`Remove ${r.name} from ${c.name}`}>✕</button>
                              <button className="text-xs text-red-600" onClick={e => { e.stopPropagation(); deleteResidentById(r.id); }}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        {
          // First, render any open community member groups in the main area
          communities.filter(c => communityOpen[c.id]).map(c => {
              const members = residents.filter(r => r.communityId === c.id).slice().sort((x, y) => compareRooms(x.room, y.room));
            if (members.length === 0) return null;
            return (
              <div key={`group-${c.id}`} className="mb-4">
                <div className="text-sm font-semibold mb-2">{c.name}</div>
                <div className="flex flex-wrap gap-6 mb-6">
                      {members.map(r => {
                    const idx = residents.findIndex(rr => rr.id === r.id);
                    const careMinutes = calculateResidentCareMinutes(r);
                    const inCommunity = true;
                    return (
                      <div
                        key={r.id}
                        draggable
                        onDragStart={e => {
                          if (!r.id) return;
                          e.dataTransfer.setData('text/residentId', r.id);
                        }}
                        className={`relative bg-white rounded-lg shadow-sm p-4 w-64 cursor-pointer hover:ring-2 ring-blue-400 transition ${inCommunity ? 'ring-2 ring-green-300' : ''}`}
                        onClick={() => { if (idx >= 0) openEditModal(idx); }}
                      >
                        <div className="mb-2">
                          <div>
                            <div className="font-semibold text-base">{r.name || "Unnamed"}</div>
                            <div className="text-xs text-gray-500">Room: {r.room || "-"}</div>
                            {r.updatedAt && (
                              <div className="text-xs text-gray-400">Last edited {timeAgo(r.updatedAt)}{r.updatedBy ? ` by ${r.updatedBy}` : ''}</div>
                            )}
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            <button className="text-xs text-blue-600 underline" onClick={e => { e.stopPropagation(); if (idx >= 0) openEditModal(idx); }}>Edit</button>
                            <button className="text-xs text-red-600 ml-2" onClick={e => { e.stopPropagation(); deleteResidentById(r.id); }}>Delete</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-2">
                          {FIELDS.slice(0, 4).map(f => (
                            <div key={f.key} className="truncate">
                              <span className="font-medium">{f.label}:</span> {r[f.key as keyof Resident] || "-"}
                            </div>
                          ))}
                        </div>

                            <div className="mt-3 text-xs text-gray-700">
                                <div className="font-semibold mb-1">Estimated Care:</div>
                                <div>Day: <span className="font-mono">{Math.round((careMinutes.Day / 60) * 100) / 100}</span>h • Night: <span className="font-mono">{Math.round((careMinutes.Night / 60) * 100) / 100}</span>h</div>
                                <div className="text-xs mt-1">12h Day: <span className="font-mono">{Math.round(ceilToQuarter((careMinutes.Day / 60 / 12)) * 100) / 100}</span> • 12h Night: <span className="font-mono">{Math.round(ceilToQuarter((careMinutes.Night / 60 / 12)) * 100) / 100}</span></div>
                              </div>
                        <div className="mt-2 text-xs text-gray-400">Click for full details</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        }

  {residents.filter(r => !r.communityId).slice().sort((x, y) => compareRooms(x.room, y.room)).map((r) => {
    const idx = residents.findIndex(rr => rr.id === r.id);
    const careMinutes = calculateResidentCareMinutes(r);
          const inCommunity = false;
          return (
            <div
              key={r.id}
              draggable
              onDragStart={e => {
                if (!r.id) return;
                e.dataTransfer.setData('text/residentId', r.id);
              }}
              className={`relative bg-white rounded-lg shadow-sm p-4 w-64 cursor-pointer hover:ring-2 ring-blue-400 transition ${inCommunity ? 'ring-2 ring-green-300' : ''}`}
              onClick={() => { if (idx >= 0) openEditModal(idx); }}
            >
              <div className="mb-2">
                <div>
                  <div className="font-semibold text-lg">{r.name || "Unnamed"}</div>
                  <div className="text-sm text-gray-500">Room: {r.room || "-"}</div>
                  {r.updatedAt && (
                    <div className="text-xs text-gray-400">Last edited {timeAgo(r.updatedAt)}{r.updatedBy ? ` by ${r.updatedBy}` : ''}</div>
                  )}
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button className="text-xs text-blue-600 underline" onClick={e => { e.stopPropagation(); if (idx >= 0) openEditModal(idx); }}>Edit</button>
                  <button className="text-xs text-red-600 ml-2" onClick={e => { e.stopPropagation(); deleteResidentById(r.id); }}>Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-2">
                {FIELDS.slice(0, 4).map(f => (
                  <div key={f.key} className="truncate">
                    <span className="font-medium">{f.label}:</span> {r[f.key as keyof Resident] || "-"}
                  </div>
                ))}
              </div>

                <div className="mt-3 text-xs text-gray-700">
                  <div className="font-semibold mb-1">Estimated Care:</div>
                  <div>Day: <span className="font-mono">{Math.round((careMinutes.Day / 60) * 100) / 100}</span>h • Night: <span className="font-mono">{Math.round((careMinutes.Night / 60) * 100) / 100}</span>h</div>
                          <div className="text-xs mt-1">12h Day: <span className="font-mono">{Math.round(ceilToQuarter((careMinutes.Day / 60 / 12)) * 100) / 100}</span> • 12h Night: <span className="font-mono">{Math.round(ceilToQuarter((careMinutes.Night / 60 / 12)) * 100) / 100}</span></div>
                </div>
              <div className="mt-2 text-xs text-gray-400">Click for full details</div>
            </div>
          );
        })}
        

        

  {/* Residents Table (Expandable Rows) */}
  {residents.length > 0 && (
    selectedCommunity ? (
      <ResidentTable residentsProp={residents.filter(r => r.communityId === selectedCommunity || communities.find(c => c.id === selectedCommunity)?.residentIds.includes(r.id || ''))} />
    ) : (
  <ResidentTable />
    )
  )}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="mb-6">
              <div className="text-lg font-bold mb-2">
                {editingIndex !== null ? "Edit Resident" : "Add Resident"}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                Step {step + 1} of {FIELDS.length + 2}
              </div>
            </div>
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-1">Resident Name</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Room</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    name="room"
                    value={form.room}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
            {step > 0 && step <= FIELDS.length && (
              <div className="space-y-4">
                <label className="block font-medium mb-1">{FIELDS[step - 1].label}</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  name={FIELDS[step - 1].key}
                  value={(form[FIELDS[step - 1].key as keyof Resident] as DependencyLevel) ?? ""}
                  onChange={handleChange}
                  autoFocus
                >
                  <option value="">Select...</option>
                  <option value="None">No Needs</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            )}
            {step === FIELDS.length + 1 && (
              <div className="space-y-4">
                <label className="block font-medium mb-1">Assign to Community (optional)</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  name="communityId"
                  value={form.communityId ?? ""}
                  onChange={e => setForm({ ...form, communityId: e.target.value || null })}
                >
                  <option value="">None</option>
                  {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {stepError && (
              <div className="mt-3 text-sm text-red-600" role="alert">{stepError}</div>
            )}
            <div className="flex justify-between mt-8">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                onClick={handleBack}
                disabled={step === 0}
              >Back</button>
              <div className="flex items-center gap-3">
                {editingIndex !== null && (
                  <button
                    className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                    onClick={() => { deleteResidentById(residents[editingIndex!]?.id); }}
                  >Delete</button>
                )}
                {step < FIELDS.length + 1 ? (
                  <button
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={attemptNext}
                    disabled={false}
                  >Next</button>
                ) : (
                  <button
                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                    onClick={attemptSave}
                    disabled={false}
                  >Save</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  
      </div>
    </div>
  );
}
