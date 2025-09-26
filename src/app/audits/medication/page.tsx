 'use client';
import React, { useState } from 'react';
import CompleteAuditModal from '../../../components/ui/complete-audit-modal';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';

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

  // Use YesNoQuestion that matches Care Plan styling and includes a per-question comments textarea
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
    commentField?: string;
    yesNoValue: string;
    commentValue?: string;
    onYesNoChange: (value: string) => void;
    onCommentChange?: (value: string) => void;
  }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
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
          {errors.includes(yesNoField) && <p className="text-red-500 text-sm mt-2">This field is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <textarea
            value={commentValue || ''}
            onChange={(e) => onCommentChange && onCommentChange(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
            rows={2}
            placeholder="Add any comments or observations..."
          />
        </div>
      </div>
    </div>
  );

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

    setErrors([]);
  };

  async function handleModalCreate(createActionPlan: boolean) {
    setShowModal(false);
    // Save audit to Firestore scoped to workspace
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }
    const workspaceId = activeWorkspace.id;
    const payload = {
      ...data,
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
      organisationId: activeWorkspace.organisationId || null,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId, activeWorkspace.organisationId || null);
      setSavedAuditId(id);
      try {
        await markAuditCompleted(workspaceId, 'medication', new Date().toISOString(), activeWorkspace.organisationId || null);
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
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Medication Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive audit to check medication management and safety. All fields are required.</p>
          <div className="space-y-4 mt-4">
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
              <button onClick={addNewReport} className="px-3 py-2 bg-blue-600 text-white rounded-lg">New Report</button>
              <div className="px-3 py-2 bg-slate-100 rounded-lg">Report {currentReport} / {totalReports}</div>
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">Audit Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
                  <input value={data.home} data-field="home" onChange={(e) => handleChange('home', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter home name" />
                  {errors.includes('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input value={data.name} data-field="name" onChange={(e) => handleChange('name', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('name') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter home name" />
                  {errors.includes('name') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person completing the audit</label>
                  <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
                  {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">1. Policies and Procedures</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Is there a current, up-to-date medication policy in place?" yesNoField="medication_policy_current" commentField="medication_policy_current_comment" yesNoValue={data.medication_policy_current} commentValue={data.medication_policy_current_comment} onYesNoChange={(val: string) => handleChange('medication_policy_current', val)} onCommentChange={(val: string) => handleChange('medication_policy_current_comment', val)} />
                  <YesNoQuestion label="Do all staff administering medication have appropriate training and competency assessments?" yesNoField="staff_training_competency" commentField="staff_training_competency_comment" yesNoValue={data.staff_training_competency} commentValue={data.staff_training_competency_comment} onYesNoChange={(val: string) => handleChange('staff_training_competency', val)} onCommentChange={(val: string) => handleChange('staff_training_competency_comment', val)} />
                  <YesNoQuestion label="Are policies followed regarding the handling of controlled drugs?" yesNoField="controlled_drugs_policy" commentField="controlled_drugs_policy_comment" yesNoValue={data.controlled_drugs_policy} commentValue={data.controlled_drugs_policy_comment} onYesNoChange={(val: string) => handleChange('controlled_drugs_policy', val)} onCommentChange={(val: string) => handleChange('controlled_drugs_policy_comment', val)} />
                  <YesNoQuestion label="Is there a procedure in place for reporting medication errors or near misses?" yesNoField="reporting_errors_procedure" commentField="reporting_errors_procedure_comment" yesNoValue={data.reporting_errors_procedure} commentValue={data.reporting_errors_procedure_comment} onYesNoChange={(val: string) => handleChange('reporting_errors_procedure', val)} onCommentChange={(val: string) => handleChange('reporting_errors_procedure_comment', val)} />
                  <YesNoQuestion label="Is the home's policy compliant with NICE guidelines?" yesNoField="policy_nice_compliant" commentField="policy_nice_compliant_comment" yesNoValue={data.policy_nice_compliant} commentValue={data.policy_nice_compliant_comment} onYesNoChange={(val: string) => handleChange('policy_nice_compliant', val)} onCommentChange={(val: string) => handleChange('policy_nice_compliant_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Storage of Medication</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are medications stored securely in a locked cabinet or trolley?" yesNoField="meds_stored_secure" commentField="meds_stored_secure_comment" yesNoValue={data.meds_stored_secure} commentValue={data.meds_stored_secure_comment} onYesNoChange={(val: string) => handleChange('meds_stored_secure', val)} onCommentChange={(val: string) => handleChange('meds_stored_secure_comment', val)} />
                  <YesNoQuestion label="Are controlled drugs stored in a separate locked cabinet (as per legal requirements)?" yesNoField="cds_separate_locked" commentField="cds_separate_locked_comment" yesNoValue={data.cds_separate_locked} commentValue={data.cds_separate_locked_comment} onYesNoChange={(val: string) => handleChange('cds_separate_locked', val)} onCommentChange={(val: string) => handleChange('cds_separate_locked_comment', val)} />
                  <YesNoQuestion label="Is access to medication limited to authorised, trained staff only?" yesNoField="access_limited_authorised" commentField="access_limited_authorised_comment" yesNoValue={data.access_limited_authorised} commentValue={data.access_limited_authorised_comment} onYesNoChange={(val: string) => handleChange('access_limited_authorised', val)} onCommentChange={(val: string) => handleChange('access_limited_authorised_comment', val)} />
                  <YesNoQuestion label="Is the medication fridge lockable, clean, and within correct temperature range (2–8°C)?" yesNoField="med_fridge_lockable" commentField="med_fridge_lockable_comment" yesNoValue={data.med_fridge_lockable} commentValue={data.med_fridge_lockable_comment} onYesNoChange={(val: string) => handleChange('med_fridge_lockable', val)} onCommentChange={(val: string) => handleChange('med_fridge_lockable_comment', val)} />
                  <YesNoQuestion label="Are fridge temperatures recorded daily and actions taken if outside range?" yesNoField="fridge_temps_recorded" commentField="fridge_temps_recorded_comment" yesNoValue={data.fridge_temps_recorded} commentValue={data.fridge_temps_recorded_comment} onYesNoChange={(val: string) => handleChange('fridge_temps_recorded', val)} onCommentChange={(val: string) => handleChange('fridge_temps_recorded_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Medication Administration</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are Medication Administration Records (MAR charts) completed accurately and legibly?" yesNoField="mar_charts_legible" commentField="mar_charts_legible_comment" yesNoValue={data.mar_charts_legible} commentValue={data.mar_charts_legible_comment} onYesNoChange={(val: string) => handleChange('mar_charts_legible', val)} onCommentChange={(val: string) => handleChange('mar_charts_legible_comment', val)} />
                  <YesNoQuestion label="Are staff observed following the 5 rights: right resident, right medication, right dose,right time, right route?" yesNoField="five_rights_followed" commentField="five_rights_followed_comment" yesNoValue={data.five_rights_followed} commentValue={data.five_rights_followed_comment} onYesNoChange={(val: string) => handleChange('five_rights_followed', val)} onCommentChange={(val: string) => handleChange('five_rights_followed_comment', val)} />
                  <YesNoQuestion label="Are medications administered at the correct times and not missed without reason?" yesNoField="meds_given_correct_time" commentField="meds_given_correct_time_comment" yesNoValue={data.meds_given_correct_time} commentValue={data.meds_given_correct_time_comment} onYesNoChange={(val: string) => handleChange('meds_given_correct_time', val)} onCommentChange={(val: string) => handleChange('meds_given_correct_time_comment', val)} />
                  <YesNoQuestion label="Are staff signatures and initials correctly recorded on MAR charts?" yesNoField="signatures_recorded" commentField="signatures_recorded_comment" yesNoValue={data.signatures_recorded} commentValue={data.signatures_recorded_comment} onYesNoChange={(val: string) => handleChange('signatures_recorded', val)} onCommentChange={(val: string) => handleChange('signatures_recorded_comment', val)} />
                  <YesNoQuestion label="Are residents supported to take their medication in a dignified and appropriate manner?" yesNoField="residents_supported_dignified" commentField="residents_supported_dignified_comment" yesNoValue={data.residents_supported_dignified} commentValue={data.residents_supported_dignified_comment} onYesNoChange={(val: string) => handleChange('residents_supported_dignified', val)} onCommentChange={(val: string) => handleChange('residents_supported_dignified_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-3">4. PRN (As Required) Medication</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Is there a clear protocol  for each PRN medication?" yesNoField="prn_protocols_clear" commentField="prn_protocols_clear_comment" yesNoValue={data.prn_protocols_clear} commentValue={data.prn_protocols_clear_comment} onYesNoChange={(val: string) => handleChange('prn_protocols_clear', val)} onCommentChange={(val: string) => handleChange('prn_protocols_clear_comment', val)} />
                  <YesNoQuestion label="Are PRN medications only given when clinically indicated and documented?" yesNoField="prn_given_documented" commentField="prn_given_documented_comment" yesNoValue={data.prn_given_documented} commentValue={data.prn_given_documented_comment} onYesNoChange={(val: string) => handleChange('prn_given_documented', val)} onCommentChange={(val: string) => handleChange('prn_given_documented_comment', val)} />
                  <YesNoQuestion label="Is the effect of PRN medication evaluated and recorded?" yesNoField="prn_effect_evaluated" commentField="prn_effect_evaluated_comment" yesNoValue={data.prn_effect_evaluated} commentValue={data.prn_effect_evaluated_comment} onYesNoChange={(val: string) => handleChange('prn_effect_evaluated', val)} onCommentChange={(val: string) => handleChange('prn_effect_evaluated_comment', val)} />
                  <YesNoQuestion label="Are staff aware of when and how to administer PRNs?" yesNoField="staff_aware_prn" commentField="staff_aware_prn_comment" yesNoValue={data.staff_aware_prn} commentValue={data.staff_aware_prn_comment} onYesNoChange={(val: string) => handleChange('staff_aware_prn', val)} onCommentChange={(val: string) => handleChange('staff_aware_prn_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">5. Controlled Drugs</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are controlled drugs recorded in a bound register with all required entries?" yesNoField="cds_bound_register" commentField="cds_bound_register_comment" yesNoValue={data.cds_bound_register} commentValue={data.cds_bound_register_comment} onYesNoChange={(val: string) => handleChange('cds_bound_register', val)} onCommentChange={(val: string) => handleChange('cds_bound_register_comment', val)} />
                  <YesNoQuestion label="Is stock balance of controlled drugs checked and accurate?" yesNoField="cds_stock_balance_checked" commentField="cds_stock_balance_checked_comment" yesNoValue={data.cds_stock_balance_checked} commentValue={data.cds_stock_balance_checked_comment} onYesNoChange={(val: string) => handleChange('cds_stock_balance_checked', val)} onCommentChange={(val: string) => handleChange('cds_stock_balance_checked_comment', val)} />
                  <YesNoQuestion label="Are two trained staff present when administering controlled drugs?" yesNoField="cds_two_staff_present" commentField="cds_two_staff_present_comment" yesNoValue={data.cds_two_staff_present} commentValue={data.cds_two_staff_present_comment} onYesNoChange={(val: string) => handleChange('cds_two_staff_present', val)} onCommentChange={(val: string) => handleChange('cds_two_staff_present_comment', val)} />
                  <YesNoQuestion label="Are expired or discontinued controlled drugs recorded and stored appropriately for disposal?" yesNoField="cds_expired_recorded" commentField="cds_expired_recorded_comment" yesNoValue={data.cds_expired_recorded} commentValue={data.cds_expired_recorded_comment} onYesNoChange={(val: string) => handleChange('cds_expired_recorded', val)} onCommentChange={(val: string) => handleChange('cds_expired_recorded_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-pink-900 mb-3">6. Ordering and Supply</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Is there a clear process for ordering medication in a timely manner?" yesNoField="ordering_process_clear" commentField="ordering_process_clear_comment" yesNoValue={data.ordering_process_clear} commentValue={data.ordering_process_clear_comment} onYesNoChange={(val: string) => handleChange('ordering_process_clear', val)} onCommentChange={(val: string) => handleChange('ordering_process_clear_comment', val)} />
                  <YesNoQuestion label="Are medication deliveries checked and recorded by staff?" yesNoField="deliveries_checked_recorded" commentField="deliveries_checked_recorded_comment" yesNoValue={data.deliveries_checked_recorded} commentValue={data.deliveries_checked_recorded_comment} onYesNoChange={(val: string) => handleChange('deliveries_checked_recorded', val)} onCommentChange={(val: string) => handleChange('deliveries_checked_recorded_comment', val)} />
                  <YesNoQuestion label="Is there a process for handling discrepancies in orders?" yesNoField="discrepancies_process" commentField="discrepancies_process_comment" yesNoValue={data.discrepancies_process} commentValue={data.discrepancies_process_comment} onYesNoChange={(val: string) => handleChange('discrepancies_process', val)} onCommentChange={(val: string) => handleChange('discrepancies_process_comment', val)} />
                  <YesNoQuestion label="Are residents' medications available and not out of stock?" yesNoField="meds_available_not_out" commentField="meds_available_not_out_comment" yesNoValue={data.meds_available_not_out} commentValue={data.meds_available_not_out_comment} onYesNoChange={(val: string) => handleChange('meds_available_not_out', val)} onCommentChange={(val: string) => handleChange('meds_available_not_out_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-3">7. Disposal of Medication</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Is there a secure system for disposing of unwanted or expired medication?" yesNoField="disposal_system_secure" commentField="disposal_system_secure_comment" yesNoValue={data.disposal_system_secure} commentValue={data.disposal_system_secure_comment} onYesNoChange={(val: string) => handleChange('disposal_system_secure', val)} onCommentChange={(val: string) => handleChange('disposal_system_secure_comment', val)} />
                  <YesNoQuestion label="Are records kept of medication returned to pharmacy or disposed of?" yesNoField="disposal_records_kept" commentField="disposal_records_kept_comment" yesNoValue={data.disposal_records_kept} commentValue={data.disposal_records_kept_comment} onYesNoChange={(val: string) => handleChange('disposal_records_kept', val)} onCommentChange={(val: string) => handleChange('disposal_records_kept_comment', val)} />
                  <YesNoQuestion label="Are controlled drugs disposed of with witness signatures as per regulation?" yesNoField="cds_disposed_witnessed" commentField="cds_disposed_witnessed_comment" yesNoValue={data.cds_disposed_witnessed} commentValue={data.cds_disposed_witnessed_comment} onYesNoChange={(val: string) => handleChange('cds_disposed_witnessed', val)} onCommentChange={(val: string) => handleChange('cds_disposed_witnessed_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">8. Covert Medication (If Applicable)</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Is covert administration supported by a best interest decision and GP approval?" yesNoField="covert_best_interest" commentField="covert_best_interest_comment" yesNoValue={data.covert_best_interest} commentValue={data.covert_best_interest_comment} onYesNoChange={(val: string) => handleChange('covert_best_interest', val)} onCommentChange={(val: string) => handleChange('covert_best_interest_comment', val)} />
                  <YesNoQuestion label="Are covert care plans and risk assessments in place and reviewed regularly?" yesNoField="covert_care_plans" commentField="covert_care_plans_comment" yesNoValue={data.covert_care_plans} commentValue={data.covert_care_plans_comment} onYesNoChange={(val: string) => handleChange('covert_care_plans', val)} onCommentChange={(val: string) => handleChange('covert_care_plans_comment', val)} />
                  <YesNoQuestion label="Is covert administration clearly documented and monitored?" yesNoField="covert_documented_monitored" commentField="covert_documented_monitored_comment" yesNoValue={data.covert_documented_monitored} commentValue={data.covert_documented_monitored_comment} onYesNoChange={(val: string) => handleChange('covert_documented_monitored', val)} onCommentChange={(val: string) => handleChange('covert_documented_monitored_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">9. Medication Errors and Incident Reporting</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are all medication errors or near misses documented and investigated?" yesNoField="errors_documented" commentField="errors_documented_comment" yesNoValue={data.errors_documented} commentValue={data.errors_documented_comment} onYesNoChange={(val: string) => handleChange('errors_documented', val)} onCommentChange={(val: string) => handleChange('errors_documented_comment', val)} />
                  <YesNoQuestion label="Is there evidence of learning from errors and actions taken?" yesNoField="learning_from_errors" commentField="learning_from_errors_comment" yesNoValue={data.learning_from_errors} commentValue={data.learning_from_errors_comment} onYesNoChange={(val: string) => handleChange('learning_from_errors', val)} onCommentChange={(val: string) => handleChange('learning_from_errors_comment', val)} />
                  <YesNoQuestion label="Are safeguarding concerns reported where necessary?" yesNoField="safeguarding_reported" commentField="safeguarding_reported_comment" yesNoValue={data.safeguarding_reported} commentValue={data.safeguarding_reported_comment} onYesNoChange={(val: string) => handleChange('safeguarding_reported', val)} onCommentChange={(val: string) => handleChange('safeguarding_reported_comment', val)} />
                  <YesNoQuestion label="Are staff confident in the procedure for reporting errors?" yesNoField="staff_confident_reporting" commentField="staff_confident_reporting_comment" yesNoValue={data.staff_confident_reporting} commentValue={data.staff_confident_reporting_comment} onYesNoChange={(val: string) => handleChange('staff_confident_reporting', val)} onCommentChange={(val: string) => handleChange('staff_confident_reporting_comment', val)} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-pink-900 mb-3">10. Resident-Centred Practice</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are residents involved in decisions about their medication?" yesNoField="residents_involved_decisions" commentField="residents_involved_decisions_comment" yesNoValue={data.residents_involved_decisions} commentValue={data.residents_involved_decisions_comment} onYesNoChange={(val: string) => handleChange('residents_involved_decisions', val)} onCommentChange={(val: string) => handleChange('residents_involved_decisions_comment', val)} />
                  <YesNoQuestion label="Are residents supported to self-administer where appropriate?" yesNoField="residents_supported_self_admin" commentField="residents_supported_self_admin_comment" yesNoValue={data.residents_supported_self_admin} commentValue={data.residents_supported_self_admin_comment} onYesNoChange={(val: string) => handleChange('residents_supported_self_admin', val)} onCommentChange={(val: string) => handleChange('residents_supported_self_admin_comment', val)} />
                  <YesNoQuestion label="Are medication reviews carried out regularly (e.g. with GP, pharmacist)?" yesNoField="medication_reviews_regular" commentField="medication_reviews_regular_comment" yesNoValue={data.medication_reviews_regular} commentValue={data.medication_reviews_regular_comment} onYesNoChange={(val: string) => handleChange('medication_reviews_regular', val)} onCommentChange={(val: string) => handleChange('medication_reviews_regular_comment', val)} />
                  <YesNoQuestion label="Are allergies clearly documented and highlighted?" yesNoField="allergies_documented" commentField="allergies_documented_comment" yesNoValue={data.allergies_documented} commentValue={data.allergies_documented_comment} onYesNoChange={(val: string) => handleChange('allergies_documented', val)} onCommentChange={(val: string) => handleChange('allergies_documented_comment', val)} />
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">Complete Audit</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Final comments area */}
      <div className="max-w-4xl mx-auto p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
        <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} placeholder="Any additional comments or observations..." className="w-full p-3 border rounded h-28 resize-none" />
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
  );
}
