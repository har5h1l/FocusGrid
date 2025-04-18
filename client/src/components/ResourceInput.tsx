import { useState } from "react";
import { Resource } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

interface ResourceInputProps {
  resources: Resource[];
  setResources: (resources: Resource[]) => void;
}

export default function ResourceInput({ resources, setResources }: ResourceInputProps) {
  const [newResource, setNewResource] = useState("");

  const addResource = () => {
    if (newResource.trim() === "") return;
    
    const resource: Resource = {
      id: uuidv4(),
      name: newResource.trim()
    };
    
    setResources([...resources, resource]);
    setNewResource("");
  };

  const removeResource = (id: string) => {
    setResources(resources.filter(resource => resource.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addResource();
    }
  };

  return (
    <div className="col-span-2 md:col-span-1">
      <label htmlFor="resources" className="block text-sm font-medium text-gray-700 mb-1">
        Learning Resources
      </label>
      <div className="border border-gray-300 rounded-md p-4 mb-2">
        {resources.map((resource) => (
          <div key={resource.id} className="flex items-center mb-2">
            <Input
              type="text"
              className="flex-1 mr-2"
              value={resource.name}
              onChange={(e) => {
                const updatedResources = resources.map(r => 
                  r.id === resource.id ? { ...r, name: e.target.value } : r
                );
                setResources(updatedResources);
              }}
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => removeResource(resource.id)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center">
          <Input
            type="text"
            className="flex-1 mr-2"
            placeholder="e.g., Barron's AP Psychology Book"
            value={newResource}
            onChange={(e) => setNewResource(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button 
            type="button" 
            variant="outline" 
            className="text-primary border-primary hover:bg-blue-50"
            onClick={addResource}
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Resource
          </Button>
        </div>
      </div>
    </div>
  );
}
