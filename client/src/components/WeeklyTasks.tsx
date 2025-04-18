import { StudyTask } from "../types";
import TaskItem from "./TaskItem";

interface WeeklyTasksProps {
  tasks: StudyTask[];
}

export default function WeeklyTasks({ tasks }: WeeklyTasksProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">This Week's Tasks</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        {tasks.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No tasks scheduled for this week.</p>
        )}
      </div>
    </div>
  );
}
