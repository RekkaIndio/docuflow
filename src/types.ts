import type { OrganisationTeamKey } from '@/lib/team-roles';
import type { CqcRegulationMatch } from '@/lib/cqc-regulations';

export type WorkspaceGroup = {
  id: string;
  organisationId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  workspaceIds?: string[];
  workspaceCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  organisationId?: string | null;
  role?: string | null;
  teamKeys?: OrganisationTeamKey[] | null;
};

export type Workspace = {
  id: string;
  name: string;
  folders: (Folder | Document)[];
  ownerId?: string;
  organisationId?: string | null;
  members?: Array<string | User>;
  region?: string | null;
  workspaceGroupId?: string | null;
  workspaceGroup?: WorkspaceGroup | null;
  workspaceGroupColor?: string | null;
  complianceScore?: number | null;
  staffCount?: number | null;
  staffingLevel?: number | null;
  latestDailyCheckinAt?: string | null;
  // Optional occupancy data used by admin and dashboard views (0..1)
  occupancy?: number;
  // Optional explicit bed counts
  totalBeds?: number;
  occupiedBeds?: number;
  // Generic settings bag for workspace-level settings like occupancy
  settings?: {
    occupancy?: number;
    [key: string]: any;
  };
};

export type Folder = {
  id: string;
  name: string;
  type: 'folder';
  items: (Folder | Document)[];
  workspaceId?: string;
  parentId?: string | null;
  createdAt?: string;
};

export type Document = {
  id:string;
  name: string;
  type: 'document';
  fileType: 'pdf' | 'csv' | 'txt' | 'xlsx';
  createdAt: string;
  owner: User;
  extractedJson?: Record<string, any>;
  workspaceId?: string;
  folderId?: string;
  storagePath?: string;
  downloadUrl?: string;
  summary?: string;
  tags?: string[];
  renewalDate?: string | null;
  status?: string;
  statusText?: string;
  subtitle?: string;
  url?: string;
  lastReviewed?: string;
  nextReviewRequired?: string;
  regulations?: CqcRegulationMatch[];
};

export type JournalEntry = {
  id?: string;
  workspaceId: string;
  organisationId?: string | null;
  entryType: 'staff' | 'manager';
  status: 'open' | 'closed';
  content: string;
  isAnonymous: boolean;
  author: {
    id: string | null;
    name: string | null;
    role?: string | null;
  };
  createdAt: string;
  monthKey: string;
  response?: {
    text: string;
    responderId: string | null;
    responderName?: string | null;
    responderRole?: string | null;
    respondedAt: string;
  };
  closedAt?: string | null;
  closedBy?: {
    id: string | null;
    name?: string | null;
    role?: string | null;
  };
  resolvedMonthKey?: string | null;
};

export type Team = {
  id: string;
  name: string;
  members: User[];
  folderCount: number;
  accessibleFolderIds: string[];
}

export type Appraisal = {
  id?: string;
  workspaceId: string;
  managerId: string;
  managerName: string;
  role: string;
  appraiser: string;
  appraisalDate: string;
  periodCovered: string;
  
  // Previous objectives
  previousObjectives: {
    objective: string;
    status: 'achieved' | 'partially' | 'not-achieved';
    comments: string;
  }[];
  previousObjectivesOverallComments: string;
  
  // Key performance areas
  careQualityCompliance: string;
  leadershipPeopleManagement: string;
  residentOutcomesEngagement: string;
  businessOperationalPerformance: string;
  
  // Other sections
  strengthsAchievements: string;
  developmentNeeds: string;
  nextObjectives: string[];
  
  // Career development
  trainingCompleted: string;
  trainingRequired: string;
  careerAspirations: string;
  
  // Wellbeing
  managingDemands: string;
  seniorManagementSupport: string;
  reasonableAdjustments: string;
  
  // Overall outcome
  overallRating: 'exceeds' | 'meets' | 'requires-improvement' | 'unsatisfactory';
  summaryCommentsAppraiser: string;
  summaryCommentsAppraisee: string;
  
  // Signatures
  managerSignature: string;
  managerSignatureDate: string;
  appraiserSignature: string;
  appraiserSignatureDate: string;
  
  // Metadata
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type Supervision = {
  id?: string;
  workspaceId: string;
  managerId: string;
  managerName: string;
  role: string;
  supervisor: string;
  supervisionDate: string;
  location: 'in-person' | 'virtual' | 'care-home-site';
  nextSupervisionDue: string;
  
  // Review sections
  previousActions: string;
  
  // Operational performance
  regulatoryCompliance: string;
  careQuality: string;
  auditResults: string;
  staffingLevels: string;
  occupancyPerformance: string;
  
  // Leadership & management
  leadershipSupport: string;
  staffCulture: string;
  positiveLeadership: string;
  
  // Professional development
  trainingCompleted: string;
  learningNeeds: string;
  careerAspirations: string;
  
  // Reflection & wellbeing
  workloadManagement: string;
  additionalSupport: string;
  wellbeingConcerns: string;
  
  // Agreed actions
  agreedActions: string;
  
  // Signatures
  superviseeSignature: string;
  superviseeSignatureDate: string;
  supervisorSignature: string;
  supervisorSignatureDate: string;
  
  // Metadata
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type RdComplianceAudit = {
  id?: string;
  workspaceId: string;
  organisationId?: string | null;
  auditDate?: string | null;
  submittedAt?: string | null;
  assessorName?: string | null;
  status?: 'pending' | 'in-progress' | 'completed' | 'archived';
  score?: number | null;
  findings?: Record<string, any>;
  actionItems?: Array<{ id?: string; summary: string; dueDate?: string | null; ownerId?: string | null; status?: 'open' | 'in-progress' | 'completed' }>;
  notes?: string | null;
};
