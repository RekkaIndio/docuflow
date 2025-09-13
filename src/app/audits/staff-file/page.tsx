'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

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

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'personal-info': true,
    'recruitment-docs': false,
    'identification': false,
    'employment-docs': false,
    'ongoing-records': false,
  });

  // Section definitions with guidance text
  const sections = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      color: 'green',
      guidance: 'Verify basic staff identification and personal documentation required for employment records.',
      questions: [
        { field: 'photo', label: 'Photo' },
        { field: 'cv_explained_gaps', label: 'CV (any gaps from school/leave explained)' },
        { field: 'application_form', label: 'Application form' },
        { field: 'interview', label: 'Interview' },
      ]
    },
    {
      id: 'recruitment-docs',
      title: 'Recruitment Documentation',
      color: 'yellow',
      guidance: 'Check all required documentation obtained during the recruitment and pre-employment process.',
      questions: [
        { field: 'medical_questionnaire', label: 'Medical questionnaire' },
        { field: 'references_x2', label: 'References x2 (professional and character)' },
        { field: 'dbs', label: 'DBS' },
      ]
    },
    {
      id: 'identification',
      title: 'Identification & Right to Work',
      color: 'pink',
      guidance: 'Verify all identification documents and right to work checks are present and up to date.',
      questions: [
        { field: 'right_to_work', label: 'Right to work' },
        { field: 'visa_docs', label: 'Visa documentation and check' },
        { field: 'id_passport_driving', label: 'ID (passport/driving licence)' },
        { field: 'id_proof_address', label: 'ID proof of address' },
      ]
    },
    {
      id: 'employment-docs',
      title: 'Employment Documentation',
      color: 'emerald',
      guidance: 'Ensure all employment-related documents are present and signed by the employee.',
      questions: [
        { field: 'offer_letter', label: 'Offer letter' },
        { field: 'contract', label: 'Contract' },
        { field: 'employee_handbook', label: 'Employee handbook' },
        { field: 'job_description', label: 'Job description' },
      ]
    },
    {
      id: 'ongoing-records',
      title: 'Ongoing Records & Development',
      color: 'violet',
      guidance: 'Check that ongoing staff development and performance records are maintained.',
      questions: [
        { field: 'supervisions', label: 'Supervisions' },
        { field: 'appraisal', label: 'Appraisal' },
      ]
    },
  ];

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

  const handleChange = (field: keyof StaffFileData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (value && errors.includes(field)) setErrors(prev => prev.filter(e => e !== field));
  };

  const OptionQuestion = ({ field, label }: { field: string; label: string }) => {
    const yesNoField = field as keyof StaffFileData;
    const commentField = `${field}_comment` as keyof StaffFileData;
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
              onChange={(e) => handleChange(yesNoField, 'Yes')}
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
              onChange={(e) => handleChange(yesNoField, 'No')}
              className="mr-2"
            />
            No
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={field}
              value="N/A"
              checked={data[yesNoField] === 'N/A'}
              onChange={(e) => handleChange(yesNoField, 'N/A')}
              className="mr-2"
            />
            N/A
          </label>
        </div>
        {hasError && <p className="text-red-500 text-sm">This field is required</p>}
        <textarea
          value={data[commentField] as string}
          onChange={(e) => handleChange(commentField, e.target.value)}
          rows={2}
          placeholder="Comments"
          className="w-full p-2 border border-gray-300 rounded resize-none mt-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    );
  };

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
    <div className="max-w-7xl mx-auto p-6 bg-white">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Audit Information */}
          <div className="lg:col-span-1">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-900">Audit Information</h2>
              </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of audit</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Person completing the audit</label>
                  <input
                    value={data.personCompletingAudit}
                    data-field="personCompletingAudit"
                    onChange={(e) => handleChange('personCompletingAudit', e.target.value)}
                    className={getFieldClassName('personCompletingAudit')}
                    placeholder="Enter auditor name"
                  />
                  {getFieldError('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff full name</label>
                  <input
                    value={data.staff_full_name}
                    data-field="staff_full_name"
                    onChange={(e) => handleChange('staff_full_name', e.target.value)}
                    className={getFieldClassName('staff_full_name')}
                    placeholder="Full name"
                  />
                  {getFieldError('staff_full_name') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Collapsible Sections */}
          <div className="lg:col-span-2 space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  {openSections[section.id] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {openSections[section.id] && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 mb-4">{section.guidance}</p>
                    <div className="space-y-4">
                      {section.questions.map((question, qIndex) => (
                        <div key={qIndex}>
                          <OptionQuestion label={question.label} field={question.field} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Comments Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                <textarea
                  value={data.comments}
                  onChange={(e) => handleChange('comments', e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any additional comments..."
                />
              </div>
            </div>

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleComplete}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Complete Audit
              </button>
            </div>
          </div>
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
  );
}
