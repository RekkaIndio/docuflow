"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { StaffSelectInput } from '@/components/audits/staff-select-input';

type AccidentIncidentReport = {
  home: string;
  auditDate: string;
  completedBy: string;
  incidentDate: string;
  incidentTime: string;
  residentName: string;
  accidentOrIncident: string;
  details: string;
  actionsTaken: string;
  preventative: string;
  cqcNotification: string;
  safeguardNotification: string;
};

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
  name: string;
  label: React.ReactNode;
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
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
}

const AttachmentTextarea: React.FC<AttachmentTextareaProps> = ({
  fieldKey,
  name,
  label,
  value,
  attachments,
  onChange,
  onAddAttachments,
  onRemoveAttachment,
  onPreviewAttachment,
  placeholder = "",
  rows = 3,
  className = "w-full",
  disabled = false,
  required = false,
  error = false,
  errorMessage,
}) => {
  const attachmentList = attachments[fieldKey] ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700" htmlFor={name}>
          {label}
        </label>
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
                if (disabled) return;
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
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
      {error && errorMessage && <p className="text-red-500 text-xs mt-1">{errorMessage}</p>}
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

const createEmptyReport = (): AccidentIncidentReport => ({
  home: "",
  auditDate: "",
  completedBy: "",
  incidentDate: "",
  incidentTime: "",
  residentName: "",
  accidentOrIncident: "",
  details: "",
  actionsTaken: "",
  preventative: "",
  cqcNotification: "",
  safeguardNotification: "",
});

export default function AccidentIncidentAuditPage({ startFresh = false }: { startFresh?: boolean }) {
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [reports, setReports] = useState<AccidentIncidentReport[]>([createEmptyReport()]);
  const [showModal, setShowModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());

  const currentReport = reports[currentReportIndex] ?? createEmptyReport();

  const updateReportField = (field: keyof AccidentIncidentReport, value: string) => {
    setReports(prev => {
      const updated = [...prev];
      const existing = updated[currentReportIndex] ?? createEmptyReport();
      updated[currentReportIndex] = {
        ...existing,
        [field]: value,
      };
      return updated;
    });
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name in currentReport) {
      updateReportField(name as keyof AccidentIncidentReport, value);
    }
  }

  function addNewReport() {
    setReports(prev => {
      const nextReport: AccidentIncidentReport = {
        ...createEmptyReport(),
        home: activeWorkspace?.name ?? "",
      };
      const updated = [...prev, nextReport];
      setCurrentReportIndex(updated.length - 1);
      return updated;
    });
  }

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

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage(attachment);
  }, []);

  const handleRemoveAttachment = (fieldName: string, id: string) => {
    setAttachments(prev => {
      const list = prev[fieldName] ?? [];
      const target = list.find(item => item.id === id);
      if (!target) return prev;

      if (target.url && target.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.url);
        } catch (err) {
          console.warn('Failed to revoke object URL', err);
        }
        createdObjectUrls.current.delete(target.url);
      }

      if (target.storagePath) {
        setAttachmentsToDelete(prevDeletes => [...prevDeletes, target.storagePath as string]);
      }

      if (previewImage && previewImage.url === target.url) {
        setPreviewImage(null);
      }

      const remaining = list.filter(item => item.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) {
        next[fieldName] = remaining;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  };

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) {
      throw new Error('Workspace not available for attachment upload');
    }
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (currentReport.auditDate || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId ? `organisations/${orgId}/workspaces/${activeWorkspace.id}` : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/accident-incident/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate all required fields
    const errors: string[] = [];
    const requiredFields = [
      { field: 'home', label: 'Home/Care Facility' },
      { field: 'auditDate', label: 'Audit Date' },
      { field: 'completedBy', label: 'Person Completing Audit' },
      { field: 'incidentDate', label: 'Incident Date' },
      { field: 'incidentTime', label: 'Incident Time' },
      { field: 'residentName', label: 'Resident Name' },
      { field: 'accidentOrIncident', label: 'Type of Occurrence' },
      { field: 'details', label: 'Details of Incident' },
      { field: 'actionsTaken', label: 'Actions Taken' },
      { field: 'preventative', label: 'Preventative Measures' },
      { field: 'cqcNotification', label: 'CQC Notification' },
      { field: 'safeguardNotification', label: 'Safeguarding Notification' },
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!currentReport[field as keyof typeof currentReport] || currentReport[field as keyof typeof currentReport].trim() === '') {
        errors.push(field);
      }
    });

    setValidationErrors(errors);

    if (errors.length > 0) {
      // Scroll to first error field
      const firstErrorElement = document.querySelector(`[name="${errors[0]}"]`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Ensure we have an active workspace — avoid falling back to top-level audits collection
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }

    const workspaceId = activeWorkspace.id;
    const orgId = activeWorkspace.organisationId || null;

    // Save audit immediately to ensure it's stored under the active workspace
    try {
      setSaving(true);

      const attachmentsMetadata: Record<string, AttachmentMetadata[]> = {};
      const nextAttachmentState: Record<string, AttachmentItem[]> = {};

      for (const [fieldName, items] of Object.entries(attachments)) {
        if (!items || items.length === 0) continue;
        const processed: AttachmentItem[] = [];
        for (const item of items) {
          if (item.file) {
            const { storagePath, downloadUrl } = await uploadAttachmentFile(fieldName, item.file);
            if (item.url && item.url.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(item.url);
              } catch (err) {
                console.warn('Failed to revoke object URL during upload', err);
              }
              createdObjectUrls.current.delete(item.url);
            }
            processed.push({ id: item.id, name: item.name, url: downloadUrl, storagePath, downloadUrl });
            if (!attachmentsMetadata[fieldName]) {
              attachmentsMetadata[fieldName] = [];
            }
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath, downloadUrl });
          } else if (item.storagePath) {
            const downloadUrl = item.downloadUrl || item.url;
            processed.push({ id: item.id, name: item.name, url: downloadUrl, storagePath: item.storagePath, downloadUrl });
            if (!attachmentsMetadata[fieldName]) {
              attachmentsMetadata[fieldName] = [];
            }
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath: item.storagePath, downloadUrl });
          }
        }
        if (processed.length > 0) {
          nextAttachmentState[fieldName] = processed;
        }
      }

      if (attachmentsToDelete.length > 0) {
        const uniquePaths = Array.from(new Set(attachmentsToDelete));
        for (const storagePath of uniquePaths) {
          try {
            await deleteObject(ref(storage, storagePath));
          } catch (err) {
            console.warn('Failed to delete removed attachment from storage', err);
          }
        }
      }

      const attachmentsPayload = Object.keys(attachmentsMetadata).length > 0 ? attachmentsMetadata : undefined;

      const auditPayload = {
        ...currentReport,
        ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
        comments: finalComments,
        createActionPlan: false,
        createdBy: user?.id ?? null,
        workspaceId: workspaceId,
        organisationId: orgId,
      };

      const id = await saveAudit(auditPayload, workspaceId, orgId);
      setSavedAuditId(id);
      
      // Mark this audit type as completed for the month and save snapshot
      try {
        const completedAt = currentReport.auditDate || new Date().toISOString();
        await markAuditCompletedWithSnapshot(workspaceId, 'accident-incident', auditPayload, completedAt);
      } catch (e) {
        console.warn('Failed to mark audit completed with snapshot', e);
      }
      
  setAttachments(nextAttachmentState);
  setAttachmentsToDelete([]);
  setPreviewImage(null);
  setSaving(false);
  setShowModal(true);
    } catch (err) {
      setSaving(false);
      console.error('Failed to save audit on submit', err);
      alert('Failed to save audit. Please try again.');
    }
  }

  async function handleModalResponse(createActionPlan: boolean) {
    setShowModal(false);
    setValidationErrors([]); // Clear validation errors on successful completion
    // The audit is already saved and marked as completed, just update the action plan flag if needed
    try {
      setSaving(true);
      if (!activeWorkspace?.id) {
        console.warn('No active workspace when completing audit; skipping update.');
      } else {
        const workspaceId = activeWorkspace.id;
        const orgId = activeWorkspace.organisationId || null;
        if (savedAuditId) {
          await updateAudit(savedAuditId, { createActionPlan: !!createActionPlan, comments: finalComments }, workspaceId, orgId);
        }
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to update saved audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const activeWorkspace = useWorkspace();
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');

  useEffect(() => {
    if (!activeWorkspace?.name) return;
    setReports(prev => {
      let changed = false;
      const next = prev.map(report => {
        if (report.home && report.home.trim().length > 0) {
          return report;
        }
        changed = true;
        return { ...report, home: activeWorkspace.name };
      });
      return changed ? next : prev;
    });
  }, [activeWorkspace?.name]);

  useEffect(() => {
    const resetFormState = () => {
      setReports([{ ...createEmptyReport(), home: activeWorkspace?.name ?? "" }]);
      setCurrentReportIndex(0);
      setFinalComments('');
      setSavedAuditId(null);
      setValidationErrors([]);
      setAttachments({});
      setAttachmentsToDelete([]);
      setPreviewImage(null);
    };

    if (!activeWorkspace?.id) {
      resetFormState();
      return;
    }

    if (startFresh) {
      resetFormState();
      return;
    }

    let cancelled = false;

    const loadExistingAudit = async () => {
      try {
        const existing = await getLatestAuditData(
          activeWorkspace.id,
          'accident-incident',
          undefined,
          activeWorkspace.organisationId || null
        );

        if (cancelled) return;

        if (existing) {
          const { id, createdAt, updatedAt, comments, attachments: storedAttachments, ...formData } = existing as Record<string, any>;
          const mergedReport: AccidentIncidentReport = {
            ...createEmptyReport(),
            ...formData,
          };
          if (!cancelled) {
            setReports([mergedReport]);
            setCurrentReportIndex(0);
            setSavedAuditId(typeof id === 'string' ? id : null);
            setFinalComments(typeof comments === 'string' ? comments : '');
          }

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
                  try {
                    downloadUrl = await getDownloadURL(ref(storage, storagePath));
                  } catch (err) {
                    console.error('Failed to fetch download URL for attachment', err);
                    continue;
                  }
                }
                if (!downloadUrl) continue;
                processed.push({
                  id: `existing-${fieldName}-${i}-${storagePath ?? entry.name ?? 'attachment'}`,
                  name: entry.name ?? `Attachment ${i + 1}`,
                  url: downloadUrl,
                  storagePath,
                  downloadUrl
                });
              }
              if (processed.length > 0) {
                processedEntries.push([fieldName, processed]);
              }
            }
            if (!cancelled) {
              setAttachments(processedEntries.length > 0 ? Object.fromEntries(processedEntries) : {});
            }
          }
        } else {
          resetFormState();
        }
        setValidationErrors([]);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load accident/incident audit data', error);
        }
      }
    };

    loadExistingAudit();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId, startFresh]);

  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn('Failed to revoke object URL on cleanup', err);
        }
      });
      createdObjectUrls.current.clear();
    };
  }, []);

  // Collapsible state for each section
  const [openSections, setOpenSections] = useState(() => Array(4).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  // Section definitions for collapsible form
  const sections = [
    {
      label: "1. Incident Details",
      name: "incidentDetails",
      guidance: ["Provide detailed information about the incident or accident."]
    },
    {
      label: "2. Response & Actions",
      name: "responseActions",
      guidance: [
        "Document immediate actions taken in response to the incident.",
        "Include any medical attention provided and communication with relevant parties."
      ]
    },
    {
      label: "3. Preventative Measures",
      name: "preventativeMeasures",
      guidance: [
        "Identify measures to prevent similar incidents in the future.",
        "Consider environmental factors, staff training, and procedural changes."
      ]
    },
    {
      label: "4. Notifications & Compliance",
      name: "notificationsCompliance",
      guidance: [
        "Document all required notifications to regulatory bodies and safeguarding teams.",
        "Ensure compliance with CQC and local authority requirements."
      ]
    }
  ];

  // Helper function to check if field has error
  const hasError = (fieldName: string) => validationErrors.includes(fieldName);
  
  // Helper function to get error styling
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return hasError(fieldName) 
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500` 
      : baseClassName;
  };

  const handleOccurrenceSelection = (choice: "Accident" | "Incident") => {
    updateReportField('accidentOrIncident', choice);
    setValidationErrors(prev => prev.filter(field => field !== 'accidentOrIncident'));
  };

  return (
  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Accident and Incident Audit</h1>
          <p className="mb-4 text-slate-500">Complete this form to document and audit accidents or incidents. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                name="home"
                value={currentReport.home}
                onChange={handleChange}
                placeholder="Enter care home name"
                required
              />
              {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input
                type="date"
                className={getFieldClassName('auditDate', "w-full")}
                name="auditDate"
                value={currentReport.auditDate}
                onChange={handleChange}
                required
              />
              {hasError('auditDate') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <StaffSelectInput
                type="text"
                className={getFieldClassName('completedBy', "w-full")}
                name="completedBy"
                value={currentReport.completedBy}
                onChange={handleChange}
                placeholder="Full name and position"
                required
              />
              {hasError('completedBy') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Incident Date</label>
              <Input
                type="date"
                className={getFieldClassName('incidentDate', "w-full")}
                name="incidentDate"
                value={currentReport.incidentDate}
                onChange={handleChange}
                required
              />
              {hasError('incidentDate') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Incident Time</label>
              <Input
                type="time"
                className={getFieldClassName('incidentTime', "w-full")}
                name="incidentTime"
                value={currentReport.incidentTime}
                onChange={handleChange}
                required
              />
              {hasError('incidentTime') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Resident Name</label>
              <Input
                type="text"
                className={getFieldClassName('residentName', "w-full")}
                name="residentName"
                value={currentReport.residentName}
                onChange={handleChange}
                placeholder="Full name"
                required
              />
              {hasError('residentName') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>
  {/* Main form right column (no internal scroll) - page should scroll externally so the left panel can stay sticky */}
  <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(idx)}
                >
                  <span>{section.label}</span>
                  {openSections[idx] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[idx] && (
                  <div className="px-8 pb-8">
                    {section.guidance && (
                      <ul className="mb-2 ml-4 list-disc text-sm text-slate-500 space-y-1">
                        {section.guidance.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    )}
                    {/* Section content based on index */}
                    {idx === 0 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type of Occurrence {hasError('accidentOrIncident') && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(['Accident', 'Incident'] as const).map(option => {
                              const isSelected = currentReport.accidentOrIncident?.toLowerCase() === option.toLowerCase();
                              return (
                                <Button
                                  key={option}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={`${isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-200 text-blue-700 hover:bg-blue-50'} rounded-lg px-4 py-2`}
                                  onClick={() => handleOccurrenceSelection(option)}
                                >
                                  {option}
                                </Button>
                              );
                            })}
                          </div>
                          <Input
                            type="text"
                            className={getFieldClassName('accidentOrIncident', "w-full bg-slate-50 border border-slate-200 rounded-lg")}
                            name="accidentOrIncident"
                            value={currentReport.accidentOrIncident}
                            onChange={handleChange}
                            placeholder="e.g., Fall, Medication error"
                            required
                          />
                          {hasError('accidentOrIncident') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                        <AttachmentTextarea
                          label={
                            <>
                              Details of Incident {hasError('details') && <span className="text-red-500">*</span>}
                            </>
                          }
                          fieldKey="details"
                          name="details"
                          value={currentReport.details}
                          attachments={attachments}
                          onChange={(value) => updateReportField('details', value)}
                          onAddAttachments={handleFilesAdded}
                          onRemoveAttachment={handleRemoveAttachment}
                          onPreviewAttachment={handlePreviewAttachment}
                          placeholder="Describe what occurred..."
                          className={getFieldClassName('details', "w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200")}
                          required
                          error={hasError('details')}
                          errorMessage="This field is required"
                        />
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="space-y-4">
                        <AttachmentTextarea
                          label={
                            <>
                              Actions Taken {hasError('actionsTaken') && <span className="text-red-500">*</span>}
                            </>
                          }
                          fieldKey="actionsTaken"
                          name="actionsTaken"
                          value={currentReport.actionsTaken}
                          attachments={attachments}
                          onChange={(value) => updateReportField('actionsTaken', value)}
                          onAddAttachments={handleFilesAdded}
                          onRemoveAttachment={handleRemoveAttachment}
                          onPreviewAttachment={handlePreviewAttachment}
                          placeholder="Immediate actions taken..."
                          className={getFieldClassName('actionsTaken', "w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200")}
                          required
                          error={hasError('actionsTaken')}
                          errorMessage="This field is required"
                        />
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="space-y-4">
                        <AttachmentTextarea
                          label={
                            <>
                              Preventative Measures {hasError('preventative') && <span className="text-red-500">*</span>}
                            </>
                          }
                          fieldKey="preventative"
                          name="preventative"
                          value={currentReport.preventative}
                          attachments={attachments}
                          onChange={(value) => updateReportField('preventative', value)}
                          onAddAttachments={handleFilesAdded}
                          onRemoveAttachment={handleRemoveAttachment}
                          onPreviewAttachment={handlePreviewAttachment}
                          placeholder="Prevention measures..."
                          className={getFieldClassName('preventative', "w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200")}
                          required
                          error={hasError('preventative')}
                          errorMessage="This field is required"
                        />
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="space-y-4">
                        <div className={hasError('cqcNotification') ? "bg-red-50 p-4 rounded-lg border border-red-200" : "bg-slate-50 p-4 rounded-lg"}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CQC Notification Required {hasError('cqcNotification') && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="cqcNotification"
                                value="yes"
                                checked={currentReport.cqcNotification === "yes"}
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              />
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="cqcNotification"
                                value="no"
                                checked={currentReport.cqcNotification === "no"}
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              />
                              <span className="text-sm">No</span>
                            </label>
                          </div>
                          {hasError('cqcNotification') && <p className="text-red-500 text-xs mt-1">Please select an option</p>}
                        </div>
                        <div className={hasError('safeguardNotification') ? "bg-red-50 p-4 rounded-lg border border-red-200" : "bg-slate-50 p-4 rounded-lg"}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Safeguarding Notification {hasError('safeguardNotification') && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="safeguardNotification"
                                value="yes"
                                checked={currentReport.safeguardNotification === "yes"}
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              />
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="safeguardNotification"
                                value="no"
                                checked={currentReport.safeguardNotification === "no"}
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              />
                              <span className="text-sm">No</span>
                            </label>
                          </div>
                          {hasError('safeguardNotification') && <p className="text-red-500 text-xs mt-1">Please select an option</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Final Comments section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Final Comments</h3>
              <Textarea
                name="finalComments"
                value={finalComments}
                onChange={(e) => setFinalComments(e.target.value)}
                placeholder="Any final comments or observations about this audit..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 h-32"
              />
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-bold mt-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60" disabled={saving}>
              {saving ? "Saving..." : "Complete Audit"}
            </Button>
          </form>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this incident?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleModalResponse(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'No'}
              </button>
              <button
                onClick={() => handleModalResponse(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Yes, Create Action Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setPreviewImage(null)} />
          <div className="relative z-70 max-w-3xl w-full mx-4">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <div className="flex justify-between items-start p-2 border-b">
                <div className="px-3 py-1 text-sm text-gray-700 truncate max-w-[80%]" title={previewImage.name}>{previewImage.name}</div>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="m-2 bg-white rounded-full p-1 text-gray-700 border"
                >
                  Close
                </button>
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
