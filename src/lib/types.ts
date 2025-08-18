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
  evidenceFolders?: (Folder | Document)[]; // Separate folder structure for evidence
  ownerId?: string;
  members?: string[];
  profilePicture?: string; // Added profilePicture property to the Workspace type
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
  workspaceId?: string;
  folderId?: string | null;
  storagePath?: string;
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
};
