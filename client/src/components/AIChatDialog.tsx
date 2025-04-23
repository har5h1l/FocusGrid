import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { StudyPlan } from '@/types';
import { handleAIChatQuery } from '@/lib/aiService';

interface AIChatDialogProps {
  studyPlan: StudyPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export default function AIChatDialog({ studyPlan, open, onOpenChange }: AIChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: `Hi! How can I help you with your ${studyPlan.courseName} study plan today? Ask me about topics, schedule adjustments, or study strategies.` }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Use the OpenRouter API through our aiService
    try {
      const aiResponseText = await handleAIChatQuery(userMessage.text, studyPlan);
      const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: ChatMessage = { 
        sender: 'ai', 
        text: "I'm sorry, I encountered an error processing your request. Please try again." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Study Assistant Chat</DialogTitle>
          <DialogDescription>
            Ask questions about your {studyPlan.courseName} plan or study strategies.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow mb-4 pr-4 -mr-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <div className="flex w-full space-x-2">
            <Input 
              placeholder="Ask a question..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !isLoading) handleSendMessage(); }}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4"/>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 