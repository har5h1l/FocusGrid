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

   // --- Resource Utilization ---
   if (resources.length > 0) {
     rules.push(`Core resources to utilize: ${resources.join(', ')}.`);
     if (resources.some(r => r.toLowerCase().includes('textbook') || r.toLowerCase().includes('book'))) {
       rules.push("Assign specific chapter readings from the textbook(s).");
     }
     if (resources.some(r => r.toLowerCase().includes('video'))) {
        rules.push("Schedule time for watching relevant videos, especially for visual learners or complex topics.");
     }
      if (resources.some(r => r.toLowerCase().includes('practice') || r.toLowerCase().includes('problem'))) {
        rules.push("Regularly assign practice problems or tests from the available practice resources.");
     }
   }
   
   // --- Progress ---
   if (planData.progress) {
      rules.push(`Acknowledge the student's prior progress: "${planData.progress}". Ensure the plan starts from the next logical topic.`);
   }

  return {
    examDate,
    weeksUntilExam,
    daysUntilExam,
    sessionType: studyPreference,
    rules
  };
} 