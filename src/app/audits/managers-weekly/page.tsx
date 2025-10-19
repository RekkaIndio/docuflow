'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, saveAuditSnapshot, getMonthlyAuditSnapshots, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ManagersWeeklyData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // 1 Environment & Cleanliness
  communal_areas_clean: string;
  communal_areas_clean_comment: string;
  bedrooms_clean: string;
  bedrooms_clean_comment: string;
  toilets_bathrooms_clean: string;
  toilets_bathrooms_clean_comment: string;
  floors_furniture_good: string;
  floors_furniture_good_comment: string;
  cleaning_trolleys_stored: string;
  cleaning_trolleys_stored_comment: string;

  // 2 IPC
  sanitisers_working: string;
  sanitisers_working_comment: string;
  staff_using_ppe: string;
  staff_using_ppe_comment: string;
  gloves_aprons_available: string;
  gloves_aprons_available_comment: string;
  waste_bins_ok: string;
  waste_bins_ok_comment: string;
  cleaning_schedules_visible: string;
  cleaning_schedules_visible_comment: string;

  // 3 Health & Safety
  fire_exits_clear: string;
  fire_exits_clear_comment: string;
  corridors_free_of_trip_hazards: string;
  corridors_free_of_trip_hazards_comment: string;
  mobility_aids_stored: string;
  mobility_aids_stored_comment: string;
  call_bells_working: string;
  call_bells_working_comment: string;
  broken_items_hazards: string;
  broken_items_hazards_comment: string;

  // 4 Resident Experience
  residents_engaged_dressed: string;
  residents_engaged_dressed_comment: string;
  staff_respectful_interactions: string;
  staff_respectful_interactions_comment: string;
  residents_offered_fluids: string;
  residents_offered_fluids_comment: string;
  mealtimes_well_supported: string;
  mealtimes_well_supported_comment: string;
  activities_visible: string;
  activities_visible_comment: string;

  // 5 Staff Practice
  staff_uniforms_id: string;
  staff_uniforms_id_comment: string;
  staff_communicate_professionally: string;
  staff_communicate_professionally_comment: string;
  shift_leaders_aware: string;
  shift_leaders_aware_comment: string;
  staff_breaks_appropriate: string;
  staff_breaks_appropriate_comment: string;
  handovers_private_structured: string;
  handovers_private_structured_comment: string;

  // 6 Medication
  med_trolleys_locked: string;
  med_trolleys_locked_comment: string;
  med_room_tidy_locked: string;
  med_room_tidy_locked_comment: string;
  fridge_temps_recorded: string;
  fridge_temps_recorded_comment: string;
  mar_charts_up_to_date: string;
  mar_charts_up_to_date_comment: string;
  staff_administering_safely: string;
  staff_administering_safely_comment: string;

  // 7 Kitchen / Dining Areas
  dining_area_clean: string;
  dining_area_clean_comment: string;
  kitchenettes_clean: string;
  kitchenettes_clean_comment: string;
  fridges_freezers_safe: string;
  fridges_freezers_safe_comment: string;
  food_items_dated: string;
  food_items_dated_comment: string;

  // 8 Laundry
  laundry_area_clean: string;
  laundry_area_clean_comment: string;
  clean_dirty_separated: string;
  clean_dirty_separated_comment: string;
  trolleys_labelled: string;
  trolleys_labelled_comment: string;

  // 9 Documentation & Records
  daily_notes_up_to_date: string;
  daily_notes_up_to_date_comment: string;
  fluid_food_charts_completed: string;
  fluid_food_charts_completed_comment: string;
  repositioning_charts_filled: string;
  repositioning_charts_filled_comment: string;
  cleaning_maintenance_logs_updated: string;
  cleaning_maintenance_logs_updated_comment: string;

  // 10 Repairs & Maintenance
  visible_repairs_needed: string;
  visible_repairs_needed_comment: string;
  window_restrictors_ok: string;
  window_restrictors_ok_comment: string;
  previous_issues_resolved: string;
  previous_issues_resolved_comment: string;
  communal_outdoor_safe: string;
  communal_outdoor_safe_comment: string;
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
  field: keyof ManagersWeeklyData;
  commentField: keyof ManagersWeeklyData;
  value: string;
  commentValue: string;
  onValueChange: (field: keyof ManagersWeeklyData, value: string) => void;
  onCommentChange: (field: keyof ManagersWeeklyData, value: string) => void;
  attachments: Record<string, AttachmentItem[]>;
  onAddAttachments: (fieldName: string, files: FileList | null) => void;
  onRemoveAttachment: (fieldName: string, attachmentId: string) => void;
  onPreviewAttachment: (attachment: { url: string; name: string }) => void;
  isFieldInvalid: (fieldName: string) => boolean;
}

