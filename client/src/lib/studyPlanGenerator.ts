import { addDays, addWeeks, format, parseISO, differenceInWeeks } from "date-fns";
import { StudyPlanFormData, StudyTask, WeekData, GeneratedPlan, Topic } from "../types";

export function generateStudyPlan(formData: StudyPlanFormData): GeneratedPlan | GeneratedPlan[] {
  // If generate options is enabled, create multiple plans
  if (formData.generateOptions) {
    return generateMultipleOptions(formData);
  }
  const { courseName, examDate, topics, resources, weeklyStudyTime, studyPreference, learningStyle, studyMaterials } = formData;
  
  const examDateObj = parseISO(examDate);
  const today = new Date();
  
  // Calculate weeks until exam
  const weeksUntilExam = Math.max(1, differenceInWeeks(examDateObj, today));
  
  // Reserve the last 1-2 weeks for final review and practice tests
  const reviewWeeks = weeksUntilExam > 4 ? 2 : 1;
  const studyWeeks = weeksUntilExam - reviewWeeks;
  
  // Sort topics by progress (lowest first) to prioritize less-studied topics
  const sortedTopics = [...topics].sort((a, b) => (a.progress || 0) - (b.progress || 0));
  
  // Calculate how many topics we need to thoroughly study vs. just review
  // Topics with progress > 70% only need review
  const topicsNeedingFullStudy = sortedTopics.filter(t => (t.progress || 0) < 70);
  const topicsForReview = sortedTopics.filter(t => (t.progress || 0) >= 70);
  
  // Determine session duration based on preference
  const sessionCount = studyPreference === 'short' ? 4 : 2; // per week (Mon, Wed, Fri, Weekend vs. Mon, Fri)
  const sessionDuration = Math.floor((weeklyStudyTime * 60) / sessionCount); // in minutes
  
  // Generate calendar weeks
  const calendarWeeks: WeekData[] = [];
  const weeklyTasks: StudyTask[] = [];
  let taskId = 1;
  
  // Create a mapping of task types to study materials if provided
  const materialsByTaskType: Record<string, string[]> = {
    'study': ['textbooks', 'videos', 'notes'],
    'review': ['flashcards', 'notes'],
    'practice': ['practice_tests']
  };
  
  // Filter based on user preferences if provided
  if (studyMaterials && studyMaterials.length > 0) {
    Object.keys(materialsByTaskType).forEach(taskType => {
      materialsByTaskType[taskType] = materialsByTaskType[taskType].filter(m => 
        studyMaterials.includes(m as any)
      );
      // If nothing's left after filtering, keep the original
      if (materialsByTaskType[taskType].length === 0) {
        materialsByTaskType[taskType] = ['textbooks', 'notes'];
      }
    });
  }

  // Distribute topics across available weeks - make sure ALL topics are covered
  // Create a simple distribution of topics across all available study weeks
  const allTopics = [...topicsNeedingFullStudy];
  let weekTopicAssignments: Topic[][] = [];
  
  // Create week assignments - ensure all topics are assigned to at least one week
  for (let i = 0; i < studyWeeks; i++) {
    weekTopicAssignments[i] = [];
  }
  
  // Assign each topic to at least one week
  for (let i = 0; i < allTopics.length; i++) {
    const weekIndex = i % studyWeeks;
    weekTopicAssignments[weekIndex].push(allTopics[i]);
  }
  
  // Now process each week with its assigned topics
  for (let weekIndex = 0; weekIndex < studyWeeks; weekIndex++) {
    const weekTopics = weekTopicAssignments[weekIndex];
    
    // Skip empty weeks
    if (weekTopics.length === 0) continue;
    
    const weekStart = addWeeks(today, weekIndex);
    const weekEnd = addDays(weekStart, 6);
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
    
    // Select resources
    const primaryResource = resources.length > 0 ? resources[0].name : "Textbook";
    const secondaryResource = resources.length > 1 ? resources[1].name : "Notes";
    
    // Create week structure based on assigned topics
    const weekData: WeekData = {
      weekRange,
      monday: weekTopics[0] ? {
        title: weekTopics[0].title,
        duration: sessionDuration,
        resource: primaryResource,
        type: 'study'
      } : undefined,
      wednesday: studyPreference === 'short' ? (weekTopics[1] || weekTopics[0]) ? {
        title: (weekTopics[1] || weekTopics[0]).title,
        duration: sessionDuration,
        resource: secondaryResource,
        type: 'study'
      } : undefined : undefined,
      friday: weekTopics[0] ? {
        title: `${weekTopics[0].title} Review`,
        duration: sessionDuration,
        resource: 'Practice Quiz',
        type: 'review'
      } : undefined,
      weekend: weekTopics.length > 1 ? {
        title: `${weekTopics[1] ? weekTopics[1].title : weekTopics[0].title} Practice`,
        duration: sessionDuration * 2,
        resource: 'Practice Problems',
        type: 'practice'
      } : undefined
    };
    
    calendarWeeks.push(weekData);
    
    // Create tasks for this week
    if (weekData.monday) {
      const topic = weekTopics[0];
      const description = getTaskDescription(topic, 'study', learningStyle);
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: `${weekData.monday.title} - Initial Study`,
        description,
        date: format(addDays(weekStart, 1), 'yyyy-MM-dd'), // Monday
        duration: weekData.monday.duration,
        resource: weekData.monday.resource,
        isCompleted: false,
        taskType: 'study'
      });
    }
    
    if (weekData.wednesday) {
      const topic = weekTopics[1] || weekTopics[0];
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: `${weekData.wednesday.title} - Continue`,
        description: `Continue studying ${topic.title} using ${weekData.wednesday.resource}`,
        date: format(addDays(weekStart, 3), 'yyyy-MM-dd'), // Wednesday
        duration: weekData.wednesday.duration,
        resource: weekData.wednesday.resource,
        isCompleted: false,
        taskType: 'study'
      });
    }
    
    if (weekData.friday) {
      const topic = weekTopics[0];
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: weekData.friday.title,
        description: `Review what you've learned about ${topic.title}`,
        date: format(addDays(weekStart, 5), 'yyyy-MM-dd'), // Friday
        duration: weekData.friday.duration,
        resource: weekData.friday.resource,
        isCompleted: false,
        taskType: 'review'
      });
    }
    
    if (weekData.weekend) {
      const topic = weekTopics[1] || weekTopics[0];
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: weekData.weekend.title,
        description: `Practice applying concepts from ${topic.title}`,
        date: format(addDays(weekStart, 6), 'yyyy-MM-dd'), // Saturday
        duration: weekData.weekend.duration,
        resource: weekData.weekend.resource,
        isCompleted: false,
        taskType: 'practice'
      });
    }
  }
  
  // Add quick review sessions for topics with high progress
  if (topicsForReview.length > 0) {
    // Find a week where we can add review
    const reviewWeekIndex = Math.min(studyWeeks - 1, calendarWeeks.length - 1);
    const reviewWeekStart = addWeeks(today, reviewWeekIndex);
    
    topicsForReview.forEach((topic, index) => {
      // Add one review task for each mostly-completed topic
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: `Quick Review: ${topic.title}`,
        description: `Brief review of ${topic.title} to reinforce your knowledge`,
        date: format(addDays(reviewWeekStart, (index % 6) + 1), 'yyyy-MM-dd'),
        duration: 30, // Short review session
        resource: 'Review Materials',
        isCompleted: false,
        taskType: 'review'
      });
    });
  }
  
  // Add review weeks
  const reviewStart = addWeeks(today, studyWeeks);
  const reviewEnd = addDays(reviewStart, 6);
  const reviewWeekRange = `${format(reviewStart, 'MMM d')} - ${format(reviewEnd, 'MMM d')}`;
  
  // Final review week
  const reviewWeekData: WeekData = {
    weekRange: reviewWeekRange,
    monday: {
      title: 'Final Review: All Topics',
      duration: 60,
      resource: 'Comprehensive',
      type: 'review'
    },
    wednesday: {
      title: 'Final Review: Practice Test',
      duration: 60,
      resource: 'Multiple Choice',
      type: 'practice'
    },
    friday: {
      title: 'Final Review: Weak Areas',
      duration: 60,
      resource: 'Targeted Review',
      type: 'review'
    },
    weekend: {
      title: 'Full Practice Exam',
      duration: 180,
      resource: 'Timed Test',
      type: 'practice'
    }
  };
  
  calendarWeeks.push(reviewWeekData);
  
  // Create tasks for review week
  weeklyTasks.push({
    id: taskId++,
    studyPlanId: 1,
    title: reviewWeekData.monday!.title,
    description: 'Review all material covered in the course',
    date: format(addDays(reviewStart, 1), 'yyyy-MM-dd'), // Monday
    duration: reviewWeekData.monday!.duration,
    resource: reviewWeekData.monday!.resource,
    isCompleted: false,
    taskType: 'review'
  });
  
  weeklyTasks.push({
    id: taskId++,
    studyPlanId: 1,
    title: reviewWeekData.wednesday!.title,
    description: 'Take a practice test to assess your knowledge',
    date: format(addDays(reviewStart, 3), 'yyyy-MM-dd'), // Wednesday
    duration: reviewWeekData.wednesday!.duration,
    resource: reviewWeekData.wednesday!.resource,
    isCompleted: false,
    taskType: 'practice'
  });
  
  weeklyTasks.push({
    id: taskId++,
    studyPlanId: 1,
    title: reviewWeekData.friday!.title,
    description: 'Focus on areas where you need improvement',
    date: format(addDays(reviewStart, 5), 'yyyy-MM-dd'), // Friday
    duration: reviewWeekData.friday!.duration,
    resource: reviewWeekData.friday!.resource,
    isCompleted: false,
    taskType: 'review'
  });
  
  weeklyTasks.push({
    id: taskId++,
    studyPlanId: 1,
    title: reviewWeekData.weekend!.title,
    description: 'Take a full-length practice exam under test conditions',
    date: format(addDays(reviewStart, 6), 'yyyy-MM-dd'), // Saturday
    duration: reviewWeekData.weekend!.duration,
    resource: reviewWeekData.weekend!.resource,
    isCompleted: false,
    taskType: 'practice'
  });
  
  // Create StudyPlan object and include progress data
  const topicsProgress: Record<string, number> = {};
  topics.forEach(topic => {
    topicsProgress[topic.title] = topic.progress || 0;
  });
  
  const studyPlan = {
    id: 1, // This will be replaced by server-generated ID
    courseName,
    examDate,
    weeklyStudyTime,
    studyPreference,
    learningStyle: learningStyle,
    studyMaterials: studyMaterials,
    topics: topics.map(t => t.title),
    topicsProgress,
    resources: resources.map(r => r.name),
    createdAt: format(new Date(), 'yyyy-MM-dd')
  };
  
  return {
    studyPlan,
    calendarWeeks,
    weeklyTasks
  };
}

