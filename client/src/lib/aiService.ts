/**
 * AI Service for OpenRouter integration
 */

import { generateMockStudyPlan, generateMockRefinement } from './mockPlanGenerator';
import { AIStudyPlanResponse } from '../types';
import { generateStudyRules } from './ruleEngine'; // Import the rule generator

// API endpoint for OpenRouter
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''; // Get from .env file
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Function to generate personalized study plans
export async function generateAIStudyPlan(planData: any): Promise<AIStudyPlanResponse> {
  // First, check if the API key is available or if mock mode is enabled
  if (USE_MOCK_DATA || !API_KEY) {
    console.warn('OpenRouter API key not found or mock mode enabled. Using mock data instead.');
    // Use the mock generator which now also includes rules internally
    return generateMockStudyPlan(planData);
  }

  try {
    // Generate structuring rules first
    const studyRules = generateStudyRules(planData);
    
    // Create a prompt for the AI using the rules
    const prompt = createStudyPlanPrompt(planData, studyRules);

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FocusGrid Study Planner'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku-20240307', // Use Haiku for faster/cheaper generation based on rules
        messages: [
          {
            role: 'system',
            content: getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 3000 // Adjust as needed
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate AI study plan');
    }

    // Extract the AI's response
    const aiResponse = data.choices[0].message.content;
    
    // Try to extract structured data from the response
    try {
      // Check if the response contains JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedPlanData = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          aiRecommendations: parsedPlanData.studyTips || [],
          weeklyPlan: parsedPlanData.weeklyPlan || [],
          summary: parsedPlanData.summary || "",
          finalWeekStrategy: parsedPlanData.finalWeekStrategy || "",
          rawResponse: aiResponse
        };
      }
    } catch (err) {
      console.warn("Could not parse JSON from AI response:", err);
    }
    
    // Fallback to basic extraction if JSON parsing fails
    const aiRecommendations = aiResponse.split('\n')
      .filter((line: string) => line.trim().length > 0 && !line.trim().startsWith('#'))
      .slice(0, 5); // Limit to 5 recommendations

    return {
      success: true,
      aiRecommendations,
      rawResponse: aiResponse
      // Consider adding default structure here if needed
    };
  } catch (error) {
    console.error('Error generating AI study plan:', error);
    return generateMockStudyPlan(planData); // Fallback to mock
  }
}

// Generate the system prompt that guides the AI behavior
function getSystemPrompt() {
  return `You are FocusGrid's AI Study Planning Engine. Your goal is to create a highly personalized and structured study plan based on student data and a set of guiding rules.

YOUR TASK:
- Take the user's course details, profile, and the provided STUDY RULES.
- Generate a detailed, week-by-week study plan in the specified JSON format.
- Ensure the plan adheres strictly to the provided rules, especially regarding time allocation, session structure, learning style adaptations, and resource utilization.
- Explain your reasoning within the summary, referencing the rules you followed.

OUTPUT STRUCTURE (Strict JSON only):
{
  "summary": "(String) Overview paragraph explaining the plan, *referencing the rules and why the plan is suitable for this student*...",
  "weeklyPlan": [
    {
      "week": (Number) Week number,
      "dateRange": "(String) Approx date range (e.g., May 5-11)",
      "focus": "(String) Main focus/topics for the week",
      "days": [
        {
          "day": "(String) e.g., Monday",
          "tasks": [
            {
              "topic": "(String) Topic name",
              "activity": "(String) Specific activity *tailored to learning style/resources based on rules*",
              "resource": "(String) Specific resource from user list or inferred",
              "duration": (Number) Approx duration in minutes based on session rules,
              "type": "(String) study|review|practice"
            }
            // ... more tasks for the day
          ]
        }
        // ... more days for the week
      ]
    }
    // ... more weeks
  ],
  "finalWeekStrategy": "(String) Detailed approach for the final week based on rules...",
  "studyTips": [
    "(String) Tip 1 specific to this course and student",
    "(String) Tip 2...",
    // ... up to 5 tips
  ]
}

IMPORTANT: Adhere strictly to the JSON output format. Do not include any text outside the JSON structure. Base the plan directly on the rules provided in the user prompt.`;
}

