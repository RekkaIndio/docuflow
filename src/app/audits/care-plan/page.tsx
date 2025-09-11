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
  nokDetailsAvailable: string;
  nokDetailsComment: string;
  profileEasyNavigate: string;
  profileEasyNavigateComment: string;
  allergiesDocumented: string;
  allergiesDocumentedComment: string;
  preadmissionAssessmentAvailable: string;
  preadmissionAssessmentComment: string;
  
  // Section 2: Care Plan Accessibility and Updates
  currentInitialAssessmentsComplete: string;
  currentInitialAssessmentsComment: string;
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
  keyRiskAssessmentsCompleted: string;
  keyRiskAssessmentsCompletedComment: string;
  riskLevelsScored: string;
  riskLevelsScoredComment: string;
  assessmentsReviewedLinked: string;
  assessmentsReviewedLinkedComment: string;
  
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
  entriesTimestampedStaff: string;
  entriesTimestampedStaffComment: string;
  chartDataUsedInform: string;
  chartDataUsedInformComment: string;
  alertsTriggeredAppropriately: string;
  alertsTriggeredAppropriatelyComment: string;
  
  // Section 7: Medication Management
  marChartAccurate: string;
  marChartAccurateComment: string;
  medicationReviewsDocumented: string;
  medicationReviewsDocumentedComment: string;
  prnProtocolsUploaded: string;
  prnProtocolsUploadedComment: string;
  refusalsSideEffectsRecorded: string;
  refusalsSideEffectsRecordedComment: string;
  
  // Section 8: Observations and Vitals
  regularObservationsRecorded: string;
  regularObservationsRecordedComment: string;
  abnormalResultsFlagged: string;
  abnormalResultsFlaggedComment: string;
  weightTrendsMonitored: string;
  weightTrendsMonitoredComment: string;
  observationsUsedClinicalDecisions: string;
  observationsUsedClinicalDecisionsComment: string;
  
  // Section 9: Communication and Handover
  handoverLogUpdated: string;
  handoverLogUpdatedComment: string;
  changesConditionLogged: string;
  changesConditionLoggedComment: string;
  professionalVisitsRecorded: string;
  professionalVisitsRecordedComment: string;
  familyCommunicationsRecorded: string;
  familyCommunicationsRecordedComment: string;
  
  // Section 10: Safeguarding and Incident Reporting
  safeguardingConcernsDocumented: string;
  safeguardingConcernsDocumentedComment: string;
  incidentsRecordedPromptly: string;
  incidentsRecordedPromptlyComment: string;
  followUpsInvestigationsVisible: string;
  followUpsInvestigationsVisibleComment: string;
  actionsReduceRiskEvidence: string;
  actionsReduceRiskEvidenceComment: string;
  
  // Section 11: Compliance and Audit Trail
  entriesTimestampedUserLogins: string;
  entriesTimestampedUserLoginsComment: string;
  auditTrailCarePlanChanges: string;
  auditTrailCarePlanChangesComment: string;
  overdueReviewsTasksFlagged: string;
  overdueReviewsTasksFlaggedComment: string;
  
  // Section 12: Consent and Legal Documentation
  consentCareDataSharingRecorded: string;
  consentCareDataSharingRecordedComment: string;
  dnacprTepRespectFormsCurrent: string;
  dnacprTepRespectFormsCurrentComment: string;
  lpaDetailsRecordedAccessible: string;
  lpaDetailsRecordedAccessibleComment: string;
  mentalCapacityAssessmentsDocumented: string;
  mentalCapacityAssessmentsDocumentedComment: string;
}

