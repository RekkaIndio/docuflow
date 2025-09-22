"use client";

import { useState, useEffect, useRef } from "react";
import type { Document as DocumentType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download, FileText, FileSpreadsheet, FileX2, FileIcon, Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { ShareDialog } from "./share-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SidebarTrigger } from "../ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useToast } from "@/hooks/use-toast";
import { getDocumentAsBase64, getDownloadUrl } from "@/actions/documents";
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentCard } from "@/components/ui/document-card";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import * as mammoth from "mammoth";

// Return true for either legacy workspace paths or org-scoped workspace paths
function isWorkspaceStoragePath(p?: string | null) {
    if (!p) return false;
    if (p.startsWith('workspaces/')) return true;
    // Treat organisation-level policy paths as proxyable as well (e.g. organisations/{orgId}/policies/{name}.pdf)
    if (p.startsWith('organisations/') && (p.includes('/workspaces/') || p.includes('/policies/'))) return true;
    return false;
}

// Set worker source for pdfjs. This is critical for it to work in Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewProps {
  document: DocumentType;
  onBack: () => void;
    responseContent?: string | undefined;
    responseDetail?: { text?: string; documents?: any[] } | undefined;
    isChatOpen?: boolean;
}

// Simple right-hand snippet box to show the output/result from chat/document processing.
const ResponseSnippet = ({ title, content }: { title?: string; content?: string | undefined }) => {
    return (
        <Card className="w-full">
            {/* Header styled to match the chat panel */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-t-md">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">AI</div>
                    <h3 className="text-sm font-semibold truncate">{title || 'Snippet Output'}</h3>
                </div>
            </div>
            <CardContent className="p-3 bg-background">
                <div className="p-2">
                    {content ? (
                        <pre className="whitespace-pre-wrap text-sm break-words">{content}</pre>
                    ) : (
                        <div className="text-muted-foreground text-sm">No output yet. Responses will appear here when available.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const JsonViewer = ({ json }: { json: Record<string, any> | undefined }) => {
    if (!json || Object.keys(json).length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8">
                No structured data extracted for this document.
            </div>
        );
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {Object.entries(json).map(([key, value]) => (
                <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="font-mono text-sm">{key}</AccordionTrigger>
                    <AccordionContent>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                            {JSON.stringify(value, null, 2)}
                        </pre>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
};


const getFileIcon = (fileType: DocumentType["fileType"]) => {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-16 h-16 text-red-500" />;
    case "csv":
      return <FileSpreadsheet className="w-16 h-16 text-green-700" />;
    case "xlsx":
      return <FileSpreadsheet className="w-16 h-16 text-green-500" />;
    case "txt":
      return <FileIcon className="w-16 h-16 text-gray-500" />;
    default:
      return <FileX2 className="w-16 h-16 text-gray-400" />;
  }
};


const DownloadOnlyPreview = ({ document }: { document: DocumentType }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();
    
    const handleDownload = async () => {
        if (document.downloadUrl) {
            window.open(document.downloadUrl, '_blank');
            return;
        }
        if (!document.storagePath) {
            toast({ variant: 'destructive', title: 'Error', description: 'File path is missing.' });
            return;
        }
        setIsDownloading(true);
        try {
            const url = await getDownloadUrl(document.storagePath);
            window.open(url, '_blank');
        } catch (err: any) {
            console.error("Error getting download URL:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not download file. Please try again.' });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
         <div className="flex items-center justify-center h-full bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardContent className="flex flex-col items-center justify-center p-8 gap-6 text-center">
                    {getFileIcon(document.fileType)}
                    <div className="space-y-1">
                        <p className="font-semibold truncate w-64">{document.name}</p>
                        <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                    </div>
                    <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                        {isDownloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Download File
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

const XlsxPreview = ({ document: doc }: { document: DocumentType }) => {
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        setWorkbook(null);
        if (!doc.storagePath) {
            toast({ variant: 'destructive', title: 'Error', description: 'File path is missing.' });
            setIsLoading(false);
            return;
        }

        const fetchAndParseFile = async () => {
            try {
                const base64Data = await getDocumentAsBase64(doc.storagePath!);
                if (base64Data) {
                    const wb = XLSX.read(base64Data, { type: 'base64' });
                    setWorkbook(wb);
                } else {
                    throw new Error("Received no data from server");
                }
            } catch (err: any) {
                console.error("Error fetching or parsing XLSX file:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load file for preview.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndParseFile();
    }, [doc.id, doc.storagePath, toast]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Skeleton className="h-[80vh] w-[80%]" /></div>;
    }

    if (!workbook) {
        return <DownloadOnlyPreview document={doc} />;
    }

    const sheetNames = workbook.SheetNames;

    return (
        <Tabs defaultValue={sheetNames[0]} className="h-full flex flex-col p-4">
            <TabsList>
                {sheetNames.map(name => (
                    <TabsTrigger key={name} value={name}>{name}</TabsTrigger>
                ))}
            </TabsList>
            {sheetNames.map(name => {
                const sheet = workbook.Sheets[name];
                const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                const headers = data[0] || [];
                const rows = data.slice(1);

                return (
                    <TabsContent key={name} value={name} className="flex-1 mt-4 overflow-hidden">
                       <ScrollArea className="h-full">
                            <Table className="bg-background">
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        {headers.map((header, i) => <TableHead key={i}>{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row, i) => (
                                        <TableRow key={i}>
                                            {headers.map((_, j) => (
                                                <TableCell key={j}>{row[j]}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </TabsContent>
                );
            })}
        </Tabs>
    );
};


const PdfPreview = ({ document: doc }: { document: DocumentType }) => {
    const [fileData, setFileData] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        
        setIsLoading(true);
        setFileData(null);
        
    // Prefer an explicit downloadUrl (signed/public URL) first, then storagePath fallback
    const pathToUse = doc.downloadUrl || doc.storagePath;
        
        if (!pathToUse) {
            toast({ variant: 'destructive', title: 'Error', description: 'No file path available for this PDF.' });
            setIsLoading(false);
            return;
        }

        const fetchFile = async () => {
            try {
                let base64Data: string | null = null;

                // Helper to convert a Uint8Array to base64
                const uint8ToBase64 = (uint8: Uint8Array) => {
                    let binary = '';
                    const chunkSize = 0x8000;
                    for (let i = 0; i < uint8.length; i += chunkSize) {
                        const slice = uint8.subarray(i, i + chunkSize);
                        binary += String.fromCharCode.apply(null, Array.from(slice));
                    }
                    return typeof window !== 'undefined' && window.btoa ? window.btoa(binary) : Buffer.from(uint8).toString('base64');
                };

                // If the path is a gs:// URL, extract the object path for proxy
                const isGs = pathToUse.startsWith('gs://');
                const getObjectPathFromGs = (gs: string) => {
                    // gs://bucket-name/path/to/object -> path/to/object
                    const withoutPrefix = gs.replace('gs://', '');
                    const parts = withoutPrefix.split('/');
                    parts.shift();
                    return parts.join('/');
                };

                // Helper to parse a storage object path from common signed URL formats
                const parseStoragePathFromUrl = (u: string): string | null => {
                    try {
                        const parsed = new URL(u);
                        // firebase storage signed URL format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media&token=...
                        if (parsed.hostname.includes('firebasestorage.googleapis.com')) {
                            const parts = parsed.pathname.split('/');
                            const idx = parts.indexOf('o');
                            if (idx !== -1 && parts.length > idx + 1) {
                                const encoded = parts.slice(idx + 1).join('/');
                                return decodeURIComponent(encoded);
                            }
                        }

                        // storage.googleapis.com format: https://storage.googleapis.com/<bucket>/<object>
                        if (parsed.hostname === 'storage.googleapis.com') {
                            const parts = parsed.pathname.split('/').filter(Boolean);
                            // first part is bucket, rest is object path
                            if (parts.length >= 2) {
                                return parts.slice(1).join('/');
                            }
                        }

                        // Some signed urls may be of the form https://<bucket>.storage.googleapis.com/<object>
                        const match = parsed.hostname.match(/^(.+)\.storage\.googleapis\.com$/);
                        if (match) {
                            const parts = parsed.pathname.split('/').filter(Boolean);
                            if (parts.length >= 1) return parts.join('/');
                        }

                        return null;
                    } catch (e) {
                        return null;
                    }
                };

                if (isGs) {
                    // Use server proxy for gs:// objects (browser cannot fetch gs://)
                    const objectPath = getObjectPathFromGs(pathToUse);
                    const proxyResp = await fetch(`/api/storage/proxy?path=${encodeURIComponent(objectPath)}`);
                    if (!proxyResp.ok) throw new Error(`Proxy fetch failed: ${proxyResp.status}`);
                    const arrayBuffer = await proxyResp.arrayBuffer();
                    base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                } else if (pathToUse.startsWith('http') || pathToUse.startsWith('/')) {
                    // If it's an absolute or relative HTTP URL (public asset or signed URL), prefer server proxy when
                    // the URL maps to a known app storage object path (to avoid CORS issues). Otherwise attempt direct fetch.
                    try {
                        // If the URL is a storage signed URL, parse the object path and use the server proxy where possible
                        const parsedPath = parseStoragePathFromUrl(pathToUse);
                        if (parsedPath && isWorkspaceStoragePath(parsedPath)) {
                            const proxyResp = await fetch(`/api/storage/proxy?path=${encodeURIComponent(parsedPath)}`);
                            if (!proxyResp.ok) throw new Error(`Proxy fetch failed: ${proxyResp.status}`);
                            const arrayBuffer = await proxyResp.arrayBuffer();
                            base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                        } else {
                            // Not a signed storage URL or not mappable to an app path - attempt direct fetch first
                            const resp = await fetch(pathToUse);
                            if (!resp.ok) throw new Error(`Failed to fetch PDF from URL: ${resp.status}`);
                            const arrayBuffer = await resp.arrayBuffer();
                            base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                        }
                    } catch (directErr) {
                        console.warn('Direct fetch/proxy of signed/public URL failed, attempting other fallbacks', directErr);
                        // Determine a proxy path: prefer explicit doc.storagePath or parsed object path
                        let proxyPath: string | null = null;
                        if (isWorkspaceStoragePath(doc.storagePath)) {
                            proxyPath = doc.storagePath as string;
                        }
                        if (!proxyPath) {
                            const parsed = parseStoragePathFromUrl(pathToUse);
                            if (isWorkspaceStoragePath(parsed)) proxyPath = parsed;
                        }

                        if (proxyPath) {
                            const proxyResp = await fetch(`/api/storage/proxy?path=${encodeURIComponent(proxyPath)}`);
                            if (!proxyResp.ok) throw new Error(`Proxy fetch failed: ${proxyResp.status}`);
                            const arrayBuffer = await proxyResp.arrayBuffer();
                            base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                        } else {
                            // No suitable proxy path available. Try other fallbacks instead of calling proxy with
                            // a public relative URL path. Prefer signed-url helper if we have a storagePath, then server helper.
                            if (doc.storagePath) {
                                try {
                                    // Ask the server to produce a signed URL for the storagePath
                                    const encoded = encodeURIComponent(doc.storagePath);
                                    const signedResp = await fetch(`/api/storage/signed-url?path=${encoded}`);
                                    if (signedResp.ok) {
                                        const signedJson = await signedResp.json();
                                        if (signedJson?.url) {
                                            const resp2 = await fetch(signedJson.url);
                                            if (!resp2.ok) throw new Error(`Failed to fetch signed PDF: ${resp2.status}`);
                                            const arrayBuffer = await resp2.arrayBuffer();
                                            base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                                        }
                                    }
                                } catch (e) {
                                    // ignore and fall through to getDocumentAsBase64
                                }

                                if (!base64Data) {
                                    base64Data = await getDocumentAsBase64(doc.storagePath!);
                                }
                            } else {
                                // No storagePath available; give up and surface the original error
                                throw directErr;
                            }
                        }
                    }
                } else {
                    // Otherwise assume it's a storagePath and request a signed URL from the server
                    try {
                        const encoded = encodeURIComponent(pathToUse);
                        const signedResp = await fetch(`/api/storage/signed-url?path=${encoded}`);
                        if (!signedResp.ok) throw new Error('Failed to create signed URL');
                        const signedJson = await signedResp.json();
                        if (signedJson?.url) {
                            try {
                                const resp = await fetch(signedJson.url);
                                if (!resp.ok) throw new Error(`Failed to fetch signed PDF: ${resp.status}`);
                                const arrayBuffer = await resp.arrayBuffer();
                                base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                            } catch (signedFetchErr) {
                                console.warn('Fetch of signed URL failed, falling back to server proxy', signedFetchErr);
                                // Fall back to proxy using the storagePath or by parsing object path from signed URL
                                let proxyPath = doc.storagePath || null;
                                if (!proxyPath) {
                                    const parsed = parseStoragePathFromUrl(pathToUse);
                                    if (parsed) proxyPath = parsed;
                                }
                                if (proxyPath) {
                                    const proxyResp = await fetch(`/api/storage/proxy?path=${encodeURIComponent(proxyPath)}`);
                                    if (!proxyResp.ok) throw new Error(`Proxy fetch failed: ${proxyResp.status}`);
                                    const arrayBuffer = await proxyResp.arrayBuffer();
                                    base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                                } else {
                                    throw signedFetchErr;
                                }
                            }
                        } else {
                            // Fallback to server helper if signed URL not provided
                            base64Data = await getDocumentAsBase64(pathToUse);
                        }
                    } catch (err) {
                        console.warn('Signed URL fetch failed, falling back to server getDocumentAsBase64 or proxy', err);
                        try {
                            base64Data = await getDocumentAsBase64(pathToUse);
                        } catch (e) {
                                // As a last resort, attempt the proxy only if the supplied pathToUse is a workspace path
                                if (pathToUse && typeof pathToUse === 'string' && isWorkspaceStoragePath(pathToUse)) {
                                    const proxyResp = await fetch(`/api/storage/proxy?path=${encodeURIComponent(pathToUse)}`);
                                    if (!proxyResp.ok) throw new Error(`Proxy fetch failed: ${proxyResp.status}`);
                                    const arrayBuffer = await proxyResp.arrayBuffer();
                                    base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                                } else {
                                    throw err;
                                }
                        }
                    }
                }

                if (base64Data) {
                    setFileData(`data:application/pdf;base64,${base64Data}`);
                } else {
                    throw new Error("Received no data from server");
                }
            } catch (err: any) {
                console.error('PdfPreview fetchFile error', err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load PDF for preview.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchFile();
    }, [doc.id, doc.storagePath, doc.downloadUrl, toast]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    function onDocumentLoadError(error: Error) {
        console.error('PDF Load Error:', error);
        toast({ variant: 'destructive', title: 'PDF Error', description: `Failed to load PDF: ${error.message}` });
        setFileData(null); // This will cause a fallback to the download view
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Skeleton className="h-[80vh] w-[80%]" /></div>
    }

    if (!fileData) {
        return <DownloadOnlyPreview document={doc} />;
    }

    return (
        <div className="flex flex-col h-full items-center gap-2 sm:gap-4 py-2 sm:py-4">
            <div className="flex-1 overflow-y-auto w-full px-2 sm:px-4">
                <div className="flex justify-center">
                    <PdfDocument
                        file={fileData}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={<div className="flex justify-center items-center h-full"><Skeleton className="h-[80vh] w-[80%]" /></div>}
                        error={<p>Failed to load PDF.</p>}
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <Page 
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                scale={1.5} 
                                renderTextLayer={true}
                                className="mb-4"
                            />
                        ))}
                    </PdfDocument>
                </div>
            </div>
        </div>
    );
}


const DocxPreview = ({ document: doc }: { document: DocumentType }) => {
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        setContent(null);
        if (!doc.storagePath) {
            toast({ variant: 'destructive', title: 'Error', description: 'File path is missing.' });
            setIsLoading(false);
            return;
        }

        const fetchAndExtractText = async () => {
            try {
                const base64Data = await getDocumentAsBase64(doc.storagePath!);
                if (base64Data) {
                    const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setContent(result.value);
                } else {
                    throw new Error("Received no data from server");
                }
            } catch (err: any) {
                console.error("Error extracting text from DOCX file:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load file for preview.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndExtractText();
    }, [doc.id, doc.storagePath, toast]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Skeleton className="h-[80vh] w-[80%]" /></div>;
    }

    if (!content) {
        return <DownloadOnlyPreview document={doc} />;
    }

    return (
        <div className="p-8 bg-white shadow-md rounded-md overflow-y-auto h-full">
            <div className="prose max-w-none">
                {content.split('\n').map((line, index) => (
                    <p key={index} className="text-base leading-relaxed text-gray-800">{line}</p>
                ))}
            </div>
        </div>
    );
};

const DocumentPreview = ({ document }: { document: DocumentType }) => {
    // Check if it's a PDF with either downloadUrl or storagePath
    const isPdf = document.fileType === 'pdf';
    const hasDownloadUrl = !!document.downloadUrl;
    const hasStoragePath = !!document.storagePath;
    
    if (isPdf && (hasDownloadUrl || hasStoragePath)) {
        return <PdfPreview document={document} />;
    }
    if (document.fileType === 'xlsx') {
        return <XlsxPreview document={document} />;
    }
    if (document.fileType === 'docx') {
        return <DocxPreview document={document} />;
    }
    // Fallback for unknown or missing fileType
    return <DownloadOnlyPreview document={document} />;
}


export function DocumentView({ document, onBack, responseContent, responseDetail, isChatOpen }: DocumentViewProps) {
  const isMobile = useIsMobile();
        const { toast } = useToast();
    const [showTop, setShowTop] = useState(false);
    const [showRelated, setShowRelated] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const hasMountedRef = useRef(false);

    useEffect(() => {
        let t1: ReturnType<typeof setTimeout> | null = null;
        let t2: ReturnType<typeof setTimeout> | null = null;
        const t3: ReturnType<typeof setTimeout> | null = null;

        const hasResponse = responseDetail && (responseDetail.text || (responseDetail.documents && responseDetail.documents.length > 0));

        // Only run the reveal logic if component has mounted. This prevents
        // pre-populating the snippets when the document is first opened and
        // there is an existing responseDetail from prior chat state.
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            // If there's already a responseDetail on initial mount, keep snippets hidden
            // until a new response arrives after mount.
            return;
        }

        if (hasResponse) {
            // staggered reveal
            setShowTop(true);
            t1 = setTimeout(() => setShowRelated(true), 120);
            t2 = setTimeout(() => setShowMore(true), 240);
        } else {
            // hide all
            setShowTop(false);
            setShowRelated(false);
            setShowMore(false);
        }

        return () => {
            if (t1) clearTimeout(t1);
            if (t2) clearTimeout(t2);
            if (t3) clearTimeout(t3);
        };
    }, [responseDetail]);

        const hasResponse = Boolean(responseDetail && (responseDetail.text || (responseDetail.documents && responseDetail.documents.length > 0)));
  
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-3 sm:p-4 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Sidebar toggle is provided by the Sidebar rail between sidebar and content */}
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-headline font-semibold truncate">{document.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Opened by {document.owner?.name ?? 'Unknown'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ShareDialog>
                <Button size={isMobile ? "sm" : "default"} className="text-xs sm:text-sm">
                    <Share2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {isMobile ? "Share" : "Share"}
                </Button>
            </ShareDialog>
        </div>
      </header>
            <main className="flex-1 overflow-hidden">
                {/* Two-column layout: main document preview first, snippet/output box on the right. When there is no response, center the preview and collapse the snippet column so the document isn't squashed. */}
                <div className={cn("flex h-full gap-6 p-4", !hasResponse ? 'justify-center' : 'justify-start')}>
                    {/* Left: snippets column (accordion dropdowns) - hidden until responseDetail exists. */}
                    <div className={cn(
                        "hidden md:block transition-all duration-300 ease-out",
                        hasResponse ? 'md:w-80 lg:w-96 opacity-100' : 'md:w-0 lg:w-0 opacity-0 pointer-events-none'
                    )}>
                        <div className={cn(
                            hasResponse ? 'sticky top-20' : 'relative',
                            'flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-auto pr-2'
                        )}>
                            {responseDetail && (responseDetail.text || (responseDetail.documents && responseDetail.documents.length > 0)) ? (
                                <Accordion type="single" collapsible defaultValue="top" className="w-full">
                                    <AccordionItem value="top">
                                        <AccordionTrigger className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-t-md">Top-level Response</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="p-2">
                                                <ResponseSnippet title="Top-level Response" content={responseDetail.text} />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="related">
                                        <AccordionTrigger className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3">Possibly Related</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="p-2">
                                                <Card className="w-full">
                                                    <CardContent className="p-2 bg-background">
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                const rawDocs = (responseDetail?.documents || []).slice(0, 3);
                                                                if (!rawDocs || rawDocs.length === 0) {
                                                                    const placeholders = Array.from({ length: 3 }).map((_, i) => ({
                                                                        id: `suggested-${i}`,
                                                                        name: 'Suggested document',
                                                                        subtitle: 'Try a different query to reveal documents',
                                                                        summary: undefined,
                                                                        url: undefined,
                                                                        _placeholder: true,
                                                                    }));
                                                                    return placeholders.map((d: any) => (
                                                                        <DocumentCard
                                                                            key={d.id}
                                                                            id={d.id}
                                                                            name={d.name}
                                                                            subtitle={d.subtitle}
                                                                            summary={d.summary}
                                                                            url={d.url}
                                                                            onClick={() => { try { toast({ title: 'Suggestion', description: 'Try a different query or the workspace search to find related documents.' }); } catch (e) {} }}
                                                                        />
                                                                    ));
                                                                }

                                                                const docs = rawDocs.map((d: any) => {
                                                                    const id = d.id || d.documentId || d.document_id || '';
                                                                    const name = d.name || d.title || d.documentName || id || 'Untitled document';
                                                                    const url = d.url || (id ? `/documents/${id}` : undefined) || d.link || d.href;
                                                                    const subtitle = d.subtitle || d.folder || (d.folderId ? `Folder: ${d.folderId}` : undefined);
                                                                    return { ...d, id, name, url, subtitle };
                                                                });

                                                                return docs.map((d: any) => (
                                                                    <DocumentCard
                                                                        key={d.id || d.name}
                                                                        id={d.id || undefined}
                                                                        name={d.name}
                                                                        subtitle={d.subtitle}
                                                                        summary={d.summary}
                                                                        url={d.url}
                                                                        onClick={() => {
                                                                            if (!d.id && !d.url) { try { toast({ title: 'Suggestion', description: 'This suggestion cannot be opened. Try the workspace search to find the full document.' }); } catch (e) {} return; }
                                                                            try {
                                                                                if (typeof window !== 'undefined' && window.dispatchEvent) {
                                                                                    const documentId = d.id || (d.url ? (new URL(d.url, window.location.origin).pathname.split('/').pop()) : undefined);
                                                                                    window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: d.name } }));
                                                                                }
                                                                            } catch (e) {
                                                                                if (d.url) { try { window.open(d.url, '_blank'); } catch (err) {} }
                                                                            }
                                                                        }}
                                                                    />
                                                                ));
                                                            })()}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="more">
                                        <AccordionTrigger className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-b-md">More Info</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="p-2">
                                                <ResponseSnippet title="More Info" content={responseDetail.text ? `${responseDetail.text}\n\n(You can expand or view related documents for more context.)` : undefined} />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ) : null}
                        </div>
                    </div>

                    {/* Main: document preview - centered when no snippets, otherwise takes remaining space. Add right padding to ensure chat overlay doesn't cover content */}
                    <div className={cn(
                        "min-w-0 flex-1 flex justify-center",
                        // when chat is open on desktop, add extra right padding equal to chat width + gap
                        isChatOpen ? 'md:pr-[540px] lg:pr-[560px]' : 'md:pr-6 lg:pr-10'
                    )}>
                        <div className={cn(
                            // keep a sensible max width so the document preview doesn't stretch too wide
                            "h-full overflow-hidden rounded-md shadow-sm w-full",
                            !hasResponse ? 'max-w-[980px]' : 'max-w-[1200px]'
                        )}>
                            <DocumentPreview document={document} />
                        </div>
                    </div>
                </div>
            </main>
    </div>
  );
}
