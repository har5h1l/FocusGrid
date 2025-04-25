import { useState } from 'react';
import { GeneratedPlan } from '../types';
import { refineStudyPlanWithAI } from '../lib/aiService';
import { mockRefinePlan } from '../lib/apiMocks';

interface RefinementOptions {
  goals?: string;
  strongestTopics?: string[];
  weakestTopics?: string[];
  stressLevel?: 'low' | 'medium' | 'high';
  preferredTechniques?: string[];
  originalPlanData?: any;
}

/**
 * Hook for refining a study plan with AI personalization
 */
export function useAIRefinement() {
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refines a study plan using AI to make it more personalized and effective
   * @param currentPlan The original study plan
   * @param options User preferences and metadata
   * @returns The refined study plan
   */
  const refinePlan = async (currentPlan: GeneratedPlan, options: RefinementOptions): Promise<GeneratedPlan> => {
    setIsRefining(true);
    setError(null);

    try {
      // Ensure we have a valid plan to refine
      if (!currentPlan || !currentPlan.studyPlan) {
        throw new Error("Invalid study plan data");
      }

      // Prepare data for AI refinement
      const refinementData = {
        planId: currentPlan.studyPlan.id,
        courseName: currentPlan.studyPlan.courseName || "Course",
        examDate: currentPlan.studyPlan.examDate,
        weeklyStudyTime: currentPlan.studyPlan.weeklyStudyTime || 10,
        studyPreference: currentPlan.studyPlan.studyPreference,
        learningStyle: currentPlan.studyPlan.learningStyle,
        studyMaterials: currentPlan.studyPlan.studyMaterials || [],
        topics: currentPlan.studyPlan.topics || [],
        resources: currentPlan.studyPlan.resources || [],
        topicsProgress: currentPlan.studyPlan.topicsProgress || {},
        // Add the user's refinement options
        goals: options.goals || "",
        strongestTopics: options.strongestTopics || [],
        weakestTopics: options.weakestTopics || [],
        stressLevel: options.stressLevel || "medium",
        preferredTechniques: options.preferredTechniques || [],
      };

      console.log("Sending refinement request with data:", JSON.stringify(refinementData, null, 2));

      // Use AI service to get personalized recommendations
      const aiResult = await refineStudyPlanWithAI(refinementData, currentPlan);

      if (aiResult.success) {
        console.log("Refinement successful, creating new plan");
        
        // Create a new plan object that properly combines the original plan with AI refinements
        const refinedPlan: GeneratedPlan = {
          studyPlan: {
            ...currentPlan.studyPlan,
            aiRecommendations: aiResult.aiRecommendations || currentPlan.studyPlan.aiRecommendations || [],
            planSummary: aiResult.summary || currentPlan.studyPlan.planSummary || '',
            finalWeekStrategy: aiResult.finalWeekStrategy || currentPlan.studyPlan.finalWeekStrategy || '',
            // Track refinement history - if this is the first refinement, create a new array
            refinementHistory: [
              ...(currentPlan.studyPlan.refinementHistory || []),
              {
                date: new Date().toISOString(),
                changes: options.goals || "Plan refinement",
                strongTopics: options.strongestTopics,
                weakTopics: options.weakestTopics
              }
            ]
          },
          calendarWeeks: currentPlan.calendarWeeks,
          // Use the refined weekly plan if available, otherwise keep the original
          weeklyTasks: aiResult.weeklyPlan && aiResult.weeklyPlan.length > 0 ? 
            generateWeeklyTasksFromAIPlan(aiResult.weeklyPlan) : 
            currentPlan.weeklyTasks,
          aiWeeklyPlan: aiResult.weeklyPlan || currentPlan.aiWeeklyPlan || []
        };

        // Check if we had a partial success (fallback data was used)
        if (aiResult.partialSuccess) {
          console.log("Partial success with refinement - some fallback data was used");
          // Keep most of the original plan structure but use the new recommendations
          refinedPlan.aiWeeklyPlan = aiResult.weeklyPlan && aiResult.weeklyPlan.length > 0 ? 
            aiResult.weeklyPlan : 
            currentPlan.aiWeeklyPlan || [];
        }

        try {
          // Update the mock DB record (this would typically be an API call)
          await mockRefinePlan({
            planId: currentPlan.studyPlan.id,
            ...refinementData,
            aiRecommendations: aiResult.aiRecommendations,
            planSummary: aiResult.summary,
            finalWeekStrategy: aiResult.finalWeekStrategy,
            aiWeeklyPlan: refinedPlan.aiWeeklyPlan
          });
        } catch (dbError) {
          // Log but don't throw, so the UI can still update even if DB fails
          console.error("Failed to update plan in database:", dbError);
        }

        // Return the completely updated plan
        return refinedPlan;
      } else {
        throw new Error("AI refinement failed: " + (aiResult.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error refining plan:", err);
      
      // Provide more specific error messages based on the type of error
      if (err.message && err.message.includes("API key")) {
        setError("API key missing or invalid. Please check your API settings.");
      } else if (err.message && err.message.includes("Invalid JSON")) {
        setError("Failed to process AI response. The system will be fixed soon.");
      } else {
        setError("Failed to refine study plan. Please try again with different inputs.");
      }
      throw err;
    } finally {
      setIsRefining(false);
    }
  };

  return {
    refinePlan,
    isRefining,
    error,
    clearError: () => setError(null)
  };
}

// Helper function to convert AI weekly plan to weekly tasks format
function generateWeeklyTasksFromAIPlan(aiWeeklyPlan: any[]): any[] {
  if (!aiWeeklyPlan || !Array.isArray(aiWeeklyPlan) || aiWeeklyPlan.length === 0) {
    return [];
  }

  try {
    return aiWeeklyPlan.map(week => {
      const weeklyTasks = {
        week: week.week,
        dateRange: week.dateRange || "",
        focus: week.focus || "",
        days: {}
      };

      // Convert the days array to an object keyed by day name
      if (week.days && Array.isArray(week.days)) {
        week.days.forEach(day => {
          if (day.day && day.tasks) {
            weeklyTasks.days[day.day.toLowerCase()] = {
              tasks: day.tasks.map(task => ({
                id: generateTaskId(),
                topic: task.topic || "",
                activity: task.activity || "",
                resource: task.resource || "",
                duration: task.duration || 30,
                type: task.type || "study",
                isCompleted: false,
                priority: getPriorityFromType(task.type)
              }))
            };
          }
        });
      }

      return weeklyTasks;
    });
  } catch (error) {
    console.error("Error generating weekly tasks from AI plan:", error);
    return [];
  }
}

// Helper to generate a unique task ID
function generateTaskId(): string {
  return 'task_' + Math.random().toString(36).substring(2, 15);
}

// Helper to determine priority from task type
function getPriorityFromType(type: string): 'low' | 'medium' | 'high' {
  switch (type?.toLowerCase()) {
    case 'practice':
      return 'high';
    case 'review':
      return 'medium';
    case 'study':
    default:
      return 'medium';
  }
}