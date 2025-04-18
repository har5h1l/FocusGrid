import { useState } from "react";
import { useForm } from "react-hook-form";
import { FilePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopicInput from "./TopicInput";
import ResourceInput from "./ResourceInput";
import { StudyPlanFormData, Topic, Resource, LearningStyle, StudyMaterial } from "../types";

interface StudyPlanFormProps {
  onSubmit: (data: StudyPlanFormData) => void;
}

export default function StudyPlanForm({ onSubmit }: StudyPlanFormProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedStudyMaterials, setSelectedStudyMaterials] = useState<StudyMaterial[]>([]);

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
    },
  });

  const handleStudyMaterialChange = (value: StudyMaterial, checked: boolean) => {
    if (checked) {
      setSelectedStudyMaterials(prev => [...prev, value]);
    } else {
      setSelectedStudyMaterials(prev => prev.filter(item => item !== value));
    }
  };

  const handleSubmit = (data: StudyPlanFormData) => {
    // Add topics and resources to form data
    const formData = {
      ...data,
      topics,
      resources,
      studyMaterials: selectedStudyMaterials,
    };

    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="basic" className="flex-1">Basic Information</TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">Advanced Options</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
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
                      <Input 
                        type="date" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Topics Input */}
              <TopicInput topics={topics} setTopics={setTopics} />

              {/* Resources Input */}
              <ResourceInput resources={resources} setResources={setResources} />

              {/* Weekly Study Time Field */}
              <FormField
                control={form.control}
                name="weeklyStudyTime"
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-1">
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
                  <FormItem className="col-span-2">
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
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 mb-4 flex items-start">
              <Sparkles className="h-5 w-5 text-primary mr-2 mt-0.5" />
              <p className="text-sm text-gray-700">
                Customize your study plan with these advanced options to better match your learning style and preferences.
              </p>
            </div>
            
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
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="visual" id="visual" />
                          <label htmlFor="visual" className="font-medium">Visual</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="auditory" id="auditory" />
                          <label htmlFor="auditory" className="font-medium">Auditory</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="reading" id="reading" />
                          <label htmlFor="reading" className="font-medium">Reading/Writing</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="kinesthetic" id="kinesthetic" />
                          <label htmlFor="kinesthetic" className="font-medium">Kinesthetic/Hands-on</label>
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
              
              {/* Generate Options Field */}
              <FormField
                control={form.control}
                name="generateOptions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Generate multiple schedule options
                      </FormLabel>
                      <FormDescription>
                        Create different scheduling options so you can choose the one that works best for you
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-center">
          <Button
            type="submit"
            className="inline-flex items-center px-6 py-6"
          >
            <FilePlus className="h-5 w-5 mr-2" />
            Generate Study Plan
          </Button>
        </div>
      </form>
    </Form>
  );
}
