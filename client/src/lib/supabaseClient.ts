import { createClient } from '@supabase/supabase-js';
import { LearningStyle, StudyMaterial, StudyPlan, StudyTask, WeekData } from '@/types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for database tables
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

export interface DbStudyPlan {
  id: string;
  user_id: string;
  course_name: string;
  exam_date: string;
  weekly_study_time: number;
  study_preference: 'short' | 'long';
  learning_style?: LearningStyle;
  study_materials?: StudyMaterial[];
  topics: string[];
  topics_progress?: Record<string, number>;
  resources: string[];
  selected_schedule?: number;
  created_at: string;
}

export interface DbStudyTask {
  id: string;
  study_plan_id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  resource?: string;
  is_completed: boolean;
  task_type: 'study' | 'review' | 'practice';
}

// User Authentication Functions
export async function signUpWithEmail(email: string, password: string, username: string): Promise<{ user: UserProfile | null, error: Error | null }> {
  try {
    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned after signup');
    
    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          username,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (profileError) throw profileError;
    
    return { user: profileData, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: error instanceof Error ? error : new Error('Unknown error during signup') };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: UserProfile | null, error: Error | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned after signin');
    
    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) throw profileError;
    
    return { user: profileData, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: error instanceof Error ? error : new Error('Unknown error during signin') };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error during signout') };
  }
}

// Study Plan Functions
export async function saveStudyPlan(plan: StudyPlan): Promise<{ plan: DbStudyPlan | null, error: Error | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) throw new Error('User not authenticated');
    
    const dbPlan: Omit<DbStudyPlan, 'id'> = {
      user_id: userData.user.id,
      course_name: plan.courseName,
      exam_date: plan.examDate,
      weekly_study_time: plan.weeklyStudyTime,
      study_preference: plan.studyPreference,
      learning_style: plan.learningStyle,
      study_materials: plan.studyMaterials,
      topics: plan.topics,
      topics_progress: plan.topicsProgress,
      resources: plan.resources,
      selected_schedule: plan.selectedSchedule,
      created_at: plan.createdAt || new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('study_plans')
      .insert([dbPlan])
      .select()
      .single();
    
    if (error) throw error;
    
    return { plan: data, error: null };
  } catch (error) {
    console.error('Error saving study plan:', error);
    return { plan: null, error: error instanceof Error ? error : new Error('Unknown error saving plan') };
  }
}

export async function getStudyPlans(): Promise<{ plans: DbStudyPlan[], error: Error | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { plans: data || [], error: null };
  } catch (error) {
    console.error('Error getting study plans:', error);
    return { plans: [], error: error instanceof Error ? error : new Error('Unknown error getting plans') };
  }
}

export async function getStudyPlan(id: string): Promise<{ plan: DbStudyPlan | null, error: Error | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userData.user.id)
      .single();
    
    if (error) throw error;
    
    return { plan: data, error: null };
  } catch (error) {
    console.error('Error getting study plan:', error);
    return { plan: null, error: error instanceof Error ? error : new Error('Unknown error getting plan') };
  }
}

// Study Task Functions
export async function saveStudyTasks(planId: string, tasks: StudyTask[]): Promise<{ success: boolean, error: Error | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) throw new Error('User not authenticated');
    
    // Convert tasks to DB format
    const dbTasks = tasks.map(task => ({
      study_plan_id: planId,
      title: task.title,
      description: task.description || '',
      date: task.date,
      duration: task.duration,
      resource: task.resource || '',
      is_completed: task.isCompleted,
      task_type: task.taskType,
    }));
    
    const { error } = await supabase
      .from('study_tasks')
      .insert(dbTasks);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error saving study tasks:', error);
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error saving tasks') };
  }
}

export async function getStudyTasks(planId: string): Promise<{ tasks: DbStudyTask[], error: Error | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('study_plan_id', planId)
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    return { tasks: data || [], error: null };
  } catch (error) {
    console.error('Error getting study tasks:', error);
    return { tasks: [], error: error instanceof Error ? error : new Error('Unknown error getting tasks') };
  }
}

// Conversion functions to map between API and DB formats
export function convertDbPlanToAppPlan(dbPlan: DbStudyPlan): StudyPlan {
  return {
    id: parseInt(dbPlan.id),
    userId: parseInt(dbPlan.user_id),
    courseName: dbPlan.course_name,
    examDate: dbPlan.exam_date,
    weeklyStudyTime: dbPlan.weekly_study_time,
    studyPreference: dbPlan.study_preference,
    learningStyle: dbPlan.learning_style,
    studyMaterials: dbPlan.study_materials,
    topics: dbPlan.topics,
    topicsProgress: dbPlan.topics_progress,
    resources: dbPlan.resources,
    selectedSchedule: dbPlan.selected_schedule,
    createdAt: dbPlan.created_at,
  };
}

export function convertDbTaskToAppTask(dbTask: DbStudyTask): StudyTask {
  return {
    id: parseInt(dbTask.id),
    studyPlanId: parseInt(dbTask.study_plan_id),
    title: dbTask.title,
    description: dbTask.description,
    date: dbTask.date,
    duration: dbTask.duration,
    resource: dbTask.resource,
    isCompleted: dbTask.is_completed,
    taskType: dbTask.task_type,
  };
} 