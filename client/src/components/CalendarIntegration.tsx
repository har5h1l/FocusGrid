import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarCheck, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { StudyTask } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    // Check if user has previously enabled auto-sync
    const savedAutoSync = localStorage.getItem('calendarAutoSync');
    if (savedAutoSync) {
      setAutoSync(JSON.parse(savedAutoSync));
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
  }, [autoSync]);

  const handleExportToGoogleCalendar = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError(null);
    
    try {
      const result = await exportToGoogleCalendar(
        tasks,
        `StudyPlan: ${planName}`,
        autoSync ? 'full' : 'one-time'
      );
      
      if (!result.success && result.authUrl) {
        // Open OAuth flow in a popup window
        window.open(result.authUrl, '_blank', 'width=600,height=700');
        setExportError("Please authenticate with Google to continue.");
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
        location: task.resource || ''
      };
    });
    
    // Generate iCalendar file content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudySync//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    formattedTasks.forEach(task => {
      icsContent = [
        ...icsContent,
        'BEGIN:VEVENT',
        `UID:${Date.now()}-${Math.random().toString(36).substring(2, 11)}@studysync.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').split('T')[0]}T${new Date().toISOString().replace(/[-:.]/g, '').split('T')[1].split('.')[0]}Z`,
        `DTSTART:${task.start.replace(/[-:.]/g, '').split('T')[0]}T${task.start.replace(/[-:.]/g, '').split('T')[1].split('.')[0]}Z`,
        `DTEND:${task.end.replace(/[-:.]/g, '').split('T')[0]}T${task.end.replace(/[-:.]/g, '').split('T')[1].split('.')[0]}Z`,
        `SUMMARY:${task.title}`,
        `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`,
        `LOCATION:${task.location}`,
        'END:VEVENT'
      ];
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
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Calendar Integration</h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-sync"
            checked={autoSync}
            onCheckedChange={handleToggleAutoSync}
            disabled={!isGoogleAuthenticated}
          />
          <Label htmlFor="auto-sync">Auto-sync with Google Calendar</Label>
        </div>
        {lastSync && (
          <span className="text-sm text-gray-500">
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
              <CalendarCheck className="mr-2 h-4 w-4" />
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
    </div>
  );
} 