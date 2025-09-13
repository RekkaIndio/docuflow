"use client";
import React, { useState } from "react";
import { useWorkspace } from '@/context/workspace';
import { saveAudit, updateAudit, markAuditCompleted, markAuditCompletedWithSnapshot } from '@/lib/firestore';
import { useAuth } from '@/hooks/use-auth';
import AuditFooter from '@/components/audit-footer';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

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
  
  // Collapsible state for each section
  const [openSections, setOpenSections] = useState(() => Array(3).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  // Section definitions for collapsible form
  const sections = [
    {
      label: "1. Audit Information",
      name: "auditInfo",
      guidance: ["Complete basic audit information and audit details."]
    },
    {
      label: "2. Call Bell Analysis",
      name: "callBellAnalysis",
      guidance: [
        "Analyze call bell data over the specified period.",
        "Document patterns and busiest times."
      ]
    },
    {
      label: "3. Resident Feedback",
      name: "residentFeedback",
      guidance: [
        "Collect feedback from 3 residents about call bell response times.",
        "Document resident satisfaction and concerns."
      ]
    }
  ];

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
          {validationErrors.includes(yesNoField) && (
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

  return (
    <div className="max-w-7xl mx-auto p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Call Bell Monitoring Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive audit to monitor call bell response times and effectiveness. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <input
                type="text"
                className={getFieldClassName('home', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500")}
                name="home"
                value={currentReport.home}
                onChange={handleChange}
                placeholder="Enter care home name"
                required
              />
              {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <input
                type="date"
                className={getFieldClassName('auditDate', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500")}
                name="auditDate"
                value={currentReport.auditDate}
                onChange={handleChange}
                required
              />
              {hasError('auditDate') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <input
                type="text"
                className={getFieldClassName('completedBy', "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500")}
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
        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} className="bg-white rounded-2xl border border-slate-200 shadow-md transition-shadow hover:shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-8 py-5 text-left font-semibold text-blue-900 text-lg focus:outline-none hover:bg-slate-50 rounded-t-2xl transition-colors"
                  onClick={() => toggleSection(idx)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{section.label}</h3>
                  </div>
                  {openSections[idx] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {openSections[idx] && (
                  <div className="px-8 pb-8">
                    {section.guidance && (
                      <ul className="mb-4 ml-4 list-disc text-sm text-slate-500 space-y-1">
                        {section.guidance.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    )}

                    {/* Section content based on index */}
                    {idx === 0 && (
                      <div className="space-y-4">
                        {/* Audit Information - already in left panel, so this section is minimal */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-sm text-slate-600">Basic audit information has been entered in the left panel.</p>
                        </div>
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Number of call bells analysed</label>
                              <input
                                type="number"
                                className={getFieldClassName('numberOfCallBells', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="numberOfCallBells"
                                value={currentReport.numberOfCallBells}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('numberOfCallBells') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date analysed from</label>
                                <input
                                  type="date"
                                  className={getFieldClassName('dateAnalysedFrom', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="dateAnalysedFrom"
                                  value={currentReport.dateAnalysedFrom}
                                  onChange={handleChange}
                                  required
                                />
                                {hasError('dateAnalysedFrom') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date analysed to</label>
                                <input
                                  type="date"
                                  className={getFieldClassName('dateAnalysedTo', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="dateAnalysedTo"
                                  value={currentReport.dateAnalysedTo}
                                  onChange={handleChange}
                                  required
                                />
                                {hasError('dateAnalysedTo') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Average events per hour</label>
                              <input
                                type="text"
                                className={getFieldClassName('averageEventsPerHour', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="averageEventsPerHour"
                                value={currentReport.averageEventsPerHour}
                                onChange={handleChange}
                                placeholder="e.g., 12.5"
                                required
                              />
                              {hasError('averageEventsPerHour') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Busiest time</label>
                              <input
                                type="text"
                                className={getFieldClassName('busiestTime', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="busiestTime"
                                value={currentReport.busiestTime}
                                onChange={handleChange}
                                placeholder="e.g., 14:00 - 16:00"
                                required
                              />
                              {hasError('busiestTime') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Total number of call bells over 5 min period</label>
                              <input
                                type="number"
                                className={getFieldClassName('totalCallBellsOverFiveMin', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="totalCallBellsOverFiveMin"
                                value={currentReport.totalCallBellsOverFiveMin}
                                onChange={handleChange}
                                placeholder="Enter number"
                                required
                              />
                              {hasError('totalCallBellsOverFiveMin') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Trends identified</label>
                              <textarea
                                className={getFieldClassName('trendsIdentified', "w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                name="trendsIdentified"
                                value={currentReport.trendsIdentified}
                                onChange={handleChange}
                                placeholder="Describe any patterns or trends observed..."
                                rows={4}
                                required
                              />
                              {hasError('trendsIdentified') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <h4 className="text-md font-semibold text-gray-800 mb-4">Resident Feedback (ask 3 and initial)</h4>
                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Resident 1 Feedback</label>
                                <textarea
                                  className={getFieldClassName('residentFeedback1', "w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="residentFeedback1"
                                  value={currentReport.residentFeedback1}
                                  onChange={handleChange}
                                  placeholder="Feedback from resident 1..."
                                  rows={3}
                                  required
                                />
                                {hasError('residentFeedback1') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial</label>
                                <input
                                  type="text"
                                  className={getFieldClassName('residentFeedback1Initial', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="residentFeedback1Initial"
                                  value={currentReport.residentFeedback1Initial}
                                  onChange={handleChange}
                                  placeholder="AA"
                                  maxLength={5}
                                  required
                                />
                                {hasError('residentFeedback1Initial') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Resident 2 Feedback</label>
                                <textarea
                                  className={getFieldClassName('residentFeedback2', "w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="residentFeedback2"
                                  value={currentReport.residentFeedback2}
                                  onChange={handleChange}
                                  placeholder="Feedback from resident 2..."
                                  rows={3}
                                  required
                                />
                                {hasError('residentFeedback2') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial</label>
                                <input
                                  type="text"
                                  className={getFieldClassName('residentFeedback2Initial', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="residentFeedback2Initial"
                                  value={currentReport.residentFeedback2Initial}
                                  onChange={handleChange}
                                  placeholder="BB"
                                  maxLength={5}
                                  required
                                />
                                {hasError('residentFeedback2Initial') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Resident 3 Feedback</label>
                                <textarea
                                  className={getFieldClassName('residentFeedback3', "w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="residentFeedback3"
                                  value={currentReport.residentFeedback3}
                                  onChange={handleChange}
                                  placeholder="Feedback from resident 3..."
                                  rows={3}
                                  required
                                />
                                {hasError('residentFeedback3') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial</label>
                                <input
                                  type="text"
                                  className={getFieldClassName('residentFeedback3Initial', "w-full p-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50")}
                                  name="residentFeedback3Initial"
                                  value={currentReport.residentFeedback3Initial}
                                  onChange={handleChange}
                                  placeholder="CC"
                                  maxLength={5}
                                  required
                                />
                                {hasError('residentFeedback3Initial') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Final Comments section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Final Comments</h3>
              <textarea
                name="comments"
                value={currentReport.comments}
                onChange={handleChange}
                placeholder="Any final comments or observations about this audit..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 h-32 p-3"
                required
              />
              {hasError('comments') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 font-medium disabled:opacity-50" disabled={saving}>
                {saving ? "Saving..." : "Complete Audit"}
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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