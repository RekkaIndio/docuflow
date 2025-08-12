
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
}

interface ChatPanelProps {
  selectedItem: Document | Folder;
  onFolderAdd: (folderName: string) => void;
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
    setMessages([
      { sender: 'ai', text: `Hello! I'm ready to answer questions about "${selectedItem.name}". How can I help?` }
    ]);
    setActiveDoc(null); // Reset active doc when folder or doc changes
  }, [selectedItem.id, selectedItem.name]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);





  const handleSend = async () => {
    if (input.trim() === '') return;

    // Further improved intent detection for folder creation
    const folderIntentRegex = /(create|add|make|new) (a |the |another |)folder( called| named| titled| with name)? ([^.!?\n]+)?/i;
    const match = input.match(folderIntentRegex);
    if (match) {
      const folderName = (match[4] || match[5] || '').trim() || 'Untitled Folder';
      setMessages([...messages, { sender: 'user', text: input }]);
      setInput('');
      setIsTyping(true);
      try {
        if (typeof onFolderAdd === 'function') {
          // Debug log
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
        setMessages([...newMessages, { sender: 'ai', text: result.answer }]);
      } else {
        // Intent detection: if user asks for a file by name, trigger a new search
        const filePattern = /([\w\-. ]+\.(pdf|docx?|txt|csv|xlsx))/i;
        const fileMatch = userInput.match(filePattern);
        const shouldSwitch = fileMatch !== null;
        if (activeDoc && !shouldSwitch) {
          result = await chatWithDocuments({
            query: userInput,
            documentJson: JSON.stringify(activeDoc.extractedJson || {}),
          });
          setMessages([
            ...newMessages,
            {
              sender: 'ai',
              text: result.answer + `\n\n(Answered using document: "${activeDoc.name}")` + (activeDoc.folderId ? `\n[View folder](/folders/${activeDoc.folderId})` : ''),
            },
          ]);
        } else {
          // Search the whole workspace for the most relevant document
          const workspaceId = selectedItem.workspaceId;
          if (!workspaceId) {
            setMessages([...newMessages, { sender: 'ai', text: 'Workspace ID not found for this folder.' }]);
            setIsTyping(false);
            return;
          }
          // Call the new API endpoint
          const searchRes = await fetch('/api/search-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, query: userInput }),
          });
          if (!searchRes.ok) {
            setMessages([...newMessages, { sender: 'ai', text: 'Failed to search for relevant documents.' }]);
            setIsTyping(false);
            return;
          }
          const { results, bestMatch } = await searchRes.json();
          if (!results || results.length === 0 || !bestMatch) {
            setMessages([...newMessages, { sender: 'ai', text: 'No relevant documents found in this workspace.' }]);
            setIsTyping(false);
            return;
          }
          // Use the best match (first result)
          const bestDoc = results[0];
          setActiveDoc(bestDoc); // Persist for follow-up questions
          result = await chatWithDocuments({
            query: userInput,
            documentJson: JSON.stringify(bestDoc.extractedJson || {}),
          });
          // Highlight the document (emit an event or set state, see below)
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: bestMatch.documentId } }));
          }
          // Link to the folder (assuming route: /folders/[id])
          let folderLink = '';
          if (bestMatch.folderId) {
            folderLink = `/folders/${bestMatch.folderId}`;
          }
          setMessages([
            ...newMessages,
            {
              sender: 'ai',
              text:
                result.answer +
                `\n\n(Answered using document: "${bestMatch.name}")` +
                (folderLink ? `\n[View folder](${folderLink})` : ''),
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
    <div className="flex flex-col h-full bg-background rounded-b-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollAreaRef}>
        {messages.map((message, index) => (
          <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? 'justify-end' : '')}>
            {message.sender === 'ai' && (
              <Avatar className="w-8 h-8">
                 <AvatarImage src="/ai-avatar.png" alt="AI" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div className={cn(
                "max-w-[75%] rounded-lg p-3 text-sm",
                message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
             {message.sender === 'user' && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={mockUser.avatarUrl || undefined} alt={mockUser.name || undefined} />
                <AvatarFallback>{mockUser.name ? mockUser.name.charAt(0) : '?'}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
         {isTyping && (
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/ai-avatar.png" alt="AI" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="max-w-[75%] rounded-lg p-3 text-sm bg-muted flex items-center">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-150">●</span>
              <span className="animate-pulse delay-300">●</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-background shrink-0">
        <div className="relative">
          <Textarea
            placeholder="Ask me anything..."
            className="w-full resize-none pr-12 min-h-[48px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isTyping}
            rows={1}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
            <Button type="submit" size="icon" variant="ghost" onClick={handleSend} disabled={isTyping || !input.trim()}>
              <CornerDownLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

