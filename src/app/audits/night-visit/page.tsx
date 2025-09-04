"use client";
import { useState } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';

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

export default function NightVisitAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');

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

  const handleChange = (field: keyof NightVisitData, value: string) => {
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
      {/* per-question comments removed; use final comments textbox below */}
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

    const payload = {
      ...data,
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: user?.id ?? null,
      workspaceId: activeWorkspaceId,
      auditType: 'night-visit',
      yesCount,
      totalCount,
      scorePercent,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, activeWorkspaceId);
      setSavedAuditId(id);
      const completedAt = data.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspaceId, 'night-visit', completedAt);
      alert('Audit saved');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save night-visit audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Night Visit Audit</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Person completing the audit</label>
              <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
              {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. Staffing and Presence</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are sufficient staff on duty according to the rota and resident dependency levels?" yesNoField="sufficient_staff_on_duty" commentField="sufficient_staff_on_duty_comment" yesNoValue={data.sufficient_staff_on_duty} commentValue={data.sufficient_staff_on_duty_comment} onYesNoChange={(v) => handleChange('sufficient_staff_on_duty', v)} onCommentChange={(v) => handleChange('sufficient_staff_on_duty_comment', v)} />
              <YesNoQuestion label="Are staff present and visible in appropriate areas?" yesNoField="staff_present_visible" commentField="staff_present_visible_comment" yesNoValue={data.staff_present_visible} commentValue={data.staff_present_visible_comment} onYesNoChange={(v) => handleChange('staff_present_visible', v)} onCommentChange={(v) => handleChange('staff_present_visible_comment', v)} />
              <YesNoQuestion label="Is the manager-on-call contactable and known to night staff?" yesNoField="manager_on_call_contactable" commentField="manager_on_call_contactable_comment" yesNoValue={data.manager_on_call_contactable} commentValue={data.manager_on_call_contactable_comment} onYesNoChange={(v) => handleChange('manager_on_call_contactable', v)} onCommentChange={(v) => handleChange('manager_on_call_contactable_comment', v)} />
              <YesNoQuestion label="Are agency staff (if used) familiar with residents and procedures?" yesNoField="agency_staff_familiar" commentField="agency_staff_familiar_comment" yesNoValue={data.agency_staff_familiar} commentValue={data.agency_staff_familiar_comment} onYesNoChange={(v) => handleChange('agency_staff_familiar', v)} onCommentChange={(v) => handleChange('agency_staff_familiar_comment', v)} />
              <YesNoQuestion label="Are staff wearing correct uniforms and identification?" yesNoField="staff_uniforms_id" commentField="staff_uniforms_id_comment" yesNoValue={data.staff_uniforms_id} commentValue={data.staff_uniforms_id_comment} onYesNoChange={(v) => handleChange('staff_uniforms_id', v)} onCommentChange={(v) => handleChange('staff_uniforms_id_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Resident Safety and Wellbeing</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all residents accounted for?" yesNoField="residents_accounted_for" commentField="residents_accounted_for_comment" yesNoValue={data.residents_accounted_for} commentValue={data.residents_accounted_for_comment} onYesNoChange={(v) => handleChange('residents_accounted_for', v)} onCommentChange={(v) => handleChange('residents_accounted_for_comment', v)} />
              <YesNoQuestion label="Are call bells accessible and working?" yesNoField="call_bells_accessible" commentField="call_bells_accessible_comment" yesNoValue={data.call_bells_accessible} commentValue={data.call_bells_accessible_comment} onYesNoChange={(v) => handleChange('call_bells_accessible', v)} onCommentChange={(v) => handleChange('call_bells_accessible_comment', v)} />
              <YesNoQuestion label="Are residents checked regularly and response times appropriate?" yesNoField="residents_checked_regularly" commentField="residents_checked_regularly_comment" yesNoValue={data.residents_checked_regularly} commentValue={data.residents_checked_regularly_comment} onYesNoChange={(v) => handleChange('residents_checked_regularly', v)} onCommentChange={(v) => handleChange('residents_checked_regularly_comment', v)} />
              <YesNoQuestion label="Are awake/distressed residents supported appropriately?" yesNoField="residents_awake_distressed_supported" commentField="residents_awake_distressed_supported_comment" yesNoValue={data.residents_awake_distressed_supported} commentValue={data.residents_awake_distressed_supported_comment} onYesNoChange={(v) => handleChange('residents_awake_distressed_supported', v)} onCommentChange={(v) => handleChange('residents_awake_distressed_supported_comment', v)} />
              <YesNoQuestion label="Are bedrails/crash mats used correctly where required?" yesNoField="bedrails_crash_mats_used_correctly" commentField="bedrails_crash_mats_used_correctly_comment" yesNoValue={data.bedrails_crash_mats_used_correctly} commentValue={data.bedrails_crash_mats_used_correctly_comment} onYesNoChange={(v) => handleChange('bedrails_crash_mats_used_correctly', v)} onCommentChange={(v) => handleChange('bedrails_crash_mats_used_correctly_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Environment and Security</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are external doors locked and secure?" yesNoField="external_doors_locked" commentField="external_doors_locked_comment" yesNoValue={data.external_doors_locked} commentValue={data.external_doors_locked_comment} onYesNoChange={(v) => handleChange('external_doors_locked', v)} onCommentChange={(v) => handleChange('external_doors_locked_comment', v)} />
              <YesNoQuestion label="Are fire exits clear and accessible?" yesNoField="fire_exits_clear" commentField="fire_exits_clear_comment" yesNoValue={data.fire_exits_clear} commentValue={data.fire_exits_clear_comment} onYesNoChange={(v) => handleChange('fire_exits_clear', v)} onCommentChange={(v) => handleChange('fire_exits_clear_comment', v)} />
              <YesNoQuestion label="Are corridors free of trip hazards?" yesNoField="corridors_free_of_trip_hazards" commentField="corridors_free_of_trip_hazards_comment" yesNoValue={data.corridors_free_of_trip_hazards} commentValue={data.corridors_free_of_trip_hazards_comment} onYesNoChange={(v) => handleChange('corridors_free_of_trip_hazards', v)} onCommentChange={(v) => handleChange('corridors_free_of_trip_hazards_comment', v)} />
              <YesNoQuestion label="Is lighting sufficient for safe movement?" yesNoField="lighting_sufficient" commentField="lighting_sufficient_comment" yesNoValue={data.lighting_sufficient} commentValue={data.lighting_sufficient_comment} onYesNoChange={(v) => handleChange('lighting_sufficient', v)} onCommentChange={(v) => handleChange('lighting_sufficient_comment', v)} />
              <YesNoQuestion label="Is the temperature comfortable?" yesNoField="temperature_comfortable" commentField="temperature_comfortable_comment" yesNoValue={data.temperature_comfortable} commentValue={data.temperature_comfortable_comment} onYesNoChange={(v) => handleChange('temperature_comfortable', v)} onCommentChange={(v) => handleChange('temperature_comfortable_comment', v)} />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">4. Medication and Clinical Care</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are night medications stored securely?" yesNoField="night_meds_stored_secure" commentField="night_meds_stored_secure_comment" yesNoValue={data.night_meds_stored_secure} commentValue={data.night_meds_stored_secure_comment} onYesNoChange={(v) => handleChange('night_meds_stored_secure', v)} onCommentChange={(v) => handleChange('night_meds_stored_secure_comment', v)} />
              <YesNoQuestion label="Are MAR charts up to date for administered medications?" yesNoField="mar_chart_up_to_date" commentField="mar_chart_up_to_date_comment" yesNoValue={data.mar_chart_up_to_date} commentValue={data.mar_chart_up_to_date_comment} onYesNoChange={(v) => handleChange('mar_chart_up_to_date', v)} onCommentChange={(v) => handleChange('mar_chart_up_to_date_comment', v)} />
              <YesNoQuestion label="Are controlled drugs stored and recorded correctly?" yesNoField="cds_stored_recorded" commentField="cds_stored_recorded_comment" yesNoValue={data.cds_stored_recorded} commentValue={data.cds_stored_recorded_comment} onYesNoChange={(v) => handleChange('cds_stored_recorded', v)} onCommentChange={(v) => handleChange('cds_stored_recorded_comment', v)} />
              <YesNoQuestion label="Are wound dressings documented and appropriate?" yesNoField="wound_dressings_documented" commentField="wound_dressings_documented_comment" yesNoValue={data.wound_dressings_documented} commentValue={data.wound_dressings_documented_comment} onYesNoChange={(v) => handleChange('wound_dressings_documented', v)} onCommentChange={(v) => handleChange('wound_dressings_documented_comment', v)} />
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">5. Infection Control and Hygiene</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is hand hygiene and PPE being followed?" yesNoField="hand_hygiene_ppe_followed" commentField="hand_hygiene_ppe_followed_comment" yesNoValue={data.hand_hygiene_ppe_followed} commentValue={data.hand_hygiene_ppe_followed_comment} onYesNoChange={(v) => handleChange('hand_hygiene_ppe_followed', v)} onCommentChange={(v) => handleChange('hand_hygiene_ppe_followed_comment', v)} />
              <YesNoQuestion label="Is PPE available for staff?" yesNoField="ppe_available" commentField="ppe_available_comment" yesNoValue={data.ppe_available} commentValue={data.ppe_available_comment} onYesNoChange={(v) => handleChange('ppe_available', v)} onCommentChange={(v) => handleChange('ppe_available_comment', v)} />
              <YesNoQuestion label="Is the home clean and odour-free?" yesNoField="home_clean_odour_free" commentField="home_clean_odour_free_comment" yesNoValue={data.home_clean_odour_free} commentValue={data.home_clean_odour_free_comment} onYesNoChange={(v) => handleChange('home_clean_odour_free', v)} onCommentChange={(v) => handleChange('home_clean_odour_free_comment', v)} />
              <YesNoQuestion label="Are continence aids stored correctly?" yesNoField="continence_aids_stored_correct" commentField="continence_aids_stored_correct_comment" yesNoValue={data.continence_aids_stored_correct} commentValue={data.continence_aids_stored_correct_comment} onYesNoChange={(v) => handleChange('continence_aids_stored_correct', v)} onCommentChange={(v) => handleChange('continence_aids_stored_correct_comment', v)} />
            </div>
          </div>

          <div className="bg-rose-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-rose-900 mb-3">6. Food, Fluids and Kitchen</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are drinks/snacks available for residents?" yesNoField="drinks_snacks_available" commentField="drinks_snacks_available_comment" yesNoValue={data.drinks_snacks_available} commentValue={data.drinks_snacks_available_comment} onYesNoChange={(v) => handleChange('drinks_snacks_available', v)} onCommentChange={(v) => handleChange('drinks_snacks_available_comment', v)} />
              <YesNoQuestion label="Is the kitchen clean and tidy?" yesNoField="kitchen_clean_tidy" commentField="kitchen_clean_tidy_comment" yesNoValue={data.kitchen_clean_tidy} commentValue={data.kitchen_clean_tidy_comment} onYesNoChange={(v) => handleChange('kitchen_clean_tidy', v)} onCommentChange={(v) => handleChange('kitchen_clean_tidy_comment', v)} />
              <YesNoQuestion label="Is food hygiene being followed?" yesNoField="food_hygiene_followed" commentField="food_hygiene_followed_comment" yesNoValue={data.food_hygiene_followed} commentValue={data.food_hygiene_followed_comment} onYesNoChange={(v) => handleChange('food_hygiene_followed', v)} onCommentChange={(v) => handleChange('food_hygiene_followed_comment', v)} />
            </div>
          </div>

          <div className="bg-sky-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-sky-900 mb-3">7. Record Keeping and Handover</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are care notes up to date?" yesNoField="care_notes_up_to_date" commentField="care_notes_up_to_date_comment" yesNoValue={data.care_notes_up_to_date} commentValue={data.care_notes_up_to_date_comment} onYesNoChange={(v) => handleChange('care_notes_up_to_date', v)} onCommentChange={(v) => handleChange('care_notes_up_to_date_comment', v)} />
              <YesNoQuestion label="Are monitoring documents (observations) completed?" yesNoField="monitoring_docs_completed" commentField="monitoring_docs_completed_comment" yesNoValue={data.monitoring_docs_completed} commentValue={data.monitoring_docs_completed_comment} onYesNoChange={(v) => handleChange('monitoring_docs_completed', v)} onCommentChange={(v) => handleChange('monitoring_docs_completed_comment', v)} />
              <YesNoQuestion label="Is handover documented appropriately?" yesNoField="handover_documented" commentField="handover_documented_comment" yesNoValue={data.handover_documented} commentValue={data.handover_documented_comment} onYesNoChange={(v) => handleChange('handover_documented', v)} onCommentChange={(v) => handleChange('handover_documented_comment', v)} />
              <YesNoQuestion label="Have any incidents been recorded?" yesNoField="incidents_recorded" commentField="incidents_recorded_comment" yesNoValue={data.incidents_recorded} commentValue={data.incidents_recorded_comment} onYesNoChange={(v) => handleChange('incidents_recorded', v)} onCommentChange={(v) => handleChange('incidents_recorded_comment', v)} />
            </div>
          </div>

          <div className="bg-lime-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-lime-900 mb-3">8. Staff Conduct and Morale</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are staff alert and professional?" yesNoField="staff_alert_professional" commentField="staff_alert_professional_comment" yesNoValue={data.staff_alert_professional} commentValue={data.staff_alert_professional_comment} onYesNoChange={(v) => handleChange('staff_alert_professional', v)} onCommentChange={(v) => handleChange('staff_alert_professional_comment', v)} />
              <YesNoQuestion label="Are staff taking breaks as required?" yesNoField="staff_breaks_taken" commentField="staff_breaks_taken_comment" yesNoValue={data.staff_breaks_taken} commentValue={data.staff_breaks_taken_comment} onYesNoChange={(v) => handleChange('staff_breaks_taken', v)} onCommentChange={(v) => handleChange('staff_breaks_taken_comment', v)} />
              <YesNoQuestion label="Do staff feel supported and safe?" yesNoField="staff_supported_safe" commentField="staff_supported_safe_comment" yesNoValue={data.staff_supported_safe} commentValue={data.staff_supported_safe_comment} onYesNoChange={(v) => handleChange('staff_supported_safe', v)} onCommentChange={(v) => handleChange('staff_supported_safe_comment', v)} />
              <YesNoQuestion label="Are staff aware of emergency procedures?" yesNoField="staff_aware_emergency_procedures" commentField="staff_aware_emergency_procedures_comment" yesNoValue={data.staff_aware_emergency_procedures} commentValue={data.staff_aware_emergency_procedures_comment} onYesNoChange={(v) => handleChange('staff_aware_emergency_procedures', v)} onCommentChange={(v) => handleChange('staff_aware_emergency_procedures_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">9. Maintenance and Equipment</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is equipment stored safely and in good working order?" yesNoField="equipment_stored_good_working" commentField="equipment_stored_good_working_comment" yesNoValue={data.equipment_stored_good_working} commentValue={data.equipment_stored_good_working_comment} onYesNoChange={(v) => handleChange('equipment_stored_good_working', v)} onCommentChange={(v) => handleChange('equipment_stored_good_working_comment', v)} />
              <YesNoQuestion label="Are nurse-call systems functioning?" yesNoField="nurse_call_systems_functioning" commentField="nurse_call_systems_functioning_comment" yesNoValue={data.nurse_call_systems_functioning} commentValue={data.nurse_call_systems_functioning_comment} onYesNoChange={(v) => handleChange('nurse_call_systems_functioning', v)} onCommentChange={(v) => handleChange('nurse_call_systems_functioning_comment', v)} />
              <YesNoQuestion label="Are any maintenance issues reported or present?" yesNoField="maintenance_issues_reported" commentField="maintenance_issues_reported_comment" yesNoValue={data.maintenance_issues_reported} commentValue={data.maintenance_issues_reported_comment} onYesNoChange={(v) => handleChange('maintenance_issues_reported', v)} onCommentChange={(v) => handleChange('maintenance_issues_reported_comment', v)} />
            </div>
          </div>

          <div className="bg-violet-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-violet-900 mb-3">10. General Observations</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents out of bed and in discomfort?" yesNoField="residents_out_of_bed_discomfort" commentField="residents_out_of_bed_discomfort_comment" yesNoValue={data.residents_out_of_bed_discomfort} commentValue={data.residents_out_of_bed_discomfort_comment} onYesNoChange={(v) => handleChange('residents_out_of_bed_discomfort', v)} onCommentChange={(v) => handleChange('residents_out_of_bed_discomfort_comment', v)} />
              <YesNoQuestion label="Are lights/TVs/noise disruptive to residents?" yesNoField="lights_tvs_noise_disruptive" commentField="lights_tvs_noise_disruptive_comment" yesNoValue={data.lights_tvs_noise_disruptive} commentValue={data.lights_tvs_noise_disruptive_comment} onYesNoChange={(v) => handleChange('lights_tvs_noise_disruptive', v)} onCommentChange={(v) => handleChange('lights_tvs_noise_disruptive_comment', v)} />
              <YesNoQuestion label="Are there any safeguarding concerns observed?" yesNoField="safeguarding_concerns_observed" commentField="safeguarding_concerns_observed_comment" yesNoValue={data.safeguarding_concerns_observed} commentValue={data.safeguarding_concerns_observed_comment} onYesNoChange={(v) => handleChange('safeguarding_concerns_observed', v)} onCommentChange={(v) => handleChange('safeguarding_concerns_observed_comment', v)} />
              <YesNoQuestion label="Is the overall atmosphere calm and safe?" yesNoField="atmosphere_calm_safe" commentField="atmosphere_calm_safe_comment" yesNoValue={data.atmosphere_calm_safe} commentValue={data.atmosphere_calm_safe_comment} onYesNoChange={(v) => handleChange('atmosphere_calm_safe', v)} onCommentChange={(v) => handleChange('atmosphere_calm_safe_comment', v)} />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} rows={4} placeholder="Final comments for this audit" className="w-full p-2 border rounded resize-none mt-2" />
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={handleComplete} className="px-4 py-2 bg-blue-600 text-white rounded">Complete Audit</button>
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
    </div>
  );
}