export default function CarePlanAuditPage() {
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
    nokDetailsAvailable: '',
    nokDetailsComment: '',
    profileEasyNavigate: '',
    profileEasyNavigateComment: '',
    allergiesDocumented: '',
    allergiesDocumentedComment: '',
    preadmissionAssessmentAvailable: '',
    preadmissionAssessmentComment: '',
    
    // Section 2
    currentInitialAssessmentsComplete: '',
    currentInitialAssessmentsComment: '',
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
    keyRiskAssessmentsCompleted: '',
    keyRiskAssessmentsCompletedComment: '',
    riskLevelsScored: '',
    riskLevelsScoredComment: '',
    assessmentsReviewedLinked: '',
    assessmentsReviewedLinkedComment: '',
    
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
    entriesTimestampedStaff: '',
    entriesTimestampedStaffComment: '',
    chartDataUsedInform: '',
    chartDataUsedInformComment: '',
    alertsTriggeredAppropriately: '',
    alertsTriggeredAppropriatelyComment: '',
    
    // Section 7
    marChartAccurate: '',
    marChartAccurateComment: '',
    medicationReviewsDocumented: '',
    medicationReviewsDocumentedComment: '',
    prnProtocolsUploaded: '',
    prnProtocolsUploadedComment: '',
    refusalsSideEffectsRecorded: '',
    refusalsSideEffectsRecordedComment: '',
    
    // Section 8
    regularObservationsRecorded: '',
    regularObservationsRecordedComment: '',
    abnormalResultsFlagged: '',
    abnormalResultsFlaggedComment: '',
    weightTrendsMonitored: '',
    weightTrendsMonitoredComment: '',
    observationsUsedClinicalDecisions: '',
    observationsUsedClinicalDecisionsComment: '',
    
    // Section 9
    handoverLogUpdated: '',
    handoverLogUpdatedComment: '',
    changesConditionLogged: '',
    changesConditionLoggedComment: '',
    professionalVisitsRecorded: '',
    professionalVisitsRecordedComment: '',
    familyCommunicationsRecorded: '',
    familyCommunicationsRecordedComment: '',
    
    // Section 10
    safeguardingConcernsDocumented: '',
    safeguardingConcernsDocumentedComment: '',
    incidentsRecordedPromptly: '',
    incidentsRecordedPromptlyComment: '',
    followUpsInvestigationsVisible: '',
    followUpsInvestigationsVisibleComment: '',
    actionsReduceRiskEvidence: '',
    actionsReduceRiskEvidenceComment: '',
    
    // Section 11
    entriesTimestampedUserLogins: '',
    entriesTimestampedUserLoginsComment: '',
    auditTrailCarePlanChanges: '',
    auditTrailCarePlanChangesComment: '',
    overdueReviewsTasksFlagged: '',
    overdueReviewsTasksFlaggedComment: '',
    
    // Section 12
    consentCareDataSharingRecorded: '',
    consentCareDataSharingRecordedComment: '',
    dnacprTepRespectFormsCurrent: '',
    dnacprTepRespectFormsCurrentComment: '',
    lpaDetailsRecordedAccessible: '',
    lpaDetailsRecordedAccessibleComment: '',
    mentalCapacityAssessmentsDocumented: '',
    mentalCapacityAssessmentsDocumentedComment: '',
  });

  // Fields used for validation and scoring
  const BASIC_REQUIRED_FIELDS: (keyof CarePlanAuditData)[] = [
    'home', 'name', 'personCompletingAudit', 'residentName', 'roomNumber'
  ];

  const YES_NO_FIELDS: (keyof CarePlanAuditData)[] = [
    'personalInfoComplete', 'photographUpToDate', 'nokDetailsAvailable', 'profileEasyNavigate', 'allergiesDocumented', 'preadmissionAssessmentAvailable',
    'currentInitialAssessmentsComplete', 'carePlanAccessible', 'carePlanReviewed30Days', 'allCarePlansInPlace', 'allSectionsUpdated',
    'reflectsPersonalHistory', 'goalsDocumented', 'communicationNeedsDocumented', 'endOfLifePreferences',
    'keyRiskAssessmentsCompleted', 'riskLevelsScored', 'assessmentsReviewedLinked',
    'dailyNotesRecorded', 'entriesIncludeDetail', 'logsWrittenProfessionally', 'missedCareRecorded',
    'requiredChartsCompleted', 'entriesTimestampedStaff', 'chartDataUsedInform', 'alertsTriggeredAppropriately',
    'marChartAccurate', 'medicationReviewsDocumented', 'prnProtocolsUploaded', 'refusalsSideEffectsRecorded',
    'regularObservationsRecorded', 'abnormalResultsFlagged', 'weightTrendsMonitored', 'observationsUsedClinicalDecisions',
    'handoverLogUpdated', 'changesConditionLogged', 'professionalVisitsRecorded', 'familyCommunicationsRecorded',
    'safeguardingConcernsDocumented', 'incidentsRecordedPromptly', 'followUpsInvestigationsVisible', 'actionsReduceRiskEvidence',
    'entriesTimestampedUserLogins', 'auditTrailCarePlanChanges', 'overdueReviewsTasksFlagged',
    'consentCareDataSharingRecorded', 'dnacprTepRespectFormsCurrent', 'lpaDetailsRecordedAccessible', 'mentalCapacityAssessmentsDocumented'
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
      'personalInfoComplete', 'photographUpToDate', 'nokDetailsAvailable', 'profileEasyNavigate', 'allergiesDocumented', 'preadmissionAssessmentAvailable',
      'currentInitialAssessmentsComplete', 'carePlanAccessible', 'carePlanReviewed30Days', 'allCarePlansInPlace', 'allSectionsUpdated',
      'reflectsPersonalHistory', 'goalsDocumented', 'communicationNeedsDocumented', 'endOfLifePreferences',
      'keyRiskAssessmentsCompleted', 'riskLevelsScored', 'assessmentsReviewedLinked',
      'dailyNotesRecorded', 'entriesIncludeDetail', 'logsWrittenProfessionally', 'missedCareRecorded',
      'requiredChartsCompleted', 'entriesTimestampedStaff', 'chartDataUsedInform', 'alertsTriggeredAppropriately',
      'marChartAccurate', 'medicationReviewsDocumented', 'prnProtocolsUploaded', 'refusalsSideEffectsRecorded',
      'regularObservationsRecorded', 'abnormalResultsFlagged', 'weightTrendsMonitored', 'observationsUsedClinicalDecisions',
      'handoverLogUpdated', 'changesConditionLogged', 'professionalVisitsRecorded', 'familyCommunicationsRecorded',
      'safeguardingConcernsDocumented', 'incidentsRecordedPromptly', 'followUpsInvestigationsVisible', 'actionsReduceRiskEvidence',
      'entriesTimestampedUserLogins', 'auditTrailCarePlanChanges', 'overdueReviewsTasksFlagged',
      'consentCareDataSharingRecorded', 'dnacprTepRespectFormsCurrent', 'lpaDetailsRecordedAccessible', 'mentalCapacityAssessmentsDocumented'
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
      nokDetailsAvailable: '',
      nokDetailsComment: '',
      profileEasyNavigate: '',
      profileEasyNavigateComment: '',
      allergiesDocumented: '',
      allergiesDocumentedComment: '',
      preadmissionAssessmentAvailable: '',
      preadmissionAssessmentComment: '',
      
      // Section 2
      currentInitialAssessmentsComplete: '',
      currentInitialAssessmentsComment: '',
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
      keyRiskAssessmentsCompleted: '',
      keyRiskAssessmentsCompletedComment: '',
      riskLevelsScored: '',
      riskLevelsScoredComment: '',
      assessmentsReviewedLinked: '',
      assessmentsReviewedLinkedComment: '',
      
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
      entriesTimestampedStaff: '',
      entriesTimestampedStaffComment: '',
      chartDataUsedInform: '',
      chartDataUsedInformComment: '',
      alertsTriggeredAppropriately: '',
      alertsTriggeredAppropriatelyComment: '',
      
      // Section 7
      marChartAccurate: '',
      marChartAccurateComment: '',
      medicationReviewsDocumented: '',
      medicationReviewsDocumentedComment: '',
      prnProtocolsUploaded: '',
      prnProtocolsUploadedComment: '',
      refusalsSideEffectsRecorded: '',
      refusalsSideEffectsRecordedComment: '',
      
      // Section 8
      regularObservationsRecorded: '',
      regularObservationsRecordedComment: '',
      abnormalResultsFlagged: '',
      abnormalResultsFlaggedComment: '',
      weightTrendsMonitored: '',
      weightTrendsMonitoredComment: '',
      observationsUsedClinicalDecisions: '',
      observationsUsedClinicalDecisionsComment: '',
      
      // Section 9
      handoverLogUpdated: '',
      handoverLogUpdatedComment: '',
      changesConditionLogged: '',
      changesConditionLoggedComment: '',
      professionalVisitsRecorded: '',
      professionalVisitsRecordedComment: '',
      familyCommunicationsRecorded: '',
      familyCommunicationsRecordedComment: '',
      
      // Section 10
      safeguardingConcernsDocumented: '',
      safeguardingConcernsDocumentedComment: '',
      incidentsRecordedPromptly: '',
      incidentsRecordedPromptlyComment: '',
      followUpsInvestigationsVisible: '',
      followUpsInvestigationsVisibleComment: '',
      actionsReduceRiskEvidence: '',
      actionsReduceRiskEvidenceComment: '',
      
      // Section 11
      entriesTimestampedUserLogins: '',
      entriesTimestampedUserLoginsComment: '',
      auditTrailCarePlanChanges: '',
      auditTrailCarePlanChangesComment: '',
      overdueReviewsTasksFlagged: '',
      overdueReviewsTasksFlaggedComment: '',
      
      // Section 12
      consentCareDataSharingRecorded: '',
      consentCareDataSharingRecordedComment: '',
      dnacprTepRespectFormsCurrent: '',
      dnacprTepRespectFormsCurrentComment: '',
      lpaDetailsRecordedAccessible: '',
      lpaDetailsRecordedAccessibleComment: '',
      mentalCapacityAssessmentsDocumented: '',
      mentalCapacityAssessmentsDocumentedComment: '',
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
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
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
          {errors.includes(yesNoField) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <textarea
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            rows={2}
            placeholder="Add any comments or observations..."
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight">Care Plan Audit</h2>
              <div className="text-slate-200 text-base leading-relaxed">Complete this comprehensive audit to check care plan quality and compliance</div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4">
              <p className="text-slate-200">Current month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p className="text-slate-200">Audit Type: Care Plan Review</p>
              <div className="flex justify-end mt-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  12 Sections
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-6">
          <div className="space-y-6">
            {/* Audit Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Audit Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home</label>
                  <input
                    type="text"
                    data-field="home"
                    value={auditData.home}
                    onChange={(e) => handleInputChange('home', e.target.value)}
                    className={`w-full p-3 border rounded-lg transition-colors ${errors.includes('home') ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
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
                    className={`w-full p-3 border rounded-lg transition-colors ${errors.includes('name') ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
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
                    className={`w-full p-3 border rounded-lg transition-colors ${errors.includes('personCompletingAudit') ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
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
                    className={`w-full p-3 border rounded-lg transition-colors ${errors.includes('residentName') ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
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
                    className={`w-full p-3 border rounded-lg transition-colors ${errors.includes('roomNumber') ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                    placeholder="Enter room number"
                  />
                  {errors.includes('roomNumber') && <p className="text-red-500 text-sm mt-1">This field is required</p>}
                </div>
              </div>
            </div>

            {/* Audit Sections - Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section 1 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-green-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">1. General Information</h3>
                    <p className="text-sm text-gray-600">Basic resident and audit information</p>
                  </div>
                </div>
                <div className="space-y-4">
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
                    label="Are the NOK details readily available?"
                    yesNoField="nokDetailsAvailable"
                    commentField="nokDetailsComment"
                    yesNoValue={auditData.nokDetailsAvailable}
                    commentValue={auditData.nokDetailsComment}
                    onYesNoChange={(value) => handleInputChange('nokDetailsAvailable', value)}
                    onCommentChange={(value) => handleInputChange('nokDetailsComment', value)}
                  />
                  <YesNoQuestion
                    label="Is the profile page easy to navigate and all sections completed?"
                    yesNoField="profileEasyNavigate"
                    commentField="profileEasyNavigateComment"
                    yesNoValue={auditData.profileEasyNavigate}
                    commentValue={auditData.profileEasyNavigateComment}
                    onYesNoChange={(value) => handleInputChange('profileEasyNavigate', value)}
                    onCommentChange={(value) => handleInputChange('profileEasyNavigateComment', value)}
                  />
                  <YesNoQuestion
                    label="Are allergies documented?"
                    yesNoField="allergiesDocumented"
                    commentField="allergiesDocumentedComment"
                    yesNoValue={auditData.allergiesDocumented}
                    commentValue={auditData.allergiesDocumentedComment}
                    onYesNoChange={(value) => handleInputChange('allergiesDocumented', value)}
                    onCommentChange={(value) => handleInputChange('allergiesDocumentedComment', value)}
                  />
                  <YesNoQuestion
                    label="Is the preadmission assessment readily available?"
                    yesNoField="preadmissionAssessmentAvailable"
                    commentField="preadmissionAssessmentComment"
                    yesNoValue={auditData.preadmissionAssessmentAvailable}
                    commentValue={auditData.preadmissionAssessmentComment}
                    onYesNoChange={(value) => handleInputChange('preadmissionAssessmentAvailable', value)}
                    onCommentChange={(value) => handleInputChange('preadmissionAssessmentComment', value)}
                  />
                </div>
              </div>

              {/* Section 2 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-purple-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">2. Care Plan Accessibility and Updates</h3>
                    <p className="text-sm text-gray-600">Review care plan availability and maintenance</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Are current and initial assessments complete?"
                    yesNoField="currentInitialAssessmentsComplete"
                    commentField="currentInitialAssessmentsComment"
                    yesNoValue={auditData.currentInitialAssessmentsComplete}
                    commentValue={auditData.currentInitialAssessmentsComment}
                    onYesNoChange={(value) => handleInputChange('currentInitialAssessmentsComplete', value)}
                    onCommentChange={(value) => handleInputChange('currentInitialAssessmentsComment', value)}
                  />
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
                    label="Are all sections of the care plan updated as needed?"
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-orange-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">3. Person-Centred Content</h3>
                    <p className="text-sm text-gray-600">Individual preferences and care planning</p>
                  </div>
                </div>
                <div className="space-y-4">
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
                    label="Are communication needs clearly documented?"
                    yesNoField="communicationNeedsDocumented"
                    commentField="communicationNeedsDocumentedComment"
                    yesNoValue={auditData.communicationNeedsDocumented}
                    commentValue={auditData.communicationNeedsDocumentedComment}
                    onYesNoChange={(value) => handleInputChange('communicationNeedsDocumented', value)}
                    onCommentChange={(value) => handleInputChange('communicationNeedsDocumentedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are preferences for end-of-life care recorded and accessible?"
                    yesNoField="endOfLifePreferences"
                    commentField="endOfLifePreferencesComment"
                    yesNoValue={auditData.endOfLifePreferences}
                    commentValue={auditData.endOfLifePreferencesComment}
                    onYesNoChange={(value) => handleInputChange('endOfLifePreferences', value)}
                    onCommentChange={(value) => handleInputChange('endOfLifePreferencesComment', value)}
                  />
                </div>
              </div>

              {/* Section 4 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-red-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">4. Risk Assessments</h3>
                    <p className="text-sm text-gray-600">Risk identification and management</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Are key risk assessments completed?"
                    yesNoField="keyRiskAssessmentsCompleted"
                    commentField="keyRiskAssessmentsCompletedComment"
                    yesNoValue={auditData.keyRiskAssessmentsCompleted}
                    commentValue={auditData.keyRiskAssessmentsCompletedComment}
                    onYesNoChange={(value) => handleInputChange('keyRiskAssessmentsCompleted', value)}
                    onCommentChange={(value) => handleInputChange('keyRiskAssessmentsCompletedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are risk levels correctly scored and explained?"
                    yesNoField="riskLevelsScored"
                    commentField="riskLevelsScoredComment"
                    yesNoValue={auditData.riskLevelsScored}
                    commentValue={auditData.riskLevelsScoredComment}
                    onYesNoChange={(value) => handleInputChange('riskLevelsScored', value)}
                    onCommentChange={(value) => handleInputChange('riskLevelsScoredComment', value)}
                  />
                  <YesNoQuestion
                    label="Are assessments reviewed regularly and linked to care plans?"
                    yesNoField="assessmentsReviewedLinked"
                    commentField="assessmentsReviewedLinkedComment"
                    yesNoValue={auditData.assessmentsReviewedLinked}
                    commentValue={auditData.assessmentsReviewedLinkedComment}
                    onYesNoChange={(value) => handleInputChange('assessmentsReviewedLinked', value)}
                    onCommentChange={(value) => handleInputChange('assessmentsReviewedLinkedComment', value)}
                  />
                </div>
              </div>

              {/* Section 5 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-indigo-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">5. Daily Notes / Interactions</h3>
                    <p className="text-sm text-gray-600">Documentation and communication quality</p>
                  </div>
                </div>
                <div className="space-y-4">
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
                    label="Do entries include appropriate detail on care delivered?"
                    yesNoField="entriesIncludeDetail"
                    commentField="entriesIncludeDetailComment"
                    yesNoValue={auditData.entriesIncludeDetail}
                    commentValue={auditData.entriesIncludeDetailComment}
                    onYesNoChange={(value) => handleInputChange('entriesIncludeDetail', value)}
                    onCommentChange={(value) => handleInputChange('entriesIncludeDetailComment', value)}
                  />
                  <YesNoQuestion
                    label="Are logs written in a professional manner?"
                    yesNoField="logsWrittenProfessionally"
                    commentField="logsWrittenProfessionallyComment"
                    yesNoValue={auditData.logsWrittenProfessionally}
                    commentValue={auditData.logsWrittenProfessionallyComment}
                    onYesNoChange={(value) => handleInputChange('logsWrittenProfessionally', value)}
                    onCommentChange={(value) => handleInputChange('logsWrittenProfessionallyComment', value)}
                  />
                  <YesNoQuestion
                    label="Are missed care or refusals clearly recorded?"
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-teal-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">6. Charts and Monitoring</h3>
                    <p className="text-sm text-gray-600">Monitoring systems and data usage</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Are required charts completed daily?"
                    yesNoField="requiredChartsCompleted"
                    commentField="requiredChartsCompletedComment"
                    yesNoValue={auditData.requiredChartsCompleted}
                    commentValue={auditData.requiredChartsCompletedComment}
                    onYesNoChange={(value) => handleInputChange('requiredChartsCompleted', value)}
                    onCommentChange={(value) => handleInputChange('requiredChartsCompletedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are all entries timestamped and linked to staff?"
                    yesNoField="entriesTimestampedStaff"
                    commentField="entriesTimestampedStaffComment"
                    yesNoValue={auditData.entriesTimestampedStaff}
                    commentValue={auditData.entriesTimestampedStaffComment}
                    onYesNoChange={(value) => handleInputChange('entriesTimestampedStaff', value)}
                    onCommentChange={(value) => handleInputChange('entriesTimestampedStaffComment', value)}
                  />
                  <YesNoQuestion
                    label="Is chart data used to inform care plan updates?"
                    yesNoField="chartDataUsedInform"
                    commentField="chartDataUsedInformComment"
                    yesNoValue={auditData.chartDataUsedInform}
                    commentValue={auditData.chartDataUsedInformComment}
                    onYesNoChange={(value) => handleInputChange('chartDataUsedInform', value)}
                    onCommentChange={(value) => handleInputChange('chartDataUsedInformComment', value)}
                  />
                  <YesNoQuestion
                    label="Are alerts triggered appropriately?"
                    yesNoField="alertsTriggeredAppropriately"
                    commentField="alertsTriggeredAppropriatelyComment"
                    yesNoValue={auditData.alertsTriggeredAppropriately}
                    commentValue={auditData.alertsTriggeredAppropriatelyComment}
                    onYesNoChange={(value) => handleInputChange('alertsTriggeredAppropriately', value)}
                    onCommentChange={(value) => handleInputChange('alertsTriggeredAppropriatelyComment', value)}
                  />
                </div>
              </div>

              {/* Section 7 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-pink-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">7. Medication Management</h3>
                    <p className="text-sm text-gray-600">Medication administration and monitoring</p>
                  </div>
                </div>
                <div className="space-y-4">
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
                    label="Are medication reviews documented?"
                    yesNoField="medicationReviewsDocumented"
                    commentField="medicationReviewsDocumentedComment"
                    yesNoValue={auditData.medicationReviewsDocumented}
                    commentValue={auditData.medicationReviewsDocumentedComment}
                    onYesNoChange={(value) => handleInputChange('medicationReviewsDocumented', value)}
                    onCommentChange={(value) => handleInputChange('medicationReviewsDocumentedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are PRN protocols uploaded and accessible?"
                    yesNoField="prnProtocolsUploaded"
                    commentField="prnProtocolsUploadedComment"
                    yesNoValue={auditData.prnProtocolsUploaded}
                    commentValue={auditData.prnProtocolsUploadedComment}
                    onYesNoChange={(value) => handleInputChange('prnProtocolsUploaded', value)}
                    onCommentChange={(value) => handleInputChange('prnProtocolsUploadedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are refusals or side effects recorded?"
                    yesNoField="refusalsSideEffectsRecorded"
                    commentField="refusalsSideEffectsRecordedComment"
                    yesNoValue={auditData.refusalsSideEffectsRecorded}
                    commentValue={auditData.refusalsSideEffectsRecordedComment}
                    onYesNoChange={(value) => handleInputChange('refusalsSideEffectsRecorded', value)}
                    onCommentChange={(value) => handleInputChange('refusalsSideEffectsRecordedComment', value)}
                  />
                </div>
              </div>

              {/* Section 8 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-cyan-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">8. Observations and Vitals</h3>
                    <p className="text-sm text-gray-600">Health monitoring and clinical oversight</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Are regular observations recorded as per care plan?"
                    yesNoField="regularObservationsRecorded"
                    commentField="regularObservationsRecordedComment"
                    yesNoValue={auditData.regularObservationsRecorded}
                    commentValue={auditData.regularObservationsRecordedComment}
                    onYesNoChange={(value) => handleInputChange('regularObservationsRecorded', value)}
                    onCommentChange={(value) => handleInputChange('regularObservationsRecordedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are abnormal results flagged or escalated?"
                    yesNoField="abnormalResultsFlagged"
                    commentField="abnormalResultsFlaggedComment"
                    yesNoValue={auditData.abnormalResultsFlagged}
                    commentValue={auditData.abnormalResultsFlaggedComment}
                    onYesNoChange={(value) => handleInputChange('abnormalResultsFlagged', value)}
                    onCommentChange={(value) => handleInputChange('abnormalResultsFlaggedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are weight trends monitored and responded to?"
                    yesNoField="weightTrendsMonitored"
                    commentField="weightTrendsMonitoredComment"
                    yesNoValue={auditData.weightTrendsMonitored}
                    commentValue={auditData.weightTrendsMonitoredComment}
                    onYesNoChange={(value) => handleInputChange('weightTrendsMonitored', value)}
                    onCommentChange={(value) => handleInputChange('weightTrendsMonitoredComment', value)}
                  />
                  <YesNoQuestion
                    label="Are observations used to inform clinical decisions?"
                    yesNoField="observationsUsedClinicalDecisions"
                    commentField="observationsUsedClinicalDecisionsComment"
                    yesNoValue={auditData.observationsUsedClinicalDecisions}
                    commentValue={auditData.observationsUsedClinicalDecisionsComment}
                    onYesNoChange={(value) => handleInputChange('observationsUsedClinicalDecisions', value)}
                    onCommentChange={(value) => handleInputChange('observationsUsedClinicalDecisionsComment', value)}
                  />
                </div>
              </div>

              {/* Section 9 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-lime-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">9. Communication and Handover</h3>
                    <p className="text-sm text-gray-600">Information sharing and continuity</p>
                  </div>
                </div>
                <div className="space-y-4">
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
                    label="Are changes in condition logged and communicated?"
                    yesNoField="changesConditionLogged"
                    commentField="changesConditionLoggedComment"
                    yesNoValue={auditData.changesConditionLogged}
                    commentValue={auditData.changesConditionLoggedComment}
                    onYesNoChange={(value) => handleInputChange('changesConditionLogged', value)}
                    onCommentChange={(value) => handleInputChange('changesConditionLoggedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are professional visits recorded?"
                    yesNoField="professionalVisitsRecorded"
                    commentField="professionalVisitsRecordedComment"
                    yesNoValue={auditData.professionalVisitsRecorded}
                    commentValue={auditData.professionalVisitsRecordedComment}
                    onYesNoChange={(value) => handleInputChange('professionalVisitsRecorded', value)}
                    onCommentChange={(value) => handleInputChange('professionalVisitsRecordedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are family communications recorded?"
                    yesNoField="familyCommunicationsRecorded"
                    commentField="familyCommunicationsRecordedComment"
                    yesNoValue={auditData.familyCommunicationsRecorded}
                    commentValue={auditData.familyCommunicationsRecordedComment}
                    onYesNoChange={(value) => handleInputChange('familyCommunicationsRecorded', value)}
                    onCommentChange={(value) => handleInputChange('familyCommunicationsRecordedComment', value)}
                  />
                </div>
              </div>

              {/* Section 10 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-amber-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">10. Safeguarding and Incident Reporting</h3>
                    <p className="text-sm text-gray-600">Protection and incident management</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Are safeguarding concerns documented and actioned?"
                    yesNoField="safeguardingConcernsDocumented"
                    commentField="safeguardingConcernsDocumentedComment"
                    yesNoValue={auditData.safeguardingConcernsDocumented}
                    commentValue={auditData.safeguardingConcernsDocumentedComment}
                    onYesNoChange={(value) => handleInputChange('safeguardingConcernsDocumented', value)}
                    onCommentChange={(value) => handleInputChange('safeguardingConcernsDocumentedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are incidents recorded promptly?"
                    yesNoField="incidentsRecordedPromptly"
                    commentField="incidentsRecordedPromptlyComment"
                    yesNoValue={auditData.incidentsRecordedPromptly}
                    commentValue={auditData.incidentsRecordedPromptlyComment}
                    onYesNoChange={(value) => handleInputChange('incidentsRecordedPromptly', value)}
                    onCommentChange={(value) => handleInputChange('incidentsRecordedPromptlyComment', value)}
                  />
                  <YesNoQuestion
                    label="Are follow-ups and investigations visible?"
                    yesNoField="followUpsInvestigationsVisible"
                    commentField="followUpsInvestigationsVisibleComment"
                    yesNoValue={auditData.followUpsInvestigationsVisible}
                    commentValue={auditData.followUpsInvestigationsVisibleComment}
                    onYesNoChange={(value) => handleInputChange('followUpsInvestigationsVisible', value)}
                    onCommentChange={(value) => handleInputChange('followUpsInvestigationsVisibleComment', value)}
                  />
                  <YesNoQuestion
                    label="Is there evidence of actions to reduce risk?"
                    yesNoField="actionsReduceRiskEvidence"
                    commentField="actionsReduceRiskEvidenceComment"
                    yesNoValue={auditData.actionsReduceRiskEvidence}
                    commentValue={auditData.actionsReduceRiskEvidenceComment}
                    onYesNoChange={(value) => handleInputChange('actionsReduceRiskEvidence', value)}
                    onCommentChange={(value) => handleInputChange('actionsReduceRiskEvidenceComment', value)}
                  />
                </div>
              </div>

              {/* Section 11 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-slate-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">11. Compliance and Audit Trail</h3>
                    <p className="text-sm text-gray-600">System integrity and documentation standards</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Are entries timestamped and linked to user logins?"
                    yesNoField="entriesTimestampedUserLogins"
                    commentField="entriesTimestampedUserLoginsComment"
                    yesNoValue={auditData.entriesTimestampedUserLogins}
                    commentValue={auditData.entriesTimestampedUserLoginsComment}
                    onYesNoChange={(value) => handleInputChange('entriesTimestampedUserLogins', value)}
                    onCommentChange={(value) => handleInputChange('entriesTimestampedUserLoginsComment', value)}
                  />
                  <YesNoQuestion
                    label="Is there a clear audit trail for care plan changes?"
                    yesNoField="auditTrailCarePlanChanges"
                    commentField="auditTrailCarePlanChangesComment"
                    yesNoValue={auditData.auditTrailCarePlanChanges}
                    commentValue={auditData.auditTrailCarePlanChangesComment}
                    onYesNoChange={(value) => handleInputChange('auditTrailCarePlanChanges', value)}
                    onCommentChange={(value) => handleInputChange('auditTrailCarePlanChangesComment', value)}
                  />
                  <YesNoQuestion
                    label="Are overdue reviews flagged within the system?"
                    yesNoField="overdueReviewsTasksFlagged"
                    commentField="overdueReviewsTasksFlaggedComment"
                    yesNoValue={auditData.overdueReviewsTasksFlagged}
                    commentValue={auditData.overdueReviewsTasksFlaggedComment}
                    onYesNoChange={(value) => handleInputChange('overdueReviewsTasksFlagged', value)}
                    onCommentChange={(value) => handleInputChange('overdueReviewsTasksFlaggedComment', value)}
                  />
                </div>
              </div>

              {/* Section 12 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-1 bg-emerald-600 rounded-full h-12 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">12. Consent and Legal Documentation</h3>
                    <p className="text-sm text-gray-600">Legal compliance and resident rights</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <YesNoQuestion
                    label="Is consent for care and data sharing recorded?"
                    yesNoField="consentCareDataSharingRecorded"
                    commentField="consentCareDataSharingRecordedComment"
                    yesNoValue={auditData.consentCareDataSharingRecorded}
                    commentValue={auditData.consentCareDataSharingRecordedComment}
                    onYesNoChange={(value) => handleInputChange('consentCareDataSharingRecorded', value)}
                    onCommentChange={(value) => handleInputChange('consentCareDataSharingRecordedComment', value)}
                  />
                  <YesNoQuestion
                    label="Are DNACPR/TEP/Respect forms current?"
                    yesNoField="dnacprTepRespectFormsCurrent"
                    commentField="dnacprTepRespectFormsCurrentComment"
                    yesNoValue={auditData.dnacprTepRespectFormsCurrent}
                    commentValue={auditData.dnacprTepRespectFormsCurrentComment}
                    onYesNoChange={(value) => handleInputChange('dnacprTepRespectFormsCurrent', value)}
                    onCommentChange={(value) => handleInputChange('dnacprTepRespectFormsCurrentComment', value)}
                  />
                  <YesNoQuestion
                    label="Are LPA details recorded and accessible?"
                    yesNoField="lpaDetailsRecordedAccessible"
                    commentField="lpaDetailsRecordedAccessibleComment"
                    yesNoValue={auditData.lpaDetailsRecordedAccessible}
                    commentValue={auditData.lpaDetailsRecordedAccessibleComment}
                    onYesNoChange={(value) => handleInputChange('lpaDetailsRecordedAccessible', value)}
                    onCommentChange={(value) => handleInputChange('lpaDetailsRecordedAccessibleComment', value)}
                  />
                  <YesNoQuestion
                    label="Are mental capacity assessments documented?"
                    yesNoField="mentalCapacityAssessmentsDocumented"
                    commentField="mentalCapacityAssessmentsDocumentedComment"
                    yesNoValue={auditData.mentalCapacityAssessmentsDocumented}
                    commentValue={auditData.mentalCapacityAssessmentsDocumentedComment}
                    onYesNoChange={(value) => handleInputChange('mentalCapacityAssessmentsDocumented', value)}
                    onCommentChange={(value) => handleInputChange('mentalCapacityAssessmentsDocumentedComment', value)}
                  />
                </div>
              </div>
            </div>

            {/* Final Comments and Submit */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <AuditFooter finalComments={finalComments} setFinalComments={setFinalComments} saving={saving} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Audit Completed</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Would you like to create an action plan based on this audit?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleModalCreate(false)}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  No, thanks
                </button>
                <button
                  onClick={() => handleModalCreate(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Action Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

