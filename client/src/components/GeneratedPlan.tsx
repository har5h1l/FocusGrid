import { useState } from "react";
import { WeekData, StudyTask } from "../types";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import CalendarView from "./CalendarView";
import WeeklyTasks from "./WeeklyTasks";

interface GeneratedPlanProps {
  calendarWeeks: WeekData[];
  weeklyTasks: StudyTask[];
  onRegenerate: () => void;
}

export default function GeneratedPlan({ calendarWeeks, weeklyTasks, onRegenerate }: GeneratedPlanProps) {
  const [showingTasks, setShowingTasks] = useState<StudyTask[]>(weeklyTasks);
  
  const handleExport = () => {
    // In a real implementation, this would export to Google Calendar or download a file
    alert("Export functionality would be implemented here!");
  };
  
  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Generated Study Plan</h2>
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
      
      {/* Calendar View */}
      <CalendarView calendarWeeks={calendarWeeks} />
      
      {/* Weekly Tasks */}
      <WeeklyTasks tasks={showingTasks} />
    </div>
  );
}