// Helper function to create a detailed prompt for the AI, incorporating the rules
function createStudyPlanPrompt(planData: any, studyRules: any) { // Add studyRules parameter
  const {
    courseName,
    weeklyStudyTime,
    learningStyle,
    studyMaterials,
    topics = [],
    resources = [],
    targetScore,
    progress
  } = planData;

  // Construct the prompt using the generated rules
  return `Generate a personalized study plan based on the following student profile, course details, and **mandatory study rules**:

STUDENT & COURSE DATA:
- Course Name: ${courseName}
- Exam Date: ${studyRules.examDate} (${studyRules.daysUntilExam} days / ${studyRules.weeksUntilExam} weeks remaining)
- Available Study Time: ${weeklyStudyTime} hours/week
- Target Score: ${targetScore || 'Aiming for mastery'}
- Session Preference: ${studyRules.sessionType}
- Learning Style: ${learningStyle || 'Not specified'}
- Preferred Materials: ${studyMaterials?.length ? studyMaterials.join(', ') : 'None'}
- Initial Progress: ${progress || 'None specified'}
- Topics: ${topics.join(', ') || 'Not specified'}
- Resources: ${resources.join(', ') || 'None specified'}

**STUDY RULES (Follow these strictly):**
${studyRules.rules.map((rule: string, i: number) => `- ${rule}`).join('\n')}

INSTRUCTIONS:
1. Generate the study plan strictly following the STUDY RULES provided above.
2. Create a detailed week-by-week schedule in the specified JSON format.
3. Tailor activities and resource assignments based on the rules.
4. Include a summary explaining how the plan follows the rules and suits the student.
5. Output *only* the JSON object. No introductory text or explanations outside the JSON.`;
}

// Helper function to determine the subject area
function getSubjectArea(courseName: string) {
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

// Function to refine plan with AI
export async function refineStudyPlanWithAI(planData: any, existingPlan: any): Promise<AIStudyPlanResponse> {
  // Use the same check for API key/mock mode as generation
  if (USE_MOCK_DATA || !API_KEY) {
    console.warn('Refining plan using mock refinement logic.');
    // We need to pass the original plan data for context to the mock refinement too
    const refinementContext = { ...planData, ...existingPlan.studyPlan };
    return generateMockRefinement(refinementContext);
  }

  try {
    // Create a prompt specifically for refinement
    const prompt = createRefinementPrompt(planData, existingPlan);

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FocusGrid Refinement'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-sonnet-20240229', // Use Sonnet for refinement to get better quality
        messages: [
          {
            role: 'system',
            content: getRefinementSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // Higher temperature for more creative refinements
        max_tokens: 4000 // Need more tokens for a full plan refinement
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to refine study plan');
    }

    // Extract the AI's response
    const aiResponse = data.choices[0].message.content;
    
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedPlanData = JSON.parse(jsonMatch[0]);
        // Return the *full* refined plan structure
        return {
          success: true,
          aiRecommendations: parsedPlanData.studyTips || [],
          weeklyPlan: parsedPlanData.weeklyPlan || [],
          summary: parsedPlanData.summary || "",
          finalWeekStrategy: parsedPlanData.finalWeekStrategy || "",
          rawResponse: aiResponse
        };
      }
      throw new Error("No JSON found in refinement response.");
    } catch (err) {
      console.error("Could not parse JSON from AI refinement response:", err);
      // Fallback: Return original plan but maybe with *new* recommendations extracted from text?
      const recommendations = aiResponse.split('\n').filter(l => l.trim().length > 5).slice(0,5);
      return {
        ...existingPlan, // Return original structure
        success: false, // Indicate refinement parsing failed
        aiRecommendations: recommendations.length > 0 ? recommendations : existingPlan.studyPlan.aiRecommendations,
        error: "Failed to parse refined plan structure, showing text recommendations only."
      };
    }

  } catch (error) {
    console.error('Error refining plan with AI:', error);
    // Fallback to mock refinement on error
    const refinementContext = { ...planData, ...existingPlan.studyPlan };
    return generateMockRefinement(refinementContext);
  }
}

