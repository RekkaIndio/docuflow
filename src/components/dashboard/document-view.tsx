"use client";

import { useState, useEffect } from "react";
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
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import * as mammoth from "mammoth";

// Set worker source for pdfjs. This is critical for it to work in Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewProps {
  document: DocumentType;
  onBack: () => void;
}

const JsonViewer = ({ json }: { json: Record<string, any> | undefined }) => {
  if (!json || Object.keys(json).length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No structured data extracted for this document.
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={Object.keys(json)} className="w-full">
      {Object.entries(json).map(([key, value]) => (
        <AccordionItem value={key} key={key}>
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
    const [pageNumber, setPageNumber] = useState(1);
    const isMobile = useIsMobile();
    // Adjust default scale based on mobile
    const [scale, setScale] = useState(isMobile ? 1.0 : 1.5);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        setFileData(null);
      if (!doc.storagePath) {
          toast({ variant: 'destructive', title: 'Error', description: 'File path is missing.' });
          setIsLoading(false);
          return;
      }
  
      const fetchFile = async () => {
          try {
              const base64Data = await getDocumentAsBase64(doc.storagePath!);
              if(base64Data) {
                setFileData(`data:application/pdf;base64,${base64Data}`);
              } else {
                throw new Error("Received no data from server");
              }
          } catch (err: any) {
              console.error("Error fetching file for preview:", err);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not load file for preview.' });
          } finally {
            setIsLoading(false);
          }
      };

      fetchFile();

    }, [doc.id, doc.storagePath, toast]);

    // Update scale when mobile state changes
    useEffect(() => {
        setScale(isMobile ? 1.0 : 1.5);
    }, [isMobile]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    function onDocumentLoadError(error: Error) {
        console.error('PDF Load Error:', error);
        toast({ variant: 'destructive', title: 'PDF Error', description: `Failed to load PDF: ${error.message}` });
        setFileData(null); // This will cause a fallback to the download view
    }

    const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages!));

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Skeleton className="h-[80vh] w-[80%]" /></div>
    }

    if (!fileData) {
        return <DownloadOnlyPreview document={doc} />;
    }

    return (
        <div className="flex flex-col h-full items-center gap-2 sm:gap-4 py-2 sm:py-4">
             <div className="z-10 sticky top-2 flex items-center justify-center gap-1 sm:gap-2 p-2 bg-background/80 backdrop-blur-sm rounded-md border shadow-md">
                <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "icon"} 
                    onClick={() => setScale(s => s - 0.1)} 
                    disabled={scale <= 0.5}
                >
                    <ZoomOut className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                </Button>
                <span className="text-xs sm:text-sm font-medium w-12 sm:w-16 text-center">{(scale * 100).toFixed(0)}%</span>
                <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "icon"} 
                    onClick={() => setScale(s => s + 0.1)} 
                    disabled={scale >= 3}
                >
                    <ZoomIn className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                </Button>
                <div className="w-px h-4 sm:h-6 bg-border mx-1 sm:mx-2" />
                <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "icon"} 
                    onClick={goToPrevPage} 
                    disabled={pageNumber <= 1}
                >
                    <ChevronLeft className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                </Button>
                <span className="text-xs sm:text-sm font-medium w-16 sm:w-24 text-center">
                    {isMobile ? `${pageNumber}/${numPages}` : `Page ${pageNumber} of ${numPages}`}
                </span>
                <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "icon"} 
                    onClick={goToNextPage} 
                    disabled={pageNumber >= (numPages ?? 0)}
                >
                    <ChevronRight className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto w-full px-2 sm:px-4">
                <div className="flex justify-center">
                    <PdfDocument
                        file={fileData}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={<div className="flex justify-center items-center h-full"><Skeleton className="h-[80vh] w-[80%]" /></div>}
                        error={<p>Failed to load PDF.</p>}
                    >
                        <Page 
                            pageNumber={pageNumber} 
                            scale={scale} 
                            renderTextLayer={true}
                            width={isMobile ? Math.min(window.innerWidth - 32, 600) : undefined}
                        />
                    </PdfDocument>
                </div>
            </div>
        </div>
    );
};


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
    if (document.fileType === 'pdf') {
        return <PdfPreview document={document} />;
    }
    if (document.fileType === 'xlsx') {
        return <XlsxPreview document={document} />;
    }
    if (document.fileType === 'docx') {
        return <DocxPreview document={document} />;
    }
    return <DownloadOnlyPreview document={document} />;
}


export function DocumentView({ document, onBack }: DocumentViewProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-3 sm:p-4 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Hide SidebarTrigger on mobile since we have it in TopNav */}
            {!isMobile && <SidebarTrigger />}
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-headline font-semibold truncate">{document.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Opened by {document.owner.name}</p>
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
        {/* Document preview - summary, extracted and structured data are hidden but still available for chatbot */}
        <div className="flex-1 overflow-hidden">
          <DocumentPreview document={document} />
        </div>
      </main>
    </div>
  );
}
