import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StudyPlanForm from "../components/StudyPlanForm";
import GeneratedPlan from "../components/GeneratedPlan";
import StudyPlanOptions from "../components/StudyPlanOptions";
import AIRecommendations from "../components/AIRecommendations";
import CalendarImport from "../components/CalendarImport";
import { StudyPlanFormData, GeneratedPlan as GeneratedPlanType } from "../types";
import { generateStudyPlan } from "../lib/studyPlanGenerator";

export default function CreatePlan() {
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlanType | null>(null);
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlanType[]>([]);
  const [formData, setFormData] = useState<StudyPlanFormData | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: createStudyPlan, isPending } = useMutation({
    mutationFn: async (data: StudyPlanFormData) => {
      // Set form data for later use
      setFormData(data);
      
      // Generate multiple plan options if requested or a single plan otherwise
      const plans = generateStudyPlan({
        ...data,
        generateOptions: true // Always generate options for now
      });
      
      // If we have multiple plans, show options first instead of saving to server
      if (Array.isArray(plans)) {
        setGeneratedPlans(plans);
        setShowOptions(true);
        return plans;
      } else {
        // Single plan flow
        // Persist on the server
        const response = await apiRequest('POST', '/api/study-plans', {
          courseName: data.courseName,
          examDate: data.examDate,
          weeklyStudyTime: data.weeklyStudyTime,
          studyPreference: data.studyPreference,
          topics: data.topics.map(t => t.title),
          resources: data.resources.map(r => r.name)
        });
        
        const newPlan = await response.json();
        
        // Create tasks for the plan
        for (const task of plans.weeklyTasks) {
          await apiRequest('POST', '/api/study-tasks', {
            ...task,
            studyPlanId: newPlan.id
          });
        }
        
        return plans;
      }
    },
    onSuccess: (data) => {
      if (!Array.isArray(data)) {
        setGeneratedPlan(data);
        queryClient.invalidateQueries({ queryKey: ['/api/study-plans'] });
        toast({
          title: "Study Plan Created",
          description: "Your study plan has been generated successfully!",
        });
      } else {
        toast({
          title: "Study Plans Generated",
          description: "Choose your preferred study plan option.",
        });
      }
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create your study plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFormSubmit = (data: StudyPlanFormData) => {
    if (!data.courseName) {
      toast({
        title: "Missing Information",
        description: "Please enter a course name.",
        variant: "destructive",
      });
      return;
    }

    if (!data.examDate) {
      toast({
        title: "Missing Information",
        description: "Please select an exam date.",
        variant: "destructive",
      });
      return;
    }

    if (data.topics.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one topic.",
        variant: "destructive",
      });
      return;
    }

    createStudyPlan(data);
  };

  const handleRegenerate = () => {
    if (generatedPlan) {
      // Re-generate the plan with the same data
      const result = generateStudyPlan({
        courseName: generatedPlan.studyPlan.courseName,
        examDate: generatedPlan.studyPlan.examDate,
        weeklyStudyTime: generatedPlan.studyPlan.weeklyStudyTime,
        studyPreference: generatedPlan.studyPlan.studyPreference as 'short' | 'long',
        topics: generatedPlan.studyPlan.topics.map(title => ({ id: Math.random().toString(), title })),
        resources: generatedPlan.studyPlan.resources.map(name => ({ id: Math.random().toString(), name }))
      });
      
      if (Array.isArray(result)) {
        setGeneratedPlans(result);
        setShowOptions(true);
        setGeneratedPlan(null);
      } else {
        setGeneratedPlan(result);
      }
      
      toast({
        title: "Study Plan Regenerated",
        description: "Your study plan has been regenerated with the same parameters.",
      });
    }
  };
  
  // Handle when user selects a plan from the options
  const handlePlanSelection = (planIndex: number) => {
    const selectedPlan = generatedPlans[planIndex];
    setGeneratedPlan(selectedPlan);
    setShowOptions(false);
    
    toast({
      title: "Plan Selected",
      description: `You've selected the ${['Balanced', 'Intensive', 'Flexible'][planIndex]} study plan.`,
    });
    
    // Save to server if needed
    if (formData) {
      const savePlan = async () => {
        try {
          // Persist on the server
          const response = await apiRequest('POST', '/api/study-plans', {
            courseName: formData.courseName,
            examDate: formData.examDate,
            weeklyStudyTime: formData.weeklyStudyTime,
            studyPreference: formData.studyPreference,
            topics: formData.topics.map(t => t.title),
            resources: formData.resources.map(r => r.name),
            selectedSchedule: planIndex + 1
          });
          
          const newPlan = await response.json();
          
          // Create tasks for the plan
          for (const task of selectedPlan.weeklyTasks) {
            await apiRequest('POST', '/api/study-tasks', {
              ...task,
              studyPlanId: newPlan.id
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['/api/study-plans'] });
        } catch (error) {
          console.error('Error saving plan:', error);
        }
      };
      
      savePlan();
    }
  };
  
  // Handle calendar events import
  const handleCalendarImport = (events: any[]) => {
    setCalendarEvents(events);
    toast({
      title: "Calendar Imported",
      description: `${events.length} events imported. Your study plan will work around these commitments.`,
    });
    
    // If we already have form data, regenerate the plan
    if (formData) {
      createStudyPlan({
        ...formData,
        calendarEvents: events
      });
    }
  };

  return (
    <>
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Create Your Study Plan</h2>
        <StudyPlanForm onSubmit={handleFormSubmit} />
        
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Import Your Calendar</h3>
          <p className="text-gray-600 mb-4">
            Import your existing commitments to create a study plan that works around your schedule.
          </p>
          <CalendarImport onImport={handleCalendarImport} />
        </div>
      </div>
      
      {isPending && (
        <div className="flex flex-col items-center justify-center py-12 bg-white shadow-sm rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Generating your personalized study plans...</p>
        </div>
      )}
      
      {showOptions && generatedPlans.length > 0 && (
        <StudyPlanOptions plans={generatedPlans} onSelect={handlePlanSelection} />
      )}
      
      {generatedPlan && !showOptions && (
        <>
          {formData && formData.topics.length > 0 && (
            <div className="mb-8">
              <AIRecommendations 
                topics={formData.topics}
                examDate={formData.examDate}
                learningStyle={formData.learningStyle}
                studyMaterials={formData.studyMaterials}
              />
            </div>
          )}
          
          <GeneratedPlan 
            calendarWeeks={generatedPlan.calendarWeeks}
            weeklyTasks={generatedPlan.weeklyTasks}
            onRegenerate={handleRegenerate}
          />
        </>
      )}
    </>
  );
}
