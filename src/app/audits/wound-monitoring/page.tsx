'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface WoundRow {
  dateAcquired: string;
  room: string;
  initials: string;
  isClosed: YesNoNA;
  woundType: string;
  actionsTaken: string;
  hasImproved: YesNoNA;
  actionsContinue: string;
}

type YesNoNA = 'Yes' | 'No' | 'N/A' | '';

interface WoundMonitoringData {
  home: string;
  date: string;
  personCompletingAudit: string;
  rows: WoundRow[];

  // summary counts
  total_pressure_injuries: string;
  g2: string;
  g3: string;
  g4: string;
  unstageable: string;
  total_moisture_lesions: string;
  total_skin_tears: string;
  total_bruises: string;
  total_surgical_wounds: string;
  total_skin_conditions: string;

  comments: string;
}

export default function WoundMonitoringAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user: authUser } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'wound-tracking': true,
    'summary-statistics': false,
    'comments': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'wound-tracking',
      title: 'Individual Wound Tracking',
      color: 'green',
      guidance: 'Track individual resident wounds including date acquired, wound type, actions taken, and improvement status.',
      content: 'table'
    },
    {
      id: 'summary-statistics',
      title: 'Wound Summary Statistics',
      color: 'blue',
      guidance: 'Record summary statistics for different types of wounds and skin conditions observed.',
      content: 'summary'
    },
    {
      id: 'comments',
      title: 'Comments',
      color: 'gray',
      guidance: 'Add any additional comments or observations from the wound monitoring audit.',
      content: 'comments'
    },
  ];

  const [data, setData] = useState<WoundMonitoringData>({
    home: '',
    date: '',
    personCompletingAudit: '',
    rows: [{ dateAcquired: '', room: '', initials: '', isClosed: '', woundType: '', actionsTaken: '', hasImproved: '', actionsContinue: '' }],

    total_pressure_injuries: '',
    g2: '',
    g3: '',
    g4: '',
    unstageable: '',
    total_moisture_lesions: '',
    total_skin_tears: '',
    total_bruises: '',
    total_surgical_wounds: '',
    total_skin_conditions: '',

    comments: '',
  });

  // Helper functions
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getFieldError = (fieldName: string) => {
    return errors.includes(fieldName);
  };

  const getFieldClassName = (fieldName: string) => {
    const baseClasses = "w-full p-2 border rounded";
    return getFieldError(fieldName)
      ? `${baseClasses} border-red-500 bg-red-50`
      : `${baseClasses} border-gray-300`;
  };

  const handleChange = (field: keyof WoundMonitoringData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value && errors.includes(field as string)) setErrors(prev => prev.filter(e => e !== (field as string)));
  };

  const handleRowChange = (index: number, field: keyof WoundRow, value: any) => {
    setData(prev => {
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, rows };
    });
  };

  const addRow = () => {
    setData(prev => ({ ...prev, rows: [...prev.rows, { dateAcquired: '', room: '', initials: '', isClosed: '', woundType: '', actionsTaken: '', hasImproved: '', actionsContinue: '' }] }));
  };

  const removeRow = (index: number) => {
    setData(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }));
  };

  const validateForm = () => {
    const required: (keyof WoundMonitoringData)[] = ['home','date','personCompletingAudit'];
    const missing = required.filter(f => !String(data[f] || '').trim());
    setErrors(missing as string[]);
    if (missing.length > 0) {
      const el = document.querySelector(`[data-field="${missing[0]}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return missing.length === 0;
  };

  const handleComplete = () => {
    if (validateForm()) setShowModal(true);
  };

  async function handleModalCreate(createActionPlan: boolean) {
    setShowModal(false);
    // Save audit to Firestore scoped to workspace
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }
    const workspaceId = activeWorkspace.id;
    const payload = {
      ...data,
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId);
      setSavedAuditId(id);
      try {
        await markAuditCompleted(workspaceId, 'wound-monitoring', new Date().toISOString());
      } catch (e) {
        console.warn('Failed to mark audit completed', e);
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to save audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Wound Monitoring Audit</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentReport(Math.max(1, currentReport - 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === 1}>←</button>
              <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
              <button onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === totalReports}>→</button>
            </div>
          </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
                  <input
                    value={data.home}
                    data-field="home"
                    onChange={(e) => handleChange('home', e.target.value)}
                    className={getFieldClassName('home')}
                    placeholder="Enter home name"
                  />
                  {getFieldError('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of audit</label>
                  <input
                    type="date"
                    value={data.date}
                    data-field="date"
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={getFieldClassName('date')}
                  />
                  {getFieldError('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person completing the audit</label>
                  <input
                    value={data.personCompletingAudit}
                    data-field="personCompletingAudit"
                    onChange={(e) => handleChange('personCompletingAudit', e.target.value)}
                    className={getFieldClassName('personCompletingAudit')}
                    placeholder="Enter auditor name"
                  />
                  {getFieldError('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
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
                      {section.content === 'table' && (
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Date acquired</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Room</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Initials</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Is wound closed?</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Wound type</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Actions taken to date</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Has wound improved?</th>
                                <th className="border border-gray-300 p-3 text-left text-sm font-medium text-gray-700">Actions to continue</th>
                                <th className="border border-gray-300 p-3 text-center text-sm font-medium text-gray-700">Remove</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.rows.map((r, i) => (
                                <tr key={i} className="even:bg-gray-25">
                                  <td className="border border-gray-300 p-3">
                                    <input
                                      type="date"
                                      value={r.dateAcquired}
                                      onChange={(e) => handleRowChange(i, 'dateAcquired', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <input
                                      value={r.room}
                                      onChange={(e) => handleRowChange(i, 'room', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Room"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <input
                                      value={r.initials}
                                      onChange={(e) => handleRowChange(i, 'initials', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Initials"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <select
                                      value={r.isClosed}
                                      onChange={(e) => handleRowChange(i, 'isClosed', e.target.value as YesNoNA)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="">Select</option>
                                      <option value="Yes">Yes</option>
                                      <option value="No">No</option>
                                      <option value="N/A">N/A</option>
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <input
                                      value={r.woundType}
                                      onChange={(e) => handleRowChange(i, 'woundType', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Wound type"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <input
                                      value={r.actionsTaken}
                                      onChange={(e) => handleRowChange(i, 'actionsTaken', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Actions taken"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <select
                                      value={r.hasImproved}
                                      onChange={(e) => handleRowChange(i, 'hasImproved', e.target.value as YesNoNA)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="">Select</option>
                                      <option value="Yes">Yes</option>
                                      <option value="No">No</option>
                                      <option value="N/A">N/A</option>
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <input
                                      value={r.actionsContinue}
                                      onChange={(e) => handleRowChange(i, 'actionsContinue', e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="Future actions"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3 text-center">
                                    <button
                                      onClick={() => removeRow(i)}
                                      className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-4 flex justify-center">
                            <button
                              onClick={addRow}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              + Add Wound Entry
                            </button>
                          </div>
                        </div>
                      )}

                      {section.content === 'summary' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total number of pressure injuries</label>
                              <input
                                type="number"
                                value={data.total_pressure_injuries}
                                onChange={(e) => handleChange('total_pressure_injuries', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total number of skin conditions</label>
                              <input
                                type="number"
                                value={data.total_skin_conditions}
                                onChange={(e) => handleChange('total_skin_conditions', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div>
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Pressure Injury Grading</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grade 2 (G2)</label>
                                <input
                                  type="number"
                                  value={data.g2}
                                  onChange={(e) => handleChange('g2', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grade 3 (G3)</label>
                                <input
                                  type="number"
                                  value={data.g3}
                                  onChange={(e) => handleChange('g3', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grade 4 (G4)</label>
                                <input
                                  type="number"
                                  value={data.g4}
                                  onChange={(e) => handleChange('g4', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Unstageable</label>
                                <input
                                  type="number"
                                  value={data.unstageable}
                                  onChange={(e) => handleChange('unstageable', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Other Wound Types</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Moisture lesions</label>
                                <input
                                  type="number"
                                  value={data.total_moisture_lesions}
                                  onChange={(e) => handleChange('total_moisture_lesions', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Skin tears</label>
                                <input
                                  type="number"
                                  value={data.total_skin_tears}
                                  onChange={(e) => handleChange('total_skin_tears', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bruises</label>
                                <input
                                  type="number"
                                  value={data.total_bruises}
                                  onChange={(e) => handleChange('total_bruises', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgical wounds</label>
                                <input
                                  type="number"
                                  value={data.total_surgical_wounds}
                                  onChange={(e) => handleChange('total_surgical_wounds', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {section.content === 'comments' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                          <textarea
                            value={data.comments}
                            onChange={(e) => handleChange('comments', e.target.value)}
                            rows={6}
                            className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter any additional comments or observations..."
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
                onClick={handleComplete}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Complete Audit
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handleModalCreate(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" disabled={saving}>{saving ? 'Saving...' : 'No'}</button>
              <button onClick={() => handleModalCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={saving}>{saving ? 'Saving...' : 'Yes, Create Action Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
