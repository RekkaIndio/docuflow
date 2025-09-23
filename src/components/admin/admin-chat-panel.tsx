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
  type: 'document_search' | 'file_search' | 'folder_creation' | 'general_query' | 'multi_document_query' | 'workspace_open';
  openDocument?: boolean; // indicates intent to open/view the document
  searchTerm?: string;
  fileName?: string;
  workspaceName?: string;
  folderName?: string;
  originalInput: string;
}

// Enhanced message rendering function
function renderMessage(message: ChatMessage, onOpen?: (doc: { id?: string; name?: string; url?: string }) => void) {
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
                onClick={() => onOpen && onOpen({ id: docData.id, name: docData.name, url: docData.url })}
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
              onClick={() => onOpen && onOpen({ id: doc.id, name: doc.name, url: doc.url })}
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

export function AdminChatPanel({ selectedItem, onFolderAdd }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = React.useRef<ChatMessage[]>(messages);
  const appendMessages = (newMsgs: ChatMessage[] | ChatMessage) => {
    const toAppend = Array.isArray(newMsgs) ? newMsgs : [newMsgs];
    messagesRef.current = [...messagesRef.current, ...toAppend];
    setMessages(messagesRef.current);
  };
  const [searchAll, setSearchAll] = useState<boolean>(false);

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null); // Persist selected doc
  // Contextual memory: last discussed document or topic
  const [lastContext, setLastContext] = useState<{ doc?: Document; topic?: string } | null>(null);
  const { user } = useAuth();
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user?.avatarUrl ?? mockUser.avatarUrl ?? undefined);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [adminWorkspaces, setAdminWorkspaces] = useState<Array<{ id: string; name: string }>>([]);

  const workspaceId = (selectedItem as any)?.workspaceId ?? null;
  // Organisation-aware: selectedItem may include organisationId directly or nested under organisation
  const organisationIdFromSelected = (selectedItem as any)?.organisationId || (selectedItem as any)?.organisation?.id || null;

  // Handler to open a document (navigate/highlight)
  const onOpenDocument = (doc: { id?: string; name?: string; url?: string }) => {
    const documentId = doc.id || (doc.name || '').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: doc.name } }));
        localStorage.setItem('lastHighlightedDocumentId', documentId);
        if (doc.name) localStorage.setItem('lastHighlightedDocumentName', doc.name);
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId } })); } catch (e) {}
        }, 150);
      }
    } catch (e) {}
    toast({ title: 'Opened document', description: doc.name || documentId });
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        // Prefer workspace-saved image first (if selectedItem has a workspaceId).
        // Use organisation-scoped workspace doc when organisationId is available.
        const workspaceId = (selectedItem as any)?.workspaceId;
        const orgId = organisationIdFromSelected;
        if (workspaceId) {
          try {
            const wsDocRef = orgId
              ? doc(db, 'organisations', orgId, 'workspaces', workspaceId)
              : doc(db, 'workspaces', workspaceId);
            const wsSnap = await (await import('firebase/firestore')).getDoc(wsDocRef);
            if (wsSnap.exists()) {
              const data = wsSnap.data();
              if (data?.profilePicture) {
                setProfilePicture(data.profilePicture);
              }
            }
          } catch (e) {
            // fallback: ignore and continue to subscribe to user doc
          }
        }
      } catch (err) {
        // ignore outer errors
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

  // Load all workspaces for admin name-resolution
  useEffect(() => {
    (async () => {
      try {
  // Wait for auth hydration; prefer organisation from selectedItem when present, otherwise server-side user object
  const orgId = organisationIdFromSelected || (user as any)?.organisationId;
        const isDevAdmin = typeof document !== 'undefined' && document.cookie.includes('isAdmin=1');
        if (!orgId && !isDevAdmin) return;
        const orgQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
        const resp = await fetch(`/api/admin/workspaces${orgQuery}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const list = (data?.workspaces || []).map((w: any) => ({ id: w.id, name: w.name }));
        setAdminWorkspaces(list);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

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
      messagesRef.current = [];
      setMessages([]);
      setActiveDoc(null);
    } else {
      // If we've switched folders (i.e., selected a different folder), clear
      // the chat so the conversation context matches the newly-selected folder.
      // Do NOT clear when selection changes to a document so the chat stays
      // intact when navigating to a document from the chat.
      if (selectedItem.type === 'folder' && selectedItem.id !== prev.id) {
        messagesRef.current = [];
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
    // Workspace open patterns (admin wants to open a workspace)
    const workspacePatterns = [
      /^(open|go to|switch to|show)\s+(the\s+)?(.+?)\s*(workspace|workspaces)?$/i,
      /^(open|go to|switch to)\s+(.*?)(?:\s+workspace)?$/i
    ];
    for (const pattern of workspacePatterns) {
      const m = userInput.match(pattern);
      if (m) {
        const name = (m[3] || m[2] || '').trim();
        if (name) {
          return { type: 'workspace_open', workspaceName: name, originalInput: userInput };
        }
      }
    }

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

  // Attempt to resolve a workspace name mentioned in the input (simple fuzzy match)
  const resolveWorkspaceFromInput = (userInput: string) => {
    if (!adminWorkspaces || adminWorkspaces.length === 0) return null;
    const input = userInput.toLowerCase();
    // Exact name match first
    for (const ws of adminWorkspaces) {
      if (ws.name && input.includes(ws.name.toLowerCase())) return ws;
    }
    // Loose word-match: split workspace names into words and find best candidate
    const words = input.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    for (const ws of adminWorkspaces) {
      const nameWords = (ws.name || '').toLowerCase().split(/[^a-zA-Z0-9]+/).filter(Boolean);
      let matches = 0;
      for (const nw of nameWords) {
        if (words.includes(nw)) matches++;
      }
      if (matches >= Math.max(1, Math.floor(nameWords.length / 2))) return ws;
    }
    return null;
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
    const inputVal = input;
    const intent = detectIntent(inputVal);

    // Multi-document query support for admin panel
    if (intent && intent.type === 'multi_document_query') {
      // Search client-side first
      let allDocs: Document[] = [];
      if (selectedItem && selectedItem.type === 'folder') {
        allDocs = getAllDocuments([selectedItem]);
      }
      let multiResults: Document[] = [];
      try {
        const fuse = new Fuse(allDocs, {
          keys: [
            { name: 'name', weight: 0.5 },
            { name: 'tags', weight: 0.3 },
            { name: 'summary', weight: 0.2 }
          ],
          threshold: 0.45,
          ignoreLocation: true,
          minMatchCharLength: 2,
        });
        const fuseRes = fuse.search(inputVal);
        multiResults = fuseRes.map(r => r.item as Document);
      } catch (e) {
        multiResults = [];
      }

      // Server fallback if not enough client results
      if (multiResults.length < 2) {
        try {
          const resolvedWorkspace = resolveWorkspaceFromInput(inputVal);
          const workspaceIdCandidate = resolvedWorkspace?.id || (selectedItem as any)?.workspaceId;
          const organisationIdCandidate = organisationIdFromSelected || null;
          const searchBody: any = { query: inputVal };
          if (workspaceIdCandidate && !searchAll) searchBody.workspaceId = workspaceIdCandidate;
          else if (searchAll) searchBody.searchAll = true;
          else searchBody.searchAll = true;
          if (organisationIdCandidate) searchBody.organisationId = organisationIdCandidate;

          const searchRes = await fetch('/api/search-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchBody),
          });
          if (searchRes.ok) {
            const data = await searchRes.json();
            const results = data?.results || [];
            multiResults = results.map((r: any) => r as Document);
          }
        } catch (e) {
          // ignore
        }
      }

      if (multiResults.length < 2) {
        appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'I could not find enough relevant documents to compare or synthesize.' }]);
        setInput('');
        setIsTyping(false);
        return;
      }

      // Synthesize using up to 3 documents
      const docsJsonArr = multiResults.slice(0, 3).map(doc => doc.extractedJson || {});
      const synthResult = await chatWithDocuments({ query: inputVal, documentJson: JSON.stringify(docsJsonArr) });
      const documentCards = multiResults.slice(0, 3).map(doc => ({
        id: doc.id,
        name: doc.name,
        status: 'current' as const,
        url: `/documents/${doc.id}`,
        subtitle: doc.folderId ? `Folder: ${doc.folderId}` : undefined,
      }));

      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: synthResult.answer, documents: documentCards }]);
      setInput('');
      setIsTyping(false);
      return;
    }
    // Handle folder creation
    if (intent.type === 'folder_creation') {
      appendMessages({ sender: 'user', text: inputVal });
      setInput('');
      setIsTyping(true);
      try {
        if (typeof onFolderAdd === 'function') {
          const folderName = intent.folderName || 'Untitled Folder';
          onFolderAdd(folderName);
          appendMessages({ sender: 'ai', text: `Creating a new folder named \"${folderName}\"...` });
        } else {
          appendMessages({ sender: 'ai', text: `Sorry, I can't create folders in this context.` });
        }
      } catch (e) {
        appendMessages({ sender: 'ai', text: `Sorry, something went wrong while creating the folder.` });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle workspace open intent (admin wants to open/switch to a workspace)
    if (intent.type === 'workspace_open') {
      appendMessages({ sender: 'user', text: inputVal });
      setInput('');
      setIsTyping(true);
      try {
        const resolved = resolveWorkspaceFromInput(inputVal) || (intent.workspaceName ? adminWorkspaces.find(ws => ws.name.toLowerCase() === intent.workspaceName?.toLowerCase()) : null);
        if (resolved) {
          // Dispatch custom event for dashboard to pick up
          try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: resolved.id, workspaceName: resolved.name, organisationId: organisationIdFromSelected || undefined } }));
            }
          } catch (e) {}
          appendMessages({ sender: 'ai', text: `Opening workspace "${resolved.name}"...` });
        } else {
          appendMessages({ sender: 'ai', text: `I couldn't find a workspace named "${intent.workspaceName || inputVal}". Try a different name or check the workspace list.` });
        }
      } catch (e) {
        appendMessages({ sender: 'ai', text: `Failed to open workspace.` });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const newMessages: ChatMessage[] = [...messagesRef.current, { sender: 'user', text: inputVal }];
    appendMessages({ sender: 'user', text: inputVal });
    const userInput = inputVal;
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

        appendMessages({
          sender: 'ai',
          text: result.answer,
          documents: [documentCard]
        });
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

        appendMessages({ sender: 'ai', text: result.answer, documents: [documentCard] });
        setIsTyping(false);
        return;
      }

      // Resolve workspace from input if mentioned (e.g., "Wilton Manor")
      const resolvedWorkspace = resolveWorkspaceFromInput(userInput);
      // Search the workspace for relevant documents
  const workspaceIdCandidate = resolvedWorkspace?.id || (selectedItem as any)?.workspaceId;
  const organisationIdCandidate = organisationIdFromSelected || null;

      const searchQuery = intent.type === 'document_search' || intent.type === 'file_search'
        ? (intent.searchTerm || intent.fileName || userInput)
        : userInput;

      // Fast client-side search in the selected folder's nested documents
      // For admin searches across all workspaces we skip client-side Fuse
      let clientResults: Document[] = [];
      try {
        if (!searchAll && selectedItem && selectedItem.type === 'folder') {
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
        setLastContext({ doc: bestDoc });

        // If the user explicitly asked to open/view the document, navigate/open it instead of running the chat
        if (intent.openDocument) {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestDoc.id, documentName: bestDoc.name } })); } catch (e) {}
            try { localStorage.setItem('lastHighlightedDocumentId', bestDoc.id); localStorage.setItem('lastHighlightedDocumentName', bestDoc.name); } catch (e) {}
            setTimeout(() => {
              try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestDoc.id } })); } catch (e) {}
            }, 150);
          }

          appendMessages({ sender: 'ai', text: `Opening \"${bestDoc.name}\" for you.`, documents: [{ id: bestDoc.id, name: bestDoc.name, url: `/documents/${bestDoc.id}` }] });
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

        appendMessages({ sender: 'ai', text: result.answer, documents: [documentCard] });
        setIsTyping(false);
        return;
      }

      // Fall back to server search
      
      const searchBody: any = { query: searchQuery };
      // If we've resolved a workspace from the query prefer that
      if (workspaceIdCandidate && !searchAll) {
        searchBody.workspaceId = workspaceIdCandidate;
      } else if (searchAll) {
        // Admin explicitly requested all workspaces
        searchBody.searchAll = true;
      } else if (!workspaceIdCandidate && !searchAll) {
        // No workspace candidate found and not searching all: fall back to searchAll
        searchBody.searchAll = true;
      }
      if (organisationIdCandidate) searchBody.organisationId = organisationIdCandidate;

      // If we couldn't load adminWorkspaces and there's no resolved workspace,
      // avoid firing a costly cross-workspace search which may fail due to server-side
      // configuration. Ask the admin to toggle 'All' or try again.
      if (!workspaceIdCandidate && !searchAll && (!adminWorkspaces || adminWorkspaces.length === 0)) {
        appendMessages({ sender: 'ai', text: `I couldn't load workspace names to resolve your query (e.g. "Wilton Manor"). Please try toggling the scope to "All" to search across workspaces, or try again later.` });
        setIsTyping(false);
        return;
      }

      const searchRes = await fetch('/api/search-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });

      if (!searchRes.ok) {
        let msg = 'Failed to search for relevant documents.';
        try {
          const data = await searchRes.json();
          if (data?.error) msg = data.error + (data?.details ? `: ${data.details}` : '');
          else if (data?.details) msg = data.details;
        } catch (e) {
          // ignore parse errors
        }
        appendMessages({ sender: 'ai', text: msg });
        setIsTyping(false);
        return;
      }

      const { results, bestMatch } = await searchRes.json();
      if (!results || results.length === 0 || !bestMatch) {
        let noResultsMessage = 'No relevant documents found in this workspace.';
        if (intent.type === 'document_search') {
          noResultsMessage = `I couldn't find any documents related to \"${intent.searchTerm}\". Please try a different search term or check if the document exists in this workspace.`;
        } else if (intent.type === 'file_search') {
          noResultsMessage = `I couldn't find the file \"${intent.fileName}\". Please check the filename and try again.`;
        }
        appendMessages({ sender: 'ai', text: noResultsMessage });
        setIsTyping(false);
        return;
      }

  const bestDoc = results[0];
  setActiveDoc(bestDoc);
  setLastContext({ doc: bestDoc });

      // If the user asked to open/view the document, navigate/open the best match and return
      if (intent.openDocument) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.documentId, documentName: bestMatch.name } })); } catch (e) {}
          try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.documentId); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.documentId } })); } catch (e) {}
          }, 150);
        }

        appendMessages({ sender: 'ai', text: `Opening \"${bestMatch.name}\" for you.`, documents: [{ id: bestMatch.documentId, name: bestMatch.name, url: `/documents/${bestMatch.documentId}` }] });
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
        responsePrefix = `I found information about \"${intent.searchTerm}\". `;
      } else if (intent.type === 'file_search') {
        responsePrefix = `Here's the information from \"${intent.fileName}\". `;
      }

      appendMessages({ sender: 'ai', text: responsePrefix + result.answer, documents: documentCards });

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
  // Rollback last user message on error
  messagesRef.current = messagesRef.current.slice(0, -1);
  setMessages(messagesRef.current);
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
        <div className="flex items-center gap-3 justify-between">
          <Avatar className="w-10 h-10 border-2 border-blue-200">
            <AvatarImage src={'/Neurodiversity_Symbol.png'} alt="CareBot AI" />
            <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">Doc - Admin Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/90 mr-2">Scope</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSearchAll(false)}
                className={`px-2 py-1 text-xs rounded ${!searchAll ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}
                aria-pressed={!searchAll}
              >
                Current
              </button>
              <button
                onClick={() => setSearchAll(true)}
                className={`px-2 py-1 text-xs rounded ${searchAll ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}
                aria-pressed={searchAll}
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30" ref={scrollAreaRef}>
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] text-center text-gray-600">
            <Avatar className="w-16 h-16 border-2 border-blue-200 mb-4">
              <AvatarImage src={'/Neurodiversity_Symbol.png'} alt="CareBot AI" />
              <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
            </Avatar>
            <h4 className="text-lg font-semibold text-gray-800">Doc - Admin Assistant</h4>
            <p className="mt-2 text-sm max-w-[60%]">Ask a question across workspaces, or about workspace-level settings and statistics.</p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me the occupancy stats for the last month'); setTimeout(() => handleSend(), 60); }}>
                Occupancy stats (last month)
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('List all workspaces with overdue renewals'); setTimeout(() => handleSend(), 60); }}>
                Workspaces with overdue renewals
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Which workspaces have the highest document counts?'); setTimeout(() => handleSend(), 60); }}>
                Top document counts
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me teams with the most members'); setTimeout(() => handleSend(), 60); }}>
                Teams with most members
              </Button>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? 'justify-end' : '')}>
              {message.sender === 'ai' && (
                <Avatar className="w-10 h-10 border-2 border-blue-200">
                  <AvatarImage src={'/Neurodiversity_Symbol.png'} alt={mockUser.name || undefined} />
                  <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">AI</AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                  "max-w-[75%] rounded-2xl p-4 text-sm shadow-sm",
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
                    : 'bg-white border border-gray-200'
              )}>
                {message.sender === 'ai' ? renderMessage(message, onOpenDocument) : (
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
              <AvatarImage src={'/Neurodiversity_Symbol.png'} alt="AI" />
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
            placeholder="Ask me anything across workspaces... 'Which workspaces have overdue renewals', 'Show occupancy trends', 'List top workspaces by documents'..."
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
