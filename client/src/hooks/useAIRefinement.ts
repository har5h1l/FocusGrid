import { useState } from 'react';
import { GeneratedPlan } from '../types';
import { refinePlanWithAI } from '../lib/refineStudyPlan';

interface AIRefinementOptions {
  goals?: string;
  strongestTopics?: string[];
  weakestTopics?: string[];
  stressLevel?: 'low' | 'medium' | 'high';
  preferredTechniques?: string[];
}

/**
 * Hook for refining a study plan with AI personalization
 */
export function useAIRefinement() {
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refines a study plan using AI to make it more personalized and effective
   * @param basePlan The original study plan
   * @param options User preferences and metadata
   * @returns The refined study plan
   */
  const refinePlan = async (
    basePlan: GeneratedPlan,
    options: AIRefinementOptions = {}
  ): Promise<GeneratedPlan> => {
    setIsRefining(true);
    setError(null);

    try {
      // Extract learning style and study materials from the base plan
      const { learningStyle, studyMaterials } = basePlan.studyPlan;
      
      // Combine with the passed options
      const userData = {
        ...options,
        learningStyle,
        studyMaterials,
      };

      // Call the refinePlanWithAI function
      const refinedPlan = await refinePlanWithAI(userData, basePlan);
      return refinedPlan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refine plan';
      setError(errorMessage);
      // Return the original plan if refinement fails
      return basePlan;
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