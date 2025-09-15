"use client";
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/context/workspace';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';

interface InfectionControlData {
  home: string;
  date: string;
  personCompletingAudit: string;

  // Section 1: Hand Hygiene
  hh_facilities_available: string;
  hh_facilities_available_comment: string;
  hh_audits_completed: string;
  hh_audits_completed_comment: string;
  hh_alcohol_available: string;
  hh_alcohol_available_comment: string;
  hh_staff_observed: string;
  hh_staff_observed_comment: string;
  hh_posters_displayed: string;
  hh_posters_displayed_comment: string;
  hh_residents_supported: string;
  hh_residents_supported_comment: string;

  // Section 2: PPE
  ppe_available_stored: string;
  ppe_available_stored_comment: string;
  ppe_staff_trained: string;
  ppe_staff_trained_comment: string;
  ppe_staff_wearing_correctly: string;
  ppe_staff_wearing_correctly_comment: string;
  ppe_disposal_bins: string;
  ppe_disposal_bins_comment: string;

  // Section 3: Environmental Cleanliness
  cleaning_schedules: string;
  cleaning_schedules_comment: string;
  communal_areas_clean: string;
  communal_areas_clean_comment: string;
  frequently_touched_cleaned: string;
  frequently_touched_cleaned_comment: string;
  cleaning_equipment_stored: string;
  cleaning_equipment_stored_comment: string;
  laundry_procedures: string;
  laundry_procedures_comment: string;

  // Section 4: Waste Management
  clinical_waste_correct_bins: string;
  clinical_waste_correct_bins_comment: string;
  bins_emptied_cleaned: string;
  bins_emptied_cleaned_comment: string;
  waste_storage_clean_secure: string;
  waste_storage_clean_secure_comment: string;

  // Section 5: Resident Care & Infection Control
  isolation_procedures: string;
  isolation_procedures_comment: string;
  care_plans_updated: string;
  care_plans_updated_comment: string;
  staff_trained_identify_report: string;
  staff_trained_identify_report_comment: string;
  visiting_policies_aligned: string;
  visiting_policies_aligned_comment: string;

  // Section 6: Staff Training & Compliance
  staff_ipc_training: string;
  staff_ipc_training_comment: string;
  audits_spot_checks: string;
  audits_spot_checks_comment: string;
  poor_practices_addressed: string;
  poor_practices_addressed_comment: string;

  // Section 7: Outbreak Management
  outbreak_policy: string;
  outbreak_policy_comment: string;
  outbreaks_reported: string;
  outbreaks_reported_comment: string;
  outbreak_records_kept: string;
  outbreak_records_kept_comment: string;

  // Section 8: Documentation & Records
  ipc_policies_up_to_date: string;
  ipc_policies_up_to_date_comment: string;
  cleaning_records_maintained: string;
  cleaning_records_maintained_comment: string;
  incidents_linked_to_infection: string;
  incidents_linked_to_infection_comment: string;
}

