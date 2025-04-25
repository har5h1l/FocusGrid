import { LearningStyle } from "../types";

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

interface StudyRules {
  examDate: string;
  weeksUntilExam: number;
  daysUntilExam: number;
  sessionType: 'short' | 'long';
  rules: string[];
}

interface ResourceMetadata {
  name: string;
  type: 'learning' | 'practice' | 'review' | 'reference';
  phase: 'early' | 'mid' | 'late';
  description: string;
}

/**
 * Classifies a resource based on its name/description to provide better context for the LLM
 */
function classifyResource(resource: string): ResourceMetadata {
  const name = resource.toLowerCase();
  
  // Practice-oriented resources - belong in later phases after learning
  if (name.includes('practice') || 
      name.includes('quiz') || 
      name.includes('problem') || 
      name.includes('exercise') ||
      name.includes('exam')) {
    return {
      name: resource,
      type: 'practice',
      phase: 'late',
      description: `Use for practicing application of concepts after initial learning, especially in later weeks`
    };
  }
  
  // Review-oriented resources - for reinforcement and consolidation
  if (name.includes('review') || 
      name.includes('summary') || 
      name.includes('flashcard') || 
      name.includes('cheat sheet')) {
    return {
      name: resource,
      type: 'review',
      phase: 'mid',
      description: `Use during review sessions and for reinforcing previously learned material`
    };
  }
  
  // Reference materials - can be used throughout but need guidance
  if (name.includes('textbook') || 
      name.includes('book') || 
      name.includes('manual') || 
      name.includes('guide')) {
    return {
      name: resource,
      type: 'reference',
      phase: 'early',
      description: `Primary reference material, best for initial learning and detailed study`
    };
  }
  
  // Learning-oriented resources - better for initial exposure
  if (name.includes('video') || 
      name.includes('lecture') || 
      name.includes('course') || 
      name.includes('tutorial') ||
      name.includes('youtube')) {
    return {
      name: resource,
      type: 'learning',
      phase: 'early',
      description: `Ideal for initial exposure to concepts and visual/auditory learners`
    };
  }
  
  // Default case - assume it's a learning resource
  return {
    name: resource,
    type: 'learning',
    phase: 'mid',
    description: `General study resource that can be used throughout the learning process`
  };
}

/**
 * Generates a set of structured rules based on user input 
 * to guide the LLM plan generation.
 */
