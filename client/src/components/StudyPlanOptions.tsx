import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookText, ArrowRight } from "lucide-react";
import { GeneratedPlan, WeekData } from "@/types";
import CalendarView from "./CalendarView";

interface StudyPlanOptionsProps {
  plans: GeneratedPlan[];
  onSelect: (planIndex: number) => void;
}

export default function StudyPlanOptions({ plans, onSelect }: StudyPlanOptionsProps) {
  const [selectedPlan, setSelectedPlan] = useState<number>(0);

  const handleSelect = () => {
    onSelect(selectedPlan);
  };

  if (!plans.length) {
    return null;
  }

  // Plan descriptions
  const planDescriptions = [
    {
      title: "Balanced Plan",
      description: "An even distribution of study sessions throughout the week",
      intensity: "medium",
      features: [
        "Regular short study sessions",
        "Balanced topic distribution",
        "Weekly progress tracking",
      ],
    },
    {
      title: "Intensive Plan",
      description: "Fewer, longer study sessions for deep focus",
      intensity: "high",
      features: [
        "Longer, more focused sessions",
        "20% more study time",
        "Deep dive into topics",
      ],
    },
    {
      title: "Flexible Plan",
      description: "More frequent, shorter study sessions for flexibility",
      intensity: "low",
      features: [
        "Multiple short sessions",
        "Spaced repetition",
        "Easy to fit around other commitments",
      ],
    },
  ];

  // Get stats for a plan
  const getPlanStats = (plan: GeneratedPlan) => {
    const totalSessionCount = plan.weeklyTasks.length;
    const totalStudyMinutes = plan.weeklyTasks.reduce((sum, task) => sum + task.duration, 0);
    const totalWeeks = plan.calendarWeeks.length;
    
    return {
      totalSessionCount,
      totalStudyHours: Math.round(totalStudyMinutes / 60),
      avgSessionLength: Math.round(totalStudyMinutes / totalSessionCount),
      totalWeeks,
    };
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">
        Choose Your Study Plan
      </h2>
      
      <Tabs 
        value={selectedPlan.toString()} 
        onValueChange={(value) => setSelectedPlan(parseInt(value))}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          {plans.map((_, index) => (
            <TabsTrigger 
              key={index} 
              value={index.toString()}
              className="flex items-center gap-2"
            >
              <span className="hidden md:inline">
                {planDescriptions[index]?.title || `Plan ${index + 1}`}
              </span>
              <span className="md:hidden">Plan {index + 1}</span>
              {index === selectedPlan && (
                <Badge variant="outline" className="ml-1 text-xs border-primary">
                  Selected
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {plans.map((plan, index) => {
          const stats = getPlanStats(plan);
          const description = planDescriptions[index];
          
          return (
            <TabsContent key={index} value={index.toString()} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Clock className="h-5 w-5 mr-2 text-primary" />
                      Study Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Study Time</p>
                        <p className="text-3xl font-bold">{stats.totalStudyHours} hours</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Average Session</p>
                        <p className="text-xl font-semibold">{stats.avgSessionLength} minutes</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Sessions</p>
                        <p className="text-xl font-semibold">{stats.totalSessionCount} sessions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <BookText className="h-5 w-5 mr-2 text-primary" />
                      Plan Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{description.title}</h3>
                      <p className="text-gray-600">{description.description}</p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900 mb-2">Intensity</p>
                      <div className="flex items-center">
                        <Badge 
                          variant={
                            description.intensity === "high" 
                              ? "default" 
                              : description.intensity === "medium" 
                                ? "secondary" 
                                : "outline"
                          }
                        >
                          {description.intensity.charAt(0).toUpperCase() + description.intensity.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900 mb-2">Features</p>
                      <ul className="space-y-1">
                        {description.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Schedule Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto pb-4">
                    <CalendarView calendarWeeks={plan.calendarWeeks.slice(0, 2)} />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50">
                  <p className="text-sm text-gray-500">
                    Showing 2 of {plan.calendarWeeks.length} weeks. Select this plan to view the full schedule.
                  </p>
                </CardFooter>
              </Card>

              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  onClick={handleSelect}
                  className="px-8"
                >
                  Select This Plan
                </Button>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}