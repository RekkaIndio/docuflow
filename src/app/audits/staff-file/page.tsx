'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AuditFooter from '@/components/audit-footer';

type YesNoNA = 'Yes' | 'No' | 'N/A' | '';

interface StaffFileData {
  home: string;
  date: string;
  personCompletingAudit: string;

  staff_full_name: string;
  photo: YesNoNA;
  photo_comment: string;
  cv_explained_gaps: YesNoNA;
  cv_explained_gaps_comment: string;
  application_form: YesNoNA;
  application_form_comment: string;
  interview: YesNoNA;
  interview_comment: string;
  right_to_work: YesNoNA;
  right_to_work_comment: string;
  visa_docs: YesNoNA;
  visa_docs_comment: string;
  id_passport_driving: YesNoNA;
  id_passport_driving_comment: string;
  id_proof_address: YesNoNA;
  id_proof_address_comment: string;
  medical_questionnaire: YesNoNA;
  medical_questionnaire_comment: string;
  references_x2: YesNoNA;
  references_x2_comment: string;
  dbs: YesNoNA;
  dbs_comment: string;
  offer_letter: YesNoNA;
  offer_letter_comment: string;
  contract: YesNoNA;
  contract_comment: string;
  employee_handbook: YesNoNA;
  employee_handbook_comment: string;
  job_description: YesNoNA;
  job_description_comment: string;
  supervisions: YesNoNA;
  supervisions_comment: string;
  appraisal: YesNoNA;
  appraisal_comment: string;

