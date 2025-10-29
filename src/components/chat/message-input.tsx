import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerDownLeft } from "lucide-react";
import React from "react";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  isTyping: boolean;
  onSend: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function MessageInput({ input, setInput, isTyping, onSend, inputRef }: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative">
      <Textarea
        placeholder="Ask me anything... 'Show advanced analytics', 'Performance analysis', 'Predictive insights', 'Risk assessment', 'Benchmark comparison', 'Show action plans', 'What is my rota?', 'Show lessons learned', 'Create audit workflow', 'Show workflows'..."
        className="w-full resize-none pr-12 min-h-[48px] border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-300 transition-colors"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isTyping}
        rows={1}
        ref={inputRef}
      />
      <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
        <Button 
          type="submit" 
          size="icon" 
          variant="ghost" 
          onClick={onSend} 
          disabled={isTyping || !input.trim()}
          className="hover:bg-blue-50 text-blue-600"
        >
          <CornerDownLeft className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}