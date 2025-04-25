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

// Model configuration - using free models to avoid costs
const DEFAULT_AI_MODEL = 'mistralai/mistral-small-24b-instruct-2501:free';
const FALLBACK_MODELS = [
  'meta-llama/llama-4-scout:free',
  'huggingfaceh4/zephyr-7b-beta:free'
];

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

    // Try the primary model
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'FocusGrid Study Planner'
        },
        body: JSON.stringify({
          model: DEFAULT_AI_MODEL,
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
        throw new Error(data.error?.message || 'Failed to generate AI study plan with primary model');
      }

      // Extract and process the AI's response
      return processAIResponse(data);
      
    } catch (primaryModelError) {
      console.warn('Primary model failed:', primaryModelError);
      
      // Try each fallback model in sequence
      for (const fallbackModel of FALLBACK_MODELS) {
        try {
          console.info(`Trying fallback model ${fallbackModel}...`);
          
          const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'FocusGrid Study Planner'
            },
            body: JSON.stringify({
              model: fallbackModel,
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
              max_tokens: 3000
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || `Failed with fallback model ${fallbackModel}`);
          }

          // Successfully used fallback model
          return processAIResponse(data);
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel} failed:`, fallbackError);
        }
      }
      
      // All models failed, fall back to mock data
      console.error('All AI models failed. Using mock data as final fallback.');
      throw new Error('All AI models failed');
    }
  } catch (error) {
    console.error('Error generating AI study plan:', error);
    return generateMockStudyPlan(planData); // Fallback to mock
  }
}

// Process the AI response from any model
function processAIResponse(data: any): AIStudyPlanResponse {
  const aiResponse = data.choices[0].message.content;
  
  // Try to extract structured data from the response
  try {
    // First look for JSON content in the response
    let jsonContent = null;
    
    // First try to find a JSON block with regex
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        jsonContent = JSON.parse(jsonMatch[0]);
      } catch (jsonError) {
        console.error("Failed to parse extracted JSON with regex:", jsonError);
      }
    }
    
    // If regex didn't work, try a more aggressive approach
    if (!jsonContent) {
      const possibleJsonStart = aiResponse.indexOf('{');
      const possibleJsonEnd = aiResponse.lastIndexOf('}');
      
      if (possibleJsonStart !== -1 && possibleJsonEnd !== -1 && possibleJsonEnd > possibleJsonStart) {
        try {
          const jsonCandidate = aiResponse.substring(possibleJsonStart, possibleJsonEnd + 1);
          console.log("Trying alternate JSON extraction method");
          jsonContent = JSON.parse(jsonCandidate);
        } catch (altJsonError) {
          console.error("Alternative JSON extraction failed:", altJsonError);
        }
      }
    }
    
    // If we have valid parsed JSON content, use it to construct the response
    if (jsonContent) {
      return {
        success: true,
        aiRecommendations: jsonContent.studyTips || [],
        weeklyPlan: jsonContent.weeklyPlan || [],
        summary: jsonContent.summary || "",
        finalWeekStrategy: jsonContent.finalWeekStrategy || "",
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
}

// Generate the system prompt that guides the AI behavior
function getSystemPrompt() {
  return `You are FocusGrid's AI Study Planning Engine. Your goal is to create a highly personalized and structured study plan based on student data and a set of guiding rules.

YOUR TASK:
- Take the user's course details, profile, and the provided STUDY RULES.
- Generate a detailed, week-by-week study plan in the specified JSON format.
- Ensure the plan adheres strictly to the provided rules, especially regarding time allocation, session structure, learning style adaptations, and resource utilization.
- Pay special attention to resource types and their appropriate usage phases.
- Properly handle topics with different progress levels (completed, in-progress, not started).

RESOURCE TYPE GUIDELINES:
- Practice resources (quizzes, problem sets, practice exams): Use primarily AFTER initial learning of topics
- Review resources (flashcards, summaries): Use throughout with spaced repetition pattern
- Learning resources (videos, textbooks): Use primarily during initial learning phase
- Always match resources to the student's learning style when possible

LEARNING STYLE ADAPTATIONS:
- Visual: Include diagrams, videos, mind maps, color-coding techniques
- Auditory: Include discussion sessions, audio explanations, verbal recall exercises
- Reading/Writing: Focus on note-taking, summaries, and written practice problems
- Kinesthetic: Include hands-on applications, physical flashcards, interactive simulations

PROGRESS HANDLING:
- Completed topics (100%): Include only brief review sessions for retention
- Partial progress (70-99%): Focus on weak areas, review, and practice - not relearning basics
- Low progress (0-69%): Full learning sequence from basics to application

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
              "duration": (Number) Duration in minutes that respects session length rules,
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
  "finalWeekStrategy": "(String) Detailed approach for the final week based on rules...",
  "studyTips": [
    "(String) Tip 1 specific to this course and student",
    "(String) Tip 2...",
    // Up to 5 tips
  ]
}

