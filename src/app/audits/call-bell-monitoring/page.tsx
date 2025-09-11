"use client";
import React, { useState } from "react";
import { useWorkspace } from '@/context/workspace';
import { saveAudit, updateAudit, markAuditCompleted, markAuditCompletedWithSnapshot } from '@/lib/firestore';
import { useAuth } from '@/hooks/use-auth';
import AuditFooter from '@/components/audit-footer';

export default function CallBellMonitoringAuditPage() {
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [reports, setReports] = useState([{
    home: "",
    auditDate: "",
    completedBy: "",
    numberOfCallBells: "",
    dateAnalysedFrom: "",
    dateAnalysedTo: "",
    averageEventsPerHour: "",
    busiestTime: "",
    totalCallBellsOverFiveMin: "",
    trendsIdentified: "",
    residentFeedback1: "",
    residentFeedback1Initial: "",
    residentFeedback2: "",
    residentFeedback2Initial: "",
    residentFeedback3: "",
    residentFeedback3Initial: "",
    comments: "",
  }]);
  const [showModal, setShowModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);
  const [finalComments, setFinalComments] = useState('');

  const currentReport = reports[currentReportIndex];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setReports(prev => {
      const updated = [...prev];
      updated[currentReportIndex] = {
        ...updated[currentReportIndex],
        [name]: value,
      };
      return updated;
    });
  }

  function addNewReport() {
    const newReport = {
      home: "",
      auditDate: "",
      completedBy: "",
      numberOfCallBells: "",
      dateAnalysedFrom: "",
      dateAnalysedTo: "",
      averageEventsPerHour: "",
      busiestTime: "",
      totalCallBellsOverFiveMin: "",
      trendsIdentified: "",
      residentFeedback1: "",
      residentFeedback1Initial: "",
      residentFeedback2: "",
      residentFeedback2Initial: "",
      residentFeedback3: "",
      residentFeedback3Initial: "",
      comments: "",
    };
    setReports(prev => [...prev, newReport]);
    setCurrentReportIndex(reports.length);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate all required fields
    const errors: string[] = [];
    const requiredFields = [
      { field: 'home', label: 'Home' },
      { field: 'auditDate', label: 'Date' },
      { field: 'completedBy', label: 'Person completing the audit' },
      { field: 'numberOfCallBells', label: 'Number of call bells analysed' },
      { field: 'dateAnalysedFrom', label: 'Date analysed from' },
      { field: 'dateAnalysedTo', label: 'Date analysed to' },
      { field: 'averageEventsPerHour', label: 'Average events per hour' },
      { field: 'busiestTime', label: 'Busiest time' },
      { field: 'totalCallBellsOverFiveMin', label: 'Total number of call bells over 5 min period' },
      { field: 'trendsIdentified', label: 'Trends identified' },
      { field: 'residentFeedback1', label: 'Resident feedback 1' },
      { field: 'residentFeedback1Initial', label: 'Resident feedback 1 initial' },
      { field: 'residentFeedback2', label: 'Resident feedback 2' },
      { field: 'residentFeedback2Initial', label: 'Resident feedback 2 initial' },
      { field: 'residentFeedback3', label: 'Resident feedback 3' },
      { field: 'residentFeedback3Initial', label: 'Resident feedback 3 initial' },
      { field: 'comments', label: 'Comments' },
    ];

    requiredFields.forEach(({ field }) => {
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

    // Save first, then show modal
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Please choose a workspace before saving audits.');
      return;
    }

    const workspaceId = activeWorkspace.id;
    const payload = {
      ...currentReport,
      comments: currentReport.comments || finalComments,
      createActionPlan: false,
      createdBy: user?.id ?? null,
    };

    try {
      setSaving(true);
      const id = await saveAudit(payload, workspaceId);
      setSavedAuditId(id);
      // Mark audit as completed and save snapshot
      try {
  const completedAt = currentReport.auditDate || new Date().toISOString();
  const result = await markAuditCompletedWithSnapshot(workspaceId, 'call-bell-monitoring', payload, completedAt);
      } catch (e) {
        console.warn('Failed to mark audit completed with snapshot', e);
      }
      setSaving(false);
      setShowModal(true);
    } catch (e) {
      setSaving(false);
      console.error('Failed to save call bell audit', e);
      alert('Failed to save audit. Please try again.');
    }
  }

  async function handleModalResponse(createActionPlan: boolean) {
    setShowModal(false);
    setValidationErrors([]);
    if (!activeWorkspace?.id) {
      alert('No active workspace selected. Audit was saved locally but could not be finalized.');
      return;
    }
    try {
      setSaving(true);
      if (savedAuditId) {
        await updateAudit(savedAuditId, { createActionPlan: !!createActionPlan, comments: finalComments || currentReport.comments }, activeWorkspace.id);
      }
      setSaving(false);
      alert(`Audit completed and saved${createActionPlan ? '; an action plan will be created.' : '.'}`);
    } catch (e) {
      setSaving(false);
      console.error('Failed to finalize saved audit', e);
      alert('Failed to finalize audit. Please try again.');
    }
  }

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
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 shadow-md flex-shrink-0">
        <div className="w-full">
          <div>
            <h1 className="text-2xl font-bold mb-1">Call Bell Monitoring Audit</h1>
            <p className="text-purple-100 text-sm">Complete this form to document and audit call bell monitoring</p>
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
                  {/* Three Column Layout: left (audit+analysis), middle (results+feedback), right (final comments + submit) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Audit Information Section */}
                      <div className="border-l-4 border-purple-500 pl-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Audit Information</h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Home {hasError('home') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="text" 
                              className={getFieldClassName('home', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
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
                                Date {hasError('auditDate') && <span className="text-red-500">*</span>}
                              </label>
                              <input 
                                type="date" 
                                className={getFieldClassName('auditDate', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                                name="auditDate" 
                                value={currentReport.auditDate} 
                                onChange={handleChange}
                                required
                              />
                              {hasError('auditDate') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Person completing the audit {hasError('completedBy') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="text" 
                              className={getFieldClassName('completedBy', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
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

                      {/* Call Bell Analysis Section */}
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Call Bell Analysis</h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Number of call bells analysed {hasError('numberOfCallBells') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="number" 
                              className={getFieldClassName('numberOfCallBells', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                              name="numberOfCallBells" 
                              value={currentReport.numberOfCallBells} 
                              onChange={handleChange}
                              placeholder="Enter number"
                              required
                            />
                            {hasError('numberOfCallBells') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date analysed from {hasError('dateAnalysedFrom') && <span className="text-red-500">*</span>}
                              </label>
                              <input 
                                type="date" 
                                className={getFieldClassName('dateAnalysedFrom', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                                name="dateAnalysedFrom" 
                                value={currentReport.dateAnalysedFrom} 
                                onChange={handleChange}
                                required
                              />
                              {hasError('dateAnalysedFrom') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date analysed to {hasError('dateAnalysedTo') && <span className="text-red-500">*</span>}
                              </label>
                              <input 
                                type="date" 
                                className={getFieldClassName('dateAnalysedTo', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                                name="dateAnalysedTo" 
                                value={currentReport.dateAnalysedTo} 
                                onChange={handleChange}
                                required
                              />
                              {hasError('dateAnalysedTo') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Average events per hour {hasError('averageEventsPerHour') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="text" 
                              className={getFieldClassName('averageEventsPerHour', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                              name="averageEventsPerHour" 
                              value={currentReport.averageEventsPerHour} 
                              onChange={handleChange}
                              placeholder="e.g., 12.5"
                              required
                            />
                            {hasError('averageEventsPerHour') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Busiest time {hasError('busiestTime') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="text" 
                              className={getFieldClassName('busiestTime', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                              name="busiestTime" 
                              value={currentReport.busiestTime} 
                              onChange={handleChange}
                              placeholder="e.g., 14:00 - 16:00"
                              required
                            />
                            {hasError('busiestTime') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total number of call bells over 5 min period {hasError('totalCallBellsOverFiveMin') && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                              type="number" 
                              className={getFieldClassName('totalCallBellsOverFiveMin', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                              name="totalCallBellsOverFiveMin" 
                              value={currentReport.totalCallBellsOverFiveMin} 
                              onChange={handleChange}
                              placeholder="Enter number"
                              required
                            />
                            {hasError('totalCallBellsOverFiveMin') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column */}
                    <div className="space-y-6">
                      {/* Trends Section */}
                      <div className="border-l-4 border-green-500 pl-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Analysis Results</h2>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Trends identified {hasError('trendsIdentified') && <span className="text-red-500">*</span>}
                            </label>
                            <textarea 
                              className={getFieldClassName('trendsIdentified', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm h-20 resize-none")}
                              name="trendsIdentified" 
                              value={currentReport.trendsIdentified} 
                              onChange={handleChange}
                              placeholder="Describe any patterns or trends observed..."
                              required
                            />
                            {hasError('trendsIdentified') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
                          </div>
                        </div>
                      </div>

                      {/* Resident Feedback Section */}
                      <div className="border-l-4 border-orange-500 pl-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Resident Feedback (ask 3 and initial)</h2>
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resident 1 Feedback {hasError('residentFeedback1') && <span className="text-red-500">*</span>}
                              </label>
                              <textarea 
                                className={getFieldClassName('residentFeedback1', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm h-16 resize-none")}
                                name="residentFeedback1" 
                                value={currentReport.residentFeedback1} 
                                onChange={handleChange}
                                placeholder="Feedback from resident 1..."
                                required
                              />
                              {hasError('residentFeedback1') && <p className="text-red-500 text-xs mt-1">Required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Initial {hasError('residentFeedback1Initial') && <span className="text-red-500">*</span>}
                              </label>
                              <input 
                                type="text" 
                                className={getFieldClassName('residentFeedback1Initial', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                                name="residentFeedback1Initial" 
                                value={currentReport.residentFeedback1Initial} 
                                onChange={handleChange}
                                placeholder="AA"
                                maxLength={5}
                                required
                              />
                              {hasError('residentFeedback1Initial') && <p className="text-red-500 text-xs mt-1">Required</p>}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resident 2 Feedback {hasError('residentFeedback2') && <span className="text-red-500">*</span>}
                              </label>
                              <textarea 
                                className={getFieldClassName('residentFeedback2', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm h-16 resize-none")}
                                name="residentFeedback2" 
                                value={currentReport.residentFeedback2} 
                                onChange={handleChange}
                                placeholder="Feedback from resident 2..."
                                required
                              />
                              {hasError('residentFeedback2') && <p className="text-red-500 text-xs mt-1">Required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Initial {hasError('residentFeedback2Initial') && <span className="text-red-500">*</span>}
                              </label>
                              <input 
                                type="text" 
                                className={getFieldClassName('residentFeedback2Initial', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                                name="residentFeedback2Initial" 
                                value={currentReport.residentFeedback2Initial} 
                                onChange={handleChange}
                                placeholder="BB"
                                maxLength={5}
                                required
                              />
                              {hasError('residentFeedback2Initial') && <p className="text-red-500 text-xs mt-1">Required</p>}
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resident 3 Feedback {hasError('residentFeedback3') && <span className="text-red-500">*</span>}
                              </label>
                              <textarea 
                                className={getFieldClassName('residentFeedback3', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm h-16 resize-none")}
                                name="residentFeedback3" 
                                value={currentReport.residentFeedback3} 
                                onChange={handleChange}
                                placeholder="Feedback from resident 3..."
                                required
                              />
                              {hasError('residentFeedback3') && <p className="text-red-500 text-xs mt-1">Required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Initial {hasError('residentFeedback3Initial') && <span className="text-red-500">*</span>}
                              </label>
                              <input 
                                type="text" 
                                className={getFieldClassName('residentFeedback3Initial', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm")}
                                name="residentFeedback3Initial" 
                                value={currentReport.residentFeedback3Initial} 
                                onChange={handleChange}
                                placeholder="CC"
                                maxLength={5}
                                required
                              />
                              {hasError('residentFeedback3Initial') && <p className="text-red-500 text-xs mt-1">Required</p>}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Final Comments + Submit */}
                    <div className="space-y-6">
                      <AuditFooter finalComments={finalComments} setFinalComments={setFinalComments} saving={saving} />
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
                className="w-12 h-12 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex items-center justify-center text-2xl font-bold shadow-lg"
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
            <p className="text-gray-600 mb-6">Would you like to create an action plan for this call bell monitoring audit?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleModalResponse(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                No
              </button>
              <button
                onClick={() => handleModalResponse(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Yes, Create Action Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}