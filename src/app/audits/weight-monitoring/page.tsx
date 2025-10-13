"use client";
import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

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

type AttachmentItem = {
  id: string;
  name: string;
  url: string;
  file?: File;
  storagePath?: string;
  downloadUrl?: string;
};

type AttachmentMetadata = {
  name: string;
  storagePath: string;
  downloadUrl?: string;
};

export default function WeightMonitoringAuditPage() {
  const [currentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [errors, setErrors] = useState<string[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number>(0);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'resident-tracking': true,
    'summary-statistics': false,
    'final-comments': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'resident-tracking',
      title: 'Resident Weight Tracking',
      color: 'green',
      guidance: 'Track individual resident weight monitoring data including room, initials, dates, and weight loss percentages.',
      content: 'stepper'
    },
    {
      id: 'summary-statistics',
      title: 'Summary Statistics & Analysis',
      color: 'blue',
      guidance: 'Provide summary information about residents on palliative care, weight trends, and action plan requirements.',
      content: 'summary'
    },
    {
      id: 'final-comments',
      title: 'Final Comments',
      color: 'gray',
      guidance: 'Add any additional comments or observations from the weight monitoring audit.',
      content: 'comments'
    },
  ];

  const emptyRow = (): WeightRow => ({ room: '', initials: '', date: '', three_months_tracking: '', weight_loss_percent: '', bmi_must_notes: '', actions_taken: '', last_month_action_plan_work: '' });

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

  // Load existing audit data and attachments when workspace changes
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      if (!activeWorkspace?.id) return;
      setAttachments({});
      setAttachmentsToDelete([]);
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'weight-monitoring', undefined, activeWorkspace.organisationId || null);
        if (!existing) return;
        const { attachments: storedAttachments, comments, rows: existingRows, ...formData } = existing as any;
        if (!cancelled && formData) setData(prev => ({ ...prev, ...formData }));
        if (!cancelled && existingRows) setData(prev => ({ ...prev, rows: existingRows }));
        if (!cancelled && comments) setFinalComments(comments);
        if (storedAttachments && typeof storedAttachments === 'object') {
          const processedEntries: Array<[string, AttachmentItem[]]> = [];
          for (const [fieldName, list] of Object.entries(storedAttachments)) {
            if (!Array.isArray(list) || list.length === 0) continue;
            const processed: AttachmentItem[] = [];
            for (let i = 0; i < list.length; i++) {
              const entry = list[i] as any;
              if (!entry) continue;
              const storagePath: string | undefined = entry.storagePath;
              let downloadUrl: string | undefined = entry.downloadUrl;
              if (!downloadUrl && storagePath) {
                try { downloadUrl = await getDownloadURL(ref(storage, storagePath)); } catch (err) { console.error('Failed to fetch download URL for attachment', err); continue; }
              }
              if (!downloadUrl) continue;
              processed.push({ id: `existing-${fieldName}-${i}-${storagePath ?? entry.name ?? 'attachment'}`, name: entry.name ?? `Attachment ${i+1}`, url: downloadUrl, storagePath, downloadUrl });
            }
            if (processed.length > 0) processedEntries.push([fieldName, processed]);
          }
          if (!cancelled && processedEntries.length > 0) setAttachments(Object.fromEntries(processedEntries));
        }
      } catch (err) {
        console.error('Failed to load existing weight-monitoring audit data:', err);
      }
    };
    loadExisting();
    return () => { cancelled = true; };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  // Attachment handlers
  const handleAddAttachments = (fieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setAttachments(prev => {
      const existing = prev[fieldName] ?? [];
      const added = fileArray.map(file => {
        const blobUrl = URL.createObjectURL(file);
        createdObjectUrls.current.add(blobUrl);
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : `${fieldName}-${Date.now()}-${file.name}`;
        return { id, url: blobUrl, name: file.name, file } as AttachmentItem;
      });
      return { ...prev, [fieldName]: [...existing, ...added] };
    });
  };

  const handleRemoveAttachment = (fieldName: string, id: string) => {
    setAttachments(prev => {
      const list = prev[fieldName] ?? [];
      const removed = list.find(a => a.id === id);
      if (!removed) return prev;
      if (removed.url && removed.url.startsWith('blob:')) { try { URL.revokeObjectURL(removed.url); } catch (e) { /* ignore */ } createdObjectUrls.current.delete(removed.url); }
      if (removed.storagePath) setAttachmentsToDelete(prev => [...prev, removed.storagePath as string]);
      if (previewImage && previewImage.url === removed.url) setPreviewImage(null);
      const remaining = list.filter(a => a.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) next[fieldName] = remaining; else delete next[fieldName];
      return next;
    });
  };

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) throw new Error('Workspace not available for attachment upload');
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (data.date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId ? `organisations/${orgId}/workspaces/${activeWorkspace.id}` : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/weight-monitoring/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  // ESC to close preview
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewImage(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);

  // Revoke created blob URLs on unmount
  useEffect(() => { return () => { createdObjectUrls.current.forEach(u => { try { URL.revokeObjectURL(u); } catch (err) { /* ignore */ } }); createdObjectUrls.current.clear(); }; }, []);

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
      const tally = data.rows.reduce(
        (acc, row) => {
          const value = row.last_month_action_plan_work;
          if (value === 'Yes') {
            acc.yesCount += 1;
            acc.totalCount += 1;
          } else if (value === 'No') {
            acc.totalCount += 1;
          }
          return acc;
        },
        { yesCount: 0, totalCount: 0 }
      );
      const scorePercent = tally.totalCount > 0 ? Math.round((tally.yesCount / tally.totalCount) * 100) : null;

      const orgId = activeWorkspace.organisationId || null;
      const attachmentsMetadata: Record<string, AttachmentMetadata[]> = {};
      const nextAttachmentState: Record<string, AttachmentItem[]> = {};

      for (const [fieldName, items] of Object.entries(attachments)) {
        if (!items || items.length === 0) continue;
        const processed: AttachmentItem[] = [];
        for (const item of items) {
          if (item.file) {
            const { storagePath, downloadUrl } = await uploadAttachmentFile(fieldName, item.file);
            if (item.url && item.url.startsWith('blob:')) {
              try { URL.revokeObjectURL(item.url); } catch (err) { /* ignore */ }
              createdObjectUrls.current.delete(item.url);
            }
            const stored: AttachmentItem = { id: item.id, name: item.name, url: downloadUrl, storagePath, downloadUrl };
            processed.push(stored);
            if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath, downloadUrl });
          } else if (item.storagePath) {
            const downloadUrl = item.downloadUrl || item.url;
            if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath: item.storagePath, downloadUrl });
            processed.push({ id: item.id, name: item.name, url: downloadUrl, storagePath: item.storagePath, downloadUrl });
          }
        }
        if (processed.length > 0) nextAttachmentState[fieldName] = processed;
      }

      if (attachmentsToDelete.length > 0) {
        const uniquePaths = Array.from(new Set(attachmentsToDelete));
        for (const storagePath of uniquePaths) {
          try { await deleteObject(ref(storage, storagePath)); } catch (err) { console.warn('Failed to delete removed attachment from storage', err); }
        }
      }

      const attachmentsPayload = Object.keys(attachmentsMetadata).length > 0 ? attachmentsMetadata : undefined;

      const payload = {
        ...data,
        ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        workspaceId: activeWorkspace.id,
        organisationId: orgId,
        auditType: 'weight-monitoring',
        yesCount: tally.yesCount,
        totalCount: tally.totalCount,
        scorePercent,
      };
      const id = await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
      await markAuditCompletedWithSnapshot(activeWorkspace.id, 'weight-monitoring', payload, data.date || new Date().toISOString());
  alert('Audit saved');
  setAttachments(nextAttachmentState);
  setAttachmentsToDelete([]);
  setPreviewImage(null);
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
          {/* Attachments for this row */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded cursor-pointer border border-transparent hover:bg-blue-100">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { handleAddAttachments(`row-${currentRowIndex}`, e.target.files); e.currentTarget.value = ''; }}
                  className="hidden"
                />
                <span className="font-medium">Add photo</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(attachments[`row-${currentRowIndex}`] ?? []).map(att => (
                <div key={att.id} className="relative w-28 h-28 rounded overflow-hidden border border-gray-200">
                  <button type="button" onClick={() => setPreviewImage({ url: att.url, name: att.name })} className="w-full h-full" title={att.name}>
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  </button>
                  <button type="button" onClick={() => handleRemoveAttachment(`row-${currentRowIndex}`, att.id)} className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm">×</button>
                </div>
              ))}
            </div>
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
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Weight Monitoring Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive audit to track resident weight changes and actions. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <input
                value={data.home}
                data-field="home"
                onChange={(e) => setData({ ...data, home: e.target.value })}
                className={getFieldClassName('home')}
                placeholder="Enter home name"
              />
              {getFieldError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Date of audit</label>
              <input
                type="date"
                value={data.date}
                data-field="date"
                onChange={(e) => setData({ ...data, date: e.target.value })}
                className={getFieldClassName('date')}
              />
              {getFieldError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person completing the audit</label>
              <input
                value={data.personCompletingAudit}
                data-field="personCompletingAudit"
                onChange={(e) => setData({ ...data, personCompletingAudit: e.target.value })}
                className={getFieldClassName('personCompletingAudit')}
                placeholder="Enter auditor name"
              />
              {getFieldError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div className="text-sm text-gray-600 mt-2">Report {currentReport} of {totalReports} — Complete 5 per month</div>
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
                    <p className="mb-4 ml-4 list-disc text-sm text-slate-500">{section.guidance}</p>
                    <div className="space-y-4">
                      {section.content === 'stepper' && (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <Stepper
                            rows={data.rows}
                            currentRowIndex={currentRowIndex}
                            onUpdateRow={(idx, field, value) => updateRow(idx, field as any, value)}
                            onAddRow={() => {
                              addRow();
                              setCurrentRowIndex(data.rows.length);
                            }}
                            onRemoveRow={(idx) => {
                              removeRow(idx);
                              setCurrentRowIndex(prev => Math.max(0, Math.min(prev, data.rows.length - 2)));
                            }}
                          />
                          <div className="mt-4 flex justify-center">
                            <button
                              onClick={addRow}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              + Add Resident Entry
                            </button>
                          </div>
                        </div>
                      )}

                      {section.content === 'summary' && (
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Residents who are actively on palliative or end of life care and losing weight
                            </label>
                            <textarea
                              value={data.residents_palliative}
                              onChange={(e) => setData({ ...data, residents_palliative: e.target.value })}
                              rows={3}
                              className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="List residents on palliative care..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Residents who are currently obese or overweight and are losing weight towards being healthy (BMI 25 to 33)
                            </label>
                            <textarea
                              value={data.residents_obese_losing_towards_healthy}
                              onChange={(e) => setData({ ...data, residents_obese_losing_towards_healthy: e.target.value })}
                              rows={3}
                              className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="List residents losing weight towards healthy BMI..."
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Number of residents with weight loss</label>
                              <input
                                type="number"
                                value={data.num_resident_weight_loss}
                                onChange={(e) => setData({ ...data, num_resident_weight_loss: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Number of residents with weight gain</label>
                              <input
                                type="number"
                                value={data.num_resident_weight_gain}
                                onChange={(e) => setData({ ...data, num_resident_weight_gain: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Any themes/trends in weight loss</label>
                            <textarea
                              value={data.themes_trends}
                              onChange={(e) => setData({ ...data, themes_trends: e.target.value })}
                              rows={4}
                              className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Describe any patterns or trends observed..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Action plan required (Yes/No)</label>
                            <input
                              value={data.action_plan_required}
                              onChange={(e) => setData({ ...data, action_plan_required: e.target.value })}
                              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Yes/No"
                            />
                          </div>
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
          </form>
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
      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setPreviewImage(null)} />
          <div className="relative z-70 max-w-3xl w-full mx-4">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <div className="flex justify-between items-start p-2 border-b">
                <div className="px-3 py-1 text-sm text-gray-700">{previewImage.name}</div>
                <button onClick={() => setPreviewImage(null)} className="m-2 bg-white rounded-full p-1 text-gray-700 border">Close</button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center">
                <img src={previewImage.url} alt={previewImage.name} className="max-h-[80vh] w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
