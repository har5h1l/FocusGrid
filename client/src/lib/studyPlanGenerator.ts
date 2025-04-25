import { addDays, addWeeks, format, parseISO, differenceInWeeks } from "date-fns";
import { StudyPlanFormData, StudyTask, WeekData, GeneratedPlan, Topic } from "../types";
import { getLLMResponse } from "./openRouterService";

export async function generateStudyPlan(formData: StudyPlanFormData): Promise<GeneratedPlan | GeneratedPlan[]> {
  // Check if we should use AI personalization
  if (formData.generateOptions) {
    return await generateMultipleOptions(formData);
  }
  
  try {
    // Use AI to generate the study plan if personalization is enabled
    const aiGeneratedPlan = await generateAIStudyPlan(formData);
    return aiGeneratedPlan;
  } catch (error) {
    console.error("Error generating AI study plan:", error);
    // Fall back to rule-based generation if AI fails
    return fallbackRuleBasedPlan(formData);
  }
}

async function generateAIStudyPlan(formData: StudyPlanFormData): Promise<GeneratedPlan> {
  const { courseName, examDate, topics, resources, weeklyStudyTime, studyPreference, learningStyle, progress } = formData;
  
  const examDateObj = parseISO(examDate);
  const today = new Date();
  
  // Calculate weeks until exam
  const weeksUntilExam = Math.max(1, differenceInWeeks(examDateObj, today));
  
  // Create a prompt for the LLM to generate a personalized study plan
  let prompt = `Create a personalized study plan for a student taking ${courseName} with an exam on ${examDate}, which is ${weeksUntilExam} weeks away.

Student information:
- Weekly study time available: ${weeklyStudyTime} hours
- Preferred study session length: ${studyPreference === 'short' ? 'Short sessions (20-30 minutes)' : 'Long sessions (1-2 hours)'}
- Learning style: ${learningStyle || 'Not specified'}
- Topics to cover: ${topics.map(t => t.title).join(', ')}
- Resources available: ${resources.map(r => r.name).join(', ')}`;

  // Add progress information if provided
  if (progress && progress.trim().length > 0) {
    prompt += `\n- Current progress: ${progress}`;
  }
  
  // Add detailed topic information including progress
  prompt += `\n\nDetailed topic information:`;
  topics.forEach(topic => {
    prompt += `\n- ${topic.title}: ${topic.progress || 0}% complete`;
  });

  // Add specific instructions for the LLM
  prompt += `\n
Based on this information, create a detailed study plan that:
1. Prioritizes topics with lower completion percentage
2. Places completed topics (100%) only as review sessions
3. Schedules appropriate resources for each study session (e.g., practice tests should be used for review, not initial learning)
4. Adapts to the student's learning style
5. Creates a realistic schedule with the student's available time
6. Includes appropriate breaks and review sessions

Please structure your response in JSON format that includes:
1. A weekly calendar showing which topics to study on which days
2. A list of specific tasks with details for each day
3. Progress tracking information for each topic

Your response should be VALID JSON that I can parse. Follow this exact structure:
{
  "studyPlan": {
    "topics": ["Topic1", "Topic2"...],
    "topicsProgress": {"Topic1": 50, "Topic2": 0...},
    "resources": ["Textbook", "Videos"...]
  },
  "calendarWeeks": [
    {
      "weekRange": "Apr 25 - May 1",
      "monday": {"title": "Study Topic1", "duration": 60, "resource": "Textbook", "type": "study"},
      "tuesday": null,
      "wednesday": {"title": "Practice Topic1", "duration": 30, "resource": "Practice Tests", "type": "practice"},
      "thursday": null,
      "friday": {"title": "Study Topic2", "duration": 60, "resource": "Videos", "type": "study"},
      "saturday": null,
      "sunday": {"title": "Review Topics 1-2", "duration": 90, "resource": "Notes", "type": "review"}
    }
  ],
  "weeklyTasks": [
    {
      "id": 1,
      "studyPlanId": 1,
      "title": "Study Topic1",
      "description": "Initial study session for Topic1",
      "date": "2025-04-28",
      "duration": 60,
      "resource": "Textbook",
      "isCompleted": false,
      "taskType": "study"
    }
  ]
}`;

  // Call the LLM to generate the plan
  const response = await getLLMResponse("studyPlan", prompt);
  
  try {
    // Parse the JSON response
    let jsonResponse;
    
    // First, attempt to extract JSON from the response if it's not already pure JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not extract valid JSON from the LLM response");
    }

    // Fill in any missing fields and ensure the plan is complete
    const processedPlan = processPlanData(jsonResponse, formData);
    return processedPlan;
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    console.error("Raw response:", response);
    throw new Error("Failed to generate a valid study plan");
  }
}

