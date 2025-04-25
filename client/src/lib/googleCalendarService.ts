import { StudyTask } from "@/types";

export interface GoogleCalendarEvent {
  title: string;
  description: string;
  start: string;
  end: string;
  location?: string;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: {
      method: string;
      minutes: number;
    }[];
  };
}

export interface CalendarSettings {
  defaultReminder: number;
  colorCodeTasks: boolean;
  includeResources: boolean;
  preferredCalendar: string;
  calendarId?: string; // For creating/selecting specific calendars
}

interface CalendarSyncState {
  lastSync: string;
  syncedTasks: Record<number, string>; // Maps task IDs to Google Calendar event IDs
  calendarId: string;
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
    
    // For development fallback
    if (process.env.NODE_ENV === 'development') {
      return '/mock-google-auth';
    }
    
    throw new Error('Could not retrieve Google authentication URL');
  }
}

/**
 * Checks if the user is authenticated with Google
 */
export async function checkGoogleAuth(): Promise<boolean> {
  // For development, simulate authentication
  if (process.env.NODE_ENV === 'development') {
    const mockAuth = localStorage.getItem('mockGoogleAuth');
    if (mockAuth === 'true') {
      return true;
    }
    
    // Check if there's a pending auth that we should auto-approve
    if (localStorage.getItem('pendingAuth') === 'true') {
      localStorage.removeItem('pendingAuth');
      localStorage.setItem('mockGoogleAuth', 'true');
      return true;
    }
    
    return false;
  }
  
  try {
    const response = await fetch('/api/auth/google/status');
    if (!response.ok) {
      return false;
    }
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
  syncMode: 'full' | 'one-time' = 'one-time',
  settings?: CalendarSettings
): Promise<{success: boolean, authUrl?: string, events?: any[]}> {
  // Apply default settings if none provided
  const appliedSettings: CalendarSettings = settings || {
    defaultReminder: 30,
    colorCodeTasks: true,
    includeResources: true,
    preferredCalendar: 'primary'
  };
  
  // For development, simulate Google authentication
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    // Check if we need to simulate authentication
    const isAuthenticated = localStorage.getItem('mockGoogleAuth') === 'true';
    
    if (!isAuthenticated) {
      // Set a flag that we can check later to simulate successful auth
      localStorage.setItem('pendingAuth', 'true');
      
      // Return a mock auth URL
      return {
        success: false,
        authUrl: '/mock-google-auth',
      };
    }
    
    // Format tasks for Google Calendar
    const formattedTasks = formatTasksForGoogleCalendar(tasks, appliedSettings);
    
    // Get current sync state or create new one
    let syncState = getSyncState(tasks[0].studyPlanId);
    
    // Simulate syncing by storing event IDs
    const updatedSyncState: CalendarSyncState = {
      lastSync: new Date().toISOString(),
      syncedTasks: { ...syncState?.syncedTasks } || {},
      calendarId: appliedSettings.preferredCalendar === 'primary' ? 'primary' : 'study-calendar-' + tasks[0].studyPlanId
    };
    
    // Update sync state with new "event IDs"
    tasks.forEach(task => {
      updatedSyncState.syncedTasks[task.id] = `mock-event-${task.id}-${Date.now()}`;
    });
    
    // Store the updated sync state
    saveSyncState(tasks[0].studyPlanId, updatedSyncState);
    
    // Store the sync time for display purposes
    localStorage.setItem('calendarLastSync', new Date().toISOString());
    
    // Store sync mode preference
    if (syncMode === 'full') {
      localStorage.setItem('calendarAutoSync', 'true');
    }
    
    return {
      success: true,
      events: formattedTasks
    };
  }
  
  // Real implementation for production
  try {
    // Get current sync state
    const syncState = getSyncState(tasks[0]?.studyPlanId);
    const existingEventIds = syncState?.syncedTasks || {};
    
    // Format tasks for Google Calendar
    const formattedTasks = formatTasksForGoogleCalendar(tasks, appliedSettings);
    
    // Add event IDs for tasks that were previously synced
    const eventsWithIds = formattedTasks.map((event, index) => {
      const taskId = tasks[index].id;
      if (existingEventIds[taskId]) {
        return {
          ...event,
          eventId: existingEventIds[taskId]
        };
      }
      return event;
    });
    
    // Call the API to sync events
    const response = await fetch('/api/calendar/google/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        events: eventsWithIds,
        calendarName,
        syncMode,
        settings: appliedSettings,
        syncState: syncState || null
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
    
    // Update our sync state with the new event IDs
    if (data.syncState) {
      saveSyncState(tasks[0].studyPlanId, data.syncState);
    }
    
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
  // For development, just update local storage
  if (process.env.NODE_ENV === 'development') {
    localStorage.setItem('calendarAutoSync', 'false');
    return true;
  }
  
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
 * Fetch all calendars the user has access to
 */
export async function fetchUserCalendars(): Promise<{id: string, name: string}[]> {
  // For development, return mock calendars
  if (process.env.NODE_ENV === 'development') {
    return [
      { id: 'primary', name: 'Primary Calendar' },
      { id: 'study-calendar', name: 'Study Calendar' },
      { id: 'work-calendar', name: 'Work Calendar' }
    ];
  }
  
  try {
    const response = await fetch('/api/calendar/google/list');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch calendars');
    }
    
    const data = await response.json();
    return data.calendars;
  } catch (error) {
    console.error('Failed to fetch user calendars:', error);
    throw error;
  }
}

/**
 * Create a new calendar for study plans
 */
export async function createStudyPlanCalendar(name: string): Promise<{id: string, name: string}> {
  // For development, simulate creating a calendar
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    return {
      id: `study-calendar-${Date.now()}`,
      name: name
    };
  }
  
  try {
    const response = await fetch('/api/calendar/google/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create calendar');
    }
    
    const data = await response.json();
    return data.calendar;
  } catch (error) {
    console.error('Failed to create study plan calendar:', error);
    throw error;
  }
}

