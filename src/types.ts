
export type User = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type Workspace = {
  id: string;
  name: string;
  folders: (Folder | Document)[];
  ownerId?: string;
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
};

export type Team = {
  id: string;
  name: string;
  members: User[];
  folderCount: number;
  accessibleFolderIds: string[];
}
