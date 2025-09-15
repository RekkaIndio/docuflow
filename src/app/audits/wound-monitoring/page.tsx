'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AuditFooter from '@/components/audit-footer';

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

  // Accept a base classname so callers can pass component classes like "w-full"
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return getFieldError(fieldName)
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
      : baseClassName;
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
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Wound Monitoring Audit</h1>
          <p className="mb-4 text-slate-500">Track wounds, summary statistics, and actions. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                name="home"
                value={data.home}
                onChange={(e) => handleChange('home', e.target.value)}
                placeholder="Enter care home name"
                required
              />
              {getFieldError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input
                type="date"
                className={getFieldClassName('date', "w-full")}
                name="date"
                value={data.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
              {getFieldError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <Input
                type="text"
                className={getFieldClassName('personCompletingAudit', "w-full")}
                name="personCompletingAudit"
                value={data.personCompletingAudit}
                onChange={(e) => handleChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                required
              />
              {getFieldError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            {sections.map((section, index) => (
              <div key={index} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(section.id)}
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
                  <div className="px-8 pb-8">
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{section.guidance}</p>
                    </div>

                    <div className="space-y-6">
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
                                    <Input
                                      type="date"
                                      value={r.dateAcquired}
                                      onChange={(e) => handleRowChange(i, 'dateAcquired', e.target.value)}
                                      className="w-full p-2"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <Input
                                      value={r.room}
                                      onChange={(e) => handleRowChange(i, 'room', e.target.value)}
                                      className="w-full p-2"
                                      placeholder="Room"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <Input
                                      value={r.initials}
                                      onChange={(e) => handleRowChange(i, 'initials', e.target.value)}
                                      className="w-full p-2"
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
                                    <Input
                                      value={r.woundType}
                                      onChange={(e) => handleRowChange(i, 'woundType', e.target.value)}
                                      className="w-full p-2"
                                      placeholder="Wound type"
                                    />
                                  </td>
                                  <td className="border border-gray-300 p-3">
                                    <Input
                                      value={r.actionsTaken}
                                      onChange={(e) => handleRowChange(i, 'actionsTaken', e.target.value)}
                                      className="w-full p-2"
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
                                    <Input
                                      value={r.actionsContinue}
                                      onChange={(e) => handleRowChange(i, 'actionsContinue', e.target.value)}
                                      className="w-full p-2"
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
                              <Input
                                type="number"
                                value={data.total_pressure_injuries}
                                onChange={(e) => handleChange('total_pressure_injuries', e.target.value)}
                                className="w-full p-3"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total number of skin conditions</label>
                              <Input
                                type="number"
                                value={data.total_skin_conditions}
                                onChange={(e) => handleChange('total_skin_conditions', e.target.value)}
                                className="w-full p-3"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div>
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Pressure Injury Grading</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grade 2 (G2)</label>
                                <Input
                                  type="number"
                                  value={data.g2}
                                  onChange={(e) => handleChange('g2', e.target.value)}
                                  className="w-full p-3"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grade 3 (G3)</label>
                                <Input
                                  type="number"
                                  value={data.g3}
                                  onChange={(e) => handleChange('g3', e.target.value)}
                                  className="w-full p-3"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Grade 4 (G4)</label>
                                <Input
                                  type="number"
                                  value={data.g4}
                                  onChange={(e) => handleChange('g4', e.target.value)}
                                  className="w-full p-3"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Unstageable</label>
                                <Input
                                  type="number"
                                  value={data.unstageable}
                                  onChange={(e) => handleChange('unstageable', e.target.value)}
                                  className="w-full p-3"
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
                                <Input
                                  type="number"
                                  value={data.total_moisture_lesions}
                                  onChange={(e) => handleChange('total_moisture_lesions', e.target.value)}
                                  className="w-full p-3"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Skin tears</label>
                                <Input
                                  type="number"
                                  value={data.total_skin_tears}
                                  onChange={(e) => handleChange('total_skin_tears', e.target.value)}
                                  className="w-full p-3"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bruises</label>
                                <Input
                                  type="number"
                                  value={data.total_bruises}
                                  onChange={(e) => handleChange('total_bruises', e.target.value)}
                                  className="w-full p-3"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgical wounds</label>
                                <Input
                                  type="number"
                                  value={data.total_surgical_wounds}
                                  onChange={(e) => handleChange('total_surgical_wounds', e.target.value)}
                                  className="w-full p-3"
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
                          <Textarea
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
              <Button type="submit" className="px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 font-medium disabled:opacity-50" disabled={saving}>
                {saving ? 'Saving...' : 'Complete Audit'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handleModalCreate(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" disabled={saving}>{saving ? 'Saving...' : 'No'}</button>
              <button onClick={() => handleModalCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={saving}>{saving ? 'Saving...' : 'Yes, Create Action Plan'}</button>
              <button onClick={() => handleModalCreate(false)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" disabled={saving}>{saving ? 'Saving...' : 'Save and Close'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
