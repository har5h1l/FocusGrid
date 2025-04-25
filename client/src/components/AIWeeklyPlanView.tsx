import React from 'react';
import { AIWeeklyPlan, AIStudyDay, AIStudyTask } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, Clock, BookOpen, RefreshCw, CheckSquare } from 'lucide-react';

interface AIWeeklyPlanViewProps {
  weeklyPlan: AIWeeklyPlan[];
  finalWeekStrategy?: string;
}

export default function AIWeeklyPlanView({ weeklyPlan, finalWeekStrategy }: AIWeeklyPlanViewProps) {
  // Task type to icon mapping
  const getTaskTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'study':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'practice':
        return <CheckSquare className="h-4 w-4 text-purple-600" />;
      default:
        return <BookOpen className="h-4 w-4 text-gray-600" />;
    }
  };

  // Task type to badge color
  const getTaskTypeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'study':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'review':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'practice':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Format task duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-8">
      {/* Final Week Strategy Banner */}
      {finalWeekStrategy && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-medium flex items-center">
              <CalendarDays className="h-5 w-5 mr-2 text-amber-600" />
              Final Week Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm">
            <p>{finalWeekStrategy}</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Plan */}
      {weeklyPlan.map((week, weekIndex) => (
        <Card key={weekIndex} className="overflow-hidden">
          <CardHeader className="py-4 bg-slate-50">
            <CardTitle className="text-lg font-medium flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">Week {week.week}</span>
                <span className="text-sm font-normal text-gray-500">{week.dateRange}</span>
              </div>
              <Badge variant="outline" className="font-normal">
                Focus: {week.focus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" defaultValue={['day-0']}>
              {week.days.map((day, dayIndex) => (
                <AccordionItem key={dayIndex} value={`day-${dayIndex}`} className="border-b">
                  <AccordionTrigger className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center text-left">
                      <span className="font-medium">{day.day}</span>
                      <span className="ml-4 text-sm text-gray-500">
                        {day.tasks.length} {day.tasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-auto max-h-[300px]">
                      <div className="p-4 space-y-4">
                        {day.tasks.map((task, taskIndex) => (
                          <div key={taskIndex} className="bg-white rounded-lg border p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start space-x-3">
                                <div className="mt-0.5">{getTaskTypeIcon(task.type)}</div>
                                <div>
                                  <h4 className="font-medium text-sm">{task.topic}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{task.activity}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <Badge variant="secondary" className={getTaskTypeBadgeClass(task.type)}>
                                  {task.type}
                                </Badge>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDuration(task.duration)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t text-xs flex justify-between items-center">
                              <span className="text-gray-500">Resource: {task.resource}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}