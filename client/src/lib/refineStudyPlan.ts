import { GeneratedPlan, LearningStyle, StudyMaterial, StudyTask, Topic, WeekData } from "../types";

interface UserMetadata {
  goals?: string;
  strongestTopics?: string[];
  weakestTopics?: string[];
  learningStyle?: LearningStyle;
  studyMaterials?: StudyMaterial[];
  stressLevel?: 'low' | 'medium' | 'high';
  preferredTechniques?: string[];
}

interface OpenRouterRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

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

/**
 * Refines a rule-based study plan using AI to add personalization and smart optimizations
 * @param userData User's preferences, goals, and learning metadata
 * @param basePlan The initial rule-generated study plan
 * @returns A refined, more personalized study plan
 */
export async function refinePlanWithAI(
  userData: UserMetadata,
  basePlan: GeneratedPlan
): Promise<GeneratedPlan> {
  // Create a copy of the base plan to avoid modifying the original
  const fallbackPlan = structuredClone(basePlan);

  try {
    // Prepare topics with metadata about strength/weakness
    const topicsWithMetadata = getTopicsWithMetadata(
      basePlan.studyPlan.topics,
      userData.strongestTopics || [],
      userData.weakestTopics || []
    );

    // Create the system message with instructions for the AI
    const systemMessage = `You are an expert educational consultant with deep expertise in creating personalized study plans.
Your task is to refine an existing study plan to make it more effective, personalized and aligned with evidence-based learning techniques.

When refining the plan, consider:
1. Prioritizing topics based on the student's self-reported strengths and weaknesses
2. Incorporating specific study techniques aligned with the student's learning style
3. Adding strategic breaks, review sessions, and practice tests
4. Creating a more natural and sustainable distribution of study sessions
5. Adapting the schedule based on stress levels and other personal factors

You MUST return your response as a valid JSON object with this exact structure:
{
  "studyPlan": {...}, // The main study plan metadata
  "calendarWeeks": [...], // Array of weekly schedules
  "weeklyTasks": [...] // Array of specific tasks
}

The JSON structure must exactly match the input format. You can modify the content but not the structure.
DO NOT include any explanatory text outside the JSON - your entire response should be valid JSON.

Important guidelines:
- Keep the same total number of study hours per week as specified in the original plan
- Respect the user's learning style and preferences
- Add specific study techniques to task descriptions
- Distribute difficult topics more strategically
- Add spaced repetition for better retention
- Include more practice tests closer to the exam date
- Add review sessions after completing major topics`;

    // Convert weeks and tasks to a more readable format for the prompt
    const plannedWeeks = formatWeeksForPrompt(basePlan.calendarWeeks);
    const plannedTasks = formatTasksForPrompt(basePlan.weeklyTasks);

    // Format the user's learning style preferences
    const learningStyleContext = getLearningStyleContext(userData.learningStyle);
    const studyMaterialsText = userData.studyMaterials
      ? `I prefer these study materials: ${userData.studyMaterials.join(", ").replace(/_/g, " ")}.`
      : "";
    const stressLevelText = userData.stressLevel
      ? `My current stress level is ${userData.stressLevel}.`
      : "";
    const techniquesText = userData.preferredTechniques?.length
      ? `I like these study techniques: ${userData.preferredTechniques.join(", ")}.`
      : "";

    // Create the user message
    const userMessage = `Please refine my current study plan to make it more personalized and effective.

My course: ${basePlan.studyPlan.courseName}
Exam date: ${basePlan.studyPlan.examDate}
Weekly study time: ${basePlan.studyPlan.weeklyStudyTime} hours
Study session preference: ${basePlan.studyPlan.studyPreference === 'short' ? 'shorter, more frequent sessions' : 'longer, fewer sessions'}

${learningStyleContext}
${studyMaterialsText}
${stressLevelText}
${techniquesText}

${userData.goals ? `My goals: ${userData.goals}` : ''}

Topics to study: ${topicsWithMetadata}

Current weekly schedule:
${plannedWeeks}

Current tasks:
${plannedTasks}

Please optimize this plan based on my learning style, preferences, and topic strengths/weaknesses. Make it more personalized and effective while maintaining the same overall structure.`;

    // Make the request to OpenRouter through our server proxy
    const response = await fetch('/api/openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'cohere/command-r-plus', // Use Command R+ as requested (or fallback to others)
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.4, // Lower temperature for more structured output
        max_tokens: 2048  // Ensure enough tokens for the entire plan
      } as OpenRouterRequest)
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', await response.text());
      return fallbackPlan;
    }

    const data = await response.json() as OpenRouterResponse;
    const content = data.choices[0]?.message.content;

    if (!content) {
      console.error('No content in OpenRouter response');
      return fallbackPlan;
    }

    // Extract and parse the JSON response
    try {
      // First try parsing the entire response as JSON
      const refinedPlan = JSON.parse(content) as GeneratedPlan;
      return validateAndFixPlan(refinedPlan, fallbackPlan);
    } catch (e) {
      console.error('Failed to parse JSON directly:', e);
      
      // Try to extract JSON from the text (in case model added explanations)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const refinedPlan = JSON.parse(jsonMatch[0]) as GeneratedPlan;
          return validateAndFixPlan(refinedPlan, fallbackPlan);
        } catch (e) {
          console.error('Failed to extract and parse JSON:', e);
          return fallbackPlan;
        }
      }
      
      console.error('No valid JSON found in response');
      return fallbackPlan;
    }
  } catch (error) {
    console.error('Error refining study plan with AI:', error);
    return fallbackPlan;
  }
}

