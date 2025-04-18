export interface Topic {
  id: string;
  title: string;
  progress?: number; // 0-100 percentage of completion
}

export interface Resource {
  id: string;
  name: string;
}

export interface TopicProgress {
  topicId: string;
  progress: number; // 0-100 percentage
}

export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic';
export type StudyMaterial = 'flashcards' | 'videos' | 'practice_tests' | 'notes' | 'textbooks';

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}

export interface StudyPlanFormData {
  courseName: string;
  examDate: string;
  topics: Topic[];
  resources: Resource[];
  weeklyStudyTime: number;
  studyPreference: 'short' | 'long';
  learningStyle?: LearningStyle;
  studyMaterials?: StudyMaterial[];
  topicProgress?: Record<string, number>; // topicId -> progress percentage
  generateOptions?: boolean; // Whether to generate multiple schedule options
  calendarEvents?: CalendarEvent[]; // Existing calendar commitments to work around
}

export interface StudyTask {
  id: number;
  studyPlanId: number;
  title: string;
  description?: string;
  date: string;
  duration: number; // in minutes
  resource?: string;
  isCompleted: boolean;
  taskType: 'study' | 'review' | 'practice';
}

export interface WeekTask {
  title: string;
  duration: number;
  resource: string;
  type: 'study' | 'review' | 'practice';
}

export interface WeekData {
  weekRange: string;
  monday?: WeekTask;
  wednesday?: WeekTask;
  friday?: WeekTask;
  weekend?: WeekTask;
}

export interface StudyPlan {
  id: number;
  userId?: number;
  courseName: string;
  examDate: string;
  weeklyStudyTime: number;
  studyPreference: 'short' | 'long';
  learningStyle?: LearningStyle;
  studyMaterials?: StudyMaterial[];
  topics: string[];
  topicsProgress?: Record<string, number>; // topic name -> progress percentage
  resources: string[];
  selectedSchedule?: number;
  createdAt: string;
}

export interface GeneratedPlan {
  studyPlan: StudyPlan;
  calendarWeeks: WeekData[];
  weeklyTasks: StudyTask[];
}
