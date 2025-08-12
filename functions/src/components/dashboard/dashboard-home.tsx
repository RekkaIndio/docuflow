
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Folder, Users, FileText, FileSpreadsheet, FileIcon, FileX2, Briefcase, Clock, User } from "lucide-react";
import type { Workspace, Document, Folder as FolderType } from "@/lib/types";
import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { UploadButton } from "./upload-button";
import { NewFolderDialog } from "./new-folder-dialog";
import { SidebarTrigger } from "../ui/sidebar";


const getFileIcon = (fileType: Document["fileType"]) => {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-5 h-5 text-red-500" />;
    case "csv":
      return <FileSpreadsheet className="w-5 h-5 text-green-700" />;
    case "xlsx":
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    case "txt":
      return <FileIcon className="w-5 h-5 text-gray-500" />;
    default:
      return <FileX2 className="w-5 h-5 text-gray-400" />;
  }
};


const RecentFilesTable = ({ documents, onSelect }: { documents: Document[], onSelect: (doc: Document) => void }) => (
    <Card>
        <CardHeader>
            <CardTitle>Recent Files</CardTitle>
            <CardDescription>The last 5 documents that were uploaded or modified.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Last Modified</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.length > 0 ? documents.map(doc => (
                         <TableRow key={doc.id} className="cursor-pointer" onClick={() => onSelect(doc)}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    {getFileIcon(doc.fileType)}
                                    <span className="font-medium truncate">{doc.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                     <Avatar className="h-6 w-6">
                                        <AvatarImage src={doc.owner.avatarUrl ?? undefined} alt={doc.owner.name ?? undefined} />
                                        <AvatarFallback>{doc.owner.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-muted-foreground">{doc.owner.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString()}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                           <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                             No documents uploaded yet.
                           </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const QuickAccess = ({ folders, onSelect }: { folders: FolderType[], onSelect: (item: FolderType) => void }) => (
    <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.length > 0 ? folders.map(folder => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(folder)}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <Folder className="w-8 h-8 text-yellow-500" />
                         <span className="text-xs text-muted-foreground">{folder.items.length} items</span>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold truncate">{folder.name}</p>
                    </CardContent>
                </Card>
            )) : (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">No folders created yet.</p>
            )}
        </div>
    </div>
)


function getAllItems(items: (Document | FolderType)[]): { documents: Document[], folders: FolderType[] } {
  let documents: Document[] = [];
  let folders: FolderType[] = [];

  for (const item of items) {
    if (item.type === 'document') {
      documents.push(item);
    } else if (item.type === 'folder') {
      folders.push(item);
      const subItems = getAllItems(item.items);
      documents = documents.concat(subItems.documents);
      folders = folders.concat(subItems.folders);
    }
  }
  return { documents, folders };
}

interface DashboardHomeProps {
    workspace: Workspace;
    onSelect: (item: Document | FolderType) => void;
    onDocumentAdd: (document: Document) => void;
    onFolderAdd: (folder: FolderType) => void;
}

export function DashboardHome({ workspace, onSelect, onDocumentAdd, onFolderAdd }: DashboardHomeProps) {
    
    const { documents, folders } = useMemo(() => getAllItems(workspace.folders), [workspace.folders]);
    
    const recentDocuments = useMemo(() => {
        return [...documents] // Create a shallow copy before sorting
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [documents]);

    const quickAccessFolders = useMemo(() => {
        // In a real app, this would be based on usage. For now, just show top-level folders.
        return workspace.folders.filter(item => item.type === 'folder').slice(0, 4) as FolderType[];
    }, [workspace.folders])

    return (
        <div className="flex flex-col h-full bg-muted/20">
            <header className="bg-background p-4 border-b shrink-0 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <div>
                        <h1 className="text-xl font-headline font-semibold">{workspace.name}</h1>
                        <p className="text-sm text-muted-foreground">Welcome back! Here's a summary of your workspace.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <NewFolderDialog
                        workspaceId={workspace.id}
                        parentId={'root'}
                        onFolderCreated={onFolderAdd}
                    >
                        <Button variant="outline">
                            New Folder
                        </Button>
                    </NewFolderDialog>
                    <UploadButton
                        onDocumentAdd={onDocumentAdd}
                        workspaceId={workspace.id}
                        folderId={'root'}
                    />
                 </div>
            </header>
            <main className="flex-1 p-6 overflow-y-auto space-y-8">
               <QuickAccess folders={quickAccessFolders} onSelect={onSelect} />
               <RecentFilesTable documents={recentDocuments} onSelect={onSelect} />
            </main>
        </div>
    );
}
