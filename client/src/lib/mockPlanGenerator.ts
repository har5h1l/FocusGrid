/**
 * Mock Study Plan Generator
 * 
 * This module creates realistic study plans without relying on external AI services.
 * Used as a fallback when API keys are missing or when in mock/development mode.
 */

import { AIStudyPlanResponse, AIWeeklyPlan, LearningStyle } from "../types";

interface PlanGenerationData {
  courseName: string;
  examDate: string;
  weeklyStudyTime: number;
  studyPreference: 'short' | 'long';
  learningStyle?: LearningStyle;
  studyMaterials?: string[];
  topics?: string[];
  resources?: string[];
  targetScore?: number;
  progress?: string;
}

/**
 * Generate a complete mock study plan
 */
export function generateMockStudyPlan(planData: PlanGenerationData): AIStudyPlanResponse {
  const {
    courseName,
    examDate,
    weeklyStudyTime,
    studyPreference,
    learningStyle,
    topics = generateDefaultTopics(courseName),
    resources = ['Textbook', 'Notes', 'Practice Tests']
  } = planData;

  // Calculate days until exam
  const daysUntilExam = Math.ceil(
    (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate number of weeks
  const weeksUntilExam = Math.max(1, Math.ceil(daysUntilExam / 7));
  
  // Generate study tips
  const studyTips = generateStudyTips(planData);
  
  // Generate weekly plan
  const weeklyPlan = generateWeeklyPlan(planData, weeksUntilExam, topics, resources);
  
  // Generate final week strategy
  const finalWeekStrategy = `In the final week before your ${courseName} exam, focus on comprehensive review rather than learning new material. Take at least two full practice tests under timed conditions, review all your notes, and focus on your weakest areas. Get plenty of rest the night before the exam.`;

  // Generate summary
  const summary = `Your personalized ${weeksUntilExam}-week study plan for ${courseName} allocates ${weeklyStudyTime} hours per week in ${studyPreference === 'short' ? 'short, focused sessions' : 'longer, comprehensive sessions'} optimized for your ${learningStyle || 'preferred'} learning style. The plan systematically covers all ${topics.length} key topics with regular review sessions, practice assessments, and a strategic final week approach to maximize your performance on ${examDate}.`;

  return {
    success: true,
    aiRecommendations: studyTips,
    weeklyPlan,
    summary,
    finalWeekStrategy
  };
}

/**
 * Generate default topics based on course name
 */
function generateDefaultTopics(courseName: string): string[] {
  const courseNameLower = courseName.toLowerCase();
  
  if (courseNameLower.includes('psychology')) {
    return [
      'Introduction to Psychology',
      'Research Methods',
      'Biological Bases of Behavior',
      'Sensation and Perception',
      'States of Consciousness',
      'Learning',
      'Cognition',
      'Motivation and Emotion',
      'Developmental Psychology',
      'Personality',
      'Testing and Individual Differences',
      'Abnormal Psychology',
      'Treatment of Psychological Disorders',
      'Social Psychology'
    ];
  }
  
  if (courseNameLower.includes('biology')) {
    return [
      'Chemistry of Life',
      'Cell Structure and Function',
      'Cellular Energetics',
      'Cell Communication and Cell Cycle',
      'Heredity',
      'Gene Expression and Regulation',
      'Natural Selection',
      'Ecology',
      'Plant Systems',
      'Animal Systems'
    ];
  }
  
  if (courseNameLower.includes('history') && courseNameLower.includes('us')) {
    return [
      'Colonial America',
      'American Revolution',
      'Early Republic',
      'Antebellum America',
      'Civil War and Reconstruction',
      'Gilded Age',
      'Progressive Era',
      'World War I',
      'Great Depression and New Deal',
      'World War II',
      'Cold War',
      'Civil Rights Movement',
      'Modern America'
    ];
  }
  
  if (courseNameLower.includes('calculus')) {
    return [
      'Limits and Continuity',
      'Derivatives',
      'Applications of Derivatives',
      'Integrals',
      'Applications of Integrals',
      'Differential Equations',
      'Sequences and Series',
      'Parametric and Polar Functions',
      'Vectors and Vector Functions'
    ];
  }
  
  // Default generic topics
  return [
    'Topic 1: Introduction',
    'Topic 2: Fundamental Concepts',
    'Topic 3: Intermediate Principles',
    'Topic 4: Advanced Applications',
    'Topic 5: Analysis and Synthesis',
    'Topic 6: Practical Implementation'
  ];
}

/**
 * Generate study tips based on course, learning style, and available time
 */
function generateStudyTips(planData: PlanGenerationData): string[] {
  const {
    courseName,
    learningStyle,
    weeklyStudyTime
  } = planData;
  
  const generalTips = [
    `Create a consistent study environment free from distractions for your ${courseName} sessions`,
    `Test yourself regularly with practice questions to reinforce your learning`,
    `Use spaced repetition to review material from earlier topics throughout your study plan`,
    `Break complex topics into smaller, manageable chunks to improve understanding`,
    `Get adequate sleep and exercise to optimize your brain's learning capacity`,
    `Teach concepts to someone else (or pretend to) to deepen your understanding`,
    `Create a rewards system to stay motivated throughout your study plan`
  ];
  
  const styleSpecificTips = {
    visual: [
      'Create colorful mind maps to visualize connections between concepts',
      'Use highlighters and color-coding in your notes to organize information',
      'Convert text notes into diagrams, charts, and illustrations',
      'Watch video explanations of difficult concepts'
    ],
    auditory: [
      'Record yourself explaining key concepts and listen during review',
      'Participate in study groups where you can discuss topics verbally',
      'Read important information aloud while studying',
      'Look for relevant podcasts or audio lectures on challenging topics'
    ],
    reading: [
      'Write detailed summaries in your own words after each study session',
      'Create flashcards with written definitions and explanations',
      'Rewrite your notes to consolidate information',
      'Use the Cornell note-taking system for structured review'
    ],
    kinesthetic: [
      'Take study breaks that involve physical movement',
      'Use physical flashcards you can touch and manipulate',
      'Act out processes or concepts when possible',
      'Study while standing or walking to engage your body'
    ]
  };
  
  // Course-specific tips
  const courseArea = getSubjectArea(courseName);
  const courseSpecificTips = {
    mathematics: [
      'Focus on understanding concepts rather than memorizing formulas',
      'Work through problems step by step without looking at solutions',
      'Create a formula sheet that you regularly review',
      'Practice with increasingly difficult problems as you master basics'
    ],
    science: [
      'Connect theoretical concepts to real-world applications',
      'Draw diagrams of processes to visualize complex systems',
      'Create analogies to help remember scientific processes',
      'Focus on understanding the "why" behind scientific principles'
    ],
    'social studies': [
      'Create timelines to visualize historical events in sequence',
      'Connect historical events to their causes and effects',
      'Use mnemonic devices for remembering dates and key figures',
      'Relate historical events to modern situations for better context'
    ],
    'language arts': [
      'Practice active reading by annotating texts',
      'Keep a vocabulary journal for new terms',
      'Write summaries of readings to ensure comprehension',
      'Practice timed writing to prepare for exam conditions'
    ],
    'behavioral science': [
      'Connect psychological theories to real-life examples',
      'Create concept maps showing relationships between theories',
      'Study in varying environments to understand context-dependent memory',
      'Use real-world examples to reinforce abstract concepts'
    ],
    'computer science': [
      'Practice coding problems regularly to build fluency',
      'Implement concepts in code to ensure understanding',
      'Comment your code thoroughly to reinforce understanding',
      'Trace through algorithms step by step on paper'
    ],
    'standardized test prep': [
      'Take full-length practice tests under timed conditions',
      'Review incorrect answers to understand the reasoning',
      'Learn test-specific strategies and time management techniques',
      'Focus on high-yield topics that appear frequently on the exam'
    ]
  };
  
  // Time management tips based on available study hours
  const timeManagementTips = [];
  if (weeklyStudyTime < 5) {
    timeManagementTips.push('Maximize your limited study time by focusing on high-priority topics first');
  } else if (weeklyStudyTime > 10) {
    timeManagementTips.push('Break up your study sessions across different days to prevent burnout');
  }
  
  // Gather all relevant tips
  const allTips = [
    ...generalTips,
    ...(styleSpecificTips[learningStyle] || []),
    ...(courseSpecificTips[courseArea] || []),
    ...timeManagementTips
  ];
  
  // Shuffle and pick 5 tips
  return shuffleArray(allTips).slice(0, 5);
}

/**
 * Generate a weekly study plan with daily tasks
 */
function generateWeeklyPlan(
  planData: PlanGenerationData, 
  weeks: number, 
  topics: string[], 
  resources: string[]
): AIWeeklyPlan[] {
  const {
    studyPreference,
    weeklyStudyTime
  } = planData;
  
  const weeklyPlan: AIWeeklyPlan[] = [];
  const topicsPerWeek = Math.max(1, Math.ceil(topics.length / (weeks - 1))); // Save the last week for review
  
  // Session duration based on preference
  const sessionDuration = studyPreference === 'short' ? 30 : 60;
  
  // Calculate sessions per week based on weekly study time
  const sessionsPerWeek = Math.floor((weeklyStudyTime * 60) / sessionDuration);
  const daysPerWeek = Math.min(5, sessionsPerWeek); // Cap at 5 days per week
  
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Helper to get a date range string for a week
  const getDateRange = (weekNum: number) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (weekNum - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    
    return `${formatDate(startDate)}-${formatDate(endDate)}`;
  };
  
  // Generate the weekly plan
  for (let week = 1; week <= weeks; week++) {
    const isLastWeek = week === weeks;
    
    // Determine topics for this week
    let weekTopics;
    if (isLastWeek) {
      weekTopics = topics; // Review all topics in the last week
    } else {
      const startIdx = (week - 1) * topicsPerWeek;
      weekTopics = topics.slice(startIdx, startIdx + topicsPerWeek);
    }
    
    // If no topics for this week (shouldn't happen), skip
    if (weekTopics.length === 0) continue;
    
    const weekPlan: AIWeeklyPlan = {
      week,
      dateRange: getDateRange(week),
      focus: isLastWeek ? "Final Review" : `${weekTopics.join(", ")}`,
      days: []
    };
    
    // Create daily tasks
    const studyDays = weekdays.slice(0, daysPerWeek);
    
    studyDays.forEach((day, dayIndex) => {
      // Number of tasks per day
      const tasksPerDay = Math.max(1, Math.ceil(sessionsPerWeek / daysPerWeek));
      const dailyTasks = [];
      
      for (let t = 0; t < tasksPerDay; t++) {
        // Select a topic for this task
        const topicIndex = isLastWeek 
          ? (dayIndex + t) % topics.length // Distribute review of all topics
          : (t % weekTopics.length); // Focus on this week's topics
          
        const topic = isLastWeek ? topics[topicIndex] : weekTopics[topicIndex];
        
        // Select a resource
        const resource = resources[Math.floor(Math.random() * resources.length)];
        
        // Determine activity type
        let activityType;
        if (isLastWeek) {
          // Last week focuses on review and practice
          activityType = Math.random() > 0.3 ? 'review' : 'practice';
        } else {
          // Regular weeks have a mix
          const rand = Math.random();
          if (rand < 0.6) activityType = 'study';
          else if (rand < 0.8) activityType = 'review';
          else activityType = 'practice';
        }
        
        // Create an appropriate activity based on type
        let activity;
        switch (activityType) {
          case 'study':
            activity = `Read and take notes on ${topic}`;
            break;
          case 'review':
            activity = `Review key concepts from ${topic}`;
            break;
          case 'practice':
            activity = `Complete practice questions on ${topic}`;
            break;
        }
        
        dailyTasks.push({
          topic,
          activity,
          resource,
          duration: sessionDuration,
          type: activityType
        });
      }
      
      weekPlan.days.push({
        day,
        tasks: dailyTasks
      });
    });
    
    weeklyPlan.push(weekPlan);
  }
  
  return weeklyPlan;
}

/**
 * Helper function to determine the subject area of a course
 */
function getSubjectArea(courseName: string): string {
  const courseNameLower = courseName.toLowerCase();
  
  if (courseNameLower.includes('math') || 
      courseNameLower.includes('calculus') ||
      courseNameLower.includes('algebra') ||
      courseNameLower.includes('geometry') ||
      courseNameLower.includes('statistics')) {
    return 'mathematics';
  }
  
  if (courseNameLower.includes('physics') ||
      courseNameLower.includes('chemistry') ||
      courseNameLower.includes('biology') ||
      courseNameLower.includes('science')) {
    return 'science';
  }
  
  if (courseNameLower.includes('history') ||
      courseNameLower.includes('government') ||
      courseNameLower.includes('econ') ||
      courseNameLower.includes('politics') ||
      courseNameLower.includes('geography')) {
    return 'social studies';
  }
  
  if (courseNameLower.includes('english') ||
      courseNameLower.includes('literature') ||
      courseNameLower.includes('writing') ||
      courseNameLower.includes('language')) {
    return 'language arts';
  }
  
  if (courseNameLower.includes('psychology') ||
      courseNameLower.includes('sociology')) {
    return 'behavioral science';
  }
  
  if (courseNameLower.includes('computer') ||
      courseNameLower.includes('programming') ||
      courseNameLower.includes('coding')) {
    return 'computer science';
  }
  
  if (courseNameLower.includes('sat') ||
      courseNameLower.includes('act') ||
      courseNameLower.includes('gre') ||
      courseNameLower.includes('gmat') ||
      courseNameLower.includes('lsat') ||
      courseNameLower.includes('mcat')) {
    return 'standardized test prep';
  }
  
  return 'academic';
}

/**
 * Helper function to shuffle an array
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Generate recommendations for refining an existing plan
 */
export function generateMockRefinement(planData: PlanGenerationData): AIStudyPlanResponse {
  const {
    courseName,
    learningStyle,
    weeklyStudyTime,
    examDate,
    goals,
    studyMaterials
  } = planData;
  
  const strongestTopics = planData['strongestTopics'] || [];
  const weakestTopics = planData['weakestTopics'] || [];
  const stressLevel = planData['stressLevel'] || 'medium';
  const preferredTechniques = planData['preferredTechniques'] || [];
  
  const daysLeft = Math.ceil(
    (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Base recommendations
  const recommendations = [
    `For ${courseName}: Focus on active recall rather than passive reading for better retention`,
    `With ${daysLeft} days left: Create a consistent daily routine of ${Math.round(weeklyStudyTime/5)} hours per day`
  ];
  
  // Learning style recommendation
  if (learningStyle) {
    recommendations.push(`For your ${learningStyle} learning style: ${getStyleSpecificTip(learningStyle)}`);
  }
  
  // Weak topics recommendation
  if (weakestTopics.length) {
    recommendations.push(`Allocate 50% more time to your challenging topics: ${weakestTopics.join(', ')}`);
  }
  
  // Strong topics recommendation
  if (strongestTopics.length) {
    recommendations.push(`Use your strong understanding of ${strongestTopics[0]} to help master related concepts`);
  }
  
  // Stress level recommendation
  if (stressLevel === 'high') {
    recommendations.push('Incorporate 5-minute mindfulness breaks between study sessions to manage stress');
  }
  
  // Study materials recommendation
  if (studyMaterials?.includes('videos')) {
    recommendations.push('Watch video lectures before reading to get a conceptual overview before diving into details');
  }
  
  // Preferred techniques recommendation
  if (preferredTechniques.length) {
    const technique = preferredTechniques[0];
    if (technique === 'spaced-repetition') {
      recommendations.push('Use spaced repetition with increasing intervals: review after 1 day, 3 days, then weekly');
    } else if (technique === 'active-recall') {
      recommendations.push('After each study session, close your materials and write down everything you remember');
    } else if (technique === 'pomodoro') {
      recommendations.push('Structure your study sessions as 25-minute focused work followed by 5-minute breaks');
    } else if (technique === 'mind-mapping') {
      recommendations.push('Create a master mind map connecting all course topics, adding detail as you study each area');
    } else if (technique === 'feynman') {
      recommendations.push('After studying each concept, practice explaining it simply as if teaching a friend');
    }
  }
  
  // Goals-based recommendation
  if (goals && goals.toLowerCase().includes('exam')) {
    recommendations.push('Take a full practice test every weekend under timed conditions to build test-taking stamina');
  }
  
  return {
    success: true,
    aiRecommendations: recommendations.slice(0, 5)
  };
}

/**
 * Get learning style specific study tips
 */
function getStyleSpecificTip(style: string): string {
  switch (style) {
    case 'visual':
      return 'Use color-coding and diagrams in your notes to enhance visual processing';
    case 'auditory':
      return 'Record yourself explaining concepts and listen during review sessions';
    case 'reading':
      return 'Write detailed summaries in your own words after each study session';
    case 'kinesthetic':
      return 'Use physical flashcards and movement while studying to engage your body';
    default:
      return 'Mix different learning techniques for better retention and engagement';
  }
} 