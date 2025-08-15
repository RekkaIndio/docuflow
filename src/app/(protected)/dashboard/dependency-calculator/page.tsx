
"use client";
import React, { useState } from "react";

type DependencyLevel = "Low" | "Medium" | "High" | "";
type Shift = "AM" | "PM" | "Night";

interface Resident {
  name: string;
  room: string;
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
  Low: 5,
  Medium: 10,
  High: 15,
};

// For now, use same minutes for all shifts; can be customized per shift if needed
const SHIFTS_LIST: Shift[] = ["AM", "PM", "Night"];

function calculateResidentCareHours(resident: Resident): Record<Shift, number> {
  // For each shift, sum the minutes for all fields
  const result: Record<Shift, number> = { AM: 0, PM: 0, Night: 0 };
  for (const shift of SHIFTS_LIST) {
    let totalMinutes = 0;
    for (const field of FIELDS) {
      const level = resident[field.key as keyof Resident] as DependencyLevel;
      totalMinutes += CARE_MINUTES[level];
    }
    result[shift] = Math.round((totalMinutes / 60) * 100) / 100; // hours, rounded to 2 decimals
  }
  return result;
}

// Only one export default function
export default function DependencyCalculatorPage() {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<Resident>({
      name: "",
      room: "",
      ...getDefaultAssessment(),
    });
    const [staff, setStaff] = useState<Record<Shift, number>>({ AM: 0, PM: 0, Night: 0 });

    function openAddModal() {
      setForm({ name: "", room: "", ...getDefaultAssessment() });
      setEditingIndex(null);
      setStep(0);
      setModalOpen(true);
    }

    function openEditModal(index: number) {
      const r = residents[index];
      setForm({ ...r });
      setEditingIndex(index);
      setStep(0);
      setModalOpen(true);
    }

    function handleNext() {
      if (step < FIELDS.length + 1) setStep(step + 1);
    }
    function handleBack() {
      if (step > 0) setStep(step - 1);
    }
    function handleChange(e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  function handleSave() {
    if (editingIndex !== null) {
      const updated = [...residents];
      updated[editingIndex] = { ...form };
      setResidents(updated);
    } else {
      setResidents([...residents, { ...form }]);
    }
    setModalOpen(false);
  }

  // Calculate dependency counts
  const dependencyCounts = residents.reduce(
    (acc: { Low: number; Medium: number; High: number; Total: number }, r: Resident) => {
      let found = false;
      for (const f of FIELDS) {
        const val = r[f.key as keyof Resident];
        if (val === "High") acc.High++;
        else if (val === "Medium") acc.Medium++;
        else if (val === "Low") acc.Low++;
        if (["Low", "Medium", "High"].includes(val)) found = true;
      }
      if (found) acc.Total++;
      return acc;
    },
    { Low: 0, Medium: 0, High: 0, Total: 0 }
  );

  // Expandable resident table component (uses outer residents/setResidents)
  function ResidentTable() {
    const [expanded, setExpanded] = React.useState<number | null>(null);
    return (
      <div className="overflow-x-auto rounded-xl shadow bg-white mb-8">
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
            {residents.map((r, i) => {
              const careHours = calculateResidentCareHours(r);
              const isOpen = expanded === i;
              return (
                <React.Fragment key={i}>
                  <tr className="border-t">
                    <td className="px-4 py-2 text-center">
                      <button
                        className="text-blue-600 hover:text-blue-900 focus:outline-none"
                        aria-label={isOpen ? "Collapse details" : "Expand details"}
                        onClick={() => setExpanded(isOpen ? null : i)}
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
                                value={r[f.key as keyof Resident] as string}
                                onChange={e => {
                                  const updated = [...residents];
                                  updated[i] = { ...r, [f.key]: e.target.value } as Resident;
                                  setResidents(updated);
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
        {residents.map((r, i) => {
          const careHours = calculateResidentCareHours(r);
          return (
            <div
              key={i}
              className="bg-white rounded-xl shadow p-6 w-80 cursor-pointer hover:ring-2 ring-blue-400 transition"
              onClick={() => openEditModal(i)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-lg">{r.name || "Unnamed"}</div>
                  <div className="text-sm text-gray-500">Room: {r.room || "-"}</div>
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
  {residents.length > 0 && <ResidentTable />}
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
                  value={form[FIELDS[step - 1].key as keyof Resident]}
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
            <div className="flex justify-between mt-8">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                onClick={handleBack}
                disabled={step === 0}
              >Back</button>
              {step < FIELDS.length + 1 ? (
                <button
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleNext}
                  disabled={step === FIELDS.length + 1}
                >Next</button>
              ) : (
                <button
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSave}
                >Save</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
