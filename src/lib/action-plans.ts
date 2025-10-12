import { collection, doc, getDocs, getDoc, query, where, orderBy, limit, Timestamp, setDoc, updateDoc, collection as collectionFn } from 'firebase/firestore';
import { db } from './firebase';
import { workspaceCollectionPath, workspaceDocPath } from './paths';
import { finalizeActionPlan as finalizeActionPlanServer, sendActionPlanAssignmentEmail } from '@/actions/action-plans';

/**
 * Resolve assignee keys (emails, user ids, team-<id>, category-<id>) to an array of email addresses.
 */
async function resolveAssigneeEmails(workspaceId: string, assigneeKey?: string): Promise<string[]> {
  if (!assigneeKey) return [];

  // Direct email
  if (assigneeKey.includes('@')) return [assigneeKey];

  // team-<id> -> lookup workspace teams members (stored in workspace teams docs)
  if (assigneeKey.startsWith('team-')) {
    const teamId = assigneeKey.replace('team-', '');
    try {
    const teamRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'teams')), teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const t = teamSnap.data() as any;
        // team doc expected to have members: [{id, email}, ...] or memberIds
        if (Array.isArray(t.members)) {
          return t.members.map((m: any) => m.email).filter(Boolean);
        }
        if (Array.isArray(t.memberIds)) {
          // resolve memberIds to emails
          const emails: string[] = [];
          for (const id of t.memberIds) {
            try {
              const uRef = doc(db, 'users', id);
              const uSnap = await getDoc(uRef);
              if (uSnap.exists()) {
                const u = uSnap.data() as any;
                if (u.email) emails.push(u.email);
              }
            } catch (e) {
              console.warn('Failed to resolve team member email', e);
            }
          }
          return emails;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve team', e);
    }
    return [];
  }

  // category-<staffId> or just staffId -> try user doc
  try {
    // If the key is of the form '<category>-<id>' (e.g. 'managers-abc123'), extract the id
    let possibleUserId = assigneeKey;
    const dashIndex = assigneeKey.indexOf('-');
    if (dashIndex > 0) {
      possibleUserId = assigneeKey.slice(dashIndex + 1);
    }

    const userRef = doc(db, 'users', possibleUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const u = userSnap.data() as any;
      if (u.email) return [u.email];
    }
  } catch (e) {
    console.warn('Failed to resolve user email', e);
  }

  // Fallback: some workspaces store staff lists inside the workspace document (managers, nurses, etc).
  // If the earlier user lookup failed and the assigneeKey was category-<id>, try to find the email in workspace fields.
  try {
    const dashIndex = assigneeKey.indexOf('-');
    if (dashIndex > 0) {
      const possibleUserId = assigneeKey.slice(dashIndex + 1);
    const workspaceRef = doc(db, workspaceDocPath(workspaceId));
      const wsSnap = await getDoc(workspaceRef);
      if (wsSnap.exists()) {
        const ws = wsSnap.data() as any;
        const staffCategories = ['managers','nurses','ctms','domestics','maintenances','kitchens','activities'];
        for (const cat of staffCategories) {
          const list = ws[cat];
          if (Array.isArray(list)) {
            const found = list.find((s: any) => (s && (s.id === possibleUserId || s.uid === possibleUserId || s.email === possibleUserId)));
            if (found && found.email) {
              return [found.email];
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to resolve assignee from workspace staff lists', e);
  }

  return [];
}

export interface ActionPlanItem {
  id: string;
  auditType: string;
  auditId: string;
  question: string;
  issue: string;
  comment: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
  assignedTo?: string;
  assignedTeam?: string;
  ragRating?: 'red' | 'amber' | 'green';
  dueDate?: string;
}

export interface MonthlyActionPlan {
  id: string;
  workspaceId: string;
  monthKey: string; // e.g., "2025-09"
  items: ActionPlanItem[];
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  isComplete: boolean;
}

/**
 * Generate action plan items from audit data
 */
export function generateActionPlanItemsFromAudit(auditData: any, auditType: string, auditId: string): ActionPlanItem[] {
  const items: ActionPlanItem[] = [];
  const auditDate = auditData.date || auditData.auditDate || new Date().toISOString();

  // Define question mappings for different audit types with correction guidance
  const questionMappings: Record<string, Record<string, { question: string; correction: string }>> = {
    'infection-control': {
      'hh_facilities_available': {
        question: 'Are hand hygiene facilities (sinks, soap, paper towels) available and accessible in all key areas?',
        correction: 'Install or repair hand hygiene facilities in all key areas including sinks, soap dispensers, and paper towel dispensers'
      },
      'hh_audits_completed': {
        question: 'Are hand hygiene audits completed with staff?',
        correction: 'Schedule and complete regular hand hygiene audits with all staff members'
      },
      'hh_alcohol_available': {
        question: 'Are alcohol-based hand rubs available at points of care and communal areas?',
        correction: 'Stock alcohol-based hand rubs at all points of care and communal areas'
      },
      'hh_staff_observed': {
        question: 'Are staff observed performing hand hygiene at appropriate times?',
        correction: 'Monitor and ensure staff perform hand hygiene before/after resident contact and at appropriate times'
      },
      'hh_posters_displayed': {
        question: 'Are posters promoting hand hygiene displayed appropriately?',
        correction: 'Display hand hygiene posters in all relevant areas including staff rooms and communal spaces'
      },
      'hh_residents_supported': {
        question: 'Are residents supported or encouraged to perform hand hygiene?',
        correction: 'Implement procedures to support and encourage resident hand hygiene, especially before meals'
      },
      'ppe_available_stored': {
        question: 'Is PPE (gloves, aprons, masks, eye protection) available and stored correctly?',
        correction: 'Ensure all PPE is available, properly stored, and easily accessible'
      },
      'ppe_staff_trained': {
        question: 'Are staff trained in the correct use of PPE?',
        correction: 'Provide training for all staff on correct PPE usage and disposal'
      },
      'ppe_staff_wearing_correctly': {
        question: 'Are staff wearing PPE correctly and changing it between tasks/residents?',
        correction: 'Monitor and correct PPE usage - ensure staff wear appropriate PPE and change between tasks'
      },
      'ppe_disposal_bins': {
        question: 'Are appropriate PPE disposal bins available and used correctly?',
        correction: 'Install appropriate PPE disposal bins and ensure correct usage by all staff'
      },
      'cleaning_schedules': {
        question: 'Are cleaning schedules in place and up to date for all areas?',
        correction: 'Create and maintain up-to-date cleaning schedules for all areas'
      },
      'communal_areas_clean': {
        question: 'Are communal areas visibly clean and free from clutter?',
        correction: 'Clean all communal areas and remove clutter regularly'
      },
      'frequently_touched_cleaned': {
        question: 'Are frequently touched surfaces cleaned regularly?',
        correction: 'Implement regular cleaning schedule for frequently touched surfaces (door handles, handrails, etc.)'
      },
      'cleaning_equipment_stored': {
        question: 'Is cleaning equipment stored appropriately?',
        correction: 'Store cleaning equipment in designated areas with proper color-coding'
      },
      'laundry_procedures': {
        question: 'Are laundry procedures being followed correctly?',
        correction: 'Review and ensure laundry procedures are followed including separate storage and PPE usage'
      },
      'clinical_waste_correct_bins': {
        question: 'Is clinical waste disposed of in the correct bins?',
        correction: 'Ensure clinical waste is disposed of in yellow/orange bins only'
      },
      'bins_emptied_cleaned': {
        question: 'Are bins emptied regularly and cleaned?',
        correction: 'Establish regular bin emptying and cleaning schedule'
      },
      'waste_storage_clean_secure': {
        question: 'Are waste storage areas clean and secure?',
        correction: 'Clean waste storage areas and ensure they are secure'
      },
      'isolation_procedures': {
        question: 'Are isolation procedures in place for suspected/confirmed infection?',
        correction: 'Develop and implement isolation procedures for infectious residents'
      },
      'care_plans_updated': {
        question: 'Are care plans updated to reflect infection risk?',
        correction: 'Update care plans to include infection prevention measures'
      },
      'staff_trained_identify_report': {
        question: 'Are staff trained to identify and report infection signs?',
        correction: 'Train staff to identify and report signs of infection'
      },
      'visiting_policies_aligned': {
        question: 'Are visiting policies aligned with infection control guidance?',
        correction: 'Update visiting policies to align with current infection control guidance'
      },
      'staff_ipc_training': {
        question: 'Have staff received up-to-date IPC training?',
        correction: 'Provide up-to-date infection prevention and control training for all staff'
      },
      'audits_spot_checks': {
        question: 'Are infection control audits/spot checks conducted regularly?',
        correction: 'Implement regular infection control audits and spot checks'
      },
      'poor_practices_addressed': {
        question: 'Are poor practices addressed through supervision/retraining?',
        correction: 'Address poor practices through supervision and additional training'
      },
      'outbreak_policy': {
        question: 'Is there an outbreak policy in place and known to staff?',
        correction: 'Develop outbreak policy and ensure all staff are aware of it'
      },
      'outbreaks_reported': {
        question: 'Are incidents/outbreaks reported to appropriate authorities?',
        correction: 'Establish procedures for reporting outbreaks to UKHSA/CQC'
      },
      'outbreak_records_kept': {
        question: 'Are outbreak records and logs maintained?',
        correction: 'Maintain detailed records and logs of all outbreaks'
      },
      'ipc_policies_up_to_date': {
        question: 'Are IPC policies up to date and reviewed regularly?',
        correction: 'Review and update infection control policies regularly'
      },
      'cleaning_records_maintained': {
        question: 'Are cleaning records maintained and signed?',
        correction: 'Maintain signed cleaning records for all areas'
      },
      'incidents_linked_to_infection': {
        question: 'Are incidents linked to infection recorded properly?',
        correction: 'Record all incidents linked to infection with proper documentation'
      }
    },
    'care-plan': {
      'personalInfoComplete': {
        question: 'Is personal information complete and up to date?',
        correction: 'Complete and update all personal information in resident records'
      },
      'photographUpToDate': {
        question: 'Is the photograph up to date and appropriate?',
        correction: 'Update resident photographs to current and appropriate images'
      },
      'digitalProfileComplete': {
        question: 'Is the digital profile complete and accessible?',
        correction: 'Complete digital profiles and ensure accessibility for all staff'
      },
      'carePlanAccessible': {
        question: 'Is the care plan accessible to all relevant staff?',
        correction: 'Ensure care plans are accessible to all relevant staff members'
      },
      'carePlanReviewed30Days': {
        question: 'Has the care plan been reviewed within the last 30 days?',
        correction: 'Review care plan within 30 days and document the review'
      },
      'allCarePlansInPlace': {
        question: 'Are all required care plans in place?',
        correction: 'Create and implement all required care plans'
      },
      'allSectionsUpdated': {
        question: 'Are all sections of the care plan updated as required?',
        correction: 'Update all sections of the care plan as required'
      },
      'reflectsPersonalHistory': {
        question: 'Does the care plan reflect personal history and preferences?',
        correction: 'Update care plan to reflect resident\'s personal history and preferences'
      },
      'goalsDocumented': {
        question: 'Are goals and aspirations documented and reviewed?',
        correction: 'Document resident goals and aspirations and review regularly'
      },
      'communicationNeedsDocumented': {
        question: 'Are communication needs documented and supported?',
        correction: 'Document communication needs and implement support measures'
      },
      'endOfLifePreferences': {
        question: 'Are end of life preferences documented and respected?',
        correction: 'Document end of life preferences and ensure they are respected'
      },
      'keyRiskAssessments': {
        question: 'Are key risk assessments completed and in place?',
        correction: 'Complete all key risk assessments and implement mitigation measures'
      },
      'riskLevelsScored': {
        question: 'Are risk levels scored and appropriate actions taken?',
        correction: 'Score risk levels and implement appropriate actions'
      },
      'assessmentsReviewed': {
        question: 'Are risk assessments reviewed regularly?',
        correction: 'Establish regular review schedule for all risk assessments'
      },
      'dailyNotesRecorded': {
        question: 'Are daily notes/interactions recorded accurately?',
        correction: 'Ensure accurate recording of all daily notes and interactions'
      },
      'entriesIncludeDetail': {
        question: 'Do entries include sufficient detail and context?',
        correction: 'Include sufficient detail and context in all entries'
      },
      'logsWrittenProfessionally': {
        question: 'Are logs written professionally and objectively?',
        correction: 'Ensure all logs are written professionally and objectively'
      },
      'missedCareRecorded': {
        question: 'Is missed care recorded and addressed?',
        correction: 'Record all missed care episodes and implement corrective actions'
      },
      'requiredChartsCompleted': {
        question: 'Are required charts completed accurately?',
        correction: 'Complete all required charts accurately and on time'
      },
      'entriesTimestamped': {
        question: 'Are all entries timestamped appropriately?',
        correction: 'Ensure all entries are properly timestamped'
      },
      'chartDataUsed': {
        question: 'Is chart data used to inform care planning?',
        correction: 'Use chart data to inform and update care planning'
      },
      'alertsTriggered': {
        question: 'Are alerts triggered and responded to appropriately?',
        correction: 'Respond to all alerts in a timely and appropriate manner'
      },
      'marChartAccurate': {
        question: 'Is the MAR chart accurate and up to date?',
        correction: 'Maintain accurate and up-to-date MAR charts'
      },
      'medicationReviews': {
        question: 'Are medication reviews conducted regularly?',
        correction: 'Conduct regular medication reviews as required'
      },
      'prnProtocols': {
        question: 'Are PRN protocols followed correctly?',
        correction: 'Follow PRN protocols correctly and document usage'
      },
      'refusalsSideEffects': {
        question: 'Are refusals and side effects recorded and acted upon?',
        correction: 'Record medication refusals and side effects and take appropriate action'
      },
      'regularObservations': {
        question: 'Are regular observations conducted and recorded?',
        correction: 'Conduct and record regular observations as required'
      },
      'abnormalResultsFlagged': {
        question: 'Are abnormal results flagged and addressed?',
        correction: 'Flag abnormal results and implement corrective actions'
      },
      'weightTrendsMonitored': {
        question: 'Are weight trends monitored and acted upon?',
        correction: 'Monitor weight trends and take appropriate actions'
      },
      'observationsUsedClinical': {
        question: 'Are observations used to inform clinical decisions?',
        correction: 'Use observation data to inform clinical decision making'
      },
      'handoverLogUpdated': {
        question: 'Is the handover log updated with all relevant information?',
        correction: 'Update handover log with all relevant information'
      },
      'changesLogged': {
        question: 'Are changes in condition logged and communicated?',
        correction: 'Log all changes in condition and communicate to relevant staff'
      },
      'professionalVisits': {
        question: 'Are professional visits documented appropriately?',
        correction: 'Document all professional visits appropriately'
      },
      'familyCommunications': {
        question: 'Are family communications recorded and followed up?',
        correction: 'Record family communications and follow up as appropriate'
      }
    },
    'fire-safety': {
      'fireRiskAssessmentCompleted': {
        question: 'Has a fire risk assessment been completed?',
        correction: 'Complete a comprehensive fire risk assessment for the premises'
      },
      'fireRiskAssessmentReviewed': {
        question: 'Has the fire risk assessment been reviewed within the last 12 months?',
        correction: 'Review and update the fire risk assessment annually'
      },
      'significantFindingsActioned': {
        question: 'Have significant findings from the fire risk assessment been actioned?',
        correction: 'Address all significant findings identified in the fire risk assessment'
      },
      'fireRiskAssessmentAccessible': {
        question: 'Is the fire risk assessment accessible to all relevant staff?',
        correction: 'Ensure fire risk assessment is accessible to all relevant staff members'
      },
      'functioningFireAlarm': {
        question: 'Is there a functioning fire alarm system in place?',
        correction: 'Install and maintain a functioning fire alarm system'
      },
      'fireAlarmsTestedWeekly': {
        question: 'Are fire alarms tested weekly?',
        correction: 'Implement weekly fire alarm testing schedule'
      },
      'staffFamiliarAlarmSound': {
        question: 'Are staff familiar with the fire alarm sound?',
        correction: 'Train all staff to recognize the fire alarm sound'
      },
      'visualAlarmsInPlace': {
        question: 'Are visual alarms in place for hearing impaired residents/staff?',
        correction: 'Install visual alarm systems for hearing impaired individuals'
      },
      'emergencyLightingInstalled': {
        question: 'Is emergency lighting installed throughout the premises?',
        correction: 'Install emergency lighting in all areas of the premises'
      },
      'emergencyLightingTestedMonthly': {
        question: 'Is emergency lighting tested monthly?',
        correction: 'Implement monthly emergency lighting testing schedule'
      },
      'fullEmergencyLightingTest': {
        question: 'Is a full emergency lighting test conducted annually?',
        correction: 'Conduct annual full emergency lighting system tests'
      },
      'fireExtinguishersAvailable': {
        question: 'Are fire extinguishers available and accessible?',
        correction: 'Ensure fire extinguishers are available and accessible in all areas'
      },
      'fireExtinguishersServiced': {
        question: 'Are fire extinguishers serviced annually?',
        correction: 'Arrange annual servicing of all fire extinguishers'
      },
      'fireBlankets': {
        question: 'Are fire blankets available where required?',
        correction: 'Install fire blankets in kitchen and other high-risk areas'
      },
      'staffKnowExtinguisherUse': {
        question: 'Do staff know how to use fire extinguishers?',
        correction: 'Train staff on proper fire extinguisher usage'
      },
      'fireExitsMarked': {
        question: 'Are fire exits clearly marked?',
        correction: 'Clearly mark all fire exits with appropriate signage'
      },
      'escapeRoutesClear': {
        question: 'Are escape routes kept clear at all times?',
        correction: 'Ensure all escape routes are kept clear of obstructions'
      },
      'fireDoorsProper': {
        question: 'Are fire doors in proper working order?',
        correction: 'Maintain all fire doors in proper working condition'
      },
      'escapeRouteSurfaces': {
        question: 'Are escape route surfaces suitable for emergency evacuation?',
        correction: 'Ensure escape route surfaces are suitable for emergency evacuation'
      },
      'evacuationPlanDocumented': {
        question: 'Is there a documented evacuation plan?',
        correction: 'Create and document a comprehensive evacuation plan'
      },
      'fireDrillsConducted': {
        question: 'Are fire drills conducted regularly?',
        correction: 'Conduct regular fire drills as required'
      },
      'staffTrainedEvacuation': {
        question: 'Are staff trained in evacuation procedures?',
        correction: 'Train all staff in evacuation procedures'
      },
      'peepsInPlace': {
        question: 'Are Personal Emergency Evacuation Plans (PEEPS) in place for residents?',
        correction: 'Develop PEEPS for all residents who may need assistance during evacuation'
      },
      'staffFireSafetyTraining': {
        question: 'Have staff received fire safety training?',
        correction: 'Provide fire safety training to all staff members'
      },
      'staffUnderstandRoles': {
        question: 'Do staff understand their roles in fire safety?',
        correction: 'Ensure all staff understand their roles and responsibilities in fire safety'
      },
      'newStaffTrained': {
        question: 'Are new staff trained in fire safety procedures?',
        correction: 'Include fire safety training in new staff induction'
      },
      'fireWardensAppointed': {
        question: 'Are fire wardens appointed and trained?',
        correction: 'Appoint and train fire wardens for each area'
      },
      'fireActionNotices': {
        question: 'Are fire action notices displayed in appropriate locations?',
        correction: 'Display fire action notices in all appropriate locations'
      },
      'fireExitSigns': {
        question: 'Are fire exit signs illuminated and visible?',
        correction: 'Ensure all fire exit signs are illuminated and clearly visible'
      },
      'assemblyPointMarked': {
        question: 'Is the assembly point clearly marked?',
        correction: 'Clearly mark the designated assembly point'
      },
      'fireLogbookUpToDate': {
        question: 'Is the fire logbook up to date?',
        correction: 'Maintain up-to-date fire logbook with all required entries'
      },
      'patTestingCompleted': {
        question: 'Has PAT testing been completed for electrical equipment?',
        correction: 'Complete PAT testing for all electrical equipment'
      },
      'fixedWiringInspected': {
        question: 'Has fixed wiring been inspected regularly?',
        correction: 'Arrange regular inspection of fixed electrical wiring'
      },
      'electricalPanelsSecure': {
        question: 'Are electrical panels secure and accessible?',
        correction: 'Ensure electrical panels are secure and accessible to authorized personnel only'
      },
      'staffInstructedFaultyEquipment': {
        question: 'Are staff instructed to report faulty electrical equipment?',
        correction: 'Instruct all staff to report any faulty electrical equipment immediately'
      },
      'flammableMaterialsStored': {
        question: 'Are flammable materials stored safely and away from heat sources?',
        correction: 'Store all flammable materials safely away from heat sources and ignition points'
      },
      'smokingPoliciesEnforced': {
        question: 'Are smoking policies clearly enforced and smoking areas controlled?',
        correction: 'Enforce smoking policies and ensure designated smoking areas are properly controlled'
      },
      'linenWasteStorage': {
        question: 'Are linen and waste storage areas regularly cleared and well-maintained?',
        correction: 'Regularly clear and maintain linen and waste storage areas'
      },
      'staffAwareReportingHazards': {
        question: 'Are staff aware of procedures for reporting fire hazards?',
        correction: 'Ensure all staff are aware of and follow procedures for reporting fire hazards'
      }
    },
    'health-safety': {
      // Section 1: General Health and Safety Management
      'hsa_policy_in_place': {
        question: 'Is there a current Health and Safety policy in place and reviewed?',
        correction: 'Create and implement a current Health and Safety policy with regular reviews'
      },
      'staff_trained_hsa': {
        question: 'Are staff aware of and trained in the Health and Safety procedures?',
        correction: 'Provide comprehensive Health and Safety training to all staff members'
      },
      'checks_documented': {
        question: 'Are regular Health and Safety checks carried out and documented?',
        correction: 'Implement and document regular Health and Safety checks'
      },
      'hsa_lead_poster': {
        question: 'Is there a designated Health and Safety lead or officer and poster displayed?',
        correction: 'Appoint a Health and Safety lead and display information posters'
      },
      
      // Section 2: Risk Assessments
      'risk_assessments_in_place': {
        question: 'Are risk assessments in place for all relevant activities?',
        correction: 'Complete risk assessments for all relevant activities (manual handling, COSHH, fire)'
      },
      'risk_assessments_reviewed': {
        question: 'Are risk assessments reviewed at least annually or after significant changes/incidents?',
        correction: 'Establish annual review schedule for all risk assessments'
      },
      'control_measures_followed': {
        question: 'Are control measures from risk assessments in place and followed?',
        correction: 'Implement and ensure compliance with all risk assessment control measures'
      },
      'staff_aware_risk_assessments': {
        question: 'Are staff aware of relevant risk assessments relating to their duties?',
        correction: 'Train staff on relevant risk assessments for their specific duties'
      },
      
      // Section 3: Accident and Incident Reporting
      'reporting_system_clear': {
        question: 'Is there a clear system in place for reporting accidents and incidents?',
        correction: 'Establish a clear accident and incident reporting system'
      },
      'incidents_recorded_investigated': {
        question: 'Are all incidents recorded and investigated promptly?',
        correction: 'Implement prompt recording and investigation of all incidents'
      },
      'riddor_reported': {
        question: 'Are RIDDOR-reportable incidents reported to the HSE as required?',
        correction: 'Report all RIDDOR-reportable incidents to the HSE within required timescales'
      },
      'lessons_learned_shared': {
        question: 'Are lessons learned from incidents shared and actions implemented?',
        correction: 'Share lessons learned from incidents and implement corrective actions'
      },
      
      // Section 4: Manual Handling
      'manual_handling_training': {
        question: 'Have staff received manual handling training?',
        correction: 'Provide manual handling training to all relevant staff'
      },
      'handling_equipment_available': {
        question: 'Are moving and handling equipment available, well maintained, and used correctly?',
        correction: 'Ensure availability and proper maintenance of all moving and handling equipment'
      },
      'individual_manual_risk_assessments': {
        question: 'Are individual manual handling risk assessments in place for residents?',
        correction: 'Complete individual manual handling risk assessments for all residents'
      },
      'correct_techniques_used': {
        question: 'Are staff using correct techniques and equipment during manual handling?',
        correction: 'Monitor and ensure correct manual handling techniques are used'
      },
      
      // Section 5: Slips, Trips, and Falls Prevention
      'floors_free_from_hazards': {
        question: 'Are floors clean, dry, and free from trip hazards?',
        correction: 'Maintain clean, dry floors and remove all trip hazards'
      },
      'safety_aids_secure': {
        question: 'Are safety aids (grab rails, alarms, non-slip mats) secure and in good condition?',
        correction: 'Install and maintain safety aids in good working condition'
      },
      'falls_risk_assessments': {
        question: 'Are falls risk assessments completed and up to date?',
        correction: 'Complete and maintain up-to-date falls risk assessments'
      },
      'falls_incidents_reviewed': {
        question: 'Are falls and related incidents reviewed with learning/actions recorded?',
        correction: 'Review all falls incidents and implement learning/actions'
      },
      
      // Section 6: Infection Prevention and Control
      'handwashing_facilities': {
        question: 'Are handwashing facilities available and stocked?',
        correction: 'Install and maintain adequate handwashing facilities with supplies'
      },
      'ppe_supplies_available': {
        question: 'Are PPE supplies available and accessible?',
        correction: 'Ensure PPE supplies are available and easily accessible'
      },
      'waste_bins_condition': {
        question: 'Are waste bins in good condition and used appropriately?',
        correction: 'Maintain waste bins in good condition and ensure appropriate usage'
      },
      'cleaning_equipment_coloured': {
        question: 'Is cleaning equipment colour-coded and stored correctly?',
        correction: 'Implement colour-coding system for cleaning equipment and proper storage'
      },
      
      // Section 7: Hazardous Substances (COSHH)
      'hazardous_substances_stored': {
        question: 'Are hazardous substances stored safely?',
        correction: 'Store all hazardous substances safely and securely'
      },
      'coshh_risk_assessments': {
        question: 'Are COSHH risk assessments available and up to date?',
        correction: 'Complete and maintain up-to-date COSHH risk assessments'
      },
      'chemicals_labelled': {
        question: 'Are chemicals labelled correctly with safety data?',
        correction: 'Ensure all chemicals are correctly labelled with safety data'
      },
      'staff_trained_hazardous': {
        question: 'Are staff trained in handling hazardous substances?',
        correction: 'Provide training for staff on handling hazardous substances'
      },
      
      // Section 8: Fire Safety
      'fire_exits_marked': {
        question: 'Are fire exits marked, clear and accessible?',
        correction: 'Mark all fire exits clearly and ensure they remain accessible'
      },
      'extinguishers_alarms_serviced': {
        question: 'Are extinguishers and alarms serviced and records up to date?',
        correction: 'Service all extinguishers and alarms and maintain records'
      },
      'staff_trained_fire': {
        question: 'Are staff trained and aware of fire procedures?',
        correction: 'Provide fire safety training to all staff members'
      },
      'fire_risk_assessment_up_to_date': {
        question: 'Is the fire risk assessment up to date?',
        correction: 'Complete and maintain up-to-date fire risk assessment'
      },
      
      // Section 9: Electrical Safety
      'pat_testing': {
        question: 'Is PAT testing up to date where applicable?',
        correction: 'Complete PAT testing for all applicable electrical equipment'
      },
      'fixed_wiring_tested': {
        question: 'Is fixed wiring tested and shown as maintained?',
        correction: 'Test fixed wiring and maintain records of maintenance'
      },
      'sockets_cables_good': {
        question: 'Are sockets and cables in good condition?',
        correction: 'Maintain all sockets and cables in good condition'
      },
      'faulty_items_reported': {
        question: 'Are faulty items reported and isolated?',
        correction: 'Establish procedures for reporting and isolating faulty electrical items'
      },
      
      // Section 10: Kitchen and Food Safety
      'kitchen_clean': {
        question: 'Is the kitchen clean and maintained to hygiene standards?',
        correction: 'Maintain kitchen to required hygiene standards'
      },
      'food_hygiene_followed': {
        question: 'Are food hygiene practices followed (storage, temperatures)?',
        correction: 'Implement and monitor food hygiene practices including storage and temperatures'
      },
      'cleaning_schedules_signed': {
        question: 'Are cleaning schedules signed and followed?',
        correction: 'Establish and follow signed cleaning schedules'
      },
      'food_stored_appropriately': {
        question: 'Is food stored appropriately and labelled?',
        correction: 'Store food appropriately with proper labelling'
      },
      
      // Section 11: Water and Legionella
      'legionella_risk_assessment': {
        question: 'Is a legionella risk assessment in place?',
        correction: 'Complete a legionella risk assessment'
      },
      'water_temps_monitored': {
        question: 'Are water temperatures monitored and recorded?',
        correction: 'Monitor and record water temperatures regularly'
      },
      'showers_taps_flushed': {
        question: 'Are showers and infrequently used outlets flushed as required?',
        correction: 'Flush showers and infrequently used outlets as required'
      },
      'water_safety_training': {
        question: 'Are staff trained in water safety where appropriate?',
        correction: 'Provide water safety training to relevant staff'
      },
      
      // Section 12: Environment and Staff Welfare
      'environment_free_from_hazards': {
        question: 'Is the environment free from obvious hazards?',
        correction: 'Identify and remove all obvious environmental hazards'
      },
      'staff_areas_safe': {
        question: 'Are staff areas (rest rooms, lockers) safe and maintained?',
        correction: 'Maintain staff areas to ensure safety and cleanliness'
      },
      'break_times_managed': {
        question: 'Are break times and staff welfare managed appropriately?',
        correction: 'Manage break times and staff welfare appropriately'
      },
      'lone_working_policies': {
        question: 'Are lone working policies in place and followed?',
        correction: 'Implement and follow lone working policies'
      },
      
      // Section 13: PPE and Training
      'ppe_available': {
        question: 'Is PPE available for staff?',
        correction: 'Ensure adequate PPE is available for all staff'
      },
      'ppe_stored_cleanly': {
        question: 'Is PPE stored cleanly and replaced as needed?',
        correction: 'Store PPE cleanly and replace as needed'
      },
      'staff_trained_ppe': {
        question: 'Are staff trained in correct use of PPE?',
        correction: 'Train staff in correct PPE usage'
      },
      
      // Section 14: Staff Training and Supervision
      'staff_hs_training_up_to_date': {
        question: 'Is staff health & safety training up to date?',
        correction: 'Ensure all staff health & safety training is up to date'
      },
      'new_staff_trained_hs': {
        question: 'Are new staff being trained in health & safety?',
        correction: 'Include health & safety training in new staff induction'
      },
      'staff_supervised_supported': {
        question: 'Are staff supervised and supported in their roles?',
        correction: 'Provide adequate supervision and support for all staff'
      },
      'refresher_training_scheduled': {
        question: 'Are refresher trainings scheduled where needed?',
        correction: 'Schedule refresher training as required'
      },
      
      // Section 15: Notices, First Aid and Communication
      'warning_signs_displayed': {
        question: 'Are warning and safety signs displayed where required?',
        correction: 'Display warning and safety signs in all required locations'
      },
      'first_aid_posters_visible': {
        question: 'Are first aid posters and information visible and accessible?',
        correction: 'Display first aid posters and information in accessible locations'
      },
      'residents_informed': {
        question: 'Are residents and visitors informed of relevant safety arrangements?',
        correction: 'Inform residents and visitors of relevant safety arrangements'
      }
    },
    'kitchen': {
      // Section 1: General Cleanliness
      'surfaces_clean': {
        question: 'Are all work surfaces clean, disinfected, and free from clutter?',
        correction: 'Clean and disinfect all work surfaces and remove clutter'
      },
      'flooring_safe': {
        question: 'Is the flooring clean, intact, and non-slip?',
        correction: 'Maintain clean, intact, non-slip flooring throughout the kitchen'
      },
      'walls_ceiling_good': {
        question: 'Are walls, ceilings, light fittings, and vents clean and in good repair?',
        correction: 'Clean and repair walls, ceilings, light fittings, and vents as needed'
      },
      'sinks_designated': {
        question: 'Are sinks clean and designated for handwashing, food prep, or equipment washing?',
        correction: 'Ensure sinks are clean and properly designated for their specific uses'
      },
      'bins_clean': {
        question: 'Are waste bins clean, covered, and emptied regularly?',
        correction: 'Maintain clean waste bins with regular emptying schedule'
      },
      
      // Section 2: Food Storage and Labelling
      'fridges_clean_temp': {
        question: 'Are fridges and freezers clean, organised, and within safe temperature range?',
        correction: 'Clean fridges/freezers and ensure they maintain safe temperatures'
      },
      'temps_monitored_recorded': {
        question: 'Are fridge (≤ 5°C) and freezer (≤ -18°C) temperatures monitored and recorded daily?',
        correction: 'Implement daily temperature monitoring and recording for all refrigeration'
      },
      'dry_goods_stored': {
        question: 'Are dry goods stored off the floor and in sealed, labelled containers?',
        correction: 'Store dry goods off the floor in sealed, labelled containers'
      },
      'opened_items_dated': {
        question: 'Are all opened food items dated and labelled correctly?',
        correction: 'Date and label all opened food items correctly'
      },
      'raw_stored_separately': {
        question: 'Is raw food stored separately from cooked/ready-to-eat foods?',
        correction: 'Store raw food separately from cooked/ready-to-eat foods'
      },
      
      // Section 3: Equipment and Utensils
      'equipment_clean_working': {
        question: 'Is kitchen equipment (e.g. ovens, microwaves, blenders) clean and in good working order?',
        correction: 'Clean and maintain all kitchen equipment in good working order'
      },
      'chopping_boards_coloured': {
        question: 'Are chopping boards colour-coded and used appropriately?',
        correction: 'Implement colour-coding system for chopping boards and ensure appropriate usage'
      },
      'knives_utensils_safe': {
        question: 'Are knives and utensils clean, stored safely, and in good condition?',
        correction: 'Clean knives and utensils and store them safely'
      },
      'small_appliances_clean': {
        question: 'Are kettles, toasters, microwaves, and small appliances in kitchenettes clean and safe?',
        correction: 'Clean and maintain small appliances in kitchenettes'
      },
      'dishwasher_effective': {
        question: 'Is dishwasher or manual washing system (e.g. 2/3 sink method) used and effective?',
        correction: 'Ensure dishwasher or manual washing system is effective and properly used'
      },
      
      // Section 4: Personal Hygiene
      'handwashing_sinks': {
        question: 'Are handwashing sinks available, with hot water, soap, and paper towels?',
        correction: 'Install and maintain handwashing sinks with hot water, soap, and paper towels'
      },
      'staff_hand_hygiene_observed': {
        question: 'Are staff observed following good hand hygiene practices?',
        correction: 'Monitor and ensure staff follow good hand hygiene practices'
      },
      'ppe_worn_where_appropriate': {
        question: 'Are disposable gloves, aprons, and hairnets worn where appropriate?',
        correction: 'Ensure appropriate PPE is worn in relevant areas'
      },
      'ppe_changed_between_tasks': {
        question: 'Are staff changing PPE between tasks to avoid cross-contamination?',
        correction: 'Train staff to change PPE between tasks to prevent cross-contamination'
      },
      'posters_displayed_food': {
        question: 'Are hand hygiene and PPE posters displayed in food areas?',
        correction: 'Display hand hygiene and PPE posters in all food preparation areas'
      },
      
      // Section 5: Kitchenette Safety
      'kitchenettes_clean_hazard_free': {
        question: 'Are kitchenettes clean, tidy, and free from hazards?',
        correction: 'Maintain kitchenettes in a clean, tidy condition free from hazards'
      },
      'kitchenette_food_stored_safe': {
        question: 'Is food stored safely in kitchenettes (e.g. labelled, sealed, no out-of-date items)?',
        correction: 'Store food safely in kitchenettes with proper labelling and no out-of-date items'
      },
      'cleaning_products_stored': {
        question: 'Are cleaning products stored separately and safely (not under sinks)?',
        correction: 'Store cleaning products separately and safely, not under sinks'
      },
      'appliances_pat': {
        question: 'Are appliances (microwaves, kettles) PAT tested and working safely?',
        correction: 'Complete PAT testing for all appliances and ensure they work safely'
      },
      'resident_use_risk_assessed': {
        question: 'Is resident use of kitchenettes risk-assessed and supported where appropriate?',
        correction: 'Complete risk assessments for resident use of kitchenettes and provide support'
      },
      
      // Section 6: Pest Control
      'signs_of_pests': {
        question: 'Are there any signs of pests (droppings, gnaw marks, insects)?',
        correction: 'Address any signs of pests and implement pest control measures'
      },
      'doors_windows_sealed': {
        question: 'Are external doors and windows sealed or fitted with fly screens?',
        correction: 'Seal external doors and windows or fit fly screens'
      },
      'pest_contract_in_place': {
        question: 'Is a pest control contract in place and up to date?',
        correction: 'Arrange a pest control contract and keep it up to date'
      },
      'pest_proof_storage': {
        question: 'Are food items and waste stored in pest-proof containers?',
        correction: 'Store food and waste in pest-proof containers'
      },
      
      // Section 7: Allergens and Dietary Needs
      'allergens_info_displayed': {
        question: 'Are allergen posters and information clearly displayed?',
        correction: 'Display allergen posters and information clearly'
      },
      'special_diets_separated': {
        question: 'Are special diets (e.g. gluten-free, diabetic, fortified) stored and handled separately?',
        correction: 'Store and handle special diets separately to prevent cross-contamination'
      },
      'cross_contamination_avoided': {
        question: 'Is cross-contamination of allergen foods avoided during prep and storage?',
        correction: 'Implement procedures to avoid cross-contamination of allergen foods'
      },
      
      // Section 8: Documentation & Records
      'cleaning_schedules_signed': {
        question: 'Are cleaning schedules completed, signed, and up to date?',
        correction: 'Complete, sign, and maintain up-to-date cleaning schedules'
      },
      'temp_logs_maintained': {
        question: 'Are fridge/freezer temperature logs maintained accurately?',
        correction: 'Maintain accurate temperature logs for all refrigeration equipment'
      },
      'deliveries_stock_rotation': {
        question: 'Is food delivery and stock rotation recorded?',
        correction: 'Record all food deliveries and implement stock rotation procedures'
      },
      'staff_food_training': {
        question: 'Are food hygiene certificates/training records for staff up to date?',
        correction: 'Ensure all staff have up-to-date food hygiene training certificates'
      },
      
      // Section 9: Waste Management
      'food_waste_bins': {
        question: 'Are food waste bins available, clean, and emptied regularly?',
        correction: 'Provide clean food waste bins with regular emptying schedule'
      },
      'clinical_waste_separate': {
        question: 'Are clinical or incontinence waste bins kept separate from food areas?',
        correction: 'Keep clinical waste separate from food preparation areas'
      },
      'recycling_managed': {
        question: 'Is recycling being managed according to local authority policy?',
        correction: 'Manage recycling according to local authority requirements'
      },
      
      // Section 10: Compliance & Risk
      'last_eho_actions_completed': {
        question: 'Is the last Environmental Health (EHO) inspection available and actions completed?',
        correction: 'Complete all actions from the last EHO inspection'
      },
      'food_hygiene_rating_displayed': {
        question: 'Is the Food Hygiene Rating displayed publicly (main kitchen)?',
        correction: 'Display Food Hygiene Rating publicly in the main kitchen'
      },
      'staff_food_safety_trained': {
        question: 'Are staff trained in food safety (minimum Level 2 Food Hygiene)?',
        correction: 'Ensure all staff have Level 2 Food Hygiene training'
      },
      'cleaning_risk_assessment': {
        question: 'Is there a cleaning risk assessment in place for both kitchen and kitchenettes?',
        correction: 'Complete cleaning risk assessments for kitchen and kitchenettes'
      },
      'coshh_sheets_available': {
        question: 'Are COSHH sheets available for any cleaning chemicals used?',
        correction: 'Provide COSHH sheets for all cleaning chemicals used'
      }
    },
    'maintenance': {
      // Section 1: General Building Condition
      'internal_walls_ceiling_floor_ok': {
        question: 'Are internal walls, ceilings, and floors in good condition and free from damage?',
        correction: 'Repair any damage to internal walls, ceilings, and floors'
      },
      'external_walls_roof_windows_ok': {
        question: 'Are external walls, roofs, gutters, and windows in good repair?',
        correction: 'Repair external walls, roofs, gutters, and windows as needed'
      },
      'lighting_fixtures_ok': {
        question: 'Are lighting fixtures working and adequate in all areas (indoor and outdoor)?',
        correction: 'Repair or replace faulty lighting fixtures and ensure adequate coverage'
      },
      'doors_locks_handles_ok': {
        question: 'Are doors, locks, and handles functioning properly throughout the home?',
        correction: 'Repair doors, locks, and handles that are not functioning properly'
      },
      'rooms_well_maintained': {
        question: 'Are all resident bedrooms, bathrooms, and communal areas well maintained?',
        correction: 'Maintain all resident bedrooms, bathrooms, and communal areas'
      },
      
      // Section 2: Heating, Ventilation and Water Systems
      'radiators_heating_ok': {
        question: 'Are all radiators and heating systems working effectively?',
        correction: 'Repair faulty radiators and heating systems'
      },
      'thermostats_controls_ok': {
        question: 'Are thermostats and heating controls functioning correctly?',
        correction: 'Repair faulty thermostats and heating controls'
      },
      'extractor_ventilation_ok': {
        question: 'Are extractor fans and ventilation systems clean and operational?',
        correction: 'Clean and repair extractor fans and ventilation systems'
      },
      'water_temps_safe': {
        question: 'Are hot and cold water temperatures within safe limits (legionella control)?',
        correction: 'Adjust water temperatures to safe limits and implement legionella control measures'
      },
      'water_outlets_flushed_recorded': {
        question: 'Are water outlets flushed regularly and recorded (for infrequently used taps/showers)?',
        correction: 'Implement regular flushing schedule for infrequently used water outlets'
      },
      
      // Section 3: Electrical Safety
      'pat_testing_current': {
        question: 'Are all portable appliances PAT tested and labelled?',
        correction: 'Complete PAT testing for all portable appliances and apply labels'
      },
      'sockets_plugs_safe': {
        question: 'Are electrical sockets and plugs in safe, working condition?',
        correction: 'Repair or replace faulty electrical sockets and plugs'
      },
      'fixed_wiring_inspection_current': {
        question: 'Is there a current fixed wiring inspection (every 5 years)?',
        correction: 'Arrange for fixed wiring inspection and complete any required work'
      },
      'staff_report_faults_aware': {
        question: 'Are staff aware of how to report electrical faults?',
        correction: 'Train staff on procedures for reporting electrical faults'
      },
      
      // Section 4: Fire Safety and Emergency Systems
      'fire_doors_ok': {
        question: 'Are all fire doors in good working order and not wedged open?',
        correction: 'Repair fire doors and ensure they are not wedged open'
      },
      'extinguishers_serviced': {
        question: 'Are fire extinguishers present, serviced, and located correctly?',
        correction: 'Service fire extinguishers and ensure correct positioning'
      },
      'emergency_lighting_ok': {
        question: 'Are emergency lighting systems tested and functional?',
        correction: 'Test and repair emergency lighting systems'
      },
      'weekly_alarm_tests': {
        question: 'Are weekly fire alarm tests carried out and recorded?',
        correction: 'Implement weekly fire alarm testing schedule'
      },
      'evacuation_routes_clear': {
        question: 'Are evacuation routes clear and signage in place?',
        correction: 'Clear evacuation routes and install appropriate signage'
      },
      
      // Section 5: Lifts and Hoists
      'lifts_serviced_loler': {
        question: 'Are passenger lifts serviced and inspected in line with LOLER regulations?',
        correction: 'Service lifts according to LOLER regulations and maintain inspection records'
      },
      'hoists_serviced_logged': {
        question: 'Are ceiling track hoists and mobile hoists maintained and logged?',
        correction: 'Maintain hoists and keep detailed service logs'
      },
      'slings_checked': {
        question: 'Are slings and lifting equipment checked for wear and tear?',
        correction: 'Regularly check slings and lifting equipment for wear and replace as needed'
      },
      'lifting_records_up_to_date': {
        question: 'Are maintenance records for all lifting equipment up to date?',
        correction: 'Maintain up-to-date records for all lifting equipment maintenance'
      },
      
      // Section 6: Garden and Outdoor Areas
      'paths_walkways_safe': {
        question: 'Are paths, walkways, and ramps clear, well-lit, and in safe condition?',
        correction: 'Clear and repair paths, walkways, and ramps to ensure safety'
      },
      'handrails_fences_secure': {
        question: 'Are handrails and fences secure and stable?',
        correction: 'Repair and secure handrails and fences'
      },
      'garden_tidy_hazard_free': {
        question: 'Is the garden area tidy and free from hazardous equipment or waste?',
        correction: 'Clear garden area of hazards and maintain tidy condition'
      },
      'external_bins_stored_secure': {
        question: 'Are external bins stored securely and away from access points?',
        correction: 'Store external bins securely away from access points'
      },
      
      // Section 7: Housekeeping and Equipment
      'cleaning_machines_ok': {
        question: 'Are cleaning machines (vacuum, floor cleaners) in good working order?',
        correction: 'Repair or replace faulty cleaning machines'
      },
      'domestic_trolleys_bins_ok': {
        question: 'Are domestic trolleys and bins clean and stored correctly?',
        correction: 'Clean and store domestic trolleys and bins correctly'
      },
      'laundry_machines_serviced': {
        question: 'Are laundry machines serviced and maintained regularly?',
        correction: 'Service and maintain laundry machines regularly'
      },
      'furniture_good_condition': {
        question: 'Is furniture in good condition and free from damage?',
        correction: 'Repair or replace damaged furniture'
      },
      
      // Section 8: Toilets and Bathrooms
      'toilets_sinks_baths_ok': {
        question: 'Are all toilets, sinks, and baths in good working condition?',
        correction: 'Repair faulty toilets, sinks, and baths'
      },
      'grabrails_secure': {
        question: 'Are grab rails and support bars secure and rust-free?',
        correction: 'Secure grab rails and treat/remove rust as needed'
      },
      'waste_bins_seats_dispensers_ok': {
        question: 'Are waste bins, toilet seats, and dispensers working and hygienic?',
        correction: 'Repair waste bins, toilet seats, and dispensers and maintain hygiene'
      },
      
      // Section 9: Storage and Hazardous Materials
      'storage_areas_neat': {
        question: 'Are all storage areas neat, accessible, and well organised?',
        correction: 'Organise and maintain neat storage areas'
      },
      'coshh_items_stored_secure': {
        question: 'Are COSHH items stored securely and labelled properly?',
        correction: 'Store COSHH items securely with proper labelling'
      },
      'tools_ladders_stored_safe': {
        question: 'Are maintenance tools and ladders stored safely and used appropriately?',
        correction: 'Store tools and ladders safely and ensure appropriate usage'
      },
      
      // Section 10: Reporting and Record-Keeping
      'issues_reported_process': {
        question: 'Are all maintenance issues reported via a clear process?',
        correction: 'Establish clear process for reporting maintenance issues'
      },
      'repair_logs_maintained': {
        question: 'Are repair logs maintained and up to date?',
        correction: 'Maintain up-to-date repair logs'
      },
      'outstanding_repairs_tracked': {
        question: 'Are outstanding repairs tracked with priority levels?',
        correction: 'Track outstanding repairs with appropriate priority levels'
      },
      'scheduled_servicing_record': {
        question: 'Is there a record of scheduled servicing (e.g. boilers, alarms, equipment)?',
        correction: 'Maintain records of all scheduled servicing'
      },
      'contractors_qualified_records': {
        question: 'Are contractors appropriately qualified and records retained?',
        correction: 'Ensure contractors are qualified and maintain records'
      }
    }
  };

  const questions = questionMappings[auditType] || {};

  // Process each question in the audit
  Object.keys(questions).forEach(fieldKey => {
    const answer = auditData[fieldKey];
    const comment = auditData[`${fieldKey}_comment`] || auditData[`${fieldKey}Comment`];
    const questionData = questions[fieldKey];

    // Only create action items for "No" answers
    if (answer === 'No' && questionData) {
      const priority = determinePriority(auditType, fieldKey);

      items.push({
        id: `${auditType}-${auditId}-${fieldKey}`,
        auditType,
        auditId,
        question: questionData.question,
        issue: questionData.correction,
        comment: comment || 'No specific comment provided',
        priority,
        status: 'pending',
        createdAt: auditDate
      });
    }
  });

  // Add final comments as action items if they exist
  if (auditData.comments || auditData.finalComments) {
    const finalComment = auditData.comments || auditData.finalComments;
    if (finalComment.trim()) {
      items.push({
        id: `${auditType}-${auditId}-final-comments`,
        auditType,
        auditId,
        question: 'Final Comments/Recommendations',
        issue: 'Additional recommendations from audit completion',
        comment: finalComment,
        priority: 'medium',
        status: 'pending',
        createdAt: auditDate
      });
    }
  }

  return items;
}

/**
 * Determine priority based on audit type and question
 */
function determinePriority(auditType: string, fieldKey: string): 'high' | 'medium' | 'low' {
  // Define high-priority items for different audit types
  const highPriorityFields: Record<string, string[]> = {
    'infection-control': [
      'hh_staff_observed', 'ppe_staff_wearing_correctly', 'cleaning_schedules',
      'clinical_waste_correct_bins', 'isolation_procedures', 'staff_ipc_training'
    ],
    'care-plan': [
      'carePlanAccessible', 'carePlanReviewed30Days', 'keyRiskAssessments',
      'medicationReviews', 'regularObservations', 'handoverLogUpdated'
    ],
    'fire-safety': [
      'emergency_exits_clear', 'fire_alarms_tested', 'extinguishers_serviced',
      'evacuation_drills', 'staff_fire_training'
    ],
    'health-safety': [
      'incident_reporting', 'safety_audits', 'hazard_reporting',
      'staff_hs_training_up_to_date', 'risk_assessments_in_place', 'fire_exits_marked'
    ],
    'kitchen': [
      'food_storage_temps', 'food_hygiene_training', 'cleaning_schedules_signed',
      'fridges_clean_temp', 'staff_food_safety_trained', 'last_eho_actions_completed'
    ],
    'maintenance': [
      'building_repairs', 'equipment_safety', 'electrical_safe',
      'fire_doors_ok', 'emergency_lighting_ok', 'lifts_serviced_loler'
    ]
  };

  if (highPriorityFields[auditType]?.includes(fieldKey)) {
    return 'high';
  }

  return 'medium';
}

/**
 * Save action plan items to Firestore
 */
export async function saveActionPlanItems(workspaceId: string, monthKey: string, items: ActionPlanItem[], organisationId: string | null = null): Promise<void> {
  try {
    const actionPlanRef = doc(
      collection(db, workspaceCollectionPath(workspaceId, 'action-plans', organisationId || null)),
      monthKey
    );

    // Get existing action plan or create new one
    const existingPlan = await getMonthlyActionPlan(workspaceId, monthKey, organisationId || null);
    const existingItems = existingPlan?.items || [];

    // Merge new items with existing ones (avoid duplicates)
    const mergedItems = [...existingItems];
    items.forEach(newItem => {
      const existingIndex = mergedItems.findIndex(item => item.id === newItem.id);
      if (existingIndex === -1) {
        mergedItems.push(newItem);
      } else {
        // Update existing item if comment has changed
        mergedItems[existingIndex] = { ...mergedItems[existingIndex], ...newItem };
      }
    });

    const totalItems = mergedItems.length;
    const completedItems = mergedItems.filter(item => item.status === 'completed').length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const actionPlan: MonthlyActionPlan = {
      id: monthKey,
      workspaceId,
      monthKey,
      items: mergedItems,
      totalItems,
      completedItems,
      progressPercent,
      createdAt: existingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isComplete: false
    };

    await setDoc(actionPlanRef, actionPlan);
  } catch (error) {
    console.error('Failed to save action plan items:', error);
    throw error;
  }
}

/**
 * Get monthly action plan for a workspace
 */
export async function getMonthlyActionPlan(workspaceId: string, monthKey?: string, organisationId?: string | null): Promise<MonthlyActionPlan | null> {
  try {
    const targetMonth = monthKey || getCurrentMonthKey();
    const actionPlanRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'action-plans', organisationId)), targetMonth);
    const actionPlanSnap = await getDoc(actionPlanRef);

    if (!actionPlanSnap.exists()) {
      return null;
    }

    return actionPlanSnap.data() as MonthlyActionPlan;
  } catch (error) {
    console.error('Failed to get monthly action plan:', error);
    return null;
  }
}

/**
 * Update action plan item status
 */
export async function updateActionPlanItemStatus(
  workspaceId: string,
  monthKey: string,
  itemId: string,
  status: 'pending' | 'in-progress' | 'completed',
  assignedTo?: string,
  dueDate?: string,
  ragRating?: 'red' | 'amber' | 'green',
  assignedTeam?: string
): Promise<void> {
  try {
  const actionPlanRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'action-plans')), monthKey);
    const actionPlanSnap = await getDoc(actionPlanRef);

    if (!actionPlanSnap.exists()) {
      throw new Error('Action plan not found');
    }

  const actionPlan = actionPlanSnap.data() as MonthlyActionPlan;
  const originalItem = actionPlan.items.find(i => i.id === itemId);
    const updatedItems = actionPlan.items.map(item => {
      if (item.id === itemId) {
        // Create a completely clean object without using spread operator
        const updatedItem: ActionPlanItem = {
          id: item.id,
          auditType: item.auditType,
          auditId: item.auditId,
          question: item.question,
          issue: item.issue,
          comment: item.comment,
          priority: item.priority,
          status,
          createdAt: item.createdAt
        };

        // Only add completedAt if status is completed
        if (status === 'completed') {
          updatedItem.completedAt = new Date().toISOString();
        } else if (item.completedAt) {
          updatedItem.completedAt = item.completedAt;
        }

        // Only add optional fields if they have defined values
        if (assignedTo !== undefined) {
          updatedItem.assignedTo = assignedTo;
        }

        if (dueDate !== undefined) {
          updatedItem.dueDate = dueDate;
        }

        if (ragRating !== undefined) {
          updatedItem.ragRating = ragRating;
        }

        if (assignedTeam !== undefined) {
          updatedItem.assignedTeam = assignedTeam;
        }

        return updatedItem;
      }
      return item;
    });

    const completedItems = updatedItems.filter(item => item.status === 'completed').length;
    const progressPercent = actionPlan.totalItems > 0 ? Math.round((completedItems / actionPlan.totalItems) * 100) : 0;

    await updateDoc(actionPlanRef, {
      items: updatedItems,
      completedItems,
      progressPercent,
      updatedAt: new Date().toISOString()
    });

    // If assignment changed (assignedTo), send a per-recipient assignment email
    try {
      const updatedItem = updatedItems.find(i => i.id === itemId);
      if (updatedItem && originalItem) {
        const prevAssigned = originalItem.assignedTo || originalItem.assignedTeam;
        const newAssigned = updatedItem.assignedTo || updatedItem.assignedTeam;
        if (newAssigned && newAssigned !== prevAssigned) {
          // Resolve assignee to emails (handles team-*, user ids, direct emails)
          const emails = await resolveAssigneeEmails(workspaceId, newAssigned);

          if (emails.length > 0) {
            const itemsSummaryHtml = `<ul><li><b>${updatedItem.auditType}</b>: ${updatedItem.issue} (${updatedItem.priority.toUpperCase()})</li></ul>`;
            // fire-and-forget
            sendActionPlanAssignmentEmail({ workspaceId, recipientEmails: emails, assignedBy: 'System', monthKey, itemsSummaryHtml }).catch(e => console.error('Failed to send assignment email', e));
          }
        }
      }
    } catch (e) {
      console.warn('Error while attempting to send per-assignment email', e);
    }

    // If all items completed, finalize the action plan (generate PDF, mark isComplete)
    if (completedItems === actionPlan.totalItems && actionPlan.totalItems > 0) {
      try {
        await finalizeActionPlanServer(workspaceId, monthKey);
      } catch (e) {
        console.error('Failed to finalize action plan after all items completed:', e);
      }
    }
  } catch (error) {
    console.error('Failed to update action plan item status:', error);
    throw error;
  }
}

