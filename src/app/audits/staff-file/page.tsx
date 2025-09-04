'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';

type YesNoNA = 'Yes' | 'No' | 'N/A' | '';

interface StaffFileData {
  home: string;
  date: string;
  personCompletingAudit: string;

  staff_full_name: string;
  photo: YesNoNA;
  photo_comment: string;
  cv_explained_gaps: YesNoNA;
  cv_explained_gaps_comment: string;
  application_form: YesNoNA;
  application_form_comment: string;
  interview: YesNoNA;
  interview_comment: string;
  right_to_work: YesNoNA;
  right_to_work_comment: string;
  visa_docs: YesNoNA;
  visa_docs_comment: string;
  id_passport_driving: YesNoNA;
  id_passport_driving_comment: string;
  id_proof_address: YesNoNA;
  id_proof_address_comment: string;
  medical_questionnaire: YesNoNA;
  medical_questionnaire_comment: string;
  references_x2: YesNoNA;
  references_x2_comment: string;
  dbs: YesNoNA;
  dbs_comment: string;
  offer_letter: YesNoNA;
  offer_letter_comment: string;
  contract: YesNoNA;
  contract_comment: string;
  employee_handbook: YesNoNA;
  employee_handbook_comment: string;
  job_description: YesNoNA;
  job_description_comment: string;
  supervisions: YesNoNA;
  supervisions_comment: string;
  appraisal: YesNoNA;
  appraisal_comment: string;

  comments: string;
}

