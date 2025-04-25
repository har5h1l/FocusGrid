import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  CalendarCheck, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Calendar,
  GoogleChrome,
  Info
} from "lucide-react";
import { StudyTask } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportToGoogleCalendar, disableGoogleCalendarSync, checkGoogleAuth } from "@/lib/googleCalendarService";

interface CalendarIntegrationProps {
  tasks: StudyTask[];
  planName: string;
  onSync?: () => void;
}

export default function CalendarIntegration({ tasks, planName, onSync }: CalendarIntegrationProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState({
    defaultReminder: 30,
    colorCodeTasks: true,
    includeResources: true,
    preferredCalendar: 'primary'
  });

  useEffect(() => {
    // Check if user has previously enabled auto-sync and get settings
    const savedAutoSync = localStorage.getItem('calendarAutoSync');
    if (savedAutoSync) {
      setAutoSync(JSON.parse(savedAutoSync));
    }

    // Load calendar settings if they exist
    const savedSettings = localStorage.getItem('calendarSettings');
    if (savedSettings) {
      try {
        setCalendarSettings({...calendarSettings, ...JSON.parse(savedSettings)});
      } catch (e) {
        console.error('Failed to parse calendar settings');
      }
    }

    // Check last sync time
    const savedLastSync = localStorage.getItem('calendarLastSync');
    if (savedLastSync) {
      setLastSync(new Date(savedLastSync));
    }
    
    // Check Google auth status
    const checkAuth = async () => {
      const isAuthenticated = await checkGoogleAuth();
      setIsGoogleAuthenticated(isAuthenticated);
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    // Save auto-sync preference
    localStorage.setItem('calendarAutoSync', JSON.stringify(autoSync));
    
    // Save calendar settings
    localStorage.setItem('calendarSettings', JSON.stringify(calendarSettings));
  }, [autoSync, calendarSettings]);

  const handleExportToGoogleCalendar = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError(null);
    
    try {
      const result = await exportToGoogleCalendar(
        tasks,
        `StudyPlan: ${planName}`,
        autoSync ? 'full' : 'one-time',
        calendarSettings
      );
      
      if (!result.success && result.authUrl) {
        // Open OAuth flow in a popup window
        const popup = window.open(result.authUrl, 'googleAuthPopup', 'width=600,height=700');
        
        // Poll to check if the popup was closed
        const checkPopupClosed = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopupClosed);
            // Check if auth was successful after popup closes
            checkGoogleAuth().then(isAuthenticated => {
              setIsGoogleAuthenticated(isAuthenticated);
              if (isAuthenticated) {
                // Try again if authentication was successful
                handleExportToGoogleCalendar();
              }
            });
          }
        }, 1000);
        
        setExportError("Please complete the Google authentication process.");
      } else {
        setExportSuccess(true);
        setLastSync(new Date());
        localStorage.setItem('calendarLastSync', new Date().toISOString());
        setIsGoogleAuthenticated(true);
        
        if (onSync) {
          onSync();
        }
      }
    } catch (error) {
      console.error('Failed to export to Google Calendar:', error);
      setExportError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const newAutoSync = !autoSync;
    setAutoSync(newAutoSync);
    
    if (newAutoSync) {
      // Enable auto-sync
      await handleExportToGoogleCalendar();
    } else {
      // Disable auto-sync
      try {
        await disableGoogleCalendarSync();
      } catch (error) {
        console.error('Failed to disable auto-sync:', error);
      }
    }
  };

  const handleGenerateICS = () => {
    // Format tasks for iCalendar
    const formattedTasks = tasks.map(task => {
      const startDate = new Date(task.date);
      startDate.setHours(10, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + task.duration);
      
      return {
        title: task.title,
        description: task.description || '',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        location: calendarSettings.includeResources ? (task.resource || '') : ''
      };
    });
    
    // Generate iCalendar file content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FocusGrid//Study Plan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Study Plan - ' + planName
    ];
    
    formattedTasks.forEach(task => {
      icsContent = [
        ...icsContent,
        'BEGIN:VEVENT',
        `UID:${Date.now()}-${Math.random().toString(36).substring(2, 11)}@focusgrid.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').split('T')[0]}T${new Date().toISOString().replace(/[-:.]/g, '').split('T')[1].split('.')[0]}Z`,
        `DTSTART:${task.start.replace(/[-:.]/g, '').split('T')[0]}T${task.start.replace(/[-:.]/g, '').split('T')[1].split('.')[0]}Z`,
        `DTEND:${task.end.replace(/[-:.]/g, '').split('T')[0]}T${task.end.replace(/[-:.]/g, '').split('T')[1].split('.')[0]}Z`,
        `SUMMARY:${task.title}`,
        `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`,
        task.location ? `LOCATION:${task.location}` : '',
        `BEGIN:VALARM`,
        `ACTION:DISPLAY`,
        `DESCRIPTION:Reminder`,
        `TRIGGER:-PT${calendarSettings.defaultReminder}M`,
        `END:VALARM`,
        'END:VEVENT'
      ].filter(Boolean); // Remove empty strings
    });
    
    icsContent.push('END:VCALENDAR');
    
    // Create and download the file
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study-plan-${planName.replace(/\s+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setCalendarSettings(prevSettings => ({
      ...prevSettings,
      [key]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Calendar Integration</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowCalendarSettings(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-sync"
            checked={autoSync}
            onCheckedChange={handleToggleAutoSync}
            disabled={!isGoogleAuthenticated}
          />
          <div className="flex items-center">
            <Label htmlFor="auto-sync" className="mr-1">Auto-sync with Google Calendar</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px] text-xs">
                    When enabled, changes to your study plan will automatically sync to your Google Calendar
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {lastSync && (
          <span className="text-xs text-muted-foreground">
            Last synced: {lastSync.toLocaleString()}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleExportToGoogleCalendar}
          disabled={isExporting}
          className="flex-1"
          variant={isGoogleAuthenticated ? "default" : "outline"}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <GoogleChrome className="mr-2 h-4 w-4" />
              {isGoogleAuthenticated ? "Sync to Google Calendar" : "Connect Google Calendar"}
            </>
          )}
        </Button>
        
        <Button
          onClick={handleGenerateICS}
          variant="outline"
          className="flex-1"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Download Calendar File (.ics)
        </Button>
      </div>

      {exportSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CalendarCheck className="h-4 w-4 text-green-600" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>Your study plan has been synced to Google Calendar.</AlertDescription>
        </Alert>
      )}

      {exportError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTitle className="text-red-600">Error</AlertTitle>
          <AlertDescription className="text-red-800">{exportError}</AlertDescription>
        </Alert>
      )}

      {/* Calendar Settings Dialog */}
      <Dialog open={showCalendarSettings} onOpenChange={setShowCalendarSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calendar Settings</DialogTitle>
            <DialogDescription>
              Configure how your study plan integrates with your calendar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Default Reminder Time</Label>
              <Select
                defaultValue={calendarSettings.defaultReminder.toString()}
                onValueChange={(value) => handleSettingsChange('defaultReminder', parseInt(value))}
              >
                <SelectTrigger id="reminder-time">
                  <SelectValue placeholder="Select reminder time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="color-code"
                checked={calendarSettings.colorCodeTasks}
                onCheckedChange={(checked) => 
                  handleSettingsChange('colorCodeTasks', checked === true)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="color-code"
                  className="text-sm font-medium leading-none"
                >
                  Color-code tasks by type
                </Label>
                <p className="text-sm text-muted-foreground">
                  Study, review, and practice sessions will use different colors
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="include-resources"
                checked={calendarSettings.includeResources}
                onCheckedChange={(checked) => 
                  handleSettingsChange('includeResources', checked === true)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="include-resources"
                  className="text-sm font-medium leading-none"
                >
                  Include resources as location
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add the resource name as the location for each calendar event
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preferred-calendar">Preferred Calendar</Label>
              <Select
                defaultValue={calendarSettings.preferredCalendar}
                onValueChange={(value) => handleSettingsChange('preferredCalendar', value)}
              >
                <SelectTrigger id="preferred-calendar">
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Calendar</SelectItem>
                  <SelectItem value="create-new">Create New Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setShowCalendarSettings(false)}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}