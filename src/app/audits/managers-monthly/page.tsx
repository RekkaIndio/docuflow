"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StaffSelectInput } from '@/components/audits/staff-select-input';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface ManagersMonthlyData {
  home: string;
  date: string;
  personCompletingAudit: string;

  care_plans_recent: string;
  care_plans_recent_comment: string;
  daily_care_notes_completed: string;
  daily_care_notes_completed_comment: string;
  risk_assessments_up_to_date: string;
  risk_assessments_up_to_date_comment: string;
  mental_capacity_records: string;
  mental_capacity_records_comment: string;
  dols_applications_tracked: string;
  dols_applications_tracked_comment: string;

  mar_charts_completed: string;
  mar_charts_completed_comment: string;
  controlled_drugs_checked: string;
  controlled_drugs_checked_comment: string;
  fridge_room_temps_monitored: string;
  fridge_room_temps_monitored_comment: string;
  med_errors_recorded_followed: string;
  med_errors_recorded_followed_comment: string;
  prn_covert_protocols: string;
  prn_covert_protocols_comment: string;

  hand_hygiene_audits: string;
  hand_hygiene_audits_comment: string;
  cleaning_schedules_signed: string;
  cleaning_schedules_signed_comment: string;
  staff_following_ipc: string;
  staff_following_ipc_comment: string;
  waste_managed_correctly: string;
  waste_managed_correctly_comment: string;
  stocks_ppe_cleaning_ok: string;
  stocks_ppe_cleaning_ok_comment: string;

  staffing_levels_adequate: string;
  staffing_levels_adequate_comment: string;
  recruitment_checks_complete: string;
  recruitment_checks_complete_comment: string;
  supervisions_appraisals_up_to_date: string;
  supervisions_appraisals_up_to_date_comment: string;
  training_records_up_to_date: string;
  training_records_up_to_date_comment: string;
  agency_inducted_monitored: string;
  agency_inducted_monitored_comment: string;

  environmental_checks_completed: string;
  environmental_checks_completed_comment: string;
  maintenance_issues_logged: string;
  maintenance_issues_logged_comment: string;
  risk_assessments_reviewed: string;
  risk_assessments_reviewed_comment: string;
  incident_logs_reviewed: string;
  incident_logs_reviewed_comment: string;
  fire_drills_recorded: string;
  fire_drills_recorded_comment: string;

  residents_involved_in_decisions: string;
  residents_involved_in_decisions_comment: string;
  complaints_logged_responded: string;
  complaints_logged_responded_comment: string;
  activities_social_engagement: string;
  activities_social_engagement_comment: string;
  choice_independence_dignity: string;
  choice_independence_dignity_comment: string;
  safeguarding_concerns_followed: string;
  safeguarding_concerns_followed_comment: string;

  weights_monitored_referrals: string;
  weights_monitored_referrals_comment: string;
  food_fluid_charts_used: string;
  food_fluid_charts_used_comment: string;
  mealtime_audits_feedback: string;
  mealtime_audits_feedback_comment: string;
  special_diets_met: string;
  special_diets_met_comment: string;
  kitchen_compliant: string;
  kitchen_compliant_comment: string;

  internal_audits_completed: string;
  internal_audits_completed_comment: string;
  actions_followed_closed: string;
  actions_followed_closed_comment: string;
  policies_procedures_reviewed: string;
  policies_procedures_reviewed_comment: string;
  cqc_compliance_monitored: string;
  cqc_compliance_monitored_comment: string;
  qa_reports_feedback_analysed: string;
  qa_reports_feedback_analysed_comment: string;
}

