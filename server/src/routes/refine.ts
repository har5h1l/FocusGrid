import express from 'express';
import { db, studyPlans, studyTasks } from '../db/index.js';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI with OpenRouter base URL
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'missing_key',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NODE_ENV === 'production' 
      ? 'https://focusgrid.app' 
      : 'http://localhost:3000',
  },
});

// Refine a study plan using AI
router.post('/', async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key is not configured' });
    }

    const {
      planId,
      courseName,
      examDate,
      weeklyStudyTime,
      studyPreference,
      learningStyle,
      studyMaterials,
      topics,
    } = req.body;

    // Validate required fields
    if (!courseName || !examDate || !weeklyStudyTime || !studyPreference || !topics) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format prompt for the AI
    const prompt = `
Create a comprehensive, optimized study plan for:

Course: ${courseName}
Exam Date: ${examDate}
Weekly Study Time Available: ${weeklyStudyTime} hours
Study Preference: ${studyPreference === 'short' ? 'Shorter, more frequent sessions' : 'Longer, less frequent sessions'}
Learning Style: ${learningStyle || 'Not specified'}
Study Materials Available: ${studyMaterials?.join(', ') || 'Not specified'}

Topics to Cover:
${topics.map((topic) => `- ${topic}`).join('\n')}

Please follow these guidelines:
1. Break down each topic into multiple specific study tasks
2. Schedule tasks with specific dates from today until the exam date
3. Include mixed sessions: introduction, deep learning, review, and practice
4. Identify the most effective resources for each topic
5. Balance the workload based on topic complexity and exam proximity
6. Incorporate spaced repetition for optimal retention
7. Adjust session length based on the student's preference (${studyPreference === 'short' ? 'shorter' : 'longer'} sessions)

Format the response as a JSON object with the following structure:
{
  "weekly_schedule": [
    {
      "week": 1,
      "focus_areas": ["Topic 1", "Topic 2"],
      "tasks": [
        {
          "title": "Introduction to Topic 1",
          "description": "Learn the fundamental concepts of Topic 1",
          "date": "2023-05-01",
          "duration": 45,
          "resource": "Textbook Chapter 1",
          "taskType": "study"
        },
        {
          "title": "Practice Topic 1 Problems",
          "description": "Complete practice problems to reinforce learning",
          "date": "2023-05-03",
          "duration": 30,
          "resource": "Problem Set 1",
          "taskType": "practice"
        }
      ]
    }
  ],
  "recommended_resources": [
    "Textbook: Specific chapters for each topic",
    "Video lectures: Recommended series for visual learners",
    "Practice problems: Sources for application"
  ],
  "learning_strategies": [
    "Start with broad concepts then dive into details",
    "Use spaced repetition for difficult topics",
    "Practice active recall through self-quizzing"
  ]
}
`;

    // Call OpenRouter API
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational consultant specializing in creating personalized study plans. You excel at breaking down complex subjects into manageable tasks and creating optimal learning schedules. Respond in the JSON format specified by the user.'
        },
        { role: 'user', content: prompt }
      ],
      model: 'anthropic/claude-3-opus-20240229',
      response_format: { type: 'json_object' },
    });

    // Parse and return the response
    const responseText = completion.choices[0]?.message?.content || '{}';
    let studyPlan;
    
    try {
      studyPlan = JSON.parse(responseText);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // If a plan ID was provided, create tasks for that plan
    if (planId) {
      try {
        // Find the plan
        const [plan] = await db.select()
          .from(studyPlans)
          .where(eq(studyPlans.id, planId))
          .execute();
        
        if (!plan) {
          return res.status(404).json({ error: 'Study plan not found' });
        }
        
        // Extract all tasks from the weekly schedule
        const allTasks = studyPlan.weekly_schedule.flatMap(week => week.tasks || []);
        
        // Create each task in the database
        for (const task of allTasks) {
          await db.insert(studyTasks)
            .values({
              studyPlanId: planId,
              title: task.title,
              description: task.description,
              date: task.date,
              duration: task.duration,
              resource: task.resource,
              taskType: task.taskType,
              isCompleted: false,
            })
            .execute();
        }
        
        // Update the plan with the AI recommendations
        await db.update(studyPlans)
          .set({
            resources: studyPlan.recommended_resources || plan.resources,
          })
          .where(eq(studyPlans.id, planId))
          .execute();
      } catch (error) {
        console.error('Error saving AI-generated tasks:', error);
        // Continue to return the AI response even if saving fails
      }
    }

    return res.status(200).json(studyPlan);
  } catch (error) {
    console.error('Refine plan error:', error);
    return res.status(500).json({ error: 'Failed to generate study plan' });
  }
});

// Chat with AI about study plan
router.post('/chat', async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key is not configured' });
    }

    const { message, planId, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch plan details if planId is provided
    let planContext = '';
    if (planId) {
      try {
        const [plan] = await db.select()
          .from(studyPlans)
          .where(eq(studyPlans.id, planId))
          .execute();
        
        if (plan) {
          planContext = `
You are discussing a study plan for: ${plan.courseName}
Exam Date: ${plan.examDate}
Topics: ${plan.topics.join(', ')}
Weekly Study Time: ${plan.weeklyStudyTime} hours
Study Preference: ${plan.studyPreference === 'short' ? 'Shorter, more frequent sessions' : 'Longer, less frequent sessions'}
`;
        }
      } catch (error) {
        console.error('Error fetching plan details:', error);
        // Continue without plan context if there's an error
      }
    }

    // Create the messages array with system context and history
    const messages = [
      {
        role: 'system',
        content: `You are an AI study assistant helping a student with their academic planning and learning strategies. ${planContext}
Your goal is to provide helpful, specific advice on study techniques, time management, and understanding difficult concepts.
Keep your answers practical, concise, and tailored to the student's needs.`
      },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenRouter API
    const completion = await openai.chat.completions.create({
      messages,
      model: 'anthropic/claude-3-haiku-20240307',
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;

    return res.status(200).json({ 
      response,
      role: 'assistant'
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
});

export { router as refineRoutes }; 