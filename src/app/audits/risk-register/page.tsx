"use client";
import React, { useMemo, useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';
import { markAuditCompletedWithSnapshot } from '@/lib/firestore';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

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
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const { user } = useAuth();
  const activeWorkspace = useWorkspace();

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'resident-overview': true,
    'risk-management': false,
    'final-comments': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'resident-overview',
      title: 'Resident Risk Overview',
      color: 'green',
      guidance: 'View and manage resident risk information organized by room. Add new residents and track their risk factors.',
      content: 'overview'
    },
    {
      id: 'risk-management',
      title: 'Risk Management Details',
      color: 'blue',
      guidance: 'Detailed risk assessment and management information for individual residents.',
      content: 'details'
    },
    {
      id: 'final-comments',
      title: 'Final Comments',
      color: 'gray',
      guidance: 'Add any final comments or observations from the risk register audit.',
      content: 'comments'
    },
  ];

  // Helper functions
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getFieldError = (fieldName: string) => {
    return false; // No validation errors for this audit
  };

  const getFieldClassName = (fieldName: string) => {
    const baseClasses = "w-full p-2 border rounded";
    return getFieldError(fieldName)
      ? `${baseClasses} border-red-500 bg-red-50`
      : `${baseClasses} border-gray-300`;
  };

  function createNewRoom(): RiskRow {
    const nextRoomNumber = rows.length + 1;
    return {
      rm: String(nextRoomNumber),
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
    };
  }

  function addNewRoom() {
    const newRoom = createNewRoom();
    setRows(prev => [...prev, newRoom]);
  }

  function deleteRoom(index: number) {
    setRows(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-number remaining rooms sequentially
      return updated.map((room, i) => ({
        ...room,
        rm: String(i + 1)
      }));
    });
    // Close modal if the deleted room was selected
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  }

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
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Risk Register Audit</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Audit Information */}
          <div className="lg:col-span-1">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-900">Audit Information</h2>
              </div>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Manage resident risk information by room. Track medical conditions, equipment needs, and care requirements for each resident.</p>
                </div>
                <div className="pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Total Residents: {rows.length}</div>
                  <div className="text-sm text-gray-600">
                    {rows.filter(r => r.dementia || r.diabetic || r.epilepsy || r.parkinsons).length} residents with major risk flags
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Collapsible Sections */}
          <div className="lg:col-span-2 space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  {openSections[section.id] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {openSections[section.id] && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 mb-4">{section.guidance}</p>
                    <div className="space-y-4">
                      {section.content === 'overview' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <button
                              onClick={addNewRoom}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <span>+</span>
                              Add New Resident
                            </button>
                          </div>

                          {rows.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <div className="text-gray-500 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No residents added yet</h3>
                              <p className="text-gray-500 mb-4">Get started by adding your first resident to track their risks.</p>
                              <button
                                onClick={addNewRoom}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Add First Resident
                              </button>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {summary.map((s, i) => (
                                <div key={s.rm} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex-1">
                                    <div className="text-lg font-medium mb-1">Room {s.rm} — {s.name || 'Unnamed'}</div>
                                    <div className="flex flex-wrap gap-2">
                                      {s.flags.length === 0 ? (
                                        <span className="text-sm text-gray-500">No major flags</span>
                                      ) : (
                                        s.flags.map((f) => (
                                          <span key={f} className="text-xs px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">{f}</span>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 ml-4">
                                    <button
                                      onClick={() => setSelectedIndex(i)}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      Details
                                    </button>
                                    <button
                                      onClick={() => deleteRoom(i)}
                                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {section.content === 'details' && (
                        <div className="text-center py-8 text-gray-500">
                          <p>Select a resident from the overview section above to view and edit their detailed risk information.</p>
                        </div>
                      )}

                      {section.content === 'comments' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Final Comments</label>
                          <textarea
                            value={finalComments}
                            onChange={(e) => setFinalComments(e.target.value)}
                            rows={6}
                            className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter any final comments or observations from the risk register audit..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={rows.length === 0 || saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete Audit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resident Details Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Room {rows[selectedIndex].rm}</h2>
                <p className="text-gray-600 mt-1">Risk Assessment Details</p>
              </div>
              <button
                onClick={() => setSelectedIndex(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-8">
                {/* Basic Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Resident Name</label>
                      <input
                        value={rows[selectedIndex].name}
                        onChange={(e) => updateRow(selectedIndex, { name: e.target.value })}
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter resident name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Waterlow Score</label>
                      <input
                        type="number"
                        value={rows[selectedIndex].waterlow ?? ''}
                        onChange={(e) => updateRow(selectedIndex, { waterlow: e.target.value ? Number(e.target.value) : null })}
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter score"
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Conditions */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">Medical Conditions & Risks</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(
                      [
                        ['dementia','Dementia'],
                        ['diabetic','Diabetic'],
                        ['copd','COPD/Asthma'],
                        ['parkinsons','Parkinson\'s'],
                        ['epilepsy','Epilepsy'],
                        ['palliativeCare','Palliative care/end of life'],
                        ['smoking','Smoking'],
                        ['bloodThinners','Blood thinners'],
                        ['infectionRisk','Infection risk'],
                        ['constipation','Constipation']
                      ] as [keyof RiskRow, string][]
                    ).map(([key,label]) => (
                      <label key={String(key)} className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-green-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(rows[selectedIndex][key])}
                          onChange={(e) => updateRow(selectedIndex, { [key]: e.target.checked } as any)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Equipment & Monitoring */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">Equipment & Monitoring</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(
                      [
                        ['modifiedDiet','Modified diet'],
                        ['sensorMat','Sensor Mat/Crash mat'],
                        ['pacemaker','Pacemaker'],
                        ['oxygen','Oxygen'],
                        ['bedrails','Bedrails/Safety gate'],
                        ['catheter','Catheter'],
                        ['stoma','Stoma'],
                        ['airMatress','Air-mattress'],
                        ['lapStrap','Lap strap'],
                        ['creams','Creams']
                      ] as [keyof RiskRow, string][]
                    ).map(([key,label]) => (
                      <label key={String(key)} className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-purple-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(rows[selectedIndex][key])}
                          onChange={(e) => updateRow(selectedIndex, { [key]: e.target.checked } as any)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Legal & Administrative */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">Legal & Administrative</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(
                      [
                        ['dolsApplied','DOLS applied'],
                        ['abscondingRisk','Absconding/self-harm/suicide'],
                        ['must2OrAbove','Must 2 or above'],
                        ['poa','POA'],
                        ['dnacpr','DNACPR / Peace Doc']
                      ] as [keyof RiskRow, string][]
                    ).map(([key,label]) => (
                      <label key={String(key)} className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-orange-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(rows[selectedIndex][key])}
                          onChange={(e) => updateRow(selectedIndex, { [key]: e.target.checked } as any)}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Allergies / Medication Notes</label>
                      <input
                        value={rows[selectedIndex].allergies}
                        onChange={(e) => updateRow(selectedIndex, { allergies: e.target.value })}
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        placeholder="Enter allergy information and medication notes"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pressure Sore / Leg Ulcer Notes</label>
                      <input
                        value={rows[selectedIndex].pressureSoreRisk}
                        onChange={(e) => updateRow(selectedIndex, { pressureSoreRisk: e.target.value })}
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        placeholder="Enter pressure sore or leg ulcer information"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">DOLS Condition</label>
                      <input
                        value={rows[selectedIndex].dolsCondition}
                        onChange={(e) => updateRow(selectedIndex, { dolsCondition: e.target.value })}
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        placeholder="Enter DOLS condition details"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">General Notes / Actions</label>
                      <textarea
                        value={rows[selectedIndex].notes}
                        onChange={(e) => updateRow(selectedIndex, { notes: e.target.value })}
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 h-32 resize-none"
                        placeholder="Enter any additional notes, care requirements, or actions needed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedIndex(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Audit Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Complete Risk Register Audit</h3>
            <p className="text-gray-600 mb-4">Would you like to add any final comments before completing this audit? A PDF snapshot will be saved.</p>
            <textarea
              value={finalComments}
              onChange={e => setFinalComments(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none mb-4"
              rows={4}
              placeholder="Enter any final comments or notes..."
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCompleteModal(false)} disabled={saving} className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">Cancel</button>
              <button
                onClick={async () => {
                  if (!activeWorkspace?.id) {
                    alert('No active workspace. Please select a workspace before saving.');
                    return;
                  }
                  setSaving(true);
                  try {
                    const auditData = {
                      residents: rows,
                      comments: finalComments,
                      completedBy: user?.id ?? null,
                      completedAt: new Date().toISOString(),
                    };
                    await markAuditCompletedWithSnapshot(activeWorkspace.id, 'risk-register', auditData, auditData.completedAt);
                    setShowCompleteModal(false);
                    alert('Audit completed and PDF snapshot saved.');
                  } catch (err) {
                    console.error('Failed to complete audit', err);
                    alert('Failed to complete audit. Please try again.');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
