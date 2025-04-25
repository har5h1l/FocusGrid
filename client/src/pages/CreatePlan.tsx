import React, { useState } from 'react';
import { useLocation } from 'wouter';
import StudyPlanForm from '@/components/StudyPlanForm';
import AIClarificationDialog from '@/components/AIClarificationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { mockCreatePlan } from '@/lib/apiMocks';
import { generateAIStudyPlan } from '@/lib/aiService';
import { AIStudyPlanResponse, StudyPlanFormData } from '@/types';

export default function CreatePlan() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [pendingPlanData, setPendingPlanData] = useState<StudyPlanFormData | null>(null);

  // First step: Handle form submission and show clarification dialog
  const handleFormSubmit = async (data: StudyPlanFormData) => {
    // Basic validation
    if (!data.courseName || !data.examDate || !data.topics.length) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // If AI-powered plan generation is enabled, show clarification dialog
    if (data.generateOptions) {
      setPendingPlanData(data);
      setShowClarificationDialog(true);
    } else {
      // For non-AI plans, proceed directly
      await createPlan(data);
    }
  };

  // Second step: After clarifications (or if skipped), create the actual plan
  const createPlan = async (data: StudyPlanFormData) => {
    setIsSubmitting(true);
    setShowClarificationDialog(false);
    
    try {
      // Prepare the plan data
      const planData = {
        courseName: data.courseName,
        examDate: data.examDate,
        weeklyStudyTime: data.weeklyStudyTime,
        studyPreference: data.studyPreference,
        learningStyle: data.learningStyle,
        studyMaterials: data.studyMaterials,
        topics: Array.isArray(data.topics) ? data.topics.map(t => typeof t === 'string' ? t : t.title || t.name) : [],
        resources: Array.isArray(data.resources) ? data.resources.map(r => typeof r === 'string' ? r : r.name) : [],
        targetScore: data.targetScore,
        // Pass any clarification data we might have collected
        topicProgressNotes: data.topicProgressNotes,
        timeDistributionPreference: data.timeDistributionPreference,
        lastMinutePriority: data.lastMinutePriority,
      };

      // Generate AI study plan if options are enabled
      let aiPlanResponse: AIStudyPlanResponse | null = null;
      
      if (data.generateOptions) {
        toast({
          title: 'Creating your optimal study plan',
          description: 'We\'re using AI to create a personalized plan based on your preferences...',
          duration: 5000,
        });
        
        try {
          // Generate AI plan with enhanced data from clarifications
          aiPlanResponse = await generateAIStudyPlan(planData);
        } catch (error) {
          console.error('Error generating AI study plan:', error);
          toast({
            title: 'AI plan generation partial failure',
            description: 'We\'ll create a basic plan instead. You can refine it later.',
            variant: 'default',
            duration: 3000,
          });
        }
      }

      // Create the base plan
      let plan;
      try {
        // Create the basic plan with or without AI enhancements
        plan = await mockCreatePlan({
          ...planData,
          aiRecommendations: aiPlanResponse?.aiRecommendations || [],
          planSummary: aiPlanResponse?.summary || '',
          finalWeekStrategy: aiPlanResponse?.finalWeekStrategy || '',
          aiWeeklyPlan: aiPlanResponse?.weeklyPlan || []
        });
      } catch (error) {
        console.error('Error creating plan:', error);
        throw new Error('Failed to create study plan');
      }

      // Navigate to the plan detail page
      toast({
        title: 'Study plan created!',
        description: data.generateOptions ? 
          'Your AI-optimized study plan is ready.' : 
          'Your study plan is ready.',
      });
      navigate(`/plans/${plan.id}`);
    } catch (error) {
      console.error('Error creating study plan:', error);
      toast({
        title: 'Error',
        description: 'There was a problem creating your study plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Study Plan</CardTitle>
          <CardDescription>
            Enter your course details and preferences to generate a personalized study schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Creating your personalized study plan...</p>
              <p className="text-muted-foreground mt-2">This may take a moment as we optimize your schedule.</p>
            </div>
          ) : (
            <StudyPlanForm onSubmit={handleFormSubmit} />
          )}
        </CardContent>
      </Card>

      {/* AI Clarification Dialog */}
      {pendingPlanData && (
        <AIClarificationDialog
          planData={pendingPlanData}
          open={showClarificationDialog}
          onOpenChange={(open) => {
            setShowClarificationDialog(open);
            if (!open) {
              // If dialog is closed without proceeding, reset pending data
              setPendingPlanData(null);
            }
          }}
          onProceedWithPlan={(updatedData) => {
            createPlan(updatedData);
          }}
        />
      )}
    </div>
  );
}
