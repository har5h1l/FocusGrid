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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/study-plans/${task.studyPlanId}/tasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/study-plans/${task.studyPlanId}`] });
      
      queryClient.invalidateQueries({ queryKey: ['/api/study-plans'] });
      
      updateTopicProgress(task);
    }
  });
  
  const updateTopicProgress = (task: StudyTask) => {
    const titleParts = task.title.split(' ');
    if (titleParts.length <= 1) return;
    
    const action = titleParts[0].toLowerCase();
    const topicName = titleParts.slice(1).join(' ');
    
    const cachedPlan = queryClient.getQueryData([`/api/study-plans/${task.studyPlanId}`]);
    if (!cachedPlan) return;
    
    console.log(`Updated progress for topic "${topicName}" in task ${task.id}`);
  };

  const getStatusBadgeClass = () => {
    if (task.isCompleted) {
      return "bg-green-100 text-green-800";
    }
    
    const taskDate = parseISO(task.date);
    const isWeekend = [0, 6].includes(taskDate.getDay());
    
    if (isWeekend) {
      return "bg-yellow-100 text-yellow-800";
    }
    
    return "bg-blue-100 text-blue-800";
  };

  const getStatusText = () => {
    if (task.isCompleted) {
      return "Completed";
    }
    
    const taskDate = parseISO(task.date);
    const isWeekend = [0, 6].includes(taskDate.getDay());
    
    if (isWeekend) {
      return "Weekend";
    }
    
    return "Upcoming";
  };

  return (
    <li className="py-3 flex items-center">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.isCompleted}
        onCheckedChange={(checked) => {
          if (typeof checked === 'boolean') {
            toggleTaskCompletion(checked);
          }
        }}
        disabled={isPending}
      />
      <div className="ml-3 flex-1">
        <p className={`text-sm font-medium text-gray-900 ${task.isCompleted ? 'line-through' : ''}`}>
          {task.title}
        </p>
        <p className="text-xs text-gray-500">
          {task.date ? `${format(parseISO(task.date), 'EEEE, MMMM d')} - ${task.duration} minutes` : 'Date not set'}
        </p>
      </div>
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass()}`}>
        {getStatusText()}
      </span>
    </li>
  );
}
