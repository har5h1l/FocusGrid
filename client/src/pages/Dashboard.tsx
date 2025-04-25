import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Calendar, 
  Clock, 
  Loader2, 
  PlusCircle, 
  ChevronRight, 
  BarChart3, 
  GraduationCap,
  BookText
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, addDays, differenceInDays } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockGetAllPlans } from "@/lib/apiMocks";
import { StudyPlan, StudyTask } from "@/types";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Fetch all study plans
  const {
    data: plans,
    isLoading,
    error,
  } = useQuery<{ plans: StudyPlan[], tasks: Record<number, StudyTask[]> }>({
    queryKey: ["plans"],
    queryFn: () => mockGetAllPlans(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plans) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-500">Error</h2>
        <p className="mt-2">Failed to load study plans</p>
      </div>
    );
  }

  const calculateProgress = (planId: number): number => {
    const tasks = plans.tasks[planId] || [];
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getUpcomingTasks = (): StudyTask[] => {
    const allTasks: StudyTask[] = [];
    
    // Collect all tasks from all plans
    Object.values(plans.tasks).forEach(planTasks => {
      allTasks.push(...planTasks);
    });
    
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    // Filter and sort upcoming tasks
    return allTasks
      .filter(task => !task.isCompleted && 
                     isAfter(parseISO(task.date), today) && 
                     isBefore(parseISO(task.date), nextWeek))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 5); // Limit to 5 tasks
  };

  const getExamCountdown = (examDate: string): string => {
    const today = new Date();
    const exam = parseISO(examDate);
    
    if (isBefore(exam, today)) {
      return 'Exam has passed';
    }
    
    const daysRemaining = differenceInDays(exam, today);
    return `${daysRemaining} days left`;
  };

  const upcomingTasks = getUpcomingTasks();
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Study Dashboard</h1>
        <Button onClick={() => navigate("/plans/new")}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Course Overview</CardTitle>
            <CardDescription>Your active study plans</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans.plans.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No study plans yet</h3>
                <p className="text-muted-foreground mb-4">Create your first study plan to get started</p>
                <Button onClick={() => navigate("/plans/new")}>
                  Create Study Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.plans.map(plan => {
                  const progress = calculateProgress(plan.id);
                  
                  return (
                    <div 
                      key={plan.id} 
                      className="p-4 border rounded-lg hover:bg-accent hover:cursor-pointer transition-colors"
                      onClick={() => navigate(`/schedule/${plan.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-lg font-medium">{plan.courseName}</h3>
                          <p className="text-muted-foreground text-sm flex items-center">
                            <Calendar className="h-3 w-3 mr-1" /> 
                            {format(parseISO(plan.examDate), "MMM d, yyyy")} • 
                            <span className="ml-1 font-medium text-accent-foreground">
                              {getExamCountdown(plan.examDate)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center text-muted-foreground hover:text-primary">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between mb-1 items-center text-sm">
                          <div>Progress</div>
                          <div>{progress}%</div>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Active Courses</span>
                <span className="text-2xl font-bold">{plans.plans.length}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Upcoming Tasks</span>
                <span className="text-2xl font-bold">{upcomingTasks.length}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Average Progress</span>
                <span className="text-2xl font-bold">
                  {plans.plans.length 
                    ? Math.round(plans.plans.reduce((sum, plan) => sum + calculateProgress(plan.id), 0) / plans.plans.length) 
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="thisWeek">This Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming tasks for this period
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingTasks.map(task => {
                // Find the plan that this task belongs to
                const plan = plans.plans.find(p => p.id === task.studyPlanId);
                
                return (
                  <div key={task.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan?.courseName || "Unknown course"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(parseISO(task.date), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {task.duration} min
                          </div>
                        </div>
                      </div>
                      {task.resource && (
                        <div className="flex items-center mt-2 text-xs text-muted-foreground">
                          <BookText className="h-3 w-3 mr-1" />
                          {task.resource}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/progress")} className="ml-auto">
            View All Tasks <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}