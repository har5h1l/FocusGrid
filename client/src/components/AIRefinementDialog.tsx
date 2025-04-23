import { useState } from "react";
import { useAIRefinement } from "@/hooks/useAIRefinement";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GeneratedPlan } from "@/types";
import { Loader2, Wand2 } from "lucide-react";

interface AIRefinementDialogProps {
  studyPlan: GeneratedPlan;
  onRefinementComplete: (refinedPlan: GeneratedPlan) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AIRefinementDialog({ 
  studyPlan, 
  onRefinementComplete,
  open,
  onOpenChange
}: AIRefinementDialogProps) {
  const [goals, setGoals] = useState("");
  const [stressLevel, setStressLevel] = useState<"low" | "medium" | "high">("medium");
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [strongTopics, setStrongTopics] = useState<string[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [customRequest, setCustomRequest] = useState("");
  
  const { refinePlan, isRefining, error } = useAIRefinement();
  
  const topics = studyPlan.studyPlan.topics || [];
  
  const studyTechniques = [
    { id: "spaced-repetition", label: "Spaced Repetition" },
    { id: "active-recall", label: "Active Recall" },
    { id: "pomodoro", label: "Pomodoro Technique" },
    { id: "mind-mapping", label: "Mind Mapping" },
    { id: "feynman", label: "Feynman Technique" },
  ];
  
  const presetRefinements = [
    { id: "more-practice", label: "Add more practice tests/questions", request: "Increase the frequency of practice tests and add more practice question sessions, especially for weaker topics."}, 
    { id: "less-intense", label: "Make the schedule less intense", request: "Reduce the overall workload slightly, perhaps by shortening some sessions or adding more buffer time. Focus on efficiency."}, 
    { id: "more-visual", label: "More visual learning (diagrams, videos)", request: "Incorporate more activities suitable for visual learners, such as creating diagrams/mind maps and watching relevant videos."}, 
    { id: "more-reading", label: "More reading/writing tasks", request: "Shift the balance towards more reading assignments, note-taking, and summary writing, suitable for reading/writing learners."}, 
    { id: "focus-weak", label: "Focus more on weak topics", request: "Reallocate study time to give significantly more focus to the topics identified as weak."}, 
  ];

  const handleStrongTopicToggle = (topic: string) => {
    if (weakTopics.includes(topic)) {
      setWeakTopics(weakTopics.filter(t => t !== topic));
    }
    
    if (strongTopics.includes(topic)) {
      setStrongTopics(strongTopics.filter(t => t !== topic));
    } else {
      setStrongTopics([...strongTopics, topic]);
    }
  };
  
  const handleWeakTopicToggle = (topic: string) => {
    if (strongTopics.includes(topic)) {
      setStrongTopics(strongTopics.filter(t => t !== topic));
    }
    
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
  
  const handleRefinePlan = async (presetRequest?: string) => {
    try {
      const refinementOptions = {
        goals: presetRequest || customRequest || goals,
        strongestTopics: strongTopics,
        weakestTopics: weakTopics,
        stressLevel,
        preferredTechniques: selectedTechniques,
        originalPlanData: studyPlan.studyPlan 
      };
      
      const refinedPlan = await refinePlan(studyPlan, refinementOptions);
      
      onRefinementComplete(refinedPlan);
    } catch (err) {
      console.error("Failed to refine plan:", err);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refine Your Study Plan with AI</DialogTitle>
          <DialogDescription>
            Select a preset or provide custom input to make substantial changes to your plan. Each refinement creates a new version with visible changes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label>Quick Refinements</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {presetRefinements.map((preset) => (
                <Button 
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-2" 
                  onClick={() => handleRefinePlan(preset.request)} 
                  disabled={isRefining}
                >
                  <Wand2 className="h-4 w-4 mr-2 flex-shrink-0"/>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="custom-request">Or, describe your desired change:</Label>
            <Textarea
              id="custom-request"
              placeholder="e.g., 'Focus more on chapters 5-7', 'Add a review day mid-week', 'Incorporate more Khan Academy videos'..."
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-gray-500">
              The AI will make substantial changes to your plan based on your input. Be specific about what you want to change.
            </p>
          </div>

          <details className="space-y-4 border p-4 rounded-md">
            <summary className="cursor-pointer text-sm font-medium">Optional: Add More Context (Goals, Stress, Topics...)</summary>
            
            <div className="grid gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="goals">What are your updated goals?</Label>
                <Input
                  id="goals"
                  placeholder="e.g., Pass with an A, Master specific topics..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Current stress level?</Label>
                <Select 
                  value={stressLevel} 
                  onValueChange={(value) => setStressLevel(value as "low" | "medium" | "high")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stress level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Preferred study techniques?</Label>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {studyTechniques.map((technique) => (
                    <div key={technique.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`refine-${technique.id}`}
                        checked={selectedTechniques.includes(technique.id)}
                        onCheckedChange={() => handleTechniqueToggle(technique.id)}
                      />
                      <label 
                        htmlFor={`refine-${technique.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {technique.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label>Update strongest/weakest topics?</Label>
                <div className="space-y-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                  {topics.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                      <span className="text-sm font-medium truncate pr-2">{topic}</span>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <div className="flex items-center space-x-1">
                          <Checkbox 
                            id={`refine-strong-${index}`}
                            checked={strongTopics.includes(topic)}
                            onCheckedChange={() => handleStrongTopicToggle(topic)}
                          />
                          <label htmlFor={`refine-strong-${index}`} className="text-xs text-green-600">Strong</label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox 
                            id={`refine-weak-${index}`}
                            checked={weakTopics.includes(topic)}
                            onCheckedChange={() => handleWeakTopicToggle(topic)}
                          />
                          <label htmlFor={`refine-weak-${index}`} className="text-xs text-amber-600">Weak</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
          
          {error && (
            <div className="text-sm text-red-500 p-2 border border-red-200 rounded bg-red-50">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRefining}>
            Cancel
          </Button>
          <Button onClick={() => handleRefinePlan()} disabled={isRefining || (!customRequest && !goals && strongTopics.length === 0 && weakTopics.length === 0)}>
            {isRefining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refining...
              </>
            ) : (
              "Refine with Custom Input"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 