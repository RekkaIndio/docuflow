'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';

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
    <div className="max-w-5xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Wound Monitoring Audit</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentReport(Math.max(1, currentReport - 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === 1}>←</button>
              <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
              <button onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === totalReports}>→</button>
            </div>
            <div className="bg-red-500 p-2 rounded"><button onClick={addRow} className="text-white">+</button></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Audit Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
              <input value={data.home} data-field="home" onChange={(e) => handleChange('home', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter home name" />
              {errors.includes('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of audit</label>
              <input type="date" value={data.date} data-field="date" onChange={(e) => handleChange('date', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
              {errors.includes('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person completing the audit</label>
              <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
              {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Date acquired</th>
                <th className="border p-2">Room</th>
                <th className="border p-2">Initials</th>
                <th className="border p-2">Is wound closed?</th>
                <th className="border p-2">Wound type</th>
                <th className="border p-2">What action have been taken to date for wound?</th>
                <th className="border p-2">Has the wound improved?</th>
                <th className="border p-2">Actions to continue going forward</th>
                <th className="border p-2">Remove</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="even:bg-gray-50">
                  <td className="border p-2"><input value={r.dateAcquired} onChange={(e) => handleRowChange(i, 'dateAcquired', e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="border p-2"><input value={r.room} onChange={(e) => handleRowChange(i, 'room', e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="border p-2"><input value={r.initials} onChange={(e) => handleRowChange(i, 'initials', e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="border p-2">
                    <select value={r.isClosed} onChange={(e) => handleRowChange(i, 'isClosed', e.target.value as YesNoNA)} className="w-full p-1 border rounded">
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </td>
                  <td className="border p-2"><input value={r.woundType} onChange={(e) => handleRowChange(i, 'woundType', e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="border p-2"><input value={r.actionsTaken} onChange={(e) => handleRowChange(i, 'actionsTaken', e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="border p-2">
                    <select value={r.hasImproved} onChange={(e) => handleRowChange(i, 'hasImproved', e.target.value as YesNoNA)} className="w-full p-1 border rounded">
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </td>
                  <td className="border p-2"><input value={r.actionsContinue} onChange={(e) => handleRowChange(i, 'actionsContinue', e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="border p-2 text-center"><button onClick={() => removeRow(i)} className="text-red-600">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="block font-semibold">Total number of pressure injuries</label>
            <input value={data.total_pressure_injuries} onChange={(e) => handleChange('total_pressure_injuries', e.target.value)} className="w-32 p-2 border rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className="block">G2</label>
              <input value={data.g2} onChange={(e) => handleChange('g2', e.target.value)} className="w-24 p-2 border rounded" />
            </div>
            <div>
              <label className="block">G3</label>
              <input value={data.g3} onChange={(e) => handleChange('g3', e.target.value)} className="w-24 p-2 border rounded" />
            </div>
            <div>
              <label className="block">G4</label>
              <input value={data.g4} onChange={(e) => handleChange('g4', e.target.value)} className="w-24 p-2 border rounded" />
            </div>
            <div>
              <label className="block">Unstageable</label>
              <input value={data.unstageable} onChange={(e) => handleChange('unstageable', e.target.value)} className="w-24 p-2 border rounded" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block">Total number of moisture lesions</label>
              <input value={data.total_moisture_lesions} onChange={(e) => handleChange('total_moisture_lesions', e.target.value)} className="w-32 p-2 border rounded" />
            </div>
            <div>
              <label className="block">Total number of skin tears</label>
              <input value={data.total_skin_tears} onChange={(e) => handleChange('total_skin_tears', e.target.value)} className="w-32 p-2 border rounded" />
            </div>
            <div>
              <label className="block">Total number of bruises</label>
              <input value={data.total_bruises} onChange={(e) => handleChange('total_bruises', e.target.value)} className="w-32 p-2 border rounded" />
            </div>
            <div>
              <label className="block">Total number of surgical wounds</label>
              <input value={data.total_surgical_wounds} onChange={(e) => handleChange('total_surgical_wounds', e.target.value)} className="w-32 p-2 border rounded" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block">Total number of skin conditions</label>
            <input value={data.total_skin_conditions} onChange={(e) => handleChange('total_skin_conditions', e.target.value)} className="w-48 p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea value={data.comments} onChange={(e) => handleChange('comments', e.target.value)} rows={4} className="w-full p-2 border rounded resize-none" />
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={handleComplete} className="px-4 py-2 bg-blue-600 text-white rounded">Complete Audit</button>
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
    </div>
  );
}
