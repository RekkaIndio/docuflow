export type User = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  organisationId?: string | null;
};

export type Organisation = {
  id?: string;
  name: string;
  ownerId?: string;
  createdAt?: any;
};

export type Workspace = {
  id: string;
  name: string;
  folders: (Folder | Document)[];
  organisationId?: string | null;
  evidenceFolders?: (Folder | Document)[]; // Separate folder structure for evidence
  ownerId?: string;
  members?: string[];
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
  extractedJson?: Record<string, any>;
  summary?: string;
  // Optional vector embedding for semantic search (stored as an array of numbers)
  embedding?: number[];
  workspaceId?: string;
  folderId?: string | null;
  storagePath?: string;
  downloadUrl?: string; // Direct download URL for PDF or other files
  tags?: string[];
  renewalDate?: string; // ISO string or null
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
};

export type OrganisationFeatureFlags = {
  modules: Record<FeatureModuleKey, FeatureModule>;
  updatedAt?: any; // Firestore timestamp
  updatedBy?: string; // User ID who made the change
};
