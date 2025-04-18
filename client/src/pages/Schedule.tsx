import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudyPlan, StudyTask, WeekData, GeneratedPlan } from "../types";
import CalendarView from "../components/CalendarView";
import WeeklyTasks from "../components/WeeklyTasks";
import CalendarIntegration from "../components/CalendarIntegration";
import AIRefinementDialog from "../components/AIRefinementDialog";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";

export default function Schedule() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Mutation for updating a study plan
  const updatePlanMutation = useMutation({
    mutationFn: async (refinedPlan: GeneratedPlan) => {
      // Update the study plan first
      const planResponse = await apiRequest(
        'PUT', 
        `/api/study-plans/${selectedPlanId}`, 
        { plan: refinedPlan.studyPlan }
      );
      
      // Then update or create the tasks
      for (const task of refinedPlan.weeklyTasks) {
        if (task.id && task.id > 0) {
          // Update existing task
          await apiRequest(
            'PUT',
            `/api/study-tasks/${task.id}`,
            task
          );
        } else {
          // Create new task
          await apiRequest(
            'POST',
            `/api/study-plans/${selectedPlanId}/tasks`,
            task
          );
        }
      }
      
      return planResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/study-plans/${selectedPlanId}/tasks`] });
      toast({
        title: "Plan Updated",
        description: "Your study plan has been refined with AI suggestions.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your study plan.",
        variant: "destructive",
      });
    }
  });

  // Find the currently selected plan
  const selectedPlan = selectedPlanId && studyPlans 
    ? studyPlans.find(plan => plan.id === selectedPlanId) 
    : null;

  // Mock calendar data for the selected plan
  // In a real implementation, this would come from the server
  const calendarWeeks: WeekData[] = tasks ? [
    {
      weekRange: "Current Week",
      monday: tasks.find(t => t.taskType === 'study') ? {
        title: tasks.find(t => t.taskType === 'study')?.title || "",
        duration: tasks.find(t => t.taskType === 'study')?.duration || 0,
        resource: tasks.find(t => t.taskType === 'study')?.resource || "",
        type: 'study'
      } : undefined,
      wednesday: tasks.find(t => t.taskType === 'study') ? {
        title: tasks.find(t => t.taskType === 'study')?.title || "",
        duration: tasks.find(t => t.taskType === 'study')?.duration || 0,
        resource: tasks.find(t => t.taskType === 'study')?.resource || "",
        type: 'study'
      } : undefined,
      friday: tasks.find(t => t.taskType === 'review') ? {
        title: tasks.find(t => t.taskType === 'review')?.title || "",
        duration: tasks.find(t => t.taskType === 'review')?.duration || 0,
        resource: tasks.find(t => t.taskType === 'review')?.resource || "",
        type: 'review'
      } : undefined,
      weekend: tasks.find(t => t.taskType === 'practice') ? {
        title: tasks.find(t => t.taskType === 'practice')?.title || "",
        duration: tasks.find(t => t.taskType === 'practice')?.duration || 0,
        resource: tasks.find(t => t.taskType === 'practice')?.resource || "",
        type: 'practice'
      } : undefined,
    }
  ] : [];

  // Handle AI-refined plan updates
  const handleRefinedPlan = (refinedPlan: GeneratedPlan) => {
    updatePlanMutation.mutate(refinedPlan);
  };

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
        <h2 className="text-xl font-semibold mb-4">My Study Schedule</h2>
        
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
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              {tasks && tasks.length > 0 ? (
                <>
                  {selectedPlan && tasks && (
                    <div className="mb-6 max-w-md mx-auto">
                      <AIRefinementDialog 
                        studyPlan={{
                          studyPlan: selectedPlan,
                          calendarWeeks,
                          weeklyTasks: tasks
                        }}
                        onRefinementComplete={handleRefinedPlan}
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Enhance your study plan with AI-powered personalization
                      </p>
                    </div>
                  )}
                
                  <CalendarView calendarWeeks={calendarWeeks} />
                  <WeeklyTasks tasks={tasks} />
                  
                  <Separator className="my-8" />
                  
                  {/* Calendar Integration Section */}
                  <CalendarIntegration 
                    tasks={tasks} 
                    planName={selectedPlan?.courseName || "Study Plan"} 
                  />
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No tasks found for this study plan.</p>
              )}
            </>
          )
        ) : (
          <p className="text-center text-gray-500 py-8">Please select a study plan to view your schedule.</p>
        )}
      </div>
    </div>
  );
}
