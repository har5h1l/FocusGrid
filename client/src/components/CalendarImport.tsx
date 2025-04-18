import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Calendar, FileUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarEvent } from "@/types";

interface CalendarImportProps {
  onImport: (events: CalendarEvent[]) => void;
}

export default function CalendarImport({ onImport }: CalendarImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    start: '',
    end: '',
    allDay: false
  });
  const [importMethod, setImportMethod] = useState<'file' | 'manual'>('file');
  const [previewEvents, setPreviewEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAddManualEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      setError("Please fill in all event details");
      return;
    }

    const startDate = new Date(newEvent.start);
    const endDate = new Date(newEvent.end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Invalid date format");
      return;
    }

    if (startDate > endDate) {
      setError("End date must be after start date");
      return;
    }

    const event: CalendarEvent = {
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      allDay: newEvent.allDay || false
    };

    setManualEvents([...manualEvents, event]);
    setNewEvent({
      title: '',
      start: '',
      end: '',
      allDay: false
    });
    setError(null);
  };

  const parseFile = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    try {
      // This is a simple mock implementation
      // In a real app, we would parse the ICS or CSV file
      const text = await file.text();
      
      // For demo purposes, we'll just create some sample events
      // In real implementation, we would parse the actual file content
      const mockEvents: CalendarEvent[] = [
        {
          title: "Existing Meeting",
          start: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          end: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString()
        },
        {
          title: "Doctor Appointment",
          start: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          end: new Date(Date.now() + 1000 * 60 * 60 * 49).toISOString()
        }
      ];
      
      setPreviewEvents(mockEvents);
      setError(null);
    } catch (err) {
      setError("Failed to parse file. Please try again.");
    }
  };

  const handleImport = () => {
    if (importMethod === 'file' && previewEvents.length > 0) {
      onImport(previewEvents);
    } else if (importMethod === 'manual' && manualEvents.length > 0) {
      onImport(manualEvents);
    } else {
      setError("No events to import");
      return;
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Import Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Calendar Events</DialogTitle>
          <DialogDescription>
            Import your existing calendar events to avoid scheduling conflicts
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4">
          <div className="flex space-x-4">
            <Button 
              variant={importMethod === 'file' ? "default" : "outline"} 
              onClick={() => setImportMethod('file')}
              className="flex-1"
            >
              Import File
            </Button>
            <Button 
              variant={importMethod === 'manual' ? "default" : "outline"} 
              onClick={() => setImportMethod('manual')}
              className="flex-1"
            >
              Add Manually
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importMethod === 'file' && (
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <label htmlFor="calendar-file" className="text-sm text-gray-500">
                  Select ICS or CSV file
                </label>
                <Input 
                  id="calendar-file" 
                  type="file" 
                  accept=".ics,.csv"
                  onChange={handleFileChange} 
                />
              </div>
              
              <Button onClick={parseFile} disabled={!file} className="w-full">
                <FileUp className="mr-2 h-4 w-4" />
                Preview Events
              </Button>

              {previewEvents.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Preview Events</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {previewEvents.map((event, idx) => (
                      <AccordionItem key={idx} value={`event-${idx}`}>
                        <AccordionTrigger className="text-sm">
                          {event.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-sm space-y-1">
                            <p><strong>Start:</strong> {new Date(event.start).toLocaleString()}</p>
                            <p><strong>End:</strong> {new Date(event.end).toLocaleString()}</p>
                            <p><strong>All Day:</strong> {event.allDay ? 'Yes' : 'No'}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          )}

          {importMethod === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="event-title" className="block text-sm text-gray-500 mb-1">
                    Event Title
                  </label>
                  <Input 
                    id="event-title" 
                    placeholder="Meeting, Class, etc." 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>
                <div>
                  <label htmlFor="event-start" className="block text-sm text-gray-500 mb-1">
                    Start Date & Time
                  </label>
                  <Input 
                    id="event-start" 
                    type="datetime-local" 
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                  />
                </div>
                <div>
                  <label htmlFor="event-end" className="block text-sm text-gray-500 mb-1">
                    End Date & Time
                  </label>
                  <Input 
                    id="event-end" 
                    type="datetime-local" 
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({...newEvent, end: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={handleAddManualEvent} className="w-full">
                Add Event
              </Button>

              {manualEvents.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Added Events</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {manualEvents.map((event, idx) => (
                      <AccordionItem key={idx} value={`event-${idx}`}>
                        <AccordionTrigger className="text-sm">
                          {event.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-sm space-y-1">
                            <p><strong>Start:</strong> {new Date(event.start).toLocaleString()}</p>
                            <p><strong>End:</strong> {new Date(event.end).toLocaleString()}</p>
                            <p><strong>All Day:</strong> {event.allDay ? 'Yes' : 'No'}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleImport}
            disabled={(importMethod === 'file' && previewEvents.length === 0) || 
                      (importMethod === 'manual' && manualEvents.length === 0)}
          >
            Import Events
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}