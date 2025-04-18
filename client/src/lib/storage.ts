import { StudyPlan } from '@/types';

const STORAGE_KEY = 'study_plans';

export function savePlanToLocal(plan: StudyPlan): void {
  try {
    const existingPlans = loadPlansFromLocal();
    const plans = [...existingPlans, plan];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Error saving plan to localStorage:', error);
  }
}

export function loadPlansFromLocal(): StudyPlan[] {
  try {
    const plansJson = localStorage.getItem(STORAGE_KEY);
    return plansJson ? JSON.parse(plansJson) : [];
  } catch (error) {
    console.error('Error loading plans from localStorage:', error);
    return [];
  }
}

export function updatePlanInLocal(updatedPlan: StudyPlan): void {
  try {
    const plans = loadPlansFromLocal();
    const index = plans.findIndex(p => p.id === updatedPlan.id);
    if (index !== -1) {
      plans[index] = updatedPlan;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    }
  } catch (error) {
    console.error('Error updating plan in localStorage:', error);
  }
}

export function deletePlanFromLocal(planId: string): void {
  try {
    const plans = loadPlansFromLocal();
    const filteredPlans = plans.filter(p => p.id !== planId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPlans));
  } catch (error) {
    console.error('Error deleting plan from localStorage:', error);
  }
} 