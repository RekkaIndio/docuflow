
"use client";

import { useMemo, useState } from "react";
import type { Workspace, Document, Folder } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileIcon, FileX2, ArrowUpDown, Search } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";

type SortKey = keyof Document | 'owner.name';
type SortDirection = 'asc' | 'desc';

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
  let documents: Document[] = [];
  for (const item of items) {
    if (item.type === 'document') {
      documents.push(item);
    } else if (item.type === 'folder') {
      documents.push(...getAllDocuments(item.items));
    }
  }
  return documents;
}

const useSortableData = (items: Document[], initialSortKey: SortKey = 'createdAt', initialSortDirection: SortDirection = 'desc') => {
    const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
    const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        sortableItems.sort((a, b) => {
            const getNestedValue = (obj: any, path: string) => path.split('.').reduce((o, k) => (o || {})[k], obj);
            
            const aValue = getNestedValue(a, sortKey);
            const bValue = getNestedValue(b, sortKey);

            if (aValue < bValue) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [items, sortKey, sortDirection]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            direction = 'desc';
        }
        setSortKey(key);
        setSortDirection(direction);
    };

    return { items: sortedItems, requestSort, sortKey, sortDirection };
};


interface AllDocumentsViewProps {
  workspace: Workspace;
  onSelect: (item: Document) => void;
}

export function AllDocumentsView({ workspace, onSelect }: AllDocumentsViewProps) {
    const allDocuments = useMemo(() => getAllDocuments(workspace.folders), [workspace.folders]);
    const [filter, setFilter] = useState("");

    const filteredDocuments = useMemo(() => {
        if (!filter) return allDocuments;
        return allDocuments.filter(doc => 
            doc.name.toLowerCase().includes(filter.toLowerCase()) ||
            doc.owner.name?.toLowerCase().includes(filter.toLowerCase())
        );
    }, [allDocuments, filter]);
    
    const { items: sortedDocuments, requestSort, sortKey, sortDirection } = useSortableData(filteredDocuments);

    const SortableHeader = ({ sortableKey, children }: { sortableKey: SortKey, children: React.ReactNode }) => {
        const isSorted = sortKey === sortableKey;
        return (
            <TableHead>
                <Button variant="ghost" onClick={() => requestSort(sortableKey)}>
                    {children}
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${isSorted ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                </Button>
            </TableHead>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
                </div>
                <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
                    <div className="flex items-start gap-6">
                        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold leading-tight tracking-tight">All Documents</h2>
                            <div className="text-slate-200 text-base leading-relaxed">Browse and search all documents in your workspace</div>
                        </div>
                    </div>
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <Input 
                            placeholder="Search documents..."
                            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-300"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHeader sortableKey="name">Name</SortableHeader>
                            <SortableHeader sortableKey="owner.name">Owner</SortableHeader>
                            <SortableHeader sortableKey="createdAt">Date Added</SortableHeader>
                            <TableHead>File Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {sortedDocuments.length > 0 ? sortedDocuments.map(doc => (
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
                                <TableCell>
                                    <span className="text-xs uppercase font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{doc.fileType}</span>
                                </TableCell>
                            </TableRow>
                         )) : (
                            <TableRow>
                               <TableCell colSpan={4} className="text-center text-muted-foreground py-16">
                                 {filter ? `No documents found for "${filter}"` : 'No documents in this workspace yet.'}
                               </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </main>
        </div>
    );
}