  comments: string;
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

export default function StaffFileAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user: authUser } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'personal-info': true,
    'recruitment-docs': false,
    'identification': false,
    'employment-docs': false,
    'ongoing-records': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      color: 'green',
      guidance: 'Verify basic staff identification and personal documentation required for employment records.',
      questions: [
        { field: 'photo', label: 'Photo' },
        { field: 'cv_explained_gaps', label: 'CV (any gaps from school/leave explained)' },
        { field: 'application_form', label: 'Application form' },
        { field: 'interview', label: 'Interview' },
      ]
    },
    {
      id: 'recruitment-docs',
      title: 'Recruitment Documentation',
      color: 'yellow',
      guidance: 'Check all required documentation obtained during the recruitment and pre-employment process.',
      questions: [
        { field: 'medical_questionnaire', label: 'Medical questionnaire' },
        { field: 'references_x2', label: 'References x2 (professional and character)' },
        { field: 'dbs', label: 'DBS' },
      ]
    },
    {
      id: 'identification',
      title: 'Identification & Right to Work',
      color: 'pink',
      guidance: 'Verify all identification documents and right to work checks are present and up to date.',
      questions: [
        { field: 'right_to_work', label: 'Right to work' },
        { field: 'visa_docs', label: 'Visa documentation and check' },
        { field: 'id_passport_driving', label: 'ID (passport/driving licence)' },
        { field: 'id_proof_address', label: 'ID proof of address' },
      ]
    },
    {
      id: 'employment-docs',
      title: 'Employment Documentation',
      color: 'emerald',
      guidance: 'Ensure all employment-related documents are present and signed by the employee.',
      questions: [
        { field: 'offer_letter', label: 'Offer letter' },
        { field: 'contract', label: 'Contract' },
        { field: 'employee_handbook', label: 'Employee handbook' },
        { field: 'job_description', label: 'Job description' },
      ]
    },
    {
      id: 'ongoing-records',
      title: 'Ongoing Records & Development',
      color: 'violet',
      guidance: 'Check that ongoing staff development and performance records are maintained.',
      questions: [
        { field: 'supervisions', label: 'Supervisions' },
        { field: 'appraisal', label: 'Appraisal' },
      ]
    },
  ];

  const [data, setData] = useState<StaffFileData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    staff_full_name: '',
    photo: '',
    photo_comment: '',
    cv_explained_gaps: '',
    cv_explained_gaps_comment: '',
    application_form: '',
    application_form_comment: '',
    interview: '',
    interview_comment: '',
    right_to_work: '',
    right_to_work_comment: '',
    visa_docs: '',
    visa_docs_comment: '',
    id_passport_driving: '',
    id_passport_driving_comment: '',
    id_proof_address: '',
    id_proof_address_comment: '',
    medical_questionnaire: '',
    medical_questionnaire_comment: '',
    references_x2: '',
    references_x2_comment: '',
    dbs: '',
    dbs_comment: '',
    offer_letter: '',
    offer_letter_comment: '',
    contract: '',
    contract_comment: '',
    employee_handbook: '',
    employee_handbook_comment: '',
    job_description: '',
    job_description_comment: '',
    supervisions: '',
    supervisions_comment: '',
    appraisal: '',
    appraisal_comment: '',

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

  const handleChange = (field: keyof StaffFileData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  // Load existing attachments when workspace changes
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      if (!activeWorkspace?.id) return;
      setAttachments({});
      setAttachmentsToDelete([]);
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'staff-file', undefined, activeWorkspace.organisationId || null);
        if (!existing) return;
        const { attachments: storedAttachments, comments, ...formData } = existing as any;
        if (!cancelled && formData) setData(prev => ({ ...prev, ...formData }));
        if (!cancelled && comments) setData(prev => ({ ...prev, comments }));
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
        console.error('Failed to load existing staff-file audit data:', err);
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
    const storagePath = `${basePath}/audit-attachments/staff-file/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  // ESC to close preview
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewImage(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);

  // Revoke created object URLs on unmount
  useEffect(() => { return () => { createdObjectUrls.current.forEach(u => { try { URL.revokeObjectURL(u); } catch (err) { /* ignore */ } }); createdObjectUrls.current.clear(); }; }, []);

  const OptionQuestion = ({ field, label }: { field: string; label: string }) => {
    const yesNoField = field as keyof StaffFileData;
    const commentField = `${field}_comment` as keyof StaffFileData;

    return (
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex gap-4" data-field={field}>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={field}
                      value="Yes"
                      checked={data[yesNoField] === 'Yes'}
                      onChange={() => handleChange(yesNoField, 'Yes')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={field}
                      value="No"
                      checked={data[yesNoField] === 'No'}
                      onChange={() => handleChange(yesNoField, 'No')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={field}
                      value="N/A"
                      checked={data[yesNoField] === 'N/A'}
                      onChange={() => handleChange(yesNoField, 'N/A')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">N/A</span>
                  </label>
                </div>
              </div>
              <div className="ml-4 relative">
                { (attachments[field]?.length ?? 0) > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                    {attachments[field]?.length}
                  </span>
                )}
                <label title="Add attachment" className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 cursor-pointer border border-transparent hover:bg-blue-100">
                  <input type="file" accept="image/*" data-field-input={field} onChange={(e) => { handleAddAttachments(field, e.target.files); e.currentTarget.value = ''; }} className="hidden" />
                  <span className="text-xl font-bold">+</span>
                </label>
              </div>
            </div>
            {getFieldError(field) && <p className="text-red-500 text-sm mt-1">This field is required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <Textarea
              value={data[commentField] as string}
              onChange={(e) => handleChange(commentField, e.target.value)}
              rows={2}
              placeholder="Add any comments or observations..."
              className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
            />
          </div>
          {/* Attachments preview */}
          <div>
            <div className="flex flex-wrap gap-2">
              {(attachments[field] ?? []).map(att => (
                <div key={att.id} className="relative w-24 h-24 rounded overflow-hidden border border-gray-200">
                  <button type="button" onClick={() => setPreviewImage({ url: att.url, name: att.name })} className="w-full h-full" title={att.name}>
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  </button>
                  <button onClick={() => handleRemoveAttachment(field, att.id)} title="Remove" className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const validateForm = () => {
    const required: (keyof StaffFileData)[] = ['home','date','personCompletingAudit','staff_full_name'];
    const missing = required.filter(f => !String(data[f]).trim());
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
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }
    const workspaceId = activeWorkspace.id;
    // Compute yes/no scoring for staff file (treat 'Yes' as positive)
    const YES_NO_FIELDS = [
      'photo','cv_explained_gaps','application_form','interview','right_to_work','visa_docs','id_passport_driving','id_proof_address','medical_questionnaire','references_x2','dbs','offer_letter','contract','employee_handbook','job_description','supervisions','appraisal'
    ];
    const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + ((data as any)[f] === 'Yes' ? 1 : 0), 0);
    const totalCount = YES_NO_FIELDS.length;
    const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : null;

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
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
      auditType: 'staff-file',
      yesCount,
      totalCount,
      scorePercent,
      organisationId: orgId,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId, activeWorkspace.organisationId || null);
      setSavedAuditId(id);
      try {
        const completedAt = data.date || new Date().toISOString();
        await markAuditCompletedWithSnapshot(workspaceId, 'staff-file', payload, completedAt);
      } catch (e) {
        console.warn('Failed to complete staff-file audit with snapshot', e);
      }
  setSaving(false);
  setAttachments(nextAttachmentState);
  setAttachmentsToDelete([]);
  setPreviewImage(null);
  alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to save audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  const addNewReport = () => {
    setData({
      home: '',
      date: '',
      personCompletingAudit: '',

      staff_full_name: '',
      photo: '',
      photo_comment: '',
      cv_explained_gaps: '',
      cv_explained_gaps_comment: '',
      application_form: '',
      application_form_comment: '',
      interview: '',
      interview_comment: '',
      right_to_work: '',
      right_to_work_comment: '',
      visa_docs: '',
      visa_docs_comment: '',
      id_passport_driving: '',
      id_passport_driving_comment: '',
      id_proof_address: '',
      id_proof_address_comment: '',
      medical_questionnaire: '',
      medical_questionnaire_comment: '',
      references_x2: '',
      references_x2_comment: '',
      dbs: '',
      dbs_comment: '',
      offer_letter: '',
      offer_letter_comment: '',
      contract: '',
      contract_comment: '',
      employee_handbook: '',
      employee_handbook_comment: '',
      job_description: '',
      job_description_comment: '',
      supervisions: '',
      supervisions_comment: '',
      appraisal: '',
      appraisal_comment: '',

      comments: '',
    });
    setErrors([]);
    // clear any staged attachments from previous report and revoke blob URLs
    createdObjectUrls.current.forEach(u => {
      try { URL.revokeObjectURL(u); } catch (err) { /* ignore */ }
    });
    createdObjectUrls.current.clear();
    setAttachments({});
    setAttachmentsToDelete([]);
  };

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Staff File Audit</h1>
          <p className="mb-4 text-slate-500">Verify staff records and employment documentation. All fields required.</p>
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
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Staff full name</label>
              <Input
                type="text"
                className={getFieldClassName('staff_full_name', "w-full")}
                name="staff_full_name"
                value={data.staff_full_name}
                onChange={(e) => handleChange('staff_full_name', e.target.value)}
                placeholder="Full name"
                required
              />
              {getFieldError('staff_full_name') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
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

                    <div className="space-y-4">
                      {section.questions.map((question, qIndex) => (
                        <OptionQuestion key={qIndex} label={question.label} field={question.field} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Comments Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
              <Textarea
                value={data.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200"
                placeholder="Enter any additional comments..."
              />
            </div>

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