export default function StaffFileAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user: authUser } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);

  const [data, setData] = useState<StaffFileData>({
    home: '',
    date: '',
    personCompletingAudit: '',

    staff_full_name: '',
    photo: '',
    photo_comment: '',
    cv_explained_gaps: '',
    cv_explained_gaps_comment: '',
    application_form: '',
    application_form_comment: '',
    interview: '',
    interview_comment: '',
    right_to_work: '',
    right_to_work_comment: '',
    visa_docs: '',
    visa_docs_comment: '',
    id_passport_driving: '',
    id_passport_driving_comment: '',
    id_proof_address: '',
    id_proof_address_comment: '',
    medical_questionnaire: '',
    medical_questionnaire_comment: '',
    references_x2: '',
    references_x2_comment: '',
    dbs: '',
    dbs_comment: '',
    offer_letter: '',
    offer_letter_comment: '',
    contract: '',
    contract_comment: '',
    employee_handbook: '',
    employee_handbook_comment: '',
    job_description: '',
    job_description_comment: '',
    supervisions: '',
    supervisions_comment: '',
    appraisal: '',
    appraisal_comment: '',

    comments: '',
  });

  const handleChange = (field: keyof StaffFileData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  const OptionQuestion = ({ label, field, value, commentField, commentValue }: { label: string; field: keyof StaffFileData; value: YesNoNA; commentField: keyof StaffFileData; commentValue: string; }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-4 items-center" data-field={String(field)}>
        <label className="flex items-center"><input type="radio" name={String(field)} value="Yes" checked={data[field] === 'Yes'} onChange={(e) => handleChange(field, 'Yes')} className="mr-2" />Yes</label>
        <label className="flex items-center"><input type="radio" name={String(field)} value="No" checked={data[field] === 'No'} onChange={(e) => handleChange(field, 'No')} className="mr-2" />No</label>
        <label className="flex items-center"><input type="radio" name={String(field)} value="N/A" checked={data[field] === 'N/A'} onChange={(e) => handleChange(field, 'N/A')} className="mr-2" />N/A</label>
      </div>
      {errors.includes(String(field)) && <p className="text-red-500 text-sm">This field is required</p>}
      <textarea value={data[commentField] as string} onChange={(e) => handleChange(commentField, e.target.value)} rows={2} placeholder="Comments" className="w-full p-2 border rounded resize-none mt-2" />
    </div>
  );

  const validateForm = () => {
    const required: (keyof StaffFileData)[] = ['home','date','personCompletingAudit','staff_full_name'];
    const missing = required.filter(f => !String(data[f]).trim());
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
    // Compute yes/no scoring for staff file (treat 'Yes' as positive)
    const YES_NO_FIELDS = [
      'photo','cv_explained_gaps','application_form','interview','right_to_work','visa_docs','id_passport_driving','id_proof_address','medical_questionnaire','references_x2','dbs','offer_letter','contract','employee_handbook','job_description','supervisions','appraisal'
    ];
    const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + ((data as any)[f] === 'Yes' ? 1 : 0), 0);
    const totalCount = YES_NO_FIELDS.length;
    const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : null;

    const payload = {
      ...data,
      createActionPlan: !!createActionPlan,
      createdBy: authUser?.id ?? null,
      workspaceId,
      auditType: 'staff-file',
      yesCount,
      totalCount,
      scorePercent,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId);
      setSavedAuditId(id);
      try {
        await markAuditCompleted(workspaceId, 'staff-file', new Date().toISOString());
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

  const addNewReport = () => {
    setData({
      home: '',
      date: '',
      personCompletingAudit: '',

      staff_full_name: '',
      photo: '',
      photo_comment: '',
      cv_explained_gaps: '',
      cv_explained_gaps_comment: '',
      application_form: '',
      application_form_comment: '',
      interview: '',
      interview_comment: '',
      right_to_work: '',
      right_to_work_comment: '',
      visa_docs: '',
      visa_docs_comment: '',
      id_passport_driving: '',
      id_passport_driving_comment: '',
      id_proof_address: '',
      id_proof_address_comment: '',
      medical_questionnaire: '',
      medical_questionnaire_comment: '',
      references_x2: '',
      references_x2_comment: '',
      dbs: '',
      dbs_comment: '',
      offer_letter: '',
      offer_letter_comment: '',
      contract: '',
      contract_comment: '',
      employee_handbook: '',
      employee_handbook_comment: '',
      job_description: '',
      job_description_comment: '',
      supervisions: '',
      supervisions_comment: '',
      appraisal: '',
      appraisal_comment: '',

      comments: '',
    });
    setErrors([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Staff File Audit</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentReport(Math.max(1, currentReport - 1))} className="p-1 hover:bg-gray-100 rounded" disabled={currentReport === 1}>←</button>
              <span className="text-sm text-gray-600">Report {currentReport} of {totalReports} — target: 5 per month</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of audit</label>
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
            <h3 className="text-lg font-semibold text-green-900 mb-3">Staff File Checklist</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Staff full name</label>
                <input value={data.staff_full_name} data-field="staff_full_name" onChange={(e) => handleChange('staff_full_name', e.target.value)} className={`w-full p-2 border rounded ${errors.includes('staff_full_name') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} placeholder="Full name" />
                {errors.includes('staff_full_name') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
              </div>

              <OptionQuestion label="Photo" field="photo" value={data.photo} commentField="photo_comment" commentValue={data.photo_comment} />
              <OptionQuestion label="CV (any gaps from school/leave explained)" field="cv_explained_gaps" value={data.cv_explained_gaps} commentField="cv_explained_gaps_comment" commentValue={data.cv_explained_gaps_comment} />
              <OptionQuestion label="Application form" field="application_form" value={data.application_form} commentField="application_form_comment" commentValue={data.application_form_comment} />
              <OptionQuestion label="Interview" field="interview" value={data.interview} commentField="interview_comment" commentValue={data.interview_comment} />
              <OptionQuestion label="Right to work" field="right_to_work" value={data.right_to_work} commentField="right_to_work_comment" commentValue={data.right_to_work_comment} />
              <OptionQuestion label="Visa documentation and check" field="visa_docs" value={data.visa_docs} commentField="visa_docs_comment" commentValue={data.visa_docs_comment} />
              <OptionQuestion label="ID (passport/driving licence)" field="id_passport_driving" value={data.id_passport_driving} commentField="id_passport_driving_comment" commentValue={data.id_passport_driving_comment} />
              <OptionQuestion label="ID proof of address" field="id_proof_address" value={data.id_proof_address} commentField="id_proof_address_comment" commentValue={data.id_proof_address_comment} />
              <OptionQuestion label="Medical questionnaire" field="medical_questionnaire" value={data.medical_questionnaire} commentField="medical_questionnaire_comment" commentValue={data.medical_questionnaire_comment} />
              <OptionQuestion label="References x2 (professional and character)" field="references_x2" value={data.references_x2} commentField="references_x2_comment" commentValue={data.references_x2_comment} />
              <OptionQuestion label="DBS" field="dbs" value={data.dbs} commentField="dbs_comment" commentValue={data.dbs_comment} />
              <OptionQuestion label="Offer letter" field="offer_letter" value={data.offer_letter} commentField="offer_letter_comment" commentValue={data.offer_letter_comment} />
              <OptionQuestion label="Contract" field="contract" value={data.contract} commentField="contract_comment" commentValue={data.contract_comment} />
              <OptionQuestion label="Employee handbook" field="employee_handbook" value={data.employee_handbook} commentField="employee_handbook_comment" commentValue={data.employee_handbook_comment} />
              <OptionQuestion label="Job description" field="job_description" value={data.job_description} commentField="job_description_comment" commentValue={data.job_description_comment} />
              <OptionQuestion label="Supervisions" field="supervisions" value={data.supervisions} commentField="supervisions_comment" commentValue={data.supervisions_comment} />
              <OptionQuestion label="Appraisal" field="appraisal" value={data.appraisal} commentField="appraisal_comment" commentValue={data.appraisal_comment} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea value={data.comments} onChange={(e) => handleChange('comments', e.target.value)} rows={4} className="w-full p-2 border rounded resize-none" />
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