IMPORTANT: Adhere strictly to the JSON output format. Do not include any text outside the JSON structure. Base the plan directly on the rules provided in the user prompt.`;
}

// Helper function to create a detailed prompt for the AI, incorporating the rules
function createStudyPlanPrompt(planData: any, studyRules: any) {
  const {
    courseName,
    weeklyStudyTime,
    learningStyle,
    studyMaterials,
    topics = [],
    resources = [],
    targetScore,
    progress,
    topicsProgress
  } = planData;

  // Format topics with progress information if available
  const topicsWithProgress = topics.map((t: any) => {
    // If it's an object with title and progress
    if (typeof t === 'object' && t.title) {
      // Use specific progress if available or object's progress property
      const progressValue = topicsProgress?.[t.title] ?? t.progress ?? 0;
      return `${t.title} (Progress: ${progressValue}%)`;
    }
    // If it's a string (simple topic name), check topicsProgress object
    const progressValue = topicsProgress?.[t] ?? 0;
    return `${t} (Progress: ${progressValue}%)`;
  }).join(', ');

  // Format resources with more context
  const resourcesFormatted = resources.map((r: any) => {
    if (typeof r === 'object' && r.name) {
      return r.name;
    }
    return r;
  }).join(', ');

  // Parse any reported progress text
  const progressContext = progress ? 
    `\nREPORTED PROGRESS: "${progress}"` :
    '';
    
  // Add progress data as structured information
  let structuredProgressInfo = '';
  if (topicsProgress && Object.keys(topicsProgress).length > 0) {
    structuredProgressInfo = '\nTOPIC PROGRESS DATA:';
    for (const [topic, value] of Object.entries(topicsProgress)) {
      structuredProgressInfo += `\n- ${topic}: ${value}% complete`;
    }
  }

  // Add learning style-specific instructions
  let learningStyleContext = '';
  if (learningStyle) {
    switch (learningStyle) {
      case 'visual':
        learningStyleContext = "\nThis student is a VISUAL LEARNER who benefits from diagrams, charts, videos and visual organization of information. Include plenty of visual learning activities.";
        break;
      case 'auditory':
        learningStyleContext = "\nThis student is an AUDITORY LEARNER who benefits from discussions, recordings, verbal explanations, and listening activities. Prioritize audio-based learning methods.";
        break;
      case 'reading':
        learningStyleContext = "\nThis student is a READING/WRITING LEARNER who benefits from text-based materials, note-taking, and written summaries. Include plenty of reading and writing activities.";
        break;
      case 'kinesthetic':
        learningStyleContext = "\nThis student is a KINESTHETIC LEARNER who benefits from hands-on activities, practical applications, and physical engagement with material. Include interactive and tactile learning methods.";
        break;
    }
  }

  // Add specific material preferences
  let materialPreferences = '';
  if (studyMaterials && studyMaterials.length > 0) {
    materialPreferences = `\nThe student specifically prefers these study materials: ${studyMaterials.join(', ')}.`;
  }

  // Construct the prompt using the generated rules with enhanced formatting
  return `Generate a detailed, personalized study plan based on the following student profile, course details, and mandatory study rules:

STUDENT & COURSE DATA:
- Course Name: ${courseName}
- Exam Date: ${studyRules.examDate} (${studyRules.daysUntilExam} days / ${studyRules.weeksUntilExam} weeks remaining)
- Available Study Time: ${weeklyStudyTime} hours/week
- Target Score: ${targetScore || 'Aiming for mastery'}
- Session Preference: ${studyRules.sessionType}
- Learning Style: ${learningStyle || 'Not specified'}${learningStyleContext}
- Topics to Cover: ${topicsWithProgress}${structuredProgressInfo}
- Available Resources: ${resourcesFormatted}${materialPreferences}${progressContext}

