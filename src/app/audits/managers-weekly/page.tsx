'use client';
import React, { useState } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';

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

  const handleChange = (field: keyof ManagersWeeklyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  const YesNoQuestion = ({ label, yesNoField, commentField, yesNoValue, commentValue, onYesNoChange, onCommentChange }: { label: string; yesNoField: string; commentField: string; yesNoValue: string; commentValue: string; onYesNoChange: (v: string) => void; onCommentChange: (v: string) => void; }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-4 items-center" data-field={yesNoField}>
        <label className="flex items-center"><input type="radio" name={yesNoField} value="Yes" checked={yesNoValue === 'Yes'} onChange={(e) => onYesNoChange(e.target.value)} className="mr-2" />Yes</label>
        <label className="flex items-center"><input type="radio" name={yesNoField} value="No" checked={yesNoValue === 'No'} onChange={(e) => onYesNoChange(e.target.value)} className="mr-2" />No</label>
      </div>
      {errors.includes(yesNoField) && <p className="text-red-500 text-sm">This field is required</p>}
      {/* per-question comments removed — single final comments box is provided at the end of the page */}
    </div>
  );

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
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Managers Walkaround Audit</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentReport(Math.max(1, currentReport - 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === 1}>←</button>
              <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
              <button onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === totalReports}>→</button>
            </div>
            <div className="bg-red-500 p-2 rounded"><button onClick={addNewReport} className="text-white">+</button></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Audit Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
              <input value={data.home} data-field="home" onChange={(e) => handleChange('home', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter home name" />
              {errors.includes('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" value={data.date} data-field="date" onChange={(e) => handleChange('date', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
              {errors.includes('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
              <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
              {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. Environment & Cleanliness</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all communal areas clean, tidy, and free from odours?" yesNoField="communal_areas_clean" commentField="communal_areas_clean_comment" yesNoValue={data.communal_areas_clean} commentValue={data.communal_areas_clean_comment} onYesNoChange={(v) => handleChange('communal_areas_clean', v)} onCommentChange={(v) => handleChange('communal_areas_clean_comment', v)} />
              <YesNoQuestion label="Are bedrooms visibly clean, with fresh linen and tidy surfaces?" yesNoField="bedrooms_clean" commentField="bedrooms_clean_comment" yesNoValue={data.bedrooms_clean} commentValue={data.bedrooms_clean_comment} onYesNoChange={(v) => handleChange('bedrooms_clean', v)} onCommentChange={(v) => handleChange('bedrooms_clean_comment', v)} />
              <YesNoQuestion label="Are toilets and bathrooms clean, stocked with soap and paper towels?" yesNoField="toilets_bathrooms_clean" commentField="toilets_bathrooms_clean_comment" yesNoValue={data.toilets_bathrooms_clean} commentValue={data.toilets_bathrooms_clean_comment} onYesNoChange={(v) => handleChange('toilets_bathrooms_clean', v)} onCommentChange={(v) => handleChange('toilets_bathrooms_clean_comment', v)} />
              <YesNoQuestion label="Are floors, carpets, and furniture in good condition and free from clutter?" yesNoField="floors_furniture_good" commentField="floors_furniture_good_comment" yesNoValue={data.floors_furniture_good} commentValue={data.floors_furniture_good_comment} onYesNoChange={(v) => handleChange('floors_furniture_good', v)} onCommentChange={(v) => handleChange('floors_furniture_good_comment', v)} />
              <YesNoQuestion label="Are cleaning trolleys stored safely and not left unattended?" yesNoField="cleaning_trolleys_stored" commentField="cleaning_trolleys_stored_comment" yesNoValue={data.cleaning_trolleys_stored} commentValue={data.cleaning_trolleys_stored_comment} onYesNoChange={(v) => handleChange('cleaning_trolleys_stored', v)} onCommentChange={(v) => handleChange('cleaning_trolleys_stored_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Infection Prevention & Control (IPC)</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are hand sanitiser stations full and working?" yesNoField="sanitisers_working" commentField="sanitisers_working_comment" yesNoValue={data.sanitisers_working} commentValue={data.sanitisers_working_comment} onYesNoChange={(v) => handleChange('sanitisers_working', v)} onCommentChange={(v) => handleChange('sanitisers_working_comment', v)} />
              <YesNoQuestion label="Are staff using correct PPE for the task?" yesNoField="staff_using_ppe" commentField="staff_using_ppe_comment" yesNoValue={data.staff_using_ppe} commentValue={data.staff_using_ppe_comment} onYesNoChange={(v) => handleChange('staff_using_ppe', v)} onCommentChange={(v) => handleChange('staff_using_ppe_comment', v)} />
              <YesNoQuestion label="Are gloves and aprons available and used appropriately?" yesNoField="gloves_aprons_available" commentField="gloves_aprons_available_comment" yesNoValue={data.gloves_aprons_available} commentValue={data.gloves_aprons_available_comment} onYesNoChange={(v) => handleChange('gloves_aprons_available', v)} onCommentChange={(v) => handleChange('gloves_aprons_available_comment', v)} />
              <YesNoQuestion label="Are clinical and domestic waste bins not overflowing and correctly labelled?" yesNoField="waste_bins_ok" commentField="waste_bins_ok_comment" yesNoValue={data.waste_bins_ok} commentValue={data.waste_bins_ok_comment} onYesNoChange={(v) => handleChange('waste_bins_ok', v)} onCommentChange={(v) => handleChange('waste_bins_ok_comment', v)} />
              <YesNoQuestion label="Are cleaning schedules visible and up to date?" yesNoField="cleaning_schedules_visible" commentField="cleaning_schedules_visible_comment" yesNoValue={data.cleaning_schedules_visible} commentValue={data.cleaning_schedules_visible_comment} onYesNoChange={(v) => handleChange('cleaning_schedules_visible', v)} onCommentChange={(v) => handleChange('cleaning_schedules_visible_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Health & Safety</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are fire exits unobstructed and clearly marked?" yesNoField="fire_exits_clear" commentField="fire_exits_clear_comment" yesNoValue={data.fire_exits_clear} commentValue={data.fire_exits_clear_comment} onYesNoChange={(v) => handleChange('fire_exits_clear', v)} onCommentChange={(v) => handleChange('fire_exits_clear_comment', v)} />
              <YesNoQuestion label="Are corridors and walkways free from trip hazards?" yesNoField="corridors_free_of_trip_hazards" commentField="corridors_free_of_trip_hazards_comment" yesNoValue={data.corridors_free_of_trip_hazards} commentValue={data.corridors_free_of_trip_hazards_comment} onYesNoChange={(v) => handleChange('corridors_free_of_trip_hazards', v)} onCommentChange={(v) => handleChange('corridors_free_of_trip_hazards_comment', v)} />
              <YesNoQuestion label="Are wheelchairs, hoists, and mobility aids stored safely?" yesNoField="mobility_aids_stored" commentField="mobility_aids_stored_comment" yesNoValue={data.mobility_aids_stored} commentValue={data.mobility_aids_stored_comment} onYesNoChange={(v) => handleChange('mobility_aids_stored', v)} onCommentChange={(v) => handleChange('mobility_aids_stored_comment', v)} />
              <YesNoQuestion label="Are nurse call bells within reach of residents and working?" yesNoField="call_bells_working" commentField="call_bells_working_comment" yesNoValue={data.call_bells_working} commentValue={data.call_bells_working_comment} onYesNoChange={(v) => handleChange('call_bells_working', v)} onCommentChange={(v) => handleChange('call_bells_working_comment', v)} />
              <YesNoQuestion label="Are there any broken items or hazards requiring repair?" yesNoField="broken_items_hazards" commentField="broken_items_hazards_comment" yesNoValue={data.broken_items_hazards} commentValue={data.broken_items_hazards_comment} onYesNoChange={(v) => handleChange('broken_items_hazards', v)} onCommentChange={(v) => handleChange('broken_items_hazards_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">4. Resident Experience</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents engaged and appropriately dressed for the time of day?" yesNoField="residents_engaged_dressed" commentField="residents_engaged_dressed_comment" yesNoValue={data.residents_engaged_dressed} commentValue={data.residents_engaged_dressed_comment} onYesNoChange={(v) => handleChange('residents_engaged_dressed', v)} onCommentChange={(v) => handleChange('residents_engaged_dressed_comment', v)} />
              <YesNoQuestion label="Are interactions between staff and residents respectful and person-centred?" yesNoField="staff_respectful_interactions" commentField="staff_respectful_interactions_comment" yesNoValue={data.staff_respectful_interactions} commentValue={data.staff_respectful_interactions_comment} onYesNoChange={(v) => handleChange('staff_respectful_interactions', v)} onCommentChange={(v) => handleChange('staff_respectful_interactions_comment', v)} />
              <YesNoQuestion label="Are residents offered fluids/snacks regularly?" yesNoField="residents_offered_fluids" commentField="residents_offered_fluids_comment" yesNoValue={data.residents_offered_fluids} commentValue={data.residents_offered_fluids_comment} onYesNoChange={(v) => handleChange('residents_offered_fluids', v)} onCommentChange={(v) => handleChange('residents_offered_fluids_comment', v)} />
              <YesNoQuestion label="Are mealtimes calm, dignified, and well-supported (if observed)?" yesNoField="mealtimes_well_supported" commentField="mealtimes_well_supported_comment" yesNoValue={data.mealtimes_well_supported} commentValue={data.mealtimes_well_supported_comment} onYesNoChange={(v) => handleChange('mealtimes_well_supported', v)} onCommentChange={(v) => handleChange('mealtimes_well_supported_comment', v)} />
              <YesNoQuestion label="Are activity schedules visible and up to date?" yesNoField="activities_visible" commentField="activities_visible_comment" yesNoValue={data.activities_visible} commentValue={data.activities_visible_comment} onYesNoChange={(v) => handleChange('activities_visible', v)} onCommentChange={(v) => handleChange('activities_visible_comment', v)} />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">5. Staff Practice</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are staff wearing correct uniforms and ID badges?" yesNoField="staff_uniforms_id" commentField="staff_uniforms_id_comment" yesNoValue={data.staff_uniforms_id} commentValue={data.staff_uniforms_id_comment} onYesNoChange={(v) => handleChange('staff_uniforms_id', v)} onCommentChange={(v) => handleChange('staff_uniforms_id_comment', v)} />
              <YesNoQuestion label="Are staff communicating professionally and kindly?" yesNoField="staff_communicate_professionally" commentField="staff_communicate_professionally_comment" yesNoValue={data.staff_communicate_professionally} commentValue={data.staff_communicate_professionally_comment} onYesNoChange={(v) => handleChange('staff_communicate_professionally', v)} onCommentChange={(v) => handleChange('staff_communicate_professionally_comment', v)} />
              <YesNoQuestion label="Are shift leaders aware of any key changes/risks for the day?" yesNoField="shift_leaders_aware" commentField="shift_leaders_aware_comment" yesNoValue={data.shift_leaders_aware} commentValue={data.shift_leaders_aware_comment} onYesNoChange={(v) => handleChange('shift_leaders_aware', v)} onCommentChange={(v) => handleChange('shift_leaders_aware_comment', v)} />
              <YesNoQuestion label="Are staff breaks being taken appropriately (not leaving units short)?" yesNoField="staff_breaks_appropriate" commentField="staff_breaks_appropriate_comment" yesNoValue={data.staff_breaks_appropriate} commentValue={data.staff_breaks_appropriate_comment} onYesNoChange={(v) => handleChange('staff_breaks_appropriate', v)} onCommentChange={(v) => handleChange('staff_breaks_appropriate_comment', v)} />
              <YesNoQuestion label="Are handovers taking place in a private and structured manner?" yesNoField="handovers_private_structured" commentField="handovers_private_structured_comment" yesNoValue={data.handovers_private_structured} commentValue={data.handovers_private_structured_comment} onYesNoChange={(v) => handleChange('handovers_private_structured', v)} onCommentChange={(v) => handleChange('handovers_private_structured_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">6. Medication</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are medication trolleys locked and stored securely?" yesNoField="med_trolleys_locked" commentField="med_trolleys_locked_comment" yesNoValue={data.med_trolleys_locked} commentValue={data.med_trolleys_locked_comment} onYesNoChange={(v) => handleChange('med_trolleys_locked', v)} onCommentChange={(v) => handleChange('med_trolleys_locked_comment', v)} />
              <YesNoQuestion label="Is the medication room tidy, locked, and within temperature range?" yesNoField="med_room_tidy_locked" commentField="med_room_tidy_locked_comment" yesNoValue={data.med_room_tidy_locked} commentValue={data.med_room_tidy_locked_comment} onYesNoChange={(v) => handleChange('med_room_tidy_locked', v)} onCommentChange={(v) => handleChange('med_room_tidy_locked_comment', v)} />
              <YesNoQuestion label="Are fridge temperatures recorded daily and in range?" yesNoField="fridge_temps_recorded" commentField="fridge_temps_recorded_comment" yesNoValue={data.fridge_temps_recorded} commentValue={data.fridge_temps_recorded_comment} onYesNoChange={(v) => handleChange('fridge_temps_recorded', v)} onCommentChange={(v) => handleChange('fridge_temps_recorded_comment', v)} />
              <YesNoQuestion label="Are MAR charts correctly stored and up to date?" yesNoField="mar_charts_up_to_date" commentField="mar_charts_up_to_date_comment" yesNoValue={data.mar_charts_up_to_date} commentValue={data.mar_charts_up_to_date_comment} onYesNoChange={(v) => handleChange('mar_charts_up_to_date', v)} onCommentChange={(v) => handleChange('mar_charts_up_to_date_comment', v)} />
              <YesNoQuestion label="Are staff administering medication safely and respectfully (if observed)?" yesNoField="staff_administering_safely" commentField="staff_administering_safely_comment" yesNoValue={data.staff_administering_safely} commentValue={data.staff_administering_safely_comment} onYesNoChange={(v) => handleChange('staff_administering_safely', v)} onCommentChange={(v) => handleChange('staff_administering_safely_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">7. Kitchen / Dining Areas</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is the dining area clean, with tables set appropriately?" yesNoField="dining_area_clean" commentField="dining_area_clean_comment" yesNoValue={data.dining_area_clean} commentValue={data.dining_area_clean_comment} onYesNoChange={(v) => handleChange('dining_area_clean', v)} onCommentChange={(v) => handleChange('dining_area_clean_comment', v)} />
              <YesNoQuestion label="Are kitchenettes clean and food safely stored?" yesNoField="kitchenettes_clean" commentField="kitchenettes_clean_comment" yesNoValue={data.kitchenettes_clean} commentValue={data.kitchenettes_clean_comment} onYesNoChange={(v) => handleChange('kitchenettes_clean', v)} onCommentChange={(v) => handleChange('kitchenettes_clean_comment', v)} />
              <YesNoQuestion label="Are fridges/freezers in kitchenettes within safe temperature range?" yesNoField="fridges_freezers_safe" commentField="fridges_freezers_safe_comment" yesNoValue={data.fridges_freezers_safe} commentValue={data.fridges_freezers_safe_comment} onYesNoChange={(v) => handleChange('fridges_freezers_safe', v)} onCommentChange={(v) => handleChange('fridges_freezers_safe_comment', v)} />
              <YesNoQuestion label="Are food items dated and labelled properly?" yesNoField="food_items_dated" commentField="food_items_dated_comment" yesNoValue={data.food_items_dated} commentValue={data.food_items_dated_comment} onYesNoChange={(v) => handleChange('food_items_dated', v)} onCommentChange={(v) => handleChange('food_items_dated_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">8. Laundry</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is the laundry area clean, organised, and equipment functioning?" yesNoField="laundry_area_clean" commentField="laundry_area_clean_comment" yesNoValue={data.laundry_area_clean} commentValue={data.laundry_area_clean_comment} onYesNoChange={(v) => handleChange('laundry_area_clean', v)} onCommentChange={(v) => handleChange('laundry_area_clean_comment', v)} />
              <YesNoQuestion label="Are clean and dirty items clearly separated?" yesNoField="clean_dirty_separated" commentField="clean_dirty_separated_comment" yesNoValue={data.clean_dirty_separated} commentValue={data.clean_dirty_separated_comment} onYesNoChange={(v) => handleChange('clean_dirty_separated', v)} onCommentChange={(v) => handleChange('clean_dirty_separated_comment', v)} />
              <YesNoQuestion label="Are trolleys and baskets labelled and used correctly?" yesNoField="trolleys_labelled" commentField="trolleys_labelled_comment" yesNoValue={data.trolleys_labelled} commentValue={data.trolleys_labelled_comment} onYesNoChange={(v) => handleChange('trolleys_labelled', v)} onCommentChange={(v) => handleChange('trolleys_labelled_comment', v)} />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">9. Documentation & Records</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are daily notes up to date and person-centred?" yesNoField="daily_notes_up_to_date" commentField="daily_notes_up_to_date_comment" yesNoValue={data.daily_notes_up_to_date} commentValue={data.daily_notes_up_to_date_comment} onYesNoChange={(v) => handleChange('daily_notes_up_to_date', v)} onCommentChange={(v) => handleChange('daily_notes_up_to_date_comment', v)} />
              <YesNoQuestion label="Are fluid and food charts completed properly?" yesNoField="fluid_food_charts_completed" commentField="fluid_food_charts_completed_comment" yesNoValue={data.fluid_food_charts_completed} commentValue={data.fluid_food_charts_completed_comment} onYesNoChange={(v) => handleChange('fluid_food_charts_completed', v)} onCommentChange={(v) => handleChange('fluid_food_charts_completed_comment', v)} />
              <YesNoQuestion label="Are repositioning/turn charts filled in as per plan?" yesNoField="repositioning_charts_filled" commentField="repositioning_charts_filled_comment" yesNoValue={data.repositioning_charts_filled} commentValue={data.repositioning_charts_filled_comment} onYesNoChange={(v) => handleChange('repositioning_charts_filled', v)} onCommentChange={(v) => handleChange('repositioning_charts_filled_comment', v)} />
              <YesNoQuestion label="Are cleaning and maintenance logs updated?" yesNoField="cleaning_maintenance_logs_updated" commentField="cleaning_maintenance_logs_updated_comment" yesNoValue={data.cleaning_maintenance_logs_updated} commentValue={data.cleaning_maintenance_logs_updated_comment} onYesNoChange={(v) => handleChange('cleaning_maintenance_logs_updated', v)} onCommentChange={(v) => handleChange('cleaning_maintenance_logs_updated_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">10. Repairs & Maintenance</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are there any visible repairs needed (lights, doors, fixtures)?" yesNoField="visible_repairs_needed" commentField="visible_repairs_needed_comment" yesNoValue={data.visible_repairs_needed} commentValue={data.visible_repairs_needed_comment} onYesNoChange={(v) => handleChange('visible_repairs_needed', v)} onCommentChange={(v) => handleChange('visible_repairs_needed_comment', v)} />
              <YesNoQuestion label="Are window restrictors and safety features in place?" yesNoField="window_restrictors_ok" commentField="window_restrictors_ok_comment" yesNoValue={data.window_restrictors_ok} commentValue={data.window_restrictors_ok_comment} onYesNoChange={(v) => handleChange('window_restrictors_ok', v)} onCommentChange={(v) => handleChange('window_restrictors_ok_comment', v)} />
              <YesNoQuestion label="Have any maintenance issues from previous audits been resolved?" yesNoField="previous_issues_resolved" commentField="previous_issues_resolved_comment" yesNoValue={data.previous_issues_resolved} commentValue={data.previous_issues_resolved_comment} onYesNoChange={(v) => handleChange('previous_issues_resolved', v)} onCommentChange={(v) => handleChange('previous_issues_resolved_comment', v)} />
              <YesNoQuestion label="Are communal and outdoor areas safe and tidy?" yesNoField="communal_outdoor_safe" commentField="communal_outdoor_safe_comment" yesNoValue={data.communal_outdoor_safe} commentValue={data.communal_outdoor_safe_comment} onYesNoChange={(v) => handleChange('communal_outdoor_safe', v)} onCommentChange={(v) => handleChange('communal_outdoor_safe_comment', v)} />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} rows={4} placeholder="Final comments for this audit" className="w-full p-2 border rounded resize-none mt-2" />
          </div>

          <div className="flex justify-center mt-8">
            <button onClick={handleComplete} className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">Complete Audit</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">No, thanks</button>
              <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{saving ? 'Saving...' : 'Save Audit'}</button>
              <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">{saving ? 'Saving...' : 'Save & Create Action Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
