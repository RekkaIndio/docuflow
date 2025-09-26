"use client";
import { useState } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';

interface ManagersMonthlyData {
  home: string;
  date: string;
  personCompletingAudit: string;

  care_plans_recent: string;
  care_plans_recent_comment: string;
  daily_care_notes_completed: string;
  daily_care_notes_completed_comment: string;
  risk_assessments_up_to_date: string;
  risk_assessments_up_to_date_comment: string;
  mental_capacity_records: string;
  mental_capacity_records_comment: string;
  dols_applications_tracked: string;
  dols_applications_tracked_comment: string;

  mar_charts_completed: string;
  mar_charts_completed_comment: string;
  controlled_drugs_checked: string;
  controlled_drugs_checked_comment: string;
  fridge_room_temps_monitored: string;
  fridge_room_temps_monitored_comment: string;
  med_errors_recorded_followed: string;
  med_errors_recorded_followed_comment: string;
  prn_covert_protocols: string;
  prn_covert_protocols_comment: string;

  hand_hygiene_audits: string;
  hand_hygiene_audits_comment: string;
  cleaning_schedules_signed: string;
  cleaning_schedules_signed_comment: string;
  staff_following_ipc: string;
  staff_following_ipc_comment: string;
  waste_managed_correctly: string;
  waste_managed_correctly_comment: string;
  stocks_ppe_cleaning_ok: string;
  stocks_ppe_cleaning_ok_comment: string;

  staffing_levels_adequate: string;
  staffing_levels_adequate_comment: string;
  recruitment_checks_complete: string;
  recruitment_checks_complete_comment: string;
  supervisions_appraisals_up_to_date: string;
  supervisions_appraisals_up_to_date_comment: string;
  training_records_up_to_date: string;
  training_records_up_to_date_comment: string;
  agency_inducted_monitored: string;
  agency_inducted_monitored_comment: string;

  environmental_checks_completed: string;
  environmental_checks_completed_comment: string;
  maintenance_issues_logged: string;
  maintenance_issues_logged_comment: string;
  risk_assessments_reviewed: string;
  risk_assessments_reviewed_comment: string;
  incident_logs_reviewed: string;
  incident_logs_reviewed_comment: string;
  fire_drills_recorded: string;
  fire_drills_recorded_comment: string;

  residents_involved_in_decisions: string;
  residents_involved_in_decisions_comment: string;
  complaints_logged_responded: string;
  complaints_logged_responded_comment: string;
  activities_social_engagement: string;
  activities_social_engagement_comment: string;
  choice_independence_dignity: string;
  choice_independence_dignity_comment: string;
  safeguarding_concerns_followed: string;
  safeguarding_concerns_followed_comment: string;

  weights_monitored_referrals: string;
  weights_monitored_referrals_comment: string;
  food_fluid_charts_used: string;
  food_fluid_charts_used_comment: string;
  mealtime_audits_feedback: string;
  mealtime_audits_feedback_comment: string;
  special_diets_met: string;
  special_diets_met_comment: string;
  kitchen_compliant: string;
  kitchen_compliant_comment: string;

  internal_audits_completed: string;
  internal_audits_completed_comment: string;
  actions_followed_closed: string;
  actions_followed_closed_comment: string;
  policies_procedures_reviewed: string;
  policies_procedures_reviewed_comment: string;
  cqc_compliance_monitored: string;
  cqc_compliance_monitored_comment: string;
  qa_reports_feedback_analysed: string;
  qa_reports_feedback_analysed_comment: string;
}

