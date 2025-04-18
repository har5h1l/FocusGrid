import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyPlan, StudyTask } from "../types";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

export default function ProgressTracker() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all study plans
  const { 
    data: studyPlans, 
    isLoading: isLoadingPlans,
    error: plansError
  } = useQuery<StudyPlan[]>({
    queryKey: ['/api/study-plans'],
  });

  // Fetch tasks for selected plan
  const {
    data: tasks,
    isLoading: isLoadingTasks,
  } = useQuery<StudyTask[]>({
    queryKey: [`/api/study-plans/${selectedPlanId}/tasks`],
    enabled: !!selectedPlanId,
  });

  const selectedPlan = studyPlans?.find(plan => plan.id === selectedPlanId);

  // Calculate progress metrics
  const calculateProgress = () => {
    if (!tasks || !selectedPlan) return { completed: 0, total: 0, percentComplete: 0, daysRemaining: 0 };
    
    const completed = tasks.filter(task => task.isCompleted).length;
    const total = tasks.length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const examDate = parseISO(selectedPlan.examDate);
    const today = new Date();
    const daysRemaining = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    return { completed, total, percentComplete, daysRemaining };
  };

  const findUpcomingTasks = () => {
    if (!tasks) return [];
    
    const today = new Date();
    const upcomingDate = addDays(today, 7);
    
    return tasks
      .filter(task => !task.isCompleted && isBefore(parseISO(task.date), upcomingDate) && isAfter(parseISO(task.date), today))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  };

  const { completed, total, percentComplete, daysRemaining } = calculateProgress();
  const upcomingTasks = findUpcomingTasks();

  if (plansError) {
    toast({
      title: "Error",
      description: "Failed to load study plans.",
      variant: "destructive",
    });
  }

  if (isLoadingPlans) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!studyPlans || studyPlans.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Study Plans</h2>
        <p className="text-gray-500">You haven't created any study plans yet. Go to the Create Plan tab to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">My Progress</h2>
        
        <div className="max-w-xs mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Study Plan
          </label>
          <Select 
            onValueChange={(value) => setSelectedPlanId(parseInt(value))}
            defaultValue={selectedPlanId?.toString()}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a study plan" />
            </SelectTrigger>
            <SelectContent>
              {studyPlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id.toString()}>
                  {plan.courseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlanId ? (
          isLoadingTasks ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{completed} / {total}</div>
                    <Progress value={percentComplete} className="h-2 mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">{percentComplete}% complete</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Days Until Exam</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{daysRemaining}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exam date: {selectedPlan ? format(parseISO(selectedPlan.examDate), 'MMMM d, yyyy') : ''}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Study Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {percentComplete < 25 ? 'Just Starting' : 
                       percentComplete < 50 ? 'Making Progress' : 
                       percentComplete < 75 ? 'Well Underway' : 
                       percentComplete < 100 ? 'Almost Done' : 'Complete!'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {daysRemaining > 14 ? 'Plenty of time left' : 
                       daysRemaining > 7 ? 'Getting closer' : 
                       daysRemaining > 0 ? 'Crunch time!' : 'Exam day has passed'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Upcoming Tasks</h3>
                {upcomingTasks.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {upcomingTasks.map((task) => (
                        <li key={task.id} className="py-3">
                          <div className="flex items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(task.date), 'EEEE, MMMM d')} - {task.duration} minutes
                              </p>
                            </div>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {format(parseISO(task.date), 'MMMM d')}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4 bg-gray-50 rounded-md">No upcoming tasks for the next 7 days.</p>
                )}
              </div>
            </div>
          )
        ) : (
          <p className="text-center text-gray-500 py-8">Please select a study plan to view your progress.</p>
        )}
      </div>
    </div>
  );
}
