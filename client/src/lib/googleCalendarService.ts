import { StudyTask } from "@/types";

export interface GoogleCalendarEvent {
  title: string;
  description: string;
  start: string;
  end: string;
  location?: string;
  colorId?: string;
}

/**
 * Gets the Google OAuth URL for authorization
 */
export async function getGoogleAuthUrl(): Promise<string> {
  try {
    const response = await fetch('/api/auth/google/url');
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Failed to get Google auth URL:', error);
    throw new Error('Could not retrieve Google authentication URL');
  }
}

/**
 * Checks if the user is authenticated with Google
 */
export async function checkGoogleAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/google/status');
    const data = await response.json();
    return data.authenticated;
  } catch (error) {
    console.error('Error checking Google auth status:', error);
    return false;
  }
}

/**
 * Exports study tasks to Google Calendar
 */
export async function exportToGoogleCalendar(
  tasks: StudyTask[],
  calendarName: string,
  syncMode: 'full' | 'one-time' = 'one-time'
): Promise<{success: boolean, authUrl?: string, events?: any[]}> {
  const formattedTasks = formatTasksForGoogleCalendar(tasks);
  
  try {
    const response = await fetch('/api/calendar/google/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        events: formattedTasks,
        calendarName,
        syncMode
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // If we need authentication, return the auth URL
      if (response.status === 401 && errorData.authUrl) {
        return {
          success: false,
          authUrl: errorData.authUrl
        };
      }
      
      throw new Error(errorData.message || 'Failed to export to Google Calendar');
    }
    
    const data = await response.json();
    return {
      success: true,
      events: data.events
    };
  } catch (error) {
    console.error('Failed to export to Google Calendar:', error);
    throw error;
  }
}

/**
 * Disables Google Calendar sync
 */
export async function disableGoogleCalendarSync(): Promise<boolean> {
  try {
    const response = await fetch('/api/calendar/google/disable-sync', {
      method: 'POST'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to disable Google Calendar sync');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to disable Google Calendar sync:', error);
    return false;
  }
}

/**
 * Formats study tasks for Google Calendar
 */
function formatTasksForGoogleCalendar(tasks: StudyTask[]): GoogleCalendarEvent[] {
  return tasks.map(task => {
    const startDate = new Date(task.date);
    startDate.setHours(10, 0, 0, 0); // Default to 10 AM
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + task.duration);
    
    return {
      title: task.title,
      description: task.description || '',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: task.resource || '',
      colorId: getColorIdForTaskType(task.taskType)
    };
  });
}

/**
 * Gets a color ID for a task type
 */
function getColorIdForTaskType(type: string = 'study'): string {
  const colorMap: Record<string, string> = {
    'study': '1',   // Blue (Learning)
    'review': '2',  // Green (Reinforcement)
    'practice': '3', // Purple (Application)
    'break': '4',    // Yellow (Rest)
    'default': '5'   // Gray (Other)
  };
  return colorMap[type] || colorMap.default;
} 