import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, BookOpen, BarChart3, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { mockGetPlan, mockUpdateTask } from '@/lib/apiMocks';
import AIRefinementDialog from '@/components/AIRefinementDialog';
import AIChatDialog from '@/components/AIChatDialog';
import { GeneratedPlan, StudyPlan, StudyTask } from '@/types';
import AIWeeklyPlanView from '@/components/AIWeeklyPlanView';

// Types for our study plan and tasks
interface ScheduleProps {
  id: string;
}

export default function Schedule({ id }: ScheduleProps) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefinementDialogOpen, setIsRefinementDialogOpen] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  
  // Fetch the study plan and tasks
  const {
    data: planData,
    isLoading: isPlanLoading,
    error: planError,
    refetch: refetchPlan
  } = useQuery<{
    plan: StudyPlan; 
    tasks: StudyTask[];
    aiWeeklyPlan?: any[]; 
  }>({
    queryKey: ['plan', id],
    queryFn: async () => {
      try {
        // Use the mock API in development
        return await mockGetPlan(id);
      } catch (error) {
        console.error('Error fetching plan:', error);
        throw new Error('Failed to fetch study plan');
      }
    }
  });

  // Update task completion status
  const updateTask = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: number, isCompleted: boolean }) => {
      try {
        // Use the mock API in development
        return await mockUpdateTask(id, taskId, { isCompleted });
      } catch (error) {
        console.error('Error updating task:', error);
        throw new Error('Failed to update task');
      }
    },
    onSuccess: () => {
      // Invalidate the plan data query to refetch
      queryClient.invalidateQueries({ queryKey: ['plan', id] });
      toast({
        title: 'Task updated',
        description: 'Your progress has been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    }
  });

  const handleToggleTask = (taskId: number, currentStatus: boolean) => {
    updateTask.mutate({ taskId, isCompleted: !currentStatus });
  };

  // Handle successful plan refinement
  const handleRefinementComplete = (refinedPlan: GeneratedPlan) => {
    queryClient.invalidateQueries({ queryKey: ['plan', id] });
    toast({
      title: "Plan Refined!",
      description: "Your study plan has been updated with AI suggestions.",
    });
  };

  // Calculate overall progress
  const calculateProgress = (plan?: StudyPlan, tasks?: StudyTask[]) => {
    if (!plan || !tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // Filter tasks based on the active tab
  const filterTasks = (tasks?: StudyTask[]) => {
    if (!tasks) return [];
    
    const today = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return tasks.filter(task => {
          const taskDate = parseISO(task.date);
          return isAfter(taskDate, today) && !task.isCompleted;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      case 'completed':
        return tasks.filter(task => task.isCompleted)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      case 'thisWeek':
        const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
        return tasks.filter(task => {
          const taskDate = parseISO(task.date);
          return (
            isAfter(taskDate, startOfThisWeek) && 
            isBefore(taskDate, endOfThisWeek)
          );
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      case 'overdue':
        return tasks.filter(task => {
          const taskDate = parseISO(task.date);
          return isBefore(taskDate, today) && !task.isCompleted;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      default:
        return tasks;
    }
  };

  // Format the exam countdown
  const getExamCountdown = (examDate?: string) => {
    if (!examDate) return 'No exam date set';
    
    const today = new Date();
    const exam = parseISO(examDate);
    
    if (isBefore(exam, today)) {
      return 'Exam has passed';
    }
    
    const diffTime = Math.abs(exam.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days until exam`;
  };

  // Get task color based on type
  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'study':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-purple-100 text-purple-800';
      case 'practice':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get task icon based on type
  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'study':
        return <BookOpen className="h-4 w-4" />;
      case 'review':
        return <BarChart3 className="h-4 w-4" />;
      case 'practice':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // If plan is loading or errored
  if (isPlanLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (planError || !planData?.plan) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Error</h1>
        <p className="mt-2">Failed to load the study plan. Please try again.</p>
        <Button className="mt-4" onClick={() => refetchPlan()}>
          Retry
        </Button>
      </div>
    );
  }

  const plan = planData.plan;
  const tasks = planData.tasks || [];
  // Construct the GeneratedPlan object needed for the dialog
  const generatedPlanForDialog: GeneratedPlan = {
    studyPlan: plan,
    weeklyTasks: tasks,
    aiWeeklyPlan: planData.aiWeeklyPlan || [], 
    calendarWeeks: [] 
  };

  const progress = calculateProgress(plan, tasks);
  const filteredTasks = filterTasks(tasks);

  // Add new section to display AI-generated plan structure
  const AIGeneratedPlanSection = ({ plan }: { plan: StudyPlan }) => {
    if (!plan.aiRecommendations?.length && !plan.planSummary && !plan.finalWeekStrategy && !planData?.aiWeeklyPlan?.length) {
      return null;
    }
    
    const hasAIWeeklyPlan = planData?.aiWeeklyPlan && planData.aiWeeklyPlan.length > 0;
    
    return (
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
              Your AI-Optimized Study Plan
            </CardTitle>
            <CardDescription>
              This plan is tailored to your preferences, learning style, and progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.planSummary && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700">{plan.planSummary}</p>
              </div>
            )}
            
            {/* Display the AI weekly plan using our new component if available */}
            {hasAIWeeklyPlan && (
              <div className="mt-6">
                <AIWeeklyPlanView 
                  weeklyPlan={planData?.aiWeeklyPlan || []} 
                  finalWeekStrategy={plan.finalWeekStrategy} 
                />
              </div>
            )}
            
            {!hasAIWeeklyPlan && plan.finalWeekStrategy && (
              <div>
                <h3 className="text-lg font-medium mb-2">Final Week Strategy</h3>
                <p className="text-gray-700">{plan.finalWeekStrategy}</p>
              </div>
            )}
            
            {plan.aiRecommendations?.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  Personalized Study Tips
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  {plan.aiRecommendations.map((tip, i) => (
                    <li key={i} className="text-gray-700">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{plan.courseName}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {getExamCountdown(plan.examDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-card rounded-lg p-4 flex-1 border">
                <div className="text-muted-foreground text-sm mb-1">Progress</div>
                <div className="text-2xl font-bold">{progress}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 flex-1 border">
                <div className="text-muted-foreground text-sm mb-1">Study Time</div>
                <div className="text-2xl font-bold">{plan.weeklyStudyTime} hrs/week</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {plan.studyPreference === 'short' ? 'Short, frequent sessions' : 'Long, focused sessions'}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Topics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {plan.topics.map((topic, index) => (
                  <div 
                    key={index} 
                    className="bg-muted px-3 py-2 rounded-md text-sm flex justify-between items-center"
                  >
                    <span>{topic}</span>
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {plan.topicsProgress && plan.topicsProgress[topic] ? `${plan.topicsProgress[topic]}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Resources</h3>
              <div className="flex flex-wrap gap-2">
                {plan.resources.map((resource, index) => (
                  <div key={index} className="bg-muted px-3 py-1 rounded-md text-sm">
                    {resource}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Study Assistant</CardTitle>
            <CardDescription>Need help or want to adjust?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2" 
              onClick={() => setIsRefinementDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Refine Plan with AI
            </Button>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <MessageSquare className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-medium mb-2">Ask AI About Your Plan</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant answers to questions about topics, schedule, or study methods.
              </p>
              <Button 
                className="w-full" 
                onClick={() => setIsChatDialogOpen(true)}
              >
                Start Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AIGeneratedPlanSection plan={plan} />

      <Card>
        <CardHeader>
          <CardTitle>Study Schedule</CardTitle>
          <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="thisWeek">This Week</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks in this category
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Checkbox 
                    id={`task-${task.id}`}
                    checked={task.isCompleted}
                    onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <label 
                          htmlFor={`task-${task.id}`}
                          className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {task.title}
                        </label>
                        {task.description && (
                          <p className={`text-sm mt-1 ${task.isCompleted ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getTaskTypeColor(task.taskType)}`}
                        >
                          {getTaskTypeIcon(task.taskType)}
                          {task.taskType}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(task.date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.duration} min
                      </div>
                      {task.resource && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {task.resource}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AIRefinementDialog
        studyPlan={generatedPlanForDialog} 
        onRefinementComplete={handleRefinementComplete}
        open={isRefinementDialogOpen}
        onOpenChange={setIsRefinementDialogOpen}
      />
      
      <AIChatDialog 
        studyPlan={plan}
        open={isChatDialogOpen}
        onOpenChange={setIsChatDialogOpen}
      />
    </div>
  );
}
