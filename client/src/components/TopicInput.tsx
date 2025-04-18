import { useState } from "react";
import { Topic } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Target } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { v4 as uuidv4 } from 'uuid';

interface TopicInputProps {
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
}

export default function TopicInput({ topics, setTopics }: TopicInputProps) {
  const [newTopic, setNewTopic] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  const addTopic = () => {
    if (newTopic.trim() === "") return;
    
    const topic: Topic = {
      id: uuidv4(),
      title: newTopic.trim(),
      progress: 0 // Default to 0% progress
    };
    
    setTopics([...topics, topic]);
    setNewTopic("");
  };

  const removeTopic = (id: string) => {
    setTopics(topics.filter(topic => topic.id !== id));
  };

  const updateTopicProgress = (id: string, progress: number) => {
    const updatedTopics = topics.map(t => 
      t.id === id ? { ...t, progress } : t
    );
    setTopics(updatedTopics);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopic();
    }
  };

  return (
    <div className="col-span-2">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="topics" className="block text-sm font-medium text-gray-700">
          Study Topics
        </label>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm"
          className="text-primary hover:text-primary-dark"
          onClick={() => setShowProgress(!showProgress)}
        >
          <Target className="h-4 w-4 mr-1" />
          {showProgress ? "Hide Progress" : "Track Progress"}
        </Button>
      </div>
      <div className="border border-gray-300 rounded-md p-4 mb-2">
        {topics.map((topic) => (
          <div key={topic.id} className="mb-4">
            <div className="flex items-center mb-1">
              <Input
                type="text"
                className="flex-1 mr-2"
                value={topic.title}
                onChange={(e) => {
                  const updatedTopics = topics.map(t => 
                    t.id === topic.id ? { ...t, title: e.target.value } : t
                  );
                  setTopics(updatedTopics);
                }}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeTopic(topic.id)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
            
            {showProgress && (
              <div className="pl-2 pr-10">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Progress: {topic.progress || 0}%</label>
                </div>
                <Slider
                  value={[topic.progress || 0]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(values) => updateTopicProgress(topic.id, values[0])}
                  className="py-2"
                />
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <Input
            type="text"
            className="flex-1 mr-2"
            placeholder="e.g., Unit 1: History of Psychology"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button 
            type="button" 
            variant="outline" 
            className="text-primary border-primary hover:bg-blue-50"
            onClick={addTopic}
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Topic
          </Button>
        </div>
      </div>
    </div>
  );
}
