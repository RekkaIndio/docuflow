"use client";
import { useState } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';

interface WeightRow {
  room: string;
  initials: string;
  date: string;
  three_months_tracking: string;
  weight_loss_percent: string;
  bmi_must_notes: string;
  actions_taken: string;
  last_month_action_plan_work: string;
}

interface WeightMonitoringData {
  home: string;
  date: string;
  personCompletingAudit: string;
  rows: WeightRow[];

  residents_palliative: string;
  residents_obese_losing_towards_healthy: string;
  num_resident_weight_loss: string;
  num_resident_weight_gain: string;
  themes_trends: string;
  action_plan_required: string;
}

export default function WeightMonitoringAuditPage() {
  const [currentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [errors, setErrors] = useState<string[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number>(0);

  const emptyRow = (): WeightRow => ({ room: '', initials: '', date: '', three_months_tracking: '', weight_loss_percent: '', bmi_must_notes: '', actions_taken: '', last_month_action_plan_work: '' });

  const [data, setData] = useState<WeightMonitoringData>({
    home: '',
    date: '',
    personCompletingAudit: '',
    rows: [emptyRow(), emptyRow(), emptyRow()],

    residents_palliative: '',
    residents_obese_losing_towards_healthy: '',
    num_resident_weight_loss: '',
    num_resident_weight_gain: '',
    themes_trends: '',
    action_plan_required: '',
  });

  const updateRow = (index: number, field: keyof WeightRow, value: string) => {
    setData(prev => {
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, rows };
    });
  };

  const addRow = () => {
    setData(prev => {
      const rows = [...prev.rows, emptyRow()];
      // move to the newly added row
      setCurrentRowIndex(rows.length - 1);
      return { ...prev, rows };
    });
  };

  const removeRow = (i: number) => {
    setData(prev => {
      const rows = prev.rows.filter((_, idx) => idx !== i);
      // adjust current index to remain in range
      setCurrentRowIndex((prevIdx) => {
        if (rows.length === 0) return 0;
        if (prevIdx >= rows.length) return rows.length - 1;
        return prevIdx;
      });
      return { ...prev, rows };
    });
  };

  const validateForm = () => {
    const requiredFields: Array<keyof WeightMonitoringData> = ['home', 'date', 'personCompletingAudit'];
    const miss: string[] = [];

    requiredFields.forEach((k) => {
      const val = data[k];
      if (typeof val === 'string' && !val.trim()) miss.push(k as string);
    });

    // ensure at least one row has a room and date
    if (data.rows.length === 0 || !data.rows.some(r => r.room.trim() && r.date.trim())) {
      miss.push('rows');
    }

    setErrors(miss);
    if (miss.length > 0) {
      const el = document.querySelector(`[data-field="${miss[0]}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return miss.length === 0;
  };

  const handleComplete = () => { if (validateForm()) setShowModal(true); };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!activeWorkspace?.id) {
      alert('Please select a workspace before saving');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        workspaceId: activeWorkspace.id,
      };
      const id = await saveAudit(payload, activeWorkspace.id);
      await markAuditCompleted(activeWorkspace.id, 'weight-monitoring', data.date || new Date().toISOString());
      alert('Audit saved');
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  // Stepper component - renders one field at a time (literal stepper) with navigation
  type StepperProps = {
    rows: WeightRow[];
    currentRowIndex: number;
    onUpdateRow: (index: number, field: keyof WeightRow, value: string) => void;
    onAddRow: () => void;
    onRemoveRow: (index: number) => void;
  };

  const Stepper: React.FC<StepperProps> = ({ rows, currentRowIndex, onUpdateRow, onAddRow, onRemoveRow }) => {
    const row = rows[currentRowIndex] ?? emptyRow();
    const fields: { key: keyof WeightRow; label: string; type?: string }[] = [
      { key: 'room', label: 'Room' },
      { key: 'initials', label: 'Initials' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'three_months_tracking', label: '3 Month tracking' },
      { key: 'weight_loss_percent', label: 'Weight Loss over 6 months (%)' },
      { key: 'bmi_must_notes', label: 'BMI / MUST - Any areas of note' },
      { key: 'actions_taken', label: 'Actions taken to monitor weight loss' },
      { key: 'last_month_action_plan_work', label: "Did last months action plan work" },
    ];

    const totalFields = fields.length;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">Entry {Math.min(currentRowIndex + 1, Math.max(1, rows.length))} of {Math.max(1, rows.length)}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRemoveRow(currentRowIndex)}
              className="px-3 py-1 bg-red-100 text-red-600 rounded"
              disabled={rows.length === 0}
            >
              Remove
            </button>
            <button type="button" onClick={onAddRow} className="px-3 py-1 bg-green-600 text-white rounded">+ Add Entry</button>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-sm font-medium mb-2">Step {currentFieldIndex + 1} of {totalFields}: {fields[currentFieldIndex].label}</div>

          <div>
            {fields[currentFieldIndex].type === 'date' ? (
              <input
                type="date"
                value={(row[fields[currentFieldIndex].key] as string) || ''}
                onChange={(e) => onUpdateRow(currentRowIndex, fields[currentFieldIndex].key, e.target.value)}
                className="w-full p-2 border rounded"
              />
            ) : (
              <input
                value={(row[fields[currentFieldIndex].key] as string) || ''}
                onChange={(e) => onUpdateRow(currentRowIndex, fields[currentFieldIndex].key, e.target.value)}
                className="w-full p-2 border rounded"
              />
            )}
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <div>
            <button
              type="button"
              onClick={() => setCurrentFieldIndex((f) => Math.max(0, f - 1))}
              className="px-3 py-1 bg-gray-200 rounded mr-2"
              disabled={currentFieldIndex === 0}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentFieldIndex((f) => Math.min(totalFields - 1, f + 1))}
              className="px-3 py-1 bg-gray-200 rounded"
              disabled={currentFieldIndex >= totalFields - 1}
            >
              Next
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentRowIndex((r) => Math.max(0, r - 1))}
              className="px-3 py-1 bg-gray-100 rounded"
              disabled={currentRowIndex === 0}
            >
              Prev Entry
            </button>
            <button
              type="button"
              onClick={() => setCurrentRowIndex((r) => Math.min(rows.length - 1, r + 1))}
              className="px-3 py-1 bg-gray-100 rounded"
              disabled={currentRowIndex >= rows.length - 1}
            >
              Next Entry
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-4 py-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Weight monitoring audit</h1>
          <div className="text-sm text-gray-600">Complete 5 per month</div>
        </div>

        <div className="bg-blue-50 p-4 rounded mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Home</label>
              <input data-field="home" value={data.home} onChange={(e) => setData({ ...data, home: e.target.value })} className={`w-full p-2 border rounded ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input data-field="date" type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} className={`w-full p-2 border rounded ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium">Person completing the audit</label>
              <input data-field="personCompletingAudit" value={data.personCompletingAudit} onChange={(e) => setData({ ...data, personCompletingAudit: e.target.value })} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
            </div>
          </div>
        </div>

        {/* Stepper: show one row at a time for easier data entry */}
        <div className="border rounded w-full p-4">
          <Stepper
            rows={data.rows}
            currentRowIndex={currentRowIndex}
            onUpdateRow={(idx, field, value) => updateRow(idx, field as any, value)}
            onAddRow={() => {
              addRow();
              // move to the new row after adding
              setCurrentRowIndex(data.rows.length);
            }}
            onRemoveRow={(idx) => {
              removeRow(idx);
              // ensure current index is in range
              setCurrentRowIndex(prev => Math.max(0, Math.min(prev, data.rows.length - 2)));
            }}
          />
        </div>

        <div className="mt-3 flex gap-3">
          <button onClick={addRow} className="px-3 py-1 bg-red-500 text-white rounded">+ Add Row</button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Residents who are actively on palliative or end of life care and losing weight</label>
            <textarea value={data.residents_palliative} onChange={(e) => setData({ ...data, residents_palliative: e.target.value })} className="w-full p-2 border rounded" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium">Residents who are currently obese or overweight and are losing weight towards being healthy (BMI 25 to 33)</label>
            <textarea value={data.residents_obese_losing_towards_healthy} onChange={(e) => setData({ ...data, residents_obese_losing_towards_healthy: e.target.value })} className="w-full p-2 border rounded" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">No. of Resident with weight loss</label>
              <input value={data.num_resident_weight_loss} onChange={(e) => setData({ ...data, num_resident_weight_loss: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">No. of Resident with weight gain</label>
              <input value={data.num_resident_weight_gain} onChange={(e) => setData({ ...data, num_resident_weight_gain: e.target.value })} className="w-full p-2 border rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Any themes/trends in weight loss</label>
            <textarea value={data.themes_trends} onChange={(e) => setData({ ...data, themes_trends: e.target.value })} className="w-full p-2 border rounded" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium">Action plan required y/n</label>
            <input value={data.action_plan_required} onChange={(e) => setData({ ...data, action_plan_required: e.target.value })} className="w-full p-2 border rounded" />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium">Final comments</label>
          <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} className="w-full p-2 border rounded" rows={4} />
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={handleComplete} className="px-4 py-2 bg-blue-600 text-white rounded">Complete Audit</button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
              <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">No, thanks</button>
                <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Audit</button>
                <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save & Create Action Plan</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
