import { LearningStyle, StudyMaterial, Topic } from "../types";

// Interface for OpenRouter request
interface OpenRouterRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}

// OpenRouter message format
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Interface for OpenRouter response
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

// Interface for study recommendations
export interface AIStudyRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'technique' | 'resource' | 'schedule';
}

/**
 * Generate AI-powered study recommendations using OpenRouter
 * Uses more affordable and effective models like Claude Haiku or Mistral
 */
export async function generateAIRecommendations(
  learningStyle: LearningStyle | undefined,
  topics: Topic[],
  examDate: string,
  studyMaterials?: StudyMaterial[]
): Promise<AIStudyRecommendation[]> {
  // Default recommendations in case the API call fails
  const fallbackRecommendations: AIStudyRecommendation[] = [
    {
      title: "Create a study schedule",
      description: "Plan specific times for studying different topics to ensure comprehensive coverage.",
      priority: 'high',
      category: 'schedule'
    },
    {
      title: "Use active recall",
      description: "Test yourself frequently rather than passively reviewing materials.",
      priority: 'high',
      category: 'technique'
    },
    {
      title: "Take regular breaks",
      description: "Use techniques like the Pomodoro method to maintain focus and avoid burnout.",
      priority: 'medium',
      category: 'technique'
    }
  ];

  try {
    // Calculate days until exam
    const daysUntilExam = Math.round(
      (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format the topic data with more detail for better recommendations
    const topicsWithProgress = topics.map(t => {
      const progressLevel = t.progress || 0;
      let confidenceLevel = "not started";
      if (progressLevel > 0 && progressLevel < 30) confidenceLevel = "just started";
      else if (progressLevel >= 30 && progressLevel < 60) confidenceLevel = "making progress";
      else if (progressLevel >= 60 && progressLevel < 85) confidenceLevel = "fairly confident";
      else if (progressLevel >= 85) confidenceLevel = "very confident";
      
      return `${t.title} (Progress: ${progressLevel}%, Confidence level: ${confidenceLevel})`;
    }).join("\n- ");
    
    // Format study materials with more context
    const getMaterialContext = (material: string) => {
      switch(material) {
        case 'flashcards': return 'actively testing recall';
        case 'videos': return 'visual and auditory learning';
        case 'practice_tests': return 'testing knowledge under exam conditions';
        case 'notes': return 'summarizing and reflecting on material';
        case 'textbooks': return 'in-depth reading and analysis';
        default: return material.replace('_', ' ');
      }
    };
    
    const materials = studyMaterials 
      ? studyMaterials.map(m => `${m.replace('_', ' ')} (${getMaterialContext(m)})`).join(", ")
      : "No specific materials selected";

    // Create the system message with more expertise and personalization
    const systemMessage = `You are an expert educational consultant with years of experience helping students optimize their study plans.
    You specialize in:
    1. Adapting study techniques to different learning styles (visual, auditory, reading, kinesthetic)
    2. Creating personalized recommendations based on a student's current progress
    3. Optimizing study efficiency with evidence-based learning techniques
    4. Providing actionable, specific advice that students can implement immediately
    
    When making recommendations, consider:
    - The student's specific learning style and preferences
    - Time constraints and upcoming exam deadlines
    - Current progress on different topics
    - Available study materials and resources
    
    Format each recommendation as a JSON object with these fields:
    - title: A concise, action-oriented title (5 words or less)
    - description: A clear, specific explanation (20 words or less)
    - priority: Either "high", "medium", or "low"
    - category: Either "technique" (study methods), "resource" (materials to use), or "schedule" (time management)`;

    // Create the user message with more context about learning style and preferences
    const learningStyleContext = getLearningStyleContext(learningStyle);
    const timeContext = getTimeContextBasedOnExamDate(daysUntilExam);
    
    const userMessage = `I need personalized recommendations for studying these topics for an exam in ${daysUntilExam} days:
    
    Topics and My Current Progress:
    - ${topicsWithProgress}
    
    My learning style: ${learningStyle || "Not specified"}
    ${learningStyleContext}
    
    Study materials I'm using: ${materials}
    
    Time context: ${timeContext}
    
    Please provide 5-6 specific, actionable recommendations to help me study effectively. Make them personalized to my situation and learning style.
    
    Format your response ONLY as a JSON array with objects containing these fields: title, description, priority, category.`;

    // Make the request to OpenRouter - using an affordable but effective model
    const response = await fetch('/api/openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku-20240307',  // Affordable and capable Claude 3 Haiku
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1024
      } as OpenRouterRequest)
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', await response.text());
      return fallbackRecommendations;
    }

    const data = await response.json() as OpenRouterResponse;
    const content = data.choices[0]?.message.content;

    if (!content) {
      return fallbackRecommendations;
    }

    // Extract JSON from the response
    try {
      // Try to parse the entire response as JSON
      const recommendations = JSON.parse(content) as AIStudyRecommendation[];
      return recommendations;
    } catch (e) {
      // If that fails, try to extract JSON from the text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const recommendations = JSON.parse(jsonMatch[0]) as AIStudyRecommendation[];
          return recommendations;
        } catch (e) {
          console.error('Failed to parse JSON from content:', content);
          return fallbackRecommendations;
        }
      }
      console.error('Failed to extract JSON from content:', content);
      return fallbackRecommendations;
    }
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return fallbackRecommendations;
  }
}

// Helper function to provide context based on learning style
function getLearningStyleContext(learningStyle?: LearningStyle): string {
  if (!learningStyle) return "";
  
  switch (learningStyle) {
    case 'visual':
      return "As a visual learner, I learn best through diagrams, charts, and visualizing information. I prefer seeing information rather than just hearing it.";
    case 'auditory':
      return "As an auditory learner, I learn best through listening, discussions and talking through concepts. I prefer hearing explanations rather than reading them.";
    case 'reading':
      return "As a reading/writing learner, I learn best through written words, taking notes, and reading materials. I prefer text-based information.";
    case 'kinesthetic':
      return "As a kinesthetic learner, I learn best through hands-on activities and practical applications. I prefer engaging with the material physically.";
    default:
      return "";
  }
}

// Helper function to provide time context based on exam date
function getTimeContextBasedOnExamDate(daysUntilExam: number): string {
  if (daysUntilExam <= 7) {
    return "This is last-minute cramming as my exam is only a week or less away. I need urgent, high-impact strategies.";
  } else if (daysUntilExam <= 14) {
    return "I'm in the final stretch with only two weeks until my exam. I need focused review strategies.";
  } else if (daysUntilExam <= 30) {
    return "I have about a month to prepare, so I need a balanced approach between learning and reviewing.";
  } else if (daysUntilExam <= 60) {
    return "I have a good amount of time (1-2 months) to prepare thoroughly for this exam.";
  } else {
    return "I'm planning well in advance with more than two months until my exam.";
  }
}