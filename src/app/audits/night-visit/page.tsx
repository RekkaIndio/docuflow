"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StaffSelectInput } from '@/components/audits/staff-select-input';

interface NightVisitData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // 1 Staffing and Presence
  sufficient_staff_on_duty: string;
  sufficient_staff_on_duty_comment: string;
  staff_present_visible: string;
  staff_present_visible_comment: string;
  manager_on_call_contactable: string;
  manager_on_call_contactable_comment: string;
  agency_staff_familiar: string;
  agency_staff_familiar_comment: string;
  staff_uniforms_id: string;
  staff_uniforms_id_comment: string;

  // 2 Resident Safety and Wellbeing
  residents_accounted_for: string;
  residents_accounted_for_comment: string;
  call_bells_accessible: string;
  call_bells_accessible_comment: string;
  residents_checked_regularly: string;
  residents_checked_regularly_comment: string;
  residents_awake_distressed_supported: string;
  residents_awake_distressed_supported_comment: string;
  bedrails_crash_mats_used_correctly: string;
  bedrails_crash_mats_used_correctly_comment: string;

  // 3 Environment and Security
  external_doors_locked: string;
  external_doors_locked_comment: string;
  fire_exits_clear: string;
  fire_exits_clear_comment: string;
  corridors_free_of_trip_hazards: string;
  corridors_free_of_trip_hazards_comment: string;
  lighting_sufficient: string;
  lighting_sufficient_comment: string;
  temperature_comfortable: string;
  temperature_comfortable_comment: string;

  // 4 Medication and Clinical Care
  night_meds_stored_secure: string;
  night_meds_stored_secure_comment: string;
  mar_chart_up_to_date: string;
  mar_chart_up_to_date_comment: string;
  cds_stored_recorded: string;
  cds_stored_recorded_comment: string;
  wound_dressings_documented: string;
  wound_dressings_documented_comment: string;

  // 5 Infection Control and Hygiene
  hand_hygiene_ppe_followed: string;
  hand_hygiene_ppe_followed_comment: string;
  ppe_available: string;
  ppe_available_comment: string;
  home_clean_odour_free: string;
  home_clean_odour_free_comment: string;
  continence_aids_stored_correct: string;
  continence_aids_stored_correct_comment: string;

  // 6 Food, Fluids and Kitchen
  drinks_snacks_available: string;
  drinks_snacks_available_comment: string;
  kitchen_clean_tidy: string;
  kitchen_clean_tidy_comment: string;
  food_hygiene_followed: string;
  food_hygiene_followed_comment: string;

  // 7 Record Keeping and Handover
  care_notes_up_to_date: string;
  care_notes_up_to_date_comment: string;
  monitoring_docs_completed: string;
  monitoring_docs_completed_comment: string;
  handover_documented: string;
  handover_documented_comment: string;
  incidents_recorded: string;
  incidents_recorded_comment: string;

  // 8 Staff Conduct and Morale
  staff_alert_professional: string;
  staff_alert_professional_comment: string;
  staff_breaks_taken: string;
  staff_breaks_taken_comment: string;
  staff_supported_safe: string;
  staff_supported_safe_comment: string;
  staff_aware_emergency_procedures: string;
  staff_aware_emergency_procedures_comment: string;

  // 9 Maintenance and Equipment
  equipment_stored_good_working: string;
  equipment_stored_good_working_comment: string;
  nurse_call_systems_functioning: string;
  nurse_call_systems_functioning_comment: string;
  maintenance_issues_reported: string;
  maintenance_issues_reported_comment: string;

  // 10 General Observations
  residents_out_of_bed_discomfort: string;
  residents_out_of_bed_discomfort_comment: string;
  lights_tvs_noise_disruptive: string;
  lights_tvs_noise_disruptive_comment: string;
  safeguarding_concerns_observed: string;
  safeguarding_concerns_observed_comment: string;
  atmosphere_calm_safe: string;
  atmosphere_calm_safe_comment: string;
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

