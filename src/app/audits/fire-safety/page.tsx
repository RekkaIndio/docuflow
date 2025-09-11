'use client';
import React, { useState, useEffect } from "react";
import { useWorkspace } from '@/context/workspace';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompleted, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';

interface FireSafetyAuditData {
  home: string;
  date: string;
  personCompletingAudit: string;
  
  // Section 1: Fire Risk Assessment
  fireRiskAssessmentCompleted: string;
  fireRiskAssessmentCompletedComment: string;
  fireRiskAssessmentReviewed: string;
  fireRiskAssessmentReviewedComment: string;
  significantFindingsActioned: string;
  significantFindingsActionedComment: string;
  fireRiskAssessmentAccessible: string;
  fireRiskAssessmentAccessibleComment: string;
  
  // Section 2: Fire Detection and Alarm Systems
  functioningFireAlarm: string;
  functioningFireAlarmComment: string;
  fireAlarmsTestedWeekly: string;
  fireAlarmsTestedWeeklyComment: string;
  staffFamiliarAlarmSound: string;
  staffFamiliarAlarmSoundComment: string;
  visualAlarmsInPlace: string;
  visualAlarmsInPlaceComment: string;
  
  // Section 3: Emergency Lighting
  emergencyLightingInstalled: string;
  emergencyLightingInstalledComment: string;
  emergencyLightingTestedMonthly: string;
  emergencyLightingTestedMonthlyComment: string;
  fullEmergencyLightingTest: string;
  fullEmergencyLightingTestComment: string;
  
  // Section 4: Fire Fighting Equipment
  fireExtinguishersAvailable: string;
  fireExtinguishersAvailableComment: string;
  fireExtinguishersServiced: string;
  fireExtinguishersServicedComment: string;
  fireBlankets: string;
  fireBlanketsComment: string;
  staffKnowExtinguisherUse: string;
  staffKnowExtinguisherUseComment: string;
  
  // Section 5: Means of Escape
  fireExitsMarked: string;
  fireExitsMarkedComment: string;
  escapeRoutesClear: string;
  escapeRoutesClearComment: string;
  fireDoorsProper: string;
  fireDoorsProperComment: string;
  escapeRouteSurfaces: string;
  escapeRouteSurfacesComment: string;
  
  // Section 6: Fire Drills and Evacuation Procedures
  evacuationPlanDocumented: string;
  evacuationPlanDocumentedComment: string;
  fireDrillsConducted: string;
  fireDrillsConductedComment: string;
  staffTrainedEvacuation: string;
  staffTrainedEvacuationComment: string;
  peepsInPlace: string;
  peepsInPlaceComment: string;
  
  // Section 7: Staff Training and Competency
  staffFireSafetyTraining: string;
  staffFireSafetyTrainingComment: string;
  staffUnderstandRoles: string;
  staffUnderstandRolesComment: string;
  newStaffTrained: string;
  newStaffTrainedComment: string;
  fireWardensAppointed: string;
  fireWardensAppointedComment: string;
  
  // Section 8: Signage and Information
  fireActionNotices: string;
  fireActionNoticesComment: string;
  fireExitSigns: string;
  fireExitSignsComment: string;
  assemblyPointMarked: string;
  assemblyPointMarkedComment: string;
  fireLogbookUpToDate: string;
  fireLogbookUpToDateComment: string;
  
  // Section 9: Electrical and Equipment Safety
  patTestingCompleted: string;
  patTestingCompletedComment: string;
  fixedWiringInspected: string;
  fixedWiringInspectedComment: string;
  electricalPanelsSecure: string;
  electricalPanelsSecureComment: string;
  staffInstructedFaultyEquipment: string;
  staffInstructedFaultyEquipmentComment: string;
  
  // Section 10: Housekeeping and Fire Prevention
  flammableMaterialsStored: string;
  flammableMaterialsStoredComment: string;
  smokingPoliciesEnforced: string;
  smokingPoliciesEnforcedComment: string;
  linenWasteStorage: string;
  linenWasteStorageComment: string;
  staffAwareReportingHazards: string;
  staffAwareReportingHazardsComment: string;
}

