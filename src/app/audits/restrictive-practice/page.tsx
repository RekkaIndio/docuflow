"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface RestrictivePracticeData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // 1 Policy and Awareness
  policy_in_place_accessible: string;
  policy_in_place_accessible_comment: string;
  staff_recognise_restrictive_practice: string;
  staff_recognise_restrictive_practice_comment: string;
  staff_aware_legal_ethical: string;
  staff_aware_legal_ethical_comment: string;
  recording_review_process: string;
  recording_review_process_comment: string;

  // 2 Resident Choice and Autonomy
  residents_supported_choice: string;
  residents_supported_choice_comment: string;
  restrictions_based_on_risk_assessment: string;
  restrictions_based_on_risk_assessment_comment: string;
  residents_express_preferences: string;
  residents_express_preferences_comment: string;
  residents_enabled_access_all_parts: string;
  residents_enabled_access_all_parts_comment: string;

  // 3 Documentation and Consent
  restrictive_practices_in_care_plan: string;
  restrictive_practices_in_care_plan_comment: string;
  mental_capacity_assessment_completed: string;
  mental_capacity_assessment_completed_comment: string;
  best_interest_recorded: string;
  best_interest_recorded_comment: string;
  family_advocate_lpa_involved: string;
  family_advocate_lpa_involved_comment: string;

  // 4 Physical and Environmental Restrictions
  bedrails_risk_assessed_and_consented: string;
  bedrails_risk_assessed_and_consented_comment: string;
  sensor_mats_alarms_proportionate: string;
  sensor_mats_alarms_proportionate_comment: string;
  locked_doors_risk_assessed: string;
  locked_doors_risk_assessed_comment: string;
  mobility_aids_restricted_justified: string;
  mobility_aids_restricted_justified_comment: string;

  // 5 Psychological or Social Restrictions
  free_to_associate_without_pressure: string;
  free_to_associate_without_pressure_comment: string;
  one_to_one_supervision_documented: string;
  one_to_one_supervision_documented_comment: string;
  staff_avoiding_overly_controlling_language: string;
  staff_avoiding_overly_controlling_language_comment: string;
  routines_led_by_preference: string;
  routines_led_by_preference_comment: string;

  // 6 Food, Drink, and Medication
  food_drink_choices_unrestricted: string;
  food_drink_choices_unrestricted_comment: string;
  diet_restrictions_documented: string;
  diet_restrictions_documented_comment: string;
  covert_medication_legal_safeguards: string;
  covert_medication_legal_safeguards_comment: string;
  residents_supported_self_admin_med: string;
  residents_supported_self_admin_med_comment: string;

  // 7 Monitoring and Review
  restrictive_practices_reviewed_regularly: string;
  restrictive_practices_reviewed_regularly_comment: string;
  records_show_reduction_efforts: string;
  records_show_reduction_efforts_comment: string;
  dols_applications_where_required: string;
  dols_applications_where_required_comment: string;
  least_restrictive_option_evidence: string;
  least_restrictive_option_evidence_comment: string;

  // 8 Staff Practice and Culture
  staff_promote_independence: string;
  staff_promote_independence_comment: string;
  staff_understand_safety_freedom_balance: string;
  staff_understand_safety_freedom_balance_comment: string;
  restrictions_challenged_escalated: string;
  restrictions_challenged_escalated_comment: string;
  staff_reflect_on_control_use: string;
  staff_reflect_on_control_use_comment: string;
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
  yesNoField: keyof RestrictivePracticeData;
  commentField: keyof RestrictivePracticeData;
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
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200" data-field={fieldKey}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex gap-4">
                {['Yes', 'No', 'N/A'].map((option) => (
                  <label key={option} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={fieldKey}
                      value={option}
                      checked={yesNoValue === option}
                      onChange={(e) => onYesNoChange(e.target.value)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
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
          {isFieldInvalid(fieldKey) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
            rows={2}
            placeholder="Add any comments or observations..."
            data-comment-field={commentKey}
          />
        </div>
        {attachmentList.length > 0 && (
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
                    type="button"
                    onClick={() => onRemoveAttachment(fieldKey, att.id)}
                    title="Remove"
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RestrictivePracticeAuditPage() {
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

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'policy-awareness': true,
    'resident-choice': false,
    'documentation-consent': false,
    'physical-environmental': false,
    'psychological-social': false,
    'food-medication': false,
    'monitoring-review': false,
    'staff-practice': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'policy-awareness',
      title: 'Policy and Awareness',
      color: 'green',
      guidance: 'Review the existence and accessibility of restrictive practice policies, staff training on recognition of restrictive practices, and understanding of legal/ethical principles.',
      questions: [
        { field: 'policy_in_place_accessible', label: 'Is there a restrictive practice policy in place and accessible to staff?' },
        { field: 'staff_recognise_restrictive_practice', label: 'Are staff trained to recognise what constitutes a restrictive practice (including less obvious forms)?' },
        { field: 'staff_aware_legal_ethical', label: 'Are staff aware of the legal and ethical principles related to least restrictive care?' },
        { field: 'recording_review_process', label: 'Is there a clear process for recording and reviewing any restrictive practice in use?' },
      ]
    },
    {
      id: 'resident-choice',
      title: 'Resident Choice and Autonomy',
      color: 'yellow',
      guidance: 'Assess how residents are supported to make choices and whether any restrictions are based on proper risk assessments.',
      questions: [
        { field: 'residents_supported_choice', label: 'Are residents supported to make everyday choices (e.g. meals, clothes, routine)?' },
        { field: 'restrictions_based_on_risk_assessment', label: 'Are restrictions (e.g. locked doors, alarms, limited access) based on individual risk assessments?' },
        { field: 'residents_express_preferences', label: 'Are residents given the opportunity to express their preferences and views?' },
        { field: 'residents_enabled_access_all_parts', label: 'Are residents encouraged and enabled to access all parts of the home safely?' },
      ]
    },
    {
      id: 'documentation-consent',
      title: 'Documentation and Consent',
      color: 'pink',
      guidance: 'Check that all restrictive practices are properly documented, mental capacity assessments are completed, and appropriate consent processes are followed.',
      questions: [
        { field: 'restrictive_practices_in_care_plan', label: 'Are all restrictive practices documented in the care plan?' },
        { field: 'mental_capacity_assessment_completed', label: 'Has a mental capacity assessment been completed where relevant?' },
        { field: 'best_interest_recorded', label: 'If the resident lacks capacity, has a best interest decision been recorded?' },
        { field: 'family_advocate_lpa_involved', label: 'Is there evidence of family, advocate, or LPA involvement in the decision-making process?' },
      ]
    },
    {
      id: 'physical-environmental',
      title: 'Physical and Environmental Restrictions',
      color: 'emerald',
      guidance: 'Evaluate the use of physical restraints and environmental controls to ensure they are risk-assessed, consented to, and used proportionately.',
      questions: [
        { field: 'bedrails_risk_assessed_and_consented', label: 'Are bedrails used only following a risk assessment and with consent or best interest decisions?' },
        { field: 'sensor_mats_alarms_proportionate', label: 'Are sensor mats, door alarms, or movement alerts used appropriately and proportionately?' },
        { field: 'locked_doors_risk_assessed', label: 'Are locked doors or exits risk-assessed and used only to keep individuals or others safe?' },
        { field: 'mobility_aids_restricted_justified', label: 'Are any mobility aids or walking equipment removed or restricted without proper justification?' },
      ]
    },
    {
      id: 'psychological-social',
      title: 'Psychological or Social Restrictions',
      color: 'rose',
      guidance: 'Assess psychological and social restrictions including supervision levels, communication styles, and resident-led routines.',
      questions: [
        { field: 'free_to_associate_without_pressure', label: 'Are residents free to associate, engage, or withdraw without pressure?' },
        { field: 'one_to_one_supervision_documented', label: 'Is 1:1 supervision used appropriately and documented?' },
        { field: 'staff_avoiding_overly_controlling_language', label: 'Are staff avoiding language or behaviour that is overly controlling or directive?' },
        { field: 'routines_led_by_preference', label: 'Are residents\' routines led by personal preference rather than staff convenience?' },
      ]
    },
    {
      id: 'food-medication',
      title: 'Food, Drink, and Medication',
      color: 'sky',
      guidance: 'Review restrictions on food/drink choices and medication administration to ensure they are clinically justified and properly documented.',
      questions: [
        { field: 'food_drink_choices_unrestricted', label: 'Are food and drink choices unrestricted unless clinically indicated?' },
        { field: 'diet_restrictions_documented', label: 'Are decisions to restrict diet (e.g. choking risks, diabetes) documented and agreed upon?' },
        { field: 'covert_medication_legal_safeguards', label: 'Are covert medication or controlled access to medication only used with proper legal safeguards?' },
        { field: 'residents_supported_self_admin_med', label: 'Are residents supported to self-administer medication where safe and appropriate?' },
      ]
    },
    {
      id: 'monitoring-review',
      title: 'Monitoring and Review',
      color: 'lime',
      guidance: 'Check that restrictive practices are regularly reviewed, efforts are made to reduce restrictions, and legal safeguards are in place.',
      questions: [
        { field: 'restrictive_practices_reviewed_regularly', label: 'Is each restrictive practice reviewed regularly for ongoing need?' },
        { field: 'records_show_reduction_efforts', label: 'Are there clear records showing efforts to reduce or remove restrictions?' },
        { field: 'dols_applications_where_required', label: 'Are Deprivation of Liberty Safeguards (DoLS) applications in place where required?' },
        { field: 'least_restrictive_option_evidence', label: 'Is there evidence that restrictive practices are the least restrictive option available?' },
      ]
    },
    {
      id: 'staff-practice',
      title: 'Staff Practice and Culture',
      color: 'violet',
      guidance: 'Evaluate staff understanding of restrictive practices, promotion of independence, and ability to challenge unnecessary restrictions.',
      questions: [
        { field: 'staff_promote_independence', label: 'Do staff promote independence and autonomy in daily care?' },
        { field: 'staff_understand_safety_freedom_balance', label: 'Do staff understand the balance between safety and freedom?' },
        { field: 'restrictions_challenged_escalated', label: 'Are restrictions challenged or escalated when no longer needed?' },
        { field: 'staff_reflect_on_control_use', label: 'Are staff able to reflect on their own use of control or limitation?' },
      ]
    },
  ];

  const [data, setData] = useState<RestrictivePracticeData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    policy_in_place_accessible: '',
    policy_in_place_accessible_comment: '',
    staff_recognise_restrictive_practice: '',
    staff_recognise_restrictive_practice_comment: '',
    staff_aware_legal_ethical: '',
    staff_aware_legal_ethical_comment: '',
    recording_review_process: '',
    recording_review_process_comment: '',

    residents_supported_choice: '',
    residents_supported_choice_comment: '',
    restrictions_based_on_risk_assessment: '',
    restrictions_based_on_risk_assessment_comment: '',
    residents_express_preferences: '',
    residents_express_preferences_comment: '',
    residents_enabled_access_all_parts: '',
    residents_enabled_access_all_parts_comment: '',

    restrictive_practices_in_care_plan: '',
    restrictive_practices_in_care_plan_comment: '',
    mental_capacity_assessment_completed: '',
    mental_capacity_assessment_completed_comment: '',
    best_interest_recorded: '',
    best_interest_recorded_comment: '',
    family_advocate_lpa_involved: '',
    family_advocate_lpa_involved_comment: '',

    bedrails_risk_assessed_and_consented: '',
    bedrails_risk_assessed_and_consented_comment: '',
    sensor_mats_alarms_proportionate: '',
    sensor_mats_alarms_proportionate_comment: '',
    locked_doors_risk_assessed: '',
    locked_doors_risk_assessed_comment: '',
    mobility_aids_restricted_justified: '',
    mobility_aids_restricted_justified_comment: '',

    free_to_associate_without_pressure: '',
    free_to_associate_without_pressure_comment: '',
    one_to_one_supervision_documented: '',
    one_to_one_supervision_documented_comment: '',
    staff_avoiding_overly_controlling_language: '',
    staff_avoiding_overly_controlling_language_comment: '',
    routines_led_by_preference: '',
    routines_led_by_preference_comment: '',

    food_drink_choices_unrestricted: '',
    food_drink_choices_unrestricted_comment: '',
    diet_restrictions_documented: '',
    diet_restrictions_documented_comment: '',
    covert_medication_legal_safeguards: '',
    covert_medication_legal_safeguards_comment: '',
    residents_supported_self_admin_med: '',
    residents_supported_self_admin_med_comment: '',

    restrictive_practices_reviewed_regularly: '',
    restrictive_practices_reviewed_regularly_comment: '',
    records_show_reduction_efforts: '',
    records_show_reduction_efforts_comment: '',
    dols_applications_where_required: '',
    dols_applications_where_required_comment: '',
    least_restrictive_option_evidence: '',
    least_restrictive_option_evidence_comment: '',

    staff_promote_independence: '',
    staff_promote_independence_comment: '',
    staff_understand_safety_freedom_balance: '',
    staff_understand_safety_freedom_balance_comment: '',
    restrictions_challenged_escalated: '',
    restrictions_challenged_escalated_comment: '',
    staff_reflect_on_control_use: '',
    staff_reflect_on_control_use_comment: '',
  });

  // Helper functions
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const fieldHasError = useCallback((fieldName: string) => errors.includes(fieldName), [errors]);

  // Accepts base classes so callers can supply component-specific styling
  const getFieldClassName = useCallback((fieldName: string, baseClassName: string) => (
    fieldHasError(fieldName)
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
      : baseClassName
  ), [fieldHasError]);

  const handleChange = (field: keyof RestrictivePracticeData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && fieldHasError(field as string)) setErrors(prev => prev.filter(e => e !== field));
  };

  // Load existing attachments when workspace changes
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      if (!activeWorkspace?.id) return;
      setAttachments({});
      setAttachmentsToDelete([]);
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'restrictive-practice', undefined, activeWorkspace.organisationId || null);
        if (!existing) return;
        const { attachments: storedAttachments, comments, ...formData } = existing as any;
        if (!cancelled && formData) setData(prev => ({ ...prev, ...formData }));
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
      } catch (err) {
        console.error('Failed to load existing restrictive-practice audit data:', err);
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
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? (crypto as any).randomUUID()
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
        try { URL.revokeObjectURL(removed.url); } catch (e) { /* ignore */ }
        createdObjectUrls.current.delete(removed.url);
      }

      if (removed.storagePath) {
        setAttachmentsToDelete(prevDeletes => [...prevDeletes, removed.storagePath as string]);
      }

      if (previewImage && previewImage.url === removed.url) setPreviewImage(null);

      const remaining = list.filter(a => a.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) next[fieldName] = remaining; else delete next[fieldName];
      return next;
    });
  };

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage(attachment);
  }, [setPreviewImage]);

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) throw new Error('Workspace not available for attachment upload');
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (data.date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId
      ? `organisations/${orgId}/workspaces/${activeWorkspace.id}`
      : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/restrictive-practice/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  // preview keyboard close (ESC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // revoke any created object URLs on unmount
  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (err) { /* ignore */ }
      });
      createdObjectUrls.current.clear();
    };
  }, []);

  const validateForm = () => {
    const required: (keyof RestrictivePracticeData)[] = [
      'home','date','personCompletingAudit',
      'policy_in_place_accessible','staff_recognise_restrictive_practice','staff_aware_legal_ethical','recording_review_process',
      'residents_supported_choice','restrictions_based_on_risk_assessment','residents_express_preferences','residents_enabled_access_all_parts',
      'restrictive_practices_in_care_plan','mental_capacity_assessment_completed','best_interest_recorded','family_advocate_lpa_involved',
      'bedrails_risk_assessed_and_consented','sensor_mats_alarms_proportionate','locked_doors_risk_assessed','mobility_aids_restricted_justified',
      'free_to_associate_without_pressure','one_to_one_supervision_documented','staff_avoiding_overly_controlling_language','routines_led_by_preference',
      'food_drink_choices_unrestricted','diet_restrictions_documented','covert_medication_legal_safeguards','residents_supported_self_admin_med',
      'restrictive_practices_reviewed_regularly','records_show_reduction_efforts','dols_applications_where_required','least_restrictive_option_evidence',
      'staff_promote_independence','staff_understand_safety_freedom_balance','restrictions_challenged_escalated','staff_reflect_on_control_use'
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

  async function handleModalCreate(createActionPlan: boolean) {
    setShowModal(false);
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }
    const workspaceId = activeWorkspace.id;
    // compute yes/no score for restrictive practice audit
    const YES_NO_FIELDS: (keyof RestrictivePracticeData)[] = [
      'policy_in_place_accessible','staff_recognise_restrictive_practice','staff_aware_legal_ethical','recording_review_process',
      'residents_supported_choice','restrictions_based_on_risk_assessment','residents_express_preferences','residents_enabled_access_all_parts',
      'restrictive_practices_in_care_plan','mental_capacity_assessment_completed','best_interest_recorded','family_advocate_lpa_involved',
      'bedrails_risk_assessed_and_consented','sensor_mats_alarms_proportionate','locked_doors_risk_assessed','mobility_aids_restricted_justified',
      'free_to_associate_without_pressure','one_to_one_supervision_documented','staff_avoiding_overly_controlling_language','routines_led_by_preference',
      'food_drink_choices_unrestricted','diet_restrictions_documented','covert_medication_legal_safeguards','residents_supported_self_admin_med',
      'restrictive_practices_reviewed_regularly','records_show_reduction_efforts','dols_applications_where_required','least_restrictive_option_evidence',
      'staff_promote_independence','staff_understand_safety_freedom_balance','restrictions_challenged_escalated','staff_reflect_on_control_use'
    ];

    const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (data[f] === 'Yes' ? 1 : 0), 0);
    const totalCount = YES_NO_FIELDS.length;
    const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;

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
      auditType: 'restrictive-practice',
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
      scorePercent,
      yesCount,
      totalCount,
      organisationId: orgId,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId, activeWorkspace.organisationId || null);
      setSavedAuditId(id);
      try {
        const completedAt = data.date || new Date().toISOString();
        await markAuditCompletedWithSnapshot(workspaceId, 'restrictive-practice', payload, completedAt);
      } catch (e) {
        console.warn('Failed to complete restrictive-practice audit with snapshot', e);
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
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Restrictive Practice Audit</h1>
          <p className="mb-4 text-slate-500">Comprehensive assessment of restrictive practices — ensure they are used appropriately, legally, and only as a last resort. All fields are required.</p>
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
              {fieldHasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
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
              {fieldHasError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
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
              {fieldHasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            {sections.map((section) => (
              <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
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
                    {section.guidance && (
                      <div className="mb-4 ml-0 text-sm text-slate-500">
                        <p>{section.guidance}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {section.questions.map((question) => (
                        <YesNoQuestion
                          key={question.field}
                          label={question.label}
                          yesNoField={question.field as keyof RestrictivePracticeData}
                          commentField={`${question.field}_comment` as keyof RestrictivePracticeData}
                          yesNoValue={data[question.field as keyof RestrictivePracticeData]}
                          commentValue={data[`${question.field}_comment` as keyof RestrictivePracticeData] ?? ''}
                          onYesNoChange={(value) => handleChange(question.field as keyof RestrictivePracticeData, value)}
                          onCommentChange={(value) => handleChange(`${question.field}_comment` as keyof RestrictivePracticeData, value)}
                          {...yesNoSharedProps}
                        />
                      ))}
                    </div>
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
              <button
                onClick={() => handleModalCreate(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'No'}
              </button>
              <button
                onClick={() => handleModalCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Yes, Create Action Plan'}
              </button>
              <button
                onClick={() => handleModalCreate(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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