export default function InfectionControlAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const [openSections, setOpenSections] = useState<string[]>(['audit-details']);

  const sections = [
    {
      name: 'audit-details',
      label: 'Audit Details',
      guidance: 'Enter the basic information for this infection control audit including the care home name, audit date, and person completing the audit.'
    },
    {
      name: 'hand-hygiene',
      label: 'Hand Hygiene',
      guidance: 'Assess the availability and effectiveness of hand hygiene facilities, audits, alcohol-based hand rubs, staff compliance, promotional materials, and resident support for hand hygiene practices.'
    },
    {
      name: 'ppe',
      label: 'Personal Protective Equipment (PPE)',
      guidance: 'Evaluate the availability, storage, staff training, correct usage, and disposal procedures for personal protective equipment including gloves, aprons, masks, and eye protection.'
    },
    {
      name: 'environmental-cleanliness',
      label: 'Environmental Cleanliness',
      guidance: 'Review cleaning schedules, communal area cleanliness, frequently touched surface cleaning, cleaning equipment storage, and laundry procedures to prevent cross-contamination.'
    },
    {
      name: 'waste-management',
      label: 'Waste Management',
      guidance: 'Check clinical waste disposal procedures, bin maintenance and cleaning schedules, and waste storage area cleanliness and security measures.'
    },
    {
      name: 'resident-care',
      label: 'Resident Care & Infection Control',
      guidance: 'Assess isolation procedures for infected residents, care plan updates, staff training on infection identification, and alignment of visiting policies with infection control guidance.'
    },
    {
      name: 'staff-training',
      label: 'Staff Training & Compliance',
      guidance: 'Review staff training on infection prevention, regular audits and spot checks, and procedures for addressing poor infection control practices through supervision or retraining.'
    },
    {
      name: 'outbreak-management',
      label: 'Outbreak Management',
      guidance: 'Evaluate outbreak policy availability, incident reporting procedures to appropriate authorities, and maintenance of outbreak records and logs.'
    },
    {
      name: 'documentation',
      label: 'Documentation & Records',
      guidance: 'Check that infection control policies are current, cleaning records are maintained and signed, and incident reports linked to infection risks are properly documented.'
    },
    {
      name: 'final-comments',
      label: 'Final Comments & Recommendations',
      guidance: 'Provide any additional comments or recommendations based on the infection control audit findings.'
    }
  ];

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const getFieldClassName = (fieldName: string, baseClass: string = "") => {
    return errors.includes(fieldName)
      ? `${baseClass} border-red-500 bg-red-50`
      : baseClass;
  };

  const getFieldError = (fieldName: string) => {
    return errors.includes(fieldName);
  };

  const [data, setData] = useState<InfectionControlData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    hh_facilities_available: '',
    hh_facilities_available_comment: '',
    hh_audits_completed: '',
    hh_audits_completed_comment: '',
    hh_alcohol_available: '',
    hh_alcohol_available_comment: '',
    hh_staff_observed: '',
    hh_staff_observed_comment: '',
    hh_posters_displayed: '',
    hh_posters_displayed_comment: '',
    hh_residents_supported: '',
    hh_residents_supported_comment: '',

    ppe_available_stored: '',
    ppe_available_stored_comment: '',
    ppe_staff_trained: '',
    ppe_staff_trained_comment: '',
    ppe_staff_wearing_correctly: '',
    ppe_staff_wearing_correctly_comment: '',
    ppe_disposal_bins: '',
    ppe_disposal_bins_comment: '',

    cleaning_schedules: '',
    cleaning_schedules_comment: '',
    communal_areas_clean: '',
    communal_areas_clean_comment: '',
    frequently_touched_cleaned: '',
    frequently_touched_cleaned_comment: '',
    cleaning_equipment_stored: '',
    cleaning_equipment_stored_comment: '',
    laundry_procedures: '',
    laundry_procedures_comment: '',

    clinical_waste_correct_bins: '',
    clinical_waste_correct_bins_comment: '',
    bins_emptied_cleaned: '',
    bins_emptied_cleaned_comment: '',
    waste_storage_clean_secure: '',
    waste_storage_clean_secure_comment: '',

    isolation_procedures: '',
    isolation_procedures_comment: '',
    care_plans_updated: '',
    care_plans_updated_comment: '',
    staff_trained_identify_report: '',
    staff_trained_identify_report_comment: '',
    visiting_policies_aligned: '',
    visiting_policies_aligned_comment: '',

    staff_ipc_training: '',
    staff_ipc_training_comment: '',
    audits_spot_checks: '',
    audits_spot_checks_comment: '',
    poor_practices_addressed: '',
    poor_practices_addressed_comment: '',

    outbreak_policy: '',
    outbreak_policy_comment: '',
    outbreaks_reported: '',
    outbreaks_reported_comment: '',
    outbreak_records_kept: '',
    outbreak_records_kept_comment: '',

    ipc_policies_up_to_date: '',
    ipc_policies_up_to_date_comment: '',
    cleaning_records_maintained: '',
    cleaning_records_maintained_comment: '',
    incidents_linked_to_infection: '',
    incidents_linked_to_infection_comment: '',
  });

  const activeWorkspace = useWorkspace();
  const { user } = useAuth();

  // Load existing audit data when component mounts
  useEffect(() => {
    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) return;
      
      try {
        const existingData = await getLatestAuditData(activeWorkspace.id, 'infection-control');
        if (existingData) {
          // Remove metadata fields and populate form
          const { id, createdAt, ...formData } = existingData;
          setData(prevData => ({
            ...prevData,
            ...formData
          }));
          
          // Load final comments if available
          if (existingData.comments) {
            setFinalComments(existingData.comments);
          }
        }
      } catch (error) {
        console.warn('Failed to load existing audit data:', error);
      }
    };

    loadExistingAuditData();
  }, [activeWorkspace?.id]);

  const handleInputChange = (field: keyof InfectionControlData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(e => e !== field));
    }
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
    onYesNoChange: (v: string) => void;
    onCommentChange: (v: string) => void;
  }) => (
    <div className="space-y-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
      <label className="block text-sm font-semibold text-slate-800">{label}</label>
      <div className="flex gap-6 items-center" data-field={yesNoField}>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name={yesNoField}
            value="Yes"
            checked={yesNoValue === 'Yes'}
            onChange={(e) => onYesNoChange(e.target.value)}
            className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Yes</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name={yesNoField}
            value="No"
            checked={yesNoValue === 'No'}
            onChange={(e) => onYesNoChange(e.target.value)}
            className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">No</span>
        </label>
      </div>
      {errors.includes(yesNoField) && <p className="text-red-600 text-sm font-medium">This field is required</p>}
    </div>
  );

  const validateForm = () => {
    const required: (keyof InfectionControlData)[] = [
      'home','date','personCompletingAudit',
      // Hand hygiene
      'hh_facilities_available','hh_audits_completed','hh_alcohol_available','hh_staff_observed','hh_posters_displayed','hh_residents_supported',
      // PPE
      'ppe_available_stored','ppe_staff_trained','ppe_staff_wearing_correctly','ppe_disposal_bins',
      // Cleanliness
      'cleaning_schedules','communal_areas_clean','frequently_touched_cleaned','cleaning_equipment_stored','laundry_procedures',
      // Waste
      'clinical_waste_correct_bins','bins_emptied_cleaned','waste_storage_clean_secure',
      // Resident care
      'isolation_procedures','care_plans_updated','staff_trained_identify_report','visiting_policies_aligned',
      // Staff training
      'staff_ipc_training','audits_spot_checks','poor_practices_addressed',
      // Outbreak
      'outbreak_policy','outbreaks_reported','outbreak_records_kept',
      // Docs
      'ipc_policies_up_to_date','cleaning_records_maintained','incidents_linked_to_infection'
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
      // Compute yes/no score
      const YES_NO_FIELDS: (keyof InfectionControlData)[] = [
        'hh_facilities_available','hh_audits_completed','hh_alcohol_available','hh_staff_observed','hh_posters_displayed','hh_residents_supported',
        'ppe_available_stored','ppe_staff_trained','ppe_staff_wearing_correctly','ppe_disposal_bins',
        'cleaning_schedules','communal_areas_clean','frequently_touched_cleaned','cleaning_equipment_stored','laundry_procedures',
        'clinical_waste_correct_bins','bins_emptied_cleaned','waste_storage_clean_secure',
        'isolation_procedures','care_plans_updated','staff_trained_identify_report','visiting_policies_aligned',
        'staff_ipc_training','audits_spot_checks','poor_practices_addressed',
        'outbreak_policy','outbreaks_reported','outbreak_records_kept',
        'ipc_policies_up_to_date','cleaning_records_maintained','incidents_linked_to_infection'
      ];

      const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (data[f] === 'Yes' ? 1 : 0), 0);
      const totalCount = YES_NO_FIELDS.length;
      const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;

      const payload = { ...data, comments: finalComments, createActionPlan, createdBy: user?.id ?? null, workspaceId: activeWorkspace.id, auditType: 'infection-control', scorePercent, yesCount, totalCount };
      
      // Save to regular audits collection
      const id = await saveAudit(payload, activeWorkspace.id);
      
      // Save snapshot and mark as completed (also generates PDF)
      const result = await markAuditCompletedWithSnapshot(activeWorkspace.id, 'infection-control', payload, data.date || new Date().toISOString());
      if (result.pdfDocId) {
      }

      alert('Audit completed and saved for this month');
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  return (
  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Infection Control Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive infection control audit covering all aspects of infection prevention and control. All required fields must be filled.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                data-field="home"
                value={data.home}
                onChange={(e) => handleInputChange('home', e.target.value)}
                placeholder="Enter care home name"
                required
              />
              {getFieldError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input
                type="date"
                className={getFieldClassName('date', "w-full")}
                data-field="date"
                value={data.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
              {getFieldError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <Input
                type="text"
                className={getFieldClassName('personCompletingAudit', "w-full")}
                data-field="personCompletingAudit"
                value={data.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                required
              />
              {getFieldError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(section.name)}
                >
                  <span>{section.label}</span>
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

                    {section.name === 'hand-hygiene' && (
                      <div className="bg-green-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-green-900 mb-4">Hand Hygiene</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are hand hygiene facilities (sinks, soap, paper towels) available and accessible in all key areas?"
                            yesNoField="hh_facilities_available"
                            commentField="hh_facilities_available_comment"
                            yesNoValue={data.hh_facilities_available}
                            commentValue={data.hh_facilities_available_comment}
                            onYesNoChange={(v) => handleInputChange('hh_facilities_available', v)}
                            onCommentChange={(v) => handleInputChange('hh_facilities_available_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are hand hygiene audits completed with staff?"
                            yesNoField="hh_audits_completed"
                            commentField="hh_audits_completed_comment"
                            yesNoValue={data.hh_audits_completed}
                            commentValue={data.hh_audits_completed_comment}
                            onYesNoChange={(v) => handleInputChange('hh_audits_completed', v)}
                            onCommentChange={(v) => handleInputChange('hh_audits_completed_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are alcohol-based hand rubs available at points of care and communal areas?"
                            yesNoField="hh_alcohol_available"
                            commentField="hh_alcohol_available_comment"
                            yesNoValue={data.hh_alcohol_available}
                            commentValue={data.hh_alcohol_available_comment}
                            onYesNoChange={(v) => handleInputChange('hh_alcohol_available', v)}
                            onCommentChange={(v) => handleInputChange('hh_alcohol_available_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are staff observed performing hand hygiene at appropriate times (e.g. before/after resident contact)?"
                            yesNoField="hh_staff_observed"
                            commentField="hh_staff_observed_comment"
                            yesNoValue={data.hh_staff_observed}
                            commentValue={data.hh_staff_observed_comment}
                            onYesNoChange={(v) => handleInputChange('hh_staff_observed', v)}
                            onCommentChange={(v) => handleInputChange('hh_staff_observed_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are posters promoting hand hygiene displayed appropriately?"
                            yesNoField="hh_posters_displayed"
                            commentField="hh_posters_displayed_comment"
                            yesNoValue={data.hh_posters_displayed}
                            commentValue={data.hh_posters_displayed_comment}
                            onYesNoChange={(v) => handleInputChange('hh_posters_displayed', v)}
                            onCommentChange={(v) => handleInputChange('hh_posters_displayed_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are residents supported or encouraged to perform hand hygiene, especially before meals?"
                            yesNoField="hh_residents_supported"
                            commentField="hh_residents_supported_comment"
                            yesNoValue={data.hh_residents_supported}
                            commentValue={data.hh_residents_supported_comment}
                            onYesNoChange={(v) => handleInputChange('hh_residents_supported', v)}
                            onCommentChange={(v) => handleInputChange('hh_residents_supported_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'ppe' && (
                      <div className="bg-yellow-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-yellow-900 mb-4">Personal Protective Equipment (PPE)</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is PPE (gloves, aprons, masks, eye protection) available and stored correctly?"
                            yesNoField="ppe_available_stored"
                            commentField="ppe_available_stored_comment"
                            yesNoValue={data.ppe_available_stored}
                            commentValue={data.ppe_available_stored_comment}
                            onYesNoChange={(v) => handleInputChange('ppe_available_stored', v)}
                            onCommentChange={(v) => handleInputChange('ppe_available_stored_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are staff trained in the correct use of PPE?"
                            yesNoField="ppe_staff_trained"
                            commentField="ppe_staff_trained_comment"
                            yesNoValue={data.ppe_staff_trained}
                            commentValue={data.ppe_staff_trained_comment}
                            onYesNoChange={(v) => handleInputChange('ppe_staff_trained', v)}
                            onCommentChange={(v) => handleInputChange('ppe_staff_trained_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are staff wearing PPE correctly and changing it between tasks/residents?"
                            yesNoField="ppe_staff_wearing_correctly"
                            commentField="ppe_staff_wearing_correctly_comment"
                            yesNoValue={data.ppe_staff_wearing_correctly}
                            commentValue={data.ppe_staff_wearing_correctly_comment}
                            onYesNoChange={(v) => handleInputChange('ppe_staff_wearing_correctly', v)}
                            onCommentChange={(v) => handleInputChange('ppe_staff_wearing_correctly_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are appropriate PPE disposal bins available and used correctly?"
                            yesNoField="ppe_disposal_bins"
                            commentField="ppe_disposal_bins_comment"
                            yesNoValue={data.ppe_disposal_bins}
                            commentValue={data.ppe_disposal_bins_comment}
                            onYesNoChange={(v) => handleInputChange('ppe_disposal_bins', v)}
                            onCommentChange={(v) => handleInputChange('ppe_disposal_bins_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'environmental-cleanliness' && (
                      <div className="bg-pink-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-pink-900 mb-4">Environmental Cleanliness</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are cleaning schedules in place and up to date for all areas?"
                            yesNoField="cleaning_schedules"
                            commentField="cleaning_schedules_comment"
                            yesNoValue={data.cleaning_schedules}
                            commentValue={data.cleaning_schedules_comment}
                            onYesNoChange={(v) => handleInputChange('cleaning_schedules', v)}
                            onCommentChange={(v) => handleInputChange('cleaning_schedules_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are communal areas visibly clean and free from clutter?"
                            yesNoField="communal_areas_clean"
                            commentField="communal_areas_clean_comment"
                            yesNoValue={data.communal_areas_clean}
                            commentValue={data.communal_areas_clean_comment}
                            onYesNoChange={(v) => handleInputChange('communal_areas_clean', v)}
                            onCommentChange={(v) => handleInputChange('communal_areas_clean_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are frequently touched surfaces (e.g. door handles, handrails) cleaned regularly?"
                            yesNoField="frequently_touched_cleaned"
                            commentField="frequently_touched_cleaned_comment"
                            yesNoValue={data.frequently_touched_cleaned}
                            commentValue={data.frequently_touched_cleaned_comment}
                            onYesNoChange={(v) => handleInputChange('frequently_touched_cleaned', v)}
                            onCommentChange={(v) => handleInputChange('frequently_touched_cleaned_comment', v)}
                          />
                          <YesNoQuestion
                            label="Is cleaning equipment stored appropriately and colour-coded to avoid cross-contamination?"
                            yesNoField="cleaning_equipment_stored"
                            commentField="cleaning_equipment_stored_comment"
                            yesNoValue={data.cleaning_equipment_stored}
                            commentValue={data.cleaning_equipment_stored_comment}
                            onYesNoChange={(v) => handleInputChange('cleaning_equipment_stored', v)}
                            onCommentChange={(v) => handleInputChange('cleaning_equipment_stored_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are laundry procedures being followed correctly (e.g. separate storage, in and out signs,use of PPE)?"
                            yesNoField="laundry_procedures"
                            commentField="laundry_procedures_comment"
                            yesNoValue={data.laundry_procedures}
                            commentValue={data.laundry_procedures_comment}
                            onYesNoChange={(v) => handleInputChange('laundry_procedures', v)}
                            onCommentChange={(v) => handleInputChange('laundry_procedures_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'waste-management' && (
                      <div className="bg-amber-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-amber-900 mb-4">Waste Management</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is clinical waste disposed of in the correct bins (e.g. yellow/orange)?"
                            yesNoField="clinical_waste_correct_bins"
                            commentField="clinical_waste_correct_bins_comment"
                            yesNoValue={data.clinical_waste_correct_bins}
                            commentValue={data.clinical_waste_correct_bins_comment}
                            onYesNoChange={(v) => handleInputChange('clinical_waste_correct_bins', v)}
                            onCommentChange={(v) => handleInputChange('clinical_waste_correct_bins_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are bins emptied regularly and cleaned?"
                            yesNoField="bins_emptied_cleaned"
                            commentField="bins_emptied_cleaned_comment"
                            yesNoValue={data.bins_emptied_cleaned}
                            commentValue={data.bins_emptied_cleaned_comment}
                            onYesNoChange={(v) => handleInputChange('bins_emptied_cleaned', v)}
                            onCommentChange={(v) => handleInputChange('bins_emptied_cleaned_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are waste storage areas clean and secure?"
                            yesNoField="waste_storage_clean_secure"
                            commentField="waste_storage_clean_secure_comment"
                            yesNoValue={data.waste_storage_clean_secure}
                            commentValue={data.waste_storage_clean_secure_comment}
                            onYesNoChange={(v) => handleInputChange('waste_storage_clean_secure', v)}
                            onCommentChange={(v) => handleInputChange('waste_storage_clean_secure_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'resident-care' && (
                      <div className="bg-indigo-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-indigo-900 mb-4">Resident Care & Infection Control</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are isolation procedures in place for residents with suspected or confirmed infection?"
                            yesNoField="isolation_procedures"
                            commentField="isolation_procedures_comment"
                            yesNoValue={data.isolation_procedures}
                            commentValue={data.isolation_procedures_comment}
                            onYesNoChange={(v) => handleInputChange('isolation_procedures', v)}
                            onCommentChange={(v) => handleInputChange('isolation_procedures_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are care plans updated to reflect infection risk or outbreaks?"
                            yesNoField="care_plans_updated"
                            commentField="care_plans_updated_comment"
                            yesNoValue={data.care_plans_updated}
                            commentValue={data.care_plans_updated_comment}
                            onYesNoChange={(v) => handleInputChange('care_plans_updated', v)}
                            onCommentChange={(v) => handleInputChange('care_plans_updated_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are staff trained on identifying and reporting signs of infection?"
                            yesNoField="staff_trained_identify_report"
                            commentField="staff_trained_identify_report_comment"
                            yesNoValue={data.staff_trained_identify_report}
                            commentValue={data.staff_trained_identify_report_comment}
                            onYesNoChange={(v) => handleInputChange('staff_trained_identify_report', v)}
                            onCommentChange={(v) => handleInputChange('staff_trained_identify_report_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are visiting policies in line with current infection control guidance?"
                            yesNoField="visiting_policies_aligned"
                            commentField="visiting_policies_aligned_comment"
                            yesNoValue={data.visiting_policies_aligned}
                            commentValue={data.visiting_policies_aligned_comment}
                            onYesNoChange={(v) => handleInputChange('visiting_policies_aligned', v)}
                            onCommentChange={(v) => handleInputChange('visiting_policies_aligned_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'staff-training' && (
                      <div className="bg-teal-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-teal-900 mb-4">Staff Training & Compliance</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Have staff received up-to-date training on infection prevention and control?"
                            yesNoField="staff_ipc_training"
                            commentField="staff_ipc_training_comment"
                            yesNoValue={data.staff_ipc_training}
                            commentValue={data.staff_ipc_training_comment}
                            onYesNoChange={(v) => handleInputChange('staff_ipc_training', v)}
                            onCommentChange={(v) => handleInputChange('staff_ipc_training_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are infection control audits or spot checks conducted regularly?"
                            yesNoField="audits_spot_checks"
                            commentField="audits_spot_checks_comment"
                            yesNoValue={data.audits_spot_checks}
                            commentValue={data.audits_spot_checks_comment}
                            onYesNoChange={(v) => handleInputChange('audits_spot_checks', v)}
                            onCommentChange={(v) => handleInputChange('audits_spot_checks_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are poor practices addressed through supervision or retraining?"
                            yesNoField="poor_practices_addressed"
                            commentField="poor_practices_addressed_comment"
                            yesNoValue={data.poor_practices_addressed}
                            commentValue={data.poor_practices_addressed_comment}
                            onYesNoChange={(v) => handleInputChange('poor_practices_addressed', v)}
                            onCommentChange={(v) => handleInputChange('poor_practices_addressed_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'outbreak-management' && (
                      <div className="bg-pink-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-pink-900 mb-4">Outbreak Management (If Applicable)</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Is there an outbreak policy in place and known to staff?"
                            yesNoField="outbreak_policy"
                            commentField="outbreak_policy_comment"
                            yesNoValue={data.outbreak_policy}
                            commentValue={data.outbreak_policy_comment}
                            onYesNoChange={(v) => handleInputChange('outbreak_policy', v)}
                            onCommentChange={(v) => handleInputChange('outbreak_policy_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are incidents/outbreaks reported to appropriate authorities (UKHSA, CQC)?"
                            yesNoField="outbreaks_reported"
                            commentField="outbreaks_reported_comment"
                            yesNoValue={data.outbreaks_reported}
                            commentValue={data.outbreaks_reported_comment}
                            onYesNoChange={(v) => handleInputChange('outbreaks_reported', v)}
                            onCommentChange={(v) => handleInputChange('outbreaks_reported_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are outbreak records and logs maintained?"
                            yesNoField="outbreak_records_kept"
                            commentField="outbreak_records_kept_comment"
                            yesNoValue={data.outbreak_records_kept}
                            commentValue={data.outbreak_records_kept_comment}
                            onYesNoChange={(v) => handleInputChange('outbreak_records_kept', v)}
                            onCommentChange={(v) => handleInputChange('outbreak_records_kept_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'documentation' && (
                      <div className="bg-emerald-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-emerald-900 mb-4">Documentation & Records</h4>
                        <div className="space-y-4">
                          <YesNoQuestion
                            label="Are infection control policies up to date and reviewed regularly?"
                            yesNoField="ipc_policies_up_to_date"
                            commentField="ipc_policies_up_to_date_comment"
                            yesNoValue={data.ipc_policies_up_to_date}
                            commentValue={data.ipc_policies_up_to_date_comment}
                            onYesNoChange={(v) => handleInputChange('ipc_policies_up_to_date', v)}
                            onCommentChange={(v) => handleInputChange('ipc_policies_up_to_date_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are cleaning records maintained and signed?"
                            yesNoField="cleaning_records_maintained"
                            commentField="cleaning_records_maintained_comment"
                            yesNoValue={data.cleaning_records_maintained}
                            commentValue={data.cleaning_records_maintained_comment}
                            onYesNoChange={(v) => handleInputChange('cleaning_records_maintained', v)}
                            onCommentChange={(v) => handleInputChange('cleaning_records_maintained_comment', v)}
                          />
                          <YesNoQuestion
                            label="Are incident and accident reports linked to infection risks recorded properly?"
                            yesNoField="incidents_linked_to_infection"
                            commentField="incidents_linked_to_infection_comment"
                            yesNoValue={data.incidents_linked_to_infection}
                            commentValue={data.incidents_linked_to_infection_comment}
                            onYesNoChange={(v) => handleInputChange('incidents_linked_to_infection', v)}
                            onCommentChange={(v) => handleInputChange('incidents_linked_to_infection_comment', v)}
                          />
                        </div>
                      </div>
                    )}

                    {section.name === 'final-comments' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Final Comments & Recommendations</h4>
                        <Textarea
                          value={finalComments}
                          onChange={(e) => setFinalComments(e.target.value)}
                          className="w-full p-3 border border-slate-300 rounded-md resize-none"
                          rows={6}
                          placeholder="Enter any additional comments or recommendations based on the infection control audit findings..."
                        />
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
                onClick={() => handleModalCreate(false)}
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
                {saving ? 'Saving...' : 'Save and Create Action Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
