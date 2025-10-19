"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StaffSelectInput } from '@/components/audits/staff-select-input';

interface HealthSafetyAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;
  
  // Section 1
  hsa_policy_in_place: string;
  hsa_policy_in_place_comment: string;
  staff_trained_hsa: string;
  staff_trained_hsa_comment: string;
  checks_documented: string;
  checks_documented_comment: string;
  hsa_lead_poster: string;
  hsa_lead_poster_comment: string;

  // Section 2
  risk_assessments_in_place: string;
  risk_assessments_in_place_comment: string;
  risk_assessments_reviewed: string;
  risk_assessments_reviewed_comment: string;
  control_measures_followed: string;
  control_measures_followed_comment: string;
  staff_aware_risk_assessments: string;
  staff_aware_risk_assessments_comment: string;

  // Section 3
  reporting_system_clear: string;
  reporting_system_clear_comment: string;
  incidents_recorded_investigated: string;
  incidents_recorded_investigated_comment: string;
  riddor_reported: string;
  riddor_reported_comment: string;
  lessons_learned_shared: string;
  lessons_learned_shared_comment: string;

  // Section 4
  manual_handling_training: string;
  manual_handling_training_comment: string;
  handling_equipment_available: string;
  handling_equipment_available_comment: string;
  individual_manual_risk_assessments: string;
  individual_manual_risk_assessments_comment: string;
  correct_techniques_used: string;
  correct_techniques_used_comment: string;

  // Section 5
  floors_free_from_hazards: string;
  floors_free_from_hazards_comment: string;
  safety_aids_secure: string;
  safety_aids_secure_comment: string;
  falls_risk_assessments: string;
  falls_risk_assessments_comment: string;
  falls_incidents_reviewed: string;
  falls_incidents_reviewed_comment: string;

  // Section 6
  handwashing_facilities: string;
  handwashing_facilities_comment: string;
  ppe_supplies_available: string;
  ppe_supplies_available_comment: string;
  waste_bins_condition: string;
  waste_bins_condition_comment: string;
  cleaning_equipment_coloured: string;
  cleaning_equipment_coloured_comment: string;

  // Section 7
  hazardous_substances_stored: string;
  hazardous_substances_stored_comment: string;
  coshh_risk_assessments: string;
  coshh_risk_assessments_comment: string;
  chemicals_labelled: string;
  chemicals_labelled_comment: string;
  staff_trained_hazardous: string;
  staff_trained_hazardous_comment: string;

  // Section 8
  fire_exits_marked: string;
  fire_exits_marked_comment: string;
  extinguishers_alarms_serviced: string;
  extinguishers_alarms_serviced_comment: string;
  staff_trained_fire: string;
  staff_trained_fire_comment: string;
  fire_risk_assessment_up_to_date: string;
  fire_risk_assessment_up_to_date_comment: string;

  // Section 9
  pat_testing: string;
  pat_testing_comment: string;
  fixed_wiring_tested: string;
  fixed_wiring_tested_comment: string;
  sockets_cables_good: string;
  sockets_cables_good_comment: string;
  faulty_items_reported: string;
  faulty_items_reported_comment: string;

  // Section 10
  kitchen_clean: string;
  kitchen_clean_comment: string;
  food_hygiene_followed: string;
  food_hygiene_followed_comment: string;
  cleaning_schedules_signed: string;
  cleaning_schedules_signed_comment: string;
  food_stored_appropriately: string;
  food_stored_appropriately_comment: string;

  // Section 11
  legionella_risk_assessment: string;
  legionella_risk_assessment_comment: string;
  water_temps_monitored: string;
  water_temps_monitored_comment: string;
  showers_taps_flushed: string;
  showers_taps_flushed_comment: string;
  water_safety_training: string;
  water_safety_training_comment: string;

  // Section 12
  environment_free_from_hazards: string;
  environment_free_from_hazards_comment: string;
  staff_areas_safe: string;
  staff_areas_safe_comment: string;
  break_times_managed: string;
  break_times_managed_comment: string;
  lone_working_policies: string;
  lone_working_policies_comment: string;

  // Section 13
  ppe_available: string;
  ppe_available_comment: string;
  ppe_stored_cleanly: string;
  ppe_stored_cleanly_comment: string;
  staff_trained_ppe: string;
  staff_trained_ppe_comment: string;

  // Section 14
  staff_hs_training_up_to_date: string;
  staff_hs_training_up_to_date_comment: string;
  new_staff_trained_hs: string;
  new_staff_trained_hs_comment: string;
  staff_supervised_supported: string;
  staff_supervised_supported_comment: string;
  refresher_training_scheduled: string;
  refresher_training_scheduled_comment: string;

  // Section 15
  warning_signs_displayed: string;
  warning_signs_displayed_comment: string;
  first_aid_posters_visible: string;
  first_aid_posters_visible_comment: string;
  residents_informed: string;
  residents_informed_comment: string;
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
  yesNoField: keyof HealthSafetyAuditData;
  commentField: keyof HealthSafetyAuditData;
  yesNoValue: string;
  commentValue: string;
  onYesNoChange: (value: string) => void;
  onCommentChange: (value: string) => void;
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
  const fieldKey = yesNoField as string;
  const commentKey = commentField as string;
  const attachmentList = attachments[commentKey] ?? [];

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
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
                    onAddAttachments(commentKey, e.target.files);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                <span className="text-xl font-bold">+</span>
              </label>
            </div>
          </div>
          <div className="flex gap-4" data-field={fieldKey}>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="Yes"
                checked={yesNoValue === 'Yes'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="No"
                checked={yesNoValue === 'No'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
          {hasError(fieldKey) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className={getFieldClassName(
              commentKey,
              'w-full bg-white border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors'
            )}
            rows={2}
            placeholder="Add any comments or observations..."
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
                    onClick={() => onRemoveAttachment(commentKey, att.id)}
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
      </div>
    </div>
  );
};

export default function HealthSafetyAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<string[]>(['audit-details']);

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  // ...existing code...

  // Section definitions with guidance text
  const sections = [
    {
      name: 'audit-details',
      label: 'Audit Details',
      guidance: 'Enter the basic information for this health and safety audit including the care home, date, and person completing the audit.'
    },
    {
      name: 'general-management',
      label: 'General Health and Safety Management',
      guidance: 'Review the overall health and safety management systems including policies, training, and designated personnel.'
    },
    {
      name: 'risk-assessments',
      label: 'Risk Assessments',
      guidance: 'Assess the presence and effectiveness of risk assessments for all relevant activities and hazards.'
    },
    {
      name: 'incident-reporting',
      label: 'Accident and Incident Reporting',
      guidance: 'Evaluate the systems for reporting, investigating, and learning from accidents and incidents.'
    },
    {
      name: 'manual-handling',
      label: 'Manual Handling',
      guidance: 'Check manual handling training, equipment availability, and risk assessment procedures.'
    },
    {
      name: 'slips-trips-falls',
      label: 'Slips, Trips, and Falls',
      guidance: 'Assess floor conditions, safety aids, and falls prevention measures.'
    },
    {
      name: 'infection-control',
      label: 'Infection Prevention and Control',
      guidance: 'Review handwashing facilities, PPE availability, and hygiene procedures.'
    },
    {
      name: 'hazardous-substances',
      label: 'Hazardous Substances (COSHH)',
      guidance: 'Evaluate storage, risk assessments, and staff training for hazardous substances.'
    },
    {
      name: 'fire-safety',
      label: 'Fire Safety',
      guidance: 'Check fire exits, equipment servicing, and staff training in fire procedures.'
    },
    {
      name: 'electrical-safety',
      label: 'Electrical Safety',
      guidance: 'Assess PAT testing, wiring maintenance, and electrical equipment condition.'
    },
    {
      name: 'kitchen-safety',
      label: 'Kitchen and Food Safety',
      guidance: 'Review kitchen hygiene, food storage, and cleaning procedures.'
    },
    {
      name: 'water-legionella',
      label: 'Water and Legionella',
      guidance: 'Evaluate legionella risk assessments and water safety monitoring.'
    },
    {
      name: 'environment-welfare',
      label: 'Environment and Staff Welfare',
      guidance: 'Assess the overall environment and staff welfare arrangements.'
    },
    {
      name: 'ppe-training',
      label: 'PPE and Training',
      guidance: 'Check PPE availability, storage, and staff training in its use.'
    },
    {
      name: 'staff-training',
      label: 'Staff Training and Supervision',
      guidance: 'Review staff training records and supervision arrangements.'
    },
    {
      name: 'notices-communication',
      label: 'Notices, First Aid and Communication',
      guidance: 'Evaluate safety signage, first aid information, and communication with residents.'
    },
    {
      name: 'final-comments',
      label: 'Final Comments',
      guidance: 'Provide any final comments or recommendations based on the health and safety audit findings.'
    }
  ];

  // Helper functions for error handling and field styling
  const hasError = useCallback((fieldName: string) => errors.includes(fieldName), [errors]);

  const getFieldClassName = useCallback((fieldName: string, baseClass = "w-full p-2 border rounded-md") => {
    return `${baseClass} ${hasError(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  }, [hasError]);

  const getTableFieldClassName = useCallback((fieldName: string, baseClass = "w-full p-1 border rounded") => {
    return `${baseClass} ${hasError(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  }, [hasError]);

  const [auditData, setAuditData] = useState<HealthSafetyAuditData>({
    home: activeWorkspace?.name ?? '',
    date: '',
    personCompletingAudit: '',

    // Section 1
    hsa_policy_in_place: '',
    hsa_policy_in_place_comment: '',
    staff_trained_hsa: '',
    staff_trained_hsa_comment: '',
    checks_documented: '',
    checks_documented_comment: '',
    hsa_lead_poster: '',
    hsa_lead_poster_comment: '',

    // Section 2
    risk_assessments_in_place: '',
    risk_assessments_in_place_comment: '',
    risk_assessments_reviewed: '',
    risk_assessments_reviewed_comment: '',
    control_measures_followed: '',
    control_measures_followed_comment: '',
    staff_aware_risk_assessments: '',
    staff_aware_risk_assessments_comment: '',

    // Section 3
    reporting_system_clear: '',
    reporting_system_clear_comment: '',
    incidents_recorded_investigated: '',
    incidents_recorded_investigated_comment: '',
    riddor_reported: '',
    riddor_reported_comment: '',
    lessons_learned_shared: '',
    lessons_learned_shared_comment: '',

    // Section 4
    manual_handling_training: '',
    manual_handling_training_comment: '',
    handling_equipment_available: '',
    handling_equipment_available_comment: '',
    individual_manual_risk_assessments: '',
    individual_manual_risk_assessments_comment: '',
    correct_techniques_used: '',
    correct_techniques_used_comment: '',

    // Section 5
    floors_free_from_hazards: '',
    floors_free_from_hazards_comment: '',
    safety_aids_secure: '',
    safety_aids_secure_comment: '',
    falls_risk_assessments: '',
    falls_risk_assessments_comment: '',
    falls_incidents_reviewed: '',
    falls_incidents_reviewed_comment: '',

    // Section 6
    handwashing_facilities: '',
    handwashing_facilities_comment: '',
    ppe_supplies_available: '',
    ppe_supplies_available_comment: '',
    waste_bins_condition: '',
    waste_bins_condition_comment: '',
    cleaning_equipment_coloured: '',
    cleaning_equipment_coloured_comment: '',

    // Section 7
    hazardous_substances_stored: '',
    hazardous_substances_stored_comment: '',
    coshh_risk_assessments: '',
    coshh_risk_assessments_comment: '',
    chemicals_labelled: '',
    chemicals_labelled_comment: '',
    staff_trained_hazardous: '',
    staff_trained_hazardous_comment: '',

    // Section 8
    fire_exits_marked: '',
    fire_exits_marked_comment: '',
    extinguishers_alarms_serviced: '',
    extinguishers_alarms_serviced_comment: '',
    staff_trained_fire: '',
    staff_trained_fire_comment: '',
    fire_risk_assessment_up_to_date: '',
    fire_risk_assessment_up_to_date_comment: '',

    // Section 9
    pat_testing: '',
    pat_testing_comment: '',
    fixed_wiring_tested: '',
    fixed_wiring_tested_comment: '',
    sockets_cables_good: '',
    sockets_cables_good_comment: '',
    faulty_items_reported: '',
    faulty_items_reported_comment: '',

    // Section 10
    kitchen_clean: '',
    kitchen_clean_comment: '',
    food_hygiene_followed: '',
    food_hygiene_followed_comment: '',
    cleaning_schedules_signed: '',
    cleaning_schedules_signed_comment: '',
    food_stored_appropriately: '',
    food_stored_appropriately_comment: '',

    // Section 11
    legionella_risk_assessment: '',
    legionella_risk_assessment_comment: '',
    water_temps_monitored: '',
    water_temps_monitored_comment: '',
    showers_taps_flushed: '',
    showers_taps_flushed_comment: '',
    water_safety_training: '',
    water_safety_training_comment: '',

    // Section 12
    environment_free_from_hazards: '',
    environment_free_from_hazards_comment: '',
    staff_areas_safe: '',
    staff_areas_safe_comment: '',
    break_times_managed: '',
    break_times_managed_comment: '',
    lone_working_policies: '',
    lone_working_policies_comment: '',

    // Section 13
    ppe_available: '',
    ppe_available_comment: '',
    ppe_stored_cleanly: '',
    ppe_stored_cleanly_comment: '',
    staff_trained_ppe: '',
    staff_trained_ppe_comment: '',

    // Section 14
    staff_hs_training_up_to_date: '',
    staff_hs_training_up_to_date_comment: '',
    new_staff_trained_hs: '',
    new_staff_trained_hs_comment: '',
    staff_supervised_supported: '',
    staff_supervised_supported_comment: '',
    refresher_training_scheduled: '',
    refresher_training_scheduled_comment: '',

    // Section 15
    warning_signs_displayed: '',
    warning_signs_displayed_comment: '',
    first_aid_posters_visible: '',
    first_aid_posters_visible_comment: '',
    residents_informed: '',
    residents_informed_comment: '',
  });

  // Y/N fields used to compute an overall percentage score
  const YES_NO_FIELDS: (keyof HealthSafetyAuditData)[] = [
    'hsa_policy_in_place', 'staff_trained_hsa', 'checks_documented', 'hsa_lead_poster',
    'risk_assessments_in_place', 'risk_assessments_reviewed', 'control_measures_followed', 'staff_aware_risk_assessments',
    'reporting_system_clear', 'incidents_recorded_investigated', 'riddor_reported', 'lessons_learned_shared',
    'manual_handling_training', 'handling_equipment_available', 'individual_manual_risk_assessments', 'correct_techniques_used',
    'floors_free_from_hazards', 'safety_aids_secure', 'falls_risk_assessments', 'falls_incidents_reviewed',
    'handwashing_facilities', 'ppe_supplies_available', 'waste_bins_condition', 'cleaning_equipment_coloured',
    'hazardous_substances_stored', 'coshh_risk_assessments', 'chemicals_labelled', 'staff_trained_hazardous',
    'fire_exits_marked', 'extinguishers_alarms_serviced', 'staff_trained_fire', 'fire_risk_assessment_up_to_date',
    'pat_testing', 'fixed_wiring_tested', 'sockets_cables_good', 'faulty_items_reported',
    'kitchen_clean', 'food_hygiene_followed', 'cleaning_schedules_signed', 'food_stored_appropriately',
    'legionella_risk_assessment', 'water_temps_monitored', 'showers_taps_flushed', 'water_safety_training',
    'environment_free_from_hazards', 'staff_areas_safe', 'break_times_managed', 'lone_working_policies',
    'ppe_available', 'ppe_stored_cleanly', 'staff_trained_ppe',
    'staff_hs_training_up_to_date', 'new_staff_trained_hs', 'staff_supervised_supported', 'refresher_training_scheduled',
    'warning_signs_displayed', 'first_aid_posters_visible', 'residents_informed'
  ];

  useEffect(() => {
    if (!activeWorkspace?.name) return;
    if (auditData.home && auditData.home.trim().length > 0) return;
    setAuditData(prev => ({ ...prev, home: activeWorkspace.name }));
  }, [activeWorkspace?.name, auditData.home]);

  // Load existing attachments for this audit type when workspace changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeWorkspace?.id) {
        setAttachments({});
        setAttachmentsToDelete([]);
        return;
      }
      try {
        const existing = await getLatestAuditData(activeWorkspace.id, 'health-safety', undefined, activeWorkspace.organisationId || null);
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
        console.warn('Failed to load existing health-safety attachments', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  const handleInputChange = (field: keyof HealthSafetyAuditData, value: string) => {
    setAuditData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(error => error !== field));
    }
  };

  const handleAddAttachments = (fieldName: string, files: FileList | null) => {
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
    const storagePath = `${basePath}/audit-attachments/health-safety/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage({ url: attachment.url, name: attachment.name });
  }, [setPreviewImage]);

  const validateForm = () => {
    const requiredFields: (keyof HealthSafetyAuditData)[] = [
      'home', 'date', 'personCompletingAudit',
      'hsa_policy_in_place', 'staff_trained_hsa', 'checks_documented', 'hsa_lead_poster',
      'risk_assessments_in_place', 'risk_assessments_reviewed', 'control_measures_followed', 'staff_aware_risk_assessments',
      'reporting_system_clear', 'incidents_recorded_investigated', 'riddor_reported', 'lessons_learned_shared',
      'manual_handling_training', 'handling_equipment_available', 'individual_manual_risk_assessments', 'correct_techniques_used',
      'floors_free_from_hazards', 'safety_aids_secure', 'falls_risk_assessments', 'falls_incidents_reviewed',
      'handwashing_facilities', 'ppe_supplies_available', 'waste_bins_condition', 'cleaning_equipment_coloured',
      'hazardous_substances_stored', 'coshh_risk_assessments', 'chemicals_labelled', 'staff_trained_hazardous',
      'fire_exits_marked', 'extinguishers_alarms_serviced', 'staff_trained_fire', 'fire_risk_assessment_up_to_date',
      'pat_testing', 'fixed_wiring_tested', 'sockets_cables_good', 'faulty_items_reported',
      'kitchen_clean', 'food_hygiene_followed', 'cleaning_schedules_signed', 'food_stored_appropriately',
      'legionella_risk_assessment', 'water_temps_monitored', 'showers_taps_flushed', 'water_safety_training',
      'environment_free_from_hazards', 'staff_areas_safe', 'break_times_managed', 'lone_working_policies',
      'ppe_available', 'ppe_stored_cleanly', 'staff_trained_ppe',
      'staff_hs_training_up_to_date', 'new_staff_trained_hs', 'staff_supervised_supported', 'refresher_training_scheduled',
      'warning_signs_displayed', 'first_aid_posters_visible', 'residents_informed'
    ];

    const newErrors = requiredFields.filter(field => !auditData[field].trim());
    setErrors(newErrors as string[]);

    if (newErrors.length > 0) {
      const firstErrorElement = document.querySelector(`[data-field="${newErrors[0]}"]`);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return newErrors.length === 0;
  };

  const handleCompleteAudit = () => {
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!activeWorkspace?.id) {
      alert('Please select a workspace before saving');
      return;
    }
    setSaving(true);
    try {
      const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (auditData[f] === 'Yes' ? 1 : 0), 0);
      const totalCount = YES_NO_FIELDS.length;
      const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;
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

      const payload = { auditType: 'health-safety', ...auditData, ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}), comments: finalComments, createActionPlan, createdBy: user?.id ?? null, workspaceId: activeWorkspace.id, yesCount, totalCount, scorePercent, organisationId: activeWorkspace.organisationId || null };
      const id = await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
      const result = await markAuditCompletedWithSnapshot(activeWorkspace.id, 'health-safety', payload, auditData.date || new Date().toISOString());

      setAttachments(nextAttachmentState);
      setAttachmentsToDelete([]);
      setPreviewImage(null);
      alert('Audit saved');
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const yesNoSharedProps = {
    attachments,
    onAddAttachments: handleAddAttachments,
    onRemoveAttachment: handleRemoveAttachment,
    onPreviewAttachment: handlePreviewAttachment,
    hasError,
    getFieldClassName,
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  return (
  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Health and Safety Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive health and safety audit covering all aspects of workplace safety. All required fields must be filled.</p>
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
              {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
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
              {hasError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
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
              {hasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleCompleteAudit(); }} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(section.name)}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {section.label}
                  </span>
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

                    {section.name === 'general-management' && (
                      <div className="bg-green-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-green-900 mb-4">General Health and Safety Management</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is there a current Health and Safety policy in place and reviewed?"
                            yesNoField="hsa_policy_in_place"
                            commentField="hsa_policy_in_place_comment"
                            yesNoValue={auditData.hsa_policy_in_place}
                            commentValue={auditData.hsa_policy_in_place_comment}
                            onYesNoChange={(value) => handleInputChange('hsa_policy_in_place', value)}
                            onCommentChange={(value) => handleInputChange('hsa_policy_in_place_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff aware of and trained in the Health and Safety procedures?"
                            yesNoField="staff_trained_hsa"
                            commentField="staff_trained_hsa_comment"
                            yesNoValue={auditData.staff_trained_hsa}
                            commentValue={auditData.staff_trained_hsa_comment}
                            onYesNoChange={(value) => handleInputChange('staff_trained_hsa', value)}
                            onCommentChange={(value) => handleInputChange('staff_trained_hsa_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are regular Health and Safety checks carried out and documented?"
                            yesNoField="checks_documented"
                            commentField="checks_documented_comment"
                            yesNoValue={auditData.checks_documented}
                            commentValue={auditData.checks_documented_comment}
                            onYesNoChange={(value) => handleInputChange('checks_documented', value)}
                            onCommentChange={(value) => handleInputChange('checks_documented_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is there a designated Health and Safety lead or officer and poster displayed?"
                            yesNoField="hsa_lead_poster"
                            commentField="hsa_lead_poster_comment"
                            yesNoValue={auditData.hsa_lead_poster}
                            commentValue={auditData.hsa_lead_poster_comment}
                            onYesNoChange={(value) => handleInputChange('hsa_lead_poster', value)}
                            onCommentChange={(value) => handleInputChange('hsa_lead_poster_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'risk-assessments' && (
                      <div className="bg-yellow-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-yellow-900 mb-4">Risk Assessments</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are risk assessments in place for all relevant activities (e.g. manual handling, COSHH, fire)?"
                            yesNoField="risk_assessments_in_place"
                            commentField="risk_assessments_in_place_comment"
                            yesNoValue={auditData.risk_assessments_in_place}
                            commentValue={auditData.risk_assessments_in_place_comment}
                            onYesNoChange={(value) => handleInputChange('risk_assessments_in_place', value)}
                            onCommentChange={(value) => handleInputChange('risk_assessments_in_place_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are risk assessments reviewed at least annually or after significant changes/incidents?"
                            yesNoField="risk_assessments_reviewed"
                            commentField="risk_assessments_reviewed_comment"
                            yesNoValue={auditData.risk_assessments_reviewed}
                            commentValue={auditData.risk_assessments_reviewed_comment}
                            onYesNoChange={(value) => handleInputChange('risk_assessments_reviewed', value)}
                            onCommentChange={(value) => handleInputChange('risk_assessments_reviewed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are control measures from risk assessments in place and followed?"
                            yesNoField="control_measures_followed"
                            commentField="control_measures_followed_comment"
                            yesNoValue={auditData.control_measures_followed}
                            commentValue={auditData.control_measures_followed_comment}
                            onYesNoChange={(value) => handleInputChange('control_measures_followed', value)}
                            onCommentChange={(value) => handleInputChange('control_measures_followed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff aware of relevant risk assessments relating to their duties?"
                            yesNoField="staff_aware_risk_assessments"
                            commentField="staff_aware_risk_assessments_comment"
                            yesNoValue={auditData.staff_aware_risk_assessments}
                            commentValue={auditData.staff_aware_risk_assessments_comment}
                            onYesNoChange={(value) => handleInputChange('staff_aware_risk_assessments', value)}
                            onCommentChange={(value) => handleInputChange('staff_aware_risk_assessments_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'incident-reporting' && (
                      <div className="bg-red-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-red-900 mb-4">Accident and Incident Reporting</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is there a clear system in place for reporting accidents and incidents?"
                            yesNoField="reporting_system_clear"
                            commentField="reporting_system_clear_comment"
                            yesNoValue={auditData.reporting_system_clear}
                            commentValue={auditData.reporting_system_clear_comment}
                            onYesNoChange={(value) => handleInputChange('reporting_system_clear', value)}
                            onCommentChange={(value) => handleInputChange('reporting_system_clear_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are all incidents recorded and investigated promptly?"
                            yesNoField="incidents_recorded_investigated"
                            commentField="incidents_recorded_investigated_comment"
                            yesNoValue={auditData.incidents_recorded_investigated}
                            commentValue={auditData.incidents_recorded_investigated_comment}
                            onYesNoChange={(value) => handleInputChange('incidents_recorded_investigated', value)}
                            onCommentChange={(value) => handleInputChange('incidents_recorded_investigated_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are RIDDOR-reportable incidents reported to the HSE as required?"
                            yesNoField="riddor_reported"
                            commentField="riddor_reported_comment"
                            yesNoValue={auditData.riddor_reported}
                            commentValue={auditData.riddor_reported_comment}
                            onYesNoChange={(value) => handleInputChange('riddor_reported', value)}
                            onCommentChange={(value) => handleInputChange('riddor_reported_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are lessons learned from incidents shared and actions implemented?"
                            yesNoField="lessons_learned_shared"
                            commentField="lessons_learned_shared_comment"
                            yesNoValue={auditData.lessons_learned_shared}
                            commentValue={auditData.lessons_learned_shared_comment}
                            onYesNoChange={(value) => handleInputChange('lessons_learned_shared', value)}
                            onCommentChange={(value) => handleInputChange('lessons_learned_shared_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'manual-handling' && (
                      <div className="bg-indigo-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-indigo-900 mb-4">Manual Handling</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Have staff received manual handling training?"
                            yesNoField="manual_handling_training"
                            commentField="manual_handling_training_comment"
                            yesNoValue={auditData.manual_handling_training}
                            commentValue={auditData.manual_handling_training_comment}
                            onYesNoChange={(value) => handleInputChange('manual_handling_training', value)}
                            onCommentChange={(value) => handleInputChange('manual_handling_training_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are moving and handling equipment (hoists, slings, stand aids) available, well maintained, and used correctly?"
                            yesNoField="handling_equipment_available"
                            commentField="handling_equipment_available_comment"
                            yesNoValue={auditData.handling_equipment_available}
                            commentValue={auditData.handling_equipment_available_comment}
                            onYesNoChange={(value) => handleInputChange('handling_equipment_available', value)}
                            onCommentChange={(value) => handleInputChange('handling_equipment_available_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are individual manual handling risk assessments in place for residents?"
                            yesNoField="individual_manual_risk_assessments"
                            commentField="individual_manual_risk_assessments_comment"
                            yesNoValue={auditData.individual_manual_risk_assessments}
                            commentValue={auditData.individual_manual_risk_assessments_comment}
                            onYesNoChange={(value) => handleInputChange('individual_manual_risk_assessments', value)}
                            onCommentChange={(value) => handleInputChange('individual_manual_risk_assessments_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff using correct techniques and equipment during manual handling?"
                            yesNoField="correct_techniques_used"
                            commentField="correct_techniques_used_comment"
                            yesNoValue={auditData.correct_techniques_used}
                            commentValue={auditData.correct_techniques_used_comment}
                            onYesNoChange={(value) => handleInputChange('correct_techniques_used', value)}
                            onCommentChange={(value) => handleInputChange('correct_techniques_used_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'slips-trips-falls' && (
                      <div className="bg-pink-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-pink-900 mb-4">Slips, Trips, and Falls Prevention</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are floors clean, dry, and free from trip hazards?"
                            yesNoField="floors_free_from_hazards"
                            commentField="floors_free_from_hazards_comment"
                            yesNoValue={auditData.floors_free_from_hazards}
                            commentValue={auditData.floors_free_from_hazards_comment}
                            onYesNoChange={(value) => handleInputChange('floors_free_from_hazards', value)}
                            onCommentChange={(value) => handleInputChange('floors_free_from_hazards_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are safety aids (grab rails, alarms, non-slip mats) secure and in good condition?"
                            yesNoField="safety_aids_secure"
                            commentField="safety_aids_secure_comment"
                            yesNoValue={auditData.safety_aids_secure}
                            commentValue={auditData.safety_aids_secure_comment}
                            onYesNoChange={(value) => handleInputChange('safety_aids_secure', value)}
                            onCommentChange={(value) => handleInputChange('safety_aids_secure_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are falls risk assessments completed and up to date?"
                            yesNoField="falls_risk_assessments"
                            commentField="falls_risk_assessments_comment"
                            yesNoValue={auditData.falls_risk_assessments}
                            commentValue={auditData.falls_risk_assessments_comment}
                            onYesNoChange={(value) => handleInputChange('falls_risk_assessments', value)}
                            onCommentChange={(value) => handleInputChange('falls_risk_assessments_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are falls and related incidents reviewed with learning/actions recorded?"
                            yesNoField="falls_incidents_reviewed"
                            commentField="falls_incidents_reviewed_comment"
                            yesNoValue={auditData.falls_incidents_reviewed}
                            commentValue={auditData.falls_incidents_reviewed_comment}
                            onYesNoChange={(value) => handleInputChange('falls_incidents_reviewed', value)}
                            onCommentChange={(value) => handleInputChange('falls_incidents_reviewed_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'infection-control' && (
                      <div className="bg-rose-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-rose-900 mb-4">Infection Prevention and Control</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are handwashing facilities available and stocked?"
                            yesNoField="handwashing_facilities"
                            commentField="handwashing_facilities_comment"
                            yesNoValue={auditData.handwashing_facilities}
                            commentValue={auditData.handwashing_facilities_comment}
                            onYesNoChange={(value) => handleInputChange('handwashing_facilities', value)}
                            onCommentChange={(value) => handleInputChange('handwashing_facilities_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are PPE supplies available and accessible?"
                            yesNoField="ppe_supplies_available"
                            commentField="ppe_supplies_available_comment"
                            yesNoValue={auditData.ppe_supplies_available}
                            commentValue={auditData.ppe_supplies_available_comment}
                            onYesNoChange={(value) => handleInputChange('ppe_supplies_available', value)}
                            onCommentChange={(value) => handleInputChange('ppe_supplies_available_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are waste bins in good condition and used appropriately?"
                            yesNoField="waste_bins_condition"
                            commentField="waste_bins_condition_comment"
                            yesNoValue={auditData.waste_bins_condition}
                            commentValue={auditData.waste_bins_condition_comment}
                            onYesNoChange={(value) => handleInputChange('waste_bins_condition', value)}
                            onCommentChange={(value) => handleInputChange('waste_bins_condition_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is cleaning equipment colour-coded and stored correctly?"
                            yesNoField="cleaning_equipment_coloured"
                            commentField="cleaning_equipment_coloured_comment"
                            yesNoValue={auditData.cleaning_equipment_coloured}
                            commentValue={auditData.cleaning_equipment_coloured_comment}
                            onYesNoChange={(value) => handleInputChange('cleaning_equipment_coloured', value)}
                            onCommentChange={(value) => handleInputChange('cleaning_equipment_coloured_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'hazardous-substances' && (
                      <div className="bg-violet-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-violet-900 mb-4">Hazardous Substances (COSHH)</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are hazardous substances stored safely?"
                            yesNoField="hazardous_substances_stored"
                            commentField="hazardous_substances_stored_comment"
                            yesNoValue={auditData.hazardous_substances_stored}
                            commentValue={auditData.hazardous_substances_stored_comment}
                            onYesNoChange={(value) => handleInputChange('hazardous_substances_stored', value)}
                            onCommentChange={(value) => handleInputChange('hazardous_substances_stored_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are COSHH risk assessments available and up to date?"
                            yesNoField="coshh_risk_assessments"
                            commentField="coshh_risk_assessments_comment"
                            yesNoValue={auditData.coshh_risk_assessments}
                            commentValue={auditData.coshh_risk_assessments_comment}
                            onYesNoChange={(value) => handleInputChange('coshh_risk_assessments', value)}
                            onCommentChange={(value) => handleInputChange('coshh_risk_assessments_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are chemicals labelled correctly with safety data?"
                            yesNoField="chemicals_labelled"
                            commentField="chemicals_labelled_comment"
                            yesNoValue={auditData.chemicals_labelled}
                            commentValue={auditData.chemicals_labelled_comment}
                            onYesNoChange={(value) => handleInputChange('chemicals_labelled', value)}
                            onCommentChange={(value) => handleInputChange('chemicals_labelled_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff trained in handling hazardous substances?"
                            yesNoField="staff_trained_hazardous"
                            commentField="staff_trained_hazardous_comment"
                            yesNoValue={auditData.staff_trained_hazardous}
                            commentValue={auditData.staff_trained_hazardous_comment}
                            onYesNoChange={(value) => handleInputChange('staff_trained_hazardous', value)}
                            onCommentChange={(value) => handleInputChange('staff_trained_hazardous_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'fire-safety' && (
                      <div className="bg-amber-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-amber-900 mb-4">Fire Safety</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are fire exits marked, clear and accessible?"
                            yesNoField="fire_exits_marked"
                            commentField="fire_exits_marked_comment"
                            yesNoValue={auditData.fire_exits_marked}
                            commentValue={auditData.fire_exits_marked_comment}
                            onYesNoChange={(value) => handleInputChange('fire_exits_marked', value)}
                            onCommentChange={(value) => handleInputChange('fire_exits_marked_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are extinguishers and alarms serviced and records up to date?"
                            yesNoField="extinguishers_alarms_serviced"
                            commentField="extinguishers_alarms_serviced_comment"
                            yesNoValue={auditData.extinguishers_alarms_serviced}
                            commentValue={auditData.extinguishers_alarms_serviced_comment}
                            onYesNoChange={(value) => handleInputChange('extinguishers_alarms_serviced', value)}
                            onCommentChange={(value) => handleInputChange('extinguishers_alarms_serviced_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff trained and aware of fire procedures?"
                            yesNoField="staff_trained_fire"
                            commentField="staff_trained_fire_comment"
                            yesNoValue={auditData.staff_trained_fire}
                            commentValue={auditData.staff_trained_fire_comment}
                            onYesNoChange={(value) => handleInputChange('staff_trained_fire', value)}
                            onCommentChange={(value) => handleInputChange('staff_trained_fire_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is the fire risk assessment up to date?"
                            yesNoField="fire_risk_assessment_up_to_date"
                            commentField="fire_risk_assessment_up_to_date_comment"
                            yesNoValue={auditData.fire_risk_assessment_up_to_date}
                            commentValue={auditData.fire_risk_assessment_up_to_date_comment}
                            onYesNoChange={(value) => handleInputChange('fire_risk_assessment_up_to_date', value)}
                            onCommentChange={(value) => handleInputChange('fire_risk_assessment_up_to_date_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'electrical-safety' && (
                      <div className="bg-sky-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-sky-900 mb-4">Electrical Safety</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is PAT testing up to date where applicable?"
                            yesNoField="pat_testing"
                            commentField="pat_testing_comment"
                            yesNoValue={auditData.pat_testing}
                            commentValue={auditData.pat_testing_comment}
                            onYesNoChange={(value) => handleInputChange('pat_testing', value)}
                            onCommentChange={(value) => handleInputChange('pat_testing_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is fixed wiring tested and shown as maintained?"
                            yesNoField="fixed_wiring_tested"
                            commentField="fixed_wiring_tested_comment"
                            yesNoValue={auditData.fixed_wiring_tested}
                            commentValue={auditData.fixed_wiring_tested_comment}
                            onYesNoChange={(value) => handleInputChange('fixed_wiring_tested', value)}
                            onCommentChange={(value) => handleInputChange('fixed_wiring_tested_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are sockets and cables in good condition?"
                            yesNoField="sockets_cables_good"
                            commentField="sockets_cables_good_comment"
                            yesNoValue={auditData.sockets_cables_good}
                            commentValue={auditData.sockets_cables_good_comment}
                            onYesNoChange={(value) => handleInputChange('sockets_cables_good', value)}
                            onCommentChange={(value) => handleInputChange('sockets_cables_good_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are faulty items reported and isolated?"
                            yesNoField="faulty_items_reported"
                            commentField="faulty_items_reported_comment"
                            yesNoValue={auditData.faulty_items_reported}
                            commentValue={auditData.faulty_items_reported_comment}
                            onYesNoChange={(value) => handleInputChange('faulty_items_reported', value)}
                            onCommentChange={(value) => handleInputChange('faulty_items_reported_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'kitchen-safety' && (
                      <div className="bg-emerald-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-emerald-900 mb-4">Kitchen and Food Safety</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is the kitchen clean and maintained to hygiene standards?"
                            yesNoField="kitchen_clean"
                            commentField="kitchen_clean_comment"
                            yesNoValue={auditData.kitchen_clean}
                            commentValue={auditData.kitchen_clean_comment}
                            onYesNoChange={(value) => handleInputChange('kitchen_clean', value)}
                            onCommentChange={(value) => handleInputChange('kitchen_clean_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are food hygiene practices followed (storage, temperatures)?"
                            yesNoField="food_hygiene_followed"
                            commentField="food_hygiene_followed_comment"
                            yesNoValue={auditData.food_hygiene_followed}
                            commentValue={auditData.food_hygiene_followed_comment}
                            onYesNoChange={(value) => handleInputChange('food_hygiene_followed', value)}
                            onCommentChange={(value) => handleInputChange('food_hygiene_followed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are cleaning schedules signed and followed?"
                            yesNoField="cleaning_schedules_signed"
                            commentField="cleaning_schedules_signed_comment"
                            yesNoValue={auditData.cleaning_schedules_signed}
                            commentValue={auditData.cleaning_schedules_signed_comment}
                            onYesNoChange={(value) => handleInputChange('cleaning_schedules_signed', value)}
                            onCommentChange={(value) => handleInputChange('cleaning_schedules_signed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is food stored appropriately and labelled?"
                            yesNoField="food_stored_appropriately"
                            commentField="food_stored_appropriately_comment"
                            yesNoValue={auditData.food_stored_appropriately}
                            commentValue={auditData.food_stored_appropriately_comment}
                            onYesNoChange={(value) => handleInputChange('food_stored_appropriately', value)}
                            onCommentChange={(value) => handleInputChange('food_stored_appropriately_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'water-legionella' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Water and Legionella</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is a legionella risk assessment in place?"
                            yesNoField="legionella_risk_assessment"
                            commentField="legionella_risk_assessment_comment"
                            yesNoValue={auditData.legionella_risk_assessment}
                            commentValue={auditData.legionella_risk_assessment_comment}
                            onYesNoChange={(value) => handleInputChange('legionella_risk_assessment', value)}
                            onCommentChange={(value) => handleInputChange('legionella_risk_assessment_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are water temperatures monitored and recorded?"
                            yesNoField="water_temps_monitored"
                            commentField="water_temps_monitored_comment"
                            yesNoValue={auditData.water_temps_monitored}
                            commentValue={auditData.water_temps_monitored_comment}
                            onYesNoChange={(value) => handleInputChange('water_temps_monitored', value)}
                            onCommentChange={(value) => handleInputChange('water_temps_monitored_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are showers and infrequently used outlets flushed as required?"
                            yesNoField="showers_taps_flushed"
                            commentField="showers_taps_flushed_comment"
                            yesNoValue={auditData.showers_taps_flushed}
                            commentValue={auditData.showers_taps_flushed_comment}
                            onYesNoChange={(value) => handleInputChange('showers_taps_flushed', value)}
                            onCommentChange={(value) => handleInputChange('showers_taps_flushed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff trained in water safety where appropriate?"
                            yesNoField="water_safety_training"
                            commentField="water_safety_training_comment"
                            yesNoValue={auditData.water_safety_training}
                            commentValue={auditData.water_safety_training_comment}
                            onYesNoChange={(value) => handleInputChange('water_safety_training', value)}
                            onCommentChange={(value) => handleInputChange('water_safety_training_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'environment-welfare' && (
                      <div className="bg-rose-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-rose-900 mb-4">Environment and Staff Welfare</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is the environment free from obvious hazards?"
                            yesNoField="environment_free_from_hazards"
                            commentField="environment_free_from_hazards_comment"
                            yesNoValue={auditData.environment_free_from_hazards}
                            commentValue={auditData.environment_free_from_hazards_comment}
                            onYesNoChange={(value) => handleInputChange('environment_free_from_hazards', value)}
                            onCommentChange={(value) => handleInputChange('environment_free_from_hazards_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff areas (rest rooms, lockers) safe and maintained?"
                            yesNoField="staff_areas_safe"
                            commentField="staff_areas_safe_comment"
                            yesNoValue={auditData.staff_areas_safe}
                            commentValue={auditData.staff_areas_safe_comment}
                            onYesNoChange={(value) => handleInputChange('staff_areas_safe', value)}
                            onCommentChange={(value) => handleInputChange('staff_areas_safe_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are break times and staff welfare managed appropriately?"
                            yesNoField="break_times_managed"
                            commentField="break_times_managed_comment"
                            yesNoValue={auditData.break_times_managed}
                            commentValue={auditData.break_times_managed_comment}
                            onYesNoChange={(value) => handleInputChange('break_times_managed', value)}
                            onCommentChange={(value) => handleInputChange('break_times_managed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are lone working policies in place and followed?"
                            yesNoField="lone_working_policies"
                            commentField="lone_working_policies_comment"
                            yesNoValue={auditData.lone_working_policies}
                            commentValue={auditData.lone_working_policies_comment}
                            onYesNoChange={(value) => handleInputChange('lone_working_policies', value)}
                            onCommentChange={(value) => handleInputChange('lone_working_policies_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'ppe-training' && (
                      <div className="bg-lime-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-lime-900 mb-4">PPE and Training</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is PPE available for staff?"
                            yesNoField="ppe_available"
                            commentField="ppe_available_comment"
                            yesNoValue={auditData.ppe_available}
                            commentValue={auditData.ppe_available_comment}
                            onYesNoChange={(value) => handleInputChange('ppe_available', value)}
                            onCommentChange={(value) => handleInputChange('ppe_available_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Is PPE stored cleanly and replaced as needed?"
                            yesNoField="ppe_stored_cleanly"
                            commentField="ppe_stored_cleanly_comment"
                            yesNoValue={auditData.ppe_stored_cleanly}
                            commentValue={auditData.ppe_stored_cleanly_comment}
                            onYesNoChange={(value) => handleInputChange('ppe_stored_cleanly', value)}
                            onCommentChange={(value) => handleInputChange('ppe_stored_cleanly_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff trained in correct use of PPE?"
                            yesNoField="staff_trained_ppe"
                            commentField="staff_trained_ppe_comment"
                            yesNoValue={auditData.staff_trained_ppe}
                            commentValue={auditData.staff_trained_ppe_comment}
                            onYesNoChange={(value) => handleInputChange('staff_trained_ppe', value)}
                            onCommentChange={(value) => handleInputChange('staff_trained_ppe_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'staff-training' && (
                      <div className="bg-cyan-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-cyan-900 mb-4">Staff Training and Supervision</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is staff health & safety training up to date?"
                            yesNoField="staff_hs_training_up_to_date"
                            commentField="staff_hs_training_up_to_date_comment"
                            yesNoValue={auditData.staff_hs_training_up_to_date}
                            commentValue={auditData.staff_hs_training_up_to_date_comment}
                            onYesNoChange={(value) => handleInputChange('staff_hs_training_up_to_date', value)}
                            onCommentChange={(value) => handleInputChange('staff_hs_training_up_to_date_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are new staff being trained in health & safety?"
                            yesNoField="new_staff_trained_hs"
                            commentField="new_staff_trained_hs_comment"
                            yesNoValue={auditData.new_staff_trained_hs}
                            commentValue={auditData.new_staff_trained_hs_comment}
                            onYesNoChange={(value) => handleInputChange('new_staff_trained_hs', value)}
                            onCommentChange={(value) => handleInputChange('new_staff_trained_hs_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are staff supervised and supported in their roles?"
                            yesNoField="staff_supervised_supported"
                            commentField="staff_supervised_supported_comment"
                            yesNoValue={auditData.staff_supervised_supported}
                            commentValue={auditData.staff_supervised_supported_comment}
                            onYesNoChange={(value) => handleInputChange('staff_supervised_supported', value)}
                            onCommentChange={(value) => handleInputChange('staff_supervised_supported_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are refresher trainings scheduled where needed?"
                            yesNoField="refresher_training_scheduled"
                            commentField="refresher_training_scheduled_comment"
                            yesNoValue={auditData.refresher_training_scheduled}
                            commentValue={auditData.refresher_training_scheduled_comment}
                            onYesNoChange={(value) => handleInputChange('refresher_training_scheduled', value)}
                            onCommentChange={(value) => handleInputChange('refresher_training_scheduled_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'notices-communication' && (
                      <div className="bg-fuchsia-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-fuchsia-900 mb-4">Notices, First Aid and Communication</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are warning and safety signs displayed where required?"
                            yesNoField="warning_signs_displayed"
                            commentField="warning_signs_displayed_comment"
                            yesNoValue={auditData.warning_signs_displayed}
                            commentValue={auditData.warning_signs_displayed_comment}
                            onYesNoChange={(value) => handleInputChange('warning_signs_displayed', value)}
                            onCommentChange={(value) => handleInputChange('warning_signs_displayed_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are first aid posters and information visible and accessible?"
                            yesNoField="first_aid_posters_visible"
                            commentField="first_aid_posters_visible_comment"
                            yesNoValue={auditData.first_aid_posters_visible}
                            commentValue={auditData.first_aid_posters_visible_comment}
                            onYesNoChange={(value) => handleInputChange('first_aid_posters_visible', value)}
                            onCommentChange={(value) => handleInputChange('first_aid_posters_visible_comment', value)}
                            {...yesNoSharedProps}
                          />
                          <YesNoQuestion
                            label="Are residents and visitors informed of relevant safety arrangements?"
                            yesNoField="residents_informed"
                            commentField="residents_informed_comment"
                            yesNoValue={auditData.residents_informed}
                            commentValue={auditData.residents_informed_comment}
                            onYesNoChange={(value) => handleInputChange('residents_informed', value)}
                            onCommentChange={(value) => handleInputChange('residents_informed_comment', value)}
                            {...yesNoSharedProps}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'final-comments' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Final Comments & Recommendations</label>
                              <div className="ml-4 relative">
                                {(attachments['finalComments']?.length ?? 0) > 0 && (
                                  <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                                    {attachments['finalComments']?.length ?? 0}
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
                                      handleAddAttachments('finalComments', e.target.files);
                                      e.currentTarget.value = '';
                                    }}
                                    className="hidden"
                                  />
                                  <span className="text-xl font-bold">+</span>
                                </label>
                              </div>
                            </div>
                            <Textarea
                              data-field="finalComments"
                              value={finalComments}
                              onChange={(e) => setFinalComments(e.target.value)}
                              className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
                              rows={6}
                              placeholder="Enter any additional comments or recommendations based on the health and safety audit findings..."
                            />
                            {(attachments['finalComments']?.length ?? 0) > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(attachments['finalComments'] ?? []).map((att) => (
                                  <div key={att.id} className="relative w-24 h-24 rounded overflow-hidden border border-gray-200">
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewAttachment({ url: att.url, name: att.name })}
                                      className="w-full h-full"
                                      title={att.name}
                                    >
                                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAttachment('finalComments', att.id)}
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
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Complete Audit Button */}
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