function processPlanData(aiGeneratedPlan: any, formData: StudyPlanFormData): GeneratedPlan {
  const { courseName, examDate, weeklyStudyTime, studyPreference, learningStyle, studyMaterials } = formData;
  
  // Ensure studyPlan has all required fields
  const studyPlan = {
    id: 1,
    courseName,
    examDate,
    weeklyStudyTime,
    studyPreference,
    learningStyle,
    studyMaterials: studyMaterials || [],
    topics: aiGeneratedPlan.studyPlan?.topics || formData.topics.map(t => t.title),
    topicsProgress: aiGeneratedPlan.studyPlan?.topicsProgress || {},
    resources: aiGeneratedPlan.studyPlan?.resources || formData.resources.map(r => r.name),
    createdAt: format(new Date(), 'yyyy-MM-dd')
  };

  // Make sure all topics have progress values
  formData.topics.forEach(topic => {
    if (!(topic.title in studyPlan.topicsProgress)) {
      studyPlan.topicsProgress[topic.title] = topic.progress || 0;
    }
  });
  
  // Process calendar weeks data
  let calendarWeeks = aiGeneratedPlan.calendarWeeks || [];
  if (calendarWeeks.length === 0) {
    // Generate fallback calendar data
    calendarWeeks = generateFallbackCalendarWeeks(formData);
  }
  
  // Process weekly tasks
  let weeklyTasks = aiGeneratedPlan.weeklyTasks || [];
  if (weeklyTasks.length === 0) {
    // Generate fallback tasks
    weeklyTasks = generateFallbackTasks(formData, calendarWeeks);
  }
  
  // Ensure all tasks have required fields and fix any issues
  weeklyTasks = weeklyTasks.map((task: any, index: number) => ({
    id: task.id || index + 1,
    studyPlanId: task.studyPlanId || 1,
    title: task.title || `Task ${index + 1}`,
    description: task.description || `Study session for ${task.title}`,
    date: task.date || format(new Date(), 'yyyy-MM-dd'),
    duration: task.duration || 30,
    resource: task.resource || "General",
    isCompleted: task.isCompleted || false,
    taskType: task.taskType || "study"
  }));

  // Sanity check: ensure topics marked as 100% complete aren't assigned as initial study tasks
  if (studyPlan.topicsProgress) {
    const completedTopics = Object.keys(studyPlan.topicsProgress).filter(
      topic => studyPlan.topicsProgress[topic] === 100
    );
    
    weeklyTasks = weeklyTasks.map(task => {
      if (task.taskType === 'study' && completedTopics.some(topic => task.title.includes(topic))) {
        // Convert to review task instead
        return {
          ...task,
          title: task.title.replace('Study', 'Review'),
          description: `Review session for ${task.title.replace('Study ', '')}`,
          taskType: 'review',
          isCompleted: false
        };
      }
      return task;
    });
  }
  
  return {
    studyPlan,
    calendarWeeks,
    weeklyTasks
  };
}

// Helper function to generate fallback calendar weeks if the LLM fails
function generateFallbackCalendarWeeks(formData: StudyPlanFormData): WeekData[] {
  const { examDate, topics } = formData;
  const examDateObj = parseISO(examDate);
  const today = new Date();
  const weeksUntilExam = Math.max(1, differenceInWeeks(examDateObj, today));
  
  const weeks: WeekData[] = [];
  const topicsList = [...topics];
  
  for (let i = 0; i < Math.min(weeksUntilExam, 8); i++) {
    const weekStart = addWeeks(today, i);
    const weekEnd = addDays(weekStart, 6);
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
    
    // Assign topics to days
    const topicIndex1 = (i * 2) % topicsList.length;
    const topicIndex2 = (i * 2 + 1) % topicsList.length;
    
    weeks.push({
      weekRange,
      monday: {
        title: `Study ${topicsList[topicIndex1].title}`,
        duration: 60,
        resource: "Textbook",
        type: "study"
      },
      wednesday: {
        title: `Practice ${topicsList[topicIndex1].title}`,
        duration: 45,
        resource: "Practice Questions",
        type: "practice"
      },
      friday: {
        title: `Study ${topicsList[topicIndex2].title}`,
        duration: 60,
        resource: "Notes",
        type: "study"
      },
      weekend: {
        title: `Review Week ${i+1}`,
        duration: 90,
        resource: "All Materials",
        type: "review"
      }
    });
  }
  
  return weeks;
}