const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  label,
  field,
  commentField,
  value,
  commentValue,
  onValueChange,
  onCommentChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onPreviewAttachment,
  isFieldInvalid,
}) => {
  const fieldKey = field as string;
  const commentKey = commentField as string;
  const attachmentList = attachments[fieldKey] ?? [];

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200" data-field={fieldKey}>
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
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="Yes"
                checked={value === 'Yes'}
                onChange={(e) => onValueChange(field, e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="No"
                checked={value === 'No'}
                onChange={(e) => onValueChange(field, e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
                value="N/A"
                checked={value === 'N/A'}
                onChange={(e) => onValueChange(field, e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">N/A</span>
            </label>
          </div>
          {isFieldInvalid(fieldKey) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue || ''}
            onChange={(e) => onCommentChange(commentField, e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
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
      </div>
    </div>
  );
};

export default function ManagersWeeklyAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports, setTotalReports] = useState(1);
  const emptyReport = (): ManagersWeeklyData => ({
    home: '',
    date: '',
    personCompletingAudit: '',

    communal_areas_clean: '',
    communal_areas_clean_comment: '',
    bedrooms_clean: '',
    bedrooms_clean_comment: '',
    toilets_bathrooms_clean: '',
    toilets_bathrooms_clean_comment: '',
    floors_furniture_good: '',
    floors_furniture_good_comment: '',
    cleaning_trolleys_stored: '',
    cleaning_trolleys_stored_comment: '',

    sanitisers_working: '',
    sanitisers_working_comment: '',
    staff_using_ppe: '',
    staff_using_ppe_comment: '',
    gloves_aprons_available: '',
    gloves_aprons_available_comment: '',
    waste_bins_ok: '',
    waste_bins_ok_comment: '',
    cleaning_schedules_visible: '',
    cleaning_schedules_visible_comment: '',

    fire_exits_clear: '',
    fire_exits_clear_comment: '',
    corridors_free_of_trip_hazards: '',
    corridors_free_of_trip_hazards_comment: '',
    mobility_aids_stored: '',
    mobility_aids_stored_comment: '',
    call_bells_working: '',
    call_bells_working_comment: '',
    broken_items_hazards: '',
    broken_items_hazards_comment: '',

    residents_engaged_dressed: '',
    residents_engaged_dressed_comment: '',
    staff_respectful_interactions: '',
    staff_respectful_interactions_comment: '',
    residents_offered_fluids: '',
    residents_offered_fluids_comment: '',
    mealtimes_well_supported: '',
    mealtimes_well_supported_comment: '',
    activities_visible: '',
    activities_visible_comment: '',

    staff_uniforms_id: '',
    staff_uniforms_id_comment: '',
    staff_communicate_professionally: '',
    staff_communicate_professionally_comment: '',
    shift_leaders_aware: '',
    shift_leaders_aware_comment: '',
    staff_breaks_appropriate: '',
    staff_breaks_appropriate_comment: '',
    handovers_private_structured: '',
    handovers_private_structured_comment: '',

    med_trolleys_locked: '',
    med_trolleys_locked_comment: '',
    med_room_tidy_locked: '',
    med_room_tidy_locked_comment: '',
    fridge_temps_recorded: '',
    fridge_temps_recorded_comment: '',
    mar_charts_up_to_date: '',
    mar_charts_up_to_date_comment: '',
    staff_administering_safely: '',
    staff_administering_safely_comment: '',

    dining_area_clean: '',
    dining_area_clean_comment: '',
    kitchenettes_clean: '',
    kitchenettes_clean_comment: '',
    fridges_freezers_safe: '',
    fridges_freezers_safe_comment: '',
    food_items_dated: '',
    food_items_dated_comment: '',

    laundry_area_clean: '',
    laundry_area_clean_comment: '',
    clean_dirty_separated: '',
    clean_dirty_separated_comment: '',
    trolleys_labelled: '',
    trolleys_labelled_comment: '',

    daily_notes_up_to_date: '',
    daily_notes_up_to_date_comment: '',
    fluid_food_charts_completed: '',
    fluid_food_charts_completed_comment: '',
    repositioning_charts_filled: '',
    repositioning_charts_filled_comment: '',
    cleaning_maintenance_logs_updated: '',
    cleaning_maintenance_logs_updated_comment: '',

    visible_repairs_needed: '',
    visible_repairs_needed_comment: '',
    window_restrictors_ok: '',
    window_restrictors_ok_comment: '',
    previous_issues_resolved: '',
    previous_issues_resolved_comment: '',
    communal_outdoor_safe: '',
    communal_outdoor_safe_comment: '',
  });
  const [reports, setReports] = useState<ManagersWeeklyData[]>([emptyReport()]);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'environment-cleanliness': true,
    'ipc': false,
    'health-safety': false,
    'resident-experience': false,
    'staff-practice': false,
    'medication': false,
    'kitchen-dining': false,
    'laundry': false,
    'documentation-records': false,
    'repairs-maintenance': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'environment-cleanliness',
      title: 'Environment & Cleanliness',
      color: 'green',
      guidance: 'Assess the overall cleanliness and maintenance of communal areas, bedrooms, bathrooms, and general facilities. Check for odours, clutter, and proper storage of cleaning equipment.',
      questions: [
        { field: 'communal_areas_clean', label: 'Are all communal areas clean, tidy, and free from odours?' },
        { field: 'bedrooms_clean', label: 'Are bedrooms visibly clean, with fresh linen and tidy surfaces?' },
        { field: 'toilets_bathrooms_clean', label: 'Are toilets and bathrooms clean, stocked with soap and paper towels?' },
        { field: 'floors_furniture_good', label: 'Are floors, carpets, and furniture in good condition and free from clutter?' },
        { field: 'cleaning_trolleys_stored', label: 'Are cleaning trolleys stored safely and not left unattended?' },
      ]
    },
    {
      id: 'ipc',
      title: 'Infection Prevention & Control (IPC)',
      color: 'yellow',
      guidance: 'Evaluate infection control measures including hand hygiene stations, PPE usage, waste management, and cleaning protocols.',
      questions: [
        { field: 'sanitisers_working', label: 'Are hand sanitiser stations full and working?' },
        { field: 'staff_using_ppe', label: 'Are staff using correct PPE for the task?' },
        { field: 'gloves_aprons_available', label: 'Are gloves and aprons available and used appropriately?' },
        { field: 'waste_bins_ok', label: 'Are clinical and domestic waste bins not overflowing and correctly labelled?' },
        { field: 'cleaning_schedules_visible', label: 'Are cleaning schedules visible and up to date?' },
      ]
    },
    {
      id: 'health-safety',
      title: 'Health & Safety',
      color: 'pink',
      guidance: 'Check for safety hazards, emergency equipment functionality, and proper storage of mobility aids and equipment.',
      questions: [
        { field: 'fire_exits_clear', label: 'Are fire exits unobstructed and clearly marked?' },
        { field: 'corridors_free_of_trip_hazards', label: 'Are corridors and walkways free from trip hazards?' },
        { field: 'mobility_aids_stored', label: 'Are wheelchairs, hoists, and mobility aids stored safely?' },
        { field: 'call_bells_working', label: 'Are nurse call bells within reach of residents and working?' },
        { field: 'broken_items_hazards', label: 'Are there any broken items or hazards requiring repair?' },
      ]
    },
    {
      id: 'resident-experience',
      title: 'Resident Experience',
      color: 'amber',
      guidance: 'Observe resident engagement, staff interactions, mealtime support, and activity provision to ensure person-centred care.',
      questions: [
        { field: 'residents_engaged_dressed', label: 'Are residents engaged and appropriately dressed for the time of day?' },
        { field: 'staff_respectful_interactions', label: 'Are interactions between staff and residents respectful and person-centred?' },
        { field: 'residents_offered_fluids', label: 'Are residents offered fluids/snacks regularly?' },
        { field: 'mealtimes_well_supported', label: 'Are mealtimes calm, dignified, and well-supported (if observed)?' },
        { field: 'activities_visible', label: 'Are activity schedules visible and up to date?' },
      ]
    },
    {
      id: 'staff-practice',
      title: 'Staff Practice',
      color: 'indigo',
      guidance: 'Assess staff presentation, communication standards, leadership awareness, break management, and handover procedures.',
      questions: [
        { field: 'staff_uniforms_id', label: 'Are staff wearing correct uniforms and ID badges?' },
        { field: 'staff_communicate_professionally', label: 'Are staff communicating professionally and kindly?' },
        { field: 'shift_leaders_aware', label: 'Are shift leaders aware of any key changes/risks for the day?' },
        { field: 'staff_breaks_appropriate', label: 'Are staff breaks being taken appropriately (not leaving units short)?' },
        { field: 'handovers_private_structured', label: 'Are handovers taking place in a private and structured manner?' },
      ]
    },
    {
      id: 'medication',
      title: 'Medication',
      color: 'pink',
      guidance: 'Verify medication storage security, temperature control, record keeping, and safe administration practices.',
      questions: [
        { field: 'med_trolleys_locked', label: 'Are medication trolleys locked and stored securely?' },
        { field: 'med_room_tidy_locked', label: 'Is the medication room tidy, locked, and within temperature range?' },
        { field: 'fridge_temps_recorded', label: 'Are fridge temperatures recorded daily and in range?' },
        { field: 'mar_charts_up_to_date', label: 'Are MAR charts correctly stored and up to date?' },
        { field: 'staff_administering_safely', label: 'Are staff administering medication safely and respectfully (if observed)?' },
      ]
    },
    {
      id: 'kitchen-dining',
      title: 'Kitchen / Dining Areas',
      color: 'amber',
      guidance: 'Check kitchen cleanliness, food storage practices, temperature control, and dining area presentation.',
      questions: [
        { field: 'dining_area_clean', label: 'Is the dining area clean, with tables set appropriately?' },
        { field: 'kitchenettes_clean', label: 'Are kitchenettes clean and food safely stored?' },
        { field: 'fridges_freezers_safe', label: 'Are fridges/freezers in kitchenettes within safe temperature range?' },
        { field: 'food_items_dated', label: 'Are food items dated and labelled properly?' },
      ]
    },
    {
      id: 'laundry',
      title: 'Laundry',
      color: 'pink',
      guidance: 'Inspect laundry area cleanliness, equipment functionality, and separation of clean/dirty items.',
      questions: [
        { field: 'laundry_area_clean', label: 'Is the laundry area clean, organised, and equipment functioning?' },
        { field: 'clean_dirty_separated', label: 'Are clean and dirty items clearly separated?' },
        { field: 'trolleys_labelled', label: 'Are trolleys and baskets labelled and used correctly?' },
      ]
    },
    {
      id: 'documentation-records',
      title: 'Documentation & Records',
      color: 'green',
      guidance: 'Review care documentation, fluid/food charts, repositioning records, and maintenance logs for completeness and accuracy.',
      questions: [
        { field: 'daily_notes_up_to_date', label: 'Are daily notes up to date and person-centred?' },
        { field: 'fluid_food_charts_completed', label: 'Are fluid and food charts completed properly?' },
        { field: 'repositioning_charts_filled', label: 'Are repositioning/turn charts filled in as per plan?' },
        { field: 'cleaning_maintenance_logs_updated', label: 'Are cleaning and maintenance logs updated?' },
      ]
    },
    {
      id: 'repairs-maintenance',
      title: 'Repairs & Maintenance',
      color: 'yellow',
      guidance: 'Identify any maintenance issues, check safety features, and verify resolution of previous maintenance concerns.',
      questions: [
        { field: 'visible_repairs_needed', label: 'Are there any visible repairs needed (lights, doors, fixtures)?' },
        { field: 'window_restrictors_ok', label: 'Are window restrictors and safety features in place?' },
        { field: 'previous_issues_resolved', label: 'Have any maintenance issues from previous audits been resolved?' },
        { field: 'communal_outdoor_safe', label: 'Are communal and outdoor areas safe and tidy?' },
      ]
    },
  ];

  const [data, setData] = useState<ManagersWeeklyData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    communal_areas_clean: '',
    communal_areas_clean_comment: '',
    bedrooms_clean: '',
    bedrooms_clean_comment: '',
    toilets_bathrooms_clean: '',
    toilets_bathrooms_clean_comment: '',
    floors_furniture_good: '',
    floors_furniture_good_comment: '',
    cleaning_trolleys_stored: '',
    cleaning_trolleys_stored_comment: '',

    sanitisers_working: '',
    sanitisers_working_comment: '',
    staff_using_ppe: '',
    staff_using_ppe_comment: '',
    gloves_aprons_available: '',
    gloves_aprons_available_comment: '',
    waste_bins_ok: '',
    waste_bins_ok_comment: '',
    cleaning_schedules_visible: '',
    cleaning_schedules_visible_comment: '',

    fire_exits_clear: '',
    fire_exits_clear_comment: '',
    corridors_free_of_trip_hazards: '',
    corridors_free_of_trip_hazards_comment: '',
    mobility_aids_stored: '',
    mobility_aids_stored_comment: '',
    call_bells_working: '',
    call_bells_working_comment: '',
    broken_items_hazards: '',
    broken_items_hazards_comment: '',

    residents_engaged_dressed: '',
    residents_engaged_dressed_comment: '',
    staff_respectful_interactions: '',
    staff_respectful_interactions_comment: '',
    residents_offered_fluids: '',
    residents_offered_fluids_comment: '',
    mealtimes_well_supported: '',
    mealtimes_well_supported_comment: '',
    activities_visible: '',
    activities_visible_comment: '',

    staff_uniforms_id: '',
    staff_uniforms_id_comment: '',
    staff_communicate_professionally: '',
    staff_communicate_professionally_comment: '',
    shift_leaders_aware: '',
    shift_leaders_aware_comment: '',
    staff_breaks_appropriate: '',
    staff_breaks_appropriate_comment: '',
    handovers_private_structured: '',
    handovers_private_structured_comment: '',

    med_trolleys_locked: '',
    med_trolleys_locked_comment: '',
    med_room_tidy_locked: '',
    med_room_tidy_locked_comment: '',
    fridge_temps_recorded: '',
    fridge_temps_recorded_comment: '',
    mar_charts_up_to_date: '',
    mar_charts_up_to_date_comment: '',
    staff_administering_safely: '',
    staff_administering_safely_comment: '',

    dining_area_clean: '',
    dining_area_clean_comment: '',
    kitchenettes_clean: '',
    kitchenettes_clean_comment: '',
    fridges_freezers_safe: '',
    fridges_freezers_safe_comment: '',
    food_items_dated: '',
    food_items_dated_comment: '',

    laundry_area_clean: '',
    laundry_area_clean_comment: '',
    clean_dirty_separated: '',
    clean_dirty_separated_comment: '',
    trolleys_labelled: '',
    trolleys_labelled_comment: '',

    daily_notes_up_to_date: '',
    daily_notes_up_to_date_comment: '',
    fluid_food_charts_completed: '',
    fluid_food_charts_completed_comment: '',
    repositioning_charts_filled: '',
    repositioning_charts_filled_comment: '',
    cleaning_maintenance_logs_updated: '',
    cleaning_maintenance_logs_updated_comment: '',

    visible_repairs_needed: '',
    visible_repairs_needed_comment: '',
    window_restrictors_ok: '',
    window_restrictors_ok_comment: '',
    previous_issues_resolved: '',
    previous_issues_resolved_comment: '',
    communal_outdoor_safe: '',
    communal_outdoor_safe_comment: '',
  });

  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');
  const [savedCount, setSavedCount] = useState(0);
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
          'managers-weekly',
          undefined,
          activeWorkspace.organisationId || null
        );
        if (existingData) {
          const { attachments: storedAttachments, comments, ...formData } = existingData as any;
          // Populate the first report with the previously saved data
          setReports(prev => {
            const copy = [...prev];
            const base = copy[0] ? { ...copy[0] } : emptyReport();
            copy[0] = { ...base, ...formData } as ManagersWeeklyData;
            return copy;
          });
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
        console.error('Failed to load existing managers-weekly audit data:', error);
      }
    };

    loadExistingAuditData();
    return () => { cancelled = true; };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  // Helper functions
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const fieldHasError = useCallback((fieldName: string) => errors.includes(fieldName), [errors]);

  const getFieldClassName = useCallback(
    (fieldName: string, baseClassName: string) => (
      fieldHasError(fieldName)
        ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
        : baseClassName
    ),
    [fieldHasError]
  );

  const handleChange = (field: keyof ManagersWeeklyData, value: string) => {
    // update active report in reports array and local data
    setReports(prev => {
      const copy = [...prev];
      const idx = currentReport - 1;
      const base = copy[idx] ? { ...copy[idx] } : emptyReport();
      base[field] = value;
      copy[idx] = base as ManagersWeeklyData;
      return copy;
    });
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
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
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const report = reports[currentReport - 1] ?? data;
  const auditDateSegment = (report?.date || data.date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId
      ? `organisations/${orgId}/workspaces/${activeWorkspace.id}`
      : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/managers-weekly/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  const validateForm = () => {
    const required: (keyof ManagersWeeklyData)[] = [
      'home','date','personCompletingAudit',
      'communal_areas_clean','bedrooms_clean','toilets_bathrooms_clean','floors_furniture_good','cleaning_trolleys_stored',
      'sanitisers_working','staff_using_ppe','gloves_aprons_available','waste_bins_ok','cleaning_schedules_visible',
      'fire_exits_clear','corridors_free_of_trip_hazards','mobility_aids_stored','call_bells_working','broken_items_hazards',
      'residents_engaged_dressed','staff_respectful_interactions','residents_offered_fluids','mealtimes_well_supported','activities_visible',
      'staff_uniforms_id','staff_communicate_professionally','shift_leaders_aware','staff_breaks_appropriate','handovers_private_structured',
      'med_trolleys_locked','med_room_tidy_locked','fridge_temps_recorded','mar_charts_up_to_date','staff_administering_safely',
      'dining_area_clean','kitchenettes_clean','fridges_freezers_safe','food_items_dated',
      'laundry_area_clean','clean_dirty_separated','trolleys_labelled',
      'daily_notes_up_to_date','fluid_food_charts_completed','repositioning_charts_filled','cleaning_maintenance_logs_updated',
      'visible_repairs_needed','window_restrictors_ok','previous_issues_resolved','communal_outdoor_safe'
    ];

    const active = reports[currentReport - 1] ?? data;
    const missing = required.filter(f => !active[f].trim());
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

  const handleModalCreate = async (createActionPlan: boolean) => {
    setShowModal(false);
    if (!activeWorkspace?.id) return alert('No active workspace selected. Please choose a workspace before saving audits.');

  const reportData = reports[currentReport - 1] ?? data;
    const tally = Object.keys(reportData).reduce(
      (acc, key) => {
        const value = (reportData as any)[key];
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
      ...reportData,
      ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: user?.id ?? null,
      workspaceId: activeWorkspace.id,
      organisationId: orgId,
      auditType: 'managers-weekly',
      yesCount: tally.yesCount,
      totalCount: tally.totalCount,
      scorePercent,
      submittedReportNumber: currentReport,
    };

    try {
      setSaving(true);
      // Save to audits collection
      const id = await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
      setSavedAuditId(id);

  // update attachment state after successful save
  setAttachments(nextAttachmentState);
  setAttachmentsToDelete([]);
  setPreviewImage(null);

      // Also save a monthly snapshot for tracking weekly reports
      const snapshotId = await saveAuditSnapshot(activeWorkspace.id, 'managers-weekly', payload);

      // Re-read snapshots to compute progress
      const snapshots = await getMonthlyAuditSnapshots(activeWorkspace.id, undefined, activeWorkspace.organisationId || null);
      const count = (snapshots && Array.isArray(snapshots['managers-weekly'])) ? snapshots['managers-weekly'].length : 0;
      setSavedCount(count);

      const completedAt = (reports[currentReport - 1]?.date) || new Date().toISOString();
      // If this was the 4th saved report this month, run the full completion workflow
      if (count >= 4) {
        try {
          await markAuditCompletedWithSnapshot(activeWorkspace.id, 'managers-weekly', payload, completedAt);
          alert('Audit saved — monthly weekly audit complete (snapshot, PDF and action plans generated)');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to mark managers-weekly audit complete with snapshot', err);
          alert('Audit saved but failed to generate snapshot/pdf/action plans');
        }
      } else {
        alert(`Audit saved — progress ${count}/4`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save managers-weekly audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const addNewReport = () => {
    // increment visible report slots (up to 4) and reset form for next report
    setTotalReports(prev => Math.min(4, prev + 1));

    setData({
      home: '',
      date: '',
      personCompletingAudit: '',

      communal_areas_clean: '',
      communal_areas_clean_comment: '',
      bedrooms_clean: '',
      bedrooms_clean_comment: '',
      toilets_bathrooms_clean: '',
      toilets_bathrooms_clean_comment: '',
      floors_furniture_good: '',
      floors_furniture_good_comment: '',
      cleaning_trolleys_stored: '',
      cleaning_trolleys_stored_comment: '',

      sanitisers_working: '',
      sanitisers_working_comment: '',
      staff_using_ppe: '',
      staff_using_ppe_comment: '',
      gloves_aprons_available: '',
      gloves_aprons_available_comment: '',
      waste_bins_ok: '',
      waste_bins_ok_comment: '',
      cleaning_schedules_visible: '',
      cleaning_schedules_visible_comment: '',

      fire_exits_clear: '',
      fire_exits_clear_comment: '',
      corridors_free_of_trip_hazards: '',
      corridors_free_of_trip_hazards_comment: '',
      mobility_aids_stored: '',
      mobility_aids_stored_comment: '',
      call_bells_working: '',
      call_bells_working_comment: '',
      broken_items_hazards: '',
      broken_items_hazards_comment: '',

      residents_engaged_dressed: '',
      residents_engaged_dressed_comment: '',
      staff_respectful_interactions: '',
      staff_respectful_interactions_comment: '',
      residents_offered_fluids: '',
      residents_offered_fluids_comment: '',
      mealtimes_well_supported: '',
      mealtimes_well_supported_comment: '',
      activities_visible: '',
      activities_visible_comment: '',

      staff_uniforms_id: '',
      staff_uniforms_id_comment: '',
      staff_communicate_professionally: '',
      staff_communicate_professionally_comment: '',
      shift_leaders_aware: '',
      shift_leaders_aware_comment: '',
      staff_breaks_appropriate: '',
      staff_breaks_appropriate_comment: '',
      handovers_private_structured: '',
      handovers_private_structured_comment: '',

      med_trolleys_locked: '',
      med_trolleys_locked_comment: '',
      med_room_tidy_locked: '',
      med_room_tidy_locked_comment: '',
      fridge_temps_recorded: '',
      fridge_temps_recorded_comment: '',
      mar_charts_up_to_date: '',
      mar_charts_up_to_date_comment: '',
      staff_administering_safely: '',
      staff_administering_safely_comment: '',

      dining_area_clean: '',
      dining_area_clean_comment: '',
      kitchenettes_clean: '',
      kitchenettes_clean_comment: '',
      fridges_freezers_safe: '',
      fridges_freezers_safe_comment: '',
      food_items_dated: '',
      food_items_dated_comment: '',

      laundry_area_clean: '',
      laundry_area_clean_comment: '',
      clean_dirty_separated: '',
      clean_dirty_separated_comment: '',
      trolleys_labelled: '',
      trolleys_labelled_comment: '',

      daily_notes_up_to_date: '',
      daily_notes_up_to_date_comment: '',
      fluid_food_charts_completed: '',
      fluid_food_charts_completed_comment: '',
      repositioning_charts_filled: '',
      repositioning_charts_filled_comment: '',
      cleaning_maintenance_logs_updated: '',
      cleaning_maintenance_logs_updated_comment: '',

      visible_repairs_needed: '',
      visible_repairs_needed_comment: '',
      window_restrictors_ok: '',
      window_restrictors_ok_comment: '',
      previous_issues_resolved: '',
      previous_issues_resolved_comment: '',
      communal_outdoor_safe: '',
      communal_outdoor_safe_comment: '',
    });
  setAttachments({});
  setAttachmentsToDelete([]);
  setPreviewImage(null);
  setErrors([]);
  };

  // Load saved snapshot count for this month
  React.useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      if (!activeWorkspace?.id) return;
      try {
        const snaps = await getMonthlyAuditSnapshots(activeWorkspace.id, undefined, activeWorkspace.organisationId || null);
        const count = (snaps && Array.isArray(snaps['managers-weekly'])) ? snaps['managers-weekly'].length : 0;
        if (mounted) setSavedCount(count);
      } catch (e) {
        console.warn('Failed to load managers-weekly snapshot count', e);
      }
    };
    loadCount();
    return () => { mounted = false; };
  }, [activeWorkspace?.id]);

  // Sync the `data` object with currently selected report to keep validation and other logic consistent
  React.useEffect(() => {
    const active = reports[currentReport - 1] ?? emptyReport();
    setData(active);
  }, [currentReport, reports]);

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

  const activeReport = reports[currentReport - 1] ?? data;

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Weekly Managers Walkaround Audit</h1>
          <p className="mb-4 text-slate-500">Comprehensive weekly assessment of care home operations. All fields required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                name="home"
                value={activeReport.home}
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
                value={activeReport.date}
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
                value={activeReport.personCompletingAudit}
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
                      {section.questions.map((question) => {
                        const fieldKey = question.field as keyof ManagersWeeklyData;
                        const commentKey = `${question.field}_comment` as keyof ManagersWeeklyData;
                        return (
                          <YesNoQuestion
                            key={question.field}
                            label={question.label}
                            field={fieldKey}
                            commentField={commentKey}
                            value={activeReport[fieldKey] ?? ''}
                            commentValue={activeReport[commentKey] ?? ''}
                            onValueChange={handleChange}
                            onCommentChange={handleChange}
                            attachments={attachments}
                            onAddAttachments={handleAddAttachments}
                            onRemoveAttachment={handleRemoveAttachment}
                            onPreviewAttachment={handlePreviewAttachment}
                            isFieldInvalid={fieldHasError}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Comments Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Final Comments</label>
              <Textarea
                value={finalComments}
                onChange={(e) => setFinalComments(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200"
                placeholder="Add any final comments or observations for this audit"
              />
            </div>

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCurrentReport(prev => Math.max(1, prev - 1))} className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm" title="Previous report" disabled={currentReport <= 1}>
                    ‹
                  </button>
                  <div className="text-sm text-gray-600 mr-2">Report {currentReport}/{totalReports}</div>
                  <button type="button" onClick={() => setCurrentReport(prev => Math.min(totalReports, prev + 1))} className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm" title="Next report" disabled={currentReport >= totalReports}>
                    ›
                  </button>
                </div>
                <button type="button" onClick={() => addNewReport()} className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm" title="Add next report" disabled={totalReports >= 4}>
                  +
                </button>
                <Button type="submit" className="px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 font-medium disabled:opacity-50" disabled={saving}>
                  {saving ? 'Saving...' : 'Complete Audit'}
                </Button>
              </div>
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
