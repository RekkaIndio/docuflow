"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, File as FileIcon, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { extractDocumentData } from "@/ai/flows/extract-document-data";
import type { Document } from "@/lib/types";
import { mockUser } from "@/lib/data";
import { saveDocument } from "@/lib/firestore";
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;

interface UploadButtonProps {
    onDocumentAdd: (document: Document) => void;
    workspaceId?: string;
    folderId?: string;
    size?: "sm" | "default" | "lg";
}

type UploadStatus = "pending" | "uploading" | "processing" | "completed" | "error";
interface FileUpload {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  renewalDate?: string; // ISO string or undefined
  renamedName?: string;
}

const getFileType = (file: File): Document['fileType'] | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type;

  if (["pdf"].includes(extension) && mimeType === 'application/pdf') return 'pdf';
  if (["csv"].includes(extension) && (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel')) return 'csv';
  if (["txt"].includes(extension) && mimeType === 'text/plain') return 'txt';
  if (["xlsx"].includes(extension) && mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (["doc"].includes(extension) && (mimeType === 'application/msword' || mimeType === 'application/octet-stream')) return 'doc';
  if (["docx"].includes(extension) && mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  // Some browsers may use application/octet-stream for .doc
  // Unsupported type
  return null;
}

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


export function UploadButton({ onDocumentAdd, workspaceId, folderId, size = "default" }: UploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + uploads.length > MAX_FILES) {
        toast({ title: "Too many files", description: `You can upload a maximum of ${MAX_FILES} files at a time.`, variant: "destructive" });
        return;
      }
      const newUploads = files
        .map(file => {
          const fileType = getFileType(file);
          if (!fileType) {
            toast({ title: `Unsupported File Type: ${file.name}`, description: "Please upload a PDF, DOC, CSV, TXT or XLSX file.", variant: "destructive" });
            return undefined;
          }
          return { file, status: "pending", progress: 0, renewalDate: undefined } as FileUpload;
        })
        .filter((u): u is FileUpload => u !== undefined);
      setUploads(prev => [...prev, ...newUploads]);
    }
  };

  // Handle renewal date change for a specific file
  const handleRenewalDateChange = (index: number, date: string) => {
    setUploads(prev => prev.map((u, i) => i === index ? { ...u, renewalDate: date } : u));
  };

  const processFile = async (upload: FileUpload, index: number): Promise<void> => {
    if (!workspaceId || !folderId) {
        throw new Error("Workspace or folder not selected.");
    }
    const fileType = getFileType(upload.file);
    if (!fileType) {
        throw new Error("Unsupported file type.");
    }

    try {
      // 1. Upload to Firebase Storage
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: "uploading", progress: 25 } : u));
      const storage = getStorage();
      const storagePath = `${workspaceId}/${folderId}/${Date.now()}-${upload.file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, upload.file);

      setUploads(prev => prev.map((u, i) => i === index ? { ...u, progress: 50 } : u));

      // 2. Extract text server-side via API
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: "processing" } : u));
      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("fileType", fileType);


      let parsedData: any = {};
      let summary = "No summary available.";
      try {
        const res = await fetch("/api/extract-document-data", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Extraction failed: ${res.statusText}`);
        const data = await res.json();
        parsedData = data.extractedJson || { content: "No extracted data available." };
        summary = parsedData.summary || (parsedData.content ? parsedData.content.slice(0, 200) + (parsedData.content.length > 200 ? "..." : "") : "No summary available.");
      } catch (err: any) {
        parsedData = { content: "No extracted data available." };
        summary = "No summary available.";
        throw new Error("Failed to extract document text: " + (err?.message || err));
      }

      // Ensure tags are always present and valid
      let tags = ["document"];

      // Use renamed name if provided, else original file name
      const docName = (upload.renamedName && upload.renamedName.trim().length > 0)
        ? upload.renamedName
        : (upload.file.name && upload.file.name.trim().length > 0) ? upload.file.name : 'Untitled Document';
      // Ensure owner is a non-empty object with required fields
      const safeOwner = (mockUser && typeof mockUser === 'object' && Object.keys(mockUser).length > 0)
        ? mockUser
        : { id: 'unknown', name: 'Unknown', email: 'unknown@example.com', avatarUrl: '' };
      // Ensure workspaceId and storagePath are not empty
      const safeWorkspaceId = workspaceId || 'unknown-workspace';
      const safeStoragePath = storagePath || 'unknown-path';
      const newDoc: Omit<Document, 'id'> = {
        name: docName,
        type: 'document',
        fileType: fileType,
        createdAt: new Date().toISOString(),
        owner: safeOwner,
        extractedJson: parsedData,
        workspaceId: safeWorkspaceId,
        folderId: folderId === 'root' ? null : folderId,
        storagePath: safeStoragePath,
        tags,
        summary,
        renewalDate: upload.renewalDate ?? undefined, // Ensure undefined if not set
      }

      // 4. Save metadata to Firestore
      const docId = await saveDocument(newDoc);

      onDocumentAdd({ ...newDoc, id: docId, folderId });
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: "completed", progress: 100 } : u));

      // --- ALERT LOGIC: If uploaded to 'audits' folder, send email to Admin team ---
      try {
        // Debug: log folderId and alert logic
        console.log('[Audit Alert Debug] folderId:', folderId, 'workspaceId:', workspaceId);
        if (folderId === 'audits') {
          console.log('[Audit Alert Debug] Triggering alert email for Admin team.');
          // Try multiple strategies to find Admin recipients
          let emails: string[] = [];
          let adminTeamName = 'Admin';

          // 1) Workspace-scoped Admin team
          try {
            const teamsQuery = query(collection(db, "teams"), where("name", "==", "Admin"), where("workspaceId", "==", workspaceId));
            const teamsSnap = await getDocs(teamsQuery);
            if (!teamsSnap.empty) {
              const adminTeam = teamsSnap.docs[0].data();
              emails = Array.isArray(adminTeam.emails) ? adminTeam.emails : [];
              adminTeamName = adminTeam.name || adminTeamName;
              console.log('[Audit Alert Debug] Found workspace-scoped Admin team:', adminTeamName, emails);
            }
          } catch (e) {
            console.error('[Audit Alert Debug] Error querying workspace-scoped Admin team', e);
          }

          // 2) Fallback: name-only Admin team anywhere
          if (emails.length === 0) {
            try {
              const teamsQuery2 = query(collection(db, "teams"), where("name", "==", "Admin"));
              const teamsSnap2 = await getDocs(teamsQuery2);
              if (!teamsSnap2.empty) {
                const adminTeam = teamsSnap2.docs[0].data();
                emails = Array.isArray(adminTeam.emails) ? adminTeam.emails : [];
                adminTeamName = adminTeam.name || adminTeamName;
                console.log('[Audit Alert Debug] Found name-only Admin team fallback:', adminTeamName, emails);
                // If team is missing workspaceId, patch it
                if (!adminTeam.workspaceId) {
                  const teamRef = doc(db, 'teams', teamsSnap2.docs[0].id);
                  await setDoc(teamRef, { ...adminTeam, workspaceId }, { merge: true });
                }
              }
            } catch (e) {
              console.error('[Audit Alert Debug] Error querying name-only Admin team', e);
            }
          }

          // 3) Final fallback: default hardcoded Admin id for protected folders
          if (emails.length === 0) {
            try {
              const adminDocRef = doc(db, 'teams', `admin-${workspaceId}`);
              const adminSnap = await getDoc(adminDocRef);
              if (adminSnap.exists()) {
                const adminTeam = adminSnap.data() as any;
                emails = Array.isArray(adminTeam.emails) ? adminTeam.emails : [];
                adminTeamName = adminTeam.name || adminTeamName;
                console.log('[Audit Alert Debug] Found admin by fixed id:', adminTeamName, emails);
              }
            } catch (e) {
              console.error('[Audit Alert Debug] Error fetching admin by fixed id', e);
            }
          }

          if (emails.length > 0) {
            try {
              const resp = await fetch("/api/mailgun-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: emails.join(","),
                  subject: `New Audit Document Uploaded: ${newDoc.name}`,
                  template: "admin-upload",
                  vars: {
                    managerName: adminTeamName || "Admin",
                    uploadedBy: newDoc.owner?.name || "Unknown",
                    documentName: newDoc.name,
                    uploadedAt: new Date().toLocaleString(),
                  }
                })
              });
              console.log('[Audit Alert Debug] Email send response:', resp);
              toast({ title: 'Admin Alert Sent', description: `Sent to ${emails.length} recipient(s)`, });
            } catch (e) {
              console.error('[Audit Alert Debug] Failed to send email', e);
              toast({ title: 'Failed to send Admin Alert', description: 'See console for details', variant: 'destructive' });
            }
          } else {
            console.log('[Audit Alert Debug] No Admin emails found after fallbacks.');
            toast({ title: 'No Admin recipients', description: 'No Admin emails configured for this workspace', variant: 'default' });
          }
        } else {
          console.log('[Audit Alert Debug] Not an audits folder upload, skipping alert.');
        }
      } catch (err) {
        // Non-blocking: log error but don't interrupt upload
        console.error("Failed to send Admin alert email:", err);
      }

  } catch (error: any) {
      console.error(`Failed to process ${upload.file.name}:`, error);
      setUploads(prev => prev.map((u, i) => i === index ? { ...u, status: "error", error: error.message } : u));
    }
  }


  const handleUpload = async () => {
    if (uploads.length === 0) {
        toast({ title: "No files selected", description: "Please select files to upload.", variant: "destructive" });
        return;
    }
    setIsUploading(true);
    
    await Promise.allSettled(uploads.map((upload, index) => processFile(upload, index)));
    
    setIsUploading(false);
    toast({ title: "Upload Complete", description: "All files have been processed." });
    // Keep dialog open to show results, user can close it manually.
  };

  const handleClose = () => {
    if (isUploading) return;
    setIsOpen(false);
    setUploads([]);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isUploading) setIsOpen(open); }}>
      <DialogTrigger asChild>
        <Button size={size} onClick={() => { setUploads([]); setIsUploading(false); }}>
          <Upload className="mr-2 h-4 w-4" />
          {size === "sm" ? "Upload" : "Upload Document"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80",
                    {"cursor-not-allowed opacity-50": isUploading || uploads.length >= MAX_FILES}
                    )}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Supported: PDF, DOC, DOCX, CSV, TXT, XLSX (Max {MAX_FILES} files)</p>
                    </div>
                    <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} multiple disabled={isUploading || uploads.length >= MAX_FILES} accept=".pdf,.doc,.docx,.csv,.txt,.xlsx" />
                </label>
            </div>
            {uploads.length > 0 && (
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-4">
                  {uploads.map((upload, index) => (
                    <div key={index} className="flex items-center gap-4 p-2 border rounded-lg">
                      <FileIcon className="w-6 h-6 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Input
                            className="text-sm font-medium truncate"
                            value={upload.renamedName ?? upload.file.name}
                            onChange={e => {
                              const newName = e.target.value;
                              setUploads(prev => prev.map((u, i) => {
                                if (i !== index) return u;
                                return { ...u, renamedName: newName };
                              }));
                            }}
                            disabled={upload.status !== 'pending'}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-xs text-muted-foreground">Renewal Date:</label>
                          <input
                          type="date"
                          className="border rounded px-2 py-1 text-xs"
                          value={upload.renewalDate ? upload.renewalDate.substring(0, 10) : ''}
                          onChange={e => handleRenewalDateChange(index, e.target.value)}
                          disabled={upload.status !== 'pending'}
                          />
                        </div>
                        {upload.status === 'error' && <p className="text-xs text-destructive">{upload.error}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={upload.progress} className="w-full h-1.5" />
                          <span className="text-xs font-mono">{upload.progress}%</span>
                        </div>
                      </div>
                      <div className="w-6 h-6 flex items-center justify-center">
                        {upload.status === 'pending' && <Loader2 className="w-4 h-4 text-muted-foreground" />}
                        {upload.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        {upload.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
                        {upload.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {upload.status === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
                      </div>
                    </div>
                  ))}
                    </div>
                </ScrollArea>
            )} 
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose}>
                {isUploading ? "Close" : "Cancel"}
            </Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={isUploading || uploads.filter(u => u.status === 'pending').length === 0}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Upload ${uploads.filter(u => u.status === 'pending').length} File(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


