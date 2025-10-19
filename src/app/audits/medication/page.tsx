 'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useWorkspace } from '@/context/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface MedicationData {
  home: string;
  name: string;
  personCompletingAudit: string;

  // 1 Policies and Procedures
  medication_policy_current: string;
  medication_policy_current_comment: string;
  staff_training_competency: string;
  staff_training_competency_comment: string;
  controlled_drugs_policy: string;
  controlled_drugs_policy_comment: string;
  reporting_errors_procedure: string;
  reporting_errors_procedure_comment: string;
  policy_nice_compliant: string;
  policy_nice_compliant_comment: string;

  // 2 Storage of Medication
  meds_stored_secure: string;
  meds_stored_secure_comment: string;
  cds_separate_locked: string;
  cds_separate_locked_comment: string;
  access_limited_authorised: string;
  access_limited_authorised_comment: string;
  med_fridge_lockable: string;
  med_fridge_lockable_comment: string;
  fridge_temps_recorded: string;
  fridge_temps_recorded_comment: string;

  // 3 Medication Administration
  mar_charts_legible: string;
  mar_charts_legible_comment: string;
  five_rights_followed: string;
  five_rights_followed_comment: string;
  meds_given_correct_time: string;
  meds_given_correct_time_comment: string;
  signatures_recorded: string;
  signatures_recorded_comment: string;
  residents_supported_dignified: string;
  residents_supported_dignified_comment: string;

  // 4 PRN
  prn_protocols_clear: string;
  prn_protocols_clear_comment: string;
  prn_given_documented: string;
  prn_given_documented_comment: string;
  prn_effect_evaluated: string;
  prn_effect_evaluated_comment: string;
  staff_aware_prn: string;
  staff_aware_prn_comment: string;

  // 5 Controlled Drugs
  cds_bound_register: string;
  cds_bound_register_comment: string;
  cds_stock_balance_checked: string;
  cds_stock_balance_checked_comment: string;
  cds_two_staff_present: string;
  cds_two_staff_present_comment: string;
  cds_expired_recorded: string;
  cds_expired_recorded_comment: string;

  // 6 Ordering and Supply
  ordering_process_clear: string;
  ordering_process_clear_comment: string;
  deliveries_checked_recorded: string;
  deliveries_checked_recorded_comment: string;
  discrepancies_process: string;
  discrepancies_process_comment: string;
  meds_available_not_out: string;
  meds_available_not_out_comment: string;

  // 7 Disposal of Medication
  disposal_system_secure: string;
  disposal_system_secure_comment: string;
  disposal_records_kept: string;
  disposal_records_kept_comment: string;
  cds_disposed_witnessed: string;
  cds_disposed_witnessed_comment: string;

  // 8 Covert Medication
  covert_best_interest: string;
  covert_best_interest_comment: string;
  covert_care_plans: string;
  covert_care_plans_comment: string;
  covert_documented_monitored: string;
  covert_documented_monitored_comment: string;

  // 9 Errors and Incident Reporting
  errors_documented: string;
  errors_documented_comment: string;
  learning_from_errors: string;
  learning_from_errors_comment: string;
  safeguarding_reported: string;
  safeguarding_reported_comment: string;
  staff_confident_reporting: string;
  staff_confident_reporting_comment: string;

  // 10 Resident-Centred Practice
  residents_involved_decisions: string;
  residents_involved_decisions_comment: string;
  residents_supported_self_admin: string;
  residents_supported_self_admin_comment: string;
  medication_reviews_regular: string;
  medication_reviews_regular_comment: string;
  allergies_documented: string;
  allergies_documented_comment: string;
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

interface YesNoQuestionProps {
  label: string;
  yesNoField: string;
  commentField?: string;
  yesNoValue: string;
  commentValue?: string;
  onYesNoChange: (value: string) => void;
  onCommentChange?: (value: string) => void;
  attachments: Record<string, AttachmentItem[]>;
  onAddAttachments: (fieldName: string, files: FileList | null) => void;
  onRemoveAttachment: (fieldName: string, attachmentId: string) => void;
  onPreviewAttachment: (attachment: { url: string; name: string }) => void;
  hasError: (fieldName: string) => boolean;
  getFieldClassName: (fieldName: string, baseClassName: string) => string;
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
  hasError,
  getFieldClassName,
}) => {
  const attachmentList = attachments[yesNoField] ?? [];

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
        <div>
          <div className="flex items-start justify-between">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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
                  data-field-input={yesNoField}
                  onChange={(e) => {
                    onAddAttachments(yesNoField, e.target.files);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                <span className="text-xl font-bold">+</span>
              </label>
            </div>
          </div>
          <div className="flex gap-4" data-field={yesNoField}>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={yesNoField}
                value="Yes"
                checked={yesNoValue === 'Yes'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              Yes
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={yesNoField}
                value="No"
                checked={yesNoValue === 'No'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              No
            </label>
          </div>
          {hasError(yesNoField) && <p className="text-red-500 text-xs mt-2">This field is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue || ''}
            onChange={(e) => onCommentChange && onCommentChange(e.target.value)}
            className={
              commentField
                ? getFieldClassName(
                    commentField,
                    'w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200'
                  )
                : 'w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200'
            }
            rows={2}
            placeholder="Add any comments or observations..."
          />
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
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
                  onClick={() => onRemoveAttachment(yesNoField, att.id)}
                  title="Remove"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MedicationAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user: authUser } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');
  
  // Attachments state
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage(attachment);
  }, []);

  const [data, setData] = useState<MedicationData>({
    home: '',
    name: '',
    personCompletingAudit: '',

    medication_policy_current: '',
    medication_policy_current_comment: '',
    staff_training_competency: '',
    staff_training_competency_comment: '',
    controlled_drugs_policy: '',
    controlled_drugs_policy_comment: '',
    reporting_errors_procedure: '',
    reporting_errors_procedure_comment: '',
    policy_nice_compliant: '',
    policy_nice_compliant_comment: '',

    meds_stored_secure: '',
    meds_stored_secure_comment: '',
    cds_separate_locked: '',
    cds_separate_locked_comment: '',
    access_limited_authorised: '',
    access_limited_authorised_comment: '',
    med_fridge_lockable: '',
    med_fridge_lockable_comment: '',
    fridge_temps_recorded: '',
    fridge_temps_recorded_comment: '',

    mar_charts_legible: '',
    mar_charts_legible_comment: '',
    five_rights_followed: '',
    five_rights_followed_comment: '',
    meds_given_correct_time: '',
    meds_given_correct_time_comment: '',
    signatures_recorded: '',
    signatures_recorded_comment: '',
    residents_supported_dignified: '',
    residents_supported_dignified_comment: '',

    prn_protocols_clear: '',
    prn_protocols_clear_comment: '',
    prn_given_documented: '',
    prn_given_documented_comment: '',
    prn_effect_evaluated: '',
    prn_effect_evaluated_comment: '',
    staff_aware_prn: '',
    staff_aware_prn_comment: '',

    cds_bound_register: '',
    cds_bound_register_comment: '',
    cds_stock_balance_checked: '',
    cds_stock_balance_checked_comment: '',
    cds_two_staff_present: '',
    cds_two_staff_present_comment: '',
    cds_expired_recorded: '',
    cds_expired_recorded_comment: '',

    ordering_process_clear: '',
    ordering_process_clear_comment: '',
    deliveries_checked_recorded: '',
    deliveries_checked_recorded_comment: '',
    discrepancies_process: '',
    discrepancies_process_comment: '',
    meds_available_not_out: '',
    meds_available_not_out_comment: '',

    disposal_system_secure: '',
    disposal_system_secure_comment: '',
    disposal_records_kept: '',
    disposal_records_kept_comment: '',
    cds_disposed_witnessed: '',
    cds_disposed_witnessed_comment: '',

    covert_best_interest: '',
    covert_best_interest_comment: '',
    covert_care_plans: '',
    covert_care_plans_comment: '',
    covert_documented_monitored: '',
    covert_documented_monitored_comment: '',

    errors_documented: '',
    errors_documented_comment: '',
    learning_from_errors: '',
    learning_from_errors_comment: '',
    safeguarding_reported: '',
    safeguarding_reported_comment: '',
    staff_confident_reporting: '',
    staff_confident_reporting_comment: '',

    residents_involved_decisions: '',
    residents_involved_decisions_comment: '',
    residents_supported_self_admin: '',
    residents_supported_self_admin_comment: '',
    medication_reviews_regular: '',
    medication_reviews_regular_comment: '',
    allergies_documented: '',
    allergies_documented_comment: '',
  });

  const handleChange = (field: keyof MedicationData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  // Helpers for validation styling
  const hasError = (fieldName: string) => errors.includes(fieldName);
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return hasError(fieldName)
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
      : baseClassName;
  };

  // Collapsible sections state (match Accident/Incident style)
  const [openSections, setOpenSections] = useState<boolean[]>(() => Array(10).fill(true));
  const toggleSection = (idx: number) => setOpenSections(prev => prev.map((v, i) => (i === idx ? !v : v)));

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
        try { URL.revokeObjectURL(removed.url); } catch (e) { console.warn('Failed to revoke object URL', e); }
        createdObjectUrls.current.delete(removed.url);
      }

      if (removed.storagePath) {
        setAttachmentsToDelete(prev => [...prev, removed.storagePath as string]);
      }

      if (previewImage && previewImage.url === removed.url) {
        setPreviewImage(null);
      }

      const remaining = list.filter(a => a.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) next[fieldName] = remaining;
      else delete next[fieldName];
      return next;
    });
  };

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) throw new Error('Workspace not available for attachment upload');
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const auditDateSegment = new Date().toISOString().split('T')[0].replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId
      ? `organisations/${orgId}/workspaces/${activeWorkspace.id}`
      : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/medication/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  const validateForm = () => {
    const required: (keyof MedicationData)[] = [
      'home','name','personCompletingAudit',
      'medication_policy_current','staff_training_competency','controlled_drugs_policy','reporting_errors_procedure','policy_nice_compliant',
      'meds_stored_secure','cds_separate_locked','access_limited_authorised','med_fridge_lockable','fridge_temps_recorded',
      'mar_charts_legible','five_rights_followed','meds_given_correct_time','signatures_recorded','residents_supported_dignified',
      'prn_protocols_clear','prn_given_documented','prn_effect_evaluated','staff_aware_prn',
      'cds_bound_register','cds_stock_balance_checked','cds_two_staff_present','cds_expired_recorded',
      'ordering_process_clear','deliveries_checked_recorded','discrepancies_process','meds_available_not_out',
      'disposal_system_secure','disposal_records_kept','cds_disposed_witnessed',
      'covert_best_interest','covert_care_plans','covert_documented_monitored',
      'errors_documented','learning_from_errors','safeguarding_reported','staff_confident_reporting',
      'residents_involved_decisions','residents_supported_self_admin','medication_reviews_regular','allergies_documented'
    ];

    const missing = required.filter(f => !data[f].trim());
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

  const addNewReport = () => {
    setData({
      home: '',
      name: '',
      personCompletingAudit: '',

      medication_policy_current: '',
      medication_policy_current_comment: '',
      staff_training_competency: '',
      staff_training_competency_comment: '',
      controlled_drugs_policy: '',
      controlled_drugs_policy_comment: '',
      reporting_errors_procedure: '',
      reporting_errors_procedure_comment: '',
      policy_nice_compliant: '',
      policy_nice_compliant_comment: '',

      meds_stored_secure: '',
      meds_stored_secure_comment: '',
      cds_separate_locked: '',
      cds_separate_locked_comment: '',
      access_limited_authorised: '',
      access_limited_authorised_comment: '',
      med_fridge_lockable: '',
      med_fridge_lockable_comment: '',
      fridge_temps_recorded: '',
      fridge_temps_recorded_comment: '',

      mar_charts_legible: '',
      mar_charts_legible_comment: '',
      five_rights_followed: '',
      five_rights_followed_comment: '',
      meds_given_correct_time: '',
      meds_given_correct_time_comment: '',
      signatures_recorded: '',
      signatures_recorded_comment: '',
      residents_supported_dignified: '',
      residents_supported_dignified_comment: '',

      prn_protocols_clear: '',
      prn_protocols_clear_comment: '',
      prn_given_documented: '',
      prn_given_documented_comment: '',
      prn_effect_evaluated: '',
      prn_effect_evaluated_comment: '',
      staff_aware_prn: '',
      staff_aware_prn_comment: '',

      cds_bound_register: '',
      cds_bound_register_comment: '',
      cds_stock_balance_checked: '',
      cds_stock_balance_checked_comment: '',
      cds_two_staff_present: '',
      cds_two_staff_present_comment: '',
      cds_expired_recorded: '',
      cds_expired_recorded_comment: '',

      ordering_process_clear: '',
      ordering_process_clear_comment: '',
      deliveries_checked_recorded: '',
      deliveries_checked_recorded_comment: '',
      discrepancies_process: '',
      discrepancies_process_comment: '',
      meds_available_not_out: '',
      meds_available_not_out_comment: '',

      disposal_system_secure: '',
      disposal_system_secure_comment: '',
      disposal_records_kept: '',
      disposal_records_kept_comment: '',
      cds_disposed_witnessed: '',
      cds_disposed_witnessed_comment: '',

      covert_best_interest: '',
      covert_best_interest_comment: '',
      covert_care_plans: '',
      covert_care_plans_comment: '',
      covert_documented_monitored: '',
      covert_documented_monitored_comment: '',

      errors_documented: '',
      errors_documented_comment: '',
      learning_from_errors: '',
      learning_from_errors_comment: '',
      safeguarding_reported: '',
      safeguarding_reported_comment: '',
      staff_confident_reporting: '',
      staff_confident_reporting_comment: '',

      residents_involved_decisions: '',
      residents_involved_decisions_comment: '',
      residents_supported_self_admin: '',
      residents_supported_self_admin_comment: '',
      medication_reviews_regular: '',
      medication_reviews_regular_comment: '',
      allergies_documented: '',
      allergies_documented_comment: '',
    });

  setAttachments({});
  setAttachmentsToDelete([]);
  setPreviewImage(null);

  setErrors([]);
  };

  async function handleModalCreate(createActionPlan: boolean) {
    setShowModal(false);
    // Save audit to Firestore scoped to workspace
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }
    if (!activeWorkspace.organisationId) {
      console.warn('No organisationId found on activeWorkspace. This will cause Firestore permission errors.');
      alert('Your workspace is missing an organisation. Please contact support or try reloading.');
      return;
    }
    const workspaceId = activeWorkspace.id;
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
      if (processed.length > 0) nextAttachmentState[fieldName] = processed;
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
      createdBy: authUser?.id ?? null,
      workspaceId,
      organisationId: orgId,
      auditType: 'medication',
      yesCount: tally.yesCount,
      totalCount: tally.totalCount,
      scorePercent,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId, activeWorkspace.organisationId);
      setSavedAuditId(id);
  // update attachments state after successful save
  setAttachments(nextAttachmentState);
  setAttachmentsToDelete([]);
  setPreviewImage(null);
      try {
  await markAuditCompletedWithSnapshot(workspaceId, 'medication', payload, new Date().toISOString());
      } catch (e) {
        console.warn('Failed to complete medication audit with snapshot', e);
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to save audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  // Load existing medication audit data and attachments when the workspace changes
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      if (!activeWorkspace?.id) return;
      setAttachments({});
      setAttachmentsToDelete([]);
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'medication', undefined, activeWorkspace.organisationId || null);
        if (!existing || cancelled) return;
        const nextData: Partial<MedicationData> = {};
        (Object.keys(data) as (keyof MedicationData)[]).forEach((key) => {
          const value = existing[key];
          if (typeof value === 'string') nextData[key] = value;
        });
        setData(prev => ({ ...prev, ...nextData }));
        setFinalComments(existing.comments || existing.finalComments || '');
        setSavedAuditId(existing.auditId || existing.id || null);

        const storedAttachments = (existing as any).attachments;
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
      } catch (err) {
        console.warn('Failed to load existing medication audit', err);
      }
    };
    loadExisting();
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

  const yesNoSharedProps = {
    attachments,
    onAddAttachments: handleAddAttachments,
    onRemoveAttachment: handleRemoveAttachment,
    onPreviewAttachment: handlePreviewAttachment,
    getFieldClassName,
    hasError,
  };

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

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Medication Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive audit to check medication management and safety. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
                  <Input
                    type="text"
                    name="home"
                    data-field="home"
                    className={getFieldClassName('home', "w-full")}
                    value={data.home}
                    onChange={(e) => handleChange('home', e.target.value)}
                    placeholder="Enter care home name"
                  />
                  {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Name</label>
                  <Input
                    type="text"
                    name="name"
                    data-field="name"
                    className={getFieldClassName('name', "w-full")}
                    value={data.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter home name"
                  />
                  {hasError('name') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
                  <Input
                    type="text"
                    name="personCompletingAudit"
                    data-field="personCompletingAudit"
                    className={getFieldClassName('personCompletingAudit', "w-full")}
                    value={data.personCompletingAudit}
                    onChange={(e) => handleChange('personCompletingAudit', e.target.value)}
                    placeholder="Full name and position"
                  />
                  {hasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              <strong>Sections:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Policies and Procedures</li>
                <li>Storage of Medication</li>
                <li>Medication Administration</li>
                <li>PRN, Controlled Drugs, Ordering & Disposal</li>
                <li>Errors, Resident-Centred Practice</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={addNewReport} className="px-3 py-2">New Report</Button>
              <div className="px-3 py-2 bg-slate-100 rounded-lg">Report {currentReport} / {totalReports}</div>
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            {/* Audit information moved to the left sticky panel to keep a consistent layout across audits */}

            <div className="space-y-6">
              {/* Section 0: Policies and Procedures */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(0)}
                >
                  <span>1. Policies and Procedures</span>
                  {openSections[0] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[0] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Is there a current, up-to-date medication policy in place?" yesNoField="medication_policy_current" commentField="medication_policy_current_comment" yesNoValue={data.medication_policy_current} commentValue={data.medication_policy_current_comment} onYesNoChange={(val: string) => handleChange('medication_policy_current', val)} onCommentChange={(val: string) => handleChange('medication_policy_current_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Do all staff administering medication have appropriate training and competency assessments?" yesNoField="staff_training_competency" commentField="staff_training_competency_comment" yesNoValue={data.staff_training_competency} commentValue={data.staff_training_competency_comment} onYesNoChange={(val: string) => handleChange('staff_training_competency', val)} onCommentChange={(val: string) => handleChange('staff_training_competency_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are policies followed regarding the handling of controlled drugs?" yesNoField="controlled_drugs_policy" commentField="controlled_drugs_policy_comment" yesNoValue={data.controlled_drugs_policy} commentValue={data.controlled_drugs_policy_comment} onYesNoChange={(val: string) => handleChange('controlled_drugs_policy', val)} onCommentChange={(val: string) => handleChange('controlled_drugs_policy_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is there a procedure in place for reporting medication errors or near misses?" yesNoField="reporting_errors_procedure" commentField="reporting_errors_procedure_comment" yesNoValue={data.reporting_errors_procedure} commentValue={data.reporting_errors_procedure_comment} onYesNoChange={(val: string) => handleChange('reporting_errors_procedure', val)} onCommentChange={(val: string) => handleChange('reporting_errors_procedure_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is the home's policy compliant with NICE guidelines?" yesNoField="policy_nice_compliant" commentField="policy_nice_compliant_comment" yesNoValue={data.policy_nice_compliant} commentValue={data.policy_nice_compliant_comment} onYesNoChange={(val: string) => handleChange('policy_nice_compliant', val)} onCommentChange={(val: string) => handleChange('policy_nice_compliant_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1: Storage of Medication */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(1)}>
                  <span>2. Storage of Medication</span>
                  {openSections[1] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[1] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Are medications stored securely in a locked cabinet or trolley?" yesNoField="meds_stored_secure" commentField="meds_stored_secure_comment" yesNoValue={data.meds_stored_secure} commentValue={data.meds_stored_secure_comment} onYesNoChange={(val: string) => handleChange('meds_stored_secure', val)} onCommentChange={(val: string) => handleChange('meds_stored_secure_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are controlled drugs stored in a separate locked cabinet (as per legal requirements)?" yesNoField="cds_separate_locked" commentField="cds_separate_locked_comment" yesNoValue={data.cds_separate_locked} commentValue={data.cds_separate_locked_comment} onYesNoChange={(val: string) => handleChange('cds_separate_locked', val)} onCommentChange={(val: string) => handleChange('cds_separate_locked_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is access to medication limited to authorised, trained staff only?" yesNoField="access_limited_authorised" commentField="access_limited_authorised_comment" yesNoValue={data.access_limited_authorised} commentValue={data.access_limited_authorised_comment} onYesNoChange={(val: string) => handleChange('access_limited_authorised', val)} onCommentChange={(val: string) => handleChange('access_limited_authorised_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is the medication fridge lockable, clean, and within correct temperature range (2–8°C)?" yesNoField="med_fridge_lockable" commentField="med_fridge_lockable_comment" yesNoValue={data.med_fridge_lockable} commentValue={data.med_fridge_lockable_comment} onYesNoChange={(val: string) => handleChange('med_fridge_lockable', val)} onCommentChange={(val: string) => handleChange('med_fridge_lockable_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are fridge temperatures recorded daily and actions taken if outside range?" yesNoField="fridge_temps_recorded" commentField="fridge_temps_recorded_comment" yesNoValue={data.fridge_temps_recorded} commentValue={data.fridge_temps_recorded_comment} onYesNoChange={(val: string) => handleChange('fridge_temps_recorded', val)} onCommentChange={(val: string) => handleChange('fridge_temps_recorded_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Medication Administration */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(2)}>
                  <span>3. Medication Administration</span>
                  {openSections[2] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[2] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Are Medication Administration Records (MAR charts) completed accurately and legibly?" yesNoField="mar_charts_legible" commentField="mar_charts_legible_comment" yesNoValue={data.mar_charts_legible} commentValue={data.mar_charts_legible_comment} onYesNoChange={(val: string) => handleChange('mar_charts_legible', val)} onCommentChange={(val: string) => handleChange('mar_charts_legible_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are staff observed following the 5 rights: right resident, right medication, right dose,right time, right route?" yesNoField="five_rights_followed" commentField="five_rights_followed_comment" yesNoValue={data.five_rights_followed} commentValue={data.five_rights_followed_comment} onYesNoChange={(val: string) => handleChange('five_rights_followed', val)} onCommentChange={(val: string) => handleChange('five_rights_followed_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are medications administered at the correct times and not missed without reason?" yesNoField="meds_given_correct_time" commentField="meds_given_correct_time_comment" yesNoValue={data.meds_given_correct_time} commentValue={data.meds_given_correct_time_comment} onYesNoChange={(val: string) => handleChange('meds_given_correct_time', val)} onCommentChange={(val: string) => handleChange('meds_given_correct_time_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are staff signatures and initials correctly recorded on MAR charts?" yesNoField="signatures_recorded" commentField="signatures_recorded_comment" yesNoValue={data.signatures_recorded} commentValue={data.signatures_recorded_comment} onYesNoChange={(val: string) => handleChange('signatures_recorded', val)} onCommentChange={(val: string) => handleChange('signatures_recorded_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are residents supported to take their medication in a dignified and appropriate manner?" yesNoField="residents_supported_dignified" commentField="residents_supported_dignified_comment" yesNoValue={data.residents_supported_dignified} commentValue={data.residents_supported_dignified_comment} onYesNoChange={(val: string) => handleChange('residents_supported_dignified', val)} onCommentChange={(val: string) => handleChange('residents_supported_dignified_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: PRN (As Required) Medication */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(3)}>
                  <span>4. PRN (As Required) Medication</span>
                  {openSections[3] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[3] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Is there a clear protocol  for each PRN medication?" yesNoField="prn_protocols_clear" commentField="prn_protocols_clear_comment" yesNoValue={data.prn_protocols_clear} commentValue={data.prn_protocols_clear_comment} onYesNoChange={(val: string) => handleChange('prn_protocols_clear', val)} onCommentChange={(val: string) => handleChange('prn_protocols_clear_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are PRN medications only given when clinically indicated and documented?" yesNoField="prn_given_documented" commentField="prn_given_documented_comment" yesNoValue={data.prn_given_documented} commentValue={data.prn_given_documented_comment} onYesNoChange={(val: string) => handleChange('prn_given_documented', val)} onCommentChange={(val: string) => handleChange('prn_given_documented_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is the effect of PRN medication evaluated and recorded?" yesNoField="prn_effect_evaluated" commentField="prn_effect_evaluated_comment" yesNoValue={data.prn_effect_evaluated} commentValue={data.prn_effect_evaluated_comment} onYesNoChange={(val: string) => handleChange('prn_effect_evaluated', val)} onCommentChange={(val: string) => handleChange('prn_effect_evaluated_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are staff aware of when and how to administer PRNs?" yesNoField="staff_aware_prn" commentField="staff_aware_prn_comment" yesNoValue={data.staff_aware_prn} commentValue={data.staff_aware_prn_comment} onYesNoChange={(val: string) => handleChange('staff_aware_prn', val)} onCommentChange={(val: string) => handleChange('staff_aware_prn_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Controlled Drugs */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(4)}>
                  <span>5. Controlled Drugs</span>
                  {openSections[4] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[4] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Are controlled drugs recorded in a bound register with all required entries?" yesNoField="cds_bound_register" commentField="cds_bound_register_comment" yesNoValue={data.cds_bound_register} commentValue={data.cds_bound_register_comment} onYesNoChange={(val: string) => handleChange('cds_bound_register', val)} onCommentChange={(val: string) => handleChange('cds_bound_register_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is stock balance of controlled drugs checked and accurate?" yesNoField="cds_stock_balance_checked" commentField="cds_stock_balance_checked_comment" yesNoValue={data.cds_stock_balance_checked} commentValue={data.cds_stock_balance_checked_comment} onYesNoChange={(val: string) => handleChange('cds_stock_balance_checked', val)} onCommentChange={(val: string) => handleChange('cds_stock_balance_checked_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are two trained staff present when administering controlled drugs?" yesNoField="cds_two_staff_present" commentField="cds_two_staff_present_comment" yesNoValue={data.cds_two_staff_present} commentValue={data.cds_two_staff_present_comment} onYesNoChange={(val: string) => handleChange('cds_two_staff_present', val)} onCommentChange={(val: string) => handleChange('cds_two_staff_present_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are expired or discontinued controlled drugs recorded and stored appropriately for disposal?" yesNoField="cds_expired_recorded" commentField="cds_expired_recorded_comment" yesNoValue={data.cds_expired_recorded} commentValue={data.cds_expired_recorded_comment} onYesNoChange={(val: string) => handleChange('cds_expired_recorded', val)} onCommentChange={(val: string) => handleChange('cds_expired_recorded_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Ordering and Supply */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(5)}>
                  <span>6. Ordering and Supply</span>
                  {openSections[5] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[5] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Is there a clear process for ordering medication in a timely manner?" yesNoField="ordering_process_clear" commentField="ordering_process_clear_comment" yesNoValue={data.ordering_process_clear} commentValue={data.ordering_process_clear_comment} onYesNoChange={(val: string) => handleChange('ordering_process_clear', val)} onCommentChange={(val: string) => handleChange('ordering_process_clear_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are medication deliveries checked and recorded by staff?" yesNoField="deliveries_checked_recorded" commentField="deliveries_checked_recorded_comment" yesNoValue={data.deliveries_checked_recorded} commentValue={data.deliveries_checked_recorded_comment} onYesNoChange={(val: string) => handleChange('deliveries_checked_recorded', val)} onCommentChange={(val: string) => handleChange('deliveries_checked_recorded_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is there a process for handling discrepancies in orders?" yesNoField="discrepancies_process" commentField="discrepancies_process_comment" yesNoValue={data.discrepancies_process} commentValue={data.discrepancies_process_comment} onYesNoChange={(val: string) => handleChange('discrepancies_process', val)} onCommentChange={(val: string) => handleChange('discrepancies_process_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are residents' medications available and not out of stock?" yesNoField="meds_available_not_out" commentField="meds_available_not_out_comment" yesNoValue={data.meds_available_not_out} commentValue={data.meds_available_not_out_comment} onYesNoChange={(val: string) => handleChange('meds_available_not_out', val)} onCommentChange={(val: string) => handleChange('meds_available_not_out_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Disposal of Medication */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(6)}>
                  <span>7. Disposal of Medication</span>
                  {openSections[6] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[6] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Is there a secure system for disposing of unwanted or expired medication?" yesNoField="disposal_system_secure" commentField="disposal_system_secure_comment" yesNoValue={data.disposal_system_secure} commentValue={data.disposal_system_secure_comment} onYesNoChange={(val: string) => handleChange('disposal_system_secure', val)} onCommentChange={(val: string) => handleChange('disposal_system_secure_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are records kept of medication returned to pharmacy or disposed of?" yesNoField="disposal_records_kept" commentField="disposal_records_kept_comment" yesNoValue={data.disposal_records_kept} commentValue={data.disposal_records_kept_comment} onYesNoChange={(val: string) => handleChange('disposal_records_kept', val)} onCommentChange={(val: string) => handleChange('disposal_records_kept_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are controlled drugs disposed of with witness signatures as per regulation?" yesNoField="cds_disposed_witnessed" commentField="cds_disposed_witnessed_comment" yesNoValue={data.cds_disposed_witnessed} commentValue={data.cds_disposed_witnessed_comment} onYesNoChange={(val: string) => handleChange('cds_disposed_witnessed', val)} onCommentChange={(val: string) => handleChange('cds_disposed_witnessed_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 7: Covert Medication */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(7)}>
                  <span>8. Covert Medication (If Applicable)</span>
                  {openSections[7] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[7] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Is covert administration supported by a best interest decision and GP approval?" yesNoField="covert_best_interest" commentField="covert_best_interest_comment" yesNoValue={data.covert_best_interest} commentValue={data.covert_best_interest_comment} onYesNoChange={(val: string) => handleChange('covert_best_interest', val)} onCommentChange={(val: string) => handleChange('covert_best_interest_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are covert care plans and risk assessments in place and reviewed regularly?" yesNoField="covert_care_plans" commentField="covert_care_plans_comment" yesNoValue={data.covert_care_plans} commentValue={data.covert_care_plans_comment} onYesNoChange={(val: string) => handleChange('covert_care_plans', val)} onCommentChange={(val: string) => handleChange('covert_care_plans_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is covert administration clearly documented and monitored?" yesNoField="covert_documented_monitored" commentField="covert_documented_monitored_comment" yesNoValue={data.covert_documented_monitored} commentValue={data.covert_documented_monitored_comment} onYesNoChange={(val: string) => handleChange('covert_documented_monitored', val)} onCommentChange={(val: string) => handleChange('covert_documented_monitored_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 8: Errors and Incident Reporting */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(8)}>
                  <span>9. Medication Errors and Incident Reporting</span>
                  {openSections[8] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[8] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Are all medication errors or near misses documented and investigated?" yesNoField="errors_documented" commentField="errors_documented_comment" yesNoValue={data.errors_documented} commentValue={data.errors_documented_comment} onYesNoChange={(val: string) => handleChange('errors_documented', val)} onCommentChange={(val: string) => handleChange('errors_documented_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Is there evidence of learning from errors and actions taken?" yesNoField="learning_from_errors" commentField="learning_from_errors_comment" yesNoValue={data.learning_from_errors} commentValue={data.learning_from_errors_comment} onYesNoChange={(val: string) => handleChange('learning_from_errors', val)} onCommentChange={(val: string) => handleChange('learning_from_errors_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are safeguarding concerns reported where necessary?" yesNoField="safeguarding_reported" commentField="safeguarding_reported_comment" yesNoValue={data.safeguarding_reported} commentValue={data.safeguarding_reported_comment} onYesNoChange={(val: string) => handleChange('safeguarding_reported', val)} onCommentChange={(val: string) => handleChange('safeguarding_reported_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are staff confident in the procedure for reporting errors?" yesNoField="staff_confident_reporting" commentField="staff_confident_reporting_comment" yesNoValue={data.staff_confident_reporting} commentValue={data.staff_confident_reporting_comment} onYesNoChange={(val: string) => handleChange('staff_confident_reporting', val)} onCommentChange={(val: string) => handleChange('staff_confident_reporting_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 9: Resident-Centred Practice */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button type="button" className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors" onClick={() => toggleSection(9)}>
                  <span>10. Resident-Centred Practice</span>
                  {openSections[9] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {openSections[9] && (
                  <div className="px-8 pb-8">
                    <div className="space-y-4">
                      <YesNoQuestion label="Are residents involved in decisions about their medication?" yesNoField="residents_involved_decisions" commentField="residents_involved_decisions_comment" yesNoValue={data.residents_involved_decisions} commentValue={data.residents_involved_decisions_comment} onYesNoChange={(val: string) => handleChange('residents_involved_decisions', val)} onCommentChange={(val: string) => handleChange('residents_involved_decisions_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are residents supported to self-administer where appropriate?" yesNoField="residents_supported_self_admin" commentField="residents_supported_self_admin_comment" yesNoValue={data.residents_supported_self_admin} commentValue={data.residents_supported_self_admin_comment} onYesNoChange={(val: string) => handleChange('residents_supported_self_admin', val)} onCommentChange={(val: string) => handleChange('residents_supported_self_admin_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are medication reviews carried out regularly (e.g. with GP, pharmacist)?" yesNoField="medication_reviews_regular" commentField="medication_reviews_regular_comment" yesNoValue={data.medication_reviews_regular} commentValue={data.medication_reviews_regular_comment} onYesNoChange={(val: string) => handleChange('medication_reviews_regular', val)} onCommentChange={(val: string) => handleChange('medication_reviews_regular_comment', val)} {...yesNoSharedProps} />
                      <YesNoQuestion label="Are allergies clearly documented and highlighted?" yesNoField="allergies_documented" commentField="allergies_documented_comment" yesNoValue={data.allergies_documented} commentValue={data.allergies_documented_comment} onYesNoChange={(val: string) => handleChange('allergies_documented', val)} onCommentChange={(val: string) => handleChange('allergies_documented_comment', val)} {...yesNoSharedProps} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-8">
                <Button type="submit" className="w-full h-14 text-lg font-bold mt-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 disabled:opacity-60" disabled={saving}>
                  {saving ? 'Saving...' : 'Complete Audit'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Final comments area */}
      <div className="max-w-4xl mx-auto p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
        <Textarea
          name="finalComments"
          value={finalComments}
          onChange={(e) => setFinalComments(e.target.value)}
          placeholder="Any additional comments or observations..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 h-28"
        />
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
