
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
