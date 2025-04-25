import { useState } from "react";
import { WeekData, StudyTask, AIWeeklyPlan } from "../types";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Sparkles, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarView from "./CalendarView";
import WeeklyTasks from "./WeeklyTasks";
import AIWeeklyPlanView from "./AIWeeklyPlanView"; // We'll create this component next

interface GeneratedPlanProps {
  calendarWeeks: WeekData[];
  weeklyTasks: StudyTask[];
  aiWeeklyPlan?: AIWeeklyPlan[];
  planSummary?: string;
  finalWeekStrategy?: string;
  aiRecommendations?: string[];
  isAIPersonalized?: boolean;
  onRegenerate: () => void;
}

export default function GeneratedPlan({ 
  calendarWeeks, 
  weeklyTasks, 
  aiWeeklyPlan, 
  planSummary, 
  finalWeekStrategy, 
  aiRecommendations,
  isAIPersonalized = false,
  onRegenerate 
}: GeneratedPlanProps) {
  const [showingTasks, setShowingTasks] = useState<StudyTask[]>(weeklyTasks);
  const [viewMode, setViewMode] = useState<'calendar' | 'ai'>(isAIPersonalized ? 'ai' : 'calendar');
  
  const handleExport = () => {
    // In a real implementation, this would export to Google Calendar or download a file
    alert("Export functionality would be implemented here!");
  };
  
  // Check if we have AI-personalized content to display
  const hasAIContent = aiWeeklyPlan && aiWeeklyPlan.length > 0;
  
  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          Your Study Plan
          {isAIPersonalized && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Personalized
            </span>
          )}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="h-5 w-5 mr-1" />
            Regenerate
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-5 w-5 mr-1" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Plan Summary (if available from AI) */}
      {planSummary && (
        <div className="mb-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium mb-2 flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
            Plan Summary
          </h3>
          <p className="text-sm text-gray-700">{planSummary}</p>
        </div>
      )}
      
      {/* View switching tabs */}
      {hasAIContent && (
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'ai')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center justify-center">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Weekly Plan
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center justify-center">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      
      {/* AI Weekly Plan View (if available) */}
      {hasAIContent && viewMode === 'ai' && (
        <AIWeeklyPlanView weeklyPlan={aiWeeklyPlan!} finalWeekStrategy={finalWeekStrategy} />
      )}
      
      {/* Traditional Calendar View */}
      {(!hasAIContent || viewMode === 'calendar') && (
        <>
          <CalendarView calendarWeeks={calendarWeeks} />
          <WeeklyTasks tasks={showingTasks} />
        </>
      )}
      
      {/* AI Recommendations */}
      {aiRecommendations && aiRecommendations.length > 0 && (
        <div className="mt-8">
          <h3 className="font-medium mb-3 flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
            Personalized Study Recommendations
          </h3>
          <ul className="list-disc list-inside space-y-2 pl-2">
            {aiRecommendations.map((tip, index) => (
              <li key={index} className="text-sm text-gray-700">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