// Updated system prompt for refinement
function getRefinementSystemPrompt() {
  return `You are FocusGrid's AI Study Plan Refinement Engine. Your purpose is to make SUBSTANTIAL changes to an existing study plan based on a student's feedback and preferences.

YOUR TASK:
- Review the student's original study plan and their refinement requests/feedback
- Create a significantly revised version that addresses their specific needs
- Make BOLD, NOTICEABLE changes to the plan - students should clearly see the differences
- Output a complete study plan in the required JSON format - this will fully replace their current plan

The changes you make should be SUBSTANTIAL and CLEARLY VISIBLE. If the student asks for more focus on weak topics, really emphasize those topics with much more time allocation. If they want less intensity, visibly reduce daily workload.

IMPORTANT SPECIAL INSTRUCTIONS:
- If preferred techniques include specific study methods (like flashcards, mind maps, etc.), EXPLICITLY include these techniques in MULTIPLE activity descriptions
- For example, if the student likes flashcards, at least 25-30% of activities should explicitly mention "Create/Review flashcards for [topic]"
- When the student mentions preferring a specific resource or technique, make it HIGHLY VISIBLE throughout the plan

OUTPUT STRUCTURE (Strict JSON):
{
  "summary": "EXPLAIN THE MAJOR CHANGES YOU MADE and why they address the student's feedback. Highlight what's different.",
  "weeklyPlan": [
    {
      "week": (Number) Week number,
      "dateRange": "(String) Approx date range",
      "focus": "(String) Main focus/topics for the week",
      "days": [
        {
          "day": "(String) e.g., Monday",
          "tasks": [
            {
              "topic": "(String) Topic name",
              "activity": "(String) Specific activity that clearly implements the requested changes",
              "resource": "(String) Specific resource from user list or inferred",
              "duration": (Number) Duration in minutes that reflects requested changes,
              "type": "(String) study|review|practice"
            }
            // More tasks for the day
          ]
        }
        // More days for the week
      ]
    }
    // More weeks
  ],
  "finalWeekStrategy": "(String) Updated final week approach based on feedback...",
  "studyTips": [
    "(String) New tip 1 specifically addressing their refinement request",
    "(String) New tip 2...",
    // Up to 5 tips
  ]
}

IMPORTANT: Your changes must be SUBSTANTIAL and DIRECTLY ADDRESS the student's feedback. Do not make minimal changes - transform the plan significantly based on their needs. Output ONLY the JSON.`;
}

