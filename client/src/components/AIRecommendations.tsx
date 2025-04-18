import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Lightbulb, BookOpen, Clock, Sparkles, RefreshCw, Send, MessageSquare } from "lucide-react";
import { Topic, LearningStyle, StudyMaterial } from "@/types";
import { StudyRecommendation, generateRecommendations } from "@/lib/studyRecommendations";
import { AIStudyRecommendation, generateAIRecommendations } from "@/lib/openRouterService";

interface AIRecommendationsProps {
  topics: Topic[];
  examDate: string;
  learningStyle?: LearningStyle;
  studyMaterials?: StudyMaterial[];
  onAddTask?: (task: any) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIRecommendations({ 
  topics, 
  examDate, 
  learningStyle, 
  studyMaterials,
  onAddTask 
}: AIRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [useAI, setUseAI] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [selectedRecommendation, setSelectedRecommendation] = useState<StudyRecommendation | null>(null);
  
  useEffect(() => {
    async function fetchRecommendations() {
      setIsLoading(true);
      try {
        if (useAI) {
          const aiRecs = await generateAIRecommendations(
            learningStyle,
            topics,
            examDate,
            studyMaterials
          );
          
          if (aiRecs && aiRecs.length > 0) {
            setRecommendations(aiRecs as StudyRecommendation[]);
            setIsLoading(false);
            return;
          }
        }
        
        const fallbackRecs = generateRecommendations(
          learningStyle,
          topics,
          examDate,
          studyMaterials
        );
        
        setRecommendations(fallbackRecs);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        const fallbackRecs = generateRecommendations(
          learningStyle,
          topics,
          examDate,
          studyMaterials
        );
        
        setRecommendations(fallbackRecs);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRecommendations();
  }, [topics, examDate, learningStyle, studyMaterials, useAI]);

  const handleChatSubmit = async () => {
    if (!userInput.trim()) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: userInput
    };

    setChatMessages(prev => [...prev, newMessage]);
    setUserInput("");

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userInput,
          context: {
            topics,
            examDate,
            learningStyle,
            studyMaterials,
            currentRecommendations: recommendations
          }
        })
      });

      const data = await response.json();
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);

      // If the AI suggests adding a task
      if (data.suggestedTask && onAddTask) {
        onAddTask(data.suggestedTask);
      }
    } catch (error) {
      console.error('Error in chat:', error);
    }
  };

  const handleRecommendationAction = async (recommendation: StudyRecommendation, action: 'accept' | 'modify' | 'reject') => {
    setSelectedRecommendation(recommendation);

    if (action === 'accept' && onAddTask) {
      onAddTask({
        title: recommendation.title,
        description: recommendation.description,
        duration: recommendation.duration,
        type: recommendation.category
      });
    }

    // Add to chat for context
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: `I ${action}ed the recommendation: ${recommendation.title}`
    }]);

    // Get AI feedback
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `User ${action}ed recommendation: ${recommendation.title}`,
          context: {
            topics,
            examDate,
            learningStyle,
            studyMaterials,
            currentRecommendations: recommendations
          }
        })
      });

      const data = await response.json();
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);
    } catch (error) {
      console.error('Error getting AI feedback:', error);
    }
  };
  
  // Function to toggle between AI and built-in recommendations
  const toggleRecommendationSource = () => {
    setUseAI(!useAI);
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    setIsLoading(true);
    // This will trigger the useEffect to run again
    const randomTrigger = Math.random();
    setRecommendations([]);
    setTimeout(() => {
      setUseAI(useAI);
    }, 100);
  };
  
  // Filter recommendations based on active tab
  const filteredRecommendations = activeTab === "all" 
    ? recommendations
    : recommendations.filter(rec => rec.category === activeTab);
  
  // Get icon based on category
  const getIcon = (category: string) => {
    switch (category) {
      case 'technique':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'resource':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'schedule':
        return <Clock className="h-5 w-5 text-green-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-purple-500" />;
    }
  };
  
  // Get badge color based on priority
  const getBadgeVariant = (priority: string): "default" | "secondary" | "outline" => {
    switch (priority) {
      case 'high':
        return "default";
      case 'medium':
        return "secondary";
      default:
        return "outline";
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Study Recommendations
        </CardTitle>
        <CardDescription>
          Personalized recommendations based on your learning style, progress, and exam timeline
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="technique">Techniques</TabsTrigger>
            <TabsTrigger value="resource">Resources</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value={activeTab} className="m-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-gray-500">Loading recommendations...</p>
                <p className="text-sm text-gray-400 mt-1">
                  {useAI ? "Generating AI-powered recommendations via OpenRouter" : "Preparing built-in recommendations"}
                </p>
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recommendations available. Try adding more topics or selecting a learning style.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecommendations.map((rec, index) => (
                  <div 
                    key={index} 
                    className="flex items-start p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="mr-4 mt-0.5">
                      {getIcon(rec.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{rec.title}</h3>
                        <Badge variant={getBadgeVariant(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <p className="text-sm text-gray-500">
              Based on {topics.length} topics and {learningStyle || "default"} learning style
            </p>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <Badge variant="outline" className="mr-2 h-5 text-xs">
                {useAI ? "OpenRouter AI" : "Built-in"}
              </Badge>
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-5 text-xs"
                onClick={toggleRecommendationSource}
              >
                Switch to {useAI ? "built-in" : "AI-powered"}
              </Button>
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}