'use client';
import React, { useState } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

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

export default function ManagersWeeklyAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
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

  const handleChange = (field: keyof ManagersWeeklyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  const YesNoQuestion = ({ field, label }: { field: string; label: string }) => {
    const yesNoField = field as keyof ManagersWeeklyData;
    const hasError = getFieldError(field);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex gap-4 items-center" data-field={field}>
          <label className="flex items-center">
            <input
              type="radio"
              name={field}
              value="Yes"
              checked={data[yesNoField] === 'Yes'}
              onChange={(e) => handleChange(yesNoField, e.target.value)}
              className="mr-2"
            />
            Yes
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={field}
              value="No"
              checked={data[yesNoField] === 'No'}
              onChange={(e) => handleChange(yesNoField, e.target.value)}
              className="mr-2"
            />
            No
          </label>
        </div>
        {hasError && <p className="text-red-500 text-sm">This field is required</p>}
      </div>
    );
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

  const handleModalCreate = async (createActionPlan: boolean) => {
    setShowModal(false);
    if (!activeWorkspace?.id) return alert('No active workspace selected. Please choose a workspace before saving audits.');

    const payload = {
      ...data,
      comments: finalComments,
      createActionPlan: !!createActionPlan,
  createdBy: user?.id ?? null,
      workspaceId: activeWorkspace.id,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, activeWorkspace.id);
      setSavedAuditId(id);
      const completedAt = data.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspace.id, 'managers-weekly', completedAt);
      alert('Audit saved');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save managers-weekly audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const addNewReport = () => {
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

    setErrors([]);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Weekly Managers Walkaround Audit</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Comprehensive weekly assessment of care home operations, covering environment, safety, resident experience, and staff practices.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Audit Information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
                  <input
                    value={data.home}
                    data-field="home"
                    onChange={(e) => handleChange('home', e.target.value)}
                    className={getFieldClassName('home')}
                    placeholder="Enter home name"
                  />
                  {getFieldError('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={data.date}
                    data-field="date"
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={getFieldClassName('date')}
                  />
                  {getFieldError('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
                  <input
                    value={data.personCompletingAudit}
                    data-field="personCompletingAudit"
                    onChange={(e) => handleChange('personCompletingAudit', e.target.value)}
                    className={getFieldClassName('personCompletingAudit')}
                    placeholder="Enter auditor name"
                  />
                  {getFieldError('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
              </div>

              {/* Report Navigation */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentReport(Math.max(1, currentReport - 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={currentReport === 1}
                    >
                      ←
                    </button>
                    <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
                    <button
                      onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={currentReport === totalReports}
                    >
                      →
                    </button>
                  </div>
                  <button
                    onClick={addNewReport}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Audit Sections */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      section.color === 'green' ? 'border-l-4 border-green-500' :
                      section.color === 'yellow' ? 'border-l-4 border-yellow-500' :
                      section.color === 'pink' ? 'border-l-4 border-pink-500' :
                      section.color === 'amber' ? 'border-l-4 border-amber-500' :
                      'border-l-4 border-indigo-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        section.color === 'green' ? 'bg-green-500' :
                        section.color === 'yellow' ? 'bg-yellow-500' :
                        section.color === 'pink' ? 'bg-pink-500' :
                        section.color === 'amber' ? 'bg-amber-500' :
                        'bg-indigo-500'
                      }`} />
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    {openSections[section.id] ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {openSections[section.id] && (
                    <div className="px-6 pb-6">
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{section.guidance}</p>
                      </div>

                      <div className="space-y-6">
                        {section.questions.map((question) => (
                          <YesNoQuestion
                            key={question.field}
                            field={question.field}
                            label={question.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Final Comments */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Comments</h3>
                <textarea
                  value={finalComments}
                  onChange={(e) => setFinalComments(e.target.value)}
                  rows={4}
                  placeholder="Add any final comments or observations for this audit"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Complete Audit Button */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleComplete}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  Complete Audit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
              <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  No, thanks
                </button>
                <button
                  onClick={() => handleModalCreate(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {saving ? 'Saving...' : 'Save Audit'}
                </button>
                <button
                  onClick={() => handleModalCreate(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  {saving ? 'Saving...' : 'Save & Create Action Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
