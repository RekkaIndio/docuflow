"use client";

import type { Document, Folder } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerDownLeft, Share2 } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import Fuse from 'fuse.js';
import { useAuth } from '@/hooks/use-auth';
import { mockUser } from "@/lib/data";
import { cn } from "@/lib/utils";
import { chatWithDocuments } from "@/ai/flows/chat-with-documents";
import { chatWithFolder } from "@/ai/flows/chat-with-folder";
import { useToast } from "@/hooks/use-toast";
import { DocumentCard } from "@/components/ui/document-card";
import { UserCard } from "@/components/ui/user-card";
import { TeamCard } from "@/components/ui/team-card";
import { ActionCard } from "@/components/ui/action-card";
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
    id?: string;
    name: string;
    status?: 'current' | 'due-soon' | 'overdue' | 'updated';
    statusText?: string;
    subtitle?: string;
    url?: string;
    lastReviewed?: string;
    nextReviewRequired?: string;
    summary?: string;
  }>;
  users?: Array<{
    id?: string;
    name: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
    createdAt?: string;
  }>;
  teams?: Array<{
    id?: string;
    name: string;
    memberCount?: number;
    description?: string;
  }>;
  actions?: Array<{
    id?: string;
    title: string;
    description?: string;
    status?: 'pending' | 'completed' | 'overdue';
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }>;
}

interface ChatPanelProps {
  selectedItem: Document | Folder;
  onFolderAdd: (folderName: string) => void;
}

interface UserIntent {
  type: 'document_search' | 'file_search' | 'folder_creation' | 'general_query' | 'multi_document_query' | 'audit_query' | 'send_email' | 'user_search' | 'create_audit' | 'document_connection' | 'dependency_query' | 'user_profile' | 'team_info' | 'workspace_info' | 'open_modal' | 'navigate_page' | 'fetch_notifications' | 'create_document' | 'edit_document' | 'occupancy_data' | 'action_plans' | 'open_audit' | 'advanced_analytics' | 'agentic_workflow' | 'open_policy';
  openDocument?: boolean; // indicates intent to open/view the document
  searchTerm?: string;
  fileName?: string;
  folderName?: string;
  auditType?: string;
  emailSubject?: string;
  emailBody?: string;
  userName?: string;
  modalType?: string;
  pagePath?: string;
  documentType?: string;
  specificAppraisal?: string; // specific appraisal name for opening
  specificAudit?: string; // specific audit type for opening
  createAudit?: boolean; // indicates intent to create a new audit
  specificPolicy?: string; // specific policy name for opening
  originalInput: string;
}

