'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from '@/context/workspace';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StaffSelectInput } from '@/components/audits/staff-select-input';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useAuth } from '@/hooks/use-auth';
import { saveAudit, markAuditCompletedWithSnapshot, getLatestAuditData } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

interface YesNoQuestionProps {
  label: string;
  yesNoField: keyof FireSafetyAuditData;
  commentField: keyof FireSafetyAuditData;
  yesNoValue: string;
  commentValue: string;
  onYesNoChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  attachments: Record<string, AttachmentItem[]>;
  onAddAttachments: (fieldName: string, files: FileList | null) => void;
  onRemoveAttachment: (fieldName: string, attachmentId: string) => void;
  onPreviewAttachment: (attachment: { url: string; name: string }) => void;
  hasError: (fieldName: string) => boolean;
  getFieldClassName: (fieldName: string, baseClassName: string) => string;
}

const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  label,
  yesNoField,
  commentField,
  yesNoValue,
  commentValue,
  onYesNoChange,
  onCommentChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onPreviewAttachment,
  hasError,
  getFieldClassName,
}) => {
  const fieldKey = yesNoField as string;
  const commentKey = commentField as string;
  const attachmentList = attachments[fieldKey] ?? [];

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="space-y-3">
        <div>
          <div className="flex items-start justify-between">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="ml-4 relative">
              {attachmentList.length > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                  {attachmentList.length}
                </span>
              )}
              <label
                title="Add attachment"
                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 cursor-pointer border border-transparent hover:bg-blue-100"
              >
                <input
                  type="file"
                  accept="image/*"
                  data-field-input={fieldKey}
                  onChange={(e) => {
                    onAddAttachments(fieldKey, e.target.files);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                <span className="text-xl font-bold">+</span>
              </label>
            </div>
          </div>
          <div className="flex gap-4" data-field={fieldKey}>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={fieldKey}
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
                name={fieldKey}
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
                name={fieldKey}
                value="N/A"
                checked={yesNoValue === 'N/A'}
                onChange={(e) => onYesNoChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">N/A</span>
            </label>
          </div>
          {hasError(fieldKey) && (
            <p className="text-red-500 text-sm mt-1">This field is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <Textarea
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className={getFieldClassName(
              commentKey,
              'w-full bg-white border border-gray-300 rounded-lg resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors'
            )}
            rows={2}
            placeholder="Add any comments or observations..."
          />
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {attachmentList.map((att) => (
              <div key={att.id} className="relative w-24 h-24 rounded overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => onPreviewAttachment({ url: att.url, name: att.name })}
                  className="w-full h-full"
                  title={att.name}
                >
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={() => onRemoveAttachment(fieldKey, att.id)}
                  title="Remove"
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-red-600 border border-gray-200 shadow-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FireSafetyAuditPage() {
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  // attachments: map fieldName -> array of metadata used for uploads and previews
  const [attachments, setAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const activeWorkspace = useWorkspace();
  const { user } = useAuth();
  const createdObjectUrls = useRef<Set<string>>(new Set());
  
  // Collapsible state for each section
  const [openSections, setOpenSections] = useState(() => Array(10).fill(true));

  const toggleSection = (idx: number) => {
    setOpenSections((prev: boolean[]) => prev.map((open, i) => (i === idx ? !open : open)));
  };

  // Section definitions for collapsible form
  const sections = [
    {
      label: "1. Fire Risk Assessment",
      name: "fireRiskAssessment",
      guidance: [
        "Review fire risk assessment completion and currency.",
        "Verify significant findings are addressed and documented."
      ]
    },
    {
      label: "2. Fire Detection and Alarm Systems",
      name: "fireDetection",
      guidance: [
        "Check fire alarm functionality and testing procedures.",
        "Verify staff familiarity with alarm systems."
      ]
    },
    {
      label: "3. Emergency Lighting",
      name: "emergencyLighting",
      guidance: [
        "Inspect emergency lighting installation and maintenance.",
        "Review testing records and procedures."
      ]
    },
    {
      label: "4. Fire Fighting Equipment",
      name: "fireFighting",
      guidance: [
        "Check availability and servicing of fire extinguishers.",
        "Verify staff training on equipment usage."
      ]
    },
    {
      label: "5. Means of Escape",
      name: "escapeRoutes",
      guidance: [
        "Inspect fire exits, escape routes, and fire doors.",
        "Ensure routes are clear and properly marked."
      ]
    },
    {
      label: "6. Fire Drills and Evacuation",
      name: "fireDrills",
      guidance: [
        "Review evacuation plans and drill procedures.",
        "Check PEEP plans for residents requiring assistance."
      ]
    },
    {
      label: "7. Staff Training and Competency",
      name: "staffTraining",
      guidance: [
        "Verify fire safety training completion for all staff.",
        "Check fire warden appointments and training."
      ]
    },
    {
      label: "8. Signage and Information",
      name: "signage",
      guidance: [
        "Inspect fire action notices and exit signage.",
        "Review fire logbook maintenance."
      ]
    },
    {
      label: "9. Electrical and Equipment Safety",
      name: "electricalSafety",
      guidance: [
        "Check PAT testing and electrical inspections.",
        "Verify procedures for faulty equipment reporting."
      ]
    },
    {
      label: "10. Housekeeping and Fire Prevention",
      name: "housekeeping",
      guidance: [
        "Inspect storage of flammable materials.",
        "Review smoking policies and hazard reporting procedures."
      ]
    }
  ];

  // Helper function to check if field has error
  const hasError = useCallback((fieldName: string) => errors.includes(fieldName), [errors]);
  
  // Helper function to get error styling
  const getFieldClassName = useCallback((fieldName: string, baseClassName: string) => {
    return hasError(fieldName)
      ? `${baseClassName} border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500`
      : baseClassName;
  }, [hasError]);
  
  const [auditData, setAuditData] = useState<FireSafetyAuditData>({
    home: activeWorkspace?.name ?? '',
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

  useEffect(() => {
    if (!activeWorkspace?.name) return;
    if (auditData.home && auditData.home.trim().length > 0) return;
    setAuditData(prev => ({ ...prev, home: activeWorkspace.name }));
  }, [activeWorkspace?.name, auditData.home]);

  // Load existing audit data when component mounts
  useEffect(() => {
    let cancelled = false;
    const loadExistingAuditData = async () => {
      if (!activeWorkspace?.id) {
        return;
      }

      setAttachments({});
      setAttachmentsToDelete([]);

      try {
        const existingData = await getLatestAuditData(
          activeWorkspace.id,
          'fire-safety',
          undefined,
          activeWorkspace.organisationId || null
        );
        if (existingData) {
          // Remove metadata fields and populate form
          const { id, createdAt, snapshotCreatedAt, monthKey, year, month, attachments: storedAttachments, ...formData } = existingData as any;
          if (!cancelled) {
            setAuditData(prevData => ({
              ...prevData,
              ...formData
            }));
          }

          if (!cancelled && existingData.comments) {
            setFinalComments(existingData.comments);
          }

          if (storedAttachments && typeof storedAttachments === 'object') {
            const processedEntries: Array<[string, AttachmentItem[]]> = [];
            for (const [fieldName, list] of Object.entries(storedAttachments)) {
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
        }
      } catch (error) {
        console.error('Failed to load existing fire-safety audit data:', error);
      }
    };

    loadExistingAuditData();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.id, activeWorkspace?.organisationId]);

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

  // Attachment handlers
  const handleAddAttachments = (fieldName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setAttachments(prev => {
      const existing = prev[fieldName] ?? [];
      const added = fileArray.map(file => {
        const blobUrl = URL.createObjectURL(file);
        createdObjectUrls.current.add(blobUrl);
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${fieldName}-${Date.now()}-${file.name}`;
        return { id, url: blobUrl, name: file.name, file } as AttachmentItem;
      });
      return { ...prev, [fieldName]: [...existing, ...added] };
    });
  };

  const handleRemoveAttachment = (fieldName: string, id: string) => {
    setAttachments(prev => {
      const list = prev[fieldName] ?? [];
      const removed = list.find(a => a.id === id);
      if (!removed) return prev;

      if (removed.url && removed.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch (e) {
          console.warn('Failed to revoke object URL', e);
        }
        createdObjectUrls.current.delete(removed.url);
      }

      if (removed.storagePath) {
        setAttachmentsToDelete(prevDeletes => [...prevDeletes, removed.storagePath as string]);
      }

      if (previewImage && previewImage.url === removed.url) {
        setPreviewImage(null);
      }

      const remaining = list.filter(a => a.id !== id);
      const next = { ...prev };
      if (remaining.length > 0) {
        next[fieldName] = remaining;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  };

  const handlePreviewAttachment = useCallback((attachment: { url: string; name: string }) => {
    setPreviewImage({ url: attachment.url, name: attachment.name });
  }, [setPreviewImage]);

  // preview keyboard close (ESC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    return () => {
      createdObjectUrls.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn('Failed to revoke object URL', err);
        }
      });
      createdObjectUrls.current.clear();
    };
  }, []);

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

  const uploadAttachmentFile = async (fieldName: string, file: File) => {
    if (!activeWorkspace?.id) {
      throw new Error('Workspace not available for attachment upload');
    }
    const orgId = activeWorkspace.organisationId || null;
    const fieldSegment = fieldName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'field';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const auditDateSegment = (auditData.date || new Date().toISOString().split('T')[0]).replace(/[^0-9-]/g, '');
    const timestamp = Date.now();
    const basePath = orgId
      ? `organisations/${orgId}/workspaces/${activeWorkspace.id}`
      : `workspaces/${activeWorkspace.id}`;
    const storagePath = `${basePath}/audit-attachments/fire-safety/${auditDateSegment}/${fieldSegment}/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { storagePath, downloadUrl };
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

      const orgId = activeWorkspace.organisationId || null;
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
            const stored: AttachmentItem = {
              id: item.id,
              name: item.name,
              url: downloadUrl,
              storagePath,
              downloadUrl
            };
            processed.push(stored);
            if (!attachmentsMetadata[fieldName]) {
              attachmentsMetadata[fieldName] = [];
            }
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath, downloadUrl });
          } else if (item.storagePath) {
            const downloadUrl = item.downloadUrl || item.url;
            if (!attachmentsMetadata[fieldName]) {
              attachmentsMetadata[fieldName] = [];
            }
            attachmentsMetadata[fieldName].push({ name: item.name, storagePath: item.storagePath, downloadUrl });
            processed.push({
              id: item.id,
              name: item.name,
              url: downloadUrl,
              storagePath: item.storagePath,
              downloadUrl
            });
          }
        }
        if (processed.length > 0) {
          nextAttachmentState[fieldName] = processed;
        }
      }

      if (attachmentsToDelete.length > 0) {
        const uniquePaths = Array.from(new Set(attachmentsToDelete));
        for (const storagePath of uniquePaths) {
          try {
            await deleteObject(ref(storage, storagePath));
          } catch (err) {
            console.warn('Failed to delete removed attachment from storage', err);
          }
        }
      }

      const attachmentsPayload = Object.keys(attachmentsMetadata).length > 0 ? attachmentsMetadata : undefined;

      const payload = {
        ...auditData,
        ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
        comments: finalComments,
        createActionPlan,
        createdBy: user?.id ?? null,
        workspaceId: activeWorkspace.id,
        auditType: 'fire-safety',
        scorePercent,
        yesCount,
        totalCount,
        organisationId: orgId
      };

      await saveAudit(payload, activeWorkspace.id, orgId);
      await markAuditCompletedWithSnapshot(activeWorkspace.id, 'fire-safety', payload, auditData.date || new Date().toISOString());

      setAttachments(nextAttachmentState);
      setAttachmentsToDelete([]);
  setPreviewImage(null);
      alert('Audit completed and saved');
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save audit', e);
      alert('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  const yesNoSharedProps = {
    attachments,
    onAddAttachments: handleAddAttachments,
    onRemoveAttachment: handleRemoveAttachment,
    onPreviewAttachment: handlePreviewAttachment,
    hasError,
    getFieldClassName,
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  return (
  <div className="w-full p-10 bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl mt-10 border border-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left panel for details, sticky and NOT part of the form */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-white rounded-2xl p-10 border border-slate-200 shadow-xl mb-8 lg:mb-0 lg:sticky lg:top-10 self-start h-fit">
          <h1 className="text-3xl font-extrabold mb-2 text-blue-900 tracking-tight">Fire Safety Audit</h1>
          <p className="mb-4 text-slate-500">Complete this comprehensive audit to check fire safety compliance and emergency preparedness. All fields are required.</p>
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
                className={getFieldClassName('date', "w-full")}
                name="date"
                value={auditData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
              {hasError('date') && <p className="text-red-500 text-xs mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Person Completing Audit</label>
              <StaffSelectInput
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
          </div>
        </div>
  {/* Main form right column, scrolls with page like care-plan */}
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
                        <YesNoQuestion
                          label="Has a fire risk assessment been completed within the last 12 months?"
                          yesNoField="fireRiskAssessmentCompleted"
                          commentField="fireRiskAssessmentCompletedComment"
                          yesNoValue={auditData.fireRiskAssessmentCompleted}
                          commentValue={auditData.fireRiskAssessmentCompletedComment}
                          onYesNoChange={(value) => handleInputChange('fireRiskAssessmentCompleted', value)}
                          onCommentChange={(value) => handleInputChange('fireRiskAssessmentCompletedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Is the fire risk assessment reviewed regularly or following any significant changes?"
                          yesNoField="fireRiskAssessmentReviewed"
                          commentField="fireRiskAssessmentReviewedComment"
                          yesNoValue={auditData.fireRiskAssessmentReviewed}
                          commentValue={auditData.fireRiskAssessmentReviewedComment}
                          onYesNoChange={(value) => handleInputChange('fireRiskAssessmentReviewed', value)}
                          onCommentChange={(value) => handleInputChange('fireRiskAssessmentReviewedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are all significant findings from the fire risk assessment acted upon and documented?"
                          yesNoField="significantFindingsActioned"
                          commentField="significantFindingsActionedComment"
                          yesNoValue={auditData.significantFindingsActioned}
                          commentValue={auditData.significantFindingsActionedComment}
                          onYesNoChange={(value) => handleInputChange('significantFindingsActioned', value)}
                          onCommentChange={(value) => handleInputChange('significantFindingsActionedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Is the fire risk assessment accessible to staff and relevant authorities?"
                          yesNoField="fireRiskAssessmentAccessible"
                          commentField="fireRiskAssessmentAccessibleComment"
                          yesNoValue={auditData.fireRiskAssessmentAccessible}
                          commentValue={auditData.fireRiskAssessmentAccessibleComment}
                          onYesNoChange={(value) => handleInputChange('fireRiskAssessmentAccessible', value)}
                          onCommentChange={(value) => handleInputChange('fireRiskAssessmentAccessibleComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Is there a functioning fire alarm system in place?"
                          yesNoField="functioningFireAlarm"
                          commentField="functioningFireAlarmComment"
                          yesNoValue={auditData.functioningFireAlarm}
                          commentValue={auditData.functioningFireAlarmComment}
                          onYesNoChange={(value) => handleInputChange('functioningFireAlarm', value)}
                          onCommentChange={(value) => handleInputChange('functioningFireAlarmComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are fire alarms tested weekly and records kept?"
                          yesNoField="fireAlarmsTestedWeekly"
                          commentField="fireAlarmsTestedWeeklyComment"
                          yesNoValue={auditData.fireAlarmsTestedWeekly}
                          commentValue={auditData.fireAlarmsTestedWeeklyComment}
                          onYesNoChange={(value) => handleInputChange('fireAlarmsTestedWeekly', value)}
                          onCommentChange={(value) => handleInputChange('fireAlarmsTestedWeeklyComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are all staff familiar with the sound of the fire alarm?"
                          yesNoField="staffFamiliarAlarmSound"
                          commentField="staffFamiliarAlarmSoundComment"
                          yesNoValue={auditData.staffFamiliarAlarmSound}
                          commentValue={auditData.staffFamiliarAlarmSoundComment}
                          onYesNoChange={(value) => handleInputChange('staffFamiliarAlarmSound', value)}
                          onCommentChange={(value) => handleInputChange('staffFamiliarAlarmSoundComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are visual alarms in place where needed (e.g. for residents with hearing impairments)?"
                          yesNoField="visualAlarmsInPlace"
                          commentField="visualAlarmsInPlaceComment"
                          yesNoValue={auditData.visualAlarmsInPlace}
                          commentValue={auditData.visualAlarmsInPlaceComment}
                          onYesNoChange={(value) => handleInputChange('visualAlarmsInPlace', value)}
                          onCommentChange={(value) => handleInputChange('visualAlarmsInPlaceComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Is emergency lighting installed throughout all escape routes?"
                          yesNoField="emergencyLightingInstalled"
                          commentField="emergencyLightingInstalledComment"
                          yesNoValue={auditData.emergencyLightingInstalled}
                          commentValue={auditData.emergencyLightingInstalledComment}
                          onYesNoChange={(value) => handleInputChange('emergencyLightingInstalled', value)}
                          onCommentChange={(value) => handleInputChange('emergencyLightingInstalledComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Is emergency lighting tested monthly and records maintained?"
                          yesNoField="emergencyLightingTestedMonthly"
                          commentField="emergencyLightingTestedMonthlyComment"
                          yesNoValue={auditData.emergencyLightingTestedMonthly}
                          commentValue={auditData.emergencyLightingTestedMonthlyComment}
                          onYesNoChange={(value) => handleInputChange('emergencyLightingTestedMonthly', value)}
                          onCommentChange={(value) => handleInputChange('emergencyLightingTestedMonthlyComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Has a full emergency lighting test been completed within the last year?"
                          yesNoField="fullEmergencyLightingTest"
                          commentField="fullEmergencyLightingTestComment"
                          yesNoValue={auditData.fullEmergencyLightingTest}
                          commentValue={auditData.fullEmergencyLightingTestComment}
                          onYesNoChange={(value) => handleInputChange('fullEmergencyLightingTest', value)}
                          onCommentChange={(value) => handleInputChange('fullEmergencyLightingTestComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Are appropriate fire extinguishers available in key locations?"
                          yesNoField="fireExtinguishersAvailable"
                          commentField="fireExtinguishersAvailableComment"
                          yesNoValue={auditData.fireExtinguishersAvailable}
                          commentValue={auditData.fireExtinguishersAvailableComment}
                          onYesNoChange={(value) => handleInputChange('fireExtinguishersAvailable', value)}
                          onCommentChange={(value) => handleInputChange('fireExtinguishersAvailableComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are all fire extinguishers serviced annually?"
                          yesNoField="fireExtinguishersServiced"
                          commentField="fireExtinguishersServicedComment"
                          yesNoValue={auditData.fireExtinguishersServiced}
                          commentValue={auditData.fireExtinguishersServicedComment}
                          onYesNoChange={(value) => handleInputChange('fireExtinguishersServiced', value)}
                          onCommentChange={(value) => handleInputChange('fireExtinguishersServicedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are fire blankets provided in kitchen areas?"
                          yesNoField="fireBlankets"
                          commentField="fireBlanketsComment"
                          yesNoValue={auditData.fireBlankets}
                          commentValue={auditData.fireBlanketsComment}
                          onYesNoChange={(value) => handleInputChange('fireBlankets', value)}
                          onCommentChange={(value) => handleInputChange('fireBlanketsComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Do staff know how to use fire extinguishers safely?"
                          yesNoField="staffKnowExtinguisherUse"
                          commentField="staffKnowExtinguisherUseComment"
                          yesNoValue={auditData.staffKnowExtinguisherUse}
                          commentValue={auditData.staffKnowExtinguisherUseComment}
                          onYesNoChange={(value) => handleInputChange('staffKnowExtinguisherUse', value)}
                          onCommentChange={(value) => handleInputChange('staffKnowExtinguisherUseComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 4 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Are all fire exits clearly marked and unobstructed?"
                          yesNoField="fireExitsMarked"
                          commentField="fireExitsMarkedComment"
                          yesNoValue={auditData.fireExitsMarked}
                          commentValue={auditData.fireExitsMarkedComment}
                          onYesNoChange={(value) => handleInputChange('fireExitsMarked', value)}
                          onCommentChange={(value) => handleInputChange('fireExitsMarkedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are escape routes kept clear at all times?"
                          yesNoField="escapeRoutesClear"
                          commentField="escapeRoutesClearComment"
                          yesNoValue={auditData.escapeRoutesClear}
                          commentValue={auditData.escapeRoutesClearComment}
                          onYesNoChange={(value) => handleInputChange('escapeRoutesClear', value)}
                          onCommentChange={(value) => handleInputChange('escapeRoutesClearComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are fire doors kept closed (not wedged open) and functioning properly?"
                          yesNoField="fireDoorsProper"
                          commentField="fireDoorsProperComment"
                          yesNoValue={auditData.fireDoorsProper}
                          commentValue={auditData.fireDoorsProperComment}
                          onYesNoChange={(value) => handleInputChange('fireDoorsProper', value)}
                          onCommentChange={(value) => handleInputChange('fireDoorsProperComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are escape route floor surfaces free from trip hazards?"
                          yesNoField="escapeRouteSurfaces"
                          commentField="escapeRouteSurfacesComment"
                          yesNoValue={auditData.escapeRouteSurfaces}
                          commentValue={auditData.escapeRouteSurfacesComment}
                          onYesNoChange={(value) => handleInputChange('escapeRouteSurfaces', value)}
                          onCommentChange={(value) => handleInputChange('escapeRouteSurfacesComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 5 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Is there a documented fire evacuation plan specific to the building layout and resident needs?"
                          yesNoField="evacuationPlanDocumented"
                          commentField="evacuationPlanDocumentedComment"
                          yesNoValue={auditData.evacuationPlanDocumented}
                          commentValue={auditData.evacuationPlanDocumentedComment}
                          onYesNoChange={(value) => handleInputChange('evacuationPlanDocumented', value)}
                          onCommentChange={(value) => handleInputChange('evacuationPlanDocumentedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Have fire drills been conducted at least twice per year?"
                          yesNoField="fireDrillsConducted"
                          commentField="fireDrillsConductedComment"
                          yesNoValue={auditData.fireDrillsConducted}
                          commentValue={auditData.fireDrillsConductedComment}
                          onYesNoChange={(value) => handleInputChange('fireDrillsConducted', value)}
                          onCommentChange={(value) => handleInputChange('fireDrillsConductedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are all staff trained in evacuation procedures, including use of evacuation equipment?"
                          yesNoField="staffTrainedEvacuation"
                          commentField="staffTrainedEvacuationComment"
                          yesNoValue={auditData.staffTrainedEvacuation}
                          commentValue={auditData.staffTrainedEvacuationComment}
                          onYesNoChange={(value) => handleInputChange('staffTrainedEvacuation', value)}
                          onCommentChange={(value) => handleInputChange('staffTrainedEvacuationComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are Personal Emergency Evacuation Plans (PEEPs) in place for all residents who need them?"
                          yesNoField="peepsInPlace"
                          commentField="peepsInPlaceComment"
                          yesNoValue={auditData.peepsInPlace}
                          commentValue={auditData.peepsInPlaceComment}
                          onYesNoChange={(value) => handleInputChange('peepsInPlace', value)}
                          onCommentChange={(value) => handleInputChange('peepsInPlaceComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 6 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Have all staff received fire safety training within the last 12 months?"
                          yesNoField="staffFireSafetyTraining"
                          commentField="staffFireSafetyTrainingComment"
                          yesNoValue={auditData.staffFireSafetyTraining}
                          commentValue={auditData.staffFireSafetyTrainingComment}
                          onYesNoChange={(value) => handleInputChange('staffFireSafetyTraining', value)}
                          onCommentChange={(value) => handleInputChange('staffFireSafetyTrainingComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Do staff understand their roles in the event of a fire?"
                          yesNoField="staffUnderstandRoles"
                          commentField="staffUnderstandRolesComment"
                          yesNoValue={auditData.staffUnderstandRoles}
                          commentValue={auditData.staffUnderstandRolesComment}
                          onYesNoChange={(value) => handleInputChange('staffUnderstandRoles', value)}
                          onCommentChange={(value) => handleInputChange('staffUnderstandRolesComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are new staff trained in fire safety during their induction?"
                          yesNoField="newStaffTrained"
                          commentField="newStaffTrainedComment"
                          yesNoValue={auditData.newStaffTrained}
                          commentValue={auditData.newStaffTrainedComment}
                          onYesNoChange={(value) => handleInputChange('newStaffTrained', value)}
                          onCommentChange={(value) => handleInputChange('newStaffTrainedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are fire wardens/marshals appointed and trained?"
                          yesNoField="fireWardensAppointed"
                          commentField="fireWardensAppointedComment"
                          yesNoValue={auditData.fireWardensAppointed}
                          commentValue={auditData.fireWardensAppointedComment}
                          onYesNoChange={(value) => handleInputChange('fireWardensAppointed', value)}
                          onCommentChange={(value) => handleInputChange('fireWardensAppointedComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 7 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Are fire action notices displayed in key areas?"
                          yesNoField="fireActionNotices"
                          commentField="fireActionNoticesComment"
                          yesNoValue={auditData.fireActionNotices}
                          commentValue={auditData.fireActionNoticesComment}
                          onYesNoChange={(value) => handleInputChange('fireActionNotices', value)}
                          onCommentChange={(value) => handleInputChange('fireActionNoticesComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are fire exit signs illuminated and clearly visible?"
                          yesNoField="fireExitSigns"
                          commentField="fireExitSignsComment"
                          yesNoValue={auditData.fireExitSigns}
                          commentValue={auditData.fireExitSignsComment}
                          onYesNoChange={(value) => handleInputChange('fireExitSigns', value)}
                          onCommentChange={(value) => handleInputChange('fireExitSignsComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Is a fire assembly point clearly marked and known by staff?"
                          yesNoField="assemblyPointMarked"
                          commentField="assemblyPointMarkedComment"
                          yesNoValue={auditData.assemblyPointMarked}
                          commentValue={auditData.assemblyPointMarkedComment}
                          onYesNoChange={(value) => handleInputChange('assemblyPointMarked', value)}
                          onCommentChange={(value) => handleInputChange('assemblyPointMarkedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Is the fire logbook up to date and available for inspection?"
                          yesNoField="fireLogbookUpToDate"
                          commentField="fireLogbookUpToDateComment"
                          yesNoValue={auditData.fireLogbookUpToDate}
                          commentValue={auditData.fireLogbookUpToDateComment}
                          onYesNoChange={(value) => handleInputChange('fireLogbookUpToDate', value)}
                          onCommentChange={(value) => handleInputChange('fireLogbookUpToDateComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 8 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Has portable appliance testing (PAT) been carried out on all electrical equipment?"
                          yesNoField="patTestingCompleted"
                          commentField="patTestingCompletedComment"
                          yesNoValue={auditData.patTestingCompleted}
                          commentValue={auditData.patTestingCompletedComment}
                          onYesNoChange={(value) => handleInputChange('patTestingCompleted', value)}
                          onCommentChange={(value) => handleInputChange('patTestingCompletedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are fixed wiring installations inspected and tested at least every 5 years?"
                          yesNoField="fixedWiringInspected"
                          commentField="fixedWiringInspectedComment"
                          yesNoValue={auditData.fixedWiringInspected}
                          commentValue={auditData.fixedWiringInspectedComment}
                          onYesNoChange={(value) => handleInputChange('fixedWiringInspected', value)}
                          onCommentChange={(value) => handleInputChange('fixedWiringInspectedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are electrical panels and equipment kept secure and unobstructed?"
                          yesNoField="electricalPanelsSecure"
                          commentField="electricalPanelsSecureComment"
                          yesNoValue={auditData.electricalPanelsSecure}
                          commentValue={auditData.electricalPanelsSecureComment}
                          onYesNoChange={(value) => handleInputChange('electricalPanelsSecure', value)}
                          onCommentChange={(value) => handleInputChange('electricalPanelsSecureComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are staff instructed to report and remove faulty electrical equipment?"
                          yesNoField="staffInstructedFaultyEquipment"
                          commentField="staffInstructedFaultyEquipmentComment"
                          yesNoValue={auditData.staffInstructedFaultyEquipment}
                          commentValue={auditData.staffInstructedFaultyEquipmentComment}
                          onYesNoChange={(value) => handleInputChange('staffInstructedFaultyEquipment', value)}
                          onCommentChange={(value) => handleInputChange('staffInstructedFaultyEquipmentComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                    {idx === 9 && (
                      <div className="space-y-4">
                        <YesNoQuestion
                          label="Are flammable materials stored safely and away from heat sources?"
                          yesNoField="flammableMaterialsStored"
                          commentField="flammableMaterialsStoredComment"
                          yesNoValue={auditData.flammableMaterialsStored}
                          commentValue={auditData.flammableMaterialsStoredComment}
                          onYesNoChange={(value) => handleInputChange('flammableMaterialsStored', value)}
                          onCommentChange={(value) => handleInputChange('flammableMaterialsStoredComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are smoking policies clearly enforced and smoking areas controlled?"
                          yesNoField="smokingPoliciesEnforced"
                          commentField="smokingPoliciesEnforcedComment"
                          yesNoValue={auditData.smokingPoliciesEnforced}
                          commentValue={auditData.smokingPoliciesEnforcedComment}
                          onYesNoChange={(value) => handleInputChange('smokingPoliciesEnforced', value)}
                          onCommentChange={(value) => handleInputChange('smokingPoliciesEnforcedComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are linen and waste storage areas regularly cleared and well-maintained?"
                          yesNoField="linenWasteStorage"
                          commentField="linenWasteStorageComment"
                          yesNoValue={auditData.linenWasteStorage}
                          commentValue={auditData.linenWasteStorageComment}
                          onYesNoChange={(value) => handleInputChange('linenWasteStorage', value)}
                          onCommentChange={(value) => handleInputChange('linenWasteStorageComment', value)}
                          {...yesNoSharedProps}
                        />
                        <YesNoQuestion
                          label="Are staff aware of procedures for reporting fire hazards?"
                          yesNoField="staffAwareReportingHazards"
                          commentField="staffAwareReportingHazardsComment"
                          yesNoValue={auditData.staffAwareReportingHazards}
                          commentValue={auditData.staffAwareReportingHazardsComment}
                          onYesNoChange={(value) => handleInputChange('staffAwareReportingHazards', value)}
                          onCommentChange={(value) => handleInputChange('staffAwareReportingHazardsComment', value)}
                          {...yesNoSharedProps}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {/* Final Comments section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Final Comments</h3>
              <Textarea
                name="finalComments"
                value={finalComments}
                onChange={(e) => setFinalComments(e.target.value)}
                placeholder="Any final comments or observations about this audit..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 h-32"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCompleteAudit}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                disabled={saving}
              >
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
      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setPreviewImage(null)} />
          <div className="relative z-70 max-w-3xl w-full mx-4">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <div className="flex justify-between items-start p-2 border-b">
                <div className="px-3 py-1 text-sm text-gray-700">{previewImage.name}</div>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="m-2 bg-white rounded-full p-1 text-gray-700 border"
                >
                  Close
                </button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center">
                <img src={previewImage.url} alt={previewImage.name} className="max-h-[80vh] w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}