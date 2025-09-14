
"use client";

import { useMemo, useState } from "react";
import type { Workspace, Document, Folder } from "@/lib/types";
import { SidebarTrigger } from "../ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { FileText, FileSpreadsheet, FileIcon, FileX2, Tag, Search, Folder as FolderIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "../ui/input";

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

function getAllDocuments(items: (Document | Folder)[]): Document[] {
    const documents: Document[] = [];
    for (const item of items) {
      if (item.type === 'document') {
        documents.push(item);
      } else if (item.type === 'folder') {
        documents.push(...getAllDocuments(item.items));
      }
    }
    return documents;
}

interface TagsViewProps {
    workspace: Workspace;
    onSelectDocument: (doc: Document) => void;
}

export function TagsView({ workspace, onSelectDocument }: TagsViewProps) {
    const allDocuments = useMemo(() => getAllDocuments(workspace.folders), [workspace.folders]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const tagsWithCounts = useMemo(() => {
        const tagMap = new Map<string, number>();
        allDocuments.forEach(doc => {
            doc.tags?.forEach(tag => {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
        });
        return Array.from(tagMap.entries()).sort((a,b) => b[1] - a[1]);
    }, [allDocuments]);

    const filteredTags = useMemo(() => {
        if (!filter) return tagsWithCounts;
        return tagsWithCounts.filter(([tag]) => tag.toLowerCase().includes(filter.toLowerCase()));
    }, [tagsWithCounts, filter]);
    
    const documentsForSelectedTag = useMemo(() => {
        if (!selectedTag) return [];
        return allDocuments.filter(doc => doc.tags?.includes(selectedTag));
    }, [allDocuments, selectedTag]);


    return (
        <div className="flex flex-col h-full bg-muted/20">
             <header className="bg-background p-4 border-b shrink-0 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    {/* Sidebar toggle is provided by the Sidebar rail between sidebar and content */}
                    <div>
                        <h1 className="text-xl font-headline font-semibold">Browse by Tag</h1>
                        <p className="text-sm text-muted-foreground">Select a tag to view associated documents.</p>
                    </div>
                 </div>
                 <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                        placeholder="Filter tags..."
                        className="pl-10"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </header>
            <main className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
                {/* Tags List */}
                <div className="md:col-span-1 border-r overflow-y-auto">
                    <div className="p-4 space-y-2">
                        {filteredTags.map(([tag, count]) => (
                            <button 
                                key={tag} 
                                className={`w-full text-left p-2 rounded-md flex justify-between items-center ${selectedTag === tag ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                onClick={() => setSelectedTag(tag)}
                            >
                                <span className="font-medium capitalize">{tag}</span>
                                <Badge variant={selectedTag === tag ? 'default' : 'secondary'}>{count}</Badge>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Documents for selected tag */}
                <div className="md:col-span-2 overflow-y-auto">
                    {selectedTag ? (
                         <div className="p-4">
                             <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Tag className="w-5 h-5" />
                                Documents tagged with "{selectedTag}"
                             </h2>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Date Added</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {documentsForSelectedTag.map(doc => (
                                        <TableRow key={doc.id} className="cursor-pointer" onClick={() => onSelectDocument(doc)}>
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
                                     ))}
                                </TableBody>
                            </Table>
                         </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Tag className="w-16 h-16 mb-4 opacity-50" />
                            <h2 className="text-lg font-semibold">Select a tag</h2>
                            <p>Choose a tag from the left panel to see the documents associated with it.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