export function generateStudyRules(planData: PlanGenerationData): StudyRules {
  const {
    examDate,
    weeklyStudyTime,
    studyPreference,
    learningStyle,
    studyMaterials = [],
    topics = [],
    resources = []
  } = planData;

  const rules: string[] = [];

  // --- Time Calculation ---
  const today = new Date();
  const examD = new Date(examDate);
  const daysUntilExam = Math.max(1, Math.ceil(
    (examD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  ));
  const weeksUntilExam = Math.max(1, Math.ceil(daysUntilExam / 7));

  rules.push(`Total time available: ${daysUntilExam} days (${weeksUntilExam} weeks).`);
  
  // --- Structure & Pacing ---
  if (weeksUntilExam > 1) {
    rules.push(`Reserve the final week (Week ${weeksUntilExam}) primarily for comprehensive review and practice tests.`);
  }
  if (weeksUntilExam > 4) {
     rules.push("Schedule at least two full mock exams, ideally in the last 2-3 weeks.");
  } else if (weeksUntilExam > 1) {
     rules.push("Schedule at least one full mock exam in the final week.");
  }
  rules.push("Prioritize learning new topics in the earlier weeks, shifting focus towards review and practice in later weeks.");
  rules.push("Incorporate spaced repetition: revisit topics briefly 1 day, 3 days, and 1 week after initial study.");

  // --- Session Structure ---
  const sessionDuration = studyPreference === 'short' ? "25-40 minutes" : "60-90 minutes";
  const sessionsPerWeek = Math.max(1, Math.floor((weeklyStudyTime * 60) / (studyPreference === 'short' ? 30 : 75)));
  const studyDays = Math.min(6, sessionsPerWeek); // Encourage at least one rest day
  rules.push(`Plan for approximately ${sessionsPerWeek} sessions per week, each lasting ${sessionDuration}.`);
  rules.push(`Distribute these sessions across roughly ${studyDays} days per week, allowing for flexibility and rest.`);

  // --- Learning Style Adaptations ---
  if (learningStyle === 'visual') {
    rules.push("Emphasize visual aids: suggest creating mind maps, diagrams, and using color-coding in notes.");
    if (studyMaterials.includes('videos') || resources.some(r => r.toLowerCase().includes('video'))) {
       rules.push("Prioritize watching video resources for introducing or explaining complex topics.");
    }
     if (studyMaterials.includes('flashcards')) {
       rules.push("Strongly recommend creating and reviewing visual flashcards (e.g., with diagrams).");
    }
  } else if (learningStyle === 'auditory') {
    rules.push("Incorporate auditory methods: suggest discussing topics, recording self-explanations, and using audio resources.");
     if (resources.some(r => r.toLowerCase().includes('podcast') || r.toLowerCase().includes('audio'))) {
       rules.push("Utilize available audio resources like podcasts or lecture recordings.");
    }
  } else if (learningStyle === 'reading') {
    rules.push("Focus on reading/writing tasks: suggest detailed note-taking, summarizing chapters, and writing practice essays/responses.");
     if (resources.some(r => r.toLowerCase().includes('textbook') || r.toLowerCase().includes('reading'))) {
       rules.push("Allocate significant time for engaging with textbook chapters or assigned readings.");
    }
  } else if (learningStyle === 'kinesthetic') {
     rules.push("Integrate hands-on activities: suggest building models, using physical flashcards, and taking active study breaks.");
     if (studyMaterials.includes('practice_tests')) {
       rules.push("Emphasize working through practice problems or labs hands-on.");
    }
  }

  // --- Resource Utilization with Enhanced Context ---
  if (resources.length > 0) {
    // Classify all resources to get better context for usage
    const classifiedResources = resources.map(resource => classifyResource(resource));
    
    // Add info about all resources
    rules.push(`Core resources to utilize: ${resources.join(', ')}.`);
    
    // Add specific resource-based rules
    const practiceResources = classifiedResources.filter(r => r.type === 'practice');
    if (practiceResources.length > 0) {
      const names = practiceResources.map(r => r.name).join(', ');
      rules.push(`IMPORTANT: Practice resources (${names}) should primarily be used AFTER initial learning of a topic, with increasing frequency as the exam approaches.`);
    }
    
    const reviewResources = classifiedResources.filter(r => r.type === 'review');
    if (reviewResources.length > 0) {
      const names = reviewResources.map(r => r.name).join(', ');
      rules.push(`Review materials (${names}) should be integrated throughout the plan, using spaced repetition principles.`);
    }
    
    const learningResources = classifiedResources.filter(r => r.type === 'learning' || r.type === 'reference');
    if (learningResources.length > 0) {
      const names = learningResources.map(r => r.name).join(', ');
      rules.push(`Primary learning resources (${names}) should be used most heavily in the early learning phase of each topic.`);
    }
    
    // Resource specific guidance
    classifiedResources.forEach(resource => {
      if (resource.name.toLowerCase().includes('flashcard')) {
        rules.push(`For ${resource.name}: Create cards early but use them repeatedly throughout the study plan, with increasing frequency as the exam approaches.`);
      } 
      else if (resource.name.toLowerCase().includes('practice exam') || resource.name.toLowerCase().includes('mock exam')) {
        rules.push(`For ${resource.name}: Schedule full practice exams primarily in the final 1-2 weeks before the exam, after covering all topics.`);
      }
      else if (resource.name.toLowerCase().includes('youtube') || resource.name.toLowerCase().includes('video')) {
        rules.push(`For ${resource.name}: Use during initial learning phases, focusing on concepts that benefit from visual explanation.`);
      }
    });
  }

  // --- Progress ---
  if (planData.progress) {
     rules.push(`Acknowledge the student's prior progress: "${planData.progress}". Ensure the plan starts from the next logical topic.`);
     rules.push(`For any topics marked as 100% complete, include only brief review sessions rather than full study sessions.`);
     rules.push(`For topics with progress between 70-99%, focus on consolidation and practice rather than re-learning.`);
  }

  return {
    examDate,
    weeksUntilExam,
    daysUntilExam,
    sessionType: studyPreference,
    rules
  };
}