const initialData: ManagersMonthlyData = {
  home: '',
  date: '',
  personCompletingAudit: '',

  care_plans_recent: '',
  care_plans_recent_comment: '',
  daily_care_notes_completed: '',
  daily_care_notes_completed_comment: '',
  risk_assessments_up_to_date: '',
  risk_assessments_up_to_date_comment: '',
  mental_capacity_records: '',
  mental_capacity_records_comment: '',
  dols_applications_tracked: '',
  dols_applications_tracked_comment: '',

  mar_charts_completed: '',
  mar_charts_completed_comment: '',
  controlled_drugs_checked: '',
  controlled_drugs_checked_comment: '',
  fridge_room_temps_monitored: '',
  fridge_room_temps_monitored_comment: '',
  med_errors_recorded_followed: '',
  med_errors_recorded_followed_comment: '',
  prn_covert_protocols: '',
  prn_covert_protocols_comment: '',

  hand_hygiene_audits: '',
  hand_hygiene_audits_comment: '',
  cleaning_schedules_signed: '',
  cleaning_schedules_signed_comment: '',
  staff_following_ipc: '',
  staff_following_ipc_comment: '',
  waste_managed_correctly: '',
  waste_managed_correctly_comment: '',
  stocks_ppe_cleaning_ok: '',
  stocks_ppe_cleaning_ok_comment: '',

  staffing_levels_adequate: '',
  staffing_levels_adequate_comment: '',
  recruitment_checks_complete: '',
  recruitment_checks_complete_comment: '',
  supervisions_appraisals_up_to_date: '',
  supervisions_appraisals_up_to_date_comment: '',
  training_records_up_to_date: '',
  training_records_up_to_date_comment: '',
  agency_inducted_monitored: '',
  agency_inducted_monitored_comment: '',

  environmental_checks_completed: '',
  environmental_checks_completed_comment: '',
  maintenance_issues_logged: '',
  maintenance_issues_logged_comment: '',
  risk_assessments_reviewed: '',
  risk_assessments_reviewed_comment: '',
  incident_logs_reviewed: '',
  incident_logs_reviewed_comment: '',
  fire_drills_recorded: '',
  fire_drills_recorded_comment: '',

  residents_involved_in_decisions: '',
  residents_involved_in_decisions_comment: '',
  complaints_logged_responded: '',
  complaints_logged_responded_comment: '',
  activities_social_engagement: '',
  activities_social_engagement_comment: '',
  choice_independence_dignity: '',
  choice_independence_dignity_comment: '',
  safeguarding_concerns_followed: '',
  safeguarding_concerns_followed_comment: '',

  weights_monitored_referrals: '',
  weights_monitored_referrals_comment: '',
  food_fluid_charts_used: '',
  food_fluid_charts_used_comment: '',
  mealtime_audits_feedback: '',
  mealtime_audits_feedback_comment: '',
  special_diets_met: '',
  special_diets_met_comment: '',
  kitchen_compliant: '',
  kitchen_compliant_comment: '',

  internal_audits_completed: '',
  internal_audits_completed_comment: '',
  actions_followed_closed: '',
  actions_followed_closed_comment: '',
  policies_procedures_reviewed: '',
  policies_procedures_reviewed_comment: '',
  cqc_compliance_monitored: '',
  cqc_compliance_monitored_comment: '',
  qa_reports_feedback_analysed: '',
  qa_reports_feedback_analysed_comment: '',
};

