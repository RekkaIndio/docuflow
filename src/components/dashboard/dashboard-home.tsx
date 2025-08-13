
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
import { useIsMobile } from "@/hooks/use-mobile";


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
            {/* Mobile-friendly card layout */}
            <div className="block sm:hidden space-y-3">
                {documents.length > 0 ? documents.map(doc => (
                    <Card key={doc.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(doc)}>
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center gap-3 min-w-0">
                                {getFileIcon(doc.fileType)}
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm leading-tight break-words">{doc.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate flex-1 mr-2">{doc.owner.name}</span>
                                <span className="flex-shrink-0">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet.</p>
                )}
            </div>
            {/* Desktop table layout */}
            <div className="hidden sm:block">
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
            </div>
        </CardContent>
    </Card>
);

const QuickAccess = ({ folders, onSelect }: { folders: FolderType[], onSelect: (item: FolderType) => void }) => (
    <div className="w-full">
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {folders.length > 0 ? folders.map(folder => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(folder)}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
                         <Folder className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
                         <span className="text-xs text-muted-foreground">{folder.items.length} items</span>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <p className="font-semibold text-sm sm:text-base break-words leading-tight">{folder.name}</p>
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
    const isMobile = useIsMobile();
    
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
            <header className="bg-background p-4 border-b shrink-0">
                <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Hide SidebarTrigger on mobile since we have it in TopNav */}
                        {!isMobile && <SidebarTrigger />}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-headline font-semibold truncate">{workspace.name}</h1>
                            <p className="text-sm text-muted-foreground hidden sm:block">Welcome back! Here's a summary of your workspace.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <NewFolderDialog
                            workspaceId={workspace.id}
                            parentId={'root'}
                            onFolderCreated={onFolderAdd}
                        >
                            <Button variant="outline" size={isMobile ? "sm" : "default"} className="text-xs sm:text-sm">
                                {isMobile ? "Folder" : "New Folder"}
                            </Button>
                        </NewFolderDialog>
                        <UploadButton
                            onDocumentAdd={onDocumentAdd}
                            workspaceId={workspace.id}
                            folderId={'root'}
                            size={isMobile ? "sm" : "default"}
                        />
                    </div>
                </div>
            </header>
            <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 md:space-y-8">
               <QuickAccess folders={quickAccessFolders} onSelect={onSelect} />
               <RecentFilesTable documents={recentDocuments} onSelect={onSelect} />
            </main>
        </div>
    );
}
