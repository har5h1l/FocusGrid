import { useState } from "react";
import { useAIRefinement } from "@/hooks/useAIRefinement";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GeneratedPlan } from "@/types";
import { Loader2 } from "lucide-react";

interface AIRefinementDialogProps {
  studyPlan: GeneratedPlan;
  onRefinementComplete: (refinedPlan: GeneratedPlan) => void;
}

export default function AIRefinementDialog({ 
  studyPlan, 
  onRefinementComplete 
}: AIRefinementDialogProps) {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState("");
  const [stressLevel, setStressLevel] = useState<"low" | "medium" | "high">("medium");
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [strongTopics, setStrongTopics] = useState<string[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  
  const { refinePlan, isRefining, error } = useAIRefinement();
  
  const topics = studyPlan.studyPlan.topics || [];
  
  const studyTechniques = [
    { id: "spaced-repetition", label: "Spaced Repetition" },
    { id: "active-recall", label: "Active Recall" },
    { id: "pomodoro", label: "Pomodoro Technique" },
    { id: "mind-mapping", label: "Mind Mapping" },
    { id: "feynman", label: "Feynman Technique" },
  ];
  
  const handleStrongTopicToggle = (topic: string) => {
    // Remove from weak topics if it's there
    if (weakTopics.includes(topic)) {
      setWeakTopics(weakTopics.filter(t => t !== topic));
    }
    
    // Toggle in strong topics
    if (strongTopics.includes(topic)) {
      setStrongTopics(strongTopics.filter(t => t !== topic));
    } else {
      setStrongTopics([...strongTopics, topic]);
    }
  };
  
  const handleWeakTopicToggle = (topic: string) => {
    // Remove from strong topics if it's there
    if (strongTopics.includes(topic)) {
      setStrongTopics(strongTopics.filter(t => t !== topic));
    }
    
    // Toggle in weak topics
    if (weakTopics.includes(topic)) {
      setWeakTopics(weakTopics.filter(t => t !== topic));
    } else {
      setWeakTopics([...weakTopics, topic]);
    }
  };
  
  const handleTechniqueToggle = (techniqueId: string) => {
    if (selectedTechniques.includes(techniqueId)) {
      setSelectedTechniques(selectedTechniques.filter(t => t !== techniqueId));
    } else {
      setSelectedTechniques([...selectedTechniques, techniqueId]);
    }
  };
  
  const handleRefinePlan = async () => {
    try {
      const refinedPlan = await refinePlan(studyPlan, {
        goals,
        strongestTopics: strongTopics,
        weakestTopics: weakTopics,
        stressLevel,
        preferredTechniques: selectedTechniques,
      });
      
      onRefinementComplete(refinedPlan);
      setOpen(false);
    } catch (err) {
      console.error("Failed to refine plan:", err);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Refine Plan with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalize Your Study Plan with AI</DialogTitle>
          <DialogDescription>
            Tell us more about your preferences and goals, and our AI will customize your study plan to match your learning style.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goals">What are your goals for this course?</Label>
            <Textarea
              id="goals"
              placeholder="e.g., Pass with an A, Understand core concepts, Master specific topics..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label>How would you rate your current stress level?</Label>
            <Select 
              value={stressLevel} 
              onValueChange={(value) => setStressLevel(value as "low" | "medium" | "high")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stress level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - I'm handling things well</SelectItem>
                <SelectItem value="medium">Medium - Somewhat stressed</SelectItem>
                <SelectItem value="high">High - Very stressed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Which study techniques do you prefer?</Label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {studyTechniques.map((technique) => (
                <div key={technique.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={technique.id}
                    checked={selectedTechniques.includes(technique.id)}
                    onCheckedChange={() => handleTechniqueToggle(technique.id)}
                  />
                  <label 
                    htmlFor={technique.id}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {technique.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <Label>Select your strongest and weakest topics</Label>
            <p className="text-sm text-gray-500 mb-2">
              This helps the AI prioritize topics that need more attention.
            </p>
            
            <div className="space-y-2 border rounded-md p-4">
              {topics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                  <span className="text-sm font-medium">{topic}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Checkbox 
                        id={`strong-${index}`}
                        checked={strongTopics.includes(topic)}
                        onCheckedChange={() => handleStrongTopicToggle(topic)}
                      />
                      <label 
                        htmlFor={`strong-${index}`}
                        className="text-xs text-green-600"
                      >
                        Strong
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Checkbox 
                        id={`weak-${index}`}
                        checked={weakTopics.includes(topic)}
                        onCheckedChange={() => handleWeakTopicToggle(topic)}
                      />
                      <label 
                        htmlFor={`weak-${index}`}
                        className="text-xs text-amber-600"
                      >
                        Needs Work
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {error && (
            <div className="text-sm text-red-500 p-2 border border-red-200 rounded bg-red-50">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRefinePlan} disabled={isRefining}>
            {isRefining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refining...
              </>
            ) : (
              "Refine Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 