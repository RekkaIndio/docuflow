"use client";

import type { Document, Folder } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerDownLeft, Search, FileText, CalendarClock } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import Fuse from 'fuse.js';
import { useAuth } from '@/hooks/use-auth';
import { mockUser } from "@/lib/data";
import { cn } from "@/lib/utils";
import { chatWithDocuments } from "@/ai/flows/chat-with-documents";
// import { chatWithFolder } from "@/ai/flows/chat-with-folder";
import { useToast } from "@/hooks/use-toast";
import { DocumentCard } from "@/components/ui/document-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandInput,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
  } from "@/components/ui/command";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";


interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  documents?: Array<{
    id: string;
    name: string;
    status?: 'current' | 'due-soon' | 'overdue' | 'updated';
    statusText?: string;
    subtitle?: string;
    url?: string;
    lastReviewed?: string;
    nextReviewRequired?: string;
  }>;
}

interface ChatPanelProps {
  selectedItem: Document | Folder;
  onFolderAdd: (folderName: string) => void;
}

interface UserIntent {
  type: 'document_search' | 'file_search' | 'folder_creation' | 'general_query';
  openDocument?: boolean; // indicates intent to open/view the document
  searchTerm?: string;
  fileName?: string;
  folderName?: string;
  originalInput: string;
}

