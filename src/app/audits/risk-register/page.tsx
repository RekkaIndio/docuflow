"use client";
import React, { useMemo, useState } from "react";

type RiskRow = {
  rm: string;
  name: string;
  dementia?: boolean;
  diabetic?: boolean;
  copd?: boolean;
  parkinsons?: boolean;
  epilepsy?: boolean;
  modifiedDiet?: boolean;
  sensorMat?: boolean;
  pacemaker?: boolean;
  oxygen?: boolean;
  bedrails?: boolean;
  catheter?: boolean;
  stoma?: boolean;
  airMatress?: boolean;
  dolsApplied?: boolean;
  dolsCondition?: string;
  abscondingRisk?: boolean;
  allergies?: string;
  pressureSoreRisk?: string;
  palliativeCare?: boolean;
  waterlow?: number | null;
  must2OrAbove?: boolean;
  poa?: boolean;
  smoking?: boolean;
  dnacpr?: boolean;
  bloodThinners?: boolean;
  lapStrap?: boolean;
  creams?: boolean;
  infectionRisk?: boolean;
  constipation?: boolean;
  notes?: string;
};

const columns = [
  'Dementia','Diabetic','COPD/Asthma','Parkinson\'s','Epilepsy','Modified diet','Sensor Mat/Crash mat','Pacemaker','Oxygen','Bedrails/Safety gate','Catheter','Stoma','Air-mattress','DOLS applied','DOLS Condition','Absconding/self-harm/suicide','Allergies medication/food','Pressure sore/leg ulcer','Palliative care/end of life','Waterlow','Must 2 or above','POA','SMOKING','DNACPR / Peace Doc','Blood thinners','Lap strap','Creams','Infection risk','Constipation'
];

export default function RiskRegisterAuditPage() {
  // scaffold some rows for demo purposes
  const [rows, setRows] = useState<RiskRow[]>(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      rm: String(i + 1),
      name: '',
      dementia: false,
      diabetic: false,
      copd: false,
      parkinsons: false,
      epilepsy: false,
      modifiedDiet: false,
      sensorMat: false,
      pacemaker: false,
      oxygen: false,
      bedrails: false,
      catheter: false,
      stoma: false,
      airMatress: false,
      dolsApplied: false,
      dolsCondition: '',
      abscondingRisk: false,
      allergies: '',
      pressureSoreRisk: '',
      palliativeCare: false,
      waterlow: null,
      must2OrAbove: false,
      poa: false,
      smoking: false,
      dnacpr: false,
      bloodThinners: false,
      lapStrap: false,
      creams: false,
      infectionRisk: false,
      constipation: false,
      notes: ''
    }));
  });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const summary = useMemo(() => {
    return rows.map((r) => ({
      rm: r.rm,
      name: r.name || '—',
      flags: [
        r.dementia && 'Dementia',
        r.diabetic && 'Diabetic',
        r.copd && 'COPD',
        r.parkinsons && "Parkinson's",
        r.epilepsy && 'Epilepsy'
      ].filter(Boolean) as string[]
    }));
  }, [rows]);

  function updateRow(index: number, patch: Partial<RiskRow>) {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  return (
    <div className="p-6">
      <button
        onClick={() => window.history.back()}
        className="mb-4 p-2 text-blue-600 hover:text-blue-800"
      >
        ← Back to Audits
      </button>

      <h1 className="text-2xl font-semibold mb-4">Risk Register</h1>

      <p className="text-sm text-muted-foreground mb-6">Compact list view — click a row's Details to open the full risk form for that room.</p>

      <div className="grid gap-3">
        {summary.map((s, i) => (
          <div key={s.rm} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
            <div>
              <div className="text-lg font-medium">Room {s.rm} — {s.name}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {s.flags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No major flags</span>
                ) : (
                  s.flags.map((f) => (
                    <span key={f} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{f}</span>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIndex(i)}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[95%] max-w-4xl bg-white rounded p-6 overflow-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold">Room {rows[selectedIndex].rm} — Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="px-3 py-1 border rounded"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  value={rows[selectedIndex].name}
                  onChange={(e) => updateRow(selectedIndex, { name: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Waterlow score</label>
                <input
                  type="number"
                  value={rows[selectedIndex].waterlow ?? ''}
                  onChange={(e) => updateRow(selectedIndex, { waterlow: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              {/* checkbox grid for many boolean fields */}
              <div className="md:col-span-2 border-t pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(
                    [
                      ['dementia','Dementia'],
                      ['diabetic','Diabetic'],
                      ['copd','COPD/Asthma'],
                      ['parkinsons','Parkinson\'s'],
                      ['epilepsy','Epilepsy'],
                      ['modifiedDiet','Modified diet'],
                      ['sensorMat','Sensor Mat/Crash mat'],
                      ['pacemaker','Pacemaker'],
                      ['oxygen','Oxygen'],
                      ['bedrails','Bedrails/Safety gate'],
                      ['catheter','Catheter'],
                      ['stoma','Stoma'],
                      ['airMatress','Air-mattress'],
                      ['dolsApplied','DOLS applied'],
                      ['abscondingRisk','Absconding/self-harm/suicide'],
                      ['palliativeCare','Palliative care/end of life'],
                      ['must2OrAbove','Must 2 or above'],
                      ['poa','POA'],
                      ['smoking','Smoking'],
                      ['dnacpr','DNACPR'],
                      ['bloodThinners','Blood thinners'],
                      ['lapStrap','Lap strap'],
                      ['creams','Creams'],
                      ['infectionRisk','Infection risk'],
                      ['constipation','Constipation']
                    ] as [keyof RiskRow, string][]
                  ).map(([key,label]) => (
                    <label key={String(key)} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(rows[selectedIndex][key])}
                        onChange={(e) => updateRow(selectedIndex, { [key]: e.target.checked } as any)}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Allergies / Medication notes</label>
                <input
                  value={rows[selectedIndex].allergies}
                  onChange={(e) => updateRow(selectedIndex, { allergies: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Pressure sore / Leg ulcer notes</label>
                <input
                  value={rows[selectedIndex].pressureSoreRisk}
                  onChange={(e) => updateRow(selectedIndex, { pressureSoreRisk: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">DOLS condition</label>
                <input
                  value={rows[selectedIndex].dolsCondition}
                  onChange={(e) => updateRow(selectedIndex, { dolsCondition: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Notes / Actions</label>
                <textarea
                  value={rows[selectedIndex].notes}
                  onChange={(e) => updateRow(selectedIndex, { notes: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded h-24"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedIndex(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