// Helper function to get task description based on learning style
function getTaskDescription(topic: Topic, taskType: string, learningStyle?: string): string {
  const baseDescription = `Study ${topic.title}`;
  
  if (!learningStyle) return baseDescription;
  
  switch (learningStyle) {
    case 'visual':
      return `${baseDescription} focusing on diagrams, charts, and visual materials`;
    case 'auditory':
      return `${baseDescription} using lectures, podcasts, and discussions`;
    case 'reading':
      return `${baseDescription} by reading textbooks, articles, and making notes`;
    case 'kinesthetic':
      return `${baseDescription} through hands-on activities and practical applications`;
    default:
      return baseDescription;
  }
}

// Function to generate multiple study plan options
function generateMultipleOptions(formData: StudyPlanFormData): GeneratedPlan[] {
  const plans: GeneratedPlan[] = [];
  
  // Option 1: Default balanced plan (use the original algorithm)
  const originalFormData = { ...formData, generateOptions: false };
  const balancedPlan = generateStudyPlan(originalFormData) as GeneratedPlan;
  balancedPlan.studyPlan.selectedSchedule = 1;
  plans.push(balancedPlan);
  
  // Option 2: Intensive plan (more time per session, fewer sessions)
  const intensiveFormData = { 
    ...formData,
    studyPreference: 'long',
    weeklyStudyTime: Math.min(formData.weeklyStudyTime * 1.2, 40), // 20% more time but max 40 hours
    generateOptions: false
  } as StudyPlanFormData;
  const intensivePlan = generateStudyPlan(intensiveFormData) as GeneratedPlan;
  intensivePlan.studyPlan.selectedSchedule = 2;
  plans.push(intensivePlan);
  
  // Option 3: Distributed plan (shorter sessions, more frequent)
  const distributedFormData = {
    ...formData,
    studyPreference: 'short',
    weeklyStudyTime: formData.weeklyStudyTime,
    generateOptions: false
  } as StudyPlanFormData;
  const distributedPlan = generateStudyPlan(distributedFormData) as GeneratedPlan;
  distributedPlan.studyPlan.selectedSchedule = 3;
  plans.push(distributedPlan);
  
  return plans;
}

export function rescheduleTask(task: StudyTask, daysToAdd: number): StudyTask {
  const taskDate = parseISO(task.date);
  const newDate = addDays(taskDate, daysToAdd);
  
  return {
    ...task,
    date: format(newDate, 'yyyy-MM-dd')
  };
}