/**
 * Validates and fixes the structure of the AI-refined plan
 * to ensure it meets the expected format
 */
function validateAndFixPlan(
  refinedPlan: GeneratedPlan, 
  fallbackPlan: GeneratedPlan
): GeneratedPlan {
  // If any of the main structures are missing, use the fallback
  if (!refinedPlan.studyPlan) {
    console.warn('Missing studyPlan in refined plan, using fallback');
    refinedPlan.studyPlan = fallbackPlan.studyPlan;
  }
  
  if (!refinedPlan.calendarWeeks || !Array.isArray(refinedPlan.calendarWeeks)) {
    console.warn('Missing calendarWeeks in refined plan, using fallback');
    refinedPlan.calendarWeeks = fallbackPlan.calendarWeeks;
  }
  
  if (!refinedPlan.weeklyTasks || !Array.isArray(refinedPlan.weeklyTasks)) {
    console.warn('Missing weeklyTasks in refined plan, using fallback');
    refinedPlan.weeklyTasks = fallbackPlan.weeklyTasks;
  }

  // Ensure all required fields are present in studyPlan
  const requiredFields = [
    'id', 'courseName', 'examDate', 'weeklyStudyTime', 
    'studyPreference', 'topics', 'resources', 'createdAt'
  ];
  
  for (const field of requiredFields) {
    if (refinedPlan.studyPlan[field as keyof typeof refinedPlan.studyPlan] === undefined) {
      console.warn(`Missing ${field} in refined plan studyPlan, using fallback value`);
      refinedPlan.studyPlan[field as keyof typeof refinedPlan.studyPlan] = 
        fallbackPlan.studyPlan[field as keyof typeof fallbackPlan.studyPlan];
    }
  }

  // Ensure all tasks have required fields
  refinedPlan.weeklyTasks = refinedPlan.weeklyTasks.map((task, index) => {
    const taskFields = ['id', 'studyPlanId', 'title', 'date', 'duration', 'isCompleted', 'taskType'];
    
    for (const field of taskFields) {
      if (task[field as keyof StudyTask] === undefined) {
        console.warn(`Missing ${field} in task ${index}, using fallback value`);
        // Use fallback task value if available, or a default
        const fallbackTask = fallbackPlan.weeklyTasks[index];
        if (fallbackTask) {
          task[field as keyof StudyTask] = fallbackTask[field as keyof StudyTask];
        } else if (field === 'id') {
          task.id = Math.max(0, ...fallbackPlan.weeklyTasks.map(t => t.id)) + index + 1;
        } else if (field === 'studyPlanId') {
          task.studyPlanId = fallbackPlan.weeklyTasks[0]?.studyPlanId || 1;
        } else if (field === 'isCompleted') {
          task.isCompleted = false;
        }
      }
    }
    
    return task;
  });

  return refinedPlan;
}

/**
 * Formats topics with metadata about user-reported strengths and weaknesses
 */
function getTopicsWithMetadata(
  topics: string[],
  strongTopics: string[],
  weakTopics: string[]
): string {
  return topics.map(topic => {
    let metadata = '';
    if (strongTopics.includes(topic)) {
      metadata = ' (strong)';
    } else if (weakTopics.includes(topic)) {
      metadata = ' (weak)';
    }
    return topic + metadata;
  }).join(', ');
}

/**
 * Formats calendar weeks for the AI prompt
 */
function formatWeeksForPrompt(weeks: WeekData[]): string {
  return weeks.map(week => {
    const tasks = [];
    if (week.monday) tasks.push(`Monday: ${week.monday.title} (${week.monday.duration} min)`);
    if (week.wednesday) tasks.push(`Wednesday: ${week.wednesday.title} (${week.wednesday.duration} min)`);
    if (week.friday) tasks.push(`Friday: ${week.friday.title} (${week.friday.duration} min)`);
    if (week.weekend) tasks.push(`Weekend: ${week.weekend.title} (${week.weekend.duration} min)`);
    
    return `${week.weekRange}:\n${tasks.join('\n')}`;
  }).join('\n\n');
}

/**
 * Formats tasks for the AI prompt
 */
function formatTasksForPrompt(tasks: StudyTask[]): string {
  return tasks.slice(0, 5).map(task => {
    return `${task.date}: ${task.title} (${task.duration} min, ${task.taskType})`;
  }).join('\n') + (tasks.length > 5 ? '\n... and more tasks' : '');
}

/**
 * Helper function to provide context based on learning style
 */
function getLearningStyleContext(learningStyle?: LearningStyle): string {
  if (!learningStyle) return "";
  
  switch (learningStyle) {
    case 'visual':
      return "I'm a visual learner. I learn best through diagrams, charts, and visualizing information.";
    case 'auditory':
      return "I'm an auditory learner. I learn best through listening, discussions, and talking through concepts.";
    case 'reading':
      return "I'm a reading/writing learner. I learn best through written words, taking notes, and reading materials.";
    case 'kinesthetic':
      return "I'm a kinesthetic learner. I learn best through hands-on activities and practical applications.";
    default:
      return "";
  }
} 