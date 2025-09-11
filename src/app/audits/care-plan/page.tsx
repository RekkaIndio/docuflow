"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';
import { saveAudit, updateAudit, markAuditCompleted, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import AuditFooter from '@/components/audit-footer';

interface CarePlanAuditData {
  home: string;
  name: string;
  personCompletingAudit: string;
  residentName: string;
  roomNumber: string;
  
  // Section 1: General Information
  personalInfoComplete: string;
  personalInfoComment: string;
  photographUpToDate: string;
  photographComment: string;
  digitalProfileComplete: string;
  digitalProfileComment: string;
  
  // Section 2: Care Plan Accessibility and Updates
  carePlanAccessible: string;
  carePlanAccessibleComment: string;
  carePlanReviewed30Days: string;
  carePlanReviewed30DaysComment: string;
  allCarePlansInPlace: string;
  allCarePlansInPlaceComment: string;
  allSectionsUpdated: string;
  allSectionsUpdatedComment: string;
  
  // Section 3: Person-Centred Content
  reflectsPersonalHistory: string;
  reflectsPersonalHistoryComment: string;
  goalsDocumented: string;
  goalsDocumentedComment: string;
  communicationNeedsDocumented: string;
  communicationNeedsDocumentedComment: string;
  endOfLifePreferences: string;
  endOfLifePreferencesComment: string;
  
  // Section 4: Risk Assessments
  keyRiskAssessments: string;
  keyRiskAssessmentsComment: string;
  riskLevelsScored: string;
  riskLevelsScoredComment: string;
  assessmentsReviewed: string;
  assessmentsReviewedComment: string;
  
  // Section 5: Daily Notes / Interactions
  dailyNotesRecorded: string;
  dailyNotesRecordedComment: string;
  entriesIncludeDetail: string;
  entriesIncludeDetailComment: string;
  logsWrittenProfessionally: string;
  logsWrittenProfessionallyComment: string;
  missedCareRecorded: string;
  missedCareRecordedComment: string;
  
  // Section 6: Charts and Monitoring
  requiredChartsCompleted: string;
  requiredChartsCompletedComment: string;
  entriesTimestamped: string;
  entriesTimestampedComment: string;
  chartDataUsed: string;
  chartDataUsedComment: string;
  alertsTriggered: string;
  alertsTriggeredComment: string;
  
  // Section 7: Medication Management
  marChartAccurate: string;
  marChartAccurateComment: string;
  medicationReviews: string;
  medicationReviewsComment: string;
  prnProtocols: string;
  prnProtocolsComment: string;
  refusalsSideEffects: string;
  refusalsSideEffectsComment: string;
  
  // Section 8: Observations and Vitals
  regularObservations: string;
  regularObservationsComment: string;
  abnormalResultsFlagged: string;
  abnormalResultsFlaggedComment: string;
  weightTrendsMonitored: string;
  weightTrendsMonitoredComment: string;
  observationsUsedClinical: string;
  observationsUsedClinicalComment: string;
  
  // Section 9: Communication and Handover
  handoverLogUpdated: string;
  handoverLogUpdatedComment: string;
  changesLogged: string;
  changesLoggedComment: string;
  professionalVisits: string;
  professionalVisitsComment: string;
  familyCommunications: string;
  familyCommunicationsComment: string;
  
  // Section 10: Safeguarding and Incident Reporting
  safeguardingConcerns: string;
  safeguardingConcernsComment: string;
  incidentsRecorded: string;
  incidentsRecordedComment: string;
  followUpsVisible: string;
  followUpsVisibleComment: string;
  actionsToReduceRisk: string;
  actionsToReduceRiskComment: string;
  
  // Section 11: Compliance and Audit Trail
  entriesTimestampedLogins: string;
  entriesTimestampedLoginsComment: string;
  auditTrailClear: string;
  auditTrailClearComment: string;
  overdueTasksFlagged: string;
  overdueTasksFlaggedComment: string;
  
  // Section 12: Consent and Legal Documentation
  consentRecorded: string;
  consentRecordedComment: string;
  dnacprFormsUploaded: string;
  dnacprFormsUploadedComment: string;
  lpaDetailsRecorded: string;
  lpaDetailsRecordedComment: string;
  mentalCapacityAssessments: string;
  mentalCapacityAssessmentsComment: string;
}

export default function CarePlanAuditPage() {
  const [currentReport, setCurrentReport] = useState(1);
  const [totalReports] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [auditData, setAuditData] = useState<CarePlanAuditData>({
    home: '',
    name: '',
    personCompletingAudit: '',
    residentName: '',
    roomNumber: '',
    
    // Section 1
    personalInfoComplete: '',
    personalInfoComment: '',
    photographUpToDate: '',
    photographComment: '',
    digitalProfileComplete: '',
    digitalProfileComment: '',
    
    // Section 2
    carePlanAccessible: '',
    carePlanAccessibleComment: '',
    carePlanReviewed30Days: '',
    carePlanReviewed30DaysComment: '',
    allCarePlansInPlace: '',
    allCarePlansInPlaceComment: '',
    allSectionsUpdated: '',
    allSectionsUpdatedComment: '',
    
    // Section 3
    reflectsPersonalHistory: '',
    reflectsPersonalHistoryComment: '',
    goalsDocumented: '',
    goalsDocumentedComment: '',
    communicationNeedsDocumented: '',
    communicationNeedsDocumentedComment: '',
    endOfLifePreferences: '',
    endOfLifePreferencesComment: '',
    
    // Section 4
    keyRiskAssessments: '',
    keyRiskAssessmentsComment: '',
    riskLevelsScored: '',
    riskLevelsScoredComment: '',
    assessmentsReviewed: '',
    assessmentsReviewedComment: '',
    
    // Section 5
    dailyNotesRecorded: '',
    dailyNotesRecordedComment: '',
    entriesIncludeDetail: '',
    entriesIncludeDetailComment: '',
    logsWrittenProfessionally: '',
    logsWrittenProfessionallyComment: '',
    missedCareRecorded: '',
    missedCareRecordedComment: '',
    
    // Section 6
    requiredChartsCompleted: '',
    requiredChartsCompletedComment: '',
    entriesTimestamped: '',
    entriesTimestampedComment: '',
    chartDataUsed: '',
    chartDataUsedComment: '',
    alertsTriggered: '',
    alertsTriggeredComment: '',
    
    // Section 7
    marChartAccurate: '',
    marChartAccurateComment: '',
    medicationReviews: '',
    medicationReviewsComment: '',
    prnProtocols: '',
    prnProtocolsComment: '',
    refusalsSideEffects: '',
    refusalsSideEffectsComment: '',
    
    // Section 8
    regularObservations: '',
    regularObservationsComment: '',
    abnormalResultsFlagged: '',
    abnormalResultsFlaggedComment: '',
    weightTrendsMonitored: '',
    weightTrendsMonitoredComment: '',
    observationsUsedClinical: '',
    observationsUsedClinicalComment: '',
    
    // Section 9
    handoverLogUpdated: '',
    handoverLogUpdatedComment: '',
    changesLogged: '',
    changesLoggedComment: '',
    professionalVisits: '',
    professionalVisitsComment: '',
    familyCommunications: '',
    familyCommunicationsComment: '',
    
    // Section 10
    safeguardingConcerns: '',
    safeguardingConcernsComment: '',
    incidentsRecorded: '',
    incidentsRecordedComment: '',
    followUpsVisible: '',
    followUpsVisibleComment: '',
    actionsToReduceRisk: '',
    actionsToReduceRiskComment: '',
    
    // Section 11
    entriesTimestampedLogins: '',
    entriesTimestampedLoginsComment: '',
    auditTrailClear: '',
    auditTrailClearComment: '',
    overdueTasksFlagged: '',
    overdueTasksFlaggedComment: '',
    
    // Section 12
    consentRecorded: '',
    consentRecordedComment: '',
    dnacprFormsUploaded: '',
    dnacprFormsUploadedComment: '',
    lpaDetailsRecorded: '',
    lpaDetailsRecordedComment: '',
    mentalCapacityAssessments: '',
    mentalCapacityAssessmentsComment: '',
  });

  // Fields used for validation and scoring
  const BASIC_REQUIRED_FIELDS: (keyof CarePlanAuditData)[] = [
    'home', 'name', 'personCompletingAudit', 'residentName', 'roomNumber'
  ];

  const YES_NO_FIELDS: (keyof CarePlanAuditData)[] = [
    'personalInfoComplete', 'photographUpToDate', 'digitalProfileComplete',
    'carePlanAccessible', 'carePlanReviewed30Days', 'allCarePlansInPlace', 'allSectionsUpdated',
    'reflectsPersonalHistory', 'goalsDocumented', 'communicationNeedsDocumented', 'endOfLifePreferences',
    'keyRiskAssessments', 'riskLevelsScored', 'assessmentsReviewed',
    'dailyNotesRecorded', 'entriesIncludeDetail', 'logsWrittenProfessionally', 'missedCareRecorded',
    'requiredChartsCompleted', 'entriesTimestamped', 'chartDataUsed', 'alertsTriggered',
    'marChartAccurate', 'medicationReviews', 'prnProtocols', 'refusalsSideEffects',
    'regularObservations', 'abnormalResultsFlagged', 'weightTrendsMonitored', 'observationsUsedClinical',
    'handoverLogUpdated', 'changesLogged', 'professionalVisits', 'familyCommunications',
    'safeguardingConcerns', 'incidentsRecorded', 'followUpsVisible', 'actionsToReduceRisk',
    'entriesTimestampedLogins', 'auditTrailClear', 'overdueTasksFlagged',
    'consentRecorded', 'dnacprFormsUploaded', 'lpaDetailsRecorded', 'mentalCapacityAssessments'
  ];

  const { user } = useAuth();
  const activeWorkspace = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');

  // Load existing audit data when component mounts
  useEffect(() => {
    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) return;
      
      try {
        const existingData = await getLatestAuditData(activeWorkspace.id, 'care-plan');
        if (existingData) {
          // Remove metadata fields and populate form
          const { id, createdAt, ...formData } = existingData;
          setAuditData(prevData => ({
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

  const handleInputChange = (field: keyof CarePlanAuditData, value: string) => {
    setAuditData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Remove error highlighting when field is filled
    if (value.trim() !== '' && errors.includes(field)) {
      setErrors(prev => prev.filter(error => error !== field));
    }
  };

  const validateForm = () => {
    const requiredFields: (keyof CarePlanAuditData)[] = [
      'home', 'name', 'personCompletingAudit', 'residentName', 'roomNumber',
      // Y/N fields for all questions
      'personalInfoComplete', 'photographUpToDate', 'digitalProfileComplete',
      'carePlanAccessible', 'carePlanReviewed30Days', 'allCarePlansInPlace', 'allSectionsUpdated',
      'reflectsPersonalHistory', 'goalsDocumented', 'communicationNeedsDocumented', 'endOfLifePreferences',
      'keyRiskAssessments', 'riskLevelsScored', 'assessmentsReviewed',
      'dailyNotesRecorded', 'entriesIncludeDetail', 'logsWrittenProfessionally', 'missedCareRecorded',
      'requiredChartsCompleted', 'entriesTimestamped', 'chartDataUsed', 'alertsTriggered',
      'marChartAccurate', 'medicationReviews', 'prnProtocols', 'refusalsSideEffects',
      'regularObservations', 'abnormalResultsFlagged', 'weightTrendsMonitored', 'observationsUsedClinical',
      'handoverLogUpdated', 'changesLogged', 'professionalVisits', 'familyCommunications',
      'safeguardingConcerns', 'incidentsRecorded', 'followUpsVisible', 'actionsToReduceRisk',
      'entriesTimestampedLogins', 'auditTrailClear', 'overdueTasksFlagged',
      'consentRecorded', 'dnacprFormsUploaded', 'lpaDetailsRecorded', 'mentalCapacityAssessments'
    ];
    
    const newErrors = requiredFields.filter(field => !auditData[field].trim());
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

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!activeWorkspace?.id) {
      alert('No workspace selected. Please choose a workspace and try again.');
      return;
    }

    setSaving(true);
    try {
      // compute score: count of 'Yes' answers among YES_NO_FIELDS
      const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (auditData[f] === 'Yes' ? 1 : 0), 0);
      const totalCount = YES_NO_FIELDS.length;
      const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;

      const payload = {
        auditType: 'care-plan',
        data: auditData,
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        // Add computed score so dashboards can surface it easily
        scorePercent,
        yesCount,
        totalCount,
      };

      const auditId = await saveAudit(payload, activeWorkspace.id);
  // mark audit completed and save snapshot (generate PDF)
  const result = await markAuditCompletedWithSnapshot(activeWorkspace.id, 'care-plan', payload, new Date().toISOString());
      try {
        // store last care-plan score under workspace settings for easy dashboard access
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        // dynamic import path above won't work in Next server/client code directly; instead use lib/firestore helper
      } catch (ignore) {
        // ignore - we prefer reading latest audit by querying audits collection on dashboard
      }

      setShowModal(false);
      alert('Care Plan audit saved successfully');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save care plan audit', e);
      alert('Failed to save audit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addNewReport = () => {
    // Reset form for new report
    setAuditData({
      home: '',
      name: '',
      personCompletingAudit: '',
      residentName: '',
      roomNumber: '',
      
      // Section 1
      personalInfoComplete: '',
      personalInfoComment: '',
      photographUpToDate: '',
      photographComment: '',
      digitalProfileComplete: '',
      digitalProfileComment: '',
      
      // Section 2
      carePlanAccessible: '',
      carePlanAccessibleComment: '',
      carePlanReviewed30Days: '',
      carePlanReviewed30DaysComment: '',
      allCarePlansInPlace: '',
      allCarePlansInPlaceComment: '',
      allSectionsUpdated: '',
      allSectionsUpdatedComment: '',
      
      // Section 3
      reflectsPersonalHistory: '',
      reflectsPersonalHistoryComment: '',
      goalsDocumented: '',
      goalsDocumentedComment: '',
      communicationNeedsDocumented: '',
      communicationNeedsDocumentedComment: '',
      endOfLifePreferences: '',
      endOfLifePreferencesComment: '',
      
      // Section 4
      keyRiskAssessments: '',
      keyRiskAssessmentsComment: '',
      riskLevelsScored: '',
      riskLevelsScoredComment: '',
      assessmentsReviewed: '',
      assessmentsReviewedComment: '',
      
      // Section 5
      dailyNotesRecorded: '',
      dailyNotesRecordedComment: '',
      entriesIncludeDetail: '',
      entriesIncludeDetailComment: '',
      logsWrittenProfessionally: '',
      logsWrittenProfessionallyComment: '',
      missedCareRecorded: '',
      missedCareRecordedComment: '',
      
      // Section 6
      requiredChartsCompleted: '',
      requiredChartsCompletedComment: '',
      entriesTimestamped: '',
      entriesTimestampedComment: '',
      chartDataUsed: '',
      chartDataUsedComment: '',
      alertsTriggered: '',
      alertsTriggeredComment: '',
      
      // Section 7
      marChartAccurate: '',
      marChartAccurateComment: '',
      medicationReviews: '',
      medicationReviewsComment: '',
      prnProtocols: '',
      prnProtocolsComment: '',
      refusalsSideEffects: '',
      refusalsSideEffectsComment: '',
      
      // Section 8
      regularObservations: '',
      regularObservationsComment: '',
      abnormalResultsFlagged: '',
      abnormalResultsFlaggedComment: '',
      weightTrendsMonitored: '',
      weightTrendsMonitoredComment: '',
      observationsUsedClinical: '',
      observationsUsedClinicalComment: '',
      
      // Section 9
      handoverLogUpdated: '',
      handoverLogUpdatedComment: '',
      changesLogged: '',
      changesLoggedComment: '',
      professionalVisits: '',
      professionalVisitsComment: '',
      familyCommunications: '',
      familyCommunicationsComment: '',
      
      // Section 10
      safeguardingConcerns: '',
      safeguardingConcernsComment: '',
      incidentsRecorded: '',
      incidentsRecordedComment: '',
      followUpsVisible: '',
      followUpsVisibleComment: '',
      actionsToReduceRisk: '',
      actionsToReduceRiskComment: '',
      
      // Section 11
      entriesTimestampedLogins: '',
      entriesTimestampedLoginsComment: '',
      auditTrailClear: '',
      auditTrailClearComment: '',
      overdueTasksFlagged: '',
      overdueTasksFlaggedComment: '',
      
      // Section 12
      consentRecorded: '',
      consentRecordedComment: '',
      dnacprFormsUploaded: '',
      dnacprFormsUploadedComment: '',
      lpaDetailsRecorded: '',
      lpaDetailsRecordedComment: '',
      mentalCapacityAssessments: '',
      mentalCapacityAssessmentsComment: '',
    });
    setErrors([]);
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
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex gap-4" data-field={yesNoField}>
          <label className="flex items-center">
            <input
              type="radio"
              name={yesNoField}
              value="Yes"
              checked={yesNoValue === 'Yes'}
              onChange={(e) => onYesNoChange(e.target.value)}
              className="mr-2"
            />
            Yes
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={yesNoField}
              value="No"
              checked={yesNoValue === 'No'}
              onChange={(e) => onYesNoChange(e.target.value)}
              className="mr-2"
            />
            No
          </label>
        </div>
        {errors.includes(yesNoField) && (
          <p className="text-red-500 text-sm mt-1">This field is required</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md flex-shrink-0">
        <div className="w-full">
          <div>
            <h1 className="text-2xl font-bold mb-1">Care Plan Audit</h1>
            <p className="text-blue-100 text-sm">Complete this audit to check care plan quality and compliance</p>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4">
          <div className="flex gap-4">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex-1">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentReport(Math.max(1, currentReport - 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={currentReport === 1}
                    >
                      ←
                    </button>
                    <span className="text-sm text-gray-600">Report {currentReport} of {totalReports}</span>
                    <button 
                      onClick={() => setCurrentReport(Math.min(totalReports, currentReport + 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={currentReport === totalReports}
                    >
                      →
                    </button>
                  </div>
                  <div>
                    <button onClick={addNewReport} className="bg-red-500 text-white p-2 rounded">+</button>
                  </div>
                </div>

                {/* Three column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Left column: Basic Info + Sections 1-4 */}
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-blue-900 mb-4">Audit Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ...existing basic info fields... */}
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            data-field="name"
                            value={auditData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('name') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter name"
                          />
                          {errors.includes('name') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name of Resident</label>
                          <input
                            type="text"
                            data-field="residentName"
                            value={auditData.residentName}
                            onChange={(e) => handleInputChange('residentName', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('residentName') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter resident name"
                          />
                          {errors.includes('residentName') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                          <input
                            type="text"
                            data-field="roomNumber"
                            value={auditData.roomNumber}
                            onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                            className={`w-full p-2 border rounded-md ${errors.includes('roomNumber') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            placeholder="Enter room number"
                          />
                          {errors.includes('roomNumber') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                        </div>
                      </div>
                    </div>

                    {/* Section 1 */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-green-900 mb-4">1. General Information</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Is the resident's personal information complete (name, DOB, NHS number, GP, next of kin)?"
                          yesNoField="personalInfoComplete"
                          commentField="personalInfoComment"
                          yesNoValue={auditData.personalInfoComplete}
                          commentValue={auditData.personalInfoComment}
                          onYesNoChange={(value) => handleInputChange('personalInfoComplete', value)}
                          onCommentChange={(value) => handleInputChange('personalInfoComment', value)}
                        />
                        <YesNoQuestion
                          label="Is the resident's photograph uploaded and up to date?"
                          yesNoField="photographUpToDate"
                          commentField="photographComment"
                          yesNoValue={auditData.photographUpToDate}
                          commentValue={auditData.photographComment}
                          onYesNoChange={(value) => handleInputChange('photographUpToDate', value)}
                          onCommentChange={(value) => handleInputChange('photographComment', value)}
                        />
                        <YesNoQuestion
                          label="Is the digital profile page easy to navigate and all sections completed?"
                          yesNoField="digitalProfileComplete"
                          commentField="digitalProfileComment"
                          yesNoValue={auditData.digitalProfileComplete}
                          commentValue={auditData.digitalProfileComment}
                          onYesNoChange={(value) => handleInputChange('digitalProfileComplete', value)}
                          onCommentChange={(value) => handleInputChange('digitalProfileComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 2 */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-purple-900 mb-4">2. Care Plan Accessibility and Updates</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Is the care plan easily accessible to all relevant staff?"
                          yesNoField="carePlanAccessible"
                          commentField="carePlanAccessibleComment"
                          yesNoValue={auditData.carePlanAccessible}
                          commentValue={auditData.carePlanAccessibleComment}
                          onYesNoChange={(value) => handleInputChange('carePlanAccessible', value)}
                          onCommentChange={(value) => handleInputChange('carePlanAccessibleComment', value)}
                        />
                        <YesNoQuestion
                          label="Has the care plan been reviewed within the last 30 days?"
                          yesNoField="carePlanReviewed30Days"
                          commentField="carePlanReviewed30DaysComment"
                          yesNoValue={auditData.carePlanReviewed30Days}
                          commentValue={auditData.carePlanReviewed30DaysComment}
                          onYesNoChange={(value) => handleInputChange('carePlanReviewed30Days', value)}
                          onCommentChange={(value) => handleInputChange('carePlanReviewed30DaysComment', value)}
                        />
                        <YesNoQuestion
                          label="Are all care plans in place including specific needs care plans?"
                          yesNoField="allCarePlansInPlace"
                          commentField="allCarePlansInPlaceComment"
                          yesNoValue={auditData.allCarePlansInPlace}
                          commentValue={auditData.allCarePlansInPlaceComment}
                          onYesNoChange={(value) => handleInputChange('allCarePlansInPlace', value)}
                          onCommentChange={(value) => handleInputChange('allCarePlansInPlaceComment', value)}
                        />
                        <YesNoQuestion
                          label="Are all sections of the care plan (e.g. mobility, nutrition, medication) updated as needed?"
                          yesNoField="allSectionsUpdated"
                          commentField="allSectionsUpdatedComment"
                          yesNoValue={auditData.allSectionsUpdated}
                          commentValue={auditData.allSectionsUpdatedComment}
                          onYesNoChange={(value) => handleInputChange('allSectionsUpdated', value)}
                          onCommentChange={(value) => handleInputChange('allSectionsUpdatedComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 3 */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-orange-900 mb-4">3. Person-Centred Content</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Does the care plan reflect the resident's personal history, preferences, and routines?"
                          yesNoField="reflectsPersonalHistory"
                          commentField="reflectsPersonalHistoryComment"
                          yesNoValue={auditData.reflectsPersonalHistory}
                          commentValue={auditData.reflectsPersonalHistoryComment}
                          onYesNoChange={(value) => handleInputChange('reflectsPersonalHistory', value)}
                          onCommentChange={(value) => handleInputChange('reflectsPersonalHistoryComment', value)}
                        />
                        <YesNoQuestion
                          label="Are goals and outcomes clearly documented and tailored to the individual?"
                          yesNoField="goalsDocumented"
                          commentField="goalsDocumentedComment"
                          yesNoValue={auditData.goalsDocumented}
                          commentValue={auditData.goalsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('goalsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('goalsDocumentedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are communication needs (e.g. dementia, hearing/visual impairment) clearly documented?"
                          yesNoField="communicationNeedsDocumented"
                          commentField="communicationNeedsDocumentedComment"
                          yesNoValue={auditData.communicationNeedsDocumented}
                          commentValue={auditData.communicationNeedsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('communicationNeedsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('communicationNeedsDocumentedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are preferences for end-of-life care recorded and accessible (if applicable)?"
                          yesNoField="endOfLifePreferences"
                          commentField="endOfLifePreferencesComment"
                          yesNoValue={auditData.endOfLifePreferences}
                          commentValue={auditData.endOfLifePreferencesComment}
                          onYesNoChange={(value) => handleInputChange('endOfLifePreferences', value)}
                          onCommentChange={(value) => handleInputChange('endOfLifePreferencesComment', value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle column: Sections 5-8 */}
                  <div className="space-y-6">
                    {/* Section 5 */}
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-indigo-900 mb-4">5. Daily Notes / Interactions</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Are daily notes recorded consistently for all shifts?"
                          yesNoField="dailyNotesRecorded"
                          commentField="dailyNotesRecordedComment"
                          yesNoValue={auditData.dailyNotesRecorded}
                          commentValue={auditData.dailyNotesRecordedComment}
                          onYesNoChange={(value) => handleInputChange('dailyNotesRecorded', value)}
                          onCommentChange={(value) => handleInputChange('dailyNotesRecordedComment', value)}
                        />
                        <YesNoQuestion
                          label="Do entries include appropriate detail on care delivered, mood, wellbeing, and changes?"
                          yesNoField="entriesIncludeDetail"
                          commentField="entriesIncludeDetailComment"
                          yesNoValue={auditData.entriesIncludeDetail}
                          commentValue={auditData.entriesIncludeDetailComment}
                          onYesNoChange={(value) => handleInputChange('entriesIncludeDetail', value)}
                          onCommentChange={(value) => handleInputChange('entriesIncludeDetailComment', value)}
                        />
                        <YesNoQuestion
                          label="Are logs written in a professional, objective, and person-centred manner?"
                          yesNoField="logsWrittenProfessionally"
                          commentField="logsWrittenProfessionallyComment"
                          yesNoValue={auditData.logsWrittenProfessionally}
                          commentValue={auditData.logsWrittenProfessionallyComment}
                          onYesNoChange={(value) => handleInputChange('logsWrittenProfessionally', value)}
                          onCommentChange={(value) => handleInputChange('logsWrittenProfessionallyComment', value)}
                        />
                        <YesNoQuestion
                          label="Are missed care or refusals clearly recorded and followed up?"
                          yesNoField="missedCareRecorded"
                          commentField="missedCareRecordedComment"
                          yesNoValue={auditData.missedCareRecorded}
                          commentValue={auditData.missedCareRecordedComment}
                          onYesNoChange={(value) => handleInputChange('missedCareRecorded', value)}
                          onCommentChange={(value) => handleInputChange('missedCareRecordedComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 6 */}
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-teal-900 mb-4">6. Charts and Monitoring</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Are required charts (fluid intake, food, repositioning, bowel, behaviour) completed daily?"
                          yesNoField="requiredChartsCompleted"
                          commentField="requiredChartsCompletedComment"
                          yesNoValue={auditData.requiredChartsCompleted}
                          commentValue={auditData.requiredChartsCompletedComment}
                          onYesNoChange={(value) => handleInputChange('requiredChartsCompleted', value)}
                          onCommentChange={(value) => handleInputChange('requiredChartsCompletedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are all entries timestamped and linked to the correct staff member?"
                          yesNoField="entriesTimestamped"
                          commentField="entriesTimestampedComment"
                          yesNoValue={auditData.entriesTimestamped}
                          commentValue={auditData.entriesTimestampedComment}
                          onYesNoChange={(value) => handleInputChange('entriesTimestamped', value)}
                          onCommentChange={(value) => handleInputChange('entriesTimestampedComment', value)}
                        />
                        <YesNoQuestion
                          label="Is chart data used to inform care plan updates (e.g. poor intake → GP referral)?"
                          yesNoField="chartDataUsed"
                          commentField="chartDataUsedComment"
                          yesNoValue={auditData.chartDataUsed}
                          commentValue={auditData.chartDataUsedComment}
                          onYesNoChange={(value) => handleInputChange('chartDataUsed', value)}
                          onCommentChange={(value) => handleInputChange('chartDataUsedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are alerts or flags triggered appropriately by abnormal chart entries?"
                          yesNoField="alertsTriggered"
                          commentField="alertsTriggeredComment"
                          yesNoValue={auditData.alertsTriggered}
                          commentValue={auditData.alertsTriggeredComment}
                          onYesNoChange={(value) => handleInputChange('alertsTriggered', value)}
                          onCommentChange={(value) => handleInputChange('alertsTriggeredComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 7 */}
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-pink-900 mb-4">7. Medication Management (If Integrated)</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Is the MAR chart accurate and up to date?"
                          yesNoField="marChartAccurate"
                          commentField="marChartAccurateComment"
                          yesNoValue={auditData.marChartAccurate}
                          commentValue={auditData.marChartAccurateComment}
                          onYesNoChange={(value) => handleInputChange('marChartAccurate', value)}
                          onCommentChange={(value) => handleInputChange('marChartAccurateComment', value)}
                        />
                        <YesNoQuestion
                          label="Are medication reviews documented (e.g. GP/pharmacy reviews)?"
                          yesNoField="medicationReviews"
                          commentField="medicationReviewsComment"
                          yesNoValue={auditData.medicationReviews}
                          commentValue={auditData.medicationReviewsComment}
                          onYesNoChange={(value) => handleInputChange('medicationReviews', value)}
                          onCommentChange={(value) => handleInputChange('medicationReviewsComment', value)}
                        />
                        <YesNoQuestion
                          label="Are PRN protocols uploaded and accessible?"
                          yesNoField="prnProtocols"
                          commentField="prnProtocolsComment"
                          yesNoValue={auditData.prnProtocols}
                          commentValue={auditData.prnProtocolsComment}
                          onYesNoChange={(value) => handleInputChange('prnProtocols', value)}
                          onCommentChange={(value) => handleInputChange('prnProtocolsComment', value)}
                        />
                        <YesNoQuestion
                          label="Are refusals or side effects recorded and escalated appropriately?"
                          yesNoField="refusalsSideEffects"
                          commentField="refusalsSideEffectsComment"
                          yesNoValue={auditData.refusalsSideEffects}
                          commentValue={auditData.refusalsSideEffectsComment}
                          onYesNoChange={(value) => handleInputChange('refusalsSideEffects', value)}
                          onCommentChange={(value) => handleInputChange('refusalsSideEffectsComment', value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right column: Sections 9-12 + Final Comments & Submit */}
                  <div className="space-y-6">
                    {/* Section 9 */}
                    <div className="bg-lime-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-lime-900 mb-4">9. Communication and Handover</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Is the handover log updated for this resident?"
                          yesNoField="handoverLogUpdated"
                          commentField="handoverLogUpdatedComment"
                          yesNoValue={auditData.handoverLogUpdated}
                          commentValue={auditData.handoverLogUpdatedComment}
                          onYesNoChange={(value) => handleInputChange('handoverLogUpdated', value)}
                          onCommentChange={(value) => handleInputChange('handoverLogUpdatedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are changes in condition or incidents logged and communicated clearly?"
                          yesNoField="changesLogged"
                          commentField="changesLoggedComment"
                          yesNoValue={auditData.changesLogged}
                          commentValue={auditData.changesLoggedComment}
                          onYesNoChange={(value) => handleInputChange('changesLogged', value)}
                          onCommentChange={(value) => handleInputChange('changesLoggedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are professional visits recorded (GP, district nurse, SALT, physio)?"
                          yesNoField="professionalVisits"
                          commentField="professionalVisitsComment"
                          yesNoValue={auditData.professionalVisits}
                          commentValue={auditData.professionalVisitsComment}
                          onYesNoChange={(value) => handleInputChange('professionalVisits', value)}
                          onCommentChange={(value) => handleInputChange('professionalVisitsComment', value)}
                        />
                        <YesNoQuestion
                          label="Are family communications recorded in the appropriate section?"
                          yesNoField="familyCommunications"
                          commentField="familyCommunicationsComment"
                          yesNoValue={auditData.familyCommunications}
                          commentValue={auditData.familyCommunicationsComment}
                          onYesNoChange={(value) => handleInputChange('familyCommunications', value)}
                          onCommentChange={(value) => handleInputChange('familyCommunicationsComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 10 */}
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-amber-900 mb-4">10. Safeguarding and Incident Reporting</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Are any safeguarding concerns documented and actioned?"
                          yesNoField="safeguardingConcerns"
                          commentField="safeguardingConcernsComment"
                          yesNoValue={auditData.safeguardingConcerns}
                          commentValue={auditData.safeguardingConcernsComment}
                          onYesNoChange={(value) => handleInputChange('safeguardingConcerns', value)}
                          onCommentChange={(value) => handleInputChange('safeguardingConcernsComment', value)}
                        />
                        <YesNoQuestion
                          label="Are incidents (falls, bruising, aggression, refusal of care) recorded promptly?"
                          yesNoField="incidentsRecorded"
                          commentField="incidentsRecordedComment"
                          yesNoValue={auditData.incidentsRecorded}
                          commentValue={auditData.incidentsRecordedComment}
                          onYesNoChange={(value) => handleInputChange('incidentsRecorded', value)}
                          onCommentChange={(value) => handleInputChange('incidentsRecordedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are follow-ups and investigations visible within the system?"
                          yesNoField="followUpsVisible"
                          commentField="followUpsVisibleComment"
                          yesNoValue={auditData.followUpsVisible}
                          commentValue={auditData.followUpsVisibleComment}
                          onYesNoChange={(value) => handleInputChange('followUpsVisible', value)}
                          onCommentChange={(value) => handleInputChange('followUpsVisibleComment', value)}
                        />
                        <YesNoQuestion
                          label="Is there evidence of actions taken to reduce further risk?"
                          yesNoField="actionsToReduceRisk"
                          commentField="actionsToReduceRiskComment"
                          yesNoValue={auditData.actionsToReduceRisk}
                          commentValue={auditData.actionsToReduceRiskComment}
                          onYesNoChange={(value) => handleInputChange('actionsToReduceRisk', value)}
                          onCommentChange={(value) => handleInputChange('actionsToReduceRiskComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 11 */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-slate-900 mb-4">11. Compliance and Audit Trail</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Are entries timestamped and linked to individual user logins?"
                          yesNoField="entriesTimestampedLogins"
                          commentField="entriesTimestampedLoginsComment"
                          yesNoValue={auditData.entriesTimestampedLogins}
                          commentValue={auditData.entriesTimestampedLoginsComment}
                          onYesNoChange={(value) => handleInputChange('entriesTimestampedLogins', value)}
                          onCommentChange={(value) => handleInputChange('entriesTimestampedLoginsComment', value)}
                        />
                        <YesNoQuestion
                          label="Is there a clear audit trail for changes to the care plan?"
                          yesNoField="auditTrailClear"
                          commentField="auditTrailClearComment"
                          yesNoValue={auditData.auditTrailClear}
                          commentValue={auditData.auditTrailClearComment}
                          onYesNoChange={(value) => handleInputChange('auditTrailClear', value)}
                          onCommentChange={(value) => handleInputChange('auditTrailClearComment', value)}
                        />
                        <YesNoQuestion
                          label="Are overdue reviews or incomplete tasks flagged within the system?"
                          yesNoField="overdueTasksFlagged"
                          commentField="overdueTasksFlaggedComment"
                          yesNoValue={auditData.overdueTasksFlagged}
                          commentValue={auditData.overdueTasksFlaggedComment}
                          onYesNoChange={(value) => handleInputChange('overdueTasksFlagged', value)}
                          onCommentChange={(value) => handleInputChange('overdueTasksFlaggedComment', value)}
                        />
                      </div>
                    </div>

                    {/* Section 12 */}
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold text-emerald-900 mb-4">12. Consent and Legal Documentation</h2>
                      <div className="space-y-6">
                        <YesNoQuestion
                          label="Is consent for care and data sharing recorded?"
                          yesNoField="consentRecorded"
                          commentField="consentRecordedComment"
                          yesNoValue={auditData.consentRecorded}
                          commentValue={auditData.consentRecordedComment}
                          onYesNoChange={(value) => handleInputChange('consentRecorded', value)}
                          onCommentChange={(value) => handleInputChange('consentRecordedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are DNACPR/TEP/Respect forms uploaded and current (if applicable)?"
                          yesNoField="dnacprFormsUploaded"
                          commentField="dnacprFormsUploadedComment"
                          yesNoValue={auditData.dnacprFormsUploaded}
                          commentValue={auditData.dnacprFormsUploadedComment}
                          onYesNoChange={(value) => handleInputChange('dnacprFormsUploaded', value)}
                          onCommentChange={(value) => handleInputChange('dnacprFormsUploadedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are Lasting Power of Attorney (LPA) details recorded and accessible?"
                          yesNoField="lpaDetailsRecorded"
                          commentField="lpaDetailsRecordedComment"
                          yesNoValue={auditData.lpaDetailsRecorded}
                          commentValue={auditData.lpaDetailsRecordedComment}
                          onYesNoChange={(value) => handleInputChange('lpaDetailsRecorded', value)}
                          onCommentChange={(value) => handleInputChange('lpaDetailsRecordedComment', value)}
                        />
                        <YesNoQuestion
                          label="Are mental capacity assessments documented where necessary?"
                          yesNoField="mentalCapacityAssessments"
                          commentField="mentalCapacityAssessmentsComment"
                          yesNoValue={auditData.mentalCapacityAssessments}
                          commentValue={auditData.mentalCapacityAssessmentsComment}
                          onYesNoChange={(value) => handleInputChange('mentalCapacityAssessments', value)}
                          onCommentChange={(value) => handleInputChange('mentalCapacityAssessmentsComment', value)}
                        />
                      </div>
                    </div>

                    {/* Final Comments + Submit (AuditFooter) */}
                    <div>
                      <AuditFooter finalComments={finalComments} setFinalComments={setFinalComments} saving={saving} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Audit Completed</h3>
            <p className="text-gray-600 mb-6">
              Would you like to create an action plan based on this audit?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleModalCreate(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                No, thanks
              </button>
              <button
                onClick={() => handleModalCreate(true)}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create Action Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

