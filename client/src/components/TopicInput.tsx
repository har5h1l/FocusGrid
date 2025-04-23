import { useState } from "react";
import { Topic } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Target, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";

interface TopicInputProps {
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
}

export default function TopicInput({ topics, setTopics }: TopicInputProps) {
  const [newTopic, setNewTopic] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Smart topic parsing with AI assistance
  const parseTopics = async (inputText: string) => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Check if the input is complex enough to need parsing
      if (
        inputText.includes("+") || 
        inputText.includes(",") || 
        inputText.includes(";") ||
        inputText.length > 40 ||
        inputText.toLowerCase().includes("chapter") ||
        inputText.toLowerCase().includes("section") ||
        inputText.toLowerCase().includes("unit") ||
        inputText.toLowerCase().includes("content") ||
        inputText.toLowerCase().includes("review")
      ) {
        // Process the complex input
        const parsedTopics = breakdownComplexInput(inputText);
        
        // Create multiple topics
        const newTopics = parsedTopics.map(title => ({
          id: uuidv4(),
          title: title.trim(),
          progress: 0
        }));
        
        // Add all new topics
        setTopics([...topics, ...newTopics]);
        
        // Show success toast
        toast({
          title: "Topics added",
          description: `Added ${newTopics.length} topics from your input`,
        });
      } else {
        // Simple single topic
        addTopic();
      }
    } catch (error) {
      console.error("Error parsing topics:", error);
      // Fallback to simple add if parsing fails
      addTopic();
    } finally {
      setIsProcessing(false);
      setNewTopic("");
    }
  };
  
  // Helper function to breakdown complex inputs
  const breakdownComplexInput = (input: string): string[] => {
    let topics: string[] = [];
    
    // Check for economics-related combined topics that should stay together
    const economicsTerms = [
      'business cycle', 'unemployment', 'inflation', 'gdp', 'monetary policy', 
      'fiscal policy', 'aggregate demand', 'aggregate supply', 'economic growth',
      'supply and demand', 'market structure', 'market failure', 'international trade'
    ];
    
    if (input.toLowerCase().includes('econ') || 
        economicsTerms.some(term => input.toLowerCase().includes(term))) {
      // Check if this is a list of economics concepts that should be grouped
      if (input.includes(",")) {
        // For economics topics with commas, offer to group them instead of splitting
        const commaCount = (input.match(/,/g) || []).length;
        if (commaCount >= 1 && commaCount <= 3) {
          // Create a main topic with the entire group
          topics.push(input);
          return topics;
        }
      }
    }
    
    // Try to intelligently split the input
    if (input.includes("+")) {
      // Handle Barrons content + review format
      if (input.toLowerCase().includes("content") && input.toLowerCase().includes("review")) {
        const base = input.split("+")[0].trim();
        if (base.toLowerCase().includes("barrons") || base.toLowerCase().includes("kaplan") || 
            base.toLowerCase().includes("princeton")) {
          const bookName = base.split(" ")[0]; // Extract publisher name
          topics = [
            `${bookName} Content Review`,
            `${bookName} Practice Questions`,
            `${bookName} Terminology`,
            `${bookName} Key Concepts`
          ];
        }
      } else {
        // Regular + delimited topics
        topics = input.split("+").map(t => t.trim());
      }
    } else if (input.includes(",")) {
      // Comma-separated topics
      topics = input.split(",").map(t => t.trim());
    } else if (input.toLowerCase().includes("chapter") || input.toLowerCase().includes("unit")) {
      // Try to extract chapter/unit info
      const match = input.match(/(chapter|unit)\s*(\d+)[:\s-]*(.*)/i);
      if (match) {
        const [_, type, number, description] = match;
        const title = description ? description.trim() : `${type} ${number}`;
        topics = [title];
        
        // If it's just a chapter number without description, try to create sub-topics
        if (!description) {
          topics.push(`${type} ${number}: Key Concepts`);
          topics.push(`${type} ${number}: Terminology`);
          topics.push(`${type} ${number}: Practice`);
        }
      } else {
        topics = [input]; // Fallback
      }
    } else {
      // Default to single topic if no patterns match
      topics = [input];
    }
    
    return topics.filter(t => t.trim() !== "");
  };

  const addTopic = () => {
    if (newTopic.trim() === "") return;
    
    const topic: Topic = {
      id: uuidv4(),
      title: newTopic.trim(),
      progress: 0 // Default to 0% progress
    };
    
    setTopics([...topics, topic]);
    setNewTopic("");
  };

  const removeTopic = (id: string) => {
    setTopics(topics.filter(topic => topic.id !== id));
  };

  const updateTopicProgress = (id: string, progress: number) => {
    const updatedTopics = topics.map(t => 
      t.id === id ? { ...t, progress } : t
    );
    setTopics(updatedTopics);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      parseTopics(newTopic);
    }
  };

  return (
    <div className="col-span-2">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="topics" className="block text-sm font-medium text-gray-700">
          Study Topics
        </label>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm"
          className="text-primary hover:text-primary-dark"
          onClick={() => setShowProgress(!showProgress)}
        >
          <Target className="h-4 w-4 mr-1" />
          {showProgress ? "Hide Progress" : "Track Progress"}
        </Button>
      </div>
      <div className="border border-gray-300 rounded-md p-4 mb-2">
        {topics.map((topic) => (
          <div key={topic.id} className="mb-4">
            <div className="flex items-center mb-1">
              <Input
                type="text"
                className="flex-1 mr-2"
                value={topic.title}
                onChange={(e) => {
                  const updatedTopics = topics.map(t => 
                    t.id === topic.id ? { ...t, title: e.target.value } : t
                  );
                  setTopics(updatedTopics);
                }}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeTopic(topic.id)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
            
            {showProgress && (
              <div className="pl-2 pr-10">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Progress: {topic.progress || 0}%</label>
                </div>
                <Slider
                  value={[topic.progress || 0]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(values) => updateTopicProgress(topic.id, values[0])}
                  className="py-2"
                />
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <Input
            type="text"
            className="flex-1 mr-2"
            placeholder="e.g., Unit 1: History of Psychology, or Barrons content + review"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
          />
          <Button 
            type="button" 
            variant="outline" 
            className="text-primary border-primary hover:bg-blue-50 px-3 py-2"
            onClick={() => parseTopics(newTopic)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-1" />
                Smart Add
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Type multiple topics separated by commas, or enter complex content like "Barrons content + review" for automatic breakdown.
        </p>
      </div>
    </div>
  );
}
