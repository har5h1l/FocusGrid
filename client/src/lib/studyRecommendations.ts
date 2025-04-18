import { LearningStyle, StudyMaterial, Topic } from "../types";

// Types of study recommendations
export interface StudyRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'technique' | 'resource' | 'schedule';
}

// Recommendations based on learning style
const learningStyleRecommendations: Record<LearningStyle, StudyRecommendation[]> = {
  visual: [
    {
      title: "Use mind maps",
      description: "Create colorful mind maps to visualize connections between topics and concepts.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Watch video lectures",
      description: "Supplement your reading with video lectures and demonstrations.",
      priority: 'high',
      category: 'resource'
    },
    {
      title: "Create diagrams",
      description: "Transform complex information into diagrams, charts, and visual representations.",
      priority: 'medium',
      category: 'technique'
    }
  ],
  auditory: [
    {
      title: "Record lectures",
      description: "Record yourself summarizing key concepts and listen to them while commuting.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Group discussions",
      description: "Participate in study groups where you can discuss topics out loud.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Use podcasts",
      description: "Find educational podcasts related to your subject matter.",
      priority: 'medium',
      category: 'resource'
    }
  ],
  reading: [
    {
      title: "Take detailed notes",
      description: "Create comprehensive written notes with highlights and annotations.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Use textbooks",
      description: "Focus on reading textbooks and journal articles for in-depth knowledge.",
      priority: 'high',
      category: 'resource'
    },
    {
      title: "Write summaries",
      description: "After each study session, write a brief summary of what you learned.",
      priority: 'medium',
      category: 'technique'
    }
  ],
  kinesthetic: [
    {
      title: "Practice problems",
      description: "Solve many practice problems and hands-on exercises.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Study while moving",
      description: "Try studying while walking or using a standing desk.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Use flashcards",
      description: "Create physical flashcards that you can manipulate and sort.",
      priority: 'medium',
      category: 'resource'
    }
  ]
};

// Recommendations based on progress
const progressBasedRecommendations: StudyRecommendation[] = [
  {
    title: "Focus on weak areas",
    description: "Spend more time on topics with progress below 40%.",
    priority: 'high',
    category: 'schedule'
  },
  {
    title: "Review high-progress topics",
    description: "Schedule regular but brief reviews of topics with high progress (>80%) to maintain knowledge.",
    priority: 'medium',
    category: 'schedule'
  },
  {
    title: "Interleaved practice",
    description: "Mix up different topics during study sessions rather than focusing on one topic for too long.",
    priority: 'medium',
    category: 'technique'
  }
];

// Recommendations based on time until exam
const timeBasedRecommendations: Record<string, StudyRecommendation[]> = {
  far: [
    {
      title: "Build foundation",
      description: "Focus on understanding core concepts and establishing a solid knowledge base.",
      priority: 'high',
      category: 'schedule'
    },
    {
      title: "Create study materials",
      description: "Invest time in creating comprehensive notes and study resources you can use later.",
      priority: 'medium',
      category: 'technique'
    }
  ],
  medium: [
    {
      title: "Practice application",
      description: "Start applying concepts to practice problems and case studies.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Regular self-testing",
      description: "Begin testing yourself with quizzes and practice tests to identify knowledge gaps.",
      priority: 'high',
      category: 'technique'
    }
  ],
  near: [
    {
      title: "Full practice tests",
      description: "Take full-length practice tests under timed conditions.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Targeted review",
      description: "Focus exclusively on your weakest areas and high-yield topics.",
      priority: 'high',
      category: 'schedule'
    }
  ]
};

// Function to analyze topics and return progress stats
function analyzeTopicProgress(topics: Topic[]) {
  if (!topics.length) return { average: 0, below40: 0, above80: 0 };
  
  const progressValues = topics.map(t => t.progress || 0);
  const average = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
  const below40 = progressValues.filter(p => p < 40).length;
  const above80 = progressValues.filter(p => p > 80).length;
  
  return { average, below40, above80 };
}

// Function to determine time category based on weeks until exam
function getTimeCategory(examDate: string): 'far' | 'medium' | 'near' {
  const now = new Date();
  const exam = new Date(examDate);
  const weeksUntilExam = Math.max(0, Math.round((exam.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  
  if (weeksUntilExam > 8) return 'far';
  if (weeksUntilExam > 2) return 'medium';
  return 'near';
}

// Main function to generate personalized recommendations
export function generateRecommendations(
  learningStyle: LearningStyle | undefined,
  topics: Topic[],
  examDate: string,
  studyMaterials?: StudyMaterial[]
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];
  
  // Add learning style recommendations if available
  if (learningStyle && learningStyleRecommendations[learningStyle]) {
    recommendations.push(...learningStyleRecommendations[learningStyle]);
  }
  
  // Add progress-based recommendations
  const progressStats = analyzeTopicProgress(topics);
  if (progressStats.below40 > 0) {
    recommendations.push(progressBasedRecommendations[0]); // Focus on weak areas
  }
  if (progressStats.above80 > 0) {
    recommendations.push(progressBasedRecommendations[1]); // Review high-progress topics
  }
  
  // Add time-based recommendations
  const timeCategory = getTimeCategory(examDate);
  recommendations.push(...timeBasedRecommendations[timeCategory]);
  
  // Add study materials recommendations based on selected materials
  if (studyMaterials && studyMaterials.length > 0) {
    if (!studyMaterials.includes('practice_tests')) {
      recommendations.push({
        title: "Add practice tests",
        description: "Practice tests are highly effective for reinforcing knowledge and identifying gaps.",
        priority: 'high',
        category: 'resource'
      });
    }
    
    if (!studyMaterials.includes('flashcards')) {
      recommendations.push({
        title: "Use flashcards",
        description: "Flashcards are excellent for memorizing key concepts and terminology.",
        priority: 'medium',
        category: 'resource'
      });
    }
  }
  
  // Sort recommendations by priority
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}