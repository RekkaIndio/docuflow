import type { OrganisationTeamKey } from './team-roles';
import type { CqcRegulationMatch } from './cqc-regulations';

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  organisationId?: string | null;
  role?: string | null;
  teamKeys?: OrganisationTeamKey[] | null;
};

export type Organisation = {
  id?: string;
  name: string;
  ownerId?: string;
  createdAt?: any;
};

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

export type Workspace = {
  id: string;
  name: string;
  folders: (Folder | Document)[];
  organisationId?: string | null;
  evidenceFolders?: (Folder | Document)[]; // Separate folder structure for evidence
  ownerId?: string;
  members?: Array<string | User>;
  region?: string | null;
  workspaceGroupId?: string | null;
  workspaceGroup?: WorkspaceGroup | null;
  workspaceGroupColor?: string | null;
  complianceScore?: number | null;
  staffCount?: number | null;
  staffingLevel?: number | null;
  latestDailyCheckinAt?: string | null;
  profilePicture?: string; // Added profilePicture property to the Workspace type
  // Optional occupancy data used by admin and dashboard views (0..1)
  occupancy?: number;
  // Optional explicit bed counts (used by dev-care-homes or admin overrides)
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
  fileType: 'pdf' | 'csv' | 'txt' | 'xlsx' | 'doc' | 'docx';
  createdAt: string;
  owner: User;
  organisationId?: string | null;
  extractedJson?: Record<string, any>;
  summary?: string;
  // Optional vector embedding for semantic search (stored as an array of numbers)
  embedding?: number[];
  workspaceId?: string;
  folderId?: string | null;
  storagePath?: string;
  downloadUrl?: string; // Direct download URL for PDF or other files
  tags?: string[];
  renewalDate?: string | null; // ISO string or null
  status?: 'current' | 'due-soon' | 'overdue' | 'updated' | string;
  statusText?: string;
  subtitle?: string;
  url?: string;
  lastReviewed?: string;
  nextReviewRequired?: string;
  regulations?: CqcRegulationMatch[];
};

export type JournalMood = 'happy' | 'neutral' | 'sad' | 'angry';

export type JournalEntryAnswer = {
  question: string;
  answer: string;
};

export type JournalEntry = {
  id?: string;
  workspaceId: string;
  organisationId?: string | null;
  entryType: 'staff' | 'manager';
  status: 'open' | 'closed';
  content: string;
  isAnonymous: boolean;
  mood?: JournalMood | null;
  answers?: JournalEntryAnswer[];
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
  emails: string[]; // Added 'emails' property
  workspaceId: string;
};

// Feature Flag System Types
export type FeatureModuleKey = 
  | 'dashboard'
  | 'dependencyCalculator'
  | 'audits'
  | 'actionPlans'
  | 'policies'
  | 'journal'
  | 'managerJournal'
  | 'appraisals'
  | 'rotas'
  | 'files'
  | 'teams'
  | 'stats'
  | 'chatPanel'
  | 'notifications'
  | 'tags'
  | 'renewals'
  | 'dailyCheckins'
  | 'accessibility'
  | 'settings'
  | 'lessonsRcas';

export type FeatureModule = {
  enabled: boolean;
  name: string;
  description?: string;
  category?: 'core' | 'compliance' | 'operations' | 'communication' | 'analytics';
  // Core features cannot be disabled
  isCore?: boolean;
  teamAccess?: Partial<Record<OrganisationTeamKey, boolean>>;
};

export type OrganisationFeatureFlags = {
  modules: Record<FeatureModuleKey, FeatureModule>;
  updatedAt?: any; // Firestore timestamp
  updatedBy?: string; // User ID who made the change
};

export type FeatureModuleOverride = {
  enabled?: boolean;
  teamAccess?: Partial<Record<OrganisationTeamKey, boolean>>;
};

export type WorkspaceFeatureFlagOverrides = {
  modules: Partial<Record<FeatureModuleKey, FeatureModuleOverride>>;
  updatedAt?: any;
  updatedBy?: string | null;
};
