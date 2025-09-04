'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';

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

export default function RestrictivePracticeAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user: authUser } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);

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

  const handleChange = (field: keyof RestrictivePracticeData, value: string) => {
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
      <textarea value={commentValue} onChange={(e) => onCommentChange(e.target.value)} rows={2} placeholder="Comments" className="w-full p-2 border rounded resize-none mt-2" />
    </div>
  );

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

    const payload = {
      auditType: 'restrictive-practice',
      data,
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
      scorePercent,
      yesCount,
      totalCount,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId);
      setSavedAuditId(id);
      try {
        await markAuditCompleted(workspaceId, 'restrictive-practice', new Date().toISOString());
      } catch (e) {
        console.warn('Failed to mark audit completed', e);
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to save audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Restrictive Practice Audit</h1>
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
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. Policy and Awareness</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is there a restrictive practice policy in place and accessible to staff?" yesNoField="policy_in_place_accessible" commentField="policy_in_place_accessible_comment" yesNoValue={data.policy_in_place_accessible} commentValue={data.policy_in_place_accessible_comment} onYesNoChange={(v) => handleChange('policy_in_place_accessible', v)} onCommentChange={(v) => handleChange('policy_in_place_accessible_comment', v)} />
              <YesNoQuestion label="Are staff trained to recognise what constitutes a restrictive practice (including less obvious forms)?" yesNoField="staff_recognise_restrictive_practice" commentField="staff_recognise_restrictive_practice_comment" yesNoValue={data.staff_recognise_restrictive_practice} commentValue={data.staff_recognise_restrictive_practice_comment} onYesNoChange={(v) => handleChange('staff_recognise_restrictive_practice', v)} onCommentChange={(v) => handleChange('staff_recognise_restrictive_practice_comment', v)} />
              <YesNoQuestion label="Are staff aware of the legal and ethical principles related to least restrictive care?" yesNoField="staff_aware_legal_ethical" commentField="staff_aware_legal_ethical_comment" yesNoValue={data.staff_aware_legal_ethical} commentValue={data.staff_aware_legal_ethical_comment} onYesNoChange={(v) => handleChange('staff_aware_legal_ethical', v)} onCommentChange={(v) => handleChange('staff_aware_legal_ethical_comment', v)} />
              <YesNoQuestion label="Is there a clear process for recording and reviewing any restrictive practice in use?" yesNoField="recording_review_process" commentField="recording_review_process_comment" yesNoValue={data.recording_review_process} commentValue={data.recording_review_process_comment} onYesNoChange={(v) => handleChange('recording_review_process', v)} onCommentChange={(v) => handleChange('recording_review_process_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Resident Choice and Autonomy</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents supported to make everyday choices (e.g. meals, clothes, routine)?" yesNoField="residents_supported_choice" commentField="residents_supported_choice_comment" yesNoValue={data.residents_supported_choice} commentValue={data.residents_supported_choice_comment} onYesNoChange={(v) => handleChange('residents_supported_choice', v)} onCommentChange={(v) => handleChange('residents_supported_choice_comment', v)} />
              <YesNoQuestion label="Are restrictions (e.g. locked doors, alarms, limited access) based on individual risk assessments?" yesNoField="restrictions_based_on_risk_assessment" commentField="restrictions_based_on_risk_assessment_comment" yesNoValue={data.restrictions_based_on_risk_assessment} commentValue={data.restrictions_based_on_risk_assessment_comment} onYesNoChange={(v) => handleChange('restrictions_based_on_risk_assessment', v)} onCommentChange={(v) => handleChange('restrictions_based_on_risk_assessment_comment', v)} />
              <YesNoQuestion label="Are residents given the opportunity to express their preferences and views?" yesNoField="residents_express_preferences" commentField="residents_express_preferences_comment" yesNoValue={data.residents_express_preferences} commentValue={data.residents_express_preferences_comment} onYesNoChange={(v) => handleChange('residents_express_preferences', v)} onCommentChange={(v) => handleChange('residents_express_preferences_comment', v)} />
              <YesNoQuestion label="Are residents encouraged and enabled to access all parts of the home safely?" yesNoField="residents_enabled_access_all_parts" commentField="residents_enabled_access_all_parts_comment" yesNoValue={data.residents_enabled_access_all_parts} commentValue={data.residents_enabled_access_all_parts_comment} onYesNoChange={(v) => handleChange('residents_enabled_access_all_parts', v)} onCommentChange={(v) => handleChange('residents_enabled_access_all_parts_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Documentation and Consent</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are all restrictive practices documented in the care plan?" yesNoField="restrictive_practices_in_care_plan" commentField="restrictive_practices_in_care_plan_comment" yesNoValue={data.restrictive_practices_in_care_plan} commentValue={data.restrictive_practices_in_care_plan_comment} onYesNoChange={(v) => handleChange('restrictive_practices_in_care_plan', v)} onCommentChange={(v) => handleChange('restrictive_practices_in_care_plan_comment', v)} />
              <YesNoQuestion label="Has a mental capacity assessment been completed where relevant?" yesNoField="mental_capacity_assessment_completed" commentField="mental_capacity_assessment_completed_comment" yesNoValue={data.mental_capacity_assessment_completed} commentValue={data.mental_capacity_assessment_completed_comment} onYesNoChange={(v) => handleChange('mental_capacity_assessment_completed', v)} onCommentChange={(v) => handleChange('mental_capacity_assessment_completed_comment', v)} />
              <YesNoQuestion label="If the resident lacks capacity, has a best interest decision been recorded?" yesNoField="best_interest_recorded" commentField="best_interest_recorded_comment" yesNoValue={data.best_interest_recorded} commentValue={data.best_interest_recorded_comment} onYesNoChange={(v) => handleChange('best_interest_recorded', v)} onCommentChange={(v) => handleChange('best_interest_recorded_comment', v)} />
              <YesNoQuestion label="Is there evidence of family, advocate, or LPA involvement in the decision-making process?" yesNoField="family_advocate_lpa_involved" commentField="family_advocate_lpa_involved_comment" yesNoValue={data.family_advocate_lpa_involved} commentValue={data.family_advocate_lpa_involved_comment} onYesNoChange={(v) => handleChange('family_advocate_lpa_involved', v)} onCommentChange={(v) => handleChange('family_advocate_lpa_involved_comment', v)} />
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">4. Physical and Environmental Restrictions</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are bedrails used only following a risk assessment and with consent or best interest decisions?" yesNoField="bedrails_risk_assessed_and_consented" commentField="bedrails_risk_assessed_and_consented_comment" yesNoValue={data.bedrails_risk_assessed_and_consented} commentValue={data.bedrails_risk_assessed_and_consented_comment} onYesNoChange={(v) => handleChange('bedrails_risk_assessed_and_consented', v)} onCommentChange={(v) => handleChange('bedrails_risk_assessed_and_consented_comment', v)} />
              <YesNoQuestion label="Are sensor mats, door alarms, or movement alerts used appropriately and proportionately?" yesNoField="sensor_mats_alarms_proportionate" commentField="sensor_mats_alarms_proportionate_comment" yesNoValue={data.sensor_mats_alarms_proportionate} commentValue={data.sensor_mats_alarms_proportionate_comment} onYesNoChange={(v) => handleChange('sensor_mats_alarms_proportionate', v)} onCommentChange={(v) => handleChange('sensor_mats_alarms_proportionate_comment', v)} />
              <YesNoQuestion label="Are locked doors or exits risk-assessed and used only to keep individuals or others safe?" yesNoField="locked_doors_risk_assessed" commentField="locked_doors_risk_assessed_comment" yesNoValue={data.locked_doors_risk_assessed} commentValue={data.locked_doors_risk_assessed_comment} onYesNoChange={(v) => handleChange('locked_doors_risk_assessed', v)} onCommentChange={(v) => handleChange('locked_doors_risk_assessed_comment', v)} />
              <YesNoQuestion label="Are any mobility aids or walking equipment removed or restricted without proper justification?" yesNoField="mobility_aids_restricted_justified" commentField="mobility_aids_restricted_justified_comment" yesNoValue={data.mobility_aids_restricted_justified} commentValue={data.mobility_aids_restricted_justified_comment} onYesNoChange={(v) => handleChange('mobility_aids_restricted_justified', v)} onCommentChange={(v) => handleChange('mobility_aids_restricted_justified_comment', v)} />
            </div>
          </div>

          <div className="bg-rose-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-rose-900 mb-3">5. Psychological or Social Restrictions</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are residents free to associate, engage, or withdraw without pressure?" yesNoField="free_to_associate_without_pressure" commentField="free_to_associate_without_pressure_comment" yesNoValue={data.free_to_associate_without_pressure} commentValue={data.free_to_associate_without_pressure_comment} onYesNoChange={(v) => handleChange('free_to_associate_without_pressure', v)} onCommentChange={(v) => handleChange('free_to_associate_without_pressure_comment', v)} />
              <YesNoQuestion label="Is 1:1 supervision used appropriately and documented?" yesNoField="one_to_one_supervision_documented" commentField="one_to_one_supervision_documented_comment" yesNoValue={data.one_to_one_supervision_documented} commentValue={data.one_to_one_supervision_documented_comment} onYesNoChange={(v) => handleChange('one_to_one_supervision_documented', v)} onCommentChange={(v) => handleChange('one_to_one_supervision_documented_comment', v)} />
              <YesNoQuestion label="Are staff avoiding language or behaviour that is overly controlling or directive?" yesNoField="staff_avoiding_overly_controlling_language" commentField="staff_avoiding_overly_controlling_language_comment" yesNoValue={data.staff_avoiding_overly_controlling_language} commentValue={data.staff_avoiding_overly_controlling_language_comment} onYesNoChange={(v) => handleChange('staff_avoiding_overly_controlling_language', v)} onCommentChange={(v) => handleChange('staff_avoiding_overly_controlling_language_comment', v)} />
              <YesNoQuestion label="Are residents' routines led by personal preference rather than staff convenience?" yesNoField="routines_led_by_preference" commentField="routines_led_by_preference_comment" yesNoValue={data.routines_led_by_preference} commentValue={data.routines_led_by_preference_comment} onYesNoChange={(v) => handleChange('routines_led_by_preference', v)} onCommentChange={(v) => handleChange('routines_led_by_preference_comment', v)} />
            </div>
          </div>

          <div className="bg-sky-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-sky-900 mb-3">6. Food, Drink, and Medication</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are food and drink choices unrestricted unless clinically indicated?" yesNoField="food_drink_choices_unrestricted" commentField="food_drink_choices_unrestricted_comment" yesNoValue={data.food_drink_choices_unrestricted} commentValue={data.food_drink_choices_unrestricted_comment} onYesNoChange={(v) => handleChange('food_drink_choices_unrestricted', v)} onCommentChange={(v) => handleChange('food_drink_choices_unrestricted_comment', v)} />
              <YesNoQuestion label="Are decisions to restrict diet (e.g. choking risks, diabetes) documented and agreed upon?" yesNoField="diet_restrictions_documented" commentField="diet_restrictions_documented_comment" yesNoValue={data.diet_restrictions_documented} commentValue={data.diet_restrictions_documented_comment} onYesNoChange={(v) => handleChange('diet_restrictions_documented', v)} onCommentChange={(v) => handleChange('diet_restrictions_documented_comment', v)} />
              <YesNoQuestion label="Are covert medication or controlled access to medication only used with proper legal safeguards?" yesNoField="covert_medication_legal_safeguards" commentField="covert_medication_legal_safeguards_comment" yesNoValue={data.covert_medication_legal_safeguards} commentValue={data.covert_medication_legal_safeguards_comment} onYesNoChange={(v) => handleChange('covert_medication_legal_safeguards', v)} onCommentChange={(v) => handleChange('covert_medication_legal_safeguards_comment', v)} />
              <YesNoQuestion label="Are residents supported to self-administer medication where safe and appropriate?" yesNoField="residents_supported_self_admin_med" commentField="residents_supported_self_admin_med_comment" yesNoValue={data.residents_supported_self_admin_med} commentValue={data.residents_supported_self_admin_med_comment} onYesNoChange={(v) => handleChange('residents_supported_self_admin_med', v)} onCommentChange={(v) => handleChange('residents_supported_self_admin_med_comment', v)} />
            </div>
          </div>

          <div className="bg-lime-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-lime-900 mb-3">7. Monitoring and Review</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is each restrictive practice reviewed regularly for ongoing need?" yesNoField="restrictive_practices_reviewed_regularly" commentField="restrictive_practices_reviewed_regularly_comment" yesNoValue={data.restrictive_practices_reviewed_regularly} commentValue={data.restrictive_practices_reviewed_regularly_comment} onYesNoChange={(v) => handleChange('restrictive_practices_reviewed_regularly', v)} onCommentChange={(v) => handleChange('restrictive_practices_reviewed_regularly_comment', v)} />
              <YesNoQuestion label="Are there clear records showing efforts to reduce or remove restrictions?" yesNoField="records_show_reduction_efforts" commentField="records_show_reduction_efforts_comment" yesNoValue={data.records_show_reduction_efforts} commentValue={data.records_show_reduction_efforts_comment} onYesNoChange={(v) => handleChange('records_show_reduction_efforts', v)} onCommentChange={(v) => handleChange('records_show_reduction_efforts_comment', v)} />
              <YesNoQuestion label="Are Deprivation of Liberty Safeguards (DoLS) applications in place where required?" yesNoField="dols_applications_where_required" commentField="dols_applications_where_required_comment" yesNoValue={data.dols_applications_where_required} commentValue={data.dols_applications_where_required_comment} onYesNoChange={(v) => handleChange('dols_applications_where_required', v)} onCommentChange={(v) => handleChange('dols_applications_where_required_comment', v)} />
              <YesNoQuestion label="Is there evidence that restrictive practices are the least restrictive option available?" yesNoField="least_restrictive_option_evidence" commentField="least_restrictive_option_evidence_comment" yesNoValue={data.least_restrictive_option_evidence} commentValue={data.least_restrictive_option_evidence_comment} onYesNoChange={(v) => handleChange('least_restrictive_option_evidence', v)} onCommentChange={(v) => handleChange('least_restrictive_option_evidence_comment', v)} />
            </div>
          </div>

          <div className="bg-violet-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-violet-900 mb-3">8. Staff Practice and Culture</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Do staff promote independence and autonomy in daily care?" yesNoField="staff_promote_independence" commentField="staff_promote_independence_comment" yesNoValue={data.staff_promote_independence} commentValue={data.staff_promote_independence_comment} onYesNoChange={(v) => handleChange('staff_promote_independence', v)} onCommentChange={(v) => handleChange('staff_promote_independence_comment', v)} />
              <YesNoQuestion label="Do staff understand the balance between safety and freedom?" yesNoField="staff_understand_safety_freedom_balance" commentField="staff_understand_safety_freedom_balance_comment" yesNoValue={data.staff_understand_safety_freedom_balance} commentValue={data.staff_understand_safety_freedom_balance_comment} onYesNoChange={(v) => handleChange('staff_understand_safety_freedom_balance', v)} onCommentChange={(v) => handleChange('staff_understand_safety_freedom_balance_comment', v)} />
              <YesNoQuestion label="Are restrictions challenged or escalated when no longer needed?" yesNoField="restrictions_challenged_escalated" commentField="restrictions_challenged_escalated_comment" yesNoValue={data.restrictions_challenged_escalated} commentValue={data.restrictions_challenged_escalated_comment} onYesNoChange={(v) => handleChange('restrictions_challenged_escalated', v)} onCommentChange={(v) => handleChange('restrictions_challenged_escalated_comment', v)} />
              <YesNoQuestion label="Are staff able to reflect on their own use of control or limitation?" yesNoField="staff_reflect_on_control_use" commentField="staff_reflect_on_control_use_comment" yesNoValue={data.staff_reflect_on_control_use} commentValue={data.staff_reflect_on_control_use_comment} onYesNoChange={(v) => handleChange('staff_reflect_on_control_use', v)} onCommentChange={(v) => handleChange('staff_reflect_on_control_use_comment', v)} />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={handleComplete} className="px-4 py-2 bg-blue-600 text-white rounded">Complete Audit</button>
          </div>
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

      </div>
    </div>
  );
}