/**
 * Helper to finalize action plan if fully completed. Public wrapper for other callers.
 */
export async function finalizeActionPlanIfComplete(workspaceId: string, monthKey: string) {
  const plan = await getMonthlyActionPlan(workspaceId, monthKey);
  if (!plan) return;
  if (plan.completedItems === plan.totalItems && plan.totalItems > 0 && !plan.isComplete) {
    await finalizeActionPlanServer(workspaceId, monthKey);
  }
}

/**
 * Get current month key
 */
export function getCurrentMonthKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check if all audits are completed for the month
 */
export async function areAllAuditsCompleted(workspaceId: string, monthKey?: string, organisationId?: string | null): Promise<boolean> {
  try {
    const targetMonth = monthKey || getCurrentMonthKey();
    const auditTypes = [
      'accident-incident', 'call-bell-monitoring', 'care-plan', 'equipment',
      'fire-safety', 'hand-hygiene', 'health-safety', 'infection-control',
      'kitchen', 'maintenance', 'managers-weekly', 'mealtime', 'night-visit',
      'restrictive-practice', 'staff-file', 'weight-monitoring', 'wound-monitoring',
      'risk-register'
    ];

    for (const auditType of auditTypes) {
      const snapshotQuery = query(
        collection(db, workspaceCollectionPath(workspaceId, `audit-snapshots/${targetMonth}/${auditType}`, organisationId))
      );
      const snapshot = await getDocs(snapshotQuery);
      if (snapshot.empty) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to check if all audits are completed:', error);
    return false;
  }
}