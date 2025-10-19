"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StaffSelectInput } from '@/components/audits/staff-select-input';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface StaffMember {
  name: string;
  role: string;
  timeObserved: string;
  momentObserved: string;
  completedBy: string;
}

interface StaffObservation {
  staff: string;
  momentObserved: string;
  correctTechnique: string;
  comments: string;
}

interface HandHygieneAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;
  
  // Staff overview (5 staff members)
  staffMembers: StaffMember[];
  
  // Individual observations
  observations: StaffObservation[];
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

interface AttachmentTextareaProps {
  fieldKey: string;
  dataField?: string;
  label: string;
  value: string;
  attachments: Record<string, AttachmentItem[]>;
  onChange: (value: string) => void;
  onAddAttachments: (fieldName: string, files: FileList | null) => void;
  onRemoveAttachment: (fieldName: string, attachmentId: string) => void;
  onPreviewAttachment: (attachment: { url: string; name: string }) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

const AttachmentTextarea: React.FC<AttachmentTextareaProps> = ({
  fieldKey,
  dataField,
  label,
  value,
  attachments,
  onChange,
  onAddAttachments,
  onRemoveAttachment,
  onPreviewAttachment,
  placeholder = '',
  rows = 3,
  className = 'w-full p-2 border border-slate-300 rounded-md resize-none',
  disabled = false,
}) => {
  const attachmentList = attachments[fieldKey] ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="ml-4 relative">
          {attachmentList.length > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
              {attachmentList.length}
            </span>
          )}
          <label
            title="Add attachment"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 cursor-pointer border border-transparent hover:bg-blue-100"
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                onAddAttachments(fieldKey, e.target.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
              disabled={disabled}
            />
            <span className="text-xl font-bold">+</span>
          </label>
        </div>
      </div>
      <Textarea
        data-field={dataField ?? fieldKey}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
      />
      {attachmentList.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attachmentList.map((att) => (
            <div key={att.id} className="relative w-24 h-24 rounded overflow-hidden border border-gray-200">
              <button
                type="button"
                onClick={() => onPreviewAttachment({ url: att.url, name: att.name })}
                className="w-full h-full"
                title={att.name}
              >
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveAttachment(fieldKey, att.id)}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function HandHygieneAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());
  const { user } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<string[]>(['audit-details']);

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Load existing attachments for this audit type when workspace is available
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeWorkspace?.id) {
        setAttachments({});
        setAttachmentsToDelete([]);
        return;
      }
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'hand-hygiene', undefined, activeWorkspace.organisationId || null);
        if (!existing || cancelled) return;
        const storedAttachments: Record<string, any[]> | undefined = existing.attachments && typeof existing.attachments === 'object' ? existing.attachments : undefined;
        if (!storedAttachments) return;
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
              try {
                downloadUrl = await getDownloadURL(ref(storage, storagePath));
              } catch (err) {
                console.error('Failed to fetch download URL for attachment', err);
                continue;
              }
            }
            if (!downloadUrl) continue;
            processed.push({ id: `existing-${fieldName}-${i}-${storagePath ?? entry.name ?? 'attachment'}`, name: entry.name ?? `Attachment ${i + 1}`, url: downloadUrl, storagePath, downloadUrl });
          }
          if (processed.length > 0) processedEntries.push([fieldName, processed]);
        }
        if (!cancelled && processedEntries.length > 0) setAttachments(Object.fromEntries(processedEntries));
      } catch (err) {
        console.warn('Failed to load existing hand-hygiene attachments', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  // Section definitions with guidance text
  const sections = [
    {
      name: 'audit-details',
      label: 'Audit Details',
      guidance: 'Enter the basic information for this hand hygiene audit including the care home, date, and person completing the audit.'
    },
    {
      name: 'moment-reference',
      label: 'Moment Reference Guide',
      guidance: 'Review the 5 Moments for Hand Hygiene reference guide to understand the key moments when hand hygiene should be performed.'
    },
    {
      name: 'staff-overview',
      label: 'Staff Overview',
      guidance: 'Record the names and roles of 5 staff members who will be observed during this hand hygiene audit.'
    },
    {
      name: 'individual-observations',
      label: 'Individual Observations',
      guidance: 'Record detailed observations of hand hygiene compliance for each of the 5 staff members, including the moment, technique used, and any comments.'
    },
    {
      name: 'final-comments',
      label: 'Final Comments',
      guidance: 'Provide any final comments or recommendations based on the hand hygiene observations and compliance findings.'
    }
  ];

  // Helper functions for error handling and field styling
  const getFieldError = (fieldName: string) => {
    return errors.includes(fieldName);
  };

  const getFieldClassName = (fieldName: string, baseClass = "w-full p-2 border rounded-md") => {
    return `${baseClass} ${getFieldError(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  };

  const getTableFieldClassName = (fieldName: string, baseClass = "w-full p-1 border rounded") => {
    return `${baseClass} ${getFieldError(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  };
  
  const [auditData, setAuditData] = useState<HandHygieneAuditData>({
    home: '',
    date: '',
    personCompletingAudit: '',
    
    staffMembers: Array(5).fill(null).map(() => ({
      name: '',
      role: '',
      timeObserved: '',
      momentObserved: '',
      completedBy: ''
    })),
    
    observations: Array(5).fill(null).map(() => ({
      staff: '',
      momentObserved: '',
      correctTechnique: '',
      comments: ''
    }))
  });

  useEffect(() => {
    if (!activeWorkspace?.name) return;
    if (auditData.home && auditData.home.trim().length > 0) return;
    setAuditData(prev => ({ ...prev, home: activeWorkspace.name }));
  }, [activeWorkspace?.name, auditData.home]);

  const momentOptions = [
    { value: '1', label: '1 - Before touching a resident' },
    { value: '2', label: '2 - Before clean/aseptic procedure' },
    { value: '3', label: '3 - After body fluid exposure risk' },
    { value: '4', label: '4 - After touching a resident' },
    { value: '5', label: '5 - After touching resident surroundings' }
  ];

  const handleInputChange = (field: string, value: string) => {
    if (field === 'home' || field === 'date' || field === 'personCompletingAudit') {
      setAuditData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Remove error highlighting when field is filled
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(error => error !== field));
    }
  };

  const handleStaffMemberChange = (index: number, field: keyof StaffMember, value: string) => {
    const newStaffMembers = [...auditData.staffMembers];
    newStaffMembers[index] = {
      ...newStaffMembers[index],
      [field]: value
    };
    setAuditData(prev => ({
      ...prev,
      staffMembers: newStaffMembers
    }));
    
    const fieldKey = `staff${index + 1}_${field}`;
    if (value.trim() !== '' && errors.includes(fieldKey)) {
      setErrors(prev => prev.filter(error => error !== fieldKey));
    }
  };

  const handleObservationChange = (index: number, field: keyof StaffObservation, value: string) => {
    const newObservations = [...auditData.observations];
    newObservations[index] = {
      ...newObservations[index],
      [field]: value
    };
    setAuditData(prev => ({
      ...prev,
      observations: newObservations
    }));
    
    const fieldKey = `observation${index + 1}_${field}`;
    if (value.trim() !== '' && errors.includes(fieldKey)) {
      setErrors(prev => prev.filter(error => error !== fieldKey));
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];
    
    // Basic information validation
    if (!auditData.home.trim()) newErrors.push('home');
    if (!auditData.date.trim()) newErrors.push('date');
    if (!auditData.personCompletingAudit.trim()) newErrors.push('personCompletingAudit');
    
    // Staff members validation (at least first staff member should be filled)
    auditData.staffMembers.forEach((staff, index) => {
      if (staff.name.trim() || staff.role.trim() || staff.timeObserved.trim() || staff.momentObserved.trim() || staff.completedBy.trim()) {
        // If any field is filled, all required fields should be filled
        if (!staff.name.trim()) newErrors.push(`staff${index + 1}_name`);
        if (!staff.role.trim()) newErrors.push(`staff${index + 1}_role`);
        if (!staff.timeObserved.trim()) newErrors.push(`staff${index + 1}_timeObserved`);
        if (!staff.momentObserved.trim()) newErrors.push(`staff${index + 1}_momentObserved`);
        if (!staff.completedBy.trim()) newErrors.push(`staff${index + 1}_completedBy`);
      }
    });
    
    // Observations validation (only validate filled observations)
    auditData.observations.forEach((observation, index) => {
      if (observation.staff.trim() || observation.momentObserved.trim() || observation.correctTechnique.trim()) {
        // If any field is filled, all required fields should be filled
        if (!observation.staff.trim()) newErrors.push(`observation${index + 1}_staff`);
        if (!observation.momentObserved.trim()) newErrors.push(`observation${index + 1}_momentObserved`);
        if (!observation.correctTechnique.trim()) newErrors.push(`observation${index + 1}_correctTechnique`);
      }
    });
    
    // Check if at least one staff member is filled
    const hasStaffMember = auditData.staffMembers.some(staff => 
      staff.name.trim() || staff.role.trim() || staff.timeObserved.trim() || staff.momentObserved.trim() || staff.completedBy.trim()
    );
    
    // Check if at least one observation is filled
    const hasObservation = auditData.observations.some(observation => 
      observation.staff.trim() || observation.momentObserved.trim() || observation.correctTechnique.trim()
    );
    
    if (!hasStaffMember) {
      newErrors.push('staff1_name');
    }
    
    if (!hasObservation) {
      newErrors.push('observation1_staff');
    }
    
    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      // Scroll to first error
      const firstErrorElement = document.querySelector(`[data-field="${newErrors[0]}"]`);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return newErrors.length === 0;
  };

  const handleFilesAdded = (fieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setAttachments(prev => {
      const existing = prev[fieldName] ?? [];
      const added = fileArray.map(file => {
        const url = URL.createObjectURL(file);
        createdObjectUrls.current.add(url);
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${fieldName}-${Date.now()}-${file.name}`;
        return { id, name: file.name, url, file } as AttachmentItem;
      });
      return { ...prev, [fieldName]: [...existing, ...added] };
    });
  };

  const handleRemoveAttachment = (fieldName: string, id: string) => {
    setAttachments(prev => {
      const list = prev[fieldName] ?? [];
      const target = list.find(item => item.id === id);
      if (!target) return prev;

      if (target.url && target.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.url); } catch (e) { console.warn('Failed to revoke object URL', e); }
        createdObjectUrls.current.delete(target.url);
      }

      if (target.storagePath) {
        setAttachmentsToDelete(prev => [...prev, target.storagePath as string]);
      }

      if (previewImage && previewImage.url === target.url) setPreviewImage(null);

      const remaining = list.filter(item => item.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) next[fieldName] = remaining; else delete next[fieldName];
      return next;
    });
  };

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage(attachment);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch (err) { console.warn('Failed to revoke object URL', err); }
      });
      createdObjectUrls.current.clear();
    };
  }, []);

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) throw new Error('Workspace not available for attachment upload');
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (auditData.date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId ? `organisations/${orgId}/workspaces/${activeWorkspace.id}` : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/hand-hygiene/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  const handleCompleteAudit = () => {
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!validateForm()) return;
    if (!activeWorkspace?.id) {
      alert('No active workspace. Please select a workspace before saving.');
      return;
    }

    setSaving(true);
    try {
      const tally = auditData.observations.reduce(
        (acc, observation) => {
          const value = observation.correctTechnique;
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

      const attachmentsMetadata: Record<string, AttachmentMetadata[]> = {};
      const nextAttachmentState: Record<string, AttachmentItem[]> = {};

      for (const [fieldName, items] of Object.entries(attachments)) {
        if (!items || items.length === 0) continue;
        const processed: AttachmentItem[] = [];
        for (const item of items) {
          if (item.file) {
            const { storagePath, downloadUrl } = await uploadAttachmentFile(fieldName, item.file);
            if (item.url && item.url.startsWith('blob:')) {
              try { URL.revokeObjectURL(item.url); } catch (err) { console.warn('Failed to revoke object URL during upload', err); }
              createdObjectUrls.current.delete(item.url);
            }
            const storedItem: AttachmentItem = { id: item.id, name: item.name, url: downloadUrl, storagePath, downloadUrl };
            processed.push(storedItem);
            if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath, downloadUrl });
          } else if (item.storagePath) {
            const downloadUrl = item.downloadUrl || item.url;
            processed.push({ id: item.id, name: item.name, url: downloadUrl, storagePath: item.storagePath, downloadUrl });
            if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath: item.storagePath, downloadUrl });
          }
        }
        if (processed.length > 0) nextAttachmentState[fieldName] = processed;
      }

      if (attachmentsToDelete.length > 0) {
        const uniqueDeletes = Array.from(new Set(attachmentsToDelete));
        for (const storagePath of uniqueDeletes) {
          try { await deleteObject(ref(storage, storagePath)); } catch (err) { console.warn('Failed to delete removed attachment from storage', err); }
        }
      }

      const attachmentsPayload = Object.keys(attachmentsMetadata).length > 0 ? attachmentsMetadata : undefined;

      const payload = {
        ...auditData,
        ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        organisationId: activeWorkspace.organisationId || null,
        auditType: 'hand-hygiene',
        yesCount: tally.yesCount,
        totalCount: tally.totalCount,
        scorePercent,
      };

      await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
      const completedAt = auditData.date || new Date().toISOString();
      await markAuditCompletedWithSnapshot(activeWorkspace.id, 'hand-hygiene', payload, completedAt);
      setAttachments(nextAttachmentState);
      setAttachmentsToDelete([]);
      setPreviewImage(null);
      setShowModal(false);
      alert('Audit saved');
    } catch (err) {
      console.error('Failed to save audit', err);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const addNewReport = () => {
    // Reset form for new report
    setAuditData({
      home: activeWorkspace?.name ?? '',
      date: '',
      personCompletingAudit: '',
      
      staffMembers: Array(5).fill(null).map(() => ({
        name: '',
        role: '',
        timeObserved: '',
        momentObserved: '',
        completedBy: ''
      })),
      
      observations: Array(5).fill(null).map(() => ({
        staff: '',
        momentObserved: '',
        correctTechnique: '',
        comments: ''
      }))
    });
    setErrors([]);
  };

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Hand Hygiene Audit</h1>
          <p className="mb-4 text-slate-500">Complete this form to audit hand hygiene compliance across 5 Moments. All required fields must be filled.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                data-field="home"
                value={auditData.home}
                onChange={(e) => handleInputChange('home', e.target.value)}
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
                data-field="date"
                value={auditData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
              {getFieldError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <StaffSelectInput
                type="text"
                className={getFieldClassName('personCompletingAudit', "w-full")}
                data-field="personCompletingAudit"
                value={auditData.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                required
              />
              {getFieldError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

  {/* Main form right column, scrolls with page */}
  <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleCompleteAudit(); }} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(section.name)}
                >
                  <span>{section.label}</span>
                  {openSections.includes(section.name) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections.includes(section.name) && (
                  <div className="px-8 pb-8">
                    <p className="mb-6 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                      {section.guidance}
                    </p>

                    {/* Section content based on name */}
                    {section.name === 'audit-details' && (
                      <div className="text-center py-8 text-slate-500">
                        <p>Audit details are shown in the left panel</p>
                      </div>
                    )}

                    {section.name === 'moment-reference' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">5 Moments for Hand Hygiene</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {momentOptions.map((moment) => (
                            <div key={moment.value} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                              <span className="font-semibold text-slate-800">{moment.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {section.name === 'staff-overview' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Staff Members to Observe</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-300 bg-white rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Staff Member</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Role</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Time Observed</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Moment</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Observer</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditData.staffMembers.map((staff, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="text"
                                      data-field={`staff${index + 1}_name`}
                                      value={staff.name}
                                      onChange={(e) => handleStaffMemberChange(index, 'name', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_name`)}
                                      placeholder={`Staff ${index + 1} name`}
                                    />
                                    {getFieldError(`staff${index + 1}_name`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="text"
                                      data-field={`staff${index + 1}_role`}
                                      value={staff.role}
                                      onChange={(e) => handleStaffMemberChange(index, 'role', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_role`)}
                                      placeholder="Role"
                                    />
                                    {getFieldError(`staff${index + 1}_role`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="time"
                                      data-field={`staff${index + 1}_timeObserved`}
                                      value={staff.timeObserved}
                                      onChange={(e) => handleStaffMemberChange(index, 'timeObserved', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_timeObserved`)}
                                    />
                                    {getFieldError(`staff${index + 1}_timeObserved`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <select
                                      data-field={`staff${index + 1}_momentObserved`}
                                      value={staff.momentObserved}
                                      onChange={(e) => handleStaffMemberChange(index, 'momentObserved', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_momentObserved`)}
                                    >
                                      <option value="">Select moment</option>
                                      {momentOptions.map((moment) => (
                                        <option key={moment.value} value={moment.value}>
                                          {moment.label}
                                        </option>
                                      ))}
                                    </select>
                                    {getFieldError(`staff${index + 1}_momentObserved`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="text"
                                      data-field={`staff${index + 1}_completedBy`}
                                      value={staff.completedBy}
                                      onChange={(e) => handleStaffMemberChange(index, 'completedBy', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_completedBy`)}
                                      placeholder="Observer name"
                                    />
                                    {getFieldError(`staff${index + 1}_completedBy`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {section.name === 'individual-observations' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Detailed Observations</h4>
                        <div className="space-y-6">
                          {auditData.observations.map((observation, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                              <h5 className="text-md font-medium text-slate-800 mb-4">Observation {index + 1}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                                  <Input
                                    type="text"
                                    data-field={`observation${index + 1}_staff`}
                                    value={observation.staff}
                                    onChange={(e) => handleObservationChange(index, 'staff', e.target.value)}
                                    className={getFieldClassName(`observation${index + 1}_staff`)}
                                    placeholder="Staff name"
                                  />
                                  {getFieldError(`observation${index + 1}_staff`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Moment Observed</label>
                                  <select
                                    data-field={`observation${index + 1}_momentObserved`}
                                    value={observation.momentObserved}
                                    onChange={(e) => handleObservationChange(index, 'momentObserved', e.target.value)}
                                    className={getFieldClassName(`observation${index + 1}_momentObserved`)}
                                  >
                                    <option value="">Select moment</option>
                                    {momentOptions.map((moment) => (
                                      <option key={moment.value} value={moment.value}>
                                        {moment.value}
                                      </option>
                                    ))}
                                  </select>
                                  {getFieldError(`observation${index + 1}_momentObserved`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Technique</label>
                                  <div className="flex gap-4" data-field={`observation${index + 1}_correctTechnique`}>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name={`observation${index + 1}_correctTechnique`}
                                        value="Yes"
                                        checked={observation.correctTechnique === 'Yes'}
                                        onChange={(e) => handleObservationChange(index, 'correctTechnique', e.target.value)}
                                        className="mr-2"
                                      />
                                      Yes
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name={`observation${index + 1}_correctTechnique`}
                                        value="No"
                                        checked={observation.correctTechnique === 'No'}
                                        onChange={(e) => handleObservationChange(index, 'correctTechnique', e.target.value)}
                                        className="mr-2"
                                      />
                                      No
                                    </label>
                                  </div>
                                  {getFieldError(`observation${index + 1}_correctTechnique`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                                </div>
                                <AttachmentTextarea
                                  label="Comments"
                                  fieldKey={`observation${index + 1}_comments`}
                                  dataField={`observation${index + 1}_comments`}
                                  value={observation.comments}
                                  attachments={attachments}
                                  onChange={(value) => handleObservationChange(index, 'comments', value)}
                                  onAddAttachments={handleFilesAdded}
                                  onRemoveAttachment={handleRemoveAttachment}
                                  onPreviewAttachment={handlePreviewAttachment}
                                  placeholder="Additional comments..."
                                  rows={3}
                                  disabled={saving}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {section.name === 'final-comments' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Final Comments & Recommendations</h4>
                        <AttachmentTextarea
                          label="Comments"
                          fieldKey="finalComments"
                          dataField="finalComments"
                          value={finalComments}
                          attachments={attachments}
                          onChange={setFinalComments}
                          onAddAttachments={handleFilesAdded}
                          onRemoveAttachment={handleRemoveAttachment}
                          onPreviewAttachment={handlePreviewAttachment}
                          placeholder="Enter any additional comments or recommendations based on the hand hygiene observations..."
                          rows={6}
                          disabled={saving}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <button type="button" onClick={handleCompleteAudit} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                {saving ? 'Saving...' : 'Complete Audit'}
              </button>
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
              <button
                onClick={() => handleModalClose()}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'No'}
              </button>
              <button
                onClick={() => handleModalCreate(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save and Close'}
              </button>
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