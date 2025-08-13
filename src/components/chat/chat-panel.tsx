
"use client";

import type { Document, Folder } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerDownLeft, Search, FileText, CalendarClock } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Create sample initial conversation to showcase functionality
    const initialMessages: ChatMessage[] = [
      { 
        sender: 'ai', 
        text: `Hello! I'm CareBot, your AI policy assistant. I can help you find information about "${selectedItem.name}" and answer questions about your care policies and procedures. 

You can ask me in natural language, for example:
• "Please find the medicine policy"
• "Show me documents about safeguarding" 
• "I need the health and safety procedures"
• "Where is our incident reporting policy?"
• "Can you help me locate the staff training manual?"

How can I assist you today?`
      }
    ];
    
    // Add some sample interactions if it's a folder/workspace to showcase functionality
    if (selectedItem.type === 'folder') {
      // Try to find actual documents in the workspace to make the demo more realistic
      const allDocs = getAllDocuments([selectedItem]);
      const sampleDocs = allDocs.slice(0, 3); // Take up to 3 real documents
      
      if (sampleDocs.length > 0) {
        // Use real documents for the demo
        initialMessages.push(
          {
            sender: 'user',
            text: 'Show me the most important policy documents'
          },
          {
            sender: 'ai',
            text: `I found ${sampleDocs.length} important policy document${sampleDocs.length > 1 ? 's' : ''}:`,
            documents: sampleDocs.map(doc => ({
              id: doc.id,
              name: doc.name,
              status: doc.renewalDate ? 
                (new Date(doc.renewalDate) < new Date() ? 'overdue' : 
                 new Date(doc.renewalDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) ? 'due-soon' : 'current') 
                : 'current',
              url: `/documents/${doc.id}`,
              subtitle: doc.createdAt ? `Created: ${new Date(doc.createdAt).toLocaleDateString()}` : undefined,
              lastReviewed: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : undefined,
              nextReviewRequired: doc.renewalDate ? `by ${new Date(doc.renewalDate).toLocaleDateString()}` : undefined
            }))
          }
        );
      } else {
        // Fallback to sample data if no real documents
        initialMessages.push(
          {
            sender: 'user',
            text: 'When is our Medicine Policy due for renewal?'
          },
          {
            sender: 'ai',
            text: 'The Medicine Policy is due for renewal on March 15, 2025 (in 2 months).',
            documents: [{
              id: 'medicine-policy-v3-2',
              name: 'Medicine-Policy-v3.2.pdf',
              status: 'due-soon',
              url: '/documents/medicine-policy-v3-2',
              lastReviewed: 'March 2024',
              nextReviewRequired: 'by CQC standards'
            }]
          }
        );
      }
    }
    
    setMessages(initialMessages);
    setActiveDoc(null); // Reset active doc when folder or doc changes
  }, [selectedItem.id, selectedItem.name]);

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
      /^(please\s+)?(find|show|get|give|display|locate|search|look\s+for|bring\s+up|pull\s+up)\s+(me\s+)?(the\s+)?(.+)/i,
      // Question formats
      /^(can\s+you\s+|could\s+you\s+|would\s+you\s+)?(please\s+)?(find|show|get|give|display|locate|search|look\s+for|bring\s+up|pull\s+up)\s+(me\s+)?(the\s+)?(.+)/i,
      // "I need" formats
      /^(i\s+need|i\s+want|i\s+require|i\s+am\s+looking\s+for|i\s+would\s+like)\s+(to\s+see\s+|to\s+find\s+|to\s+access\s+|the\s+)?(.+)/i,
      // "Where is" formats
      /^(where\s+is|where\s+can\s+i\s+find|where\s+are|do\s+you\s+have)\s+(the\s+)?(.+)/i,
      // "Help me" formats
      /^(help\s+me\s+|assist\s+me\s+with\s+|guide\s+me\s+to\s+)?(find|locate|access|get)\s+(the\s+)?(.+)/i,
      // Document type requests
      /^(what|which)\s+(documents?|policies|files?|papers?)\s+(do\s+we\s+have\s+|are\s+there\s+|exist\s+)?(about|for|regarding|on|related\s+to)\s+(.+)/i,
      // Status/info requests
      /^(what\s+is\s+the\s+status\s+of|when\s+is|tell\s+me\s+about|information\s+about|details\s+about)\s+(the\s+)?(.+)/i,
    ];
    
    // Check for document search intent
    for (const pattern of searchPatterns) {
      const match = input.match(pattern);
      if (match) {
        // Extract the search term from various capture groups
        const searchTerm = match[match.length - 1] || match[match.length - 2] || match[4] || match[5] || match[6];
        if (searchTerm && searchTerm.trim()) {
          return {
            type: 'document_search',
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
      if (selectedItem.type === 'document') {
        result = await chatWithDocuments({
          query: userInput,
          documentJson: JSON.stringify(selectedItem.extractedJson || {}),
        });
        
        // Create document card for the current document
        const documentCard = {
          id: selectedItem.id,
          name: selectedItem.name,
          status: 'current' as const,
          url: `/documents/${selectedItem.id}`,
          subtitle: selectedItem.createdAt ? `Created: ${new Date(selectedItem.createdAt).toLocaleDateString()}` : undefined
        };
        
        setMessages([...newMessages, { 
          sender: 'ai', 
          text: result.answer,
          documents: [documentCard]
        }]);
      } else {
        // Enhanced intent-based document search
        const shouldSearchNewDocument = intent.type === 'document_search' || 
                                      intent.type === 'file_search' || 
                                      !activeDoc;
        
        if (activeDoc && !shouldSearchNewDocument) {
          // Continue conversation with the currently active document
          result = await chatWithDocuments({
            query: userInput,
            documentJson: JSON.stringify(activeDoc.extractedJson || {}),
          });
          
          const documentCard = {
            id: activeDoc.id,
            name: activeDoc.name,
            status: 'current' as const,
            url: `/documents/${activeDoc.id}`,
            subtitle: activeDoc.folderId ? `Folder: ${activeDoc.folderId}` : undefined
          };
          
          setMessages([
            ...newMessages,
            {
              sender: 'ai',
              text: result.answer,
              documents: [documentCard]
            },
          ]);
        } else {
          // Search the workspace for relevant documents
          const workspaceId = selectedItem.workspaceId;
          if (!workspaceId) {
            setMessages([...newMessages, { sender: 'ai', text: 'Workspace ID not found for this folder.' }]);
            setIsTyping(false);
            return;
          }
          
          // Use the extracted search term or the full input
          const searchQuery = intent.type === 'document_search' || intent.type === 'file_search' 
            ? (intent.searchTerm || intent.fileName || userInput)
            : userInput;
          
          // Call the search API endpoint
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
            // Provide a more natural response based on the intent
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
          
          // Use the best match for the conversation
          const bestDoc = results[0];
          setActiveDoc(bestDoc); // Persist for follow-up questions
          
          result = await chatWithDocuments({
            query: userInput,
            documentJson: JSON.stringify(bestDoc.extractedJson || {}),
          });
          
          // Highlight the document in the UI
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.documentId } }));
          }
          
          // Create enhanced response with document cards
          const documentCards = results.slice(0, 3).map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            status: doc.status || (doc.renewalDate ? 
              (new Date(doc.renewalDate) < new Date() ? 'overdue' : 
               new Date(doc.renewalDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) ? 'due-soon' : 'current') 
              : 'current'),
            statusText: doc.statusText,
            subtitle: doc.subtitle || (doc.createdAt ? `Created: ${new Date(doc.createdAt).toLocaleDateString()}` : undefined),
            url: doc.url || `/documents/${doc.id}`,
            lastReviewed: doc.lastReviewed || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : undefined),
            nextReviewRequired: doc.nextReviewRequired || (doc.renewalDate ? `by ${new Date(doc.renewalDate).toLocaleDateString()}` : undefined)
          }));

          // Provide a more natural response prefix based on intent
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
        }
      }
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
        // Revert to messages before sending, and re-add the user's input to the text area
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
      {/* Header matching the CareBot design */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-white/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">CareBot AI - Policy Assistant</h3>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30" ref={scrollAreaRef}>
        {messages.map((message, index) => (
          <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? 'justify-end' : '')}>
            {message.sender === 'ai' && (
              <Avatar className="w-10 h-10 border-2 border-blue-200">
                 <AvatarImage src="/ai-avatar.png" alt="AI" />
                <AvatarFallback className="bg-blue-500 text-white text-sm font-semibold">AI</AvatarFallback>
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
                <AvatarImage src={mockUser.avatarUrl || undefined} alt={mockUser.name || undefined} />
                <AvatarFallback className="bg-gray-500 text-white text-sm font-semibold">
                  {mockUser.name ? mockUser.name.charAt(0) : '?'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
         {isTyping && (
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 border-2 border-blue-200">
              <AvatarImage src="/ai-avatar.png" alt="AI" />
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