// Enhanced message rendering function
function renderMessage(message: ChatMessage) {
  const parts = message.text.split(/(\[DOCUMENT:.*?\])/);
  
  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        // Check if this part is a document placeholder
        const documentMatch = part.match(/\[DOCUMENT:(.*?)\]/);
        if (documentMatch) {
          try {
            const docData = JSON.parse(documentMatch[1]);
            return (
              <DocumentCard
                key={index}
                name={docData.name}
                status={docData.status}
                statusText={docData.statusText}
                subtitle={docData.subtitle}
                url={docData.url}
                lastReviewed={docData.lastReviewed}
                nextReviewRequired={docData.nextReviewRequired}
              />
            );
          } catch (e) {
            return null; // Skip invalid document data
          }
        }
        
        // Regular text content
        if (part.trim()) {
          return (
            <p key={index} className="whitespace-pre-wrap leading-relaxed">
              {part}
            </p>
          );
        }
        
        return null;
      })}
      
      {/* Render any additional documents */}
      {message.documents && message.documents.length > 0 && (
        <div className="space-y-2 mt-3">
          {message.documents.map((doc, index) => (
            <DocumentCard
              key={index}
              id={doc.id}
              name={doc.name}
              status={doc.status}
              statusText={doc.statusText}
              subtitle={doc.subtitle}
              url={doc.url}
              lastReviewed={doc.lastReviewed}
              nextReviewRequired={doc.nextReviewRequired}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Command menu removed

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

export function ChatPanel({ selectedItem, onFolderAdd }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null); // Persist selected doc
  const { user } = useAuth();
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user?.avatarUrl ?? mockUser.avatarUrl ?? undefined);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const workspaceId = (selectedItem as any)?.workspaceId ?? null;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        // Prefer workspace-saved image first (if selectedItem has a workspaceId)
        const workspaceId = (selectedItem as any)?.workspaceId;
        if (workspaceId) {
          const wsDocRef = doc(db, 'users', workspaceId);
          const wsSnap = await (await import('firebase/firestore')).getDoc(wsDocRef);
          if (wsSnap.exists()) {
            const data = wsSnap.data();
            if (data?.profilePicture) {
              setProfilePicture(data.profilePicture);
            }
          }
        }
      } catch (err) {
        // ignore
      }

      // Then subscribe to the authenticated user's doc for live updates
      const userIdToUse = user?.id ?? mockUser.id;
      if (!userIdToUse) return;
      const userDocRef = doc(db, 'users', userIdToUse);
      unsubscribe = onSnapshot(userDocRef, (snap) => {
        const data = snap.data();
        if (data?.profilePicture) {
          setProfilePicture(data.profilePicture);
        } else if (user?.avatarUrl) {
          setProfilePicture(user.avatarUrl);
        }
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id, workspaceId]);

  // Keep chat conversation when navigating to a document. Only reset the chat
  // when the selected folder/workspace changes. This prevents the chat from
  // appearing to refresh (losing the user's input) when we navigate to a
  // document (for example, when the user asks "Show me the IPC policy" and
  // the dashboard sets the selected item to that document).
  const prevSelectedRef = useRef<{ id?: string; type?: string } | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;

    // First mount: start with an empty conversation and no active doc
    if (!prev) {
      setMessages([]);
      setActiveDoc(null);
    } else {
      // If we've switched folders (i.e., selected a different folder), clear
      // the chat so the conversation context matches the newly-selected folder.
      // Do NOT clear when selection changes to a document so the chat stays
      // intact when navigating to a document from the chat.
      if (selectedItem.type === 'folder' && selectedItem.id !== prev.id) {
        setMessages([]);
        setActiveDoc(null);
      }
    }

    prevSelectedRef.current = { id: selectedItem.id, type: selectedItem.type };
  }, [selectedItem.id, selectedItem.type]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);





  // Enhanced natural language intent detection
  const detectIntent = (userInput: string): UserIntent => {
    const input = userInput.toLowerCase().trim();

    // Document search patterns - much more flexible
    const searchPatterns = [
      // Direct requests
      /^(please\s+)?(find|show|get|give|display|locate|open|search|look\s+for|bring\s+up|pull\s+up|summarize|summarise|summarise\s+for\s+me|summarize\s+for\s+me)\s+(me\s+)?(the\s+)?(.+)/i,
      // Question formats
      /^(can\s+you\s+|could\s+you\s+|would\s+you\s+)?(please\s+)?(find|show|get|give|display|locate|search|look\s+for|bring\s+up|pull\s+up)\s+(me\s+)?(the\s+)?(.+)/i,
      // "I need" formats
      /^(i\s+need|i\s+want|i\s+require|i\s+am\s+looking\s+for|i\s+would\s+like)\s+(to\s+see\s+|to\s+find\s+|to\s+access\s+|the\s+)?(.+)/i,
      // "Where is" formats
      /^(where\s+is|where\s+can\s+i\s+find|where\s+are|do\s+you\s+have)\s+(the\s+)?(.+)/i,
  // "Help me" formats
  /^(help\s+me\s+|assist\s+me\s+with\s+|guide\s+me\s+to\s+)?(find|locate|access|get|summarize|summarise|summarize\s+the|summarise\s+the)\s+(the\s+)?(.+)/i,
      // Document type requests
      /^(what|which)\s+(documents?|policies|files?|papers?)\s+(do\s+we\s+have\s+|are\s+there\s+|exist\s+)?(about|for|regarding|on|related\s+to)\s+(.+)/i,
  // Status/info requests
  /^(what\s+is\s+the\s+status\s+of|when\s+is|tell\s+me\s+about|information\s+about|details\s+about|summarize|summarise)\s+(the\s+)?(.+)/i,
      // Folder-specific requests
      /^(look\s+in\s+the\s+(.+?)\s+folder\s+and\s+find\s+me\s+the\s+(.+))$/i,
      /^(in\s+the\s+(.+?)\s+folder\s+find\s+me\s+the\s+(.+))$/i,
      /^(find\s+me\s+the\s+(.+?)\s+folder)$/i
    ];

    // Check for document search intent
    for (const pattern of searchPatterns) {
      const match = input.match(pattern);
      if (match) {
        // Extract the search term from various capture groups
        const searchTerm = match[match.length - 1] || match[match.length - 2] || match[4] || match[5] || match[6];
        if (searchTerm && searchTerm.trim()) {
          // Also detect verbs that imply the user wants to open/view the document rather than just get info
          const openVerbs = /\b(open|view|expand|show\s+me\s+the)\b/i;
          const wantsOpen = openVerbs.test(input);

          return {
            type: 'document_search',
            openDocument: wantsOpen,
            searchTerm: searchTerm.trim(),
            originalInput: userInput
          };
        }
      }
    }

    // Folder creation patterns
    const folderPatterns = [
      /(create|add|make|new)\s+(a\s+|the\s+|another\s+)?folder(\s+called|\s+named|\s+titled|\s+with\s+name)?\s*(.+)?/i,
      /^(can\s+you\s+|could\s+you\s+|please\s+)?(create|add|make)\s+(a\s+|the\s+)?folder(\s+called|\s+named|\s+titled)?\s*(.+)?/i,
      /^(i\s+need|i\s+want)\s+(a\s+|to\s+create\s+a\s+)?new\s+folder(\s+called|\s+named)?\s*(.+)?/i
    ];
    
    for (const pattern of folderPatterns) {
      const match = input.match(pattern);
      if (match) {
        const folderName = (match[4] || match[5] || '').trim() || 'Untitled Folder';
        return {
          type: 'folder_creation',
          folderName,
          originalInput: userInput
        };
      }
    }
    
    // File name patterns (existing logic)
    const filePattern = /([\w\-. ]+\.(pdf|docx?|txt|csv|xlsx))/i;
    const fileMatch = userInput.match(filePattern);
    if (fileMatch) {
      return {
        type: 'file_search',
        fileName: fileMatch[1],
        originalInput: userInput
      };
    }
    
    // Default to general query
    return {
      type: 'general_query',
      originalInput: userInput
    };
  };

  // Safe date formatter: returns empty string for invalid/empty dates
  const formatDateSafe = (dateLike?: string | number | Date | null | undefined) => {
    if (!dateLike) return '';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike as any);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const handleSend = async () => {
    if (input.trim() === '') return;

    const intent = detectIntent(input);

    // Handle folder creation
    if (intent.type === 'folder_creation') {
      setMessages([...messages, { sender: 'user', text: input }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof onFolderAdd === 'function') {
          const folderName = intent.folderName || 'Untitled Folder';
          console.log('onFolderAdd called with:', folderName);
          onFolderAdd(folderName);
          setMessages(prev => [...prev, { sender: 'ai', text: `Creating a new folder named "${folderName}"...` }]);
        } else {
          setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I can't create folders in this context.` }]);
        }
      } catch (e) {
        setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, something went wrong while creating the folder.` }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    try {
      let result;
      // If the chat was opened while viewing a specific document we previously
      // always used that document as the context. However, when the user query
      // is an explicit document/file search (e.g. "Show me the COSHH Policy" or
      // a filename) we should perform a workspace search instead of assuming the
      // current selected document is the intended target. Only use the
      // selectedItem document when the intent is NOT a document/file search.
      if (selectedItem.type === 'document' && intent.type !== 'document_search' && intent.type !== 'file_search') {
        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(selectedItem.extractedJson || {}),
        });

        const createdDate = formatDateSafe(selectedItem.createdAt);
        const documentCard = {
          id: selectedItem.id,
          name: selectedItem.name,
          status: 'current' as const,
          url: `/documents/${selectedItem.id}`,
          subtitle: createdDate ? `Created: ${createdDate}` : undefined
        };

        setMessages([...newMessages, {
          sender: 'ai',
          text: result.answer,
          documents: [documentCard]
        }]);
        setIsTyping(false);
        return;
      }

      // At this point selectedItem is a folder/workspace
      const shouldSearchNewDocument = intent.type === 'document_search' || intent.type === 'file_search' || !activeDoc;

      if (activeDoc && !shouldSearchNewDocument) {
        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(activeDoc.extractedJson || {}),
        });

        const activeCreated = formatDateSafe(activeDoc.createdAt);
        const documentCard = {
          id: activeDoc.id,
          name: activeDoc.name,
          status: 'current' as const,
          url: `/documents/${activeDoc.id}`,
          subtitle: activeDoc.folderId ? `Folder: ${activeDoc.folderId}` : (activeCreated ? `Created: ${activeCreated}` : undefined)
        };

        setMessages([
          ...newMessages,
          {
            sender: 'ai',
            text: result.answer,
            documents: [documentCard]
          },
        ]);
        setIsTyping(false);
        return;
      }

      // Search the workspace for relevant documents
      const workspaceId = selectedItem.workspaceId;
      if (!workspaceId) {
        setMessages([...newMessages, { sender: 'ai', text: 'Workspace ID not found for this folder.' }]);
        setIsTyping(false);
        return;
      }

      const searchQuery = intent.type === 'document_search' || intent.type === 'file_search'
        ? (intent.searchTerm || intent.fileName || userInput)
        : userInput;

      // Fast client-side search in the selected folder's nested documents
      let clientResults: Document[] = [];
      try {
        if (selectedItem && selectedItem.type === 'folder') {
          const allDocs = getAllDocuments([selectedItem]);
          // Use Fuse.js for flexible fuzzy matching. We weight name higher than tags and summary.
          const fuse = new Fuse(allDocs, {
            keys: [
              { name: 'name', weight: 0.5 },
              { name: 'tags', weight: 0.3 },
              { name: 'summary', weight: 0.2 }
            ],
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
          });

          const fuseRes = fuse.search(searchQuery || '');
          clientResults = fuseRes.map(r => r.item as Document);
        }
      } catch (err) {
        clientResults = [];
      }

      if (clientResults && clientResults.length > 0) {
        const bestDoc = clientResults[0];
        setActiveDoc(bestDoc);

        // If the user explicitly asked to open/view the document, navigate/open it instead of running the chat
        if (intent.openDocument) {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestDoc.id, documentName: bestDoc.name } })); } catch (e) {}
            try { localStorage.setItem('lastHighlightedDocumentId', bestDoc.id); localStorage.setItem('lastHighlightedDocumentName', bestDoc.name); } catch (e) {}
            setTimeout(() => {
              try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestDoc.id } })); } catch (e) {}
            }, 150);
          }

          setMessages(prev => [...prev, { sender: 'ai', text: `Opening "${bestDoc.name}" for you.`, documents: [{ id: bestDoc.id, name: bestDoc.name, url: `/documents/${bestDoc.id}` }] }]);
          setIsTyping(false);
          return;
        }

        result = await chatWithDocuments({ query: userInput, documentJson: JSON.stringify(bestDoc.extractedJson || {}) });
        const documentCard = {
          id: bestDoc.id,
          name: bestDoc.name,
          status: 'current' as const,
          url: `/documents/${bestDoc.id}`,
          subtitle: bestDoc.folderId ? `Folder: ${bestDoc.folderId}` : undefined
        };

        // If the user explicitly asked to open the document we navigate; otherwise only highlight
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { localStorage.setItem('lastHighlightedDocumentId', bestDoc.id); localStorage.setItem('lastHighlightedDocumentName', bestDoc.name); } catch (e) {}
          if (intent.openDocument) {
            try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestDoc.id, documentName: bestDoc.name } })); } catch (e) {}
          }
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestDoc.id } })); } catch (e) {}
          }, 150);
        }

        setMessages([
          ...newMessages,
          {
            sender: 'ai',
            text: result.answer,
            documents: [documentCard]
          },
        ]);
        setIsTyping(false);
        return;
      }

      // Fall back to server search
      
      const searchRes = await fetch('/api/search-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, query: searchQuery }),
      });

      if (!searchRes.ok) {
        setMessages([...newMessages, { sender: 'ai', text: 'Failed to search for relevant documents.' }]);
        setIsTyping(false);
        return;
      }

      const { results, bestMatch } = await searchRes.json();
      if (!results || results.length === 0 || !bestMatch) {
        let noResultsMessage = 'No relevant documents found in this workspace.';
        if (intent.type === 'document_search') {
          noResultsMessage = `I couldn't find any documents related to "${intent.searchTerm}". Please try a different search term or check if the document exists in this workspace.`;
        } else if (intent.type === 'file_search') {
          noResultsMessage = `I couldn't find the file "${intent.fileName}". Please check the filename and try again.`;
        }
        setMessages([...newMessages, { sender: 'ai', text: noResultsMessage }]);
        setIsTyping(false);
        return;
      }

      const bestDoc = results[0];
      setActiveDoc(bestDoc);

      // If the user asked to open/view the document, navigate/open the best match and return
      if (intent.openDocument) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.documentId, documentName: bestMatch.name } })); } catch (e) {}
          try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.documentId); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.documentId } })); } catch (e) {}
          }, 150);
        }

        setMessages(prev => [...prev, { sender: 'ai', text: `Opening "${bestMatch.name}" for you.`, documents: [{ id: bestMatch.documentId, name: bestMatch.name, url: `/documents/${bestMatch.documentId}` }] }]);
        setIsTyping(false);
        return;
      }

      result = await chatWithDocuments({ query: userInput, documentJson: JSON.stringify(bestDoc.extractedJson || {}) });

      // If the user explicitly asked to open the document we navigate; otherwise only highlight
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.documentId); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
        if (intent.openDocument) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.documentId, documentName: bestMatch.name } })); } catch (e) {}
        }
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.documentId } })); } catch (e) {}
        }, 150);
      }

        const documentCards = results.slice(0, 3).map((doc: any) => {
        const created = formatDateSafe(doc.createdAt);
        const lastReviewed = doc.lastReviewed || created || '';
        const nextReview = doc.nextReviewRequired || (doc.renewalDate ? `by ${formatDateSafe(doc.renewalDate)}` : '');
        return {
        id: doc.id,
        name: doc.name,
        status: doc.status || (doc.renewalDate ? (new Date(doc.renewalDate) < new Date() ? 'overdue' : new Date(doc.renewalDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) ? 'due-soon' : 'current') : 'current'),
        statusText: doc.statusText,
        subtitle: doc.subtitle || (created ? `Created: ${created}` : undefined),
        url: doc.url || `/documents/${doc.id}`,
        lastReviewed: lastReviewed || undefined,
        nextReviewRequired: nextReview || undefined
      }});

      let responsePrefix = '';
      if (intent.type === 'document_search') {
        responsePrefix = `I found information about "${intent.searchTerm}". `;
      } else if (intent.type === 'file_search') {
        responsePrefix = `Here's the information from "${intent.fileName}". `;
      }

      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: responsePrefix + result.answer,
          documents: documentCards
        },
      ]);

    } catch (error: any) {
      console.error("Error chatting:", error);
      let errorMessage = "Failed to get an answer from the AI. Please try again.";
      if (error.message && (error.message.includes('503') || error.message.includes('overloaded'))) {
        errorMessage = "The AI is currently busy, please try again in a moment.";
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      setMessages(newMessages.slice(0, -1));
      setInput(userInput);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <div className="flex flex-col h-full bg-background rounded-lg overflow-hidden border border-blue-200/50 shadow-lg">
      {/* Header matching the Doc design */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-blue-200">
            <AvatarImage src={'/Neurodiversity_Symbol.svg'} alt="CareBot AI" />
            <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">Doc - Document Assistant</h3>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30" ref={scrollAreaRef}>
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center text-gray-600">
            <Avatar className="w-16 h-16 border-2 border-blue-200 mb-4">
              <AvatarImage src={'/Neurodiversity_Symbol.svg'} alt="CareBot AI" />
              <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
            </Avatar>
            <h4 className="text-lg font-semibold text-gray-800">Doc - Document Assistant</h4>
            <p className="mt-2 text-sm max-w-[60%]">Ask a question about your policies or documents. Try one of the suggested prompts below to get started.</p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me the COSHH Policy'); setTimeout(() => handleSend(), 60); }}>
                Show me the COSHH Policy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me the IPC policy'); setTimeout(() => handleSend(), 60); }}>
                Show me the IPC policy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Find the medicine policy'); setTimeout(() => handleSend(), 60); }}>
                Find the medicine policy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('What documents do we have about safeguarding?'); setTimeout(() => handleSend(), 60); }}>
                Safeguarding documents
              </Button>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? 'justify-end' : '')}>
              {message.sender === 'ai' && (
                <Avatar className="w-10 h-10 border-2 border-blue-200">
                  <AvatarImage src={'/Neurodiversity_Symbol.svg'} alt={mockUser.name || undefined} />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                  "max-w-[75%] rounded-2xl p-4 text-sm shadow-sm",
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
                    : 'bg-white border border-gray-200'
              )}>
                {message.sender === 'ai' ? renderMessage(message) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                )}
              </div>
               {message.sender === 'user' && (
                <Avatar className="w-10 h-10 border-2 border-blue-200">
                  <AvatarImage src={profilePicture || mockUser.avatarUrl || undefined} alt={mockUser.name || undefined} />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">
                    {mockUser.name ? mockUser.name.charAt(0) : '?'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
         {isTyping && (
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 border-2 border-blue-200">
              <AvatarImage src={'/Neurodiversity_Symbol.svg'} alt="AI" />
              <AvatarFallback className="bg-blue-500 text-white text-sm font-semibold">AI</AvatarFallback>
            </Avatar>
            <div className="max-w-[75%] rounded-2xl p-4 text-sm bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-white shrink-0">
        <div className="relative">
          <Textarea
            placeholder="Ask me anything... 'Please find the medicine policy', 'Show me documents about safeguarding', 'I need the health and safety procedures'..."
            className="w-full resize-none pr-12 min-h-[48px] border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-300 transition-colors"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isTyping}
            rows={1}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost" 
              onClick={handleSend} 
              disabled={isTyping || !input.trim()}
              className="hover:bg-blue-50 text-blue-600"
            >
              <CornerDownLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

