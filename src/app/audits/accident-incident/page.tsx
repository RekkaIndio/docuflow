

"use client";
import React, { useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, updateAudit, markAuditCompleted, markAuditCompletedWithSnapshot } from '@/lib/firestore';
import { useWorkspace } from '@/context/workspace';

export default function AccidentIncidentAuditPage() {
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [reports, setReports] = useState([{
    home: "",
    auditDate: "",
    completedBy: "",
    incidentDate: "",
    incidentTime: "",
    residentName: "",
    accidentOrIncident: "",
    details: "",
    actionsTaken: "",
    preventative: "",
    cqcNotification: "",
    safeguardNotification: "",
  }]);
  const [showModal, setShowModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentReport = reports[currentReportIndex];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setReports(prev => {
      const updated = [...prev];
      updated[currentReportIndex] = {
        ...updated[currentReportIndex],
        [name]: type === "radio" ? value : value,
      };
      return updated;
    });
  }

  function addNewReport() {
    const newReport = {
      home: "",
      auditDate: "",
      completedBy: "",
      incidentDate: "",
      incidentTime: "",
      residentName: "",
      accidentOrIncident: "",
      details: "",
      actionsTaken: "",
      preventative: "",
      cqcNotification: "",
      safeguardNotification: "",
    };
    setReports(prev => [...prev, newReport]);
    setCurrentReportIndex(reports.length);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate all required fields
    const errors: string[] = [];
    const requiredFields = [
      { field: 'home', label: 'Home/Care Facility' },
      { field: 'auditDate', label: 'Audit Date' },
      { field: 'completedBy', label: 'Person Completing Audit' },
      { field: 'incidentDate', label: 'Incident Date' },
      { field: 'incidentTime', label: 'Incident Time' },
      { field: 'residentName', label: 'Resident Name' },
      { field: 'accidentOrIncident', label: 'Type of Occurrence' },
      { field: 'details', label: 'Details of Incident' },
      { field: 'actionsTaken', label: 'Actions Taken' },
      { field: 'preventative', label: 'Preventative Measures' },
      { field: 'cqcNotification', label: 'CQC Notification' },
      { field: 'safeguardNotification', label: 'Safeguarding Notification' },
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!currentReport[field as keyof typeof currentReport] || currentReport[field as keyof typeof currentReport].trim() === '') {
        errors.push(field);
      }
    });

    setValidationErrors(errors);

    if (errors.length > 0) {
      // Scroll to first error field
      const firstErrorElement = document.querySelector(`[name="${errors[0]}"]`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Ensure we have an active workspace — avoid falling back to top-level audits collection
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }

    const workspaceId = activeWorkspace.id;

    // Save audit immediately to ensure it's stored under the active workspace
    try {
      setSaving(true);
      const auditPayload = {
        ...currentReport,
        comments: finalComments,
        createActionPlan: false,
        createdBy: user?.id ?? null,
        workspaceId: workspaceId,
      };
      const id = await saveAudit(auditPayload, workspaceId);
      setSavedAuditId(id);
      
      // Mark this audit type as completed for the month and save snapshot
      try {
  const completedAt = currentReport.auditDate || new Date().toISOString();
  const result = await markAuditCompletedWithSnapshot(workspaceId, 'accident-incident', auditPayload, completedAt);
  console.log('markAuditCompletedWithSnapshot result', result);
      } catch (e) {
        console.warn('Failed to mark audit completed with snapshot', e);
      }
      
      setSaving(false);
      setShowModal(true);
    } catch (err) {
      setSaving(false);
      console.error('Failed to save audit on submit', err);
      alert('Failed to save audit. Please try again.');
    }
  }

  async function handleModalResponse(createActionPlan: boolean) {
    setShowModal(false);
    setValidationErrors([]); // Clear validation errors on successful completion
    // The audit is already saved and marked as completed, just update the action plan flag if needed
    try {
      setSaving(true);
      if (!activeWorkspace?.id) {
        console.warn('No active workspace when completing audit; skipping update.');
      } else {
        const workspaceId = activeWorkspace.id;
        if (savedAuditId) {
          await updateAudit(savedAuditId, { createActionPlan: !!createActionPlan, comments: finalComments }, workspaceId);
        }
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to update saved audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const activeWorkspace = useWorkspace();
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');

  // Helper function to check if field has error
  const hasError = (fieldName: string) => validationErrors.includes(fieldName);
  
  // Helper function to get error styling
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return hasError(fieldName) 
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500` 
      : baseClassName;
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md flex-shrink-0">
        <div className="w-full">
          <div>
            <h1 className="text-2xl font-bold mb-1">Accident and Incident Audit</h1>
            <p className="text-blue-100 text-sm">Complete this form to document and audit accidents or incidents</p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4">
          <div className="flex gap-4">
            {/* Main Form */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex-1">
              <div className="p-6">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Three Column Layout: left (audit+incident), middle (response+notifications), right (final comments + submit) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Audit Information + Incident Information */}
                  <div className="space-y-6">
                    {/* Audit Information Section */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit Information</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Home/Care Facility {hasError('home') && <span className="text-red-500">*</span>}
                          </label>
                          <input 
                            type="text" 
                            className={getFieldClassName('home', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                            name="home" 
                            value={currentReport.home} 
                            onChange={handleChange}
                            placeholder="Enter care home name"
                            required
                          />
                          {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Audit Date {hasError('auditDate') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="date" 
                              className={getFieldClassName('auditDate', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                              name="auditDate" 
                              value={currentReport.auditDate} 
                              onChange={handleChange}
                              required
                            />
                            {hasError('auditDate') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Time {hasError('incidentTime') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="time" 
                              className={getFieldClassName('incidentTime', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                              name="incidentTime" 
                              value={currentReport.incidentTime} 
                              onChange={handleChange}
                              required
                            />
                            {hasError('incidentTime') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Person Completing Audit {hasError('completedBy') && <span className="text-red-500">*</span>}
                          </label>
                          <input 
                            type="text" 
                            className={getFieldClassName('completedBy', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                            name="completedBy" 
                            value={currentReport.completedBy} 
                            onChange={handleChange}
                            placeholder="Full name and position"
                            required
                          />
                          {hasError('completedBy') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                      </div>
                    </div>

                    {/* Incident Details Section */}
                    <div className="border-l-4 border-red-500 pl-4">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">Incident Information</h2>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Incident Date {hasError('incidentDate') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="date" 
                              className={getFieldClassName('incidentDate', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                              name="incidentDate" 
                              value={currentReport.incidentDate} 
                              onChange={handleChange}
                              required
                            />
                            {hasError('incidentDate') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Resident Name {hasError('residentName') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="text" 
                              className={getFieldClassName('residentName', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                              name="residentName" 
                              value={currentReport.residentName} 
                              onChange={handleChange}
                              placeholder="Full name"
                              required
                            />
                            {hasError('residentName') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type of Occurrence {hasError('accidentOrIncident') && <span className="text-red-500">*</span>}
                          </label>
                          <input 
                            type="text" 
                            className={getFieldClassName('accidentOrIncident', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm")}
                            name="accidentOrIncident" 
                            value={currentReport.accidentOrIncident} 
                            onChange={handleChange}
                            placeholder="e.g., Fall, Medication error"
                            required
                          />
                          {hasError('accidentOrIncident') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Details of Incident {hasError('details') && <span className="text-red-500">*</span>}
                          </label>
                          <textarea 
                            className={getFieldClassName('details', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-20 resize-none")}
                            name="details" 
                            value={currentReport.details} 
                            onChange={handleChange}
                            placeholder="Describe what occurred..."
                            required
                          />
                          {hasError('details') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Response & Actions + Notifications & Compliance */}
                  <div className="space-y-6">
                    {/* Response & Actions Section */}
                    <div className="border-l-4 border-green-500 pl-4">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">Response & Actions</h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Actions Taken {hasError('actionsTaken') && <span className="text-red-500">*</span>}
                          </label>
                          <textarea 
                            className={getFieldClassName('actionsTaken', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-20 resize-none")}
                            name="actionsTaken" 
                            value={currentReport.actionsTaken} 
                            onChange={handleChange}
                            placeholder="Immediate actions taken..."
                            required
                          />
                          {hasError('actionsTaken') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preventative Measures {hasError('preventative') && <span className="text-red-500">*</span>}
                          </label>
                          <textarea 
                            className={getFieldClassName('preventative', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-20 resize-none")}
                            name="preventative" 
                            value={currentReport.preventative} 
                            onChange={handleChange}
                            placeholder="Prevention measures..."
                            required
                          />
                          {hasError('preventative') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                        </div>
                      </div>
                    </div>

                    {/* Notifications & Compliance Section */}
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">Notifications & Compliance</h2>
                      <div className="space-y-4">
                        <div className={hasError('cqcNotification') ? "bg-red-50 p-3 rounded-lg border border-red-200" : "bg-gray-50 p-3 rounded-lg"}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CQC Notification Required {hasError('cqcNotification') && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input 
                                type="radio" 
                                name="cqcNotification" 
                                value="yes" 
                                checked={currentReport.cqcNotification === "yes"} 
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              /> 
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input 
                                type="radio" 
                                name="cqcNotification" 
                                value="no" 
                                checked={currentReport.cqcNotification === "no"} 
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              /> 
                              <span className="text-sm">No</span>
                            </label>
                          </div>
                          {hasError('cqcNotification') && <p className="text-red-500 text-xs mt-1">Please select an option</p>}
                        </div>
                        <div className={hasError('safeguardNotification') ? "bg-red-50 p-3 rounded-lg border border-red-200" : "bg-gray-50 p-3 rounded-lg"}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Safeguarding Notification {hasError('safeguardNotification') && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input 
                                type="radio" 
                                name="safeguardNotification" 
                                value="yes" 
                                checked={currentReport.safeguardNotification === "yes"} 
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              /> 
                              <span className="text-sm">Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input 
                                type="radio" 
                                name="safeguardNotification" 
                                value="no" 
                                checked={currentReport.safeguardNotification === "no"} 
                                onChange={handleChange}
                                className="mr-2 text-blue-600"
                              /> 
                              <span className="text-sm">No</span>
                            </label>
                          </div>
                          {hasError('safeguardNotification') && <p className="text-red-500 text-xs mt-1">Please select an option</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Final Comments + Submit */}
                  <div className="space-y-6">
                    <div className="border-l-4 border-gray-300 pl-4">
                      <h3 className="text-md font-medium text-gray-800 mb-2">Final Comments</h3>
                      <textarea
                        name="finalComments"
                        value={finalComments}
                        onChange={(e) => setFinalComments(e.target.value)}
                        placeholder="Any final comments or observations about this audit..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-64 resize-none"
                      />
                    </div>

                    {/* Submit Button placed in right column to align with final comments */}
                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit" 
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md transition-colors duration-200 shadow-md hover:shadow-lg"
                      >
                        Complete Audit
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Navigation and Add Report Buttons - positioned to the right side */}
          <div className="flex flex-col justify-center gap-4">
            {/* Navigation */}
            {reports.length > 1 && (
              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  onClick={() => setCurrentReportIndex(Math.max(0, currentReportIndex - 1))}
                  disabled={currentReportIndex === 0}
                  className="w-8 h-8 bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  ←
                </button>
                <span className="text-gray-600 text-xs font-medium">
                  {currentReportIndex + 1} of {reports.length}
                </span>
                <button
                  onClick={() => setCurrentReportIndex(Math.min(reports.length - 1, currentReportIndex + 1))}
                  disabled={currentReportIndex === reports.length - 1}
                  className="w-8 h-8 bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  →
                </button>
              </div>
            )}
            
            {/* Add Report Button */}
            <button
              onClick={addNewReport}
              className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center text-2xl font-bold shadow-lg"
              title="Add new report"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Complete</h3>
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this incident?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleModalResponse(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'No'}
              </button>
              <button
                onClick={() => handleModalResponse(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Yes, Create Action Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