**STUDY RULES (Follow these strictly):**
${studyRules.rules.map((rule: string, i: number) => `${i + 1}. ${rule}`).join('\n')}

REQUIRED JSON OUTPUT FORMAT:
{
  "summary": "Personalized overview of the study plan strategy...",
  "weeklyPlan": [
    {
      "week": 1,
      "dateRange": "Apr 24-30",
      "focus": "Main focus for this week",
      "days": [
        {
          "day": "Monday",
          "tasks": [
            {
              "topic": "Topic name",
              "activity": "Detailed activity description that matches learning style",
              "resource": "Specific resource from available list",
              "duration": 45,
              "type": "study|review|practice"
            }
          ]
        }
      ]
    }
  ],
  "finalWeekStrategy": "Detailed approach for the exam week...",
  "studyTips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"]
}

INSTRUCTIONS:
1. Generate the complete study plan following ALL provided STUDY RULES.
2. Create activities that specifically match the student's learning style (${learningStyle || 'general'}).
3. Account for topic progress in the plan - IMPORTANT RULES:
   - For topics with high progress (70%+): Focus on review and practice, not relearning
   - For topics with medium progress (30-69%): Balance learning and practice
   - For topics with low progress (0-29%): Focus on initial learning and understanding
   - Topics at 100% progress should only get brief review sessions for retention
4. Prioritize topics with lower progress percentages.
5. Output ONLY the JSON object. No introductory text or explanations outside the JSON.`;
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
    
    // Use primary model first
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'FocusGrid Refinement'
        },
        body: JSON.stringify({
          model: DEFAULT_AI_MODEL,
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
          temperature: 0.7,
          max_tokens: 4000 // Need more tokens for a full plan refinement
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to refine study plan with primary model');
      }

      // Extract and process the AI's response
      return processRefinementResponse(data, existingPlan);
      
    } catch (primaryModelError) {
      console.warn('Primary model failed for refinement:', primaryModelError);
      
      // Try each fallback model in sequence
      for (const fallbackModel of FALLBACK_MODELS) {
        try {
          console.info(`Trying fallback model ${fallbackModel} for refinement...`);
          
          const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'FocusGrid Refinement'
            },
            body: JSON.stringify({
              model: fallbackModel,
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
              temperature: 0.7,
              max_tokens: 4000
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || `Failed with fallback model ${fallbackModel}`);
          }

          // Successfully used fallback model
          return processRefinementResponse(data, existingPlan);
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel} failed for refinement:`, fallbackError);
        }
      }
      
      // All models failed, fall back to mock data
      console.error('All AI models failed for refinement. Using mock refinement as final fallback.');
      throw new Error('All AI models failed for refinement');
    }
  } catch (error) {
    console.error('Error refining plan with AI:', error);
    // Fallback to mock refinement on error
    const refinementContext = { ...planData, ...existingPlan.studyPlan };
    return generateMockRefinement(refinementContext);
  }
}

