"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface StaffMember {
  name: string;
  role: string;
  timeObserved: string;
  momentObserved: string;
  completedBy: string;
}

interface StaffObservation {
  staff: string;
  momentObserved: string;
  correctTechnique: string;
  comments: string;
}

interface HandHygieneAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;
  
  // Staff overview (5 staff members)
  staffMembers: StaffMember[];
  
  // Individual observations
  observations: StaffObservation[];
}

export default function HandHygieneAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<string[]>(['audit-details']);

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Section definitions with guidance text
  const sections = [
    {
      name: 'audit-details',
      label: 'Audit Details',
      guidance: 'Enter the basic information for this hand hygiene audit including the care home, date, and person completing the audit.'
    },
    {
      name: 'moment-reference',
      label: 'Moment Reference Guide',
      guidance: 'Review the 5 Moments for Hand Hygiene reference guide to understand the key moments when hand hygiene should be performed.'
    },
    {
      name: 'staff-overview',
      label: 'Staff Overview',
      guidance: 'Record the names and roles of 5 staff members who will be observed during this hand hygiene audit.'
    },
    {
      name: 'individual-observations',
      label: 'Individual Observations',
      guidance: 'Record detailed observations of hand hygiene compliance for each of the 5 staff members, including the moment, technique used, and any comments.'
    },
    {
      name: 'final-comments',
      label: 'Final Comments',
      guidance: 'Provide any final comments or recommendations based on the hand hygiene observations and compliance findings.'
    }
  ];

  // Helper functions for error handling and field styling
  const getFieldError = (fieldName: string) => {
    return errors.includes(fieldName);
  };

  const getFieldClassName = (fieldName: string, baseClass = "w-full p-2 border rounded-md") => {
    return `${baseClass} ${getFieldError(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  };

  const getTableFieldClassName = (fieldName: string, baseClass = "w-full p-1 border rounded") => {
    return `${baseClass} ${getFieldError(fieldName) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  };
  
  const [auditData, setAuditData] = useState<HandHygieneAuditData>({
    home: '',
    date: '',
    personCompletingAudit: '',
    
    staffMembers: Array(5).fill(null).map(() => ({
      name: '',
      role: '',
      timeObserved: '',
      momentObserved: '',
      completedBy: ''
    })),
    
    observations: Array(5).fill(null).map(() => ({
      staff: '',
      momentObserved: '',
      correctTechnique: '',
      comments: ''
    }))
  });

  const momentOptions = [
    { value: '1', label: '1 - Before touching a resident' },
    { value: '2', label: '2 - Before clean/aseptic procedure' },
    { value: '3', label: '3 - After body fluid exposure risk' },
    { value: '4', label: '4 - After touching a resident' },
    { value: '5', label: '5 - After touching resident surroundings' }
  ];

  const handleInputChange = (field: string, value: string) => {
    if (field === 'home' || field === 'date' || field === 'personCompletingAudit') {
      setAuditData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Remove error highlighting when field is filled
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(error => error !== field));
    }
  };

  const handleStaffMemberChange = (index: number, field: keyof StaffMember, value: string) => {
    const newStaffMembers = [...auditData.staffMembers];
    newStaffMembers[index] = {
      ...newStaffMembers[index],
      [field]: value
    };
    setAuditData(prev => ({
      ...prev,
      staffMembers: newStaffMembers
    }));
    
    const fieldKey = `staff${index + 1}_${field}`;
    if (value.trim() !== '' && errors.includes(fieldKey)) {
      setErrors(prev => prev.filter(error => error !== fieldKey));
    }
  };

  const handleObservationChange = (index: number, field: keyof StaffObservation, value: string) => {
    const newObservations = [...auditData.observations];
    newObservations[index] = {
      ...newObservations[index],
      [field]: value
    };
    setAuditData(prev => ({
      ...prev,
      observations: newObservations
    }));
    
    const fieldKey = `observation${index + 1}_${field}`;
    if (value.trim() !== '' && errors.includes(fieldKey)) {
      setErrors(prev => prev.filter(error => error !== fieldKey));
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];
    
    // Basic information validation
    if (!auditData.home.trim()) newErrors.push('home');
    if (!auditData.date.trim()) newErrors.push('date');
    if (!auditData.personCompletingAudit.trim()) newErrors.push('personCompletingAudit');
    
    // Staff members validation (at least first staff member should be filled)
    auditData.staffMembers.forEach((staff, index) => {
      if (staff.name.trim() || staff.role.trim() || staff.timeObserved.trim() || staff.momentObserved.trim() || staff.completedBy.trim()) {
        // If any field is filled, all required fields should be filled
        if (!staff.name.trim()) newErrors.push(`staff${index + 1}_name`);
        if (!staff.role.trim()) newErrors.push(`staff${index + 1}_role`);
        if (!staff.timeObserved.trim()) newErrors.push(`staff${index + 1}_timeObserved`);
        if (!staff.momentObserved.trim()) newErrors.push(`staff${index + 1}_momentObserved`);
        if (!staff.completedBy.trim()) newErrors.push(`staff${index + 1}_completedBy`);
      }
    });
    
    // Observations validation (only validate filled observations)
    auditData.observations.forEach((observation, index) => {
      if (observation.staff.trim() || observation.momentObserved.trim() || observation.correctTechnique.trim()) {
        // If any field is filled, all required fields should be filled
        if (!observation.staff.trim()) newErrors.push(`observation${index + 1}_staff`);
        if (!observation.momentObserved.trim()) newErrors.push(`observation${index + 1}_momentObserved`);
        if (!observation.correctTechnique.trim()) newErrors.push(`observation${index + 1}_correctTechnique`);
      }
    });
    
    // Check if at least one staff member is filled
    const hasStaffMember = auditData.staffMembers.some(staff => 
      staff.name.trim() || staff.role.trim() || staff.timeObserved.trim() || staff.momentObserved.trim() || staff.completedBy.trim()
    );
    
    // Check if at least one observation is filled
    const hasObservation = auditData.observations.some(observation => 
      observation.staff.trim() || observation.momentObserved.trim() || observation.correctTechnique.trim()
    );
    
    if (!hasStaffMember) {
      newErrors.push('staff1_name');
    }
    
    if (!hasObservation) {
      newErrors.push('observation1_staff');
    }
    
    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      // Scroll to first error
      const firstErrorElement = document.querySelector(`[data-field="${newErrors[0]}"]`);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return newErrors.length === 0;
  };

  const handleCompleteAudit = () => {
    if (validateForm()) {
      setShowModal(true);
    }
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!validateForm()) return;
    if (!activeWorkspace?.id) {
      alert('No active workspace. Please select a workspace before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...auditData,
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        organisationId: activeWorkspace.organisationId || null,
      };

      await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
      const completedAt = auditData.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspace.id, 'hand-hygiene', completedAt, activeWorkspace.organisationId || null);
      setShowModal(false);
      alert('Audit saved');
    } catch (err) {
      console.error('Failed to save audit', err);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const addNewReport = () => {
    // Reset form for new report
    setAuditData({
      home: '',
      date: '',
      personCompletingAudit: '',
      
      staffMembers: Array(5).fill(null).map(() => ({
        name: '',
        role: '',
        timeObserved: '',
        momentObserved: '',
        completedBy: ''
      })),
      
      observations: Array(5).fill(null).map(() => ({
        staff: '',
        momentObserved: '',
        correctTechnique: '',
        comments: ''
      }))
    });
    setErrors([]);
  };

  return (
    <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Hand Hygiene Audit</h1>
          <p className="mb-4 text-slate-500">Complete this form to audit hand hygiene compliance across 5 Moments. All required fields must be filled.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                data-field="home"
                value={auditData.home}
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
                value={auditData.date}
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
                value={auditData.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                required
              />
              {getFieldError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>

  {/* Main form right column, scrolls with page */}
  <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleCompleteAudit(); }} className="flex flex-col gap-8">
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

                    {section.name === 'moment-reference' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">5 Moments for Hand Hygiene</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {momentOptions.map((moment) => (
                            <div key={moment.value} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                              <span className="font-semibold text-slate-800">{moment.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {section.name === 'staff-overview' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Staff Members to Observe</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-300 bg-white rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Staff Member</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Role</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Time Observed</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Moment</th>
                                <th className="border border-slate-300 p-3 text-left font-semibold text-slate-800">Observer</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditData.staffMembers.map((staff, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="text"
                                      data-field={`staff${index + 1}_name`}
                                      value={staff.name}
                                      onChange={(e) => handleStaffMemberChange(index, 'name', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_name`)}
                                      placeholder={`Staff ${index + 1} name`}
                                    />
                                    {getFieldError(`staff${index + 1}_name`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="text"
                                      data-field={`staff${index + 1}_role`}
                                      value={staff.role}
                                      onChange={(e) => handleStaffMemberChange(index, 'role', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_role`)}
                                      placeholder="Role"
                                    />
                                    {getFieldError(`staff${index + 1}_role`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="time"
                                      data-field={`staff${index + 1}_timeObserved`}
                                      value={staff.timeObserved}
                                      onChange={(e) => handleStaffMemberChange(index, 'timeObserved', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_timeObserved`)}
                                    />
                                    {getFieldError(`staff${index + 1}_timeObserved`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <select
                                      data-field={`staff${index + 1}_momentObserved`}
                                      value={staff.momentObserved}
                                      onChange={(e) => handleStaffMemberChange(index, 'momentObserved', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_momentObserved`)}
                                    >
                                      <option value="">Select moment</option>
                                      {momentOptions.map((moment) => (
                                        <option key={moment.value} value={moment.value}>
                                          {moment.label}
                                        </option>
                                      ))}
                                    </select>
                                    {getFieldError(`staff${index + 1}_momentObserved`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                  <td className="border border-slate-300 p-3">
                                    <Input
                                      type="text"
                                      data-field={`staff${index + 1}_completedBy`}
                                      value={staff.completedBy}
                                      onChange={(e) => handleStaffMemberChange(index, 'completedBy', e.target.value)}
                                      className={getTableFieldClassName(`staff${index + 1}_completedBy`)}
                                      placeholder="Observer name"
                                    />
                                    {getFieldError(`staff${index + 1}_completedBy`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {section.name === 'individual-observations' && (
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Detailed Observations</h4>
                        <div className="space-y-6">
                          {auditData.observations.map((observation, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                              <h5 className="text-md font-medium text-slate-800 mb-4">Observation {index + 1}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
                                  <Input
                                    type="text"
                                    data-field={`observation${index + 1}_staff`}
                                    value={observation.staff}
                                    onChange={(e) => handleObservationChange(index, 'staff', e.target.value)}
                                    className={getFieldClassName(`observation${index + 1}_staff`)}
                                    placeholder="Staff name"
                                  />
                                  {getFieldError(`observation${index + 1}_staff`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Moment Observed</label>
                                  <select
                                    data-field={`observation${index + 1}_momentObserved`}
                                    value={observation.momentObserved}
                                    onChange={(e) => handleObservationChange(index, 'momentObserved', e.target.value)}
                                    className={getFieldClassName(`observation${index + 1}_momentObserved`)}
                                  >
                                    <option value="">Select moment</option>
                                    {momentOptions.map((moment) => (
                                      <option key={moment.value} value={moment.value}>
                                        {moment.value}
                                      </option>
                                    ))}
                                  </select>
                                  {getFieldError(`observation${index + 1}_momentObserved`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Correct Technique</label>
                                  <div className="flex gap-4" data-field={`observation${index + 1}_correctTechnique`}>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name={`observation${index + 1}_correctTechnique`}
                                        value="Yes"
                                        checked={observation.correctTechnique === 'Yes'}
                                        onChange={(e) => handleObservationChange(index, 'correctTechnique', e.target.value)}
                                        className="mr-2"
                                      />
                                      Yes
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name={`observation${index + 1}_correctTechnique`}
                                        value="No"
                                        checked={observation.correctTechnique === 'No'}
                                        onChange={(e) => handleObservationChange(index, 'correctTechnique', e.target.value)}
                                        className="mr-2"
                                      />
                                      No
                                    </label>
                                  </div>
                                  {getFieldError(`observation${index + 1}_correctTechnique`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                                  <Textarea
                                    value={observation.comments}
                                    onChange={(e) => handleObservationChange(index, 'comments', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-md resize-none"
                                    rows={3}
                                    placeholder="Additional comments..."
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
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
                          placeholder="Enter any additional comments or recommendations based on the hand hygiene observations..."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <button type="button" onClick={handleCompleteAudit} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                {saving ? 'Saving...' : 'Complete Audit'}
              </button>
            </div>
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
                onClick={() => handleModalClose()}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'No'}
              </button>
              <button
                onClick={() => handleModalCreate(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save and Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}