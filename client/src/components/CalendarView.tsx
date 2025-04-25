import { useState } from "react";
import { WeekData } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfToday, parseISO, isSameDay, isAfter, isBefore } from "date-fns";
import { ChevronLeft, ChevronRight, BookOpen, BarChart2, Clock, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalendarViewProps {
  calendarWeeks: WeekData[];
}

export default function CalendarView({ calendarWeeks }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<'weekly' | 'timeline'>('weekly');
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  const getTaskBorderColor = (type: string) => {
    switch (type) {
      case 'study':
        return 'border-blue-500';
      case 'review':
        return 'border-purple-500';
      case 'practice':
        return 'border-green-500';
      default:
        return 'border-gray-300';
    }
  };

  const getTaskBgColor = (type: string) => {
    switch (type) {
      case 'study':
        return 'bg-blue-50';
      case 'review':
        return 'bg-purple-50';
      case 'practice':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'study':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'review':
        return <BarChart2 className="h-4 w-4 text-purple-500" />;
      case 'practice':
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'study':
        return 'Study';
      case 'review':
        return 'Review';
      case 'practice':
        return 'Practice';
      default:
        return 'Task';
    }
  };

  // For timeline view - generate a continuous timeline of dates
  const generateTimelineDays = () => {
    if (calendarWeeks.length === 0) return [];

    const days = [];
    const today = startOfToday();
    const totalDays = calendarWeeks.length * 7;

    for (let i = 0; i < totalDays; i++) {
      const date = addDays(today, i);
      days.push(date);
    }

    return days.slice(0, 28); // Limit to 4 weeks for better visualization
  };

  // For timeline view - get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const tasks = [];

    calendarWeeks.forEach(week => {
      // Check each day of the week
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekend'].forEach(day => {
        const task = week[day];
        if (task) {
          // Assuming task date is a string like "2023-04-10"
          // We need to check if the task date matches the current date
          const taskDate = new Date(task.date);
          if (isSameDay(taskDate, date)) {
            tasks.push(task);
          }
        }
      });
    });

    return tasks;
  };

  const timelineDays = generateTimelineDays();

  // Handle week navigation
  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < calendarWeeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Study Schedule</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className={`${currentView === 'weekly' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setCurrentView('weekly')}
          >
            Weekly View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`${currentView === 'timeline' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setCurrentView('timeline')}
          >
            Timeline View
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-2">
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
          <span>Study</span>
        </div>
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 rounded-full bg-purple-500 mr-1.5"></div>
          <span>Review</span>
        </div>
        <div className="flex items-center text-sm">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
          <span>Practice</span>
        </div>
      </div>

      {/* Weekly View */}
      {currentView === 'weekly' && (
        <div className="rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-muted">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek} disabled={currentWeekIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h4 className="text-sm font-medium">
              {calendarWeeks.length > 0 ? `Week ${currentWeekIndex + 1}: ${calendarWeeks[currentWeekIndex].weekRange}` : 'No schedule available'}
            </h4>
            <Button variant="outline" size="icon" onClick={goToNextWeek} disabled={currentWeekIndex >= calendarWeeks.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/80">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monday</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tuesday</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Wednesday</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Thursday</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Friday</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Weekend</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calendarWeeks.length > 0 ? (
                  <tr>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekend'].map((day, i) => {
                      const task = calendarWeeks[currentWeekIndex][day];
                      return (
                        <td key={i} className="px-6 py-4">
                          {task ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`${getTaskBgColor(task.type)} p-3 rounded-lg border-l-4 ${getTaskBorderColor(task.type)} h-full`}>
                                    <div className="flex items-center mb-2">
                                      {getTaskTypeIcon(task.type)}
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {getTaskTypeLabel(task.type)}
                                      </Badge>
                                    </div>
                                    <h4 className="font-medium text-sm">{task.title}</h4>
                                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                                      <Clock className="h-3 w-3 mr-1" /> 
                                      {task.duration} min
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p className="font-medium">{task.title}</p>
                                    <p>{task.resource}</p>
                                    <p className="text-xs">{task.duration} minutes</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className="h-24 flex items-center justify-center border border-dashed border-gray-200 rounded-lg p-3">
                              <span className="text-sm text-muted-foreground">No tasks</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No schedule data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {currentView === 'timeline' && (
        <div className="space-y-4">
          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid grid-cols-7 gap-px border-b bg-muted">
                  {timelineDays.slice(0, 7).map((day, i) => (
                    <div key={i} className="text-center p-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-sm font-semibold mt-1 ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 grid-rows-4 gap-px bg-muted">
                  {timelineDays.map((day, i) => {
                    const tasks = getTasksForDate(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div 
                        key={i} 
                        className={`min-h-[100px] p-1 ${
                          isToday ? 'bg-blue-50' : 'bg-white'
                        } ${
                          isToday ? 'ring-2 ring-primary ring-inset' : ''
                        }`}
                      >
                        <div className="text-xs font-medium text-right pr-1 mb-1">
                          {format(day, 'MMM d')}
                        </div>
                        
                        <div className="space-y-1">
                          {tasks.map((task, idx) => (
                            <TooltipProvider key={idx}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`text-xs p-1.5 rounded-md ${getTaskBgColor(task.type)} flex items-center`}>
                                    {getTaskTypeIcon(task.type)}
                                    <span className="ml-1.5 truncate">{task.title}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p className="font-medium">{task.title}</p>
                                    <p>{task.resource}</p>
                                    <p className="text-xs">{task.duration} minutes</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Showing 4 weeks of your study plan. Hover over tasks for details.
          </p>
        </div>
      )}
    </div>
  );
}
