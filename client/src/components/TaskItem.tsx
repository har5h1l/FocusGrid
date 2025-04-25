import { StudyTask } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { format, parseISO } from "date-fns";

interface TaskItemProps {
  task: StudyTask;
}

export default function TaskItem({ task }: TaskItemProps) {
  const queryClient = useQueryClient();
  
  const { mutate: toggleTaskCompletion, isPending } = useMutation({
    mutationFn: async (isCompleted: boolean) => {
      const response = await apiRequest('PATCH', `/api/study-tasks/${task.id}/complete`, { 
        isCompleted 
      });
      return response.json();
    },
    onSuccess: (data, isCompleted) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/study-plans/${task.studyPlanId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/study-plans/${task.studyPlanId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/study-plans'] });
      
      // Update topic progress
      updateTopicProgress(task, isCompleted);
    }
  });
  
  const updateTopicProgress = (task: StudyTask, isCompleted: boolean) => {
    // Extract topic name from the task title
    let topicName = extractTopicFromTitle(task.title);
    if (!topicName) return;
    
    // Get current study plan data
    const cachedPlan = queryClient.getQueryData([`/api/study-plans/${task.studyPlanId}`]);
    if (!cachedPlan || !cachedPlan.studyPlan) return;
    
    const { studyPlan } = cachedPlan;
    
    // Calculate progress updates based on task type
    let progressChange = 0;
    switch (task.taskType) {
      case 'study':
        progressChange = isCompleted ? 50 : -50; // Study tasks contribute 50% to topic completion
        break;
      case 'practice':
        progressChange = isCompleted ? 25 : -25; // Practice tasks contribute 25%
        break;
      case 'review':
        progressChange = isCompleted ? 25 : -25; // Review tasks contribute 25%
        break;
      default:
        progressChange = isCompleted ? 30 : -30; // Default contribution
    }
    
    // Find the exact topic that matches or contains our topic name
    const exactMatch = Object.keys(studyPlan.topicsProgress).find(
      t => t.toLowerCase() === topicName.toLowerCase()
    );
    
    if (exactMatch) {
      topicName = exactMatch;
    } else {
      // Try to find a partial match
      const partialMatch = Object.keys(studyPlan.topicsProgress).find(
        t => t.toLowerCase().includes(topicName.toLowerCase()) || 
             topicName.toLowerCase().includes(t.toLowerCase())
      );
      
      if (partialMatch) {
        topicName = partialMatch;
      } else {
        // If we can't find a match, check if this is a general review/practice
        if (task.title.toLowerCase().includes('all topics') || 
            task.title.toLowerCase().includes('final review') ||
            task.title.toLowerCase().includes('practice exam')) {
          
          // Update all topics with a smaller increment
          const smallIncrement = isCompleted ? 10 : -10;
          Object.keys(studyPlan.topicsProgress).forEach(topic => {
            const newProgress = Math.min(100, Math.max(0, studyPlan.topicsProgress[topic] + smallIncrement));
            studyPlan.topicsProgress[topic] = newProgress;
          });
          
          // Update the cached plan data
          queryClient.setQueryData([`/api/study-plans/${task.studyPlanId}`], cachedPlan);
          
          // Also update the server
          updateServerProgress(task.studyPlanId, studyPlan.topicsProgress);
          return;
        }
        return; // No matching topic found
      }
    }
    
    // Update the progress for the topic
    const currentProgress = studyPlan.topicsProgress[topicName] || 0;
    const newProgress = Math.min(100, Math.max(0, currentProgress + progressChange));
    
    // Only update if progress has changed
    if (currentProgress !== newProgress) {
      studyPlan.topicsProgress[topicName] = newProgress;
      
      // Update the cached plan data
      queryClient.setQueryData([`/api/study-plans/${task.studyPlanId}`], cachedPlan);
      
      // Also update the server
      updateServerProgress(task.studyPlanId, studyPlan.topicsProgress);
      
      console.log(`Updated progress for topic "${topicName}" from ${currentProgress}% to ${newProgress}%`);
    }
  };
  
  // Extract the actual topic from the task title
  const extractTopicFromTitle = (title: string): string | null => {
    // Common patterns in task titles
    const patterns = [
      // "Study [Topic]"
      /^(Study|Learn|Read|Watch|Listen to)\s+(.+)$/i,
      
      // "Review [Topic]"
      /^(Review|Revisit|Reflect on)\s+(.+)$/i,
      
      // "Practice [Topic]"
      /^(Practice|Apply|Test|Quiz)\s+(.+)$/i,
      
      // "[Topic] - Complete"
      /^(.+)\s+-\s+Completed?$/i,
      
      // "Quick Review: [Topic]"
      /^Quick\s+Review:\s+(.+)$/i
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[2]) {
        return match[2].trim();
      } else if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no pattern matches, split by common separators and take what's likely the topic
    const parts = title.split(/[\s\-:]+/);
    if (parts.length > 1) {
      // Skip common action words at the beginning
      const skipWords = ['study', 'practice', 'review', 'final', 'quick'];
      let startIndex = 0;
      while (startIndex < parts.length && skipWords.includes(parts[startIndex].toLowerCase())) {
        startIndex++;
      }
      
      if (startIndex < parts.length) {
        return parts.slice(startIndex).join(' ');
      }
    }
    
    return null;
  };
  
  // Update the server with new progress data
  const updateServerProgress = async (planId: number, topicsProgress: Record<string, number>) => {
    try {
      await apiRequest('PATCH', `/api/study-plans/${planId}/progress`, { 
        topicsProgress 
      });
    } catch (error) {
      console.error('Failed to update topic progress on server:', error);
    }
  };

  const getStatusBadgeClass = () => {
    if (task.isCompleted) {
      return "bg-green-100 text-green-800";
    }
    
    const today = new Date();
    const taskDate = parseISO(task.date);
    const isToday = today.toDateString() === taskDate.toDateString();
    const isPast = taskDate < today && !isToday;
    const isWeekend = [0, 6].includes(taskDate.getDay());
    
    if (isPast) {
      return "bg-red-100 text-red-800";
    }
    
    if (isToday) {
      return "bg-purple-100 text-purple-800";
    }
    
    if (isWeekend) {
      return "bg-yellow-100 text-yellow-800";
    }
    
    return "bg-blue-100 text-blue-800";
  };

  const getStatusText = () => {
    if (task.isCompleted) {
      return "Completed";
    }
    
    const today = new Date();
    const taskDate = parseISO(task.date);
    const isToday = today.toDateString() === taskDate.toDateString();
    const isPast = taskDate < today && !isToday;
    const isWeekend = [0, 6].includes(taskDate.getDay());
    
    if (isPast) {
      return "Overdue";
    }
    
    if (isToday) {
      return "Today";
    }
    
    if (isWeekend) {
      return "Weekend";
    }
    
    return "Upcoming";
  };
  
  const taskTypeIcon = () => {
    switch (task.taskType) {
      case 'study':
        return '📚';
      case 'practice':
        return '✏️';
      case 'review':
        return '🔄';
      default:
        return '📝';
    }
  };

  return (
    <li className="py-3 flex items-center border-b border-gray-100">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.isCompleted}
        onCheckedChange={(checked) => {
          if (typeof checked === 'boolean') {
            toggleTaskCompletion(checked);
          }
        }}
        disabled={isPending}
        className="h-5 w-5"
      />
      <div className="ml-3 flex-1">
        <p className={`text-sm font-medium text-gray-900 ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
          <span className="mr-2">{taskTypeIcon()}</span>
          {task.title}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs text-gray-500">
          <span>{task.date ? format(parseISO(task.date), 'EEEE, MMMM d') : 'Date not set'}</span>
          <span className="hidden sm:inline">•</span>
          <span>{task.duration} minutes</span>
          {task.resource && (
            <>
              <span className="hidden sm:inline">•</span>
              <span>Resource: {task.resource}</span>
            </>
          )}
        </div>
        {task.description && (
          <p className="mt-1 text-xs text-gray-500 italic">{task.description}</p>
        )}
      </div>
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass()}`}>
        {getStatusText()}
      </span>
    </li>
  );
}