export default function FireSafetyAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  
  const [auditData, setAuditData] = useState<FireSafetyAuditData>({
    home: '',
    date: '',
    personCompletingAudit: '',
    
    // Section 1
    fireRiskAssessmentCompleted: '',
    fireRiskAssessmentCompletedComment: '',
    fireRiskAssessmentReviewed: '',
    fireRiskAssessmentReviewedComment: '',
    significantFindingsActioned: '',
    significantFindingsActionedComment: '',
    fireRiskAssessmentAccessible: '',
    fireRiskAssessmentAccessibleComment: '',
    
    // Section 2
    functioningFireAlarm: '',
    functioningFireAlarmComment: '',
    fireAlarmsTestedWeekly: '',
    fireAlarmsTestedWeeklyComment: '',
    staffFamiliarAlarmSound: '',
    staffFamiliarAlarmSoundComment: '',
    visualAlarmsInPlace: '',
    visualAlarmsInPlaceComment: '',
    
    // Section 3
    emergencyLightingInstalled: '',
    emergencyLightingInstalledComment: '',
    emergencyLightingTestedMonthly: '',
    emergencyLightingTestedMonthlyComment: '',
    fullEmergencyLightingTest: '',
    fullEmergencyLightingTestComment: '',
    
    // Section 4
    fireExtinguishersAvailable: '',
    fireExtinguishersAvailableComment: '',
    fireExtinguishersServiced: '',
    fireExtinguishersServicedComment: '',
    fireBlankets: '',
    fireBlanketsComment: '',
    staffKnowExtinguisherUse: '',
    staffKnowExtinguisherUseComment: '',
    
    // Section 5
    fireExitsMarked: '',
    fireExitsMarkedComment: '',
    escapeRoutesClear: '',
    escapeRoutesClearComment: '',
    fireDoorsProper: '',
    fireDoorsProperComment: '',
    escapeRouteSurfaces: '',
    escapeRouteSurfacesComment: '',
    
    // Section 6
    evacuationPlanDocumented: '',
    evacuationPlanDocumentedComment: '',
    fireDrillsConducted: '',
    fireDrillsConductedComment: '',
    staffTrainedEvacuation: '',
    staffTrainedEvacuationComment: '',
    peepsInPlace: '',
    peepsInPlaceComment: '',
    
    // Section 7
    staffFireSafetyTraining: '',
    staffFireSafetyTrainingComment: '',
    staffUnderstandRoles: '',
    staffUnderstandRolesComment: '',
    newStaffTrained: '',
    newStaffTrainedComment: '',
    fireWardensAppointed: '',
    fireWardensAppointedComment: '',
    
    // Section 8
    fireActionNotices: '',
    fireActionNoticesComment: '',
    fireExitSigns: '',
    fireExitSignsComment: '',
    assemblyPointMarked: '',
    assemblyPointMarkedComment: '',
    fireLogbookUpToDate: '',
    fireLogbookUpToDateComment: '',
    
    // Section 9
    patTestingCompleted: '',
    patTestingCompletedComment: '',
    fixedWiringInspected: '',
    fixedWiringInspectedComment: '',
    electricalPanelsSecure: '',
    electricalPanelsSecureComment: '',
    staffInstructedFaultyEquipment: '',
    staffInstructedFaultyEquipmentComment: '',
    
    // Section 10
    flammableMaterialsStored: '',
    flammableMaterialsStoredComment: '',
    smokingPoliciesEnforced: '',
    smokingPoliciesEnforcedComment: '',
    linenWasteStorage: '',
    linenWasteStorageComment: '',
    staffAwareReportingHazards: '',
    staffAwareReportingHazardsComment: '',
  });

  // Load existing audit data when component mounts
  useEffect(() => {
    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) return;
      
      try {
        const existingData = await getLatestAuditData(activeWorkspace.id, 'fire-safety');
        if (existingData) {
          // Remove metadata fields and populate form
          const { id, createdAt, snapshotCreatedAt, monthKey, year, month, ...formData } = existingData;
          setAuditData(prevData => ({
            ...prevData,
            ...formData
          }));
          
          // Load final comments if available
          if (existingData.comments) {
            setFinalComments(existingData.comments);
          }
        } else {
          // No existing data found
        }
      } catch (error) {
        console.error('Failed to load existing audit data:', error);
      }
    };

    loadExistingAuditData();
  }, [activeWorkspace?.id]);

  const handleInputChange = (field: keyof FireSafetyAuditData, value: string) => {
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
    const requiredFields: (keyof FireSafetyAuditData)[] = [
      'home', 'date', 'personCompletingAudit',
      // Y/N fields for all questions
      'fireRiskAssessmentCompleted', 'fireRiskAssessmentReviewed', 'significantFindingsActioned', 'fireRiskAssessmentAccessible',
      'functioningFireAlarm', 'fireAlarmsTestedWeekly', 'staffFamiliarAlarmSound', 'visualAlarmsInPlace',
      'emergencyLightingInstalled', 'emergencyLightingTestedMonthly', 'fullEmergencyLightingTest',
      'fireExtinguishersAvailable', 'fireExtinguishersServiced', 'fireBlankets', 'staffKnowExtinguisherUse',
      'fireExitsMarked', 'escapeRoutesClear', 'fireDoorsProper', 'escapeRouteSurfaces',
      'evacuationPlanDocumented', 'fireDrillsConducted', 'staffTrainedEvacuation', 'peepsInPlace',
      'staffFireSafetyTraining', 'staffUnderstandRoles', 'newStaffTrained', 'fireWardensAppointed',
      'fireActionNotices', 'fireExitSigns', 'assemblyPointMarked', 'fireLogbookUpToDate',
      'patTestingCompleted', 'fixedWiringInspected', 'electricalPanelsSecure', 'staffInstructedFaultyEquipment',
      'flammableMaterialsStored', 'smokingPoliciesEnforced', 'linenWasteStorage', 'staffAwareReportingHazards'
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

  const handleModalCreate = async (createActionPlan: boolean) => {
    if (!activeWorkspace?.id) {
      alert('Please select a workspace before saving');
      return;
    }
    setSaving(true);
    try {
      // Compute yes/no score from Y/N fields
      const YES_NO_FIELDS: (keyof FireSafetyAuditData)[] = [
        'fireRiskAssessmentCompleted','fireRiskAssessmentReviewed','significantFindingsActioned','fireRiskAssessmentAccessible',
        'functioningFireAlarm','fireAlarmsTestedWeekly','staffFamiliarAlarmSound','visualAlarmsInPlace',
        'emergencyLightingInstalled','emergencyLightingTestedMonthly','fullEmergencyLightingTest',
        'fireExtinguishersAvailable','fireExtinguishersServiced','fireBlankets','staffKnowExtinguisherUse',
        'fireExitsMarked','escapeRoutesClear','fireDoorsProper','escapeRouteSurfaces',
        'evacuationPlanDocumented','fireDrillsConducted','staffTrainedEvacuation','peepsInPlace',
        'staffFireSafetyTraining','staffUnderstandRoles','newStaffTrained','fireWardensAppointed',
        'fireActionNotices','fireExitSigns','assemblyPointMarked','fireLogbookUpToDate',
        'patTestingCompleted','fixedWiringInspected','electricalPanelsSecure','staffInstructedFaultyEquipment',
        'flammableMaterialsStored','smokingPoliciesEnforced','linenWasteStorage','staffAwareReportingHazards'
      ];

      const yesCount = YES_NO_FIELDS.reduce((acc, f) => acc + (auditData[f] === 'Yes' ? 1 : 0), 0);
      const totalCount = YES_NO_FIELDS.length;
      const scorePercent = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0;

      const payload = { ...auditData, comments: finalComments, createActionPlan, createdBy: user?.id ?? null, workspaceId: activeWorkspace.id, auditType: 'fire-safety', scorePercent, yesCount, totalCount };
  const id = await saveAudit(payload, activeWorkspace.id);
  const result = await markAuditCompletedWithSnapshot(activeWorkspace.id, 'fire-safety', payload, auditData.date || new Date().toISOString());
  alert('Audit completed and saved');
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
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
      <div>
        {/* per-question comment UI removed — use final comments at the end of the page */}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Fire Safety Audit</h1>
        </div>
        
        {/* Basic Information */}
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Audit Information</h2>
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

        {/* Section 1: Fire Risk Assessment */}
  <div className="bg-orange-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-orange-900 mb-4">1. Fire Risk Assessment</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Has a fire risk assessment been completed within the last 12 months?"
              yesNoField="fireRiskAssessmentCompleted"
              commentField="fireRiskAssessmentCompletedComment"
              yesNoValue={auditData.fireRiskAssessmentCompleted}
              commentValue={auditData.fireRiskAssessmentCompletedComment}
              onYesNoChange={(value) => handleInputChange('fireRiskAssessmentCompleted', value)}
              onCommentChange={(value) => handleInputChange('fireRiskAssessmentCompletedComment', value)}
            />
            <YesNoQuestion
              label="Is the fire risk assessment reviewed regularly or following any significant changes?"
              yesNoField="fireRiskAssessmentReviewed"
              commentField="fireRiskAssessmentReviewedComment"
              yesNoValue={auditData.fireRiskAssessmentReviewed}
              commentValue={auditData.fireRiskAssessmentReviewedComment}
              onYesNoChange={(value) => handleInputChange('fireRiskAssessmentReviewed', value)}
              onCommentChange={(value) => handleInputChange('fireRiskAssessmentReviewedComment', value)}
            />
            <YesNoQuestion
              label="Are all significant findings from the fire risk assessment acted upon and documented?"
              yesNoField="significantFindingsActioned"
              commentField="significantFindingsActionedComment"
              yesNoValue={auditData.significantFindingsActioned}
              commentValue={auditData.significantFindingsActionedComment}
              onYesNoChange={(value) => handleInputChange('significantFindingsActioned', value)}
              onCommentChange={(value) => handleInputChange('significantFindingsActionedComment', value)}
            />
            <YesNoQuestion
              label="Is the fire risk assessment accessible to staff and relevant authorities?"
              yesNoField="fireRiskAssessmentAccessible"
              commentField="fireRiskAssessmentAccessibleComment"
              yesNoValue={auditData.fireRiskAssessmentAccessible}
              commentValue={auditData.fireRiskAssessmentAccessibleComment}
              onYesNoChange={(value) => handleInputChange('fireRiskAssessmentAccessible', value)}
              onCommentChange={(value) => handleInputChange('fireRiskAssessmentAccessibleComment', value)}
            />
          </div>
        </div>

        {/* Section 2: Fire Detection and Alarm Systems */}
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-4">2. Fire Detection and Alarm Systems</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Is there a functioning fire alarm system in place?"
              yesNoField="functioningFireAlarm"
              commentField="functioningFireAlarmComment"
              yesNoValue={auditData.functioningFireAlarm}
              commentValue={auditData.functioningFireAlarmComment}
              onYesNoChange={(value) => handleInputChange('functioningFireAlarm', value)}
              onCommentChange={(value) => handleInputChange('functioningFireAlarmComment', value)}
            />
            <YesNoQuestion
              label="Are fire alarms tested weekly and records kept?"
              yesNoField="fireAlarmsTestedWeekly"
              commentField="fireAlarmsTestedWeeklyComment"
              yesNoValue={auditData.fireAlarmsTestedWeekly}
              commentValue={auditData.fireAlarmsTestedWeeklyComment}
              onYesNoChange={(value) => handleInputChange('fireAlarmsTestedWeekly', value)}
              onCommentChange={(value) => handleInputChange('fireAlarmsTestedWeeklyComment', value)}
            />
            <YesNoQuestion
              label="Are all staff familiar with the sound of the fire alarm?"
              yesNoField="staffFamiliarAlarmSound"
              commentField="staffFamiliarAlarmSoundComment"
              yesNoValue={auditData.staffFamiliarAlarmSound}
              commentValue={auditData.staffFamiliarAlarmSoundComment}
              onYesNoChange={(value) => handleInputChange('staffFamiliarAlarmSound', value)}
              onCommentChange={(value) => handleInputChange('staffFamiliarAlarmSoundComment', value)}
            />
            <YesNoQuestion
              label="Are visual alarms in place where needed (e.g. for residents with hearing impairments)?"
              yesNoField="visualAlarmsInPlace"
              commentField="visualAlarmsInPlaceComment"
              yesNoValue={auditData.visualAlarmsInPlace}
              commentValue={auditData.visualAlarmsInPlaceComment}
              onYesNoChange={(value) => handleInputChange('visualAlarmsInPlace', value)}
              onCommentChange={(value) => handleInputChange('visualAlarmsInPlaceComment', value)}
            />
          </div>
        </div>

        {/* Section 3: Emergency Lighting */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4">3. Emergency Lighting</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Is emergency lighting installed throughout all escape routes?"
              yesNoField="emergencyLightingInstalled"
              commentField="emergencyLightingInstalledComment"
              yesNoValue={auditData.emergencyLightingInstalled}
              commentValue={auditData.emergencyLightingInstalledComment}
              onYesNoChange={(value) => handleInputChange('emergencyLightingInstalled', value)}
              onCommentChange={(value) => handleInputChange('emergencyLightingInstalledComment', value)}
            />
            <YesNoQuestion
              label="Is emergency lighting tested monthly and records maintained?"
              yesNoField="emergencyLightingTestedMonthly"
              commentField="emergencyLightingTestedMonthlyComment"
              yesNoValue={auditData.emergencyLightingTestedMonthly}
              commentValue={auditData.emergencyLightingTestedMonthlyComment}
              onYesNoChange={(value) => handleInputChange('emergencyLightingTestedMonthly', value)}
              onCommentChange={(value) => handleInputChange('emergencyLightingTestedMonthlyComment', value)}
            />
            <YesNoQuestion
              label="Has a full emergency lighting test been completed within the last year?"
              yesNoField="fullEmergencyLightingTest"
              commentField="fullEmergencyLightingTestComment"
              yesNoValue={auditData.fullEmergencyLightingTest}
              commentValue={auditData.fullEmergencyLightingTestComment}
              onYesNoChange={(value) => handleInputChange('fullEmergencyLightingTest', value)}
              onCommentChange={(value) => handleInputChange('fullEmergencyLightingTestComment', value)}
            />
          </div>
        </div>

        {/* Section 4: Fire Fighting Equipment */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">4. Fire Fighting Equipment</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Are appropriate fire extinguishers available in key locations?"
              yesNoField="fireExtinguishersAvailable"
              commentField="fireExtinguishersAvailableComment"
              yesNoValue={auditData.fireExtinguishersAvailable}
              commentValue={auditData.fireExtinguishersAvailableComment}
              onYesNoChange={(value) => handleInputChange('fireExtinguishersAvailable', value)}
              onCommentChange={(value) => handleInputChange('fireExtinguishersAvailableComment', value)}
            />
            <YesNoQuestion
              label="Are all fire extinguishers serviced annually?"
              yesNoField="fireExtinguishersServiced"
              commentField="fireExtinguishersServicedComment"
              yesNoValue={auditData.fireExtinguishersServiced}
              commentValue={auditData.fireExtinguishersServicedComment}
              onYesNoChange={(value) => handleInputChange('fireExtinguishersServiced', value)}
              onCommentChange={(value) => handleInputChange('fireExtinguishersServicedComment', value)}
            />
            <YesNoQuestion
              label="Are fire blankets provided in kitchen areas?"
              yesNoField="fireBlankets"
              commentField="fireBlanketsComment"
              yesNoValue={auditData.fireBlankets}
              commentValue={auditData.fireBlanketsComment}
              onYesNoChange={(value) => handleInputChange('fireBlankets', value)}
              onCommentChange={(value) => handleInputChange('fireBlanketsComment', value)}
            />
            <YesNoQuestion
              label="Do staff know how to use fire extinguishers safely?"
              yesNoField="staffKnowExtinguisherUse"
              commentField="staffKnowExtinguisherUseComment"
              yesNoValue={auditData.staffKnowExtinguisherUse}
              commentValue={auditData.staffKnowExtinguisherUseComment}
              onYesNoChange={(value) => handleInputChange('staffKnowExtinguisherUse', value)}
              onCommentChange={(value) => handleInputChange('staffKnowExtinguisherUseComment', value)}
            />
          </div>
        </div>

        {/* Section 5: Means of Escape */}
        <div className="bg-indigo-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">5. Means of Escape</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Are all fire exits clearly marked and unobstructed?"
              yesNoField="fireExitsMarked"
              commentField="fireExitsMarkedComment"
              yesNoValue={auditData.fireExitsMarked}
              commentValue={auditData.fireExitsMarkedComment}
              onYesNoChange={(value) => handleInputChange('fireExitsMarked', value)}
              onCommentChange={(value) => handleInputChange('fireExitsMarkedComment', value)}
            />
            <YesNoQuestion
              label="Are escape routes kept clear at all times?"
              yesNoField="escapeRoutesClear"
              commentField="escapeRoutesClearComment"
              yesNoValue={auditData.escapeRoutesClear}
              commentValue={auditData.escapeRoutesClearComment}
              onYesNoChange={(value) => handleInputChange('escapeRoutesClear', value)}
              onCommentChange={(value) => handleInputChange('escapeRoutesClearComment', value)}
            />
            <YesNoQuestion
              label="Are fire doors kept closed (not wedged open) and functioning properly?"
              yesNoField="fireDoorsProper"
              commentField="fireDoorsProperComment"
              yesNoValue={auditData.fireDoorsProper}
              commentValue={auditData.fireDoorsProperComment}
              onYesNoChange={(value) => handleInputChange('fireDoorsProper', value)}
              onCommentChange={(value) => handleInputChange('fireDoorsProperComment', value)}
            />
            <YesNoQuestion
              label="Are escape route floor surfaces free from trip hazards?"
              yesNoField="escapeRouteSurfaces"
              commentField="escapeRouteSurfacesComment"
              yesNoValue={auditData.escapeRouteSurfaces}
              commentValue={auditData.escapeRouteSurfacesComment}
              onYesNoChange={(value) => handleInputChange('escapeRouteSurfaces', value)}
              onCommentChange={(value) => handleInputChange('escapeRouteSurfacesComment', value)}
            />
          </div>
        </div>

        {/* Section 6: Fire Drills and Evacuation Procedures */}
        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-4">6. Fire Drills and Evacuation Procedures</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Is there a documented fire evacuation plan specific to the building layout and resident needs?"
              yesNoField="evacuationPlanDocumented"
              commentField="evacuationPlanDocumentedComment"
              yesNoValue={auditData.evacuationPlanDocumented}
              commentValue={auditData.evacuationPlanDocumentedComment}
              onYesNoChange={(value) => handleInputChange('evacuationPlanDocumented', value)}
              onCommentChange={(value) => handleInputChange('evacuationPlanDocumentedComment', value)}
            />
            <YesNoQuestion
              label="Have fire drills been conducted at least twice per year?"
              yesNoField="fireDrillsConducted"
              commentField="fireDrillsConductedComment"
              yesNoValue={auditData.fireDrillsConducted}
              commentValue={auditData.fireDrillsConductedComment}
              onYesNoChange={(value) => handleInputChange('fireDrillsConducted', value)}
              onCommentChange={(value) => handleInputChange('fireDrillsConductedComment', value)}
            />
            <YesNoQuestion
              label="Are all staff trained in evacuation procedures, including use of evacuation equipment?"
              yesNoField="staffTrainedEvacuation"
              commentField="staffTrainedEvacuationComment"
              yesNoValue={auditData.staffTrainedEvacuation}
              commentValue={auditData.staffTrainedEvacuationComment}
              onYesNoChange={(value) => handleInputChange('staffTrainedEvacuation', value)}
              onCommentChange={(value) => handleInputChange('staffTrainedEvacuationComment', value)}
            />
            <YesNoQuestion
              label="Are Personal Emergency Evacuation Plans (PEEPs) in place for all residents who need them?"
              yesNoField="peepsInPlace"
              commentField="peepsInPlaceComment"
              yesNoValue={auditData.peepsInPlace}
              commentValue={auditData.peepsInPlaceComment}
              onYesNoChange={(value) => handleInputChange('peepsInPlace', value)}
              onCommentChange={(value) => handleInputChange('peepsInPlaceComment', value)}
            />
          </div>
        </div>

        {/* Section 7: Staff Training and Competency */}
        <div className="bg-pink-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-pink-900 mb-4">7. Staff Training and Competency</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Have all staff received fire safety training within the last 12 months?"
              yesNoField="staffFireSafetyTraining"
              commentField="staffFireSafetyTrainingComment"
              yesNoValue={auditData.staffFireSafetyTraining}
              commentValue={auditData.staffFireSafetyTrainingComment}
              onYesNoChange={(value) => handleInputChange('staffFireSafetyTraining', value)}
              onCommentChange={(value) => handleInputChange('staffFireSafetyTrainingComment', value)}
            />
            <YesNoQuestion
              label="Do staff understand their roles in the event of a fire?"
              yesNoField="staffUnderstandRoles"
              commentField="staffUnderstandRolesComment"
              yesNoValue={auditData.staffUnderstandRoles}
              commentValue={auditData.staffUnderstandRolesComment}
              onYesNoChange={(value) => handleInputChange('staffUnderstandRoles', value)}
              onCommentChange={(value) => handleInputChange('staffUnderstandRolesComment', value)}
            />
            <YesNoQuestion
              label="Are new staff trained in fire safety during their induction?"
              yesNoField="newStaffTrained"
              commentField="newStaffTrainedComment"
              yesNoValue={auditData.newStaffTrained}
              commentValue={auditData.newStaffTrainedComment}
              onYesNoChange={(value) => handleInputChange('newStaffTrained', value)}
              onCommentChange={(value) => handleInputChange('newStaffTrainedComment', value)}
            />
            <YesNoQuestion
              label="Are fire wardens/marshals appointed and trained?"
              yesNoField="fireWardensAppointed"
              commentField="fireWardensAppointedComment"
              yesNoValue={auditData.fireWardensAppointed}
              commentValue={auditData.fireWardensAppointedComment}
              onYesNoChange={(value) => handleInputChange('fireWardensAppointed', value)}
              onCommentChange={(value) => handleInputChange('fireWardensAppointedComment', value)}
            />
          </div>
        </div>

        {/* Section 8: Signage and Information */}
        <div className="bg-teal-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-teal-900 mb-4">8. Signage and Information</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Are fire action notices displayed in key areas?"
              yesNoField="fireActionNotices"
              commentField="fireActionNoticesComment"
              yesNoValue={auditData.fireActionNotices}
              commentValue={auditData.fireActionNoticesComment}
              onYesNoChange={(value) => handleInputChange('fireActionNotices', value)}
              onCommentChange={(value) => handleInputChange('fireActionNoticesComment', value)}
            />
            <YesNoQuestion
              label="Are fire exit signs illuminated and clearly visible?"
              yesNoField="fireExitSigns"
              commentField="fireExitSignsComment"
              yesNoValue={auditData.fireExitSigns}
              commentValue={auditData.fireExitSignsComment}
              onYesNoChange={(value) => handleInputChange('fireExitSigns', value)}
              onCommentChange={(value) => handleInputChange('fireExitSignsComment', value)}
            />
            <YesNoQuestion
              label="Is a fire assembly point clearly marked and known by staff?"
              yesNoField="assemblyPointMarked"
              commentField="assemblyPointMarkedComment"
              yesNoValue={auditData.assemblyPointMarked}
              commentValue={auditData.assemblyPointMarkedComment}
              onYesNoChange={(value) => handleInputChange('assemblyPointMarked', value)}
              onCommentChange={(value) => handleInputChange('assemblyPointMarkedComment', value)}
            />
            <YesNoQuestion
              label="Is the fire logbook up to date and available for inspection?"
              yesNoField="fireLogbookUpToDate"
              commentField="fireLogbookUpToDateComment"
              yesNoValue={auditData.fireLogbookUpToDate}
              commentValue={auditData.fireLogbookUpToDateComment}
              onYesNoChange={(value) => handleInputChange('fireLogbookUpToDate', value)}
              onCommentChange={(value) => handleInputChange('fireLogbookUpToDateComment', value)}
            />
          </div>
        </div>

        {/* Section 9: Electrical and Equipment Safety */}
        <div className="bg-cyan-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-cyan-900 mb-4">9. Electrical and Equipment Safety</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Has portable appliance testing (PAT) been carried out on all electrical equipment?"
              yesNoField="patTestingCompleted"
              commentField="patTestingCompletedComment"
              yesNoValue={auditData.patTestingCompleted}
              commentValue={auditData.patTestingCompletedComment}
              onYesNoChange={(value) => handleInputChange('patTestingCompleted', value)}
              onCommentChange={(value) => handleInputChange('patTestingCompletedComment', value)}
            />
            <YesNoQuestion
              label="Are fixed wiring installations inspected and tested at least every 5 years?"
              yesNoField="fixedWiringInspected"
              commentField="fixedWiringInspectedComment"
              yesNoValue={auditData.fixedWiringInspected}
              commentValue={auditData.fixedWiringInspectedComment}
              onYesNoChange={(value) => handleInputChange('fixedWiringInspected', value)}
              onCommentChange={(value) => handleInputChange('fixedWiringInspectedComment', value)}
            />
            <YesNoQuestion
              label="Are electrical panels and equipment kept secure and unobstructed?"
              yesNoField="electricalPanelsSecure"
              commentField="electricalPanelsSecureComment"
              yesNoValue={auditData.electricalPanelsSecure}
              commentValue={auditData.electricalPanelsSecureComment}
              onYesNoChange={(value) => handleInputChange('electricalPanelsSecure', value)}
              onCommentChange={(value) => handleInputChange('electricalPanelsSecureComment', value)}
            />
            <YesNoQuestion
              label="Are staff instructed to report and remove faulty electrical equipment?"
              yesNoField="staffInstructedFaultyEquipment"
              commentField="staffInstructedFaultyEquipmentComment"
              yesNoValue={auditData.staffInstructedFaultyEquipment}
              commentValue={auditData.staffInstructedFaultyEquipmentComment}
              onYesNoChange={(value) => handleInputChange('staffInstructedFaultyEquipment', value)}
              onCommentChange={(value) => handleInputChange('staffInstructedFaultyEquipmentComment', value)}
            />
          </div>
        </div>

        {/* Section 10: Housekeeping and Fire Prevention */}
        <div className="bg-lime-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-lime-900 mb-4">10. Housekeeping and Fire Prevention</h2>
          <div className="space-y-6">
            <YesNoQuestion
              label="Are flammable materials stored safely and away from heat sources?"
              yesNoField="flammableMaterialsStored"
              commentField="flammableMaterialsStoredComment"
              yesNoValue={auditData.flammableMaterialsStored}
              commentValue={auditData.flammableMaterialsStoredComment}
              onYesNoChange={(value) => handleInputChange('flammableMaterialsStored', value)}
              onCommentChange={(value) => handleInputChange('flammableMaterialsStoredComment', value)}
            />
            <YesNoQuestion
              label="Are smoking policies clearly enforced and smoking areas controlled?"
              yesNoField="smokingPoliciesEnforced"
              commentField="smokingPoliciesEnforcedComment"
              yesNoValue={auditData.smokingPoliciesEnforced}
              commentValue={auditData.smokingPoliciesEnforcedComment}
              onYesNoChange={(value) => handleInputChange('smokingPoliciesEnforced', value)}
              onCommentChange={(value) => handleInputChange('smokingPoliciesEnforcedComment', value)}
            />
            <YesNoQuestion
              label="Are linen and waste storage areas regularly cleared and well-maintained?"
              yesNoField="linenWasteStorage"
              commentField="linenWasteStorageComment"
              yesNoValue={auditData.linenWasteStorage}
              commentValue={auditData.linenWasteStorageComment}
              onYesNoChange={(value) => handleInputChange('linenWasteStorage', value)}
              onCommentChange={(value) => handleInputChange('linenWasteStorageComment', value)}
            />
            <YesNoQuestion
              label="Are staff aware of procedures for reporting fire hazards?"
              yesNoField="staffAwareReportingHazards"
              commentField="staffAwareReportingHazardsComment"
              yesNoValue={auditData.staffAwareReportingHazards}
              commentValue={auditData.staffAwareReportingHazardsComment}
              onYesNoChange={(value) => handleInputChange('staffAwareReportingHazards', value)}
              onCommentChange={(value) => handleInputChange('staffAwareReportingHazardsComment', value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium">Final comments</label>
          <textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} className="w-full p-2 border rounded" rows={4} />
        </div>

        {/* Complete Audit Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleCompleteAudit}
            className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Complete Audit
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
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">No, thanks</button>
              <button onClick={() => handleModalCreate(false)} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Save Audit</button>
              <button onClick={() => handleModalCreate(true)} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Save & Create Action Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}