import express from 'express';
import { db, studyPlans, studyTasks } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check authentication
router.use(auth);

// Get all study plans for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const plans = await db.select()
      .from(studyPlans)
      .where(eq(studyPlans.userId, userId))
      .orderBy(desc(studyPlans.createdAt))
      .execute();
    
    return res.status(200).json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific study plan
router.get('/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [plan] = await db.select()
      .from(studyPlans)
      .where(and(
        eq(studyPlans.id, planId),
        eq(studyPlans.userId, userId)
      ))
      .execute();
    
    if (!plan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }
    
    // Get associated tasks
    const tasks = await db.select()
      .from(studyTasks)
      .where(eq(studyTasks.studyPlanId, planId))
      .execute();
    
    return res.status(200).json({ plan, tasks });
  } catch (error) {
    console.error('Get plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new study plan
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const {
      courseName,
      examDate,
      weeklyStudyTime,
      studyPreference,
      learningStyle,
      studyMaterials,
      topics,
      resources,
    } = req.body;
    
    // Validate required fields
    if (!courseName || !examDate || !weeklyStudyTime || !studyPreference || !topics || !resources) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Initialize topics progress
    const topicsProgress = topics.reduce((acc: Record<string, number>, topic: string) => {
      acc[topic] = 0;
      return acc;
    }, {});
    
    // Create new study plan
    const [newPlan] = await db.insert(studyPlans)
      .values({
        userId,
        courseName,
        examDate,
        weeklyStudyTime,
        studyPreference,
        learningStyle,
        studyMaterials,
        topics,
        topicsProgress,
        resources,
      })
      .returning()
      .execute();
    
    return res.status(201).json(newPlan);
  } catch (error) {
    console.error('Create plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a study plan
router.put('/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if plan exists and belongs to user
    const [existingPlan] = await db.select()
      .from(studyPlans)
      .where(and(
        eq(studyPlans.id, planId),
        eq(studyPlans.userId, userId)
      ))
      .execute();
    
    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }
    
    // Update the plan
    const [updatedPlan] = await db.update(studyPlans)
      .set(req.body)
      .where(eq(studyPlans.id, planId))
      .returning()
      .execute();
    
    return res.status(200).json(updatedPlan);
  } catch (error) {
    console.error('Update plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a study plan
router.delete('/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if plan exists and belongs to user
    const [existingPlan] = await db.select()
      .from(studyPlans)
      .where(and(
        eq(studyPlans.id, planId),
        eq(studyPlans.userId, userId)
      ))
      .execute();
    
    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }
    
    // Delete associated tasks first
    await db.delete(studyTasks)
      .where(eq(studyTasks.studyPlanId, planId))
      .execute();
    
    // Delete the plan
    await db.delete(studyPlans)
      .where(eq(studyPlans.id, planId))
      .execute();
    
    return res.status(204).send();
  } catch (error) {
    console.error('Delete plan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a task for a study plan
router.post('/:id/tasks', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if plan exists and belongs to user
    const [existingPlan] = await db.select()
      .from(studyPlans)
      .where(and(
        eq(studyPlans.id, planId),
        eq(studyPlans.userId, userId)
      ))
      .execute();
    
    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }
    
    const { title, description, date, duration, resource, taskType } = req.body;
    
    // Validate required fields
    if (!title || !date || !duration || !taskType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the task
    const [newTask] = await db.insert(studyTasks)
      .values({
        studyPlanId: planId,
        title,
        description,
        date,
        duration,
        resource,
        taskType,
      })
      .returning()
      .execute();
    
    return res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as planRoutes }; 