import { useState } from "react";
import { useForm } from "react-hook-form";
import { FilePlus, Sparkles, ArrowLeft, ArrowRight, Calendar, Book, Clock, Brain, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import TopicInput from "./TopicInput";
import ResourceInput from "./ResourceInput";
import { AIClarificationDialog } from "./AIClarificationDialog";
import { StudyPlanFormData, Topic, Resource, LearningStyle, StudyMaterial } from "../types";

interface StudyPlanFormProps {
  onSubmit: (data: StudyPlanFormData) => void;
}

export default function StudyPlanForm({ onSubmit }: StudyPlanFormProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedStudyMaterials, setSelectedStudyMaterials] = useState<StudyMaterial[]>([]);
  const [useAIPersonalization, setUseAIPersonalization] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState("");
  const [showAIClarification, setShowAIClarification] = useState(false);
  const [clarificationQuery, setClarificationQuery] = useState("");

  const form = useForm<StudyPlanFormData>({
    defaultValues: {
      courseName: "",
      examDate: "",
      weeklyStudyTime: 5,
      studyPreference: "short",
      topics: [],
      resources: [],
      learningStyle: "visual",
      generateOptions: true,
      progress: "",
    },
  });

  // Define the steps for the wizard
  const steps = [
    { 
      title: "Course Details", 
      description: "Let's start with the basics about your course",
      icon: <Book className="h-5 w-5" />
    },
    { 
      title: "Topics & Resources", 
      description: "What topics will you be studying and what resources do you have?",
      icon: <Brain className="h-5 w-5" />
    },
    {
      title: "Study Preferences",
      description: "Tell us how you prefer to study",
      icon: <Clock className="h-5 w-5" />
    },
    {
      title: "Learning Style",
      description: "How do you learn best?",
      icon: <Sparkles className="h-5 w-5" />
    },
    {
      title: "Current Progress",
      description: "Let us know what you've already completed",
      icon: <CheckCircle className="h-5 w-5" />
    }
  ];
  
  const handleStudyMaterialChange = (value: StudyMaterial, checked: boolean) => {
    if (checked) {
      setSelectedStudyMaterials(prev => [...prev, value]);
    } else {
      setSelectedStudyMaterials(prev => prev.filter(item => item !== value));
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (data: StudyPlanFormData) => {
    // Add topics and resources to form data
    const formData = {
      ...data,
      topics,
      resources,
      studyMaterials: selectedStudyMaterials,
      generateOptions: useAIPersonalization,
      progress: progress,
    };

    if (useAIPersonalization) {
      // Check if AI needs clarification
      const needsClarification = checkIfClarificationNeeded(formData);
      if (needsClarification) {
        setClarificationQuery(generateClarificationQuery(formData));
        setShowAIClarification(true);
        return; // Don't submit yet
      }
    }

    onSubmit(formData);
  };

  const handleAIClarificationComplete = (updatedData) => {
    setShowAIClarification(false);
    // Incorporate clarification answers into the form data
    const formData = {
      ...form.getValues(),
      topics,
      resources,
      studyMaterials: selectedStudyMaterials,
      generateOptions: useAIPersonalization,
      progress: progress,
      ...updatedData // Add the clarified data
    };
    
    onSubmit(formData);
  };
  
  const checkIfClarificationNeeded = (formData: StudyPlanFormData): boolean => {
    // Check if we need AI to clarify anything
    if (!formData.courseName || formData.topics.length === 0) return false;
    
    // Check if the topics seem very general or if there's conflicting information
    if (
      (formData.progress && formData.progress.length > 0) || 
      (formData.topics.length > 0 && formData.resources.length === 0)
    ) {
      return true;
    }
    
    return false;
  };
  
  const generateClarificationQuery = (formData: StudyPlanFormData): string => {
    if (formData.progress && formData.progress.length > 0) {
      return `You mentioned that you've made progress in ${formData.courseName}. Could you clarify which specific topics or units you've completed?`;
    }
    
    if (formData.topics.length > 0 && formData.resources.length === 0) {
      return `For your ${formData.courseName} course, what specific study materials or resources do you have available?`;
    }
    
    return `Could you provide more details about your ${formData.courseName} course to help create a more personalized study plan?`;
  };

  // Calculate progress percentage for the progress bar
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Progress bar */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center ${index <= currentStep ? 'text-primary' : ''}`}
                style={{ width: `${100 / steps.length}%`, justifyContent: 'center' }}
              >
                <div className="hidden sm:block">{step.title}</div>
              </div>
            ))}
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            {steps[currentStep].icon}
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">{steps[currentStep].title}</h3>
              <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
            </div>
          </div>
        </div>

        {/* Step 1: Course Details */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Course Name Field */}
                  <FormField
                    control={form.control}
                    name="courseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., AP Psychology" 
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Exam Date Field */}
                  <FormField
                    control={form.control}
                    name="examDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="date" 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Topics & Resources */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Topics Input */}
                  <TopicInput topics={topics} setTopics={setTopics} />

                  {/* Resources Input */}
                  <ResourceInput resources={resources} setResources={setResources} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Study Preferences */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Weekly Study Time Field */}
                  <FormField
                    control={form.control}
                    name="weeklyStudyTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekly Study Time</FormLabel>
                        <div className="flex items-center">
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="40" 
                              placeholder="e.g., 5" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                            />
                          </FormControl>
                          <span className="ml-2 text-sm text-gray-500">hours/week</span>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Study Preference Field */}
                  <FormField
                    control={form.control}
                    name="studyPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study Session Preference</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div className={`relative flex border rounded-md p-4 cursor-pointer hover:border-primary transition-colors ${field.value === 'short' ? 'border-primary bg-blue-50' : 'border-gray-300'}`}>
                              <div className="flex items-start">
                                <div className="flex items-center h-5">
                                  <RadioGroupItem value="short" id="short-sessions" />
                                </div>
                                <div className="ml-3 text-sm">
                                  <label htmlFor="short-sessions" className="font-medium text-gray-900">Short Bursts</label>
                                  <p className="text-gray-500">Multiple shorter study sessions (20-30 minutes) throughout the week</p>
                                </div>
                              </div>
                            </div>
                            <div className={`relative flex border rounded-md p-4 cursor-pointer hover:border-primary transition-colors ${field.value === 'long' ? 'border-primary bg-blue-50' : 'border-gray-300'}`}>
                              <div className="flex items-start">
                                <div className="flex items-center h-5">
                                  <RadioGroupItem value="long" id="long-sessions" />
                                </div>
                                <div className="ml-3 text-sm">
                                  <label htmlFor="long-sessions" className="font-medium text-gray-900">Long Sessions</label>
                                  <p className="text-gray-500">Fewer, but longer study sessions (1-2 hours) each week</p>
                                </div>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Learning Style */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Learning Style Field */}
                  <FormField
                    control={form.control}
                    name="learningStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Style</FormLabel>
                        <FormDescription>
                          Select the style that best matches how you prefer to learn new material
                        </FormDescription>
                        <div className="space-y-2 mt-2">
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className={`flex items-start space-x-2 p-3 rounded-md ${field.value === 'visual' ? 'bg-blue-50 border border-primary' : ''}`}>
                              <RadioGroupItem value="visual" id="visual" />
                              <div>
                                <label htmlFor="visual" className="font-medium block">Visual Learner</label>
                                <p className="text-sm text-gray-500">You learn best through images, diagrams, and spatial understanding</p>
                              </div>
                            </div>
                            
                            <div className={`flex items-start space-x-2 p-3 rounded-md ${field.value === 'auditory' ? 'bg-blue-50 border border-primary' : ''}`}>
                              <RadioGroupItem value="auditory" id="auditory" />
                              <div>
                                <label htmlFor="auditory" className="font-medium block">Auditory Learner</label>
                                <p className="text-sm text-gray-500">You learn best by listening and discussing material</p>
                              </div>
                            </div>
                            
                            <div className={`flex items-start space-x-2 p-3 rounded-md ${field.value === 'reading' ? 'bg-blue-50 border border-primary' : ''}`}>
                              <RadioGroupItem value="reading" id="reading" />
                              <div>
                                <label htmlFor="reading" className="font-medium block">Reading/Writing Learner</label>
                                <p className="text-sm text-gray-500">You learn best through reading texts and writing notes</p>
                              </div>
                            </div>
                            
                            <div className={`flex items-start space-x-2 p-3 rounded-md ${field.value === 'kinesthetic' ? 'bg-blue-50 border border-primary' : ''}`}>
                              <RadioGroupItem value="kinesthetic" id="kinesthetic" />
                              <div>
                                <label htmlFor="kinesthetic" className="font-medium block">Kinesthetic Learner</label>
                                <p className="text-sm text-gray-500">You learn best through hands-on activities and experiences</p>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Study Materials */}
                  <FormItem>
                    <FormLabel>Preferred Study Materials</FormLabel>
                    <FormDescription>
                      Select the types of materials you'd like to incorporate into your study plan
                    </FormDescription>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="flashcards" 
                          checked={selectedStudyMaterials.includes('flashcards')}
                          onCheckedChange={(checked) => 
                            handleStudyMaterialChange('flashcards', checked as boolean)
                          }
                        />
                        <label htmlFor="flashcards" className="font-medium">Flashcards</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="videos" 
                          checked={selectedStudyMaterials.includes('videos')}
                          onCheckedChange={(checked) => 
                            handleStudyMaterialChange('videos', checked as boolean)
                          }
                        />
                        <label htmlFor="videos" className="font-medium">Video Lectures</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="practice_tests" 
                          checked={selectedStudyMaterials.includes('practice_tests')}
                          onCheckedChange={(checked) => 
                            handleStudyMaterialChange('practice_tests', checked as boolean)
                          }
                        />
                        <label htmlFor="practice_tests" className="font-medium">Practice Tests</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="notes" 
                          checked={selectedStudyMaterials.includes('notes')}
                          onCheckedChange={(checked) => 
                            handleStudyMaterialChange('notes', checked as boolean)
                          }
                        />
                        <label htmlFor="notes" className="font-medium">Note-taking</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="textbooks" 
                          checked={selectedStudyMaterials.includes('textbooks')}
                          onCheckedChange={(checked) => 
                            handleStudyMaterialChange('textbooks', checked as boolean)
                          }
                        />
                        <label htmlFor="textbooks" className="font-medium">Textbook Reading</label>
                      </div>
                    </div>
                  </FormItem>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Current Progress */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <FormLabel htmlFor="progress">Current Progress</FormLabel>
                    <FormDescription className="mb-3">
                      Tell us what you've already completed or what you're familiar with
                    </FormDescription>
                    <Textarea
                      id="progress"
                      placeholder="E.g., 'I've completed units 1-3' or 'I'm 100% done with topics 1, 2, 4'"
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="ai-personalize"
                      checked={useAIPersonalization}
                      onCheckedChange={(checked) => setUseAIPersonalization(checked === true)}
                    />
                    <div>
                      <label
                        htmlFor="ai-personalize"
                        className="font-medium text-sm leading-none"
                      >
                        Apply AI personalization to my study plan
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create a personalized plan that adapts to your learning style and progress
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit">
              <FilePlus className="h-4 w-4 mr-2" />
              Generate Study Plan
            </Button>
          )}
        </div>
      </form>

      {/* AI Clarification Dialog */}
      <AIClarificationDialog
        open={showAIClarification}
        onOpenChange={setShowAIClarification}
        query={clarificationQuery}
        onComplete={handleAIClarificationComplete}
        courseInfo={{
          name: form.getValues().courseName,
          topics: topics
        }}
      />
    </Form>
  );
}