export default function NightVisitAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Attachments state (types declared above)
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');

  const sections = [
    {
      title: "1. Staffing and Presence",
      guidance: [
        "Verify adequate staffing levels, staff visibility, and proper identification during night visits."
      ],
      questions: [
        { label: "Are sufficient staff on duty according to the rota and resident dependency levels?", yesNoField: "sufficient_staff_on_duty" },
        { label: "Are staff present and visible in appropriate areas?", yesNoField: "staff_present_visible" },
        { label: "Is the manager-on-call contactable and known to night staff?", yesNoField: "manager_on_call_contactable" },
        { label: "Are agency staff (if used) familiar with residents and procedures?", yesNoField: "agency_staff_familiar" },
        { label: "Are staff wearing correct uniforms and identification?", yesNoField: "staff_uniforms_id" }
      ]
    },
    {
      title: "2. Resident Safety and Wellbeing",
      guidance: [
        "Assess resident safety measures, monitoring procedures, and support for residents during night hours."
      ],
      questions: [
        { label: "Are all residents accounted for?", yesNoField: "residents_accounted_for" },
        { label: "Are call bells accessible and working?", yesNoField: "call_bells_accessible" },
        { label: "Are residents checked regularly and response times appropriate?", yesNoField: "residents_checked_regularly" },
        { label: "Are awake/distressed residents supported appropriately?", yesNoField: "residents_awake_distressed_supported" },
        { label: "Are bedrails/crash mats used correctly where required?", yesNoField: "bedrails_crash_mats_used_correctly" }
      ]
    },
    {
      title: "3. Environment and Security",
      guidance: [
        "Check security measures, fire safety, and environmental conditions during night visits."
      ],
      questions: [
        { label: "Are external doors locked and secure?", yesNoField: "external_doors_locked" },
        { label: "Are fire exits clear and accessible?", yesNoField: "fire_exits_clear" },
        { label: "Are corridors free of trip hazards?", yesNoField: "corridors_free_of_trip_hazards" },
        { label: "Is lighting sufficient for safe movement?", yesNoField: "lighting_sufficient" },
        { label: "Is the temperature comfortable?", yesNoField: "temperature_comfortable" }
      ]
    },
    {
      title: "4. Medication and Clinical Care",
      guidance: [
        "Verify medication storage, administration records, and clinical care procedures during night shifts."
      ],
      questions: [
        { label: "Are night medications stored securely?", yesNoField: "night_meds_stored_secure" },
        { label: "Are MAR charts up to date for administered medications?", yesNoField: "mar_chart_up_to_date" },
        { label: "Are controlled drugs stored and recorded correctly?", yesNoField: "cds_stored_recorded" },
        { label: "Are wound dressings documented and appropriate?", yesNoField: "wound_dressings_documented" }
      ]
    },
    {
      title: "5. Infection Control and Hygiene",
      guidance: [
        "Assess hygiene practices, PPE usage, and infection control measures during night visits."
      ],
      questions: [
        { label: "Is hand hygiene and PPE being followed?", yesNoField: "hand_hygiene_ppe_followed" },
        { label: "Is PPE available for staff?", yesNoField: "ppe_available" },
        { label: "Is the home clean and odour-free?", yesNoField: "home_clean_odour_free" },
        { label: "Are continence aids stored correctly?", yesNoField: "continence_aids_stored_correct" }
      ]
    },
    {
      title: "6. Food, Fluids and Kitchen",
      guidance: [
        "Check availability of refreshments and kitchen cleanliness during night hours."
      ],
      questions: [
        { label: "Are drinks/snacks available for residents?", yesNoField: "drinks_snacks_available" },
        { label: "Is the kitchen clean and tidy?", yesNoField: "kitchen_clean_tidy" },
        { label: "Is food hygiene being followed?", yesNoField: "food_hygiene_followed" }
      ]
    },
    {
      title: "7. Record Keeping and Handover",
      guidance: [
        "Verify documentation completeness and handover procedures during night shifts."
      ],
      questions: [
        { label: "Are care notes up to date?", yesNoField: "care_notes_up_to_date" },
        { label: "Are monitoring documents (observations) completed?", yesNoField: "monitoring_docs_completed" },
        { label: "Is handover documented appropriately?", yesNoField: "handover_documented" },
        { label: "Have any incidents been recorded?", yesNoField: "incidents_recorded" }
      ]
    },
    {
      title: "8. Staff Conduct and Morale",
      guidance: [
        "Assess staff professionalism, break management, and support during night shifts."
      ],
      questions: [
        { label: "Are staff alert and professional?", yesNoField: "staff_alert_professional" },
        { label: "Are staff taking breaks as required?", yesNoField: "staff_breaks_taken" },
        { label: "Do staff feel supported and safe?", yesNoField: "staff_supported_safe" },
        { label: "Are staff aware of emergency procedures?", yesNoField: "staff_aware_emergency_procedures" }
      ]
    },
    {
      title: "9. Maintenance and Equipment",
      guidance: [
        "Check equipment condition and maintenance status during night visits."
      ],
      questions: [
        { label: "Is equipment stored safely and in good working order?", yesNoField: "equipment_stored_good_working" },
        { label: "Are nurse-call systems functioning?", yesNoField: "nurse_call_systems_functioning" },
        { label: "Are any maintenance issues reported or present?", yesNoField: "maintenance_issues_reported" }
      ]
    },
    {
      title: "10. General Observations",
      guidance: [
        "Record general observations about resident comfort and overall night visit conditions."
      ],
      questions: [
        { label: "Are residents out of bed and in discomfort?", yesNoField: "residents_out_of_bed_discomfort" },
        { label: "Are lights/TVs/noise disruptive to residents?", yesNoField: "lights_tvs_noise_disruptive" },
        { label: "Are there any safeguarding concerns observed?", yesNoField: "safeguarding_concerns_observed" },
        { label: "Is the overall atmosphere calm and safe?", yesNoField: "atmosphere_calm_safe" }
      ]
    }
  ];

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<boolean[]>(() => Array(sections.length).fill(true));

  const toggleSection = (index: number) => {
    setOpenSections(prev => prev.map((open, i) => i === index ? !open : open));
  };

  // Helper functions
  const hasError = (fieldName: string) => errors.includes(fieldName);

  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return hasError(fieldName)
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
      : baseClassName;
  };

  const [data, setData] = useState<NightVisitData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    sufficient_staff_on_duty: '',
    sufficient_staff_on_duty_comment: '',
    staff_present_visible: '',
    staff_present_visible_comment: '',
    manager_on_call_contactable: '',
    manager_on_call_contactable_comment: '',
    agency_staff_familiar: '',
    agency_staff_familiar_comment: '',
    staff_uniforms_id: '',
    staff_uniforms_id_comment: '',

    residents_accounted_for: '',
    residents_accounted_for_comment: '',
    call_bells_accessible: '',
    call_bells_accessible_comment: '',
    residents_checked_regularly: '',
    residents_checked_regularly_comment: '',
    residents_awake_distressed_supported: '',
    residents_awake_distressed_supported_comment: '',
    bedrails_crash_mats_used_correctly: '',
    bedrails_crash_mats_used_correctly_comment: '',

    external_doors_locked: '',
    external_doors_locked_comment: '',
    fire_exits_clear: '',
    fire_exits_clear_comment: '',
    corridors_free_of_trip_hazards: '',
    corridors_free_of_trip_hazards_comment: '',
    lighting_sufficient: '',
    lighting_sufficient_comment: '',
    temperature_comfortable: '',
    temperature_comfortable_comment: '',

    night_meds_stored_secure: '',
    night_meds_stored_secure_comment: '',
    mar_chart_up_to_date: '',
    mar_chart_up_to_date_comment: '',
    cds_stored_recorded: '',
    cds_stored_recorded_comment: '',
    wound_dressings_documented: '',
    wound_dressings_documented_comment: '',

    hand_hygiene_ppe_followed: '',
    hand_hygiene_ppe_followed_comment: '',
    ppe_available: '',
    ppe_available_comment: '',
    home_clean_odour_free: '',
    home_clean_odour_free_comment: '',
    continence_aids_stored_correct: '',
    continence_aids_stored_correct_comment: '',

    drinks_snacks_available: '',
    drinks_snacks_available_comment: '',
    kitchen_clean_tidy: '',
    kitchen_clean_tidy_comment: '',
    food_hygiene_followed: '',
    food_hygiene_followed_comment: '',

    care_notes_up_to_date: '',
    care_notes_up_to_date_comment: '',
    monitoring_docs_completed: '',
    monitoring_docs_completed_comment: '',
    handover_documented: '',
    handover_documented_comment: '',
    incidents_recorded: '',
    incidents_recorded_comment: '',

    staff_alert_professional: '',
    staff_alert_professional_comment: '',
    staff_breaks_taken: '',
    staff_breaks_taken_comment: '',
    staff_supported_safe: '',
    staff_supported_safe_comment: '',
    staff_aware_emergency_procedures: '',
    staff_aware_emergency_procedures_comment: '',

    equipment_stored_good_working: '',
    equipment_stored_good_working_comment: '',
    nurse_call_systems_functioning: '',
    nurse_call_systems_functioning_comment: '',
    maintenance_issues_reported: '',
    maintenance_issues_reported_comment: '',

    residents_out_of_bed_discomfort: '',
    residents_out_of_bed_discomfort_comment: '',
    lights_tvs_noise_disruptive: '',
    lights_tvs_noise_disruptive_comment: '',
    safeguarding_concerns_observed: '',
    safeguarding_concerns_observed_comment: '',
    atmosphere_calm_safe: '',
    atmosphere_calm_safe_comment: '',
  });

  useEffect(() => {
    if (!activeWorkspace?.name) return;
    setData(prev => {
      if (prev.home && prev.home.trim().length > 0) return prev;
      return { ...prev, home: activeWorkspace.name };
    });
  }, [activeWorkspace?.name]);

  const handleChange = (field: keyof NightVisitData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  // Load existing attachments when workspace changes
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      if (!activeWorkspace?.id) return;
      setAttachments({});
      setAttachmentsToDelete([]);
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'night-visit', undefined, activeWorkspace.organisationId || null);
        if (!existing) return;
        const { attachments: storedAttachments, comments, ...formData } = existing as any;
        if (!cancelled && formData) {
          setData(prev => ({ ...prev, ...formData }));
        }
        if (!cancelled && comments) setFinalComments(comments);
        if (storedAttachments && typeof storedAttachments === 'object') {
          const entries: Array<[string, AttachmentItem[]]> = [];
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
            if (processed.length > 0) entries.push([fieldName, processed]);
          }
          if (!cancelled && entries.length > 0) {
            setAttachments(Object.fromEntries(entries));
          }
        }
      } catch (err) {
        console.error('Failed to load existing night-visit audit data:', err);
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
    const storagePath = `${basePath}/audit-attachments/night-visit/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
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

  const YesNoQuestion = ({
    label,
    yesNoField,
    commentField,
    yesNoValue,
    commentValue,
    onYesNoChange,
    onCommentChange
  }: {
    label: string;
    yesNoField: string;
    commentField: string;
    yesNoValue: string;
    commentValue: string;
    onYesNoChange: (value: string) => void;
    onCommentChange: (value: string) => void;
  }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-colors hover:border-blue-200">
      <div className="flex items-start justify-between gap-4">
        <label className="block text-sm font-semibold text-slate-800 leading-snug">
          {label}
        </label>
        <div className="relative flex-shrink-0">
          {(attachments[yesNoField]?.length ?? 0) > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
              {attachments[yesNoField]?.length}
            </span>
          )}
          <label
            title="Add attachment"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-50 text-blue-600 cursor-pointer border border-transparent hover:bg-blue-100"
          >
            <input
              type="file"
              accept="image/*"
              data-field-input={yesNoField}
              onChange={(e) => {
                handleAddAttachments(yesNoField, e.target.files);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
            <span className="text-xl font-bold">+</span>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-4" data-field={yesNoField}>
        {['Yes', 'No', 'N/A'].map(option => (
          <label key={option} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input
              type="radio"
              name={yesNoField}
              value={option}
              checked={yesNoValue === option}
              onChange={(e) => onYesNoChange(e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {errors.includes(yesNoField) && (
        <p className="text-red-500 text-xs mt-2">This field is required</p>
      )}
      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-slate-700">Comments</label>
        <Textarea
          value={commentValue}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={2}
          placeholder="Add any comments or observations..."
          className="bg-slate-50 border-slate-200"
          data-comment-field={commentField}
        />
      </div>
      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          {(attachments[yesNoField] ?? []).map(att => (
            <div key={att.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setPreviewImage({ url: att.url, name: att.name })}
                className="w-full h-full"
                title={att.name}
              >
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(yesNoField, att.id)}
                title="Remove"
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-slate-200 shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const validateForm = () => {
    const required: (keyof NightVisitData)[] = [
      'home','date','personCompletingAudit',
      'sufficient_staff_on_duty','staff_present_visible','manager_on_call_contactable','agency_staff_familiar','staff_uniforms_id',
      'residents_accounted_for','call_bells_accessible','residents_checked_regularly','residents_awake_distressed_supported','bedrails_crash_mats_used_correctly',
      'external_doors_locked','fire_exits_clear','corridors_free_of_trip_hazards','lighting_sufficient','temperature_comfortable',
      'night_meds_stored_secure','mar_chart_up_to_date','cds_stored_recorded','wound_dressings_documented',
      'hand_hygiene_ppe_followed','ppe_available','home_clean_odour_free','continence_aids_stored_correct',
      'drinks_snacks_available','kitchen_clean_tidy','food_hygiene_followed',
      'care_notes_up_to_date','monitoring_docs_completed','handover_documented','incidents_recorded',
      'staff_alert_professional','staff_breaks_taken','staff_supported_safe','staff_aware_emergency_procedures',
      'equipment_stored_good_working','nurse_call_systems_functioning','maintenance_issues_reported',
      'residents_out_of_bed_discomfort','lights_tvs_noise_disruptive','safeguarding_concerns_observed','atmosphere_calm_safe'
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

    // Compute yes/no score for night visit questions
    const YES_NO_FIELDS = [
      'sufficient_staff_on_duty','staff_present_visible','manager_on_call_contactable','agency_staff_familiar','staff_uniforms_id',
      'residents_accounted_for','call_bells_accessible','residents_checked_regularly','residents_awake_distressed_supported','bedrails_crash_mats_used_correctly',
      'external_doors_locked','fire_exits_clear','corridors_free_of_trip_hazards','lighting_sufficient','temperature_comfortable',
      'night_meds_stored_secure','mar_chart_up_to_date','cds_stored_recorded','wound_dressings_documented',
      'hand_hygiene_ppe_followed','ppe_available','home_clean_odour_free','continence_aids_stored_correct',
      'drinks_snacks_available','kitchen_clean_tidy','food_hygiene_followed',
      'care_notes_up_to_date','monitoring_docs_completed','handover_documented','incidents_recorded',
      'staff_alert_professional','staff_breaks_taken','staff_supported_safe','staff_aware_emergency_procedures',
      'equipment_stored_good_working','nurse_call_systems_functioning','maintenance_issues_reported',
      'residents_out_of_bed_discomfort','lights_tvs_noise_disruptive','safeguarding_concerns_observed','atmosphere_calm_safe'
    ];

    const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + ((data as any)[f] === 'Yes' ? 1 : 0), 0);
    const totalCount = YES_NO_FIELDS.length;
    const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : null;

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
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: user?.id ?? null,
      workspaceId: activeWorkspaceId,
      auditType: 'night-visit',
      yesCount,
      totalCount,
      scorePercent,
      organisationId: orgId,
    };

    try {
      setSaving(true);
  await saveAudit(payload, activeWorkspaceId, activeWorkspace?.organisationId || null);
      const completedAt = data.date || new Date().toISOString();
      try {
        await markAuditCompletedWithSnapshot(activeWorkspaceId, 'night-visit', payload, completedAt);
      } catch (err) {
        console.warn('Failed to complete night-visit audit with snapshot', err);
      }
  alert('Audit saved');
  setAttachments(nextAttachmentState);
  setAttachmentsToDelete([]);
  setPreviewImage(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save night-visit audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Night Visit Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive night visit audit to review care, safety, and staffing standards. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                name="home"
                value={data.home}
                onChange={(e: any) => handleChange('home', e.target.value)}
                placeholder="Enter care home name"
                data-field="home"
                required
              />
              {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input
                type="date"
                className={getFieldClassName('date', "w-full")}
                name="date"
                value={data.date}
                onChange={(e: any) => handleChange('date', e.target.value)}
                data-field="date"
                required
              />
              {hasError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <StaffSelectInput
                type="text"
                className={getFieldClassName('personCompletingAudit', "w-full")}
                name="personCompletingAudit"
                value={data.personCompletingAudit}
                onChange={(e: any) => handleChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                data-field="personCompletingAudit"
                required
              />
              {hasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            {sections.map((section, index) => (
              <div key={section.title} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  {openSections[index] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {openSections[index] && (
                  <div className="px-8 pb-8">
                    {section.guidance?.length > 0 && (
                      <ul className="mb-4 ml-4 list-disc text-sm text-slate-500 space-y-1">
                        {section.guidance.map((item, gIdx) => (
                          <li key={gIdx}>{item}</li>
                        ))}
                      </ul>
                    )}
                    <div className="space-y-4">
                      {section.questions.map((question, qIndex) => {
                        const yesField = question.yesNoField as keyof NightVisitData;
                        const commentField = `${question.yesNoField}_comment` as keyof NightVisitData;
                        return (
                          <YesNoQuestion
                            key={qIndex}
                            label={question.label}
                            yesNoField={yesField as string}
                            commentField={commentField as string}
                            yesNoValue={data[yesField]}
                            commentValue={(data as any)[commentField]}
                            onYesNoChange={(value: string) => handleChange(yesField, value)}
                            onCommentChange={(value: string) => handleChange(commentField, value)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Final Comments</h3>
              <Textarea
                value={finalComments}
                onChange={(e) => setFinalComments(e.target.value)}
                rows={4}
                placeholder="Add any final comments or observations about this night visit audit..."
                className="w-full bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Complete Audit'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this audit?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
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

      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setPreviewImage(null)} />
          <div className="relative z-70 max-w-3xl w-full mx-4">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <div className="flex justify-between items-start p-2 border-b">
                <div className="px-3 py-1 text-sm text-gray-700 truncate">{previewImage.name}</div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
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
