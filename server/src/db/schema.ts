import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// User Schema
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Study Plan Schema
export const studyPlans = sqliteTable('study_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  courseName: text('course_name').notNull(),
  examDate: text('exam_date').notNull(), // Store as ISO string
  weeklyStudyTime: integer('weekly_study_time').notNull(),
  studyPreference: text('study_preference').notNull(), // 'short' or 'long'
  learningStyle: text('learning_style'), // 'visual', 'auditory', 'reading', 'kinesthetic'
  studyMaterials: text('study_materials', { mode: 'json' }).$type<string[]>(), // Array of materials
  topics: text('topics', { mode: 'json' }).notNull().$type<string[]>(),
  topicsProgress: text('topics_progress', { mode: 'json' }).$type<Record<string, number>>(), // topic name -> progress percentage (0-100)
  resources: text('resources', { mode: 'json' }).notNull().$type<string[]>(),
  selectedSchedule: integer('selected_schedule').default(1), // Which schedule variant the user selected
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Study Tasks Schema
export const studyTasks = sqliteTable('study_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studyPlanId: integer('study_plan_id').references(() => studyPlans.id),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date').notNull(), // Store as ISO string
  duration: integer('duration').notNull(), // in minutes
  resource: text('resource'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  taskType: text('task_type').notNull(), // 'study', 'review', 'practice'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Auth Tokens for simple token-based auth
export const authTokens = sqliteTable('auth_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(), // ISO string date
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}); 