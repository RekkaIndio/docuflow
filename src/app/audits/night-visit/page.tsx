"use client";
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<boolean[]>(Array(10).fill(false));

  const toggleSection = (index: number) => {
    setOpenSections(prev => prev.map((open, i) => i === index ? !open : open));
  };

  // Section definitions with guidance text
  const sections = [
    {
      title: "1. Staffing and Presence",
      guidance: "Verify adequate staffing levels, staff visibility, and proper identification during night visits.",
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
      guidance: "Assess resident safety measures, monitoring procedures, and support for residents during night hours.",
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
      guidance: "Check security measures, fire safety, and environmental conditions during night visits.",
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
      guidance: "Verify medication storage, administration records, and clinical care procedures during night shifts.",
      questions: [
        { label: "Are night medications stored securely?", yesNoField: "night_meds_stored_secure" },
        { label: "Are MAR charts up to date for administered medications?", yesNoField: "mar_chart_up_to_date" },
        { label: "Are controlled drugs stored and recorded correctly?", yesNoField: "cds_stored_recorded" },
        { label: "Are wound dressings documented and appropriate?", yesNoField: "wound_dressings_documented" }
      ]
    },
    {
      title: "5. Infection Control and Hygiene",
      guidance: "Assess hygiene practices, PPE usage, and infection control measures during night visits.",
      questions: [
        { label: "Is hand hygiene and PPE being followed?", yesNoField: "hand_hygiene_ppe_followed" },
        { label: "Is PPE available for staff?", yesNoField: "ppe_available" },
        { label: "Is the home clean and odour-free?", yesNoField: "home_clean_odour_free" },
        { label: "Are continence aids stored correctly?", yesNoField: "continence_aids_stored_correct" }
      ]
    },
    {
      title: "6. Food, Fluids and Kitchen",
      guidance: "Check availability of refreshments and kitchen cleanliness during night hours.",
      questions: [
        { label: "Are drinks/snacks available for residents?", yesNoField: "drinks_snacks_available" },
        { label: "Is the kitchen clean and tidy?", yesNoField: "kitchen_clean_tidy" },
        { label: "Is food hygiene being followed?", yesNoField: "food_hygiene_followed" }
      ]
    },
    {
      title: "7. Record Keeping and Handover",
      guidance: "Verify documentation completeness and handover procedures during night shifts.",
      questions: [
        { label: "Are care notes up to date?", yesNoField: "care_notes_up_to_date" },
        { label: "Are monitoring documents (observations) completed?", yesNoField: "monitoring_docs_completed" },
        { label: "Is handover documented appropriately?", yesNoField: "handover_documented" },
        { label: "Have any incidents been recorded?", yesNoField: "incidents_recorded" }
      ]
    },
    {
      title: "8. Staff Conduct and Morale",
      guidance: "Assess staff professionalism, break management, and support during night shifts.",
      questions: [
        { label: "Are staff alert and professional?", yesNoField: "staff_alert_professional" },
        { label: "Are staff taking breaks as required?", yesNoField: "staff_breaks_taken" },
        { label: "Do staff feel supported and safe?", yesNoField: "staff_supported_safe" },
        { label: "Are staff aware of emergency procedures?", yesNoField: "staff_aware_emergency_procedures" }
      ]
    },
    {
      title: "9. Maintenance and Equipment",
      guidance: "Check equipment condition and maintenance status during night visits.",
      questions: [
        { label: "Is equipment stored safely and in good working order?", yesNoField: "equipment_stored_good_working" },
        { label: "Are nurse-call systems functioning?", yesNoField: "nurse_call_systems_functioning" },
        { label: "Are any maintenance issues reported or present?", yesNoField: "maintenance_issues_reported" }
      ]
    },
    {
      title: "10. General Observations",
      guidance: "Record general observations about resident comfort and overall night visit conditions.",
      questions: [
        { label: "Are residents out of bed and in discomfort?", yesNoField: "residents_out_of_bed_discomfort" },
        { label: "Are lights/TVs/noise disruptive to residents?", yesNoField: "lights_tvs_noise_disruptive" },
        { label: "Are there any safeguarding concerns observed?", yesNoField: "safeguarding_concerns_observed" },
        { label: "Is the overall atmosphere calm and safe?", yesNoField: "atmosphere_calm_safe" }
      ]
    }
  ];

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

  const handleChange = (field: keyof NightVisitData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

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
              <span className="text-sm text-gray-700">Yes</span>
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
              <span className="text-sm text-gray-700">No</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={yesNoField}
                value="N/A"
                checked={yesNoValue === 'N/A'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">N/A</span>
            </label>
          </div>
          {errors.includes(yesNoField) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
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
    <div className="min-h-screen bg-white">
  <div className="w-full p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Night Visit Audit</h1>
          <p className="text-gray-600">Comprehensive assessment of night-time care and safety procedures</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Audit Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Audit Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
                  <Input
                    type="text"
                    className={getFieldClassName('home', "w-full")}
                    name="home"
                    value={data.home}
                    onChange={(e: any) => handleChange('home', e.target.value)}
                    placeholder="Enter home name"
                    data-field="home"
                  />
                  {hasError('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <Input
                    type="date"
                    className={getFieldClassName('date', "w-full")}
                    name="date"
                    value={data.date}
                    onChange={(e: any) => handleChange('date', e.target.value)}
                    data-field="date"
                  />
                  {hasError('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing Audit</label>
                  <Input
                    type="text"
                    className={getFieldClassName('personCompletingAudit', "w-full")}
                    name="personCompletingAudit"
                    value={data.personCompletingAudit}
                    onChange={(e: any) => handleChange('personCompletingAudit', e.target.value)}
                    placeholder="Enter auditor name"
                    data-field="personCompletingAudit"
                  />
                  {hasError('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Audit Sections */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold">{section.title}</h3>
                        <p className="text-sm text-blue-100 mt-1">{section.guidance}</p>
                      </div>
                    </div>
                    {openSections[index] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  {openSections[index] && (
                    <div className="px-6 py-6 bg-gray-50">
                      <div className="space-y-6">
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

              {/* Final Comments Section */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Comments</h3>
                <textarea
                  value={finalComments}
                  onChange={(e) => setFinalComments(e.target.value)}
                  rows={4}
                  placeholder="Add any final comments or observations about this night visit audit..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Complete Audit Button */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg"
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
            <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Audit Completed</h3>
              <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  No, thanks
                </button>
                <button
                  onClick={() => handleModalCreate(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Audit'}
                </button>
                <button
                  onClick={() => handleModalCreate(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
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