export default function ManagersMonthlyAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const [data, setData] = useState<ManagersMonthlyData>(initialData);

  const handleChange = (field: keyof ManagersMonthlyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field as string)) setErrors(prev => prev.filter(e => e !== (field as string)));
  };

  const YesNoQuestion = ({ label, yesNoField, commentField, yesNoValue, commentValue, onYesNoChange, onCommentChange }: { label: string; yesNoField: string; commentField: string; yesNoValue: string; commentValue: string; onYesNoChange: (v: string) => void; onCommentChange: (v: string) => void; }) => (
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
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
            rows={2}
            placeholder="Add any comments or observations..."
          />
        </div>
      </div>
    </div>
  );

  const validateForm = () => {
    const required: (keyof ManagersMonthlyData)[] = [
      'home','date','personCompletingAudit',
      'care_plans_recent','daily_care_notes_completed','risk_assessments_up_to_date','mental_capacity_records','dols_applications_tracked',
      'mar_charts_completed','controlled_drugs_checked','fridge_room_temps_monitored','med_errors_recorded_followed','prn_covert_protocols',
      'hand_hygiene_audits','cleaning_schedules_signed','staff_following_ipc','waste_managed_correctly','stocks_ppe_cleaning_ok',
      'staffing_levels_adequate','recruitment_checks_complete','supervisions_appraisals_up_to_date','training_records_up_to_date','agency_inducted_monitored',
      'environmental_checks_completed','maintenance_issues_logged','risk_assessments_reviewed','incident_logs_reviewed','fire_drills_recorded',
      'residents_involved_in_decisions','complaints_logged_responded','activities_social_engagement','choice_independence_dignity','safeguarding_concerns_followed',
      'weights_monitored_referrals','food_fluid_charts_used','mealtime_audits_feedback','special_diets_met','kitchen_compliant',
      'internal_audits_completed','actions_followed_closed','policies_procedures_reviewed','cqc_compliance_monitored','qa_reports_feedback_analysed'
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

    const payload = {
      ...data,
      comments: finalComments,
      createActionPlan: !!createActionPlan,
      createdBy: user?.id ?? null,
      workspaceId: activeWorkspaceId,
      organisationId: activeWorkspace?.organisationId || null,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, activeWorkspaceId, activeWorkspace?.organisationId || null);
      setSavedAuditId(id);
      const completedAt = data.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspaceId, 'managers-monthly', completedAt, activeWorkspace?.organisationId || null);
      alert('Audit saved');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save managers-monthly audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const addNewReport = () => {
    setData(initialData);
    setCurrentReport(prev => prev + 1);
  };

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Managers Monthly Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive monthly check. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div className="text-sm text-slate-600">
              <strong>Sections:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Care planning & documentation</li>
                <li>Medication management</li>
                <li>IPC, Staffing, Environment, Residents</li>
                <li>Quality & compliance</li>
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input type="date" value={data.date} data-field="date" onChange={(e) => handleChange('date', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person completing the audit</label>
                  <input value={data.personCompletingAudit} data-field="personCompletingAudit" onChange={(e) => handleChange('personCompletingAudit', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Enter auditor name" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">1. Care Planning and Documentation</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are all care plans reviewed and updated within the last 30 days?" yesNoField="care_plans_recent" commentField="care_plans_recent_comment" yesNoValue={data.care_plans_recent} commentValue={data.care_plans_recent_comment} onYesNoChange={(v) => handleChange('care_plans_recent', v)} onCommentChange={(v) => handleChange('care_plans_recent_comment', v)} />
                  <YesNoQuestion label="Are daily care notes consistently completed and person-centred?" yesNoField="daily_care_notes_completed" commentField="daily_care_notes_completed_comment" yesNoValue={data.daily_care_notes_completed} commentValue={data.daily_care_notes_completed_comment} onYesNoChange={(v) => handleChange('daily_care_notes_completed', v)} onCommentChange={(v) => handleChange('daily_care_notes_completed_comment', v)} />
                  <YesNoQuestion label="Are risk assessments (falls, pressure ulcers, nutrition, etc.) up to date?" yesNoField="risk_assessments_up_to_date" commentField="risk_assessments_up_to_date_comment" yesNoValue={data.risk_assessments_up_to_date} commentValue={data.risk_assessments_up_to_date_comment} onYesNoChange={(v) => handleChange('risk_assessments_up_to_date', v)} onCommentChange={(v) => handleChange('risk_assessments_up_to_date_comment', v)} />
                  <YesNoQuestion label="Are mental capacity assessments and best interest decisions recorded where required?" yesNoField="mental_capacity_records" commentField="mental_capacity_records_comment" yesNoValue={data.mental_capacity_records} commentValue={data.mental_capacity_records_comment} onYesNoChange={(v) => handleChange('mental_capacity_records', v)} onCommentChange={(v) => handleChange('mental_capacity_records_comment', v)} />
                  <YesNoQuestion label="Are DoLS applications made appropriately and tracked?" yesNoField="dols_applications_tracked" commentField="dols_applications_tracked_comment" yesNoValue={data.dols_applications_tracked} commentValue={data.dols_applications_tracked_comment} onYesNoChange={(v) => handleChange('dols_applications_tracked', v)} onCommentChange={(v) => handleChange('dols_applications_tracked_comment', v)} />
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Medication Management</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are MAR charts completed accurately with no missing signatures?" yesNoField="mar_charts_completed" commentField="mar_charts_completed_comment" yesNoValue={data.mar_charts_completed} commentValue={data.mar_charts_completed_comment} onYesNoChange={(v) => handleChange('mar_charts_completed', v)} onCommentChange={(v) => handleChange('mar_charts_completed_comment', v)} />
                  <YesNoQuestion label="Are controlled drugs checked and recorded in line with policy?" yesNoField="controlled_drugs_checked" commentField="controlled_drugs_checked_comment" yesNoValue={data.controlled_drugs_checked} commentValue={data.controlled_drugs_checked_comment} onYesNoChange={(v) => handleChange('controlled_drugs_checked', v)} onCommentChange={(v) => handleChange('controlled_drugs_checked_comment', v)} />
                  <YesNoQuestion label="Are fridge and room temperatures monitored and within range?" yesNoField="fridge_room_temps_monitored" commentField="fridge_room_temps_monitored_comment" yesNoValue={data.fridge_room_temps_monitored} commentValue={data.fridge_room_temps_monitored_comment} onYesNoChange={(v) => handleChange('fridge_room_temps_monitored', v)} onCommentChange={(v) => handleChange('fridge_room_temps_monitored_comment', v)} />
                  <YesNoQuestion label="Are any medication errors recorded, investigated, and followed up?" yesNoField="med_errors_recorded_followed" commentField="med_errors_recorded_followed_comment" yesNoValue={data.med_errors_recorded_followed} commentValue={data.med_errors_recorded_followed_comment} onYesNoChange={(v) => handleChange('med_errors_recorded_followed', v)} onCommentChange={(v) => handleChange('med_errors_recorded_followed_comment', v)} />
                  <YesNoQuestion label="Are PRN and covert medication protocols in place and appropriate?" yesNoField="prn_covert_protocols" commentField="prn_covert_protocols_comment" yesNoValue={data.prn_covert_protocols} commentValue={data.prn_covert_protocols_comment} onYesNoChange={(v) => handleChange('prn_covert_protocols', v)} onCommentChange={(v) => handleChange('prn_covert_protocols_comment', v)} />
                </div>
              </div>

              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Infection Prevention and Control</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are hand hygiene and PPE audits completed regularly?" yesNoField="hand_hygiene_audits" commentField="hand_hygiene_audits_comment" yesNoValue={data.hand_hygiene_audits} commentValue={data.hand_hygiene_audits_comment} onYesNoChange={(v) => handleChange('hand_hygiene_audits', v)} onCommentChange={(v) => handleChange('hand_hygiene_audits_comment', v)} />
                  <YesNoQuestion label="Are cleaning schedules up to date and signed?" yesNoField="cleaning_schedules_signed" commentField="cleaning_schedules_signed_comment" yesNoValue={data.cleaning_schedules_signed} commentValue={data.cleaning_schedules_signed_comment} onYesNoChange={(v) => handleChange('cleaning_schedules_signed', v)} onCommentChange={(v) => handleChange('cleaning_schedules_signed_comment', v)} />
                  <YesNoQuestion label="Are all staff following current IPC guidance (e.g. isolation, testing)?" yesNoField="staff_following_ipc" commentField="staff_following_ipc_comment" yesNoValue={data.staff_following_ipc} commentValue={data.staff_following_ipc_comment} onYesNoChange={(v) => handleChange('staff_following_ipc', v)} onCommentChange={(v) => handleChange('staff_following_ipc_comment', v)} />
                  <YesNoQuestion label="Are clinical and domestic waste managed correctly?" yesNoField="waste_managed_correctly" commentField="waste_managed_correctly_comment" yesNoValue={data.waste_managed_correctly} commentValue={data.waste_managed_correctly_comment} onYesNoChange={(v) => handleChange('waste_managed_correctly', v)} onCommentChange={(v) => handleChange('waste_managed_correctly_comment', v)} />
                  <YesNoQuestion label="Are there sufficient stocks of PPE and cleaning materials?" yesNoField="stocks_ppe_cleaning_ok" commentField="stocks_ppe_cleaning_ok_comment" yesNoValue={data.stocks_ppe_cleaning_ok} commentValue={data.stocks_ppe_cleaning_ok_comment} onYesNoChange={(v) => handleChange('stocks_ppe_cleaning_ok', v)} onCommentChange={(v) => handleChange('stocks_ppe_cleaning_ok_comment', v)} />
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3">4. Staffing and Supervision</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are staffing levels adequate and in line with dependency levels?" yesNoField="staffing_levels_adequate" commentField="staffing_levels_adequate_comment" yesNoValue={data.staffing_levels_adequate} commentValue={data.staffing_levels_adequate_comment} onYesNoChange={(v) => handleChange('staffing_levels_adequate', v)} onCommentChange={(v) => handleChange('staffing_levels_adequate_comment', v)} />
                  <YesNoQuestion label="Are recruitment checks complete for any new starters (DBS, references)?" yesNoField="recruitment_checks_complete" commentField="recruitment_checks_complete_comment" yesNoValue={data.recruitment_checks_complete} commentValue={data.recruitment_checks_complete_comment} onYesNoChange={(v) => handleChange('recruitment_checks_complete', v)} onCommentChange={(v) => handleChange('recruitment_checks_complete_comment', v)} />
                  <YesNoQuestion label="Are supervisions and appraisals up to date for all staff?" yesNoField="supervisions_appraisals_up_to_date" commentField="supervisions_appraisals_up_to_date_comment" yesNoValue={data.supervisions_appraisals_up_to_date} commentValue={data.supervisions_appraisals_up_to_date_comment} onYesNoChange={(v) => handleChange('supervisions_appraisals_up_to_date', v)} onCommentChange={(v) => handleChange('supervisions_appraisals_up_to_date_comment', v)} />
                  <YesNoQuestion label="Are training records up to date and reflect mandatory requirements?" yesNoField="training_records_up_to_date" commentField="training_records_up_to_date_comment" yesNoValue={data.training_records_up_to_date} commentValue={data.training_records_up_to_date_comment} onYesNoChange={(v) => handleChange('training_records_up_to_date', v)} onCommentChange={(v) => handleChange('training_records_up_to_date_comment', v)} />
                  <YesNoQuestion label="Are agency staff inducted and monitored appropriately?" yesNoField="agency_inducted_monitored" commentField="agency_inducted_monitored_comment" yesNoValue={data.agency_inducted_monitored} commentValue={data.agency_inducted_monitored_comment} onYesNoChange={(v) => handleChange('agency_inducted_monitored', v)} onCommentChange={(v) => handleChange('agency_inducted_monitored_comment', v)} />
                </div>
              </div>

              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-pink-900 mb-3">5. Health and Safety</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are environmental checks completed (e.g. water temp, fire exits)?" yesNoField="environmental_checks_completed" commentField="environmental_checks_completed_comment" yesNoValue={data.environmental_checks_completed} commentValue={data.environmental_checks_completed_comment} onYesNoChange={(v) => handleChange('environmental_checks_completed', v)} onCommentChange={(v) => handleChange('environmental_checks_completed_comment', v)} />
                  <YesNoQuestion label="Are maintenance issues logged and addressed promptly?" yesNoField="maintenance_issues_logged" commentField="maintenance_issues_logged_comment" yesNoValue={data.maintenance_issues_logged} commentValue={data.maintenance_issues_logged_comment} onYesNoChange={(v) => handleChange('maintenance_issues_logged', v)} onCommentChange={(v) => handleChange('maintenance_issues_logged_comment', v)} />
                  <YesNoQuestion label="Are risk assessments reviewed and signed (e.g. COSHH, moving and handling)?" yesNoField="risk_assessments_reviewed" commentField="risk_assessments_reviewed_comment" yesNoValue={data.risk_assessments_reviewed} commentValue={data.risk_assessments_reviewed_comment} onYesNoChange={(v) => handleChange('risk_assessments_reviewed', v)} onCommentChange={(v) => handleChange('risk_assessments_reviewed_comment', v)} />
                  <YesNoQuestion label="Are accident/incident logs reviewed monthly and analysed for trends?" yesNoField="incident_logs_reviewed" commentField="incident_logs_reviewed_comment" yesNoValue={data.incident_logs_reviewed} commentValue={data.incident_logs_reviewed_comment} onYesNoChange={(v) => handleChange('incident_logs_reviewed', v)} onCommentChange={(v) => handleChange('incident_logs_reviewed_comment', v)} />
                  <YesNoQuestion label="Is there a record of fire drills and evacuation practices?" yesNoField="fire_drills_recorded" commentField="fire_drills_recorded_comment" yesNoValue={data.fire_drills_recorded} commentValue={data.fire_drills_recorded_comment} onYesNoChange={(v) => handleChange('fire_drills_recorded', v)} onCommentChange={(v) => handleChange('fire_drills_recorded_comment', v)} />
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-amber-900 mb-3">6. Resident Wellbeing and Rights</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are residents involved in decision-making about their care?" yesNoField="residents_involved_in_decisions" commentField="residents_involved_in_decisions_comment" yesNoValue={data.residents_involved_in_decisions} commentValue={data.residents_involved_in_decisions_comment} onYesNoChange={(v) => handleChange('residents_involved_in_decisions', v)} onCommentChange={(v) => handleChange('residents_involved_in_decisions_comment', v)} />
                  <YesNoQuestion label="Are complaints, compliments and concerns logged and responded to?" yesNoField="complaints_logged_responded" commentField="complaints_logged_responded_comment" yesNoValue={data.complaints_logged_responded} commentValue={data.complaints_logged_responded_comment} onYesNoChange={(v) => handleChange('complaints_logged_responded', v)} onCommentChange={(v) => handleChange('complaints_logged_responded_comment', v)} />
                  <YesNoQuestion label="Are there activities and social engagement opportunities in place?" yesNoField="activities_social_engagement" commentField="activities_social_engagement_comment" yesNoValue={data.activities_social_engagement} commentValue={data.activities_social_engagement_comment} onYesNoChange={(v) => handleChange('activities_social_engagement', v)} onCommentChange={(v) => handleChange('activities_social_engagement_comment', v)} />
                  <YesNoQuestion label="Are residents supported with choice, independence, and dignity?" yesNoField="choice_independence_dignity" commentField="choice_independence_dignity_comment" yesNoValue={data.choice_independence_dignity} commentValue={data.choice_independence_dignity_comment} onYesNoChange={(v) => handleChange('choice_independence_dignity', v)} onCommentChange={(v) => handleChange('choice_independence_dignity_comment', v)} />
                  <YesNoQuestion label="Are safeguarding concerns raised and followed up properly?" yesNoField="safeguarding_concerns_followed" commentField="safeguarding_concerns_followed_comment" yesNoValue={data.safeguarding_concerns_followed} commentValue={data.safeguarding_concerns_followed_comment} onYesNoChange={(v) => handleChange('safeguarding_concerns_followed', v)} onCommentChange={(v) => handleChange('safeguarding_concerns_followed_comment', v)} />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">7. Nutrition and Mealtimes</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are weights monitored and referrals made where needed (e.g. dietitian)?" yesNoField="weights_monitored_referrals" commentField="weights_monitored_referrals_comment" yesNoValue={data.weights_monitored_referrals} commentValue={data.weights_monitored_referrals_comment} onYesNoChange={(v) => handleChange('weights_monitored_referrals', v)} onCommentChange={(v) => handleChange('weights_monitored_referrals_comment', v)} />
                  <YesNoQuestion label="Are food/fluid charts used appropriately and completed accurately?" yesNoField="food_fluid_charts_used" commentField="food_fluid_charts_used_comment" yesNoValue={data.food_fluid_charts_used} commentValue={data.food_fluid_charts_used_comment} onYesNoChange={(v) => handleChange('food_fluid_charts_used', v)} onCommentChange={(v) => handleChange('food_fluid_charts_used_comment', v)} />
                  <YesNoQuestion label="Are mealtime audits carried out, and feedback gathered from residents?" yesNoField="mealtime_audits_feedback" commentField="mealtime_audits_feedback_comment" yesNoValue={data.mealtime_audits_feedback} commentValue={data.mealtime_audits_feedback_comment} onYesNoChange={(v) => handleChange('mealtime_audits_feedback', v)} onCommentChange={(v) => handleChange('mealtime_audits_feedback_comment', v)} />
                  <YesNoQuestion label="Are special dietary needs being met safely and appropriately?" yesNoField="special_diets_met" commentField="special_diets_met_comment" yesNoValue={data.special_diets_met} commentValue={data.special_diets_met_comment} onYesNoChange={(v) => handleChange('special_diets_met', v)} onCommentChange={(v) => handleChange('special_diets_met_comment', v)} />
                  <YesNoQuestion label="Is the kitchen compliant with food hygiene standards?" yesNoField="kitchen_compliant" commentField="kitchen_compliant_comment" yesNoValue={data.kitchen_compliant} commentValue={data.kitchen_compliant_comment} onYesNoChange={(v) => handleChange('kitchen_compliant', v)} onCommentChange={(v) => handleChange('kitchen_compliant_comment', v)} />
                </div>
              </div>

              <div className="bg-sky-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-sky-900 mb-3">8. Audits, Governance and Compliance</h3>
                <div className="space-y-4">
                  <YesNoQuestion label="Are internal audits (care plans, medication, H&S, etc.) completed this month?" yesNoField="internal_audits_completed" commentField="internal_audits_completed_comment" yesNoValue={data.internal_audits_completed} commentValue={data.internal_audits_completed_comment} onYesNoChange={(v) => handleChange('internal_audits_completed', v)} onCommentChange={(v) => handleChange('internal_audits_completed_comment', v)} />
                  <YesNoQuestion label="Are any actions from previous audits followed up and closed?" yesNoField="actions_followed_closed" commentField="actions_followed_closed_comment" yesNoValue={data.actions_followed_closed} commentValue={data.actions_followed_closed_comment} onYesNoChange={(v) => handleChange('actions_followed_closed', v)} onCommentChange={(v) => handleChange('actions_followed_closed_comment', v)} />
                  <YesNoQuestion label="Are policies and procedures reviewed and accessible?" yesNoField="policies_procedures_reviewed" commentField="policies_procedures_reviewed_comment" yesNoValue={data.policies_procedures_reviewed} commentValue={data.policies_procedures_reviewed_comment} onYesNoChange={(v) => handleChange('policies_procedures_reviewed', v)} onCommentChange={(v) => handleChange('policies_procedures_reviewed_comment', v)} />
                  <YesNoQuestion label="Is CQC compliance monitored, and PIR or inspection preparedness maintained?" yesNoField="cqc_compliance_monitored" commentField="cqc_compliance_monitored_comment" yesNoValue={data.cqc_compliance_monitored} commentValue={data.cqc_compliance_monitored_comment} onYesNoChange={(v) => handleChange('cqc_compliance_monitored', v)} onCommentChange={(v) => handleChange('cqc_compliance_monitored_comment', v)} />
                  <YesNoQuestion label="Are quality assurance reports and resident/family feedback analysed?" yesNoField="qa_reports_feedback_analysed" commentField="qa_reports_feedback_analysed_comment" yesNoValue={data.qa_reports_feedback_analysed} commentValue={data.qa_reports_feedback_analysed_comment} onYesNoChange={(v) => handleChange('qa_reports_feedback_analysed', v)} onCommentChange={(v) => handleChange('qa_reports_feedback_analysed_comment', v)} />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Final comments</label>
                <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} rows={4} placeholder="Final comments for this audit" className="w-full p-2 border rounded resize-none mt-2" />
              </div>

              <div className="flex justify-center mt-8">
                <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">Complete Audit</button>
              </div>
            </div>
          </form>
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