// Process the refinement response
function processRefinementResponse(data: any, existingPlan: any): AIStudyPlanResponse {
  const aiResponse = data.choices[0].message.content;
  
  try {
    console.log("Raw AI refinement response:", aiResponse.slice(0, 200) + "..."); // Debug logging
    
    // First try to find a JSON block with regex
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
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
      } catch (jsonError) {
        console.error("Failed to parse extracted JSON:", jsonError);
        // The regex matched something that looks like JSON but isn't valid
        throw new Error("Invalid JSON structure in AI response");
      }
    }
    
    // If no JSON found with regex, try a more aggressive approach
    // Look for anything that might be the start of a JSON object
    const possibleJsonStart = aiResponse.indexOf('{');
    const possibleJsonEnd = aiResponse.lastIndexOf('}');
    
    if (possibleJsonStart !== -1 && possibleJsonEnd !== -1 && possibleJsonEnd > possibleJsonStart) {
      try {
        const jsonCandidate = aiResponse.substring(possibleJsonStart, possibleJsonEnd + 1);
        console.log("Trying alternate JSON extraction method");
        const parsedPlanData = JSON.parse(jsonCandidate);
        
        return {
          success: true,
          aiRecommendations: parsedPlanData.studyTips || [],
          weeklyPlan: parsedPlanData.weeklyPlan || [],
          summary: parsedPlanData.summary || "",
          finalWeekStrategy: parsedPlanData.finalWeekStrategy || "",
          rawResponse: aiResponse
        };
      } catch (altJsonError) {
        console.error("Alternative JSON extraction failed:", altJsonError);
      }
    }
    
    throw new Error("No valid JSON found in refinement response");
  } catch (err) {
    console.error("Could not parse JSON from AI refinement response:", err);
    console.log("Response content sample:", aiResponse.slice(0, 500));
    
    // Create a better fallback: extract some useful information from the text
    const lines = aiResponse.split('\n').filter(l => l.trim().length > 10);
    const potentialRecommendations = lines
      .filter(line => 
        !line.includes('{') && 
        !line.includes('}') && 
        (line.includes('recommend') || 
         line.includes('suggest') || 
         line.includes('should') ||
         line.includes('focus on') ||
         line.includes('improve') ||
         line.trim().startsWith('-') || 
         line.trim().startsWith('•'))
      )
      .slice(0, 5);
    
    // Extract what might be a summary
    const potentialSummary = lines.find(line => 
      line.length > 40 && 
      (line.toLowerCase().includes('plan') || 
       line.toLowerCase().includes('summary') || 
       line.toLowerCase().includes('overview'))
    ) || "Refined plan with updated focus areas";
    
    // Return a gracefully degraded response that won't break the UI
    return {
      success: true, // Still mark as success to avoid breaking the UI
      aiRecommendations: potentialRecommendations.length > 0 ? 
        potentialRecommendations : 
        ["Focus more on your weaker topics", "Use varied practice techniques", "Review regularly"],
      weeklyPlan: existingPlan.aiWeeklyPlan || [], // Keep original plan structure
      summary: potentialSummary,
      finalWeekStrategy: existingPlan.studyPlan.finalWeekStrategy || "Review all topics with emphasis on weak areas",
      rawResponse: aiResponse,
      partialSuccess: true // Flag to indicate we had to use fallback data
    };
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
  const { courseName, examDate, weeklyStudyTime, learningStyle, topics, resources, topicsProgress } = originalPlan;
  
  // We also need the actual weekly plan structure to modify
  const originalWeeklyPlanJson = JSON.stringify(existingPlan.aiWeeklyPlan || existingPlan.calendarWeeks, null, 2);
  
  // Calculate days until exam
  const daysUntilExam = Math.ceil(
    (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Format topics with their progress information
  const topicsWithProgressInfo = topics.map((topic: string) => {
    const progress = topicsProgress?.[topic] || 0;
    return `${topic} (Progress: ${progress}%)`;
  });
  
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
  
  // Add learning style-specific guidance
  let learningStyleContext = '';
  if (learningStyle) {
    switch (learningStyle) {
      case 'visual':
        learningStyleContext = "\nThis student is a VISUAL LEARNER who benefits from diagrams, charts, videos and visual organization of information. Include plenty of visual learning activities.";
        break;
      case 'auditory':
        learningStyleContext = "\nThis student is an AUDITORY LEARNER who benefits from discussions, recordings, verbal explanations, and listening activities. Prioritize audio-based learning methods.";
        break;
      case 'reading':
        learningStyleContext = "\nThis student is a READING/WRITING LEARNER who benefits from text-based materials, note-taking, and written summaries. Include plenty of reading and writing activities.";
        break;
      case 'kinesthetic':
        learningStyleContext = "\nThis student is a KINESTHETIC LEARNER who benefits from hands-on activities, practical applications, and physical engagement with material. Include interactive and tactile learning methods.";
        break;
    }
  }
  
  return `REFINEMENT REQUEST: Please make SUBSTANTIAL changes to this study plan based on the student's feedback.

COURSE: ${courseName}
EXAM DATE: ${examDate} (${daysUntilExam} days remaining)
WEEKLY STUDY TIME: ${weeklyStudyTime} hours
LEARNING STYLE: ${learningStyle || 'Not specified'}${learningStyleContext}

STUDENT FEEDBACK (CRITICAL - IMPLEMENT THESE CHANGES):
${feedbackContext}

ALL COURSE TOPICS WITH CURRENT PROGRESS:
${topicsWithProgressInfo.map((t: string) => `- ${t}`).join('\n')}

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
6. IMPORTANT: Account for topic progress - SKIP or minimize tasks for topics marked as 100% complete
7. For topics with high progress (>70%), include only brief review sessions rather than full study sessions
8. Return the entire plan as a JSON object according to the specified format
9. Output ONLY the JSON object with no additional text`;
}

// Implement actual AI Chat feature with OpenRouter
export async function handleAIChatQuery(query: string, studyPlanContext: any): Promise<string> {
  if (USE_MOCK_DATA || !API_KEY) {
    console.warn('OpenRouter API key not found or mock mode enabled. Using mock response for chat.');
    await new Promise(resolve => setTimeout(resolve, 800));
    return `I understand you're studying ${studyPlanContext.courseName}. Here's my response to your question about "${query}". [This is a mock response as API key is missing or mock mode is enabled.]`;
  }
  
  try {
    // Format topics with their progress information if available
    let topicsWithProgress = '';
    if (studyPlanContext.topics && studyPlanContext.topicsProgress) {
      topicsWithProgress = studyPlanContext.topics
        .map((topic: string) => {
          const progress = studyPlanContext.topicsProgress?.[topic] || 0;
          return `${topic} (Progress: ${progress}%)`;
        })
        .join(', ');
    } else if (studyPlanContext.topics) {
      topicsWithProgress = studyPlanContext.topics.join(', ');
    } else {
      topicsWithProgress = 'various topics';
    }
    
    const examDate = studyPlanContext.examDate || 'upcoming exam';
    const learningStyle = studyPlanContext.learningStyle || 'not specified';
    const daysUntilExam = studyPlanContext.examDate ? 
      Math.ceil((new Date(studyPlanContext.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) :
      'unknown number of';
    
    // Create a detailed system prompt for the chat assistant with more context
    const systemPrompt = `You are a highly knowledgeable study assistant helping a student prepare for their ${studyPlanContext.courseName} exam on ${examDate} (in ${daysUntilExam} days).
    
    STUDENT CONTEXT:
    - Learning style: ${learningStyle}
    - Course topics: ${topicsWithProgress}
    - Weekly study time: ${studyPlanContext.weeklyStudyTime || 'unspecified'} hours
    - Study session preference: ${studyPlanContext.studyPreference || 'unspecified'}
    
    As their study assistant, you:
    1. Provide specific, actionable advice tailored to their needs and learning style
    2. Answer questions about study techniques, content organization, and test preparation strategies
    3. Keep responses concise, practical, and directly relevant to their question
    4. Reference their specific topics and their current progress when appropriate
    5. If they ask about a topic they've completed, acknowledge their progress and provide advice on retention
    6. For topics with low progress, provide more foundational guidance
    
    Your responses should be helpful, encouraging, and focused on improving their study effectiveness for their specific situation.`;
    
    // Try primary model first
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': window.location.origin || 'https://focusgrid.app',
          'X-Title': 'FocusGrid Study Assistant'
        },
        body: JSON.stringify({
          model: DEFAULT_AI_MODEL,
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
          temperature: 0.7, 
          max_tokens: 800
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (primaryModelError) {
      console.warn('Primary model failed for chat:', primaryModelError);
      
      // Try fallback models
      for (const fallbackModel of FALLBACK_MODELS) {
        try {
          console.info(`Trying fallback model ${fallbackModel} for chat...`);
          
          const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
              'HTTP-Referer': window.location.origin || 'https://focusgrid.app',
              'X-Title': 'FocusGrid Study Assistant'
            },
            body: JSON.stringify({
              model: fallbackModel,
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
              temperature: 0.7,
              max_tokens: 800
            })
          });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          return data.choices[0].message.content;
          
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel} failed for chat:`, fallbackError);
        }
      }
      
      // All models failed, return a helpful error message
      throw new Error('All AI models failed for chat');
    }
  } catch (error) {
    console.error('Error in AI chat query:', error);
    return `I'm sorry, I encountered an issue while processing your question about "${query}". Please try again later or rephrase your question. (Error: ${error.message})`;
  }
}