import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StudyPlanFormData } from '@/types';
import { handleAIChatQuery } from '@/lib/aiService'; // Import for AI-generated questions

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'long-text';
  choices?: string[];
  answer?: string;
  context?: string;
}

interface AIClarificationDialogProps {
  planData: StudyPlanFormData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedWithPlan: (updatedData: StudyPlanFormData) => void;
}

export default function AIClarificationDialog({ 
  planData,
  open, 
  onOpenChange, 
  onProceedWithPlan
}: AIClarificationDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Fetch clarification questions when the dialog opens
  useEffect(() => {
    if (open) {
      generateClarificationQuestions();
    }
  }, [open]);
  
  const generateClarificationQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use both rule-based and AI-generated questions
      const ruleBasedQuestions = await analyzeStudyPlanData(planData);
      const aiGeneratedQuestions = await generateAIClarificationQuestions(planData);
      
      // Combine both types of questions
      const allQuestions = [...ruleBasedQuestions, ...aiGeneratedQuestions];
      // Limit to a reasonable number (max 4 questions)
      const limitedQuestions = shuffleArray(allQuestions).slice(0, 4);
      
      setClarificationQuestions(limitedQuestions);
      
      // If no questions needed, auto-proceed
      if (limitedQuestions.length === 0) {
        setIsCompleted(true);
        setTimeout(() => {
          onProceedWithPlan(planData);
        }, 1000);
      }
    } catch (err) {
      console.error("Error generating clarification questions:", err);
      setError("Failed to analyze your plan. You can continue anyway or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = clarificationQuestions[currentQuestionIndex];
  
  const handleAnswerChange = (answer: string) => {
    setClarificationQuestions(questions => 
      questions.map((q, idx) => 
        idx === currentQuestionIndex ? { ...q, answer } : q
      )
    );
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < clarificationQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered
      setIsCompleted(true);
      
      // Apply the clarifications to the plan data
      const updatedPlanData = applyAnswersToPlanData(planData, clarificationQuestions);
      
      // Give a brief moment to show completion before proceeding
      setTimeout(() => {
        onProceedWithPlan(updatedPlanData);
      }, 1000);
    }
  };
  
  const handleSkip = () => {
    // Skip the current question but mark it as seen
    handleNext();
  };
  
  const handleFinish = () => {
    const updatedPlanData = applyAnswersToPlanData(planData, clarificationQuestions);
    onProceedWithPlan(updatedPlanData);
  };

  // Determine if we can proceed with the current question
  const canProceed = !currentQuestion?.answer 
    ? false // Can't proceed if no answer for the current question
    : currentQuestion.answer.trim() !== ""; // Can't proceed if answer is empty
  
  // Content to show in the dialog body depending on state
  const renderDialogContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-center text-muted-foreground">
            Analyzing your study plan to see if any details need clarification...
          </p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => generateClarificationQuestions()}>Try Again</Button>
          </div>
        </div>
      );
    }
    
    if (isCompleted) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-center font-medium">Thank you for the clarifications!</p>
          <p className="text-center text-muted-foreground">
            Generating your personalized study plan now...
          </p>
        </div>
      );
    }
    
    if (clarificationQuestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-center">Your study plan inputs look good! No clarification needed.</p>
        </div>
      );
    }
    
    // Render the current question
    return (
      <div className="space-y-6">
        <div className="flex items-start">
          <HelpCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-1" />
          <div>
            <p className="font-medium">
              {currentQuestion.question}
            </p>
            {currentQuestion.context && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentQuestion.context}
              </p>
            )}
          </div>
        </div>
        
        {currentQuestion.type === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="clarification-answer">Your answer:</Label>
            <Input 
              id="clarification-answer"
              value={currentQuestion.answer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
            />
          </div>
        )}
        
        {currentQuestion.type === 'long-text' && (
          <div className="space-y-2">
            <Label htmlFor="clarification-long-answer">Your answer:</Label>
            <Textarea 
              id="clarification-long-answer"
              value={currentQuestion.answer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your detailed answer here..."
              className="min-h-[100px]"
            />
          </div>
        )}
        
        {currentQuestion.type === 'choice' && currentQuestion.choices && (
          <div className="space-y-2">
            <Label>Select an option:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentQuestion.choices.map((choice, idx) => (
                <Button 
                  key={idx} 
                  variant={currentQuestion.answer === choice ? "default" : "outline"}
                  className="justify-start h-auto text-left py-3"
                  onClick={() => handleAnswerChange(choice)}
                >
                  {choice}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Question {currentQuestionIndex + 1} of {clarificationQuestions.length}
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={(state) => {
      // Only allow closing if not loading
      if (!isLoading) onOpenChange(state);
    }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isCompleted 
              ? "All Set!" 
              : clarificationQuestions.length === 0 && !isLoading 
                ? "Ready to Generate" 
                : "Quick Clarification"}
          </DialogTitle>
          <DialogDescription>
            {isCompleted 
              ? "Your inputs have been clarified and improved." 
              : clarificationQuestions.length === 0 && !isLoading 
                ? "Your plan is ready to be generated."
                : "Let's clarify a few details to create an even better study plan for you."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {renderDialogContent()}
        </div>
        
        {!isLoading && !isCompleted && clarificationQuestions.length > 0 && (
          <DialogFooter>
            <Button variant="ghost" onClick={handleSkip}>
              Skip Question
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={!canProceed}
            >
              {currentQuestionIndex < clarificationQuestions.length - 1 
                ? "Next Question" 
                : "Finish"}
            </Button>
          </DialogFooter>
        )}
        
        {error && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onProceedWithPlan(planData)}>
              Continue Anyway
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Function to generate AI-powered clarification questions
async function generateAIClarificationQuestions(planData: StudyPlanFormData): Promise<ClarificationQuestion[]> {
  try {
    // Create context for the AI
    const studyContext = {
      courseName: planData.courseName,
      topics: planData.topics,
      examDate: planData.examDate,
      weeklyStudyTime: planData.weeklyStudyTime,
      learningStyle: planData.learningStyle
    };
    
    // Generate AI prompt
    const aiPrompt = `As a study planning assistant, I need to ask the student a few clarifying questions about their study plan for ${planData.courseName}. 
    Based on their information:
    - Topics: ${planData.topics.join(', ')}
    - Exam date: ${planData.examDate}
    - Weekly study time: ${planData.weeklyStudyTime} hours
    - Learning style: ${planData.learningStyle || 'Not specified'}
    
    Generate 2 specific, helpful clarification questions that would improve their study plan. Each question must be relevant to their specific situation.
    
    Format your response as a list like:
    1. [Question text] | [question type: text, long-text, or choice] | [Optional: choice1,choice2,choice3] | [Optional context explaining why this question helps]
    2. [Question text] | [question type: text, long-text, or choice] | [Optional: choice1,choice2,choice3] | [Optional context explaining why this question helps]`;
    
    // Call AI service
    const aiResponse = await handleAIChatQuery(aiPrompt, studyContext);
    
    // Parse response into questions
    const questions: ClarificationQuestion[] = [];
    
    // Extract numbered items from the response
    const items = aiResponse.split(/\d+\./).filter(item => item.trim().length > 0);
    
    items.forEach((item, index) => {
      const parts = item.trim().split('|').map(p => p.trim());
      
      if (parts.length >= 2) {
        const question = parts[0];
        const type = (parts[1].toLowerCase().includes('text') ? 
          (parts[1].toLowerCase().includes('long') ? 'long-text' : 'text') : 
          'choice') as 'text' | 'choice' | 'long-text';
        
        let choices: string[] | undefined;
        if (type === 'choice' && parts[2]) {
          choices = parts[2].split(',').map(c => c.trim());
        }
        
        const context = parts[parts.length - 1];
        
        questions.push({
          id: `ai-question-${index + 1}`,
          question,
          type,
          choices,
          context: context !== question ? context : undefined
        });
      }
    });
    
    return questions;
  } catch (error) {
    console.error("Error generating AI clarification questions:", error);
    return []; // Return empty array if AI fails
  }
}

// Function to analyze plan data and generate clarification questions
async function analyzeStudyPlanData(planData: StudyPlanFormData): Promise<ClarificationQuestion[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const questions: ClarificationQuestion[] = [];
  
  // Check for vague resources
  const vagueResources = planData.resources.filter(resource => 
    typeof resource === 'string' 
      ? isVagueResource(resource)
      : isVagueResource(resource.name)
  );
  
  if (vagueResources.length > 0) {
    const resourceName = typeof vagueResources[0] === 'string' 
      ? vagueResources[0] 
      : vagueResources[0].name;
    
    questions.push({
      id: 'resource-purpose',
      question: `You listed "${resourceName}" as a resource. How do you plan to use this resource?`,
      type: 'choice',
      choices: ['For initial learning', 'For practice and application', 'For review and revision'],
      context: 'This helps us properly schedule this resource at the right points in your study plan.'
    });
  }
  
  // Check if weekly study time seems low relative to topics
  if (planData.topics.length > 5 && planData.weeklyStudyTime < 5) {
    questions.push({
      id: 'time-distribution',
      question: 'You have a lot of topics but limited weekly study time. How would you prefer to allocate time?',
      type: 'choice',
      choices: [
        'Focus intensely on fewer topics each week', 
        'Cover all topics but spend less time on each',
        'Extend the study plan over a longer period',
        'Prioritize certain topics (please specify which ones)'
      ],
      context: 'This helps us create a more realistic and effective schedule.'
    });
  }
  
  // Check if exam date is very close or far away
  const examDate = new Date(planData.examDate);
  const today = new Date();
  const daysUntilExam = Math.max(1, Math.ceil(
    (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  if (daysUntilExam < 7 && planData.topics.length > 3) {
    questions.push({
      id: 'exam-soon',
      question: 'Your exam is less than a week away. What should we prioritize in your plan?',
      type: 'choice',
      choices: [
        'Focus entirely on review of known material', 
        'Prioritize practice tests and sample problems',
        'Focus on specific weak topics (please list them)',
        'Cover everything briefly, even if incomplete'
      ],
      context: 'With limited time, prioritization is essential.'
    });
  }
  
  // Check for any existing progress on topics
  questions.push({
    id: 'topic-progress',
    question: 'Have you already studied any of these topics? If so, which ones and how comfortable are you with them?',
    type: 'long-text',
    context: 'This helps us adjust the time spent on each topic based on your existing knowledge.'
  });
  
  // Return a subset of questions to avoid overwhelming the user
  return shuffleArray(questions).slice(0, 2);
}

// Helper function to check if a resource description is vague
function isVagueResource(resource: string): boolean {
  const vagueTerms = ['textbook', 'website', 'youtube', 'videos', 'guide', 'notes'];
  resource = resource.toLowerCase();
  
  return vagueTerms.some(term => resource.includes(term)) 
    && resource.split(' ').length < 3; // Simple heuristic for vague descriptions
}

// Helper function to apply answers to the plan data
function applyAnswersToPlanData(
  planData: StudyPlanFormData, 
  questions: ClarificationQuestion[]
): StudyPlanFormData {
  // Create a deep copy of the plan data
  const updatedPlanData = JSON.parse(JSON.stringify(planData)) as StudyPlanFormData;
  
  // Initialize topicsProgress if it doesn't exist
  if (!updatedPlanData.topicsProgress) {
    updatedPlanData.topicsProgress = {};
  }
  
  // For each answered question, update the plan data accordingly
  questions.forEach(question => {
    if (!question.answer) return; // Skip unanswered questions
    
    switch (question.id) {
      case 'resource-purpose':
        // Tag resources with their purpose
        const vagueResources = updatedPlanData.resources.filter(resource => 
          typeof resource === 'string' 
            ? isVagueResource(resource)
            : isVagueResource(resource.name)
        );
        
        if (vagueResources.length > 0) {
          const resourceName = typeof vagueResources[0] === 'string' 
            ? vagueResources[0] 
            : vagueResources[0].name;
          
          // Find the resource index
          const resourceIndex = updatedPlanData.resources.findIndex(resource => 
            (typeof resource === 'string' ? resource : resource.name) === resourceName
          );
          
          if (resourceIndex >= 0) {
            // Convert string resources to objects with metadata
            if (typeof updatedPlanData.resources[resourceIndex] === 'string') {
              const resourceName = updatedPlanData.resources[resourceIndex] as string;
              updatedPlanData.resources[resourceIndex] = {
                name: resourceName,
                purpose: question.answer,
                type: getPurposeType(question.answer)
              };
            } else {
              // Add metadata to existing object
              (updatedPlanData.resources[resourceIndex] as any).purpose = question.answer;
              (updatedPlanData.resources[resourceIndex] as any).type = getPurposeType(question.answer);
            }
          }
        }
        break;
        
      case 'time-distribution':
        // Add distribution preference to the plan data
        updatedPlanData.timeDistributionPreference = question.answer;
        break;
        
      case 'exam-soon':
        // Add last-minute priority to the plan data
        updatedPlanData.lastMinutePriority = question.answer;
        break;
        
      case 'topic-progress':
        // Add topic progress notes to the plan data
        updatedPlanData.topicProgressNotes = question.answer;
        
        // Parse the progress notes to extract topic progress percentages
        try {
          const answer = question.answer.toLowerCase();
          
          // Process each topic and check if it's mentioned in the answer
          updatedPlanData.topics.forEach(topic => {
            const topicName = typeof topic === 'string' ? topic : topic.title;
            const topicLower = topicName.toLowerCase();
            
            if (answer.includes(topicLower)) {
              // Try to extract percentage or level
              let progress = 0;
              
              // Check for percentage
              const percentMatch = answer.match(new RegExp(`${topicLower}[^0-9]*(\\d{1,3})%`));
              if (percentMatch && percentMatch[1]) {
                progress = Math.min(100, Math.max(0, parseInt(percentMatch[1])));
              }
              // Check for textual descriptions
              else if (
                answer.includes(`${topicLower} completely`) || 
                answer.includes(`finished ${topicLower}`) || 
                answer.includes(`mastered ${topicLower}`)
              ) {
                progress = 100;
              }
              else if (
                answer.includes(`${topicLower} mostly`) || 
                answer.includes(`almost done with ${topicLower}`) ||
                answer.includes(`${topicLower} very comfortable`)
              ) {
                progress = 80;
              }
              else if (
                answer.includes(`${topicLower} partially`) || 
                answer.includes(`started ${topicLower}`) ||
                answer.includes(`${topicLower} somewhat`)
              ) {
                progress = 40;
              }
              else if (
                answer.includes(`${topicLower} barely`) || 
                answer.includes(`just introduced to ${topicLower}`)
              ) {
                progress = 10;
              }
              
              // Update the progress if we detected something
              if (progress > 0) {
                updatedPlanData.topicsProgress[topicName] = progress;
              }
            }
          });
        } catch (error) {
          console.error("Error parsing topic progress notes:", error);
        }
        break;
        
      // Handle AI-generated questions
      default:
        if (question.id.startsWith('ai-question-')) {
          // Add the response as a general note
          if (!updatedPlanData.notes) {
            updatedPlanData.notes = [];
          }
          updatedPlanData.notes.push({
            question: question.question,
            answer: question.answer
          });
          
          // Check if the answer contains progress information
          const answer = question.answer.toLowerCase();
          if (answer.includes('progress') || answer.includes('complete') || answer.includes('finished') || answer.includes('started')) {
            // Try to extract topic-specific progress information
            updatedPlanData.topics.forEach(topic => {
              const topicName = typeof topic === 'string' ? topic : topic.title;
              const topicLower = topicName.toLowerCase();
              
              if (answer.includes(topicLower)) {
                // Extract progress percentage if mentioned
                const percentMatch = answer.match(new RegExp(`${topicLower}[^0-9]*(\\d{1,3})%`));
                if (percentMatch && percentMatch[1]) {
                  const progress = Math.min(100, Math.max(0, parseInt(percentMatch[1])));
                  updatedPlanData.topicsProgress[topicName] = progress;
                }
              }
            });
          }
        }
        break;
    }
  });
  
  return updatedPlanData;
}

// Helper function to map purpose to resource type
function getPurposeType(purpose: string): string {
  if (purpose.includes('initial learning')) return 'learning';
  if (purpose.includes('practice')) return 'practice';
  if (purpose.includes('review')) return 'review';
  return 'general';
}

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}