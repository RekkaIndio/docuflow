"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/context/workspace';
import { saveAudit, updateAudit, markAuditCompleted, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AuditFooter from '@/components/audit-footer';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

type AttachmentItem = {
  id: string;
  name: string;
  url: string;
  file?: File;
  storagePath?: string;
  downloadUrl?: string;
};

type AttachmentMetadata = {
  name: string;
  storagePath: string;
  downloadUrl?: string;
};

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

interface YesNoQuestionProps {
  label: string;
  yesNoField: keyof CarePlanAuditData;
  commentField: keyof CarePlanAuditData;
  yesNoValue: string;
  commentValue: string;
  onYesNoChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  renderAttachmentButton: (fieldName: string) => React.ReactNode;
  renderAttachmentPreview: (fieldName: string) => React.ReactNode;
  hasError: (fieldName: string) => boolean;
}

const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  label,
  yesNoField,
  commentField,
  yesNoValue,
  commentValue,
  onYesNoChange,
  onCommentChange,
  renderAttachmentButton,
  renderAttachmentPreview,
  hasError,
}) => {
  const yesNoKey = yesNoField as string;
  const commentKey = commentField as string;

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="space-y-3">
        <div>
          <div className="flex items-start justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {renderAttachmentButton(commentKey)}
          </div>
          <div className="flex gap-4" data-field={yesNoKey}>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={yesNoKey}
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
                name={yesNoKey}
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
                name={yesNoKey}
                value="N/A"
                checked={yesNoValue === 'N/A'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">N/A</span>
            </label>
          </div>
          {hasError(yesNoKey) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50"
            rows={2}
            placeholder="Add any comments or observations..."
          />
          {renderAttachmentPreview(commentKey)}
        </div>
      </div>
    </div>
  );
};

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
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const createdObjectUrls = useRef<Set<string>>(new Set());
  
  // Collapsible state for each section
  const [openSections, setOpenSections] = useState(() => Array(12).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  // Section definitions for collapsible form
  const sections = [
    {
      label: "1. General Information",
      name: "generalInfo",
      guidance: ["Review basic resident information, photographs, and documentation completeness."]
    },
    {
      label: "2. Care Plan Accessibility",
      name: "carePlanAccess",
      guidance: [
        "Verify care plan availability and recent reviews.",
        "Ensure all relevant staff can access current care plans."
      ]
    },
    {
      label: "3. Person-Centred Content",
      name: "personCentred",
      guidance: [
        "Check that care plans reflect individual preferences and history.",
        "Verify communication needs and end-of-life preferences are documented."
      ]
    },
    {
      label: "4. Risk Assessments",
      name: "riskAssessments",
      guidance: [
        "Review completion of key risk assessments.",
        "Verify risk levels are properly scored and linked to care plans."
      ]
    },
    {
      label: "5. Daily Notes & Interactions",
      name: "dailyNotes",
      guidance: [
        "Check consistency and quality of daily documentation.",
        "Verify professional standards in note-taking."
      ]
    },
    {
      label: "6. Charts & Monitoring",
      name: "chartsMonitoring",
      guidance: [
        "Review completion of required monitoring charts.",
        "Verify data is used to inform care planning."
      ]
    },
    {
      label: "7. Medication Management",
      name: "medication",
      guidance: [
        "Check MAR chart accuracy and medication reviews.",
        "Verify PRN protocols and side effect documentation."
      ]
    },
    {
      label: "8. Observations & Vitals",
      name: "observations",
      guidance: [
        "Review recording of vital signs and observations.",
        "Verify abnormal results are flagged and acted upon."
      ]
    },
    {
      label: "9. Communication & Handover",
      name: "communication",
      guidance: [
        "Check handover log updates and professional visit documentation.",
        "Verify family communication records."
      ]
    },
    {
      label: "10. Safeguarding",
      name: "safeguarding",
      guidance: [
        "Review safeguarding concern documentation.",
        "Verify incident recording and follow-up procedures."
      ]
    },
    {
      label: "11. Audit Trail & Compliance",
      name: "auditTrail",
      guidance: [
        "Check electronic audit trails and user login tracking.",
        "Verify overdue reviews and tasks are flagged."
      ]
    },
    {
      label: "12. Consent & Legal",
      name: "consentLegal",
      guidance: [
        "Review consent documentation for data sharing.",
        "Verify DNACPR, LPA, and mental capacity assessments."
      ]
    }
  ];

  // Helper function to check if field has error
  const hasError = (fieldName: string) => errors.includes(fieldName);
  
  // Helper function to get error styling
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    return hasError(fieldName) 
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500` 
      : baseClassName;
  };

  // Load existing audit data when component mounts
  useEffect(() => {
    let cancelled = false;

    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) {
        setAttachments({});
        setAttachmentsToDelete([]);
        return;
      }

      setAttachments({});
      setAttachmentsToDelete([]);

      try {
        const existingData = await getLatestAuditData(activeWorkspace.id, 'care-plan', undefined, activeWorkspace.organisationId || null);
        if (!existingData || cancelled) return;

        const { data: nestedData, attachments: storedAttachments, comments, ...rest } = existingData as any;
        const resolvedData = nestedData && typeof nestedData === 'object' ? nestedData : existingData;

        setAuditData(prevData => {
          const next = { ...prevData };
          (Object.keys(prevData) as Array<keyof CarePlanAuditData>).forEach((key) => {
            const value = (resolvedData as any)[key];
            if (typeof value === 'string') {
              next[key] = value;
            }
          });
          return next;
        });

        if (comments && typeof comments === 'string') {
          setFinalComments(comments);
        }

        const attachmentsSource: Record<string, any[]> | undefined = storedAttachments && typeof storedAttachments === 'object'
          ? storedAttachments
          : nestedData && typeof nestedData === 'object' && nestedData.attachments && typeof nestedData.attachments === 'object'
            ? nestedData.attachments
            : undefined;

        if (attachmentsSource) {
          const processedEntries: Array<[string, AttachmentItem[]]> = [];
          for (const [fieldName, list] of Object.entries(attachmentsSource)) {
            if (!Array.isArray(list) || list.length === 0) continue;
            const processed: AttachmentItem[] = [];
            for (let i = 0; i < list.length; i++) {
              const entry = list[i] as any;
              if (!entry) continue;
              const storagePath: string | undefined = entry.storagePath;
              let downloadUrl: string | undefined = entry.downloadUrl;
              if (!downloadUrl && storagePath) {
                try {
                  downloadUrl = await getDownloadURL(ref(storage, storagePath));
                } catch (err) {
                  console.error('Failed to fetch download URL for attachment', err);
                  continue;
                }
              }
              if (!downloadUrl) continue;
              processed.push({
                id: `existing-${fieldName}-${i}-${storagePath ?? entry.name ?? 'attachment'}`,
                name: entry.name ?? `Attachment ${i + 1}`,
                url: downloadUrl,
                storagePath,
                downloadUrl
              });
            }
            if (processed.length > 0) {
              processedEntries.push([fieldName, processed]);
            }
          }
          if (!cancelled && processedEntries.length > 0) {
            setAttachments(Object.fromEntries(processedEntries));
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load existing audit data:', error);
        }
      }
    };

    loadExistingAuditData();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn('Failed to revoke object URL on cleanup', err);
        }
      });
      createdObjectUrls.current.clear();
    };
  }, []);

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

  const handleAddAttachments = (fieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setAttachments(prev => {
      const existing = prev[fieldName] ?? [];
      const added = fileArray.map(file => {
        const url = URL.createObjectURL(file);
        createdObjectUrls.current.add(url);
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${fieldName}-${Date.now()}-${file.name}`;
        return { id, name: file.name, url, file } as AttachmentItem;
      });
      return { ...prev, [fieldName]: [...existing, ...added] };
    });
  };

  const handleRemoveAttachment = (fieldName: string, id: string) => {
    setAttachments(prev => {
      const list = prev[fieldName] ?? [];
      const target = list.find(item => item.id === id);
      if (!target) return prev;

      if (target.url && target.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.url);
        } catch (err) {
          console.warn('Failed to revoke object URL', err);
        }
        createdObjectUrls.current.delete(target.url);
      }

      if (target.storagePath) {
        setAttachmentsToDelete(prevDeletes => [...prevDeletes, target.storagePath as string]);
      }

      if (previewImage && previewImage.url === target.url) {
        setPreviewImage(null);
      }

      const remaining = list.filter(item => item.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) {
        next[fieldName] = remaining;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  };

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) {
      throw new Error('Workspace not available for attachment upload');
    }
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (auditData?.name || auditData?.residentName || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9-]/g, '') || 'care-plan';
    const timestamp = Date.now();
    const basePath = orgId ? `organisations/${orgId}/workspaces/${activeWorkspace.id}` : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/care-plan/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
  };

  const getAttachmentCount = (fieldName: string) => (attachments[fieldName]?.length ?? 0);

  const renderAttachmentButton = (fieldName: string) => (
    <div className="ml-4 relative">
      {getAttachmentCount(fieldName) > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
          {getAttachmentCount(fieldName)}
        </span>
      )}
      <label
        title="Add attachment"
        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 cursor-pointer border border-transparent hover:bg-blue-100"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            handleAddAttachments(fieldName, e.target.files);
            e.currentTarget.value = '';
          }}
          className="hidden"
        />
        <span className="text-xl font-bold">+</span>
      </label>
    </div>
  );

  const renderAttachmentPreview = (fieldName: string) => {
    const list = attachments[fieldName] ?? [];
    if (list.length === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {list.map(att => (
          <div key={att.id} className="relative w-24 h-24 rounded overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setPreviewImage({ url: att.url, name: att.name })}
              className="w-full h-full"
              title={att.name}
            >
              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => handleRemoveAttachment(fieldName, att.id)}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const yesNoSharedProps = {
    renderAttachmentButton,
    renderAttachmentPreview,
    hasError,
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

      const attachmentsMetadata: Record<string, AttachmentMetadata[]> = {};
      const nextAttachmentState: Record<string, AttachmentItem[]> = {};

      for (const [fieldName, items] of Object.entries(attachments)) {
        if (!items || items.length === 0) continue;
        const processed: AttachmentItem[] = [];
        for (const item of items) {
          if (item.file) {
            const { storagePath, downloadUrl } = await uploadAttachmentFile(fieldName, item.file);
            if (item.url && item.url.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(item.url);
              } catch (err) {
                console.warn('Failed to revoke object URL during upload', err);
              }
              createdObjectUrls.current.delete(item.url);
            }
            const storedItem: AttachmentItem = {
              id: item.id,
              name: item.name,
              url: downloadUrl,
              storagePath,
              downloadUrl
            };
            processed.push(storedItem);
            if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath, downloadUrl });
          } else if (item.storagePath) {
            const downloadUrl = item.downloadUrl || item.url;
            processed.push({
              id: item.id,
              name: item.name,
              url: downloadUrl,
              storagePath: item.storagePath,
              downloadUrl
            });
            if (!attachmentsMetadata[fieldName]) attachmentsMetadata[fieldName] = [];
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath: item.storagePath, downloadUrl });
          }
        }
        if (processed.length > 0) {
          nextAttachmentState[fieldName] = processed;
        }
      }

      if (attachmentsToDelete.length > 0) {
        const uniqueDeletes = Array.from(new Set(attachmentsToDelete));
        for (const storagePath of uniqueDeletes) {
          try {
            await deleteObject(ref(storage, storagePath));
          } catch (err) {
            console.warn('Failed to delete removed attachment from storage', err);
          }
        }
      }

      const attachmentsPayload = Object.keys(attachmentsMetadata).length > 0 ? attachmentsMetadata : undefined;

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
        organisationId: activeWorkspace.organisationId || null,
        ...(attachmentsPayload ? { attachments: attachmentsPayload } : {})
      };

      const auditId = await saveAudit(payload, activeWorkspace.id, activeWorkspace.organisationId || null);
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
      setAttachments(nextAttachmentState);
      setAttachmentsToDelete([]);
      setPreviewImage(null);
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

  return (
  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Care Plan Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive audit to check care plan quality and compliance. All fields are required.</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Home/Care Facility</label>
              <Input
                type="text"
                className={getFieldClassName('home', "w-full")}
                name="home"
                value={auditData.home}
                onChange={(e) => handleInputChange('home', e.target.value)}
                placeholder="Enter care home name"
                required
              />
              {hasError('home') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Date</label>
              <Input
                type="date"
                className={getFieldClassName('name', "w-full")}
                name="name"
                value={auditData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
              {hasError('name') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <Input
                type="text"
                className={getFieldClassName('personCompletingAudit', "w-full")}
                name="personCompletingAudit"
                value={auditData.personCompletingAudit}
                onChange={(e) => handleInputChange('personCompletingAudit', e.target.value)}
                placeholder="Full name and position"
                required
              />
              {hasError('personCompletingAudit') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Resident Name</label>
              <Input
                type="text"
                className={getFieldClassName('residentName', "w-full")}
                name="residentName"
                value={auditData.residentName}
                onChange={(e) => handleInputChange('residentName', e.target.value)}
                placeholder="Full name"
                required
              />
              {hasError('residentName') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Room Number</label>
              <Input
                type="text"
                className={getFieldClassName('roomNumber', "w-full")}
                name="roomNumber"
                value={auditData.roomNumber}
                onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                placeholder="Room number"
                required
              />
              {hasError('roomNumber') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
          </div>
        </div>
        {/* Main form right column, scrollable */}
        <div className="flex-1 min-w-0 pr-2">
          <form onSubmit={(e) => { e.preventDefault(); handleCompleteAudit(); }} className="flex flex-col gap-8">
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
                        {/* General Information - already in left panel, so this section is minimal */}
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-sm text-slate-600">Basic audit information has been entered in the left panel.</p>
                        </div>
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are current and initial assessments complete?"
                          yesNoField="currentInitialAssessmentsComplete"
                          commentField="currentInitialAssessmentsComment"
                          yesNoValue={auditData.currentInitialAssessmentsComplete}
                          commentValue={auditData.currentInitialAssessmentsComment}
                          onYesNoChange={(value) => handleInputChange('currentInitialAssessmentsComplete', value)}
                          onCommentChange={(value) => handleInputChange('currentInitialAssessmentsComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is the care plan easily accessible to all relevant staff?"
                          yesNoField="carePlanAccessible"
                          commentField="carePlanAccessibleComment"
                          yesNoValue={auditData.carePlanAccessible}
                          commentValue={auditData.carePlanAccessibleComment}
                          onYesNoChange={(value) => handleInputChange('carePlanAccessible', value)}
                          onCommentChange={(value) => handleInputChange('carePlanAccessibleComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Has the care plan been reviewed within the last 30 days?"
                          yesNoField="carePlanReviewed30Days"
                          commentField="carePlanReviewed30DaysComment"
                          yesNoValue={auditData.carePlanReviewed30Days}
                          commentValue={auditData.carePlanReviewed30DaysComment}
                          onYesNoChange={(value) => handleInputChange('carePlanReviewed30Days', value)}
                          onCommentChange={(value) => handleInputChange('carePlanReviewed30DaysComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are all care plans in place including specific needs care plans?"
                          yesNoField="allCarePlansInPlace"
                          commentField="allCarePlansInPlaceComment"
                          yesNoValue={auditData.allCarePlansInPlace}
                          commentValue={auditData.allCarePlansInPlaceComment}
                          onYesNoChange={(value) => handleInputChange('allCarePlansInPlace', value)}
                          onCommentChange={(value) => handleInputChange('allCarePlansInPlaceComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are all sections of the care plan updated as needed?"
                          yesNoField="allSectionsUpdated"
                          commentField="allSectionsUpdatedComment"
                          yesNoValue={auditData.allSectionsUpdated}
                          commentValue={auditData.allSectionsUpdatedComment}
                          onYesNoChange={(value) => handleInputChange('allSectionsUpdated', value)}
                          onCommentChange={(value) => handleInputChange('allSectionsUpdatedComment', value)}
                        />
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Does the care plan reflect the resident's personal history, preferences, and routines?"
                          yesNoField="reflectsPersonalHistory"
                          commentField="reflectsPersonalHistoryComment"
                          yesNoValue={auditData.reflectsPersonalHistory}
                          commentValue={auditData.reflectsPersonalHistoryComment}
                          onYesNoChange={(value) => handleInputChange('reflectsPersonalHistory', value)}
                          onCommentChange={(value) => handleInputChange('reflectsPersonalHistoryComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are goals and outcomes clearly documented and tailored to the individual?"
                          yesNoField="goalsDocumented"
                          commentField="goalsDocumentedComment"
                          yesNoValue={auditData.goalsDocumented}
                          commentValue={auditData.goalsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('goalsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('goalsDocumentedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are communication needs clearly documented?"
                          yesNoField="communicationNeedsDocumented"
                          commentField="communicationNeedsDocumentedComment"
                          yesNoValue={auditData.communicationNeedsDocumented}
                          commentValue={auditData.communicationNeedsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('communicationNeedsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('communicationNeedsDocumentedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are preferences for end-of-life care recorded and accessible?"
                          yesNoField="endOfLifePreferences"
                          commentField="endOfLifePreferencesComment"
                          yesNoValue={auditData.endOfLifePreferences}
                          commentValue={auditData.endOfLifePreferencesComment}
                          onYesNoChange={(value) => handleInputChange('endOfLifePreferences', value)}
                          onCommentChange={(value) => handleInputChange('endOfLifePreferencesComment', value)}
                        />
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are key risk assessments completed?"
                          yesNoField="keyRiskAssessmentsCompleted"
                          commentField="keyRiskAssessmentsCompletedComment"
                          yesNoValue={auditData.keyRiskAssessmentsCompleted}
                          commentValue={auditData.keyRiskAssessmentsCompletedComment}
                          onYesNoChange={(value) => handleInputChange('keyRiskAssessmentsCompleted', value)}
                          onCommentChange={(value) => handleInputChange('keyRiskAssessmentsCompletedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are risk levels correctly scored and explained?"
                          yesNoField="riskLevelsScored"
                          commentField="riskLevelsScoredComment"
                          yesNoValue={auditData.riskLevelsScored}
                          commentValue={auditData.riskLevelsScoredComment}
                          onYesNoChange={(value) => handleInputChange('riskLevelsScored', value)}
                          onCommentChange={(value) => handleInputChange('riskLevelsScoredComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are assessments reviewed regularly and linked to care plans?"
                          yesNoField="assessmentsReviewedLinked"
                          commentField="assessmentsReviewedLinkedComment"
                          yesNoValue={auditData.assessmentsReviewedLinked}
                          commentValue={auditData.assessmentsReviewedLinkedComment}
                          onYesNoChange={(value) => handleInputChange('assessmentsReviewedLinked', value)}
                          onCommentChange={(value) => handleInputChange('assessmentsReviewedLinkedComment', value)}
                        />
                      </div>
                    )}
                    {idx === 4 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are daily notes recorded consistently for all shifts?"
                          yesNoField="dailyNotesRecorded"
                          commentField="dailyNotesRecordedComment"
                          yesNoValue={auditData.dailyNotesRecorded}
                          commentValue={auditData.dailyNotesRecordedComment}
                          onYesNoChange={(value) => handleInputChange('dailyNotesRecorded', value)}
                          onCommentChange={(value) => handleInputChange('dailyNotesRecordedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Do entries include appropriate detail on care delivered?"
                          yesNoField="entriesIncludeDetail"
                          commentField="entriesIncludeDetailComment"
                          yesNoValue={auditData.entriesIncludeDetail}
                          commentValue={auditData.entriesIncludeDetailComment}
                          onYesNoChange={(value) => handleInputChange('entriesIncludeDetail', value)}
                          onCommentChange={(value) => handleInputChange('entriesIncludeDetailComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are logs written in a professional manner?"
                          yesNoField="logsWrittenProfessionally"
                          commentField="logsWrittenProfessionallyComment"
                          yesNoValue={auditData.logsWrittenProfessionally}
                          commentValue={auditData.logsWrittenProfessionallyComment}
                          onYesNoChange={(value) => handleInputChange('logsWrittenProfessionally', value)}
                          onCommentChange={(value) => handleInputChange('logsWrittenProfessionallyComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are missed care or refusals clearly recorded?"
                          yesNoField="missedCareRecorded"
                          commentField="missedCareRecordedComment"
                          yesNoValue={auditData.missedCareRecorded}
                          commentValue={auditData.missedCareRecordedComment}
                          onYesNoChange={(value) => handleInputChange('missedCareRecorded', value)}
                          onCommentChange={(value) => handleInputChange('missedCareRecordedComment', value)}
                        />
                      </div>
                    )}
                    {idx === 5 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are required charts completed daily?"
                          yesNoField="requiredChartsCompleted"
                          commentField="requiredChartsCompletedComment"
                          yesNoValue={auditData.requiredChartsCompleted}
                          commentValue={auditData.requiredChartsCompletedComment}
                          onYesNoChange={(value) => handleInputChange('requiredChartsCompleted', value)}
                          onCommentChange={(value) => handleInputChange('requiredChartsCompletedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are all entries timestamped and linked to staff?"
                          yesNoField="entriesTimestampedStaff"
                          commentField="entriesTimestampedStaffComment"
                          yesNoValue={auditData.entriesTimestampedStaff}
                          commentValue={auditData.entriesTimestampedStaffComment}
                          onYesNoChange={(value) => handleInputChange('entriesTimestampedStaff', value)}
                          onCommentChange={(value) => handleInputChange('entriesTimestampedStaffComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is chart data used to inform care plan updates?"
                          yesNoField="chartDataUsedInform"
                          commentField="chartDataUsedInformComment"
                          yesNoValue={auditData.chartDataUsedInform}
                          commentValue={auditData.chartDataUsedInformComment}
                          onYesNoChange={(value) => handleInputChange('chartDataUsedInform', value)}
                          onCommentChange={(value) => handleInputChange('chartDataUsedInformComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are alerts triggered appropriately?"
                          yesNoField="alertsTriggeredAppropriately"
                          commentField="alertsTriggeredAppropriatelyComment"
                          yesNoValue={auditData.alertsTriggeredAppropriately}
                          commentValue={auditData.alertsTriggeredAppropriatelyComment}
                          onYesNoChange={(value) => handleInputChange('alertsTriggeredAppropriately', value)}
                          onCommentChange={(value) => handleInputChange('alertsTriggeredAppropriatelyComment', value)}
                        />
                      </div>
                    )}
                    {idx === 6 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is the MAR chart accurate and up to date?"
                          yesNoField="marChartAccurate"
                          commentField="marChartAccurateComment"
                          yesNoValue={auditData.marChartAccurate}
                          commentValue={auditData.marChartAccurateComment}
                          onYesNoChange={(value) => handleInputChange('marChartAccurate', value)}
                          onCommentChange={(value) => handleInputChange('marChartAccurateComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are medication reviews documented?"
                          yesNoField="medicationReviewsDocumented"
                          commentField="medicationReviewsDocumentedComment"
                          yesNoValue={auditData.medicationReviewsDocumented}
                          commentValue={auditData.medicationReviewsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('medicationReviewsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('medicationReviewsDocumentedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are PRN protocols uploaded and accessible?"
                          yesNoField="prnProtocolsUploaded"
                          commentField="prnProtocolsUploadedComment"
                          yesNoValue={auditData.prnProtocolsUploaded}
                          commentValue={auditData.prnProtocolsUploadedComment}
                          onYesNoChange={(value) => handleInputChange('prnProtocolsUploaded', value)}
                          onCommentChange={(value) => handleInputChange('prnProtocolsUploadedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are refusals or side effects recorded?"
                          yesNoField="refusalsSideEffectsRecorded"
                          commentField="refusalsSideEffectsRecordedComment"
                          yesNoValue={auditData.refusalsSideEffectsRecorded}
                          commentValue={auditData.refusalsSideEffectsRecordedComment}
                          onYesNoChange={(value) => handleInputChange('refusalsSideEffectsRecorded', value)}
                          onCommentChange={(value) => handleInputChange('refusalsSideEffectsRecordedComment', value)}
                        />
                      </div>
                    )}
                    {idx === 7 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are regular observations recorded as per care plan?"
                          yesNoField="regularObservationsRecorded"
                          commentField="regularObservationsRecordedComment"
                          yesNoValue={auditData.regularObservationsRecorded}
                          commentValue={auditData.regularObservationsRecordedComment}
                          onYesNoChange={(value) => handleInputChange('regularObservationsRecorded', value)}
                          onCommentChange={(value) => handleInputChange('regularObservationsRecordedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are abnormal results flagged or escalated?"
                          yesNoField="abnormalResultsFlagged"
                          commentField="abnormalResultsFlaggedComment"
                          yesNoValue={auditData.abnormalResultsFlagged}
                          commentValue={auditData.abnormalResultsFlaggedComment}
                          onYesNoChange={(value) => handleInputChange('abnormalResultsFlagged', value)}
                          onCommentChange={(value) => handleInputChange('abnormalResultsFlaggedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are weight trends monitored and responded to?"
                          yesNoField="weightTrendsMonitored"
                          commentField="weightTrendsMonitoredComment"
                          yesNoValue={auditData.weightTrendsMonitored}
                          commentValue={auditData.weightTrendsMonitoredComment}
                          onYesNoChange={(value) => handleInputChange('weightTrendsMonitored', value)}
                          onCommentChange={(value) => handleInputChange('weightTrendsMonitoredComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are observations used to inform clinical decisions?"
                          yesNoField="observationsUsedClinicalDecisions"
                          commentField="observationsUsedClinicalDecisionsComment"
                          yesNoValue={auditData.observationsUsedClinicalDecisions}
                          commentValue={auditData.observationsUsedClinicalDecisionsComment}
                          onYesNoChange={(value) => handleInputChange('observationsUsedClinicalDecisions', value)}
                          onCommentChange={(value) => handleInputChange('observationsUsedClinicalDecisionsComment', value)}
                        />
                      </div>
                    )}
                    {idx === 8 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is the handover log updated for this resident?"
                          yesNoField="handoverLogUpdated"
                          commentField="handoverLogUpdatedComment"
                          yesNoValue={auditData.handoverLogUpdated}
                          commentValue={auditData.handoverLogUpdatedComment}
                          onYesNoChange={(value) => handleInputChange('handoverLogUpdated', value)}
                          onCommentChange={(value) => handleInputChange('handoverLogUpdatedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are changes in condition logged and communicated?"
                          yesNoField="changesConditionLogged"
                          commentField="changesConditionLoggedComment"
                          yesNoValue={auditData.changesConditionLogged}
                          commentValue={auditData.changesConditionLoggedComment}
                          onYesNoChange={(value) => handleInputChange('changesConditionLogged', value)}
                          onCommentChange={(value) => handleInputChange('changesConditionLoggedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are professional visits recorded?"
                          yesNoField="professionalVisitsRecorded"
                          commentField="professionalVisitsRecordedComment"
                          yesNoValue={auditData.professionalVisitsRecorded}
                          commentValue={auditData.professionalVisitsRecordedComment}
                          onYesNoChange={(value) => handleInputChange('professionalVisitsRecorded', value)}
                          onCommentChange={(value) => handleInputChange('professionalVisitsRecordedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are family communications recorded?"
                          yesNoField="familyCommunicationsRecorded"
                          commentField="familyCommunicationsRecordedComment"
                          yesNoValue={auditData.familyCommunicationsRecorded}
                          commentValue={auditData.familyCommunicationsRecordedComment}
                          onYesNoChange={(value) => handleInputChange('familyCommunicationsRecorded', value)}
                          onCommentChange={(value) => handleInputChange('familyCommunicationsRecordedComment', value)}
                        />
                      </div>
                    )}
                    {idx === 9 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are safeguarding concerns documented and actioned?"
                          yesNoField="safeguardingConcernsDocumented"
                          commentField="safeguardingConcernsDocumentedComment"
                          yesNoValue={auditData.safeguardingConcernsDocumented}
                          commentValue={auditData.safeguardingConcernsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('safeguardingConcernsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('safeguardingConcernsDocumentedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are incidents recorded promptly?"
                          yesNoField="incidentsRecordedPromptly"
                          commentField="incidentsRecordedPromptlyComment"
                          yesNoValue={auditData.incidentsRecordedPromptly}
                          commentValue={auditData.incidentsRecordedPromptlyComment}
                          onYesNoChange={(value) => handleInputChange('incidentsRecordedPromptly', value)}
                          onCommentChange={(value) => handleInputChange('incidentsRecordedPromptlyComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are follow-ups and investigations visible?"
                          yesNoField="followUpsInvestigationsVisible"
                          commentField="followUpsInvestigationsVisibleComment"
                          yesNoValue={auditData.followUpsInvestigationsVisible}
                          commentValue={auditData.followUpsInvestigationsVisibleComment}
                          onYesNoChange={(value) => handleInputChange('followUpsInvestigationsVisible', value)}
                          onCommentChange={(value) => handleInputChange('followUpsInvestigationsVisibleComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is there evidence of actions to reduce risk?"
                          yesNoField="actionsReduceRiskEvidence"
                          commentField="actionsReduceRiskEvidenceComment"
                          yesNoValue={auditData.actionsReduceRiskEvidence}
                          commentValue={auditData.actionsReduceRiskEvidenceComment}
                          onYesNoChange={(value) => handleInputChange('actionsReduceRiskEvidence', value)}
                          onCommentChange={(value) => handleInputChange('actionsReduceRiskEvidenceComment', value)}
                        />
                      </div>
                    )}
                    {idx === 10 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are entries timestamped and linked to user logins?"
                          yesNoField="entriesTimestampedUserLogins"
                          commentField="entriesTimestampedUserLoginsComment"
                          yesNoValue={auditData.entriesTimestampedUserLogins}
                          commentValue={auditData.entriesTimestampedUserLoginsComment}
                          onYesNoChange={(value) => handleInputChange('entriesTimestampedUserLogins', value)}
                          onCommentChange={(value) => handleInputChange('entriesTimestampedUserLoginsComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is there a clear audit trail for care plan changes?"
                          yesNoField="auditTrailCarePlanChanges"
                          commentField="auditTrailCarePlanChangesComment"
                          yesNoValue={auditData.auditTrailCarePlanChanges}
                          commentValue={auditData.auditTrailCarePlanChangesComment}
                          onYesNoChange={(value) => handleInputChange('auditTrailCarePlanChanges', value)}
                          onCommentChange={(value) => handleInputChange('auditTrailCarePlanChangesComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are overdue reviews flagged within the system?"
                          yesNoField="overdueReviewsTasksFlagged"
                          commentField="overdueReviewsTasksFlaggedComment"
                          yesNoValue={auditData.overdueReviewsTasksFlagged}
                          commentValue={auditData.overdueReviewsTasksFlaggedComment}
                          onYesNoChange={(value) => handleInputChange('overdueReviewsTasksFlagged', value)}
                          onCommentChange={(value) => handleInputChange('overdueReviewsTasksFlaggedComment', value)}
                        />
                      </div>
                    )}
                    {idx === 11 && (
                      <div className="space-y-4">
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Is consent for care and data sharing recorded?"
                          yesNoField="consentCareDataSharingRecorded"
                          commentField="consentCareDataSharingRecordedComment"
                          yesNoValue={auditData.consentCareDataSharingRecorded}
                          commentValue={auditData.consentCareDataSharingRecordedComment}
                          onYesNoChange={(value) => handleInputChange('consentCareDataSharingRecorded', value)}
                          onCommentChange={(value) => handleInputChange('consentCareDataSharingRecordedComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are DNACPR/TEP/Respect forms current?"
                          yesNoField="dnacprTepRespectFormsCurrent"
                          commentField="dnacprTepRespectFormsCurrentComment"
                          yesNoValue={auditData.dnacprTepRespectFormsCurrent}
                          commentValue={auditData.dnacprTepRespectFormsCurrentComment}
                          onYesNoChange={(value) => handleInputChange('dnacprTepRespectFormsCurrent', value)}
                          onCommentChange={(value) => handleInputChange('dnacprTepRespectFormsCurrentComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are LPA details recorded and accessible?"
                          yesNoField="lpaDetailsRecordedAccessible"
                          commentField="lpaDetailsRecordedAccessibleComment"
                          yesNoValue={auditData.lpaDetailsRecordedAccessible}
                          commentValue={auditData.lpaDetailsRecordedAccessibleComment}
                          onYesNoChange={(value) => handleInputChange('lpaDetailsRecordedAccessible', value)}
                          onCommentChange={(value) => handleInputChange('lpaDetailsRecordedAccessibleComment', value)}
                        />
                        <YesNoQuestion {...yesNoSharedProps}
                          label="Are mental capacity assessments documented?"
                          yesNoField="mentalCapacityAssessmentsDocumented"
                          commentField="mentalCapacityAssessmentsDocumentedComment"
                          yesNoValue={auditData.mentalCapacityAssessmentsDocumented}
                          commentValue={auditData.mentalCapacityAssessmentsDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('mentalCapacityAssessmentsDocumented', value)}
                          onCommentChange={(value) => handleInputChange('mentalCapacityAssessmentsDocumentedComment', value)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Final Comments section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900">Final Comments</h3>
                {renderAttachmentButton('finalComments')}
              </div>
              <Textarea
                name="finalComments"
                value={finalComments}
                onChange={(e) => setFinalComments(e.target.value)}
                placeholder="Any final comments or observations about this audit..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 h-32"
              />
              {renderAttachmentPreview('finalComments')}
            </div>

            {/* Complete Audit Button */}
            <div className="flex justify-end">
              <Button type="submit" className="px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow transition-all duration-150 font-medium disabled:opacity-50" disabled={saving}>
                {saving ? "Saving..." : "Complete Audit"}
              </Button>
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
                onClick={() => handleModalCreate(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Yes, Create Action Plan'}
              </button>
              <button
                onClick={() => handleModalCreate(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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