// renderMessage will be declared inside the ChatPanel component so it can
// use state and the toast hook for interactive actions.

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
  const messagesRef = React.useRef<ChatMessage[]>(messages);
  const appendMessages = (newMsgs: ChatMessage[] | ChatMessage) => {
    const toAppend = Array.isArray(newMsgs) ? newMsgs : [newMsgs];
    messagesRef.current = [...messagesRef.current, ...toAppend];
    setMessages(messagesRef.current);
  };
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null); // Persist selected doc
  // Contextual memory: last discussed document(s) or topic(s)
  const [lastContext, setLastContext] = useState<{ doc?: Document; topic?: string } | null>(null);
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

  // keep a ref copy of messages to avoid stale closures when appending
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Emit a custom event when an AI response is appended so other UI (like DocumentView)
  // can listen and show the response in a snippet panel.
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last && last.sender === 'ai') {
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('chat-response', { detail: { text: last.text, documents: last.documents || [] } }));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [messages]);





  // Enhanced natural language intent detection
  const detectIntent = (userInput: string): UserIntent => {
    const raw = userInput || '';
    const input = raw.toLowerCase().trim();
    
    // Audit query patterns - check these FIRST before document search
    const auditPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?audit\s+(results?|scores?|status|completion)/i,
      /(audit|audits)\s+(results?|scores?|status|completion)/i,
      /(what\s+is\s+the\s+status\s+of|check)\s+(the\s+)?audit/i,
      /(are\s+there\s+any|list)\s+(overdue|pending|completed)\s+audits/i
    ];

    for (const pattern of auditPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'audit_query',
          originalInput: userInput
        };
      }
    }

    // Dependency/staffing query patterns - check before document search
    const dependencyPatterns = [
      /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?(dependency|dependencies|staffing|staff)\s+(data|levels?|calculations?|requirements?|breakdown|analysis)/i,
      /(dependency|dependencies|staffing|staff)\s+(data|levels?|calculations?|requirements?|breakdown|analysis)/i,
      /(what\s+is\s+the|check|calculate)\s+(dependency|staffing)\s+(level|requirement|data)/i,
      /(how\s+many|what)\s+(staff|carers?|nurses?)\s+(do\s+we\s+need|are\s+required)/i,
      /(staffing\s+calculator|dependency\s+calculator|staffing\s+breakdown)/i,
      /(show\s+me|get)\s+(staffing|dependency)\s+(for|at)\s+(.+)/i
    ];

    for (const pattern of dependencyPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'dependency_query',
          originalInput: userInput
        };
      }
    }

    // Multi-document query patterns
    const multiDocPatterns = [
      /(compare|difference|differences|similarities|all|list|summarize all|summarise all|overview of|across|between|versus|vs\.?|compare .* and .*)/i
    ];
    for (const pattern of multiDocPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'multi_document_query',
          originalInput: userInput
        };
      }
    }

    // Policy opening patterns - check these before open modal patterns
    const policyOpeningPatterns = [
      /(?:show|open|view|display|get|find|bring\s+up|pull\s+up)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+policy/i,
      /(?:show|open|view|display|get|find)\s+(?:me\s+)?(?:the\s+)?policy\s+(?:for|about|on)\s+(.+)/i,
      /(?:let's|let\s+us)\s+(?:look\s+at|check\s+out|see)\s+(?:the\s+)?(.+?)\s+policy/i,
      /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:see|view|open)\s+(?:the\s+)?(.+?)\s+policy/i,
      /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:show|open|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+policy/i,
      /(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(.+?)\s+policy/i
    ];

    for (const pattern of policyOpeningPatterns) {
      const match = input.match(pattern);
      if (match) {
        let policyName = (match[1] || match[2] || '').trim();

        // Remove common words that aren't part of the policy name
        policyName = policyName.replace(/\b(the|me|my|an|a|for|about|on|let's|let\s+us|can\s+you|could\s+you|please|take\s+me|go\s+to|navigate\s+to|i\s+want|i\s+need|to\s+see|to\s+view|to\s+open|policy)\b/g, '').trim();

        return {
          type: 'open_policy',
          specificPolicy: policyName,
          originalInput: userInput
        };
      }
    }

    // Open modal patterns - check these AFTER policy patterns
    const openModalPatterns = [
      // Specific appraisal patterns - must contain appraisal-related keywords
      /(open|show|launch|start|how)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
      /(go\s+to|navigate\s+to)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
      /(open|show|how)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)\s+(page|form)/i,
      // Handle "show me" and "how me" patterns with appraisal keywords
      /(show|how)\s+me\s+(.+?)\s+(appraisal|evaluation|assessment)/i,
      /(show|how)\s+me\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
      // Existing patterns for backward compatibility - specific modal types
      /(open|start|launch|show|how)\s+(the\s+)?(tracker|appraisal|audit)\s+(modal|window|form)/i,
      /(open|start|launch|show|how)\s+(tracker|appraisal|audit)/i,
      /(i\s+want\s+to|let's)\s+(track|appraise|audit)/i,
      // Direct appraisal name patterns - must have appraisal context
      /(i\s+want\s+to|let's)\s+(see|open|do)\s+(.+?)\s+(appraisal|evaluation|assessment)/i
    ];

    for (const pattern of openModalPatterns) {
      const match = input.match(pattern);
      if (match) {
        // Extract modal type from different capture group positions
        let modalType = '';
        let specificAppraisal = '';

        // Handle new direct appraisal patterns (patterns 1-4)
        if (pattern.source.includes('me\\s+(.+)') && match[2]) {
          // Pattern 1: /(show|open|launch|start|how)\s+me\s+(.+)/i
          specificAppraisal = match[2].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        } else if (pattern.source.includes('the\\s+)?(.+)') && !pattern.source.includes('appraisal|evaluation|assessment') && match[3]) {
          // Pattern 2: /(show|open|launch|start|how)\s+(the\s+)?(.+)/i
          specificAppraisal = match[3].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        } else if (pattern.source.includes('go\\s+to|navigate\\s+to') && match[2]) {
          // Pattern 3: /(go\s+to|navigate\s+to)\s+(.+)/i
          specificAppraisal = match[2].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        } else if (pattern.source.includes('want\\s+to|let\'s') && match[3]) {
          // Pattern 4: /(i\s+want\s+to|let's)\s+(see|open|do)\s+(.+)/i
          specificAppraisal = match[3].trim().toLowerCase();
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        }
        // Handle existing patterns
        else if (match[3] && ['tracker', 'appraisal', 'audit'].includes(match[3].toLowerCase())) {
          modalType = match[3].toLowerCase(); // For pattern 5: tracker/appraisal/audit
        } else if (match[2] && ['tracker', 'appraisal', 'audit'].includes(match[2].toLowerCase())) {
          modalType = match[2].toLowerCase(); // For pattern 6: tracker/appraisal/audit
        } else if (match[3] && ['track', 'appraise', 'audit'].includes(match[3].toLowerCase())) {
          // Convert verb forms to modal types
          const verbToModal = { 'track': 'tracker', 'appraise': 'appraisal', 'audit': 'audit' };
          modalType = verbToModal[match[3].toLowerCase() as keyof typeof verbToModal] || '';
        } else if (match[3] || match[4] || match[5] || match[6]) {
          // Specific appraisal name detected - check multiple capture groups (patterns 7-11)
          specificAppraisal = (match[3] || match[4] || match[5] || match[6] || '').trim().toLowerCase();
          // Remove common words that aren't part of the appraisal name
          specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
          modalType = 'specific-appraisal';
        }

        if (modalType) {
          return {
            type: 'open_modal',
            modalType: modalType,
            specificAppraisal: specificAppraisal,
            originalInput: userInput
          };
        }
      }
    }

    // Navigate page patterns - check these before document search
    const navigatePagePatterns = [
      /(go\s+to|navigate\s+to|open|show)\s+(the\s+)?(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)\s+(page|section)/i,
      /(go\s+to|navigate\s+to|open)\s+(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)/i,
      /(take\s+me\s+to|bring\s+me\s+to)\s+(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)/i
    ];

    for (const pattern of navigatePagePatterns) {
      const match = input.match(pattern);
      if (match) {
        const pagePath = (match[2] || match[3] || '').toLowerCase().replace(/\s+/g, '-');
        return {
          type: 'navigate_page',
          pagePath: pagePath,
          originalInput: userInput
        };
      }
    }

    // Special case: Handle "summarise this" and similar phrases that should use active document
    const summariseThisPatterns = [
      /\b(summaris|summarize|summarise)\s+(this|it|the\s+document|the\s+policy|the\s+file)\b/i,
      /\b(tell\s+me\s+about|what\s+is|explain)\s+(this|it|the\s+document|the\s+policy|the\s+file)\b/i,
      /\b(give\s+me\s+a\s+summary|provide\s+a\s+summary)\s+(of\s+)?(?:this|it|the\s+document|the\s+policy|the\s+file)\b/i
    ];

    for (const pattern of summariseThisPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'general_query',
          originalInput: userInput
        };
      }
    }

    // Document search patterns - much more flexible
    const searchPatterns = [
      // Direct requests
      /^(please\s+)?(find|show|get|give|display|locate|open|view|search|look\s+for|bring\s+up|pull\s+up|summarize|summarise|summarise\s+for\s+me|summarize\s+for\s+me)\s+(me\s+)?(the\s+)?(.+)/i,
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
        // Extract the search term from various capture groups (use raw for preserving case in locations)
        let searchTerm = (match[match.length - 1] || match[match.length - 2] || match[4] || match[5] || match[6] || '') as string;
        searchTerm = searchTerm.trim();
        if (searchTerm) {
          // Also detect verbs that imply the user wants to open/view the document rather than just get info
          const openVerbs = /\b(open|view|expand|show\s+me\s+the|open\s+the)\b/i;
          const wantsOpen = openVerbs.test(input);

          // try to extract a location/workspace phrase like 'in Wilton Manor' or 'for Wilton Manor'
          // prefer matching at end but also support inline
          const locationRegexEnd = /(?:in|at|for|from)\s+([A-Z0-9][\w\-\s&']{1,60})\.?$/i;
          const locationRegex = /(?:in|at|for|from)\s+([A-Z0-9][\w\-\s&']{1,60})/i;
          let folderName: string | undefined = undefined;
          const rawMatchEnd = raw.match(locationRegexEnd);
          const rawMatch = raw.match(locationRegex);
          if (rawMatchEnd && rawMatchEnd[1]) folderName = rawMatchEnd[1].trim();
          else if (rawMatch && rawMatch[1]) folderName = rawMatch[1].trim();

          // Remove trailing 'in <place>' from the searchTerm if present
          if (folderName) {
            const trailingPattern = new RegExp("\\b(?:in|at|for|from)\\s+" + folderName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "\\b\\.?$", 'i');
            searchTerm = searchTerm.replace(trailingPattern, '').trim();
          }

          return {
            type: 'document_search',
            openDocument: wantsOpen,
            searchTerm: searchTerm || undefined,
            folderName: folderName || undefined,
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

    // Send email patterns
    const emailPatterns = [
      /(send|email|mail)\s+(an?\s+)?email\s+(to\s+)?(the\s+)?(.+)/i,
      /(notify|alert)\s+(the\s+)?team\s+(about|regarding)\s+(.+)/i,
      /(message|contact)\s+(the\s+)?(.+)\s+(about|regarding)\s+(.+)/i
    ];

    for (const pattern of emailPatterns) {
      const match = input.match(pattern);
      if (match) {
        const content = (match[5] || match[4] || match[3] || '').trim();
        return {
          type: 'send_email',
          emailSubject: `Message from DocuFlow Chat`,
          emailBody: content || 'Please check your DocuFlow workspace for updates.',
          originalInput: userInput
        };
      }
    }

    // User search patterns
    const userPatterns = [
      /(find|search|look\s+for|who\s+is|get)\s+(me\s+)?(information\s+about|details\s+on|the\s+)?user\s+(.+)/i,
      /(who\s+is|tell\s+me\s+about)\s+(.+)/i,
      /(search\s+for|find)\s+(user|person)\s+(.+)/i
    ];

    for (const pattern of userPatterns) {
      const match = input.match(pattern);
      if (match) {
        const userName = (match[4] || match[2] || match[3] || '').trim();
        return {
          type: 'user_search',
          userName: userName,
          originalInput: userInput
        };
      }
    }

    // Audit opening patterns - handle various ways users ask to open audits
    const auditOpeningPatterns = [
      /(?:show|open|view|display|get|find|bring\s+up|pull\s+up)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit/i,
      /(?:show|open|view|display|get|find)\s+(?:me\s+)?(?:the\s+)?audit\s+(?:for|about|on)\s+(.+)/i,
      /(?:let's|let\s+us)\s+(?:look\s+at|check\s+out|see)\s+(?:the\s+)?(.+?)\s+audit/i,
      /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:see|view|open)\s+(?:the\s+)?(.+?)\s+audit/i,
      /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:show|open|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit/i,
      /(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(.+?)\s+audit/i
    ];

    for (const pattern of auditOpeningPatterns) {
      const match = input.match(pattern);
      if (match) {
        let auditName = (match[1] || match[2] || '').trim();

        // Remove common words that aren't part of the audit name
        auditName = auditName.replace(/\b(the|me|my|an|a|for|about|on|let's|let\s+us|can\s+you|could\s+you|please|take\s+me|go\s+to|navigate\s+to|i\s+want|i\s+need|to\s+see|to\s+view|to\s+open)\b/g, '').trim();

        // Map common variations to standard audit names
        const auditMappings: Record<string, string> = {
          'hand hygiene': 'hand-hygiene',
          'handhygiene': 'hand-hygiene',
          'accident incident': 'accident-incident',
          'accidentincident': 'accident-incident',
          'accident and incident': 'accident-incident',
          'call bell monitoring': 'call-bell-monitoring',
          'callbellmonitoring': 'call-bell-monitoring',
          'call bell': 'call-bell-monitoring',
          'care plan': 'care-plan',
          'careplan': 'care-plan',
          'equipment': 'equipment',
          'fire safety': 'fire-safety',
          'firesafety': 'fire-safety',
          'health safety': 'health-safety',
          'healthsafety': 'health-safety',
          'infection control': 'infection-control',
          'infectioncontrol': 'infection-control',
          'kitchen': 'kitchen',
          'kitchen & kitchenettes': 'kitchen',
          'maintenance': 'maintenance',
          'managers weekly': 'managers-weekly',
          'managersweekly': 'managers-weekly',
          'weekly managers': 'managers-weekly',
          'mealtime': 'mealtime',
          'meal time': 'mealtime',
          'night visit': 'night-visit',
          'nightvisit': 'night-visit',
          'restrictive practice': 'restrictive-practice',
          'restrictivepractice': 'restrictive-practice',
          'staff file': 'staff-file',
          'stafffile': 'staff-file',
          'weight monitoring': 'weight-monitoring',
          'weightmonitoring': 'weight-monitoring',
          'wound monitoring': 'wound-monitoring',
          'woundmonitoring': 'wound-monitoring',
          'risk register': 'risk-register',
          'riskregister': 'risk-register'
        };

        // Try to find a matching audit type
        let auditType = auditMappings[auditName.toLowerCase()] || auditName.toLowerCase().replace(/\s+/g, '-');

        // If we still don't have a valid audit type, try fuzzy matching
        if (!Object.values(auditMappings).includes(auditType)) {
          const auditTypes = Object.values(auditMappings);
          // Simple fuzzy match - find the closest match
          for (const type of auditTypes) {
            if (auditName.toLowerCase().includes(type.replace(/-/g, ' ')) ||
                type.replace(/-/g, ' ').includes(auditName.toLowerCase())) {
              auditType = type;
              break;
            }
          }
        }

        return {
          type: 'open_audit',
          specificAudit: auditType,
          originalInput: userInput
        };
      }
    }

    // Audit data querying patterns
    const auditDataPatterns = [
      /(?:show|tell|get|give)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit\s+(?:data|results|information|details|trends|comments|scores)/i,
      /(?:what\s+(?:are|is)\s+)?(?:the\s+)?(.+?)\s+audit\s+(?:results|data|comments|scores|trends)/i,
      /(?:show|tell|get)\s+(?:me\s+)?(?:the\s+)?audit\s+(?:data|results|information)\s+(?:for|about|on)\s+(.+)/i,
      /(?:what\s+(?:are|is)\s+)?(?:the\s+)?comments?\s+(?:in|for|from)\s+(?:the\s+)?(.+?)\s+audit/i,
      /(?:how\s+did|what\s+were)\s+(?:the\s+)?(.+?)\s+audit\s+(?:results|scores|perform)/i,
      /(?:audit\s+)?(?:data|results|information|trends)\s+(?:for|about|on)\s+(.+?)\s+audit/i
    ];

    for (const pattern of auditDataPatterns) {
      const match = input.match(pattern);
      if (match) {
        let auditName = (match[1] || match[2] || '').trim();

        // Remove common words that aren't part of the audit name
        auditName = auditName.replace(/\b(the|me|my|an|a|for|about|on|in|from|are|is|what|show|tell|get|give|how|did|were|audit|data|results|information|details|trends|comments|scores|perform|latest|all|recent)\b/g, '').trim();

        let auditType: string;

        // Handle special cases for "latest" or "all" queries
        if (input.toLowerCase().includes('latest') || input.toLowerCase().includes('all')) {
          auditType = 'all';
        } else {
          // Map common variations to standard audit names (same mapping as above)
          const auditMappings: Record<string, string> = {
            'hand hygiene': 'hand-hygiene',
            'handhygiene': 'hand-hygiene',
            'accident incident': 'accident-incident',
            'accidentincident': 'accident-incident',
            'accident and incident': 'accident-incident',
            'call bell monitoring': 'call-bell-monitoring',
            'callbellmonitoring': 'call-bell-monitoring',
            'call bell': 'call-bell-monitoring',
            'care plan': 'care-plan',
            'careplan': 'care-plan',
            'equipment': 'equipment',
            'fire safety': 'fire-safety',
            'firesafety': 'fire-safety',
            'health safety': 'health-safety',
            'healthsafety': 'health-safety',
            'infection control': 'infection-control',
            'infectioncontrol': 'infection-control',
            'kitchen': 'kitchen',
            'kitchen & kitchenettes': 'kitchen',
            'maintenance': 'maintenance',
            'managers weekly': 'managers-weekly',
            'managersweekly': 'managers-weekly',
            'weekly managers': 'managers-weekly',
            'mealtime': 'mealtime',
            'meal time': 'mealtime',
            'night visit': 'night-visit',
            'nightvisit': 'night-visit',
            'restrictive practice': 'restrictive-practice',
            'restrictivepractice': 'restrictive-practice',
            'staff file': 'staff-file',
            'stafffile': 'staff-file',
            'weight monitoring': 'weight-monitoring',
            'weightmonitoring': 'weight-monitoring',
            'wound monitoring': 'wound-monitoring',
            'woundmonitoring': 'wound-monitoring',
            'risk register': 'risk-register',
            'riskregister': 'risk-register'
          };

          // Try to find a matching audit type
          auditType = auditMappings[auditName.toLowerCase()] || auditName.toLowerCase().replace(/\s+/g, '-');

          // If we still don't have a valid audit type, try fuzzy matching
          if (!Object.values(auditMappings).includes(auditType)) {
            const auditTypes = Object.values(auditMappings);
            // Simple fuzzy match - find the closest match
            for (const type of auditTypes) {
              if (auditName.toLowerCase().includes(type.replace(/-/g, ' ')) ||
                  type.replace(/-/g, ' ').includes(auditName.toLowerCase())) {
                auditType = type;
                break;
              }
            }
          }
        }

        return {
          type: 'audit_query',
          auditType: auditType,
          originalInput: userInput
        };
      }
    }

    // Create audit patterns
    const createAuditPatterns = [
      /(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+|new\s+)?(.+?)\s+audit/i,
      /(?:i\s+want\s+to|i\s+need\s+to|i\s+would\s+like\s+to)\s+(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
      /(?:let's|let\s+us)\s+(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
      /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
      /(?:new|create)\s+audit\s+(?:for|about|on)\s+(.+)/i
    ];

    for (const pattern of createAuditPatterns) {
      const match = input.match(pattern);
      if (match) {
        let auditName = (match[1] || match[2] || '').trim();

        // Remove common words that aren't part of the audit name
        auditName = auditName.replace(/\b(a|an|new|the|let's|let\s+us|can\s+you|could\s+you|please|i\s+want|i\s+need|i\s+would\s+like|to\s+create|to\s+start|to\s+begin|to\s+make|to\s+do|to\s+perform|to\s+conduct|for|about|on)\b/g, '').trim();

        // Map common variations to standard audit names
        const auditMappings: Record<string, string> = {
          'hand hygiene': 'hand-hygiene',
          'handhygiene': 'hand-hygiene',
          'accident incident': 'accident-incident',
          'accidentincident': 'accident-incident',
          'accident and incident': 'accident-incident',
          'call bell monitoring': 'call-bell-monitoring',
          'callbellmonitoring': 'call-bell-monitoring',
          'call bell': 'call-bell-monitoring',
          'care plan': 'care-plan',
          'careplan': 'care-plan',
          'equipment': 'equipment',
          'fire safety': 'fire-safety',
          'firesafety': 'fire-safety',
          'health safety': 'health-safety',
          'healthsafety': 'health-safety',
          'infection control': 'infection-control',
          'infectioncontrol': 'infection-control',
          'kitchen': 'kitchen',
          'kitchen & kitchenettes': 'kitchen',
          'maintenance': 'maintenance',
          'managers weekly': 'managers-weekly',
          'managersweekly': 'managers-weekly',
          'weekly managers': 'managers-weekly',
          'mealtime': 'mealtime',
          'meal time': 'mealtime',
          'night visit': 'night-visit',
          'nightvisit': 'night-visit',
          'restrictive practice': 'restrictive-practice',
          'restrictivepractice': 'restrictive-practice',
          'staff file': 'staff-file',
          'stafffile': 'staff-file',
          'weight monitoring': 'weight-monitoring',
          'weightmonitoring': 'weight-monitoring',
          'wound monitoring': 'wound-monitoring',
          'woundmonitoring': 'wound-monitoring',
          'risk register': 'risk-register',
          'riskregister': 'risk-register'
        };

        // Try to find a matching audit type
        let auditType = auditMappings[auditName.toLowerCase()] || auditName.toLowerCase().replace(/\s+/g, '-');

        // If we still don't have a valid audit type, try fuzzy matching
        if (!Object.values(auditMappings).includes(auditType)) {
          const auditTypes = Object.values(auditMappings);
          // Simple fuzzy match - find the closest match
          for (const type of auditTypes) {
            if (auditName.toLowerCase().includes(type.replace(/-/g, ' ')) ||
                type.replace(/-/g, ' ').includes(auditName.toLowerCase())) {
              auditType = type;
              break;
            }
          }
        }

        return {
          type: 'create_audit',
          auditType: auditType,
          createAudit: true,
          originalInput: userInput
        };
      }
    }

    // Document connection patterns
    const connectionPatterns = [
      /(link|connect|relate|associate)\s+(this|these|the)\s+(document|documents|file|files)\s+(to|with)\s+(.+)/i,
      /(find|show|get)\s+(related|connected|linked|associated)\s+(documents?|files?)\s+(to|for|about)\s+(.+)/i,
      /(what\s+(documents?|files?)\s+are\s+(related|connected|linked)\s+to)\s+(.+)/i
    ];

    for (const pattern of connectionPatterns) {
      const match = input.match(pattern);
      if (match) {
        const searchTerm = (match[5] || match[4] || '').trim();
        return {
          type: 'document_connection',
          searchTerm: searchTerm,
          originalInput: userInput
        };
      }
    }

    // User profile patterns
    const userProfilePatterns = [
      /(show|display|get|tell)\s+(me\s+)?(my\s+)?(user\s+)?profile/i,
      /(what\s+is\s+my|what's\s+my)\s+(user\s+)?info(rmation)?/i,
      /(user\s+)?details\s+(for\s+me|about\s+me)/i,
      /(my\s+)?account\s+(info|details)/i
    ];

    for (const pattern of userProfilePatterns) {
      if (pattern.test(input)) {
        return {
          type: 'user_profile',
          originalInput: userInput
        };
      }
    }

    // Team info patterns
    const teamInfoPatterns = [
      /(show|list|display|get)\s+(me\s+)?(the\s+)?teams?/i,
      /(what\s+)?team(s?)\s+(do\s+we\s+have|are\s+there|exist)/i,
      /(team|teams)\s+(information|details|members)/i,
      /(who\s+is\s+in|members\s+of)\s+(the\s+)?team/i
    ];

    for (const pattern of teamInfoPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'team_info',
          originalInput: userInput
        };
      }
    }

    // Workspace info patterns
    const workspaceInfoPatterns = [
      /(show|display|get|tell)\s+(me\s+)?(the\s+)?workspace\s+(info|details|stats|information)/i,
      /(workspace|care\s+home)\s+(details|information|stats)/i,
      /(what\s+is\s+the|tell\s+me\s+about)\s+(workspace|care\s+home)/i
    ];

    for (const pattern of workspaceInfoPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'workspace_info',
          originalInput: userInput
        };
      }
    }



    // Fetch notifications patterns
    const fetchNotificationsPatterns = [
      /(show|display|get|tell)\s+(me\s+)?(the\s+)?notifications?/i,
      /(what\s+)?recent\s+(activity|notifications?|updates?)/i,
      /(notifications?|activity|updates?)\s+(feed|list)/i,
      /(what's\s+)?new/i
    ];

    for (const pattern of fetchNotificationsPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'fetch_notifications',
          originalInput: userInput
        };
      }
    }

    // Create document patterns
    const createDocumentPatterns = [
      /(create|make|add|new)\s+(a\s+|an\s+|the\s+)?(document|policy|file)/i,
      /(i\s+want\s+to|i\s+need\s+to)\s+(create|make|add)\s+(a\s+|an\s+)?(document|policy|file)/i,
      /(new|create)\s+(document|policy|file)\s+(called|named|titled)?\s*(.+)?/i
    ];

    for (const pattern of createDocumentPatterns) {
      const match = input.match(pattern);
      if (match) {
        const documentType = (match[2] || match[4] || '').trim();
        return {
          type: 'create_document',
          documentType: documentType,
          originalInput: userInput
        };
      }
    }

    // Edit document patterns
    const editDocumentPatterns = [
      /(edit|modify|update|change)\s+(the\s+)?(.+)/i,
      /(i\s+want\s+to|i\s+need\s+to)\s+(edit|modify|update)\s+(the\s+)?(.+)/i
    ];

    for (const pattern of editDocumentPatterns) {
      const match = input.match(pattern);
      if (match) {
        const searchTerm = (match[3] || match[4] || '').trim();
        return {
          type: 'edit_document',
          searchTerm: searchTerm,
          originalInput: userInput
        };
      }
    }

    // Occupancy data patterns
    const occupancyPatterns = [
      /(show|display|get|tell)\s+(me\s+)?(the\s+)?occupancy\s+(data|rates?|stats?|information)/i,
      /(bed|occupancy)\s+(occupancy|rates?|stats?|data)/i,
      /(how\s+many|what\s+is\s+the)\s+(beds?|occupancy)\s+(rate|level)/i,
      /(occupancy|bed)\s+(information|details)/i
    ];

    for (const pattern of occupancyPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'occupancy_data',
          originalInput: userInput
        };
      }
    }

    // Agentic workflow patterns
    const workflowPatterns = [
      /(create|setup|set\s+up|configure)\s+(a\s+|an\s+|new\s+)?workflow/i,
      /(show|list|display|get)\s+(me\s+)?(the\s+)?workflows?/i,
      /(enable|disable|activate|deactivate)\s+(workflow|automation)/i,
      /(run|execute|trigger)\s+(workflow|automation)/i,
      /(workflow|automation)\s+(status|history|executions?)/i,
      /(schedule|automate)\s+(reminder|report|audit|task)/i
    ];

    for (const pattern of workflowPatterns) {
      if (pattern.test(input)) {
        return {
          type: 'agentic_workflow',
          originalInput: userInput
        };
      }
    }


    // default fallback - treat as a general query when nothing else matches
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

  const inputVal = input;
  const intent = detectIntent(inputVal);

    // Multi-document query support
    if (intent && intent.type === 'multi_document_query') {
      // Search for all relevant documents (client-side first)
      let allDocs: Document[] = [];
      if (selectedItem && selectedItem.type === 'folder') {
        allDocs = getAllDocuments([selectedItem]);
      }
      // Use Fuse.js to get multiple relevant docs
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
      } catch {}
      // If not enough, fallback to server
      if (multiResults.length < 2) {
        const workspaceId = selectedItem.workspaceId;
        if (workspaceId) {
          const searchRes = await fetch('/api/search-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, query: inputVal }),
          });
          if (searchRes.ok) {
            const { results } = await searchRes.json();
            if (results && results.length > 1) {
              multiResults = results;
            }
          }
        }
      }
      if (multiResults.length < 2) {
    appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'I could not find enough relevant documents to compare or synthesize.' }]);
        setInput('');
        setIsTyping(false);
        return;
      }
      // Synthesize answer using all selected documents
      const docsJsonArr = multiResults.slice(0, 3).map(doc => doc.extractedJson || {});
      const synthResult = await chatWithDocuments({
        query: inputVal,
        documentJson: JSON.stringify(docsJsonArr)
      });
      // Prepare cards for UI
      const documentCards = multiResults.slice(0, 3).map(doc => ({
        id: doc.id,
        name: doc.name,
        status: 'current' as const,
        url: `/documents/${doc.id}`,
        subtitle: doc.folderId ? `Folder: ${doc.folderId}` : undefined,
        summary: doc.summary
      }));
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: synthResult.answer, documents: documentCards }]);
      setInput('');
      setIsTyping(false);
      return;
    }

    if (inputVal.trim() === '') return;

    // Handle audit query
    if (intent.type === 'audit_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching audit information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for audit query.' });
          setIsTyping(false);
          return;
        }

        const originalInput = intent.originalInput?.toLowerCase() || '';

        // Enhanced audit data querying based on user intent
        if (originalInput.includes('trend') || originalInput.includes('performance')) {
          // Get audit trends
          const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
          const snapshots = await getMonthlyAuditSnapshots(workspaceId);
          let response = '📊 **Audit Trends**\n\n';

          Object.entries(snapshots).forEach(([auditType, auditData]) => {
            const data = auditData as any[]; // Type assertion for audit data
            if (data && data.length > 0) {
              const latest = data[0]; // Already sorted by snapshotCreatedAt desc
              response += `**${auditType.replace(/-/g, ' ')}**\n`;
              response += `• Latest score: ${latest.scorePercent || 'N/A'}%\n`;
              response += `• Completed: ${data.length} time(s) this month\n`;
              if (latest.comments) {
                response += `• Comments: ${latest.comments}\n`;
              }
              response += '\n';
            }
          });

          if (Object.keys(snapshots).length === 0) {
            response = 'No audit data found for this month.';
          }

          appendMessages({ sender: 'ai', text: response });
        } else if (originalInput.includes('comment')) {
          // Get audit comments
          const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
          const snapshots = await getMonthlyAuditSnapshots(workspaceId);
          let response = '💬 **Audit Comments**\n\n';

          Object.entries(snapshots).forEach(([auditType, auditData]) => {
            const data = auditData as any[]; // Type assertion for audit data
            if (data && data.length > 0) {
              const latest = data[0];
              if (latest.comments || latest.areasForImprovement || latest.goodPractice || latest.actionRequired) {
                response += `**${auditType.replace(/-/g, ' ')}**\n`;
                if (latest.comments) response += `• Comments: ${latest.comments}\n`;
                if (latest.areasForImprovement) response += `• Areas for improvement: ${latest.areasForImprovement}\n`;
                if (latest.goodPractice) response += `• Good practice: ${latest.goodPractice}\n`;
                if (latest.actionRequired) response += `• Action required: ${latest.actionRequired}\n`;
                response += '\n';
              }
            }
          });

          if (response === '💬 **Audit Comments**\n\n') {
            response = 'No audit comments found for this month.';
          }

          appendMessages({ sender: 'ai', text: response });
        } else if (originalInput.includes('score') || originalInput.includes('result')) {
          // Get audit scores/results
          const { getLatestAuditData } = await import('@/lib/firestore');
          const auditType = intent.auditType || 'all';

          if (auditType === 'all') {
            // Get all audit types and their latest scores
            const { getMonthlyAuditCompletionStatus } = await import('@/lib/firestore');
            const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId);
            const auditTypes = Object.keys(completionStatus);

            let response = 'Latest audit scores:\n\n';
            let hasData = false;

            for (const type of auditTypes) {
              const latest = await getLatestAuditData(workspaceId, type);
              if (latest && latest.scorePercent !== undefined) {
                response += `${type.replace(/-/g, ' ')}: ${latest.scorePercent}%\n`;
                hasData = true;
              }
            }

            if (!hasData) {
              response = 'No audit scores found for this month.';
            }

            appendMessages({ sender: 'ai', text: response });
          } else {
            const latest = await getLatestAuditData(workspaceId, auditType);
            if (latest && latest.scorePercent !== undefined) {
              appendMessages({ sender: 'ai', text: `Latest score for ${auditType.replace(/-/g, ' ')} audit: ${latest.scorePercent}%` });
            } else {
              appendMessages({ sender: 'ai', text: `No recent scores found for ${auditType.replace(/-/g, ' ')} audit.` });
            }
          }
        } else {
          // General audit status query
          const { getMonthlyAuditCompletionStatus } = await import('@/lib/firestore');
          const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId);
          const auditTypes = Object.keys(completionStatus);

          let response = 'Here is the current audit status:\n\n';
          const completed = auditTypes.filter(type => completionStatus[type]);
          const pending = auditTypes.filter(type => !completionStatus[type]);

          if (completed.length > 0) {
            response += `✅ Completed audits: ${completed.map(type => type.replace(/-/g, ' ')).join(', ')}\n`;
          }
          if (pending.length > 0) {
            response += `⏳ Pending audits: ${pending.map(type => type.replace(/-/g, ' ')).join(', ')}\n`;
          }

          // Get latest scores if available
          const { getLatestAuditData } = await import('@/lib/firestore');
          const latestScores: any[] = [];
          for (const type of auditTypes) {
            const latest = await getLatestAuditData(workspaceId, type);
            if (latest && latest.scorePercent !== undefined) {
              latestScores.push({ type, score: latest.scorePercent });
            }
          }

          if (latestScores.length > 0) {
            response += '\nLatest audit scores:\n';
            latestScores.forEach(({ type, score }) => {
              response += `${type.replace(/-/g, ' ')}: ${score}%\n`;
            });
          }

          appendMessages({ sender: 'ai', text: response });
        }
      } catch (error) {
        console.error('Error fetching audit data:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the audit information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle dependency query
    if (intent.type === 'dependency_query') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching dependency data...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for dependency query.' });
          setIsTyping(false);
          return;
        }

        // Try to get dependency data from user's snapshots or calculate from current data
        const userIdToUse = user?.id ?? mockUser.id;
        if (!userIdToUse) {
          appendMessages({ sender: 'ai', text: 'User authentication required for dependency data.' });
          setIsTyping(false);
          return;
        }

        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        
        // Get latest dependency snapshot from user's collection
        const snapshotsCol = collection(db, 'users', userIdToUse, 'dependency_calculator_snapshots');
        const snapshotsQuery = query(snapshotsCol, orderBy('savedAt', 'desc'), limit(1));
        const snapshotsSnap = await getDocs(snapshotsQuery);
        
        let response = '';
        
        if (!snapshotsSnap.empty) {
          const latestSnapshot = snapshotsSnap.docs[0].data();
          const { computeStaffing } = await import('@/lib/staffing');
          
          // Process the snapshot data
          const residents = latestSnapshot.residents || [];
          const options = latestSnapshot.options || {};
          
          if (residents.length > 0) {
            const staffingResult = computeStaffing(residents, options);
            
            response = `📊 **Latest Dependency Analysis**\n\n`;
            response += `**Residents:** ${residents.length} total\n\n`;
            
            // Breakdown by dependency level
            const levelCounts: Record<string, number> = {};
            staffingResult.perResident.forEach(r => {
              if (r.level) {
                levelCounts[r.level] = (levelCounts[r.level] || 0) + 1;
              }
            });
            
            response += `**Dependency Levels:**\n`;
            Object.entries(levelCounts).forEach(([level, count]) => {
              response += `• ${level}: ${count} resident(s)\n`;
            });
            
            response += `\n**Staffing Requirements:**\n`;
            response += `**Day Shift:**\n`;
            response += `• Carers: ${staffingResult.totals.rounded.day.carers}\n`;
            response += `• Nurses/Seniors: ${staffingResult.totals.rounded.day.ns}\n`;
            response += `• Total: ${staffingResult.totals.rounded.day.all}\n\n`;
            
            response += `**Night Shift:**\n`;
            response += `• Carers: ${staffingResult.totals.rounded.night.carers}\n`;
            response += `• Nurses/Seniors: ${staffingResult.totals.rounded.night.ns}\n`;
            response += `• Total: ${staffingResult.totals.rounded.night.all}\n\n`;
            
            response += `**Total Hours (24h):**\n`;
            response += `• Day: ${staffingResult.totals.hours.day.all.toFixed(1)} hours\n`;
            response += `• Night: ${staffingResult.totals.hours.night.all.toFixed(1)} hours\n`;
            
            const saveDate = latestSnapshot.savedAt ? new Date(latestSnapshot.savedAt).toLocaleString() : 'Unknown';
            response += `\n*Data from: ${saveDate}*`;
          } else {
            response = 'No resident dependency data found in the latest snapshot.';
          }
        } else {
          response = 'No dependency data found. Please use the Dependency Calculator to create staffing calculations first.';
        }

        appendMessages({ sender: 'ai', text: response });
      } catch (error) {
        console.error('Error fetching dependency data:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the dependency information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle send email
    if (intent.type === 'send_email') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Preparing to send email...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for sending email.' });
          setIsTyping(false);
          return;
        }

        // Get teams for the workspace from workspace subcollection
        const { collection, getDocs } = await import('firebase/firestore');
        const teamsCol = collection(db, `workspaces/${workspaceId}/teams`);
        const snapshot = await getDocs(teamsCol);
        const teams = snapshot.docs.map(d => ({ id: d.id, name: d.data().name ?? 'Untitled Team' }));

        if (teams.length === 0) {
          appendMessages({ sender: 'ai', text: 'No teams found in this workspace to send email to.' });
          setIsTyping(false);
          return;
        }

        // For now, send to all teams (can be enhanced to specify which team)
        const recipientEmails: string[] = [];
        for (const team of teams) {
          // Get team members - this is simplified, in reality you'd need to fetch team members
          // For now, we'll use a placeholder
        }

        if (recipientEmails.length === 0) {
          appendMessages({ sender: 'ai', text: 'No email recipients found. Please ensure teams have members with email addresses.' });
          setIsTyping(false);
          return;
        }

        const { sendFolderAccessEmail } = await import('@/actions/email');
        await sendFolderAccessEmail({
          teamName: teams.map(t => t.name).join(', '),
          folderNames: [],
          workspaceName: selectedItem.name || 'Workspace',
          grantedBy: user?.name || user?.email || 'DocuFlow User',
          recipientEmails
        });

        appendMessages({ sender: 'ai', text: `Email sent successfully to ${teams.length} team(s).` });
      } catch (error) {
        console.error('Error sending email:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t send the email. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle user search
    if (intent.type === 'user_search') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Searching for user...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const { getUserById } = await import('@/lib/firestore');
        // This is simplified - in a real implementation, you'd search users by name/email
        // For now, assume userName is an ID or search term
        const userData = await getUserById(intent.userName || '');
        if (userData) {
          appendMessages({ sender: 'ai', text: `Found user: ${userData.name || userData.email || 'Unknown'} (${userData.email || 'No email'})` });
        } else {
          appendMessages({ sender: 'ai', text: `No user found with the name "${intent.userName}".` });
        }
      } catch (error) {
        console.error('Error searching user:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t search for the user. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle create audit
    if (intent.type === 'create_audit') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Preparing to create audit...' }]);
      setInput('');
      setIsTyping(true);
      try {
        // Navigate to audit page or provide instructions
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('navigate-to-audits', { detail: { auditType: intent.auditType } }));
        }
        appendMessages({ sender: 'ai', text: `I've opened the audits page for you${intent.auditType ? ` to create a ${intent.auditType} audit` : ''}. You can start creating your audit there.` });
      } catch (error) {
        console.error('Error creating audit:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t navigate to the audit creation page. Please go to the Audits section manually.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle open audit
    if (intent.type === 'open_audit') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Opening audit...' }]);
      setInput('');
      setIsTyping(true);
      try {
        // Navigate to audit page and open specific audit
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('navigate-to-audits'));
          // Small delay to ensure page loads, then open specific audit
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-specific-audit', { detail: { auditType: intent.specificAudit } }));
          }, 500);
        }
        appendMessages({ sender: 'ai', text: `I've opened the audits page and navigated to the ${intent.specificAudit || 'requested'} audit.` });
      } catch (error) {
        console.error('Error opening audit:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t open the audit. Please go to the Audits section manually.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle document connection
    if (intent.type === 'document_connection') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Finding related documents...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for document search.' });
          setIsTyping(false);
          return;
        }

        const { searchDocumentsInWorkspace } = await import('@/lib/firestore');
        const relatedDocs = await searchDocumentsInWorkspace(workspaceId, intent.searchTerm || '');

        if (relatedDocs.length > 0) {
          const docList = relatedDocs.slice(0, 5).map(doc => `- ${doc.name}`).join('\n');
          appendMessages({ sender: 'ai', text: `Found ${relatedDocs.length} related document(s):\n${docList}` });
        } else {
          appendMessages({ sender: 'ai', text: `No related documents found for "${intent.searchTerm}".` });
        }
      } catch (error) {
        console.error('Error finding related documents:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t find related documents. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle user profile
    if (intent.type === 'user_profile') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching your profile information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const userIdToUse = user?.id ?? mockUser.id;
        if (!userIdToUse) {
          appendMessages({ sender: 'ai', text: 'User authentication required to view profile.' });
          setIsTyping(false);
          return;
        }

        const { getUserById } = await import('@/lib/firestore');
        const userData = await getUserById(userIdToUse);
        
        if (userData) {
          const userCard = {
            id: userData.id || userIdToUse,
            name: userData.name || 'Unknown',
            email: userData.email || 'No email',
            role: 'User', // Default role since it's not in the User type
            avatarUrl: userData.avatarUrl || user?.avatarUrl || undefined,
            createdAt: 'Unknown' // Not available in User type
          };
          
          appendMessages({ sender: 'ai', text: 'Here\'s your profile information:', users: [userCard] });
        } else {
          appendMessages({ sender: 'ai', text: 'Could not retrieve your profile information.' });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch your profile information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle team info
    if (intent.type === 'team_info') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching team information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for team information.' });
          setIsTyping(false);
          return;
        }

        const { collection, getDocs } = await import('firebase/firestore');
        const teamsCol = collection(db, `workspaces/${workspaceId}/teams`);
        const snapshot = await getDocs(teamsCol);
        const workspaceTeams = snapshot.docs.map(d => ({
            id: d.id,
            name: d.data().name ?? 'Untitled Team',
            memberCount: d.data().members?.length || 0,
            description: d.data().description || 'No description available'
        }));

        if (workspaceTeams.length > 0) {
          appendMessages({ sender: 'ai', text: `Found ${workspaceTeams.length} team(s) in this workspace:`, teams: workspaceTeams });
        } else {
          appendMessages({ sender: 'ai', text: 'No teams found in this workspace.' });
        }
      } catch (error) {
        console.error('Error fetching team information:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch team information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle workspace info
    if (intent.type === 'workspace_info') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching workspace information...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected.' });
          setIsTyping(false);
          return;
        }

        const { getAllWorkspaces } = await import('@/lib/firestore');
        const workspaces = await getAllWorkspaces();
        const workspace = workspaces.find(w => w.id === workspaceId);

        if (workspace) {
          let response = `🏢 **Workspace Information**\n\n` +
            `**Name:** ${workspace.name || 'Unnamed'}\n` +
            `**Owner:** ${workspace.ownerId || 'Unknown'}\n` +
            `**Members:** ${workspace.members?.length || 0}\n` +
            `**Created:** Unknown\n`;

          if (workspace.totalBeds && workspace.occupiedBeds !== undefined) {
            const occupancyRate = workspace.totalBeds > 0 ? ((workspace.occupiedBeds / workspace.totalBeds) * 100).toFixed(1) : '0';
            response += `**Bed Occupancy:** ${workspace.occupiedBeds}/${workspace.totalBeds} (${occupancyRate}%)\n`;
          }

          appendMessages({ sender: 'ai', text: response });
        } else {
          appendMessages({ sender: 'ai', text: 'Could not retrieve workspace information.' });
        }
      } catch (error) {
        console.error('Error fetching workspace information:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch workspace information. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle open modal
    if (intent.type === 'open_modal') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Opening modal...' }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          if (intent.modalType === 'specific-appraisal') {
            // Handle specific appraisal opening
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-specific-appraisal', { detail: { appraisalName: intent.specificAppraisal } }));
            }, 500);
            appendMessages({ sender: 'ai', text: `I've opened the appraisals page and navigated to "${intent.specificAppraisal}".` });
          } else if (intent.modalType?.includes('tracker')) {
            // Navigate to appraisals page and switch to tracker tab
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            // Small delay to ensure page loads, then switch to tracker tab
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-tracker-tab'));
            }, 500);
            appendMessages({ sender: 'ai', text: 'I\'ve opened the Tracker tab for you.' });
          } else if (intent.modalType?.includes('appraisal')) {
            // First navigate to appraisals page, then open appraisal modal
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-appraisal-modal'));
            }, 500);
            appendMessages({ sender: 'ai', text: 'I\'ve opened the Appraisal modal for you.' });
          } else if (intent.modalType?.includes('audit')) {
            window.dispatchEvent(new CustomEvent('open-audit-modal'));
            appendMessages({ sender: 'ai', text: 'I\'ve opened the Audit modal for you.' });
          } else {
            appendMessages({ sender: 'ai', text: 'I\'m not sure which modal you want to open. Try "open tracker", "open appraisal", or "open audit".' });
          }
        } else {
          appendMessages({ sender: 'ai', text: 'Unable to open modal in this context.' });
        }
      } catch (error) {
        console.error('Error opening modal:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t open the modal. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle navigate page
    if (intent.type === 'navigate_page') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Navigating to page...' }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          if (intent.pagePath?.includes('action-plan')) {
            window.dispatchEvent(new CustomEvent('navigate-to-action-plans'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Action Plans page.' });
          } else if (intent.pagePath?.includes('admin')) {
            window.dispatchEvent(new CustomEvent('navigate-to-admin'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Admin page.' });
          } else if (intent.pagePath?.includes('dashboard')) {
            window.dispatchEvent(new CustomEvent('navigate-to-dashboard'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Dashboard.' });
          } else if (intent.pagePath?.includes('audit')) {
            window.dispatchEvent(new CustomEvent('navigate-to-audits'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Audits page.' });
          } else if (intent.pagePath?.includes('appraisal')) {
            window.dispatchEvent(new CustomEvent('navigate-to-appraisals'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Appraisals page.' });
          } else if (intent.pagePath?.includes('polic')) {
            window.dispatchEvent(new CustomEvent('navigate-to-policies'));
            appendMessages({ sender: 'ai', text: 'I\'ve navigated you to the Policies page.' });
          } else {
            appendMessages({ sender: 'ai', text: 'I\'m not sure which page you want to navigate to.' });
          }
        } else {
          appendMessages({ sender: 'ai', text: 'Unable to navigate in this context.' });
        }
      } catch (error) {
        console.error('Error navigating to page:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t navigate to that page. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle fetch notifications
    if (intent.type === 'fetch_notifications') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching recent notifications...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for notifications.' });
          setIsTyping(false);
          return;
        }

        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
        const notificationsCol = collection(db, `workspaces/${workspaceId}/notifications`);
        const notificationsQuery = query(notificationsCol, orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(notificationsQuery);

        if (!snapshot.empty) {
          let response = `🔔 **Recent Notifications**\n\n`;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Unknown';
            response += `• ${data.title || 'Untitled'} (${date})\n`;
          });
          appendMessages({ sender: 'ai', text: response });
        } else {
          appendMessages({ sender: 'ai', text: 'No recent notifications found.' });
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch notifications. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle create document
    if (intent.type === 'create_document') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Preparing to create document...' }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('create-new-document', { detail: { type: intent.documentType } }));
          appendMessages({ sender: 'ai', text: `I've opened the document creation interface${intent.documentType ? ` for a ${intent.documentType}` : ''}. You can create your document there.` });
        } else {
          appendMessages({ sender: 'ai', text: 'Unable to create document in this context.' });
        }
      } catch (error) {
        console.error('Error creating document:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t create the document. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle edit document
    if (intent.type === 'edit_document') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Finding document to edit...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for document editing.' });
          setIsTyping(false);
          return;
        }

        const { searchDocumentsInWorkspace } = await import('@/lib/firestore');
        const docs = await searchDocumentsInWorkspace(workspaceId, intent.searchTerm || '');

        if (docs.length > 0) {
          const doc = docs[0];
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('edit-document', { detail: { documentId: doc.id, documentName: doc.name } }));
            appendMessages({ sender: 'ai', text: `I've opened "${doc.name}" for editing.` });
          } else {
            appendMessages({ sender: 'ai', text: `Found document "${doc.name}" but unable to open editor in this context.` });
          }
        } else {
          appendMessages({ sender: 'ai', text: `Could not find a document matching "${intent.searchTerm}".` });
        }
      } catch (error) {
        console.error('Error editing document:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t edit the document. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle occupancy data
    if (intent.type === 'occupancy_data') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching occupancy data...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for occupancy data.' });
          setIsTyping(false);
          return;
        }

        const { getAllWorkspaces } = await import('@/lib/firestore');
        const workspaces = await getAllWorkspaces();
        const workspace = workspaces.find(w => w.id === workspaceId);

        if (workspace && workspace.totalBeds && workspace.occupiedBeds !== undefined) {
          const occupancyRate = workspace.totalBeds > 0 ? ((workspace.occupiedBeds / workspace.totalBeds) * 100).toFixed(1) : '0';
          const availableBeds = workspace.totalBeds - workspace.occupiedBeds;
          
          const response = `🏥 **Bed Occupancy Information**\n\n` +
            `**Total Beds:** ${workspace.totalBeds}\n` +
            `**Occupied Beds:** ${workspace.occupiedBeds}\n` +
            `**Available Beds:** ${availableBeds}\n` +
            `**Occupancy Rate:** ${occupancyRate}%\n` +
            `**Status:** ${parseFloat(occupancyRate) > 90 ? 'High' : parseFloat(occupancyRate) > 70 ? 'Moderate' : 'Low'} occupancy`;
          
          appendMessages({ sender: 'ai', text: response });
        } else {
          appendMessages({ sender: 'ai', text: 'No occupancy data available for this workspace.' });
        }
      } catch (error) {
        console.error('Error fetching occupancy data:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch occupancy data. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle advanced analytics
    if (intent.type === 'advanced_analytics') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Generating advanced analytics report...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for analytics.' });
          setIsTyping(false);
          return;
        }

        const { generateAdvancedAnalytics } = await import('@/lib/advanced-analytics');
        const analytics = await generateAdvancedAnalytics(workspaceId);

        // Format the analytics response
        let response = '📊 **Advanced Analytics Report**\n\n';

        // Performance Metrics
        response += '🏆 **Performance Metrics**\n';
        response += `• Audit Completion Rate: ${analytics.metrics.auditPerformance.completionRate}%\n`;
        response += `• Average Audit Score: ${analytics.metrics.auditPerformance.averageScore}%\n`;
        response += `• Trend: ${analytics.metrics.auditPerformance.trendDirection === 'improving' ? '📈 Improving' : analytics.metrics.auditPerformance.trendDirection === 'declining' ? '📉 Declining' : '➡️ Stable'}\n\n`;

        // Staffing Efficiency
        response += '👥 **Staffing Efficiency**\n';
        response += `• Utilization Rate: ${analytics.metrics.staffingEfficiency.utilizationRate}%\n`;
        response += `• Cost Efficiency: ${analytics.metrics.staffingEfficiency.costEfficiency}%\n`;
        response += `• Day Shift Coverage: ${analytics.metrics.staffingEfficiency.shiftCoverage.day}%\n`;
        response += `• Night Shift Coverage: ${analytics.metrics.staffingEfficiency.shiftCoverage.night}%\n\n`;

        // Compliance Health
        response += '✅ **Compliance Health**\n';
        response += `• Overall Score: ${analytics.metrics.complianceHealth.overallScore}%\n`;
        response += `• Critical Issues: ${analytics.metrics.complianceHealth.criticalIssues}\n`;
        response += `• Upcoming Deadlines: ${analytics.metrics.complianceHealth.upcomingDeadlines}\n`;
        response += `• Policy Adherence: ${analytics.metrics.complianceHealth.policyAdherence}%\n\n`;

        // Risk Areas
        if (analytics.metrics.auditPerformance.riskAreas.length > 0) {
          response += '⚠️ **Risk Areas**\n';
          analytics.metrics.auditPerformance.riskAreas.forEach(area => {
            response += `• ${area.replace(/-/g, ' ')}\n`;
          });
          response += '\n';
        }

        // Top Performing Areas
        if (analytics.metrics.auditPerformance.topPerformingAudits.length > 0) {
          response += '🌟 **Top Performing Areas**\n';
          analytics.metrics.auditPerformance.topPerformingAudits.forEach(area => {
            response += `• ${area.replace(/-/g, ' ')}\n`;
          });
          response += '\n';
        }

        // Predictive Insights
        if (analytics.metrics.predictiveInsights.riskPredictions.length > 0) {
          response += '🔮 **Predictive Insights**\n';
          analytics.metrics.predictiveInsights.riskPredictions.slice(0, 3).forEach(prediction => {
            response += `• **${prediction.type}** (${Math.round(prediction.probability * 100)}% probability within ${prediction.timeframe})\n`;
            response += `  - ${prediction.recommendedActions[0]}\n`;
          });
          response += '\n';
        }

        // Benchmark Comparison
        response += '📈 **Benchmark Comparison**\n';
        response += `• Your Score: ${analytics.comparisons.benchmarkComparison.workspaceScore.toFixed(1)}\n`;
        response += `• Industry Average: ${analytics.comparisons.benchmarkComparison.industryAverage}%\n`;
        response += `• Percentile Rank: ${analytics.comparisons.benchmarkComparison.percentile.toFixed(0)}th percentile\n\n`;

        // Time Period Comparison
        response += '⏱️ **Period Comparison**\n';
        response += `• Current Period: ${analytics.comparisons.timePeriodComparison.current.toFixed(1)}\n`;
        response += `• Previous Period: ${analytics.comparisons.timePeriodComparison.previous.toFixed(1)}\n`;
        const changeSymbol = analytics.comparisons.timePeriodComparison.change >= 0 ? '📈' : '📉';
        response += `• Change: ${changeSymbol} ${analytics.comparisons.timePeriodComparison.changePercent.toFixed(1)}%\n\n`;

        // Key Insights
        if (analytics.insights.length > 0) {
          response += '💡 **Key Insights**\n';
          analytics.insights.slice(0, 3).forEach(insight => {
            const icon = insight.type === 'trend' ? '📊' : insight.type === 'risk' ? '⚠️' : insight.type === 'opportunity' ? '🎯' : '🔍';
            response += `• ${icon} ${insight.title}\n`;
            response += `  ${insight.description}\n`;
          });
          response += '\n';
        }

        // Top Recommendations
        if (analytics.recommendations.length > 0) {
          response += '🎯 **Top Recommendations**\n';
          analytics.recommendations.slice(0, 3).forEach(rec => {
            const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            response += `• ${priorityIcon} **${rec.title}**\n`;
            response += `  ${rec.description}\n`;
            response += `  Impact: ${rec.impact}/10 | Effort: ${rec.effort}/10\n`;
          });
        }

        appendMessages({ sender: 'ai', text: response });
      } catch (error) {
        console.error('Error generating analytics:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t generate the analytics report. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle agentic workflow
    if (intent.type === 'agentic_workflow') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Managing workflows...' }]);
      setInput('');
      setIsTyping(true);
      try {
        const workspaceId = selectedItem.workspaceId;
        if (!workspaceId) {
          appendMessages({ sender: 'ai', text: 'No workspace selected for workflow management.' });
          setIsTyping(false);
          return;
        }

        const { WORKFLOW_TEMPLATES, executeWorkflow, checkWorkflowTriggers } = await import('@/lib/agentic-workflows');

        // Determine the specific workflow action from the user input
        const inputLower = inputVal.toLowerCase();

        if (inputLower.includes('create') || inputLower.includes('setup') || inputLower.includes('set up')) {
          // Create a new workflow
          // Map user words to the template keys defined in src/lib/agentic-workflows
          let workflowType: keyof typeof WORKFLOW_TEMPLATES = 'audit_reminder'; // default

          if (inputLower.includes('compliance')) workflowType = 'compliance_monitoring';
          else if (inputLower.includes('performance')) workflowType = 'performance_report';
          else if (inputLower.includes('risk')) workflowType = 'risk_assessment';
          else if (inputLower.includes('training')) workflowType = 'staff_training_reminder';

          const template = WORKFLOW_TEMPLATES[workflowType];
          if (template) {
            // Create workflow in Firestore
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const workflowsCol = collection(db, 'workspaces', workspaceId, 'workflows');

            const workflowData = {
              ...template,
              id: `${workflowType}_${Date.now()}`,
              createdAt: serverTimestamp(),
              createdBy: user?.id || 'system',
              status: 'active',
              lastExecuted: null,
              executionCount: 0
            };

            await addDoc(workflowsCol, workflowData);

            appendMessages({ sender: 'ai', text: `✅ **Workflow Created Successfully**\n\nI've set up the "${template.name}" workflow for you.\n\n**What it does:**\n${template.description}\n\n**Triggers:** ${(template as any).trigger ? JSON.stringify((template as any).trigger) : ''}\n\n**Actions:** ${(template as any).actions ? (template as any).actions.map((a: any) => a.type).join(', ') : ''}\n\nThe workflow is now active and will run automatically based on the configured triggers.` });
          } else {
            appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t identify which type of workflow you want to create. Try specifying "audit reminders", "compliance monitoring", "performance reports", "risk assessments", or "training reminders".' });
          }
        } else if (inputLower.includes('list') || inputLower.includes('show') || inputLower.includes('status')) {
          // List existing workflows
          const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
          const workflowsCol = collection(db, 'workspaces', workspaceId, 'workflows');
          const workflowsQuery = query(workflowsCol, orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(workflowsQuery);

          if (!snapshot.empty) {
            let response = '🔄 **Active Workflows**\n\n';
            snapshot.docs.forEach((doc, index) => {
              const data = doc.data();
              const statusIcon = data.status === 'active' ? '🟢' : '🔴';
              const lastExec = data.lastExecuted ? new Date(data.lastExecuted.toDate()).toLocaleDateString() : 'Never';
              response += `${index + 1}. ${statusIcon} **${data.name}**\n`;
              response += `   Status: ${data.status}\n`;
              response += `   Last executed: ${lastExec}\n`;
              response += `   Executions: ${data.executionCount || 0}\n\n`;
            });
            appendMessages({ sender: 'ai', text: response });
          } else {
            appendMessages({ sender: 'ai', text: 'No workflows are currently set up. Try creating one with "create audit reminders workflow" or similar.' });
          }
        } else if (inputLower.includes('enable') || inputLower.includes('activate')) {
          // Enable/activate workflows
          const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
          const workflowsCol = collection(db, 'workspaces', workspaceId, 'workflows');
          const snapshot = await getDocs(workflowsCol);

          let activatedCount = 0;
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.status !== 'active') {
              await updateDoc(doc(db, 'workspaces', workspaceId, 'workflows', docSnap.id), {
                status: 'active'
              });
              activatedCount++;
            }
          }

          if (activatedCount > 0) {
            appendMessages({ sender: 'ai', text: `✅ Activated ${activatedCount} workflow(s). All workflows are now running.` });
          } else {
            appendMessages({ sender: 'ai', text: 'All workflows are already active.' });
          }
        } else if (inputLower.includes('disable') || inputLower.includes('deactivate')) {
          // Disable/deactivate workflows
          const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
          const workflowsCol = collection(db, 'workspaces', workspaceId, 'workflows');
          const snapshot = await getDocs(workflowsCol);

          let deactivatedCount = 0;
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.status === 'active') {
              await updateDoc(doc(db, 'workspaces', workspaceId, 'workflows', docSnap.id), {
                status: 'inactive'
              });
              deactivatedCount++;
            }
          }

          if (deactivatedCount > 0) {
            appendMessages({ sender: 'ai', text: `⏸️ Deactivated ${deactivatedCount} workflow(s).` });
          } else {
            appendMessages({ sender: 'ai', text: 'No active workflows to deactivate.' });
          }
        } else if (inputLower.includes('run') || inputLower.includes('execute') || inputLower.includes('trigger')) {
          // Manually execute workflows
          const { collection, getDocs } = await import('firebase/firestore');
          const workflowsCol = collection(db, 'workspaces', workspaceId, 'workflows');
          const snapshot = await getDocs(workflowsCol);

          if (!snapshot.empty) {
            let executedCount = 0;
            for (const docSnap of snapshot.docs) {
              const workflowData = docSnap.data();
              if (workflowData.status === 'active') {
                try {
                  // executeWorkflow expects (workspaceId, workflowId, triggerData?)
                  // workflowData may be a plain object from Firestore; ensure we pass the id
                  const wfId = (workflowData && workflowData.id) ? workflowData.id : docSnap.id;
                  await executeWorkflow(workspaceId, String(wfId));
                  executedCount++;
                } catch (error) {
                  console.error(`Failed to execute workflow ${workflowData?.name || docSnap.id}:`, error);
                }
              }
            }

            if (executedCount > 0) {
              appendMessages({ sender: 'ai', text: `🚀 Executed ${executedCount} active workflow(s) manually.` });
            } else {
              appendMessages({ sender: 'ai', text: 'No active workflows to execute.' });
            }
          } else {
            appendMessages({ sender: 'ai', text: 'No workflows found to execute.' });
          }
        } else {
          // Show available workflow templates
          let response = '🤖 **Available Workflow Templates**\n\n';
          response += 'Here are the automated workflows I can set up for you:\n\n';

          Object.values(WORKFLOW_TEMPLATES).forEach((template, index) => {
            const tpl = template as any; // Type assertion for template
            response += `${index + 1}. **${tpl.name}**\n`;
            response += `   ${tpl.description}\n`;
            response += `   Triggers: ${tpl.triggers.join(', ')}\n\n`;
          });

          response += '**Commands you can use:**\n';
          response += '• "Create audit reminders workflow"\n';
          response += '• "Show me my workflows"\n';
          response += '• "Enable all workflows"\n';
          response += '• "Run workflows now"\n';

          appendMessages({ sender: 'ai', text: response });
        }
      } catch (error) {
        console.error('Error managing workflows:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t manage the workflows. Please try again.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle open policy
    if (intent.type === 'open_policy') {
      appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Opening policy...' }]);
      setInput('');
      setIsTyping(true);
      try {
        // Navigate to policies page and open specific policy
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          // First navigate to policies page
          window.dispatchEvent(new CustomEvent('navigate-to-policies'));
          // Small delay to ensure page loads, then open specific policy
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-specific-policy', { detail: { policyName: intent.specificPolicy } }));
          }, 500);
        }
        appendMessages({ sender: 'ai', text: `I've opened the policies page and navigated to the "${intent.specificPolicy || 'requested'}" policy.` });
      } catch (error) {
        console.error('Error opening policy:', error);
        appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t open the policy. Please go to the Policies section manually.' });
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Handle folder creation (existing)
    if (intent.type === 'folder_creation') {
  appendMessages({ sender: 'user', text: input });
      setInput('');
      setIsTyping(true);
      try {
        if (typeof onFolderAdd === 'function') {
          const folderName = intent.folderName || 'Untitled Folder';
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
      // Contextual memory: check for follow-up queries using pronouns or references
      const followUpPatterns = [/\b(it|this|that|the document|the policy|the file|its|their|them|those)\b/i];
      let usedContextDoc: Document | null = null;
      if (
        intent.type === 'general_query' &&
        lastContext &&
        followUpPatterns.some((pat) => pat.test(userInput)) &&
        lastContext.doc
      ) {
        // Use last discussed document as context
        usedContextDoc = lastContext.doc;
      }

      // If the chat was opened while viewing a specific document we previously
      // always used that document as the context. However, when the user query
      // is an explicit document/file search (e.g. "Show me the COSHH Policy" or
      // a filename) we should perform a workspace search instead of assuming the
      // current selected document is the intended target. Only use the
      // selectedItem document when the intent is NOT a document/file search.
      if (!usedContextDoc && selectedItem.type === 'document' && intent.type !== 'document_search' && intent.type !== 'file_search') {
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

        appendMessages({ sender: 'ai', text: result.answer, documents: [documentCard] });
        
        setLastContext({ doc: selectedItem });
        setIsTyping(false);
        return;
      }

      // If selectedItem is a folder and no specific document context, use folder chat
      if (!usedContextDoc && selectedItem.type === 'folder' && intent.type === 'general_query') {
        try {
          result = await chatWithFolder({
            query: userInput,
            documentsJson: JSON.stringify(getAllDocuments([selectedItem])),
          });
          appendMessages({ sender: 'ai', text: result.answer });
          setIsTyping(false);
          return;
        } catch (folderError) {
          console.warn('Folder chat failed, falling back to document search', folderError);
          // Fall through to document search
        }
      }

      // At this point selectedItem is a folder/workspace
      const shouldSearchNewDocument = intent.type === 'document_search' || intent.type === 'file_search' || !activeDoc;

      if ((activeDoc && !shouldSearchNewDocument) || usedContextDoc) {
        const docToUse = usedContextDoc || activeDoc;
        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(docToUse?.extractedJson || {}),
        });

        const activeCreated = formatDateSafe(docToUse?.createdAt);
        const documentCard = {
          id: docToUse?.id,
          name: docToUse?.name,
          status: 'current' as const,
          url: `/documents/${docToUse?.id}`,
          subtitle: docToUse?.folderId ? `Folder: ${docToUse?.folderId}` : (activeCreated ? `Created: ${activeCreated}` : undefined)
        };

        appendMessages({ sender: 'ai', text: result.answer, documents: [{ ...documentCard, id: documentCard.id || '', name: documentCard.name || 'Untitled' }] });
        setLastContext({ doc: docToUse! });
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

    appendMessages({ sender: 'ai', text: `Opening "${bestDoc.name}" for you.`, documents: [{ id: bestDoc.id, name: bestDoc.name, url: `/documents/${bestDoc.id}` }] });
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

      // Fall back to server search for policies
      const searchRes = await fetch('/api/policies/search', {
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

  const bestDoc = bestMatch;
  setActiveDoc(bestDoc);
  setLastContext({ doc: bestDoc });

      // If the user asked to open/view the document, navigate/open the best match and return
      if (intent.openDocument) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.id, documentName: bestMatch.name } })); } catch (e) {}
          try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.id); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.id } })); } catch (e) {}
          }, 150);
        }

        setMessages(prev => [...prev, { sender: 'ai', text: `Opening "${bestMatch.name}" for you.`, documents: [{ id: bestMatch.id, name: bestMatch.name, url: `/documents/${bestMatch.id}` }] }]);
        setIsTyping(false);
        return;
      }

      result = await chatWithDocuments({ query: userInput, documentJson: JSON.stringify(bestDoc.extractedJson || {}) });

      // If the user explicitly asked to open the document we navigate; otherwise only highlight
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        try { localStorage.setItem('lastHighlightedDocumentId', bestMatch.id); localStorage.setItem('lastHighlightedDocumentName', bestMatch.name); } catch (e) {}
        if (intent.openDocument) {
          try { window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId: bestMatch.id, documentName: bestMatch.name } })); } catch (e) {}
        }
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.id } })); } catch (e) {}
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

        interface ServerSearchResult {
          id: string;
          name: string;
          status?: 'current' | 'due-soon' | 'overdue' | 'updated';
          statusText?: string;
          subtitle?: string;
          url?: string;
          lastReviewed?: string;
          nextReviewRequired?: string;
          renewalDate?: string | Date;
          createdAt?: string | Date;
        }

        interface DocumentCardData {
          id: string;
          name: string;
          status?: 'current' | 'due-soon' | 'overdue' | 'updated';
          statusText?: string;
          subtitle?: string;
          url?: string;
          lastReviewed?: string;
          nextReviewRequired?: string;
        }

        appendMessages({ sender: 'ai', text: responsePrefix + (result.answer as string), documents: (documentCards as DocumentCardData[]).map((doc: DocumentCardData) => ({ ...doc, id: doc.id || '', name: doc.name || 'Untitled' })) });

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
  // remove last user message (failed to get AI response)
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

  // Render a chat message. Declared inside the component so it can access
  // handlers like toast and window events.
  const renderMessage = (message: ChatMessage) => {
    return (
      <div>
        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        
        {/* Document cards */}
        {message.documents && message.documents.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.documents.map((doc) => (
              <div key={doc.id} className="bg-gray-50 border border-gray-100 p-3 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <DocumentCard
                      id={doc.id}
                      name={doc.name}
                      status={doc.status}
                      statusText={doc.statusText}
                      subtitle={doc.subtitle}
                      summary={doc.summary}
                      url={doc.url}
                      onClick={() => onOpenDocument(doc)}
                    />
                    {doc.summary && <p className="text-xs text-gray-600 mt-2">{doc.summary}</p>}
                  </div>

                  <div className="flex-shrink-0 flex items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="ghost" className="whitespace-nowrap">
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <Command>
                          <CommandInput placeholder="Search teams..." onValueChange={(v: any) => setTeamFilter(String(v || ''))} />
                          <CommandList>
                            {teams.filter(t => t.name.toLowerCase().includes(teamFilter.toLowerCase())).length === 0 && <CommandEmpty>No teams found</CommandEmpty>}
                            <CommandGroup heading="Teams">
                              {teams
                                .filter(t => t.name.toLowerCase().includes(teamFilter.toLowerCase()))
                                .map((team) => (
                                  <CommandItem key={team.id} onSelect={() => handleShareToTeam(team.id, doc)}>
                                    {team.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User cards */}
        {message.users && message.users.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.users.map((user) => (
              <UserCard
                key={user.id}
                id={user.id}
                name={user.name}
                email={user.email}
                role={user.role}
                avatarUrl={user.avatarUrl}
                createdAt={user.createdAt}
                onClick={() => handleUserCardClick(user)}
              />
            ))}
          </div>
        )}

        {/* Team cards */}
        {message.teams && message.teams.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.teams.map((team) => (
              <TeamCard
                key={team.id}
                id={team.id}
                name={team.name}
                memberCount={team.memberCount}
                description={team.description}
                onClick={() => handleTeamCardClick(team)}
              />
            ))}
          </div>
        )}

        {/* Action cards */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.actions.map((action) => (
              <ActionCard
                key={action.id}
                id={action.id}
                title={action.title}
                description={action.description}
                status={action.status}
                dueDate={action.dueDate}
                priority={action.priority}
                onClick={() => handleActionCardClick(action)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Action handlers for document actions
  const onOpenDocument = (doc: { id?: string; name?: string; url?: string }) => {
    const documentId = doc.id || (doc.name || '').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: doc.name } }));
        localStorage.setItem('lastHighlightedDocumentId', documentId);
        if (doc.name) localStorage.setItem('lastHighlightedDocumentName', doc.name);
        setTimeout(() => { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId } })); }, 150);
      }
    } catch (e) {}
    toast({ title: 'Opened document', description: doc.name || documentId });
  };

  // Reminder functionality removed from UI; keep placeholder if needed later
  // Teams state for sharing
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [teamFilter, setTeamFilter] = useState('');

  // Users state for user cards
  const [users, setUsers] = useState<Array<{ id: string; name: string; email?: string; role?: string; avatarUrl?: string; createdAt?: string }>>([]);
  const [userFilter, setUserFilter] = useState('');

  // Actions state for action cards
  const [actions, setActions] = useState<Array<{ id: string; title: string; description?: string; status?: 'pending' | 'completed' | 'overdue'; dueDate?: string; priority?: 'low' | 'medium' | 'high' }>>([]);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    // Fetch teams from Firestore for the current workspace
    let cancelled = false;
    (async () => {
      try {
        if (!selectedItem || !selectedItem.workspaceId) {
          setTeams([]);
          return;
        }
  // Use a simple approach to fetch teams from Firestore (similar to TeamsView)
  const { collection, getDocs, doc: docRef, setDoc } = await import('firebase/firestore');
        const teamsCol = collection(db, 'teams');
        const snapshot = await getDocs(teamsCol);
        const wsId = selectedItem.workspaceId;
        const fetched = snapshot.docs
          .map(d => ({ ...(d.data() as any), id: d.id }))
          .filter((t: any) => !t.workspaceId || t.workspaceId === wsId)
          .map((t: any) => ({ id: t.id, name: t.name ?? 'Untitled Team' }));
        if (!cancelled) setTeams(fetched);
      } catch (e) {
        console.error('Failed to fetch teams for share popover', e);
        if (!cancelled) setTeams([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedItem?.workspaceId]);

  // Listen for policy opening events to set active document context
  useEffect(() => {
    // On mount, try to restore active document persisted in sessionStorage
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem('docuflow.activeDocument');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.extractedJson) {
            try {
              const len = parsed.extractedJson.content ? parsed.extractedJson.content.length : 0;
              console.debug('[ChatPanel] Restored active document from sessionStorage', { id: parsed.id, name: parsed.name, extractedLength: len });
            } catch (e) {}
            setActiveDoc(parsed);
            setLastContext({ doc: parsed });
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const handleSetActiveDocument = (event: CustomEvent) => {
      const { documentId, documentName, documentData } = event.detail;
      try {
        if (documentData) {
          // Debug: log presence and size of extractedJson so we can detect empty-content issues
          try {
            const len = documentData?.extractedJson?.content ? documentData.extractedJson.content.length : 0;
            console.debug('[ChatPanel] set-active-document received', { documentId, documentName, extractedLength: len, preview: (documentData?.extractedJson?.content || '').slice(0, 200) });
          } catch (e) {
            console.debug('[ChatPanel] set-active-document received', { documentId, documentName });
          }

          // Set the active document for chat interactions
          setActiveDoc(documentData);
          setLastContext({ doc: documentData });
        } else {
          console.debug('[ChatPanel] set-active-document received with empty documentData', { documentId, documentName });
        }
      } catch (e) {
        console.error('[ChatPanel] Error handling set-active-document', e);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('set-active-document', handleSetActiveDocument as EventListener);
      return () => window.removeEventListener('set-active-document', handleSetActiveDocument as EventListener);
    }
  }, []);

  const handleShareToTeam = async (teamId: string, doc: { id?: string; name?: string; url?: string }) => {
    const documentUrl = doc.url || (doc.id ? `${typeof window !== 'undefined' ? window.location.origin : ''}/documents/${doc.id}` : window.location.href);
    try {
      // Build a simple email body to send to the backend
      const teamObj = teams.find(t => t.id === teamId);
      const sharerName = (user && (user.name || user.email)) || 'A colleague';
      const subject = `Document shared: ${doc.name || 'Untitled'}`;
      const emailBody = `Hi ${teamObj?.name || 'team'},\n\n${sharerName} has shared a document with your team.\n\nDocument: ${doc.name || 'Untitled'}\nLink: ${documentUrl}\n\nRegards,\nYour Docs`;

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, url: documentUrl, name: doc.name, subject, emailBody }),
      });
      if (res.ok) {
        toast({ title: 'Shared', description: `Document sent to team.` });
        return;
      }
      // If server returned error, try clipboard fallback
      throw new Error('Share failed');
    } catch (e) {
      try {
        await navigator.clipboard.writeText(documentUrl);
        toast({ title: 'Link copied', description: 'Document link copied to clipboard (share fallback)' });
      } catch (err) {
        toast({ title: 'Unable to share', description: 'Could not share or copy the document link.' });
      }
    }
  };

  const handleUserCardClick = (user: { id?: string; name?: string; email?: string }) => {
    if (user.id) {
      // Navigate to user profile or open user modal
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('open-user-profile', { detail: { userId: user.id, userName: user.name } }));
      }
      toast({ title: 'User Profile', description: `Opening profile for ${user.name || user.email || 'user'}` });
    }
  };

  const handleTeamCardClick = (team: { id?: string; name?: string }) => {
    if (team.id) {
      // Navigate to team page or open team modal
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('open-team-details', { detail: { teamId: team.id, teamName: team.name } }));
      }
      toast({ title: 'Team Details', description: `Opening details for ${team.name || 'team'}` });
    }
  };

  const handleActionCardClick = (action: { id?: string; title?: string }) => {
    if (action.id) {
      // Navigate to action plans page or open action modal
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('open-action-details', { detail: { actionId: action.id, actionTitle: action.title } }));
      }
      toast({ title: 'Action Details', description: `Opening details for ${action.title || 'action'}` });
    }
  };

  const onShareDocument = (doc: { id?: string; name?: string; url?: string }) => {
    // This function is intentionally left to be used as a trigger that opens the Popover.
    // Actual share occurs when selecting a team in the Popover.
    // Keep for compatibility with existing callers.
    toast({ title: 'Share', description: 'Choose a team to share with.' });
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
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me advanced analytics'); setTimeout(() => handleSend(), 60); }}>
                Show advanced analytics
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Performance metrics analysis'); setTimeout(() => handleSend(), 60); }}>
                Performance analysis
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Predictive insights report'); setTimeout(() => handleSend(), 60); }}>
                Predictive insights
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Risk assessment analysis'); setTimeout(() => handleSend(), 60); }}>
                Risk assessment
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Benchmark comparison'); setTimeout(() => handleSend(), 60); }}>
                Benchmark comparison
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Create audit reminders workflow'); setTimeout(() => handleSend(), 60); }}>
                Create audit workflow
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me my workflows'); setTimeout(() => handleSend(), 60); }}>
                Show workflows
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
            placeholder="Ask me anything... 'Show advanced analytics', 'Performance analysis', 'Predictive insights', 'Risk assessment', 'Benchmark comparison', 'Create audit workflow', 'Show workflows'..."
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