const initialData: ManagersMonthlyData = {
  home: '',
  date: '',
  personCompletingAudit: '',

  care_plans_recent: '',
  care_plans_recent_comment: '',
  daily_care_notes_completed: '',
  daily_care_notes_completed_comment: '',
  risk_assessments_up_to_date: '',
  risk_assessments_up_to_date_comment: '',
  mental_capacity_records: '',
  mental_capacity_records_comment: '',
  dols_applications_tracked: '',
  dols_applications_tracked_comment: '',

  mar_charts_completed: '',
  mar_charts_completed_comment: '',
  controlled_drugs_checked: '',
  controlled_drugs_checked_comment: '',
  fridge_room_temps_monitored: '',
  fridge_room_temps_monitored_comment: '',
  med_errors_recorded_followed: '',
  med_errors_recorded_followed_comment: '',
  prn_covert_protocols: '',
  prn_covert_protocols_comment: '',

  hand_hygiene_audits: '',
  hand_hygiene_audits_comment: '',
  cleaning_schedules_signed: '',
  cleaning_schedules_signed_comment: '',
  staff_following_ipc: '',
  staff_following_ipc_comment: '',
  waste_managed_correctly: '',
  waste_managed_correctly_comment: '',
  stocks_ppe_cleaning_ok: '',
  stocks_ppe_cleaning_ok_comment: '',

  staffing_levels_adequate: '',
  staffing_levels_adequate_comment: '',
  recruitment_checks_complete: '',
  recruitment_checks_complete_comment: '',
  supervisions_appraisals_up_to_date: '',
  supervisions_appraisals_up_to_date_comment: '',
  training_records_up_to_date: '',
  training_records_up_to_date_comment: '',
  agency_inducted_monitored: '',
  agency_inducted_monitored_comment: '',

  environmental_checks_completed: '',
  environmental_checks_completed_comment: '',
  maintenance_issues_logged: '',
  maintenance_issues_logged_comment: '',
  risk_assessments_reviewed: '',
  risk_assessments_reviewed_comment: '',
  incident_logs_reviewed: '',
  incident_logs_reviewed_comment: '',
  fire_drills_recorded: '',
  fire_drills_recorded_comment: '',

  residents_involved_in_decisions: '',
  residents_involved_in_decisions_comment: '',
  complaints_logged_responded: '',
  complaints_logged_responded_comment: '',
  activities_social_engagement: '',
  activities_social_engagement_comment: '',
  choice_independence_dignity: '',
  choice_independence_dignity_comment: '',
  safeguarding_concerns_followed: '',
  safeguarding_concerns_followed_comment: '',

  weights_monitored_referrals: '',
  weights_monitored_referrals_comment: '',
  food_fluid_charts_used: '',
  food_fluid_charts_used_comment: '',
  mealtime_audits_feedback: '',
  mealtime_audits_feedback_comment: '',
  special_diets_met: '',
  special_diets_met_comment: '',
  kitchen_compliant: '',
  kitchen_compliant_comment: '',

  internal_audits_completed: '',
  internal_audits_completed_comment: '',
  actions_followed_closed: '',
  actions_followed_closed_comment: '',
  policies_procedures_reviewed: '',
  policies_procedures_reviewed_comment: '',
  cqc_compliance_monitored: '',
  cqc_compliance_monitored_comment: '',
  qa_reports_feedback_analysed: '',
  qa_reports_feedback_analysed_comment: '',
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

interface YesNoQuestionProps {
  label: string;
  yesNoField: keyof ManagersMonthlyData;
  commentField: keyof ManagersMonthlyData;
  yesNoValue: string;
  commentValue: string;
  onYesNoChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  attachments: Record<string, AttachmentItem[]>;
  onAddAttachments: (fieldName: string, files: FileList | null) => void;
  onRemoveAttachment: (fieldName: string, attachmentId: string) => void;
  onPreviewAttachment: (attachment: { url: string; name: string }) => void;
  isFieldInvalid: (fieldName: string) => boolean;
}

const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  label,
  yesNoField,
  commentField,
  yesNoValue,
  commentValue,
  onYesNoChange,
  onCommentChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onPreviewAttachment,
  isFieldInvalid,
}) => {
  const fieldKey = yesNoField as string;
  const commentKey = commentField as string;
  const attachmentList = attachments[fieldKey] ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-colors hover:border-blue-200" data-field={fieldKey}>
      <div className="flex items-start justify-between gap-4">
        <label className="block text-sm font-semibold text-slate-800 leading-snug">{label}</label>
        <div className="relative flex-shrink-0">
          {attachmentList.length > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
              {attachmentList.length}
            </span>
          )}
          <label
            title="Add attachment"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-50 text-blue-600 cursor-pointer border border-transparent hover:bg-blue-100"
          >
            <input
              type="file"
              accept="image/*"
              data-field-input={fieldKey}
              onChange={(e) => {
                onAddAttachments(fieldKey, e.target.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
            <span className="text-xl font-bold">+</span>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-4">
        {['Yes', 'No', 'N/A'].map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input
              type="radio"
              name={fieldKey}
              value={option}
              checked={yesNoValue === option}
              onChange={(e) => onYesNoChange(e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {isFieldInvalid(fieldKey) && <p className="text-red-500 text-xs mt-2">This field is required</p>}
      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-slate-700">Comments</label>
        <Textarea
          value={commentValue}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={2}
          placeholder="Add any comments or observations..."
          data-comment-field={commentKey}
          className="bg-slate-50 border-slate-200"
        />
      </div>
      {attachmentList.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {attachmentList.map((att) => (
              <div key={att.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
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
                  title="Remove"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-slate-200 shadow"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ManagersMonthlyAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  
  // Section definitions for collapsible UI
  const sections = [
    { label: '1. Care Planning and Documentation', guidance: ['Review care plans, notes and risk assessments.'] },
    { label: '2. Medication Management', guidance: ['Check MAR charts, fridge temps and CD records.'] },
    { label: '3. Infection Prevention and Control', guidance: ['Review IPC audits, cleaning schedules and PPE stocks.'] },
    { label: '4. Staffing and Supervision', guidance: ['Staffing levels, recruitment checks, supervisions and training.'] },
    { label: '5. Health and Safety', guidance: ['Environmental checks, maintenance and incident review.'] },
    { label: '6. Resident Wellbeing and Rights', guidance: ['Complaints, involvement, activities and safeguarding.'] },
    { label: '7. Nutrition and Mealtimes', guidance: ['Weights, charts, mealtime audits and special diets.'] },
    { label: '8. Audits, Governance and Compliance', guidance: ['Internal audits, actions, policies and CQC readiness.'] }
  ];

  const [openSections, setOpenSections] = useState<boolean[]>(() => Array(sections.length).fill(true));
  const toggleSection = (idx: number) => setOpenSections(prev => prev.map((open, i) => i === idx ? !open : open));
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  // Attachments state: map fieldName -> AttachmentItem[]
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  // Storage paths queued for deletion after save
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());

  // Load existing audit data and any stored attachments when workspace changes
  useEffect(() => {
    let cancelled = false;
    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) return;

      setAttachments({});
      setAttachmentsToDelete([]);

      try {
        const existingData = await getLatestAuditData(
          activeWorkspace.id,
          'managers-monthly',
          undefined,
          activeWorkspace?.organisationId || null
        );
        if (existingData) {
          const { attachments: storedAttachments, comments, ...formData } = existingData as any;
          if (!cancelled) setData(prev => ({ ...prev, ...formData }));
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
              if (processed.length > 0) processedEntries.push([fieldName, processed]);
            }
            if (!cancelled && processedEntries.length > 0) setAttachments(Object.fromEntries(processedEntries));
          }
        }
      } catch (error) {
        console.error('Failed to load existing managers-monthly audit data:', error);
      }
    };

    loadExistingAuditData();
    return () => { cancelled = true; };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  // preview keyboard close (ESC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn('Failed to revoke object URL', err);
        }
      });
      createdObjectUrls.current.clear();
    };
  }, []);
  const [finalComments, setFinalComments] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const [data, setData] = useState<ManagersMonthlyData>(initialData);

  // Prefill home field with workspace name when available
  useEffect(() => {
    if (!activeWorkspace?.name) return;
    setData(prev => {
      if (prev.home && prev.home.trim().length > 0) return prev;
      return { ...prev, home: activeWorkspace.name };
    });
  }, [activeWorkspace?.name]);

  const fieldHasError = useCallback((fieldName: string) => errors.includes(fieldName), [errors]);
  const getFieldClassName = useCallback(
    (fieldName: string, baseClassName = 'w-full') =>
      fieldHasError(fieldName)
        ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
        : baseClassName,
    [fieldHasError]
  );

  const handleChange = (field: keyof ManagersMonthlyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field as string)) setErrors(prev => prev.filter(e => e !== (field as string)));
  };

  // Attachment handlers
  const handleAddAttachments = (fieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setAttachments(prev => {
      const existing = prev[fieldName] ?? [];
      const added = fileArray.map(file => {
        const blobUrl = URL.createObjectURL(file);
        createdObjectUrls.current.add(blobUrl);
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${fieldName}-${Date.now()}-${file.name}`;
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

      if (removed.url && removed.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch (e) {
          console.warn('Failed to revoke object URL', e);
        }
        createdObjectUrls.current.delete(removed.url);
      }

      if (removed.storagePath) {
        setAttachmentsToDelete(prevDeletes => [...prevDeletes, removed.storagePath as string]);
      }

      if (previewImage && previewImage.url === removed.url) {
        setPreviewImage(null);
      }

      const remaining = list.filter(a => a.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) {
        next[fieldName] = remaining;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  };

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage(attachment);
  }, []);

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) {
      throw new Error('Workspace not available for attachment upload');
    }
    const orgId = activeWorkspace?.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (data.date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId
      ? `organisations/${orgId}/workspaces/${activeWorkspace.id}`
      : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/managers-monthly/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  const validateForm = () => {
    const required: (keyof ManagersMonthlyData)[] = [
      'home','date','personCompletingAudit',
      'care_plans_recent','daily_care_notes_completed','risk_assessments_up_to_date','mental_capacity_records','dols_applications_tracked',
      'mar_charts_completed','controlled_drugs_checked','fridge_room_temps_monitored','med_errors_recorded_followed','prn_covert_protocols',
      'hand_hygiene_audits','cleaning_schedules_signed','staff_following_ipc','waste_managed_correctly','stocks_ppe_cleaning_ok',
      'staffing_levels_adequate','recruitment_checks_complete','supervisions_appraisals_up_to_date','training_records_up_to_date','agency_inducted_monitored',
      'environmental_checks_completed','maintenance_issues_logged','risk_assessments_reviewed','incident_logs_reviewed','fire_drills_recorded',
      'residents_involved_in_decisions','complaints_logged_responded','activities_social_engagement','choice_independence_dignity','safeguarding_concerns_followed',
      'weights_monitored_referrals','food_fluid_charts_used','mealtime_audits_feedback','special_diets_met','kitchen_compliant',
      'internal_audits_completed','actions_followed_closed','policies_procedures_reviewed','cqc_compliance_monitored','qa_reports_feedback_analysed'
    ];

    const missing = required.filter(f => !data[f].trim());
    setErrors(missing as string[]);
    if (missing.length > 0) {
      const el = document.querySelector(`[data-field="${missing[0]}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return missing.length === 0;
  };

  const activeWorkspaceId = activeWorkspace?.id;

  const handleComplete = () => {
    if (validateForm()) setShowModal(true);
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    setShowModal(false);
    if (!activeWorkspaceId) return alert('No active workspace selected. Please choose a workspace before saving audits.');

    const tally = Object.keys(data).reduce(
      (acc, key) => {
        const value = (data as any)[key];
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

    // Prepare attachments: upload new files and assemble metadata for the payload
    const orgId = activeWorkspace?.organisationId || null;
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
          const stored: AttachmentItem = {
            id: item.id,
            name: item.name,
            url: downloadUrl,
            storagePath,
            downloadUrl
          };
          processed.push(stored);
          if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
          attachmentsMetadata[fieldName].push({ name: item.name, storagePath, downloadUrl });
        } else if (item.storagePath) {
          const downloadUrl = item.downloadUrl || item.url;
          if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
          attachmentsMetadata[fieldName].push({ name: item.name, storagePath: item.storagePath, downloadUrl });
          processed.push({
            id: item.id,
            name: item.name,
            url: downloadUrl,
            storagePath: item.storagePath,
            downloadUrl
          });
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

    const payload = {
      ...data,
      ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: user?.id ?? null,
      workspaceId: activeWorkspaceId,
      organisationId: orgId,
      auditType: 'managers-monthly',
      yesCount: tally.yesCount,
      totalCount: tally.totalCount,
      scorePercent,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, activeWorkspaceId, activeWorkspace?.organisationId || null);
      setSavedAuditId(id);
  const completedAt = data.date || new Date().toISOString();
  await markAuditCompletedWithSnapshot(activeWorkspaceId, 'managers-monthly', payload, completedAt);
    // Update local attachment state after successful save
    setAttachments(nextAttachmentState);
    setAttachmentsToDelete([]);
    setPreviewImage(null);
    alert('Audit saved');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save managers-monthly audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const addNewReport = () => {
    setData(initialData);
    setAttachments({});
    setAttachmentsToDelete([]);
    setPreviewImage(null);
    setCurrentReport(prev => prev + 1);
  };

  const yesNoSharedProps = {
    attachments,
    onAddAttachments: handleAddAttachments,
    onRemoveAttachment: handleRemoveAttachment,
    onPreviewAttachment: handlePreviewAttachment,
    isFieldInvalid: fieldHasError,
  };

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Managers Monthly Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive monthly check. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input type="text" className={getFieldClassName('home', 'w-full')} name="home" value={data.home} onChange={(e: any) => handleChange('home', e.target.value)} placeholder="Enter care home name" data-field="home" required />
              {fieldHasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input type="date" className={getFieldClassName('date', 'w-full')} name="date" value={data.date} onChange={(e: any) => handleChange('date', e.target.value)} data-field="date" required />
              {fieldHasError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <StaffSelectInput type="text" className={getFieldClassName('personCompletingAudit', 'w-full')} name="personCompletingAudit" value={data.personCompletingAudit} onChange={(e: any) => handleChange('personCompletingAudit', e.target.value)} placeholder="Full name and position" data-field="personCompletingAudit" required />
              {fieldHasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div className="text-sm text-slate-600">
              <strong>Sections:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Care planning & documentation</li>
                <li>Medication management</li>
                <li>IPC, Staffing, Environment, Residents</li>
                <li>Quality & compliance</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button onClick={addNewReport} className="px-3 py-2 bg-blue-600 text-white rounded-lg">New Report</button>
              <div className="px-3 py-2 bg-slate-100 rounded-lg">Report {currentReport} / {totalReports}</div>
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <div key={section.label} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                  <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(idx)}>
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{section.label}</h3>
                    </div>
                    {openSections[idx] ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  {openSections[idx] && (
                    <div className="px-8 pb-8">
                      {section.guidance?.length > 0 && (
                        <ul className="mb-4 ml-4 list-disc text-sm text-slate-500 space-y-1">
                          {section.guidance.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      )}
                      {/* Section specific content */}
                      {idx === 0 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are all care plans reviewed and updated within the last 30 days?"
                            yesNoField="care_plans_recent"
                            commentField="care_plans_recent_comment"
                            yesNoValue={data.care_plans_recent}
                            commentValue={data.care_plans_recent_comment}
                            onYesNoChange={(v) => handleChange('care_plans_recent', v)}
                            onCommentChange={(v) => handleChange('care_plans_recent_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are daily care notes consistently completed and person-centred?"
                            yesNoField="daily_care_notes_completed"
                            commentField="daily_care_notes_completed_comment"
                            yesNoValue={data.daily_care_notes_completed}
                            commentValue={data.daily_care_notes_completed_comment}
                            onYesNoChange={(v) => handleChange('daily_care_notes_completed', v)}
                            onCommentChange={(v) => handleChange('daily_care_notes_completed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are risk assessments (falls, pressure ulcers, nutrition, etc.) up to date?"
                            yesNoField="risk_assessments_up_to_date"
                            commentField="risk_assessments_up_to_date_comment"
                            yesNoValue={data.risk_assessments_up_to_date}
                            commentValue={data.risk_assessments_up_to_date_comment}
                            onYesNoChange={(v) => handleChange('risk_assessments_up_to_date', v)}
                            onCommentChange={(v) => handleChange('risk_assessments_up_to_date_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are mental capacity assessments and best interest decisions recorded where required?"
                            yesNoField="mental_capacity_records"
                            commentField="mental_capacity_records_comment"
                            yesNoValue={data.mental_capacity_records}
                            commentValue={data.mental_capacity_records_comment}
                            onYesNoChange={(v) => handleChange('mental_capacity_records', v)}
                            onCommentChange={(v) => handleChange('mental_capacity_records_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are DoLS applications made appropriately and tracked?"
                            yesNoField="dols_applications_tracked"
                            commentField="dols_applications_tracked_comment"
                            yesNoValue={data.dols_applications_tracked}
                            commentValue={data.dols_applications_tracked_comment}
                            onYesNoChange={(v) => handleChange('dols_applications_tracked', v)}
                            onCommentChange={(v) => handleChange('dols_applications_tracked_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 1 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are MAR charts completed accurately with no missing signatures?"
                            yesNoField="mar_charts_completed"
                            commentField="mar_charts_completed_comment"
                            yesNoValue={data.mar_charts_completed}
                            commentValue={data.mar_charts_completed_comment}
                            onYesNoChange={(v) => handleChange('mar_charts_completed', v)}
                            onCommentChange={(v) => handleChange('mar_charts_completed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are controlled drugs checked and recorded in line with policy?"
                            yesNoField="controlled_drugs_checked"
                            commentField="controlled_drugs_checked_comment"
                            yesNoValue={data.controlled_drugs_checked}
                            commentValue={data.controlled_drugs_checked_comment}
                            onYesNoChange={(v) => handleChange('controlled_drugs_checked', v)}
                            onCommentChange={(v) => handleChange('controlled_drugs_checked_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are fridge and room temperatures monitored and within range?"
                            yesNoField="fridge_room_temps_monitored"
                            commentField="fridge_room_temps_monitored_comment"
                            yesNoValue={data.fridge_room_temps_monitored}
                            commentValue={data.fridge_room_temps_monitored_comment}
                            onYesNoChange={(v) => handleChange('fridge_room_temps_monitored', v)}
                            onCommentChange={(v) => handleChange('fridge_room_temps_monitored_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are any medication errors recorded, investigated, and followed up?"
                            yesNoField="med_errors_recorded_followed"
                            commentField="med_errors_recorded_followed_comment"
                            yesNoValue={data.med_errors_recorded_followed}
                            commentValue={data.med_errors_recorded_followed_comment}
                            onYesNoChange={(v) => handleChange('med_errors_recorded_followed', v)}
                            onCommentChange={(v) => handleChange('med_errors_recorded_followed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are PRN and covert medication protocols in place and appropriate?"
                            yesNoField="prn_covert_protocols"
                            commentField="prn_covert_protocols_comment"
                            yesNoValue={data.prn_covert_protocols}
                            commentValue={data.prn_covert_protocols_comment}
                            onYesNoChange={(v) => handleChange('prn_covert_protocols', v)}
                            onCommentChange={(v) => handleChange('prn_covert_protocols_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 2 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are hand hygiene and PPE audits completed regularly?"
                            yesNoField="hand_hygiene_audits"
                            commentField="hand_hygiene_audits_comment"
                            yesNoValue={data.hand_hygiene_audits}
                            commentValue={data.hand_hygiene_audits_comment}
                            onYesNoChange={(v) => handleChange('hand_hygiene_audits', v)}
                            onCommentChange={(v) => handleChange('hand_hygiene_audits_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are cleaning schedules up to date and signed?"
                            yesNoField="cleaning_schedules_signed"
                            commentField="cleaning_schedules_signed_comment"
                            yesNoValue={data.cleaning_schedules_signed}
                            commentValue={data.cleaning_schedules_signed_comment}
                            onYesNoChange={(v) => handleChange('cleaning_schedules_signed', v)}
                            onCommentChange={(v) => handleChange('cleaning_schedules_signed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are all staff following current IPC guidance (e.g. isolation, testing)?"
                            yesNoField="staff_following_ipc"
                            commentField="staff_following_ipc_comment"
                            yesNoValue={data.staff_following_ipc}
                            commentValue={data.staff_following_ipc_comment}
                            onYesNoChange={(v) => handleChange('staff_following_ipc', v)}
                            onCommentChange={(v) => handleChange('staff_following_ipc_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are clinical and domestic waste managed correctly?"
                            yesNoField="waste_managed_correctly"
                            commentField="waste_managed_correctly_comment"
                            yesNoValue={data.waste_managed_correctly}
                            commentValue={data.waste_managed_correctly_comment}
                            onYesNoChange={(v) => handleChange('waste_managed_correctly', v)}
                            onCommentChange={(v) => handleChange('waste_managed_correctly_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are there sufficient stocks of PPE and cleaning materials?"
                            yesNoField="stocks_ppe_cleaning_ok"
                            commentField="stocks_ppe_cleaning_ok_comment"
                            yesNoValue={data.stocks_ppe_cleaning_ok}
                            commentValue={data.stocks_ppe_cleaning_ok_comment}
                            onYesNoChange={(v) => handleChange('stocks_ppe_cleaning_ok', v)}
                            onCommentChange={(v) => handleChange('stocks_ppe_cleaning_ok_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 3 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are staffing levels adequate and in line with dependency levels?"
                            yesNoField="staffing_levels_adequate"
                            commentField="staffing_levels_adequate_comment"
                            yesNoValue={data.staffing_levels_adequate}
                            commentValue={data.staffing_levels_adequate_comment}
                            onYesNoChange={(v) => handleChange('staffing_levels_adequate', v)}
                            onCommentChange={(v) => handleChange('staffing_levels_adequate_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are recruitment checks complete for any new starters (DBS, references)?"
                            yesNoField="recruitment_checks_complete"
                            commentField="recruitment_checks_complete_comment"
                            yesNoValue={data.recruitment_checks_complete}
                            commentValue={data.recruitment_checks_complete_comment}
                            onYesNoChange={(v) => handleChange('recruitment_checks_complete', v)}
                            onCommentChange={(v) => handleChange('recruitment_checks_complete_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are supervisions and appraisals up to date for all staff?"
                            yesNoField="supervisions_appraisals_up_to_date"
                            commentField="supervisions_appraisals_up_to_date_comment"
                            yesNoValue={data.supervisions_appraisals_up_to_date}
                            commentValue={data.supervisions_appraisals_up_to_date_comment}
                            onYesNoChange={(v) => handleChange('supervisions_appraisals_up_to_date', v)}
                            onCommentChange={(v) => handleChange('supervisions_appraisals_up_to_date_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are training records up to date and reflect mandatory requirements?"
                            yesNoField="training_records_up_to_date"
                            commentField="training_records_up_to_date_comment"
                            yesNoValue={data.training_records_up_to_date}
                            commentValue={data.training_records_up_to_date_comment}
                            onYesNoChange={(v) => handleChange('training_records_up_to_date', v)}
                            onCommentChange={(v) => handleChange('training_records_up_to_date_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are agency staff inducted and monitored appropriately?"
                            yesNoField="agency_inducted_monitored"
                            commentField="agency_inducted_monitored_comment"
                            yesNoValue={data.agency_inducted_monitored}
                            commentValue={data.agency_inducted_monitored_comment}
                            onYesNoChange={(v) => handleChange('agency_inducted_monitored', v)}
                            onCommentChange={(v) => handleChange('agency_inducted_monitored_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 4 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are environmental checks completed (e.g. water temp, fire exits)?"
                            yesNoField="environmental_checks_completed"
                            commentField="environmental_checks_completed_comment"
                            yesNoValue={data.environmental_checks_completed}
                            commentValue={data.environmental_checks_completed_comment}
                            onYesNoChange={(v) => handleChange('environmental_checks_completed', v)}
                            onCommentChange={(v) => handleChange('environmental_checks_completed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are maintenance issues logged and addressed promptly?"
                            yesNoField="maintenance_issues_logged"
                            commentField="maintenance_issues_logged_comment"
                            yesNoValue={data.maintenance_issues_logged}
                            commentValue={data.maintenance_issues_logged_comment}
                            onYesNoChange={(v) => handleChange('maintenance_issues_logged', v)}
                            onCommentChange={(v) => handleChange('maintenance_issues_logged_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are risk assessments reviewed and signed (e.g. COSHH, moving and handling)?"
                            yesNoField="risk_assessments_reviewed"
                            commentField="risk_assessments_reviewed_comment"
                            yesNoValue={data.risk_assessments_reviewed}
                            commentValue={data.risk_assessments_reviewed_comment}
                            onYesNoChange={(v) => handleChange('risk_assessments_reviewed', v)}
                            onCommentChange={(v) => handleChange('risk_assessments_reviewed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are accident/incident logs reviewed monthly and analysed for trends?"
                            yesNoField="incident_logs_reviewed"
                            commentField="incident_logs_reviewed_comment"
                            yesNoValue={data.incident_logs_reviewed}
                            commentValue={data.incident_logs_reviewed_comment}
                            onYesNoChange={(v) => handleChange('incident_logs_reviewed', v)}
                            onCommentChange={(v) => handleChange('incident_logs_reviewed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is there a record of fire drills and evacuation practices?"
                            yesNoField="fire_drills_recorded"
                            commentField="fire_drills_recorded_comment"
                            yesNoValue={data.fire_drills_recorded}
                            commentValue={data.fire_drills_recorded_comment}
                            onYesNoChange={(v) => handleChange('fire_drills_recorded', v)}
                            onCommentChange={(v) => handleChange('fire_drills_recorded_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 5 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are residents involved in decision-making about their care?"
                            yesNoField="residents_involved_in_decisions"
                            commentField="residents_involved_in_decisions_comment"
                            yesNoValue={data.residents_involved_in_decisions}
                            commentValue={data.residents_involved_in_decisions_comment}
                            onYesNoChange={(v) => handleChange('residents_involved_in_decisions', v)}
                            onCommentChange={(v) => handleChange('residents_involved_in_decisions_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are complaints, compliments and concerns logged and responded to?"
                            yesNoField="complaints_logged_responded"
                            commentField="complaints_logged_responded_comment"
                            yesNoValue={data.complaints_logged_responded}
                            commentValue={data.complaints_logged_responded_comment}
                            onYesNoChange={(v) => handleChange('complaints_logged_responded', v)}
                            onCommentChange={(v) => handleChange('complaints_logged_responded_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are there activities and social engagement opportunities in place?"
                            yesNoField="activities_social_engagement"
                            commentField="activities_social_engagement_comment"
                            yesNoValue={data.activities_social_engagement}
                            commentValue={data.activities_social_engagement_comment}
                            onYesNoChange={(v) => handleChange('activities_social_engagement', v)}
                            onCommentChange={(v) => handleChange('activities_social_engagement_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are residents supported with choice, independence, and dignity?"
                            yesNoField="choice_independence_dignity"
                            commentField="choice_independence_dignity_comment"
                            yesNoValue={data.choice_independence_dignity}
                            commentValue={data.choice_independence_dignity_comment}
                            onYesNoChange={(v) => handleChange('choice_independence_dignity', v)}
                            onCommentChange={(v) => handleChange('choice_independence_dignity_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are safeguarding concerns raised and followed up properly?"
                            yesNoField="safeguarding_concerns_followed"
                            commentField="safeguarding_concerns_followed_comment"
                            yesNoValue={data.safeguarding_concerns_followed}
                            commentValue={data.safeguarding_concerns_followed_comment}
                            onYesNoChange={(v) => handleChange('safeguarding_concerns_followed', v)}
                            onCommentChange={(v) => handleChange('safeguarding_concerns_followed_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 6 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are weights monitored and referrals made where needed (e.g. dietitian)?"
                            yesNoField="weights_monitored_referrals"
                            commentField="weights_monitored_referrals_comment"
                            yesNoValue={data.weights_monitored_referrals}
                            commentValue={data.weights_monitored_referrals_comment}
                            onYesNoChange={(v) => handleChange('weights_monitored_referrals', v)}
                            onCommentChange={(v) => handleChange('weights_monitored_referrals_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are food/fluid charts used appropriately and completed accurately?"
                            yesNoField="food_fluid_charts_used"
                            commentField="food_fluid_charts_used_comment"
                            yesNoValue={data.food_fluid_charts_used}
                            commentValue={data.food_fluid_charts_used_comment}
                            onYesNoChange={(v) => handleChange('food_fluid_charts_used', v)}
                            onCommentChange={(v) => handleChange('food_fluid_charts_used_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are mealtime audits carried out, and feedback gathered from residents?"
                            yesNoField="mealtime_audits_feedback"
                            commentField="mealtime_audits_feedback_comment"
                            yesNoValue={data.mealtime_audits_feedback}
                            commentValue={data.mealtime_audits_feedback_comment}
                            onYesNoChange={(v) => handleChange('mealtime_audits_feedback', v)}
                            onCommentChange={(v) => handleChange('mealtime_audits_feedback_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are special dietary needs being met safely and appropriately?"
                            yesNoField="special_diets_met"
                            commentField="special_diets_met_comment"
                            yesNoValue={data.special_diets_met}
                            commentValue={data.special_diets_met_comment}
                            onYesNoChange={(v) => handleChange('special_diets_met', v)}
                            onCommentChange={(v) => handleChange('special_diets_met_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is the kitchen compliant with food hygiene standards?"
                            yesNoField="kitchen_compliant"
                            commentField="kitchen_compliant_comment"
                            yesNoValue={data.kitchen_compliant}
                            commentValue={data.kitchen_compliant_comment}
                            onYesNoChange={(v) => handleChange('kitchen_compliant', v)}
                            onCommentChange={(v) => handleChange('kitchen_compliant_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                      {idx === 7 && (
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are internal audits (care plans, medication, H&S, etc.) completed this month?"
                            yesNoField="internal_audits_completed"
                            commentField="internal_audits_completed_comment"
                            yesNoValue={data.internal_audits_completed}
                            commentValue={data.internal_audits_completed_comment}
                            onYesNoChange={(v) => handleChange('internal_audits_completed', v)}
                            onCommentChange={(v) => handleChange('internal_audits_completed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are any actions from previous audits followed up and closed?"
                            yesNoField="actions_followed_closed"
                            commentField="actions_followed_closed_comment"
                            yesNoValue={data.actions_followed_closed}
                            commentValue={data.actions_followed_closed_comment}
                            onYesNoChange={(v) => handleChange('actions_followed_closed', v)}
                            onCommentChange={(v) => handleChange('actions_followed_closed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are policies and procedures reviewed and accessible?"
                            yesNoField="policies_procedures_reviewed"
                            commentField="policies_procedures_reviewed_comment"
                            yesNoValue={data.policies_procedures_reviewed}
                            commentValue={data.policies_procedures_reviewed_comment}
                            onYesNoChange={(v) => handleChange('policies_procedures_reviewed', v)}
                            onCommentChange={(v) => handleChange('policies_procedures_reviewed_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is CQC compliance monitored, and PIR or inspection preparedness maintained?"
                            yesNoField="cqc_compliance_monitored"
                            commentField="cqc_compliance_monitored_comment"
                            yesNoValue={data.cqc_compliance_monitored}
                            commentValue={data.cqc_compliance_monitored_comment}
                            onYesNoChange={(v) => handleChange('cqc_compliance_monitored', v)}
                            onCommentChange={(v) => handleChange('cqc_compliance_monitored_comment', v)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are quality assurance reports and resident/family feedback analysed?"
                            yesNoField="qa_reports_feedback_analysed"
                            commentField="qa_reports_feedback_analysed_comment"
                            yesNoValue={data.qa_reports_feedback_analysed}
                            commentValue={data.qa_reports_feedback_analysed_comment}
                            onYesNoChange={(v) => handleChange('qa_reports_feedback_analysed', v)}
                            onCommentChange={(v) => handleChange('qa_reports_feedback_analysed_comment', v)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Final Comments</h3>
                <Textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} rows={4} placeholder="Final comments for this audit" className="w-full bg-slate-50 border-slate-200" />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium" disabled={saving}>{saving ? 'Saving...' : 'Complete Audit'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" disabled={saving}>{saving ? 'Saving...' : 'No'}</button>
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
                <div className="px-3 py-1 text-sm text-gray-700 truncate">{previewImage.name}</div>
                <button type="button" onClick={() => setPreviewImage(null)} className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">Close</button>
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