"use client";
import { useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { saveAudit, markAuditCompleted } from '@/lib/firestore';

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
      };

      await saveAudit(payload, activeWorkspace.id);
      const completedAt = auditData.date || new Date().toISOString();
      await markAuditCompleted(activeWorkspace.id, 'hand-hygiene', completedAt);
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
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Hand Hygiene Audit</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentReport(Math.max(1, currentReport - 1))}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={currentReport === 1}
              >
                ←
              </button>
              <span className="text-sm text-gray-600">
                Report {currentReport} of {totalReports}
              </span>
              <button 
                onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={currentReport === totalReports}
              >
                →
              </button>
            </div>
            <div className="bg-red-500 p-2 rounded">
              <button 
                onClick={addNewReport}
                className="text-white hover:text-gray-200"
                title="Add New Report"
              >
                +
              </button>
            </div>
          </div>
        </div>
        
        {/* Basic Information */}
        <div className="bg-teal-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-teal-900 mb-4">Audit Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
              <input
                type="text"
                data-field="home"
                value={auditData.home}
                onChange={(e) => handleInputChange('home', e.target.value)}
                className={`w-full p-2 border rounded-md ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                placeholder="Enter home name"
              />
              {errors.includes('home') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                data-field="date"
                value={auditData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`w-full p-2 border rounded-md ${errors.includes('date') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.includes('date') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Person Completing the Audit</label>
              <input
                type="text"
                data-field="personCompletingAudit"
                value={auditData.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                className={`w-full p-2 border rounded-md ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                placeholder="Enter auditor name"
              />
              {errors.includes('personCompletingAudit') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>
          </div>
        </div>

        {/* Moment Reference Guide */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Moment Observed Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {momentOptions.map((moment) => (
              <div key={moment.value} className="text-sm">
                <span className="font-medium">{moment.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Overview Table */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4">Staff Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-green-100">
                  <th className="border border-gray-300 p-2 text-left">Staff Member</th>
                  <th className="border border-gray-300 p-2 text-left">Role</th>
                  <th className="border border-gray-300 p-2 text-left">Time Observed</th>
                  <th className="border border-gray-300 p-2 text-left">Moment Observed</th>
                  <th className="border border-gray-300 p-2 text-left">Completed by</th>
                </tr>
              </thead>
              <tbody>
                {auditData.staffMembers.map((staff, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="text"
                        data-field={`staff${index + 1}_name`}
                        value={staff.name}
                        onChange={(e) => handleStaffMemberChange(index, 'name', e.target.value)}
                        className={`w-full p-1 border rounded ${errors.includes(`staff${index + 1}_name`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        placeholder={`Staff ${index + 1} name`}
                      />
                      {errors.includes(`staff${index + 1}_name`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="text"
                        data-field={`staff${index + 1}_role`}
                        value={staff.role}
                        onChange={(e) => handleStaffMemberChange(index, 'role', e.target.value)}
                        className={`w-full p-1 border rounded ${errors.includes(`staff${index + 1}_role`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        placeholder="Role"
                      />
                      {errors.includes(`staff${index + 1}_role`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="time"
                        data-field={`staff${index + 1}_timeObserved`}
                        value={staff.timeObserved}
                        onChange={(e) => handleStaffMemberChange(index, 'timeObserved', e.target.value)}
                        className={`w-full p-1 border rounded ${errors.includes(`staff${index + 1}_timeObserved`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      />
                      {errors.includes(`staff${index + 1}_timeObserved`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <select
                        data-field={`staff${index + 1}_momentObserved`}
                        value={staff.momentObserved}
                        onChange={(e) => handleStaffMemberChange(index, 'momentObserved', e.target.value)}
                        className={`w-full p-1 border rounded ${errors.includes(`staff${index + 1}_momentObserved`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      >
                        <option value="">Select moment</option>
                        {momentOptions.map((moment) => (
                          <option key={moment.value} value={moment.value}>
                            {moment.label}
                          </option>
                        ))}
                      </select>
                      {errors.includes(`staff${index + 1}_momentObserved`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="text"
                        data-field={`staff${index + 1}_completedBy`}
                        value={staff.completedBy}
                        onChange={(e) => handleStaffMemberChange(index, 'completedBy', e.target.value)}
                        className={`w-full p-1 border rounded ${errors.includes(`staff${index + 1}_completedBy`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        placeholder="Observer name"
                      />
                      {errors.includes(`staff${index + 1}_completedBy`) && <p className="text-red-500 text-xs mt-1">Required</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Observations */}
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-4">Individual Observations</h2>
          <div className="space-y-6">
            {auditData.observations.map((observation, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-purple-200">
                <h3 className="text-md font-medium text-purple-800 mb-3">Observation {index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Staff</label>
                    <input
                      type="text"
                      data-field={`observation${index + 1}_staff`}
                      value={observation.staff}
                      onChange={(e) => handleObservationChange(index, 'staff', e.target.value)}
                      className={`w-full p-2 border rounded-md ${errors.includes(`observation${index + 1}_staff`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      placeholder="Staff name"
                    />
                    {errors.includes(`observation${index + 1}_staff`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Moment Observed (1-5)</label>
                    <select
                      data-field={`observation${index + 1}_momentObserved`}
                      value={observation.momentObserved}
                      onChange={(e) => handleObservationChange(index, 'momentObserved', e.target.value)}
                      className={`w-full p-2 border rounded-md ${errors.includes(`observation${index + 1}_momentObserved`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    >
                      <option value="">Select moment</option>
                      {momentOptions.map((moment) => (
                        <option key={moment.value} value={moment.value}>
                          {moment.value}
                        </option>
                      ))}
                    </select>
                    {errors.includes(`observation${index + 1}_momentObserved`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Technique Observed</label>
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
                    {errors.includes(`observation${index + 1}_correctTechnique`) && <p className="text-red-500 text-sm mt-1">Required</p>}
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    {/* per-observation comments intentionally hidden in the UI; kept in the data model */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final Comments Section (single per-page comment box) */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
          <textarea
            value={finalComments}
            onChange={(e) => setFinalComments(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md resize-none"
            rows={4}
            placeholder="Enter any additional comments or observations..."
          />
        </div>

        {/* Complete Audit Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleCompleteAudit}
            disabled={saving}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Complete Audit'}
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan based on this audit?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleModalClose} disabled={saving} className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50">No, thanks</button>
              <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Action Plan'}</button>
              <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save and Close'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}