import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Study Plan Schema
export const studyPlans = sqliteTable("study_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  courseName: text("course_name").notNull(),
  examDate: text("exam_date").notNull(), // Store as ISO string
  weeklyStudyTime: integer("weekly_study_time").notNull(),
  studyPreference: text("study_preference").notNull(), // 'short' or 'long'
  learningStyle: text("learning_style"), // 'visual', 'auditory', 'reading', 'kinesthetic'
  studyMaterials: text("study_materials", { mode: 'json' }).$type<string[]>(), // 'flashcards', 'videos', 'practice_tests', etc.
  topics: text("topics", { mode: 'json' }).notNull().$type<string[]>(),
  topicsProgress: text("topics_progress", { mode: 'json' }).$type<Record<string, number>>(), // topic name -> progress percentage (0-100)
  resources: text("resources", { mode: 'json' }).notNull().$type<string[]>(),
  selectedSchedule: integer("selected_schedule").default(1), // Which schedule variant the user selected
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type StudyPlan = typeof studyPlans.$inferSelect;

// Study Tasks Schema
export const studyTasks = sqliteTable("study_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyPlanId: integer("study_plan_id").references(() => studyPlans.id),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // Store as ISO string
  duration: integer("duration").notNull(), // in minutes
  resource: text("resource"),
  isCompleted: integer("is_completed", { mode: 'boolean' }).default(false),
  taskType: text("task_type").notNull(), // 'study', 'review', 'practice'
});

export const insertStudyTaskSchema = createInsertSchema(studyTasks).omit({
  id: true,
});

export type InsertStudyTask = z.infer<typeof insertStudyTaskSchema>;
export type StudyTask = typeof studyTasks.$inferSelect;

// Study Week Schema (for calendar view)
export const studyWeeks = sqliteTable("study_weeks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyPlanId: integer("study_plan_id").references(() => studyPlans.id),
  weekStart: text("week_start").notNull(), // Store as ISO string
  weekEnd: text("week_end").notNull(), // Store as ISO string
  mondayTask: text("monday_task", { mode: 'json' }).$type<StudyTask | null>(),
  wednesdayTask: text("wednesday_task", { mode: 'json' }).$type<StudyTask | null>(),
  fridayTask: text("friday_task", { mode: 'json' }).$type<StudyTask | null>(),
  weekendTask: text("weekend_task", { mode: 'json' }).$type<StudyTask | null>(),
});

export const insertStudyWeekSchema = createInsertSchema(studyWeeks).omit({
  id: true,
});

export type InsertStudyWeek = z.infer<typeof insertStudyWeekSchema>;
export type StudyWeek = typeof studyWeeks.$inferSelect;

// Import sql function for default timestamps
import { sql } from "drizzle-orm";
