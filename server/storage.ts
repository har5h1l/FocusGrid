import {
  users, type User, type InsertUser,
  studyPlans, type StudyPlan, type InsertStudyPlan,
  studyTasks, type StudyTask, type InsertStudyTask,
  studyWeeks, type StudyWeek, type InsertStudyWeek
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Study Plans
  getStudyPlan(id: number): Promise<StudyPlan | undefined>;
  getAllStudyPlans(): Promise<StudyPlan[]>;
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  updateStudyPlan(id: number, plan: Partial<InsertStudyPlan>): Promise<StudyPlan | undefined>;
  deleteStudyPlan(id: number): Promise<boolean>;
  
  // Study Tasks
  getStudyTask(id: number): Promise<StudyTask | undefined>;
  getTasksByPlanId(planId: number): Promise<StudyTask[]>;
  createStudyTask(task: InsertStudyTask): Promise<StudyTask>;
  updateStudyTask(id: number, task: Partial<InsertStudyTask>): Promise<StudyTask | undefined>;
  deleteStudyTask(id: number): Promise<boolean>;
  markTaskComplete(id: number, isCompleted: boolean): Promise<StudyTask | undefined>;
  
  // Study Weeks (Calendar)
  getStudyWeek(id: number): Promise<StudyWeek | undefined>;
  getWeeksByPlanId(planId: number): Promise<StudyWeek[]>;
  createStudyWeek(week: InsertStudyWeek): Promise<StudyWeek>;
  updateStudyWeek(id: number, week: Partial<InsertStudyWeek>): Promise<StudyWeek | undefined>;
  deleteStudyWeek(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private studyPlans: Map<number, StudyPlan>;
  private studyTasks: Map<number, StudyTask>;
  private studyWeeks: Map<number, StudyWeek>;
  private userId: number;
  private planId: number;
  private taskId: number;
  private weekId: number;

  constructor() {
    this.users = new Map();
    this.studyPlans = new Map();
    this.studyTasks = new Map();
    this.studyWeeks = new Map();
    this.userId = 1;
    this.planId = 1;
    this.taskId = 1;
    this.weekId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Study Plan methods
  async getStudyPlan(id: number): Promise<StudyPlan | undefined> {
    return this.studyPlans.get(id);
  }

  async getAllStudyPlans(): Promise<StudyPlan[]> {
    return Array.from(this.studyPlans.values());
  }

  async createStudyPlan(insertPlan: InsertStudyPlan): Promise<StudyPlan> {
    const id = this.planId++;
    const now = new Date();
    
    // Set default values for new fields if not provided
    const plan: StudyPlan = { 
      ...insertPlan, 
      id,
      userId: insertPlan.userId || null,
      learningStyle: insertPlan.learningStyle || null,
      studyMaterials: insertPlan.studyMaterials || [],
      topicsProgress: insertPlan.topicsProgress || {},
      selectedSchedule: insertPlan.selectedSchedule || 1,
      createdAt: now
    };
    
    this.studyPlans.set(id, plan);
    return plan;
  }

  async updateStudyPlan(id: number, planUpdate: Partial<InsertStudyPlan>): Promise<StudyPlan | undefined> {
    const existingPlan = this.studyPlans.get(id);
    if (!existingPlan) {
      return undefined;
    }

    const updatedPlan: StudyPlan = {
      ...existingPlan,
      ...planUpdate,
    };
    this.studyPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteStudyPlan(id: number): Promise<boolean> {
    return this.studyPlans.delete(id);
  }

  // Study Task methods
  async getStudyTask(id: number): Promise<StudyTask | undefined> {
    return this.studyTasks.get(id);
  }

  async getTasksByPlanId(planId: number): Promise<StudyTask[]> {
    return Array.from(this.studyTasks.values()).filter(
      (task) => task.studyPlanId === planId,
    );
  }

  async createStudyTask(insertTask: InsertStudyTask): Promise<StudyTask> {
    const id = this.taskId++;
    const task: StudyTask = { ...insertTask, id };
    this.studyTasks.set(id, task);
    return task;
  }

  async updateStudyTask(id: number, taskUpdate: Partial<InsertStudyTask>): Promise<StudyTask | undefined> {
    const existingTask = this.studyTasks.get(id);
    if (!existingTask) {
      return undefined;
    }

    const updatedTask: StudyTask = {
      ...existingTask,
      ...taskUpdate,
    };
    this.studyTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteStudyTask(id: number): Promise<boolean> {
    return this.studyTasks.delete(id);
  }

  async markTaskComplete(id: number, isCompleted: boolean): Promise<StudyTask | undefined> {
    const existingTask = this.studyTasks.get(id);
    if (!existingTask) {
      return undefined;
    }

    const updatedTask: StudyTask = {
      ...existingTask,
      isCompleted,
    };
    this.studyTasks.set(id, updatedTask);
    return updatedTask;
  }

  // Study Week methods
  async getStudyWeek(id: number): Promise<StudyWeek | undefined> {
    return this.studyWeeks.get(id);
  }

  async getWeeksByPlanId(planId: number): Promise<StudyWeek[]> {
    return Array.from(this.studyWeeks.values()).filter(
      (week) => week.studyPlanId === planId,
    );
  }

  async createStudyWeek(insertWeek: InsertStudyWeek): Promise<StudyWeek> {
    const id = this.weekId++;
    const week: StudyWeek = { ...insertWeek, id };
    this.studyWeeks.set(id, week);
    return week;
  }

  async updateStudyWeek(id: number, weekUpdate: Partial<InsertStudyWeek>): Promise<StudyWeek | undefined> {
    const existingWeek = this.studyWeeks.get(id);
    if (!existingWeek) {
      return undefined;
    }

    const updatedWeek: StudyWeek = {
      ...existingWeek,
      ...weekUpdate,
    };
    this.studyWeeks.set(id, updatedWeek);
    return updatedWeek;
  }

  async deleteStudyWeek(id: number): Promise<boolean> {
    return this.studyWeeks.delete(id);
  }
}

export const storage = new MemStorage();