// Helper function to generate fallback tasks if the LLM fails
function generateFallbackTasks(formData: StudyPlanFormData, calendarWeeks: WeekData[]): StudyTask[] {
  const tasks: StudyTask[] = [];
  let taskId = 1;
  const today = new Date();
  
  calendarWeeks.forEach((week, weekIndex) => {
    const weekStart = addWeeks(today, weekIndex);
    
    if (week.monday) {
      tasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: week.monday.title,
        description: `Study session: ${week.monday.title}`,
        date: format(addDays(weekStart, 1), 'yyyy-MM-dd'), // Monday
        duration: week.monday.duration,
        resource: week.monday.resource,
        isCompleted: false,
        taskType: week.monday.type
      });
    }
    
    if (week.tuesday) {
      tasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: week.tuesday.title,
        description: `Study session: ${week.tuesday.title}`,
        date: format(addDays(weekStart, 2), 'yyyy-MM-dd'), // Tuesday
        duration: week.tuesday.duration,
        resource: week.tuesday.resource,
        isCompleted: false,
        taskType: week.tuesday.type
      });
    }
    
    if (week.wednesday) {
      tasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: week.wednesday.title,
        description: `Study session: ${week.wednesday.title}`,
        date: format(addDays(weekStart, 3), 'yyyy-MM-dd'), // Wednesday
        duration: week.wednesday.duration,
        resource: week.wednesday.resource,
        isCompleted: false,
        taskType: week.wednesday.type
      });
    }
    
    if (week.thursday) {
      tasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: week.thursday.title,
        description: `Study session: ${week.thursday.title}`,
        date: format(addDays(weekStart, 4), 'yyyy-MM-dd'), // Thursday
        duration: week.thursday.duration,
        resource: week.thursday.resource,
        isCompleted: false,
        taskType: week.thursday.type
      });
    }
    
    if (week.friday) {
      tasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: week.friday.title,
        description: `Study session: ${week.friday.title}`,
        date: format(addDays(weekStart, 5), 'yyyy-MM-dd'), // Friday
        duration: week.friday.duration,
        resource: week.friday.resource,
        isCompleted: false,
        taskType: week.friday.type
      });
    }
    
    if (week.weekend) {
      tasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: week.weekend.title,
        description: `Study session: ${week.weekend.title}`,
        date: format(addDays(weekStart, 6), 'yyyy-MM-dd'), // Saturday
        duration: week.weekend.duration,
        resource: week.weekend.resource,
        isCompleted: false,
        taskType: week.weekend.type
      });
    }
  });
  
  return tasks;
}

// Function to generate multiple study plan options
async function generateMultipleOptions(formData: StudyPlanFormData): Promise<GeneratedPlan[]> {
  try {
    // Try to generate multiple plans using AI
    return await generateAIMultipleOptions(formData);
  } catch (error) {
    console.error("Error generating multiple AI plans:", error);
    // Fall back to rule-based generation
    return fallbackMultipleOptions(formData);
  }
}

async function generateAIMultipleOptions(formData: StudyPlanFormData): Promise<GeneratedPlan[]> {
  const { courseName, examDate, topics, resources, weeklyStudyTime } = formData;
  
  const prompt = `Create THREE different study plan options for a student preparing for ${courseName} with an exam on ${examDate}.
  
Student information:
- Topics to study: ${topics.map(t => t.title).join(', ')}
- Resources available: ${resources.map(r => r.name).join(', ')}
- Weekly time available: ${weeklyStudyTime} hours

Option 1: Balanced Plan
- Evenly distribute study time across all topics
- Mix of study, review, and practice sessions

Option 2: Focus on Weak Areas
- Prioritize topics with lower completion percentages
- More time allocated to difficult topics

Option 3: Intensive Deep Dives
- Focus deeply on fewer topics each week
- Longer study sessions with comprehensive coverage

Please return a JSON object with all three plans following this structure for EACH plan:
{
  "plans": [
    {
      "planType": "Balanced",
      "studyPlan": {...},
      "calendarWeeks": [...],
      "weeklyTasks": [...]
    },
    {
      "planType": "WeakAreas",
      "studyPlan": {...},
      "calendarWeeks": [...],
      "weeklyTasks": [...]
    },
    {
      "planType": "IntensiveDeepDive",
      "studyPlan": {...},
      "calendarWeeks": [...],
      "weeklyTasks": [...]
    }
  ]
}`;
  
  const response = await getLLMResponse("studyPlanOptions", prompt);
  
  try {
    // Parse the JSON response
    let jsonResponse;
    
    // First, attempt to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not extract valid JSON from the LLM response");
    }
    
    // Process each plan
    const processedPlans = jsonResponse.plans.map((plan: any) => 
      processPlanData(plan, formData)
    );
    
    // Set the plan type names
    processedPlans.forEach((plan: GeneratedPlan, index: number) => {
      plan.studyPlan.selectedSchedule = index + 1;
      plan.planType = jsonResponse.plans[index].planType || ['Balanced', 'WeakAreas', 'IntensiveDeepDive'][index];
    });
    
    return processedPlans;
  } catch (error) {
    console.error("Failed to parse multiple AI plans response:", error);
    throw error;
  }
}

