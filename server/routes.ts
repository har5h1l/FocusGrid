import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fetch from "node-fetch";
import { setupAuth } from "./auth";
import { 
  insertStudyPlanSchema, 
  insertStudyTaskSchema, 
  insertStudyWeekSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Study Plan routes
  app.get("/api/study-plans", async (req: Request, res: Response) => {
    try {
      const plans = await storage.getAllStudyPlans();
      res.status(200).json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study plans" });
    }
  });

  app.get("/api/study-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid study plan ID" });
      }

      const plan = await storage.getStudyPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Study plan not found" });
      }

      res.status(200).json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study plan" });
    }
  });

  app.post("/api/study-plans", async (req: Request, res: Response) => {
    try {
      const result = insertStudyPlanSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid study plan data", 
          errors: result.error.format() 
        });
      }

      const planData = result.data;
      
      // Create the study plan
      const newPlan = await storage.createStudyPlan(planData);

      // Convert topics to tasks
      if (planData.topics && planData.topics.length > 0) {
        const tasks = planData.topics.map((topic, index) => ({
          studyPlanId: newPlan.id,
          title: topic,
          description: `Study session for ${topic}`,
          duration: 60, // Default duration in minutes
          order: index + 1,
          isCompleted: false
        }));

        // Create tasks in parallel
        await Promise.all(tasks.map(task => storage.createStudyTask(task)));
      }

      // If study materials are provided, create additional tasks for them
      if (planData.studyMaterials && planData.studyMaterials.length > 0) {
        const materialTasks = planData.studyMaterials.map((material, index) => ({
          studyPlanId: newPlan.id,
          title: `Review ${material}`,
          description: `Review study material: ${material}`,
          duration: 30, // Default duration in minutes
          order: planData.topics.length + index + 1,
          isCompleted: false
        }));

        await Promise.all(materialTasks.map(task => storage.createStudyTask(task)));
      }

      res.status(201).json(newPlan);
    } catch (error) {
      console.error('Error creating study plan:', error);
      res.status(500).json({ message: "Failed to create study plan" });
    }
  });

  app.put("/api/study-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { plan } = req.body;
      
      // Check if the plan exists
      const existingPlan = await storage.getStudyPlan(id);
      if (!existingPlan) {
        return res.status(404).json({ message: 'Study plan not found' });
      }
      
      // Update only the fields that can be modified
      const updatedPlan = {
        ...existingPlan,
        courseName: plan.courseName || existingPlan.courseName,
        weeklyStudyTime: plan.weeklyStudyTime || existingPlan.weeklyStudyTime,
        studyPreference: plan.studyPreference || existingPlan.studyPreference,
        learningStyle: plan.learningStyle || existingPlan.learningStyle,
        studyMaterials: plan.studyMaterials || existingPlan.studyMaterials,
        topics: plan.topics || existingPlan.topics,
        resources: plan.resources || existingPlan.resources,
        topicsProgress: plan.topicsProgress || existingPlan.topicsProgress
      };
      
      const result = await storage.updateStudyPlan(id, updatedPlan);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error updating study plan:', error);
      res.status(500).json({ message: 'Failed to update study plan' });
    }
  });

  app.delete("/api/study-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid study plan ID" });
      }

      const success = await storage.deleteStudyPlan(id);
      if (!success) {
        return res.status(404).json({ message: "Study plan not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete study plan" });
    }
  });

  // Study Task routes
  app.get("/api/study-plans/:planId/tasks", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid study plan ID" });
      }

      const tasks = await storage.getTasksByPlanId(planId);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study tasks" });
    }
  });

  app.post("/api/study-tasks", async (req: Request, res: Response) => {
    try {
      const result = insertStudyTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid study task data", 
          errors: result.error.format() 
        });
      }

      const newTask = await storage.createStudyTask(result.data);
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to create study task" });
    }
  });

  app.put("/api/study-tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = req.body;
      
      // Check if the task exists
      const existingTask = await storage.getStudyTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: 'Study task not found' });
      }
      
      // Update the task
      const updatedTask = {
        ...existingTask,
        title: taskData.title || existingTask.title,
        description: taskData.description || existingTask.description,
        date: taskData.date || existingTask.date,
        duration: taskData.duration || existingTask.duration,
        resource: taskData.resource || existingTask.resource,
        isCompleted: typeof taskData.isCompleted === 'boolean' ? taskData.isCompleted : existingTask.isCompleted,
        taskType: taskData.taskType || existingTask.taskType
      };
      
      const result = await storage.updateStudyTask(id, updatedTask);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error updating study task:', error);
      res.status(500).json({ message: 'Failed to update study task' });
    }
  });

  app.patch("/api/study-tasks/:id/complete", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid study task ID" });
      }

      const schema = z.object({ isCompleted: z.boolean() });
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.format() 
        });
      }

      const updatedTask = await storage.markTaskComplete(id, result.data.isCompleted);
      if (!updatedTask) {
        return res.status(404).json({ message: "Study task not found" });
      }

      res.status(200).json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Study Weeks (Calendar) routes
  app.get("/api/study-plans/:planId/weeks", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid study plan ID" });
      }

      const weeks = await storage.getWeeksByPlanId(planId);
      res.status(200).json(weeks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study weeks" });
    }
  });

  app.post("/api/study-weeks", async (req: Request, res: Response) => {
    try {
      const result = insertStudyWeekSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid study week data", 
          errors: result.error.format() 
        });
      }

      const newWeek = await storage.createStudyWeek(result.data);
      res.status(201).json(newWeek);
    } catch (error) {
      res.status(500).json({ message: "Failed to create study week" });
    }
  });
  
  // OpenRouter API proxy
  app.post('/api/openrouter', async (req: Request, res: Response) => {
    try {
      const { model, messages, temperature, max_tokens } = req.body;
      
      // Basic validation
      if (!model || !messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid request parameters. Required: model, messages array.' 
        });
      }

      // Check for OpenRouter API key
      if (!process.env.OPENROUTER_API_KEY) {
        console.error('Missing OPENROUTER_API_KEY environment variable');
        return res.status(500).json({ 
          error: 'Server configuration error: Missing API key' 
        });
      }
      
      // Make the request to OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': req.headers.origin || 'https://studyplangenerator.app',
          'X-Title': 'Study Plan Generator'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature || 0.7,
          max_tokens: max_tokens || 1024
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', errorText);
        return res.status(response.status).json({ 
          error: 'OpenRouter API error', 
          details: errorText
        });
      }
      
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('Error calling OpenRouter:', error);
      return res.status(500).json({ 
        error: 'Failed to call OpenRouter API',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Google Calendar Integration endpoints
  app.post("/api/calendar/google/export", async (req: Request, res: Response) => {
    try {
      const { events, calendarName, syncMode } = req.body;
      
      // Get Google OAuth tokens
      const tokens = await getGoogleTokens(req);
      if (!tokens) {
        return res.status(401).json({ 
          message: "Google Calendar authentication required",
          authUrl: generateGoogleAuthUrl()
        });
      }

      // Create or get calendar
      const calendar = await createOrGetCalendar(tokens, calendarName);
      
      if (syncMode === 'full') {
        // Delete existing events before adding new ones
        await deleteExistingEvents(tokens, calendar.id);
      }

      // Add events to calendar
      const createdEvents = await Promise.all(
        events.map(async (event: any) => {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendar.id}/events`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                summary: event.title,
                description: event.description,
                start: { dateTime: event.start },
                end: { dateTime: event.end },
                location: event.location,
                colorId: event.colorId
              })
            }
          );
          
          if (!response.ok) {
            throw new Error(`Failed to create event: ${response.statusText}`);
          }
          
          return response.json();
        })
      );

      res.status(200).json({
        success: true,
        events: createdEvents
      });
    } catch (error) {
      console.error('Error exporting to Google Calendar:', error);
      res.status(500).json({ message: "Failed to export to Google Calendar" });
    }
  });

  app.post("/api/calendar/google/disable-sync", async (req: Request, res: Response) => {
    try {
      const tokens = await getGoogleTokens(req);
      if (!tokens) {
        return res.status(401).json({ message: "Not authenticated with Google Calendar" });
      }

      // Revoke Google Calendar access
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token: tokens.access_token,
          client_id: process.env.GOOGLE_CLIENT_ID!
        })
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error disabling Google Calendar sync:', error);
      res.status(500).json({ message: "Failed to disable Google Calendar sync" });
    }
  });

  // Helper functions for Google Calendar integration
  async function getGoogleTokens(req: Request) {
    // Get tokens from session or database
    return req.session?.googleTokens || null;
  }

  function generateGoogleAuthUrl() {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async function createOrGetCalendar(tokens: any, name: string) {
    // Try to find existing calendar
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      }
    );

    const data = await response.json();
    const existingCalendar = data.items.find((cal: any) => cal.summary === name);

    if (existingCalendar) {
      return existingCalendar;
    }

    // Create new calendar
    const createResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: name,
          timeZone: 'America/New_York'
        })
      }
    );

    return createResponse.json();
  }

  async function deleteExistingEvents(tokens: any, calendarId: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      }
    );

    const data = await response.json();
    
    await Promise.all(
      data.items.map(async (event: any) => {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`
            }
          }
        );
      })
    );
  }

  // Chat endpoint for AI interactions
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Call the AI service
      const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://study-planning-app.com',
          'X-Title': 'Study Planning App'
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct',
          messages: [
            {
              role: 'system',
              content: `You are a helpful study planning assistant. The user is preparing for an exam on ${context.examDate}. 
              Their learning style is ${context.learningStyle || 'not specified'}. 
              They are studying these topics: ${context.topics.join(', ')}.
              Current recommendations: ${JSON.stringify(context.currentRecommendations)}.
              Provide helpful, specific advice and suggestions.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();
      
      // Extract the AI's response
      const aiResponse = data.choices[0].message.content;
      
      // Check if the response suggests adding a task
      let suggestedTask = null;
      if (aiResponse.toLowerCase().includes('add') || aiResponse.toLowerCase().includes('create')) {
        // Parse the response to extract task details
        const taskMatch = aiResponse.match(/add (?:a )?(?:new )?task:?\s*"([^"]+)"\s*(?:with description:?\s*"([^"]+)")?/i);
        if (taskMatch) {
          suggestedTask = {
            title: taskMatch[1],
            description: taskMatch[2] || '',
            duration: 60, // Default duration in minutes
            type: 'study'
          };
        }
      }

      res.status(200).json({
        message: aiResponse,
        suggestedTask
      });
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Google Auth endpoints
  app.get('/api/auth/google/url', (req: Request, res: Response) => {
    try {
      const authUrl = generateGoogleAuthUrl();
      res.status(200).json({ url: authUrl });
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).json({ message: 'Failed to generate Google auth URL' });
    }
  });

  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).send('Missing authorization code');
      }
      
      // Exchange code for tokens
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
          grant_type: 'authorization_code'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Error getting Google tokens:', error);
        return res.status(400).send('Failed to authenticate with Google');
      }
      
      const tokens = await response.json();
      
      // Store tokens in session
      if (req.session) {
        req.session.googleTokens = tokens;
      }
      
      // Redirect to a success page or close the popup
      res.redirect(`${process.env.APP_URL}/auth/google/success`);
    } catch (error) {
      console.error('Error in Google auth callback:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/google/status', (req: Request, res: Response) => {
    const isAuthenticated = !!req.session?.googleTokens;
    res.status(200).json({ authenticated: isAuthenticated });
  });

  app.get('/api/auth/google/logout', (req: Request, res: Response) => {
    if (req.session) {
      delete req.session.googleTokens;
    }
    res.status(200).json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
