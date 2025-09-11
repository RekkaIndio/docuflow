"use client";
import { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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

  const handleChange = (field: keyof InfectionControlData, value: string) => {
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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-4 items-center" data-field={yesNoField}>
        <label className="flex items-center">
          <input type="radio" name={yesNoField} value="Yes" checked={yesNoValue === 'Yes'} onChange={(e) => onYesNoChange(e.target.value)} className="mr-2" />
          Yes
        </label>
        <label className="flex items-center">
          <input type="radio" name={yesNoField} value="No" checked={yesNoValue === 'No'} onChange={(e) => onYesNoChange(e.target.value)} className="mr-2" />
          No
        </label>
      </div>
      {errors.includes(yesNoField) && <p className="text-red-500 text-sm">This field is required</p>}
      {/* per-question comment removed; use final comments below */}
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
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Infection Control Audit</h1>
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
            <h3 className="text-lg font-semibold text-green-900 mb-3">1. Hand Hygiene</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are hand hygiene facilities (sinks, soap, paper towels) available and accessible in all key areas?" yesNoField="hh_facilities_available" commentField="hh_facilities_available_comment" yesNoValue={data.hh_facilities_available} commentValue={data.hh_facilities_available_comment} onYesNoChange={(v) => handleChange('hh_facilities_available', v)} onCommentChange={(v) => handleChange('hh_facilities_available_comment', v)} />
              <YesNoQuestion label="Are hand hygiene audits completed with staff?" yesNoField="hh_audits_completed" commentField="hh_audits_completed_comment" yesNoValue={data.hh_audits_completed} commentValue={data.hh_audits_completed_comment} onYesNoChange={(v) => handleChange('hh_audits_completed', v)} onCommentChange={(v) => handleChange('hh_audits_completed_comment', v)} />
              <YesNoQuestion label="Are alcohol-based hand rubs available at points of care and communal areas?" yesNoField="hh_alcohol_available" commentField="hh_alcohol_available_comment" yesNoValue={data.hh_alcohol_available} commentValue={data.hh_alcohol_available_comment} onYesNoChange={(v) => handleChange('hh_alcohol_available', v)} onCommentChange={(v) => handleChange('hh_alcohol_available_comment', v)} />
              <YesNoQuestion label="Are staff observed performing hand hygiene at appropriate times (e.g. before/after resident contact)?" yesNoField="hh_staff_observed" commentField="hh_staff_observed_comment" yesNoValue={data.hh_staff_observed} commentValue={data.hh_staff_observed_comment} onYesNoChange={(v) => handleChange('hh_staff_observed', v)} onCommentChange={(v) => handleChange('hh_staff_observed_comment', v)} />
              <YesNoQuestion label="Are posters promoting hand hygiene displayed appropriately?" yesNoField="hh_posters_displayed" commentField="hh_posters_displayed_comment" yesNoValue={data.hh_posters_displayed} commentValue={data.hh_posters_displayed_comment} onYesNoChange={(v) => handleChange('hh_posters_displayed', v)} onCommentChange={(v) => handleChange('hh_posters_displayed_comment', v)} />
              <YesNoQuestion label="Are residents supported or encouraged to perform hand hygiene, especially before meals?" yesNoField="hh_residents_supported" commentField="hh_residents_supported_comment" yesNoValue={data.hh_residents_supported} commentValue={data.hh_residents_supported_comment} onYesNoChange={(v) => handleChange('hh_residents_supported', v)} onCommentChange={(v) => handleChange('hh_residents_supported_comment', v)} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">2. Personal Protective Equipment (PPE)</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is PPE (gloves, aprons, masks, eye protection) available and stored correctly?" yesNoField="ppe_available_stored" commentField="ppe_available_stored_comment" yesNoValue={data.ppe_available_stored} commentValue={data.ppe_available_stored_comment} onYesNoChange={(v) => handleChange('ppe_available_stored', v)} onCommentChange={(v) => handleChange('ppe_available_stored_comment', v)} />
              <YesNoQuestion label="Are staff trained in the correct use of PPE?" yesNoField="ppe_staff_trained" commentField="ppe_staff_trained_comment" yesNoValue={data.ppe_staff_trained} commentValue={data.ppe_staff_trained_comment} onYesNoChange={(v) => handleChange('ppe_staff_trained', v)} onCommentChange={(v) => handleChange('ppe_staff_trained_comment', v)} />
              <YesNoQuestion label="Are staff wearing PPE correctly and changing it between tasks/residents?" yesNoField="ppe_staff_wearing_correctly" commentField="ppe_staff_wearing_correctly_comment" yesNoValue={data.ppe_staff_wearing_correctly} commentValue={data.ppe_staff_wearing_correctly_comment} onYesNoChange={(v) => handleChange('ppe_staff_wearing_correctly', v)} onCommentChange={(v) => handleChange('ppe_staff_wearing_correctly_comment', v)} />
              <YesNoQuestion label="Are appropriate PPE disposal bins available and used correctly?" yesNoField="ppe_disposal_bins" commentField="ppe_disposal_bins_comment" yesNoValue={data.ppe_disposal_bins} commentValue={data.ppe_disposal_bins_comment} onYesNoChange={(v) => handleChange('ppe_disposal_bins', v)} onCommentChange={(v) => handleChange('ppe_disposal_bins_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">3. Environmental Cleanliness</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are cleaning schedules in place and up to date for all areas?" yesNoField="cleaning_schedules" commentField="cleaning_schedules_comment" yesNoValue={data.cleaning_schedules} commentValue={data.cleaning_schedules_comment} onYesNoChange={(v) => handleChange('cleaning_schedules', v)} onCommentChange={(v) => handleChange('cleaning_schedules_comment', v)} />
              <YesNoQuestion label="Are communal areas visibly clean and free from clutter?" yesNoField="communal_areas_clean" commentField="communal_areas_clean_comment" yesNoValue={data.communal_areas_clean} commentValue={data.communal_areas_clean_comment} onYesNoChange={(v) => handleChange('communal_areas_clean', v)} onCommentChange={(v) => handleChange('communal_areas_clean_comment', v)} />
              <YesNoQuestion label="Are frequently touched surfaces (e.g. door handles, handrails) cleaned regularly?" yesNoField="frequently_touched_cleaned" commentField="frequently_touched_cleaned_comment" yesNoValue={data.frequently_touched_cleaned} commentValue={data.frequently_touched_cleaned_comment} onYesNoChange={(v) => handleChange('frequently_touched_cleaned', v)} onCommentChange={(v) => handleChange('frequently_touched_cleaned_comment', v)} />
              <YesNoQuestion label="Is cleaning equipment stored appropriately and colour-coded to avoid cross-contamination?" yesNoField="cleaning_equipment_stored" commentField="cleaning_equipment_stored_comment" yesNoValue={data.cleaning_equipment_stored} commentValue={data.cleaning_equipment_stored_comment} onYesNoChange={(v) => handleChange('cleaning_equipment_stored', v)} onCommentChange={(v) => handleChange('cleaning_equipment_stored_comment', v)} />
              <YesNoQuestion label="Are laundry procedures being followed correctly (e.g. separate storage, in and out signs,use of PPE)?" yesNoField="laundry_procedures" commentField="laundry_procedures_comment" yesNoValue={data.laundry_procedures} commentValue={data.laundry_procedures_comment} onYesNoChange={(v) => handleChange('laundry_procedures', v)} onCommentChange={(v) => handleChange('laundry_procedures_comment', v)} />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">4. Waste Management</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is clinical waste disposed of in the correct bins (e.g. yellow/orange)?" yesNoField="clinical_waste_correct_bins" commentField="clinical_waste_correct_bins_comment" yesNoValue={data.clinical_waste_correct_bins} commentValue={data.clinical_waste_correct_bins_comment} onYesNoChange={(v) => handleChange('clinical_waste_correct_bins', v)} onCommentChange={(v) => handleChange('clinical_waste_correct_bins_comment', v)} />
              <YesNoQuestion label="Are bins emptied regularly and cleaned?" yesNoField="bins_emptied_cleaned" commentField="bins_emptied_cleaned_comment" yesNoValue={data.bins_emptied_cleaned} commentValue={data.bins_emptied_cleaned_comment} onYesNoChange={(v) => handleChange('bins_emptied_cleaned', v)} onCommentChange={(v) => handleChange('bins_emptied_cleaned_comment', v)} />
              <YesNoQuestion label="Are waste storage areas clean and secure?" yesNoField="waste_storage_clean_secure" commentField="waste_storage_clean_secure_comment" yesNoValue={data.waste_storage_clean_secure} commentValue={data.waste_storage_clean_secure_comment} onYesNoChange={(v) => handleChange('waste_storage_clean_secure', v)} onCommentChange={(v) => handleChange('waste_storage_clean_secure_comment', v)} />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">5. Resident Care & Infection Control</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are isolation procedures in place for residents with suspected or confirmed infection?" yesNoField="isolation_procedures" commentField="isolation_procedures_comment" yesNoValue={data.isolation_procedures} commentValue={data.isolation_procedures_comment} onYesNoChange={(v) => handleChange('isolation_procedures', v)} onCommentChange={(v) => handleChange('isolation_procedures_comment', v)} />
              <YesNoQuestion label="Are care plans updated to reflect infection risk or outbreaks?" yesNoField="care_plans_updated" commentField="care_plans_updated_comment" yesNoValue={data.care_plans_updated} commentValue={data.care_plans_updated_comment} onYesNoChange={(v) => handleChange('care_plans_updated', v)} onCommentChange={(v) => handleChange('care_plans_updated_comment', v)} />
              <YesNoQuestion label="Are staff trained on identifying and reporting signs of infection?" yesNoField="staff_trained_identify_report" commentField="staff_trained_identify_report_comment" yesNoValue={data.staff_trained_identify_report} commentValue={data.staff_trained_identify_report_comment} onYesNoChange={(v) => handleChange('staff_trained_identify_report', v)} onCommentChange={(v) => handleChange('staff_trained_identify_report_comment', v)} />
              <YesNoQuestion label="Are visiting policies in line with current infection control guidance?" yesNoField="visiting_policies_aligned" commentField="visiting_policies_aligned_comment" yesNoValue={data.visiting_policies_aligned} commentValue={data.visiting_policies_aligned_comment} onYesNoChange={(v) => handleChange('visiting_policies_aligned', v)} onCommentChange={(v) => handleChange('visiting_policies_aligned_comment', v)} />
            </div>
          </div>

          <div className="bg-teal-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-teal-900 mb-3">6. Staff Training & Compliance</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Have staff received up-to-date training on infection prevention and control?" yesNoField="staff_ipc_training" commentField="staff_ipc_training_comment" yesNoValue={data.staff_ipc_training} commentValue={data.staff_ipc_training_comment} onYesNoChange={(v) => handleChange('staff_ipc_training', v)} onCommentChange={(v) => handleChange('staff_ipc_training_comment', v)} />
              <YesNoQuestion label="Are infection control audits or spot checks conducted regularly?" yesNoField="audits_spot_checks" commentField="audits_spot_checks_comment" yesNoValue={data.audits_spot_checks} commentValue={data.audits_spot_checks_comment} onYesNoChange={(v) => handleChange('audits_spot_checks', v)} onCommentChange={(v) => handleChange('audits_spot_checks_comment', v)} />
              <YesNoQuestion label="Are poor practices addressed through supervision or retraining?" yesNoField="poor_practices_addressed" commentField="poor_practices_addressed_comment" yesNoValue={data.poor_practices_addressed} commentValue={data.poor_practices_addressed_comment} onYesNoChange={(v) => handleChange('poor_practices_addressed', v)} onCommentChange={(v) => handleChange('poor_practices_addressed_comment', v)} />
            </div>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-900 mb-3">7. Outbreak Management (If Applicable)</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Is there an outbreak policy in place and known to staff?" yesNoField="outbreak_policy" commentField="outbreak_policy_comment" yesNoValue={data.outbreak_policy} commentValue={data.outbreak_policy_comment} onYesNoChange={(v) => handleChange('outbreak_policy', v)} onCommentChange={(v) => handleChange('outbreak_policy_comment', v)} />
              <YesNoQuestion label="Are incidents/outbreaks reported to appropriate authorities (UKHSA, CQC)?" yesNoField="outbreaks_reported" commentField="outbreaks_reported_comment" yesNoValue={data.outbreaks_reported} commentValue={data.outbreaks_reported_comment} onYesNoChange={(v) => handleChange('outbreaks_reported', v)} onCommentChange={(v) => handleChange('outbreaks_reported_comment', v)} />
              <YesNoQuestion label="Are outbreak records and logs maintained?" yesNoField="outbreak_records_kept" commentField="outbreak_records_kept_comment" yesNoValue={data.outbreak_records_kept} commentValue={data.outbreak_records_kept_comment} onYesNoChange={(v) => handleChange('outbreak_records_kept', v)} onCommentChange={(v) => handleChange('outbreak_records_kept_comment', v)} />
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">8. Documentation & Records</h3>
            <div className="space-y-4">
              <YesNoQuestion label="Are infection control policies up to date and reviewed regularly?" yesNoField="ipc_policies_up_to_date" commentField="ipc_policies_up_to_date_comment" yesNoValue={data.ipc_policies_up_to_date} commentValue={data.ipc_policies_up_to_date_comment} onYesNoChange={(v) => handleChange('ipc_policies_up_to_date', v)} onCommentChange={(v) => handleChange('ipc_policies_up_to_date_comment', v)} />
              <YesNoQuestion label="Are cleaning records maintained and signed?" yesNoField="cleaning_records_maintained" commentField="cleaning_records_maintained_comment" yesNoValue={data.cleaning_records_maintained} commentValue={data.cleaning_records_maintained_comment} onYesNoChange={(v) => handleChange('cleaning_records_maintained', v)} onCommentChange={(v) => handleChange('cleaning_records_maintained_comment', v)} />
              <YesNoQuestion label="Are incident and accident reports linked to infection risks recorded properly?" yesNoField="incidents_linked_to_infection" commentField="incidents_linked_to_infection_comment" yesNoValue={data.incidents_linked_to_infection} commentValue={data.incidents_linked_to_infection_comment} onYesNoChange={(v) => handleChange('incidents_linked_to_infection', v)} onCommentChange={(v) => handleChange('incidents_linked_to_infection_comment', v)} />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium">Final comments</label>
            <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} className="w-full p-2 border rounded" rows={4} />
          </div>
          <div className="flex justify-center mt-8">
            <button onClick={handleComplete} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Complete Audit</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Complete Audit</h3>
            <p className="text-gray-600 mb-6">Your audit will be completed and saved for this month. Would you like to create an action plan based on this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                {saving ? 'Saving...' : 'Complete Without Action Plan'}
              </button>
              <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {saving ? 'Saving...' : 'Complete With Action Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