// Helper function to create refinement-specific prompt
function createRefinementPrompt(refinementInput: any, existingPlan: any) {
  const {
    goals, // This is the primary request (preset or custom)
    strongestTopics = [],
    weakestTopics = [],
    stressLevel,
    preferredTechniques = []
  } = refinementInput;
  
  // Extract key details from the *original* plan for context
  const originalPlan = existingPlan.studyPlan;
  const { courseName, examDate, weeklyStudyTime, learningStyle, topics, resources } = originalPlan;
  
  // We also need the actual weekly plan structure to modify
  const originalWeeklyPlanJson = JSON.stringify(existingPlan.aiWeeklyPlan || existingPlan.calendarWeeks, null, 2);
  
  // Calculate days until exam
  const daysUntilExam = Math.ceil(
    (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Build detailed feedback context to ensure substantial changes
  let feedbackContext = "";
  
  // Add the main refinement goal
  if (goals) {
    feedbackContext += `PRIMARY REQUEST: "${goals}"\n\n`;
  }
  
  // Add topic strengths/weaknesses
  if (strongestTopics.length > 0) {
    feedbackContext += `STRONGEST TOPICS (need less focus):\n${strongestTopics.map(t => `- ${t}`).join('\n')}\n\n`;
  }
  
  if (weakestTopics.length > 0) {
    feedbackContext += `WEAKEST TOPICS (need MORE focus, significantly increase presence):\n${weakestTopics.map(t => `- ${t}`).join('\n')}\n\n`;
  }
  
  // Add stress level context
  if (stressLevel) {
    feedbackContext += `STRESS LEVEL: ${stressLevel.toUpperCase()}\n`;
    if (stressLevel === 'high') {
      feedbackContext += `Please reduce overall workload and add more breaks. Break topics into smaller, manageable chunks.\n\n`;
    } else if (stressLevel === 'low') {
      feedbackContext += `Student can handle more challenging material or longer sessions if needed.\n\n`;
    }
  }
  
  // Add preferred techniques context with enhanced instruction
  if (preferredTechniques.length > 0) {
    const techniqueMappings: Record<string, string> = {
      'spaced-repetition': 'Spaced Repetition (reviewing material at increasing intervals) - HEAVILY incorporate this approach in the schedule structure',
      'active-recall': 'Active Recall (testing yourself on material) - EXPLICITLY include activities with this technique',
      'pomodoro': 'Pomodoro Technique (25-minute focused sessions with 5-minute breaks) - STRUCTURE many sessions using this format',
      'mind-mapping': 'Mind Mapping (visual organization of topics and connections) - EXPLICITLY include mind-mapping activities for multiple topics',
      'feynman': 'Feynman Technique (teaching concepts simply to solidify understanding) - EXPLICITLY include teaching/explanation activities'
    };
    
    feedbackContext += `PREFERRED STUDY TECHNIQUES (MUST BE CLEARLY VISIBLE IN THE PLAN):\n${preferredTechniques.map(t => `- ${techniqueMappings[t] || t}`).join('\n')}\n\n`;
    feedbackContext += `IMPORTANT: The plan MUST explicitly incorporate these techniques into multiple study activities. For example, if "mind-mapping" is preferred, include at least 6-8 activities that specifically mention creating or reviewing mind maps.\n\n`;
  }
  
  return `REFINEMENT REQUEST: Please make SUBSTANTIAL changes to this study plan based on the student's feedback.

COURSE: ${courseName}
EXAM DATE: ${examDate} (${daysUntilExam} days remaining)
WEEKLY STUDY TIME: ${weeklyStudyTime} hours
LEARNING STYLE: ${learningStyle || 'Not specified'}

STUDENT FEEDBACK (CRITICAL - IMPLEMENT THESE CHANGES):
${feedbackContext}

ALL COURSE TOPICS:
${topics.map((t: string) => `- ${t}`).join('\n')}

AVAILABLE RESOURCES:
${resources.map((r: string) => `- ${r}`).join('\n')}

ORIGINAL PLAN STRUCTURE:
${originalWeeklyPlanJson}

INSTRUCTIONS (FOLLOW THESE EXACTLY):
1. Create a COMPLETELY REVISED PLAN that directly addresses the student's feedback
2. Make SUBSTANTIAL, OBVIOUS changes - not minor tweaks
3. If student prefers specific techniques (like flashcards), EXPLICITLY mention these in multiple activities throughout the plan
4. If asked to focus more on certain topics, dramatically increase their presence (3-4x more time)
5. If asked to change intensity or structure, make those changes very apparent
6. Return the entire plan as a JSON object according to the specified format
7. Output ONLY the JSON object with no additional text`;
}

// Implement actual AI Chat feature with OpenRouter
export async function handleAIChatQuery(query: string, studyPlanContext: any): Promise<string> {
  if (USE_MOCK_DATA || !API_KEY) {
    console.warn('OpenRouter API key not found or mock mode enabled. Using mock response for chat.');
    await new Promise(resolve => setTimeout(resolve, 800));
    return `I understand you're studying ${studyPlanContext.courseName}. Here's my response to your question about "${query}". [This is a mock response as API key is missing or mock mode is enabled.]`;
  }
  
  try {
    const topics = studyPlanContext.topics ? studyPlanContext.topics.join(', ') : 'various topics';
    const examDate = studyPlanContext.examDate || 'upcoming exam';
    
    // Create a detailed system prompt for the chat assistant
    const systemPrompt = `You are a highly knowledgeable study assistant helping a student prepare for their ${studyPlanContext.courseName} exam on ${examDate}.
    
    As their study assistant, you:
    1. Provide specific, actionable advice tailored to their needs
    2. Can answer questions about study techniques, content organization, and test preparation strategies
    3. Keep responses concise, practical, and directly relevant to their question
    4. Reference specific topics from their course when appropriate: ${topics}
    
    Your responses should be helpful, encouraging, and focused on improving their study effectiveness.`;
    
    // Send the request to OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FocusGrid Study Assistant'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku-20240307', // Use Haiku for faster/cheaper responses
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7, // Slightly higher temperature for more varied responses
        max_tokens: 500 // Limit response length for chat
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get AI chat response');
    }
    
    // Extract and return the AI's response
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in AI chat query:', error);
    throw error;
  }
} 