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
    summary?: string;
  }>;
}

interface ChatPanelProps {
  selectedItem: Document | Folder;
  onFolderAdd: (folderName: string) => void;
}

interface UserIntent {
  type: 'document_search' | 'file_search' | 'folder_creation' | 'general_query' | 'multi_document_query' | 'audit_query' | 'send_email' | 'user_search' | 'create_audit' | 'document_connection' | 'dependency_query';
  openDocument?: boolean; // indicates intent to open/view the document
  searchTerm?: string;
  fileName?: string;
  folderName?: string;
  auditType?: string;
  emailSubject?: string;
  emailBody?: string;
  userName?: string;
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

    // Create audit patterns
    const createAuditPatterns = [
      /(create|start|begin|make)\s+(a\s+|an\s+|new\s+)?audit(\s+for|\s+on|\s+about)?\s*(.+)?/i,
      /(i\s+need|i\s+want)\s+(to\s+)?create\s+(a\s+|an\s+)?audit/i,
      /(let's|let\s+us)\s+(do|perform|conduct)\s+(an?\s+)?audit/i
    ];

    for (const pattern of createAuditPatterns) {
      const match = input.match(pattern);
      if (match) {
        const auditType = (match[4] || '').trim();
        return {
          type: 'create_audit',
          auditType: auditType,
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

        const { getMonthlyAuditCompletionStatus, getLatestAuditData } = await import('@/lib/firestore');
        const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId);
        const auditTypes = Object.keys(completionStatus);
        
        let response = 'Here is the current audit status:\n\n';
        const completed = auditTypes.filter(type => completionStatus[type]);
        const pending = auditTypes.filter(type => !completionStatus[type]);
        
        if (completed.length > 0) {
          response += `✅ Completed audits: ${completed.join(', ')}\n`;
        }
        if (pending.length > 0) {
          response += `⏳ Pending audits: ${pending.join(', ')}\n`;
        }

        // Get latest scores if available
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
            response += `${type}: ${score}%\n`;
          });
        }

        appendMessages({ sender: 'ai', text: response });
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

        // Get teams for the workspace
        const { collection, getDocs, doc: docRef } = await import('firebase/firestore');
        const teamsCol = collection(db, 'teams');
        const snapshot = await getDocs(teamsCol);
        const teams = snapshot.docs
          .filter(t => !t.data().workspaceId || t.data().workspaceId === workspaceId)
          .map(d => ({ id: d.id, name: d.data().name ?? 'Untitled Team' }));

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
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me the COSHH Policy'); setTimeout(() => handleSend(), 60); }}>
                Show me the COSHH Policy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me audit results'); setTimeout(() => handleSend(), 60); }}>
                Show audit results
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Show me dependency data'); setTimeout(() => handleSend(), 60); }}>
                Show dependency data
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setInput('Send email to team about updates'); setTimeout(() => handleSend(), 60); }}>
                Send email to team
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
            placeholder="Ask me anything... 'Show me audit results', 'Show dependency data', 'Send email to team', 'Find user John', 'Create new audit'..."
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