/**
 * Formats study tasks for Google Calendar
 */
function formatTasksForGoogleCalendar(tasks: StudyTask[], settings: CalendarSettings): GoogleCalendarEvent[] {
  return tasks.map(task => {
    const startDate = new Date(task.date);
    // Use reasonable time values: morning for study, afternoon for practice, evening for review
    let hours = 10; // Default to 10 AM
    
    if (task.taskType === 'practice') {
      hours = 14; // 2 PM
    } else if (task.taskType === 'review') {
      hours = 17; // 5 PM
    }
    
    startDate.setHours(hours, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + task.duration);
    
    // Create a descriptive event
    const description = buildEventDescription(task);
    
    return {
      title: task.title,
      description,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: settings.includeResources ? (task.resource || '') : '',
      colorId: settings.colorCodeTasks ? getColorIdForTaskType(task.taskType) : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: 'popup',
            minutes: settings.defaultReminder
          }
        ]
      }
    };
  });
}

/**
 * Build a rich description for the calendar event
 */
function buildEventDescription(task: StudyTask): string {
  let description = task.description || '';
  
  // Add task details
  const details = [
    `Type: ${capitalizeFirstLetter(task.taskType || 'Study')} Session`,
    `Duration: ${task.duration} minutes`,
    `Resource: ${task.resource || 'Not specified'}`
  ];
  
  // Add a separator if there's already a description
  if (description) {
    description += '\n\n------------------\n\n';
  }
  
  // Add the details
  description += details.join('\n');
  
  // Add a footer with the app name
  description += '\n\n------------------\nCreated by Study Planning App';
  
  return description;
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
  return colorMap[type.toLowerCase()] || colorMap.default;
}

/**
 * Helper function to capitalize first letter
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get the sync state for a study plan
 */
function getSyncState(planId: number): CalendarSyncState | null {
  const key = `calendar-sync-state-${planId}`;
  const savedState = localStorage.getItem(key);
  
  if (savedState) {
    try {
      return JSON.parse(savedState);
    } catch (e) {
      console.error('Failed to parse sync state:', e);
      return null;
    }
  }
  
  return null;
}

/**
 * Save the sync state for a study plan
 */
function saveSyncState(planId: number, state: CalendarSyncState): void {
  const key = `calendar-sync-state-${planId}`;
  localStorage.setItem(key, JSON.stringify(state));
}