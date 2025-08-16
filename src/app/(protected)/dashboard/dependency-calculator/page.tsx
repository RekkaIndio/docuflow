
"use client";
import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type DependencyLevel = "Low" | "Medium" | "High" | "";
type Shift = "AM" | "PM" | "Night";

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

const DEPENDENCY_WEIGHTS: Record<Exclude<DependencyLevel, "">, number> = { Low: 1, Medium: 2, High: 3 };
const SHIFTS: Shift[] = ["AM", "PM", "Night"];

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

// Default care minutes per field per shift by dependency level
const CARE_MINUTES: Record<DependencyLevel, number> = {
  "": 0,
  Low: 15,
  Medium: 30,
  High: 60,
};

// For now, use same minutes for all shifts; can be customized per shift if needed
const SHIFTS_LIST: Shift[] = ["AM", "PM", "Night"];

function calculateResidentCareHours(resident: Resident): Record<Shift, number> {
  // For each shift, sum the minutes for all fields
  const result: Record<Shift, number> = { AM: 0, PM: 0, Night: 0 };
  for (const shift of SHIFTS_LIST) {
    let totalMinutes = 0;
    for (const field of FIELDS) {
  const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
  totalMinutes += CARE_MINUTES[level as DependencyLevel];
    }
    result[shift] = Math.round((totalMinutes / 60) * 100) / 100; // hours, rounded to 2 decimals
  }
  return result;
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
    const [form, setForm] = useState<Resident>({
      name: "",
      room: "",
      ...getDefaultAssessment(),
      communityId: null,
    });
    const [staff, setStaff] = useState<Record<Shift, number>>({ AM: 0, PM: 0, Night: 0 });

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
        return val === "Low" || val === "Medium" || val === "High";
      }
      if (s === FIELDS.length + 1) return true; // community selection optional
      return true;
    }

    function isAllValid() {
      if (form.name.trim() === "" || form.room.trim() === "") return false;
      for (const f of FIELDS) {
        const val = form[f.key as keyof Resident] as DependencyLevel | undefined;
        if (!(val === "Low" || val === "Medium" || val === "High")) return false;
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
    } catch (e) {
      console.warn("Failed to save residents/communities to localStorage", e);
    }

    if (!user) return; // only save to Firestore for authenticated users

    const ref = doc(db, "users", user.id, "dependency_calculator", "default");
    const t = setTimeout(async () => {
      try {
        await setDoc(ref, { residents, communities, schemaVersion: 1, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.warn("Failed to save residents to Firestore", err);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [residents, user?.id]);

  // Expandable resident table component. Accepts optional residentsProp to render a filtered set.
  function ResidentTable({ residentsProp }: { residentsProp?: Resident[] }) {
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const list = residentsProp ?? residents;
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
              <th className="px-4 py-2 text-left"></th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Room</th>
              <th className="px-4 py-2 text-left">AM (h)</th>
              <th className="px-4 py-2 text-left">PM (h)</th>
              <th className="px-4 py-2 text-left">Night (h)</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const careHours = calculateResidentCareHours(r);
              const isOpen = expandedId === r.id;
              return (
                <React.Fragment key={r.id || `${r.name}-${r.room}`}>
                  <tr className="border-t">
                    <td className="px-4 py-2 text-center">
                      <button
                        className="text-blue-600 hover:text-blue-900 focus:outline-none"
                        aria-label={isOpen ? "Collapse details" : "Expand details"}
                        onClick={() => setExpandedId(isOpen ? null : (r.id ?? null))}
                      >
                        {isOpen ? "−" : "+"}
                      </button>
                    </td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 font-mono">{r.room}</td>
                    <td className="px-4 py-2 font-mono">{careHours.AM}</td>
                    <td className="px-4 py-2 font-mono">{careHours.PM}</td>
                    <td className="px-4 py-2 font-mono">{careHours.Night}</td>
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
        </table>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Dependency Calculator</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
        Assess each resident step-by-step. Each card below shows a summary. Click to edit or add a new resident.
      </p>

      <div className="flex flex-wrap gap-6 mb-8">
        {/* Communities area: create and panels */}
        <div className="w-full mb-6">
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
          <div className="flex gap-3 overflow-auto mb-4">
            {communities.map(c => (
              <div
                key={c.id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const id = e.dataTransfer.getData('text/residentId');
                  if (!id) return;
                  // make resident's communityId canonical
                  setResidents(prev => prev.map(r => r.id === id ? { ...r, communityId: c.id, updatedAt: Date.now(), updatedBy: user?.id ?? null } : r));
                }}
                onClick={() => setSelectedCommunity(c.id)}
                className={`min-w-[220px] p-3 rounded border bg-white cursor-pointer ${selectedCommunity === c.id ? 'ring-2 ring-blue-300' : ''}`}
              >
                <div className="font-semibold mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>{c.name}</div>
                    <button
                      className="text-xs text-gray-500"
                      onClick={e => { e.stopPropagation(); const newName = prompt('Rename community', c.name); if (newName && newName.trim()) setCommunities(prev => prev.map(pc => pc.id === c.id ? { ...pc, name: newName.trim() } : pc)); }}
                    >Rename</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400">{residents.filter(r => r.communityId === c.id).length} residents</div>
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
                <div className="mt-2">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {residents.map((r, i) => {
          const careHours = calculateResidentCareHours(r);
          const inCommunity = communities.find(c => c.residentIds.includes(r.id || ''));
          return (
            <div
              key={i}
              draggable
              onDragStart={e => {
                // ensure resident has an id before dragging
                if (!r.id) {
                  const newId = genId();
                  const updated = [...residents];
                  updated[i] = { ...r, id: newId, updatedAt: Date.now(), updatedBy: user?.id ?? null } as Resident;
                  setResidents(updated);
                  e.dataTransfer.setData('text/residentId', newId);
                  return;
                }
                e.dataTransfer.setData('text/residentId', r.id);
              }}
              className={`bg-white rounded-xl shadow p-6 w-80 cursor-pointer hover:ring-2 ring-blue-400 transition ${inCommunity ? 'ring-2 ring-green-300' : ''}`}
              onClick={() => openEditModal(i)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-lg">{r.name || "Unnamed"}</div>
                    <div className="text-sm text-gray-500">Room: {r.room || "-"}</div>
                    {r.updatedAt && (
                      <div className="text-xs text-gray-400">Last edited {timeAgo(r.updatedAt)}{r.updatedBy ? ` by ${r.updatedBy}` : ''}</div>
                    )}
                </div>
                <button
                  className="text-xs text-blue-600 underline"
                  onClick={e => { e.stopPropagation(); openEditModal(i); }}
                >Edit</button>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm mt-2">
                {FIELDS.slice(0, 4).map(f => (
                  <div key={f.key} className="truncate">
                    <span className="font-medium">{f.label}:</span> {r[f.key as keyof Resident] || "-"}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-700">
                <div className="font-semibold mb-1">Estimated Care Hours:</div>
                <div>AM: <span className="font-mono">{careHours.AM}</span>h &nbsp; PM: <span className="font-mono">{careHours.PM}</span>h &nbsp; Night: <span className="font-mono">{careHours.Night}</span>h</div>
              </div>
              <div className="mt-2 text-xs text-gray-400">Click for full details</div>
            </div>
          );
        })}
        <button
          className="flex flex-col items-center justify-center w-80 h-40 border-2 border-dashed border-blue-300 rounded-xl bg-white text-blue-600 hover:bg-blue-50 transition"
          onClick={openAddModal}
        >
          <span className="text-4xl mb-2">+</span>
          <span className="font-semibold">Add Resident</span>
        </button>
      </div>

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
      )}
    </div>
  );
}
