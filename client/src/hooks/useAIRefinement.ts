import { useState } from 'react';
import { GeneratedPlan } from '../types';
import { refineStudyPlanWithAI } from '../lib/aiService';
import { mockRefinePlan } from '../lib/apiMocks';

interface RefinementOptions {
  goals: string;
  strongestTopics: string[];
  weakestTopics: string[];
  stressLevel: 'low' | 'medium' | 'high';
  preferredTechniques: string[];
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
      // Prepare data for AI refinement
      const refinementData = {
        planId: currentPlan.studyPlan.id,
        courseName: currentPlan.studyPlan.courseName,
        examDate: currentPlan.studyPlan.examDate,
        weeklyStudyTime: currentPlan.studyPlan.weeklyStudyTime,
        studyPreference: currentPlan.studyPlan.studyPreference,
        learningStyle: currentPlan.studyPlan.learningStyle,
        studyMaterials: currentPlan.studyPlan.studyMaterials,
        topics: currentPlan.studyPlan.topics,
        resources: currentPlan.studyPlan.resources,
        // Add the user's refinement options
        goals: options.goals,
        strongestTopics: options.strongestTopics,
        weakestTopics: options.weakestTopics,
        stressLevel: options.stressLevel,
        preferredTechniques: options.preferredTechniques,
      };

      // Use AI service to get personalized recommendations
      const aiResult = await refineStudyPlanWithAI(refinementData, currentPlan);

      if (aiResult.success) {
        // Update the plan with AI suggestions
        const updatedPlan = await mockRefinePlan({
          planId: currentPlan.studyPlan.id,
          ...refinementData,
          aiRecommendations: aiResult.aiRecommendations
        });

        // Fetch the updated plan
        // Note: In a real implementation, you would fetch the updated plan from the API
        // For now, we'll simulate the response
        const updatedTasks = currentPlan.weeklyTasks.map(task => {
          // Prioritize weak topics
          if (options.weakestTopics.some(topic => task.title.includes(topic))) {
            return {
              ...task,
              duration: task.duration * 1.5, // Give more time to weak topics
            };
          }
          return task;
        });

        // Return the updated plan
        return {
          studyPlan: {
            ...currentPlan.studyPlan,
            ...updatedPlan,
          },
          calendarWeeks: currentPlan.calendarWeeks,
          weeklyTasks: updatedTasks,
        };
      } else {
        throw new Error("AI refinement failed");
      }
    } catch (err) {
      console.error("Error refining plan:", err);
      setError("Failed to refine study plan. Please try again.");
      throw err;
    } finally {
      setIsRefining(false);
    }
  };

  return {
    refinePlan,
    isRefining,
    error,
  };
} 