function fallbackMultipleOptions(formData: StudyPlanFormData): GeneratedPlan[] {
  const plans: GeneratedPlan[] = [];
  
  // Option 1: Default balanced plan (use the original algorithm)
  const originalFormData = { ...formData, generateOptions: false };
  const balancedPlan = fallbackRuleBasedPlan(originalFormData);
  balancedPlan.studyPlan.selectedSchedule = 1;
  balancedPlan.planType = "Balanced";
  plans.push(balancedPlan);
  
  // Option 2: Intensive plan (more time per session, fewer sessions)
  const intensiveFormData = { 
    ...formData,
    studyPreference: 'long',
    weeklyStudyTime: Math.min(formData.weeklyStudyTime * 1.2, 40), // 20% more time but max 40 hours
    generateOptions: false
  } as StudyPlanFormData;
  const intensivePlan = fallbackRuleBasedPlan(intensiveFormData);
  intensivePlan.studyPlan.selectedSchedule = 2;
  intensivePlan.planType = "Intensive";
  plans.push(intensivePlan);
  
  // Option 3: Distributed plan (shorter sessions, more frequent)
  const distributedFormData = {
    ...formData,
    studyPreference: 'short',
    weeklyStudyTime: formData.weeklyStudyTime,
    generateOptions: false
  } as StudyPlanFormData;
  const distributedPlan = fallbackRuleBasedPlan(distributedFormData);
  distributedPlan.studyPlan.selectedSchedule = 3;
  distributedPlan.planType = "Distributed";
  plans.push(distributedPlan);
  
  return plans;
}

// Use the existing rule-based system as a fallback
function fallbackRuleBasedPlan(formData: StudyPlanFormData): GeneratedPlan {
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
  const topicsForReview = sortedTopics.filter(t => (t.progress || 0) >= 70 && (t.progress || 0) < 100);
  const completedTopics = sortedTopics.filter(t => (t.progress || 0) >= 100);
  
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
        title: `Study ${weekTopics[0].title}`,
        duration: sessionDuration,
        resource: primaryResource,
        type: 'study'
      } : undefined,
      wednesday: studyPreference === 'short' ? (weekTopics[1] || weekTopics[0]) ? {
        title: `Study ${(weekTopics[1] || weekTopics[0]).title}`,
        duration: sessionDuration,
        resource: secondaryResource,
        type: 'study'
      } : undefined : undefined,
      friday: weekTopics[0] ? {
        title: `Review ${weekTopics[0].title}`,
        duration: sessionDuration,
        resource: 'Practice Quiz',
        type: 'review'
      } : undefined,
      weekend: weekTopics.length > 1 ? {
        title: `Practice ${weekTopics[1] ? weekTopics[1].title : weekTopics[0].title}`,
        duration: sessionDuration * 2,
        resource: 'Practice Tests',
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
        title: weekData.monday.title,
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
        title: weekData.wednesday.title,
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
  
  // Add quick review sessions for topics that are partially complete but not 100%
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
  
  // Add completed topics as already completed tasks in the first week
  // This ensures they appear in the plan but are already marked as done
  if (completedTopics.length > 0) {
    const firstWeekStart = today;
    
    completedTopics.forEach((topic, index) => {
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: `${topic.title} - Completed`,
        description: `This topic has been marked as completed based on your initial progress`,
        date: format(addDays(firstWeekStart, index % 7), 'yyyy-MM-dd'),
        duration: 60,
        resource: 'Already Completed',
        isCompleted: true,
        taskType: 'study'
      });
      
      // Also add a review task that's not completed yet
      weeklyTasks.push({
        id: taskId++,
        studyPlanId: 1,
        title: `Review: ${topic.title}`,
        description: `Quick review of ${topic.title} to ensure retention`,
        date: format(addDays(firstWeekStart, (index % 7) + 7), 'yyyy-MM-dd'), // Week after
        duration: 30,
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
  let baseDescription;
  
  switch(taskType) {
    case 'study':
      baseDescription = `Study ${topic.title}`;
      break;
    case 'review':
      baseDescription = `Review ${topic.title}`;
      break;
    case 'practice':
      baseDescription = `Practice applying ${topic.title} concepts`;
      break;
    default:
      baseDescription = `Study ${topic.title}`;
  }
  
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

export function rescheduleTask(task: StudyTask, daysToAdd: number): StudyTask {
  const taskDate = parseISO(task.date);
  const newDate = addDays(taskDate, daysToAdd);
  
  return {
    ...task,
    date: format(newDate, 'yyyy-MM-dd')
  };
}