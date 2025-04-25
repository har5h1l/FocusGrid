import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudyPlan, StudyTask } from "../types";
import { format, parseISO, isAfter, isBefore, addDays, differenceInDays } from "date-fns";
import { mockGetAllPlans } from "@/lib/apiMocks";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  BarChart2, 
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Timer
} from "lucide-react";

export default function ProgressTracker() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all study plans
  const { 
    data: plansData, 
    isLoading: isLoadingPlans,
    error: plansError
  } = useQuery({
    queryKey: ["plans"],
    queryFn: () => mockGetAllPlans(),
  });

  // Effect to set first plan as default if available
  useState(() => {
    if (plansData && plansData.plans && plansData.plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plansData.plans[0].id);
    }
  });

  if (isLoadingPlans) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (plansError) {
    toast({
      title: "Error",
      description: "Failed to load study plans.",
      variant: "destructive",
    });
  }

  if (!plansData || plansData.plans.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Study Plans</h2>
        <p className="text-gray-500">You haven't created any study plans yet. Go to the Create Plan tab to get started.</p>
      </div>
    );
  }

  const selectedPlan = plansData.plans.find(plan => plan.id === selectedPlanId);
  const tasks = selectedPlanId ? plansData.tasks[selectedPlanId] || [] : [];

  // Calculate progress metrics
  const calculateProgress = () => {
    if (!tasks || !selectedPlan) return { 
      completed: 0, 
      total: 0, 
      percentComplete: 0, 
      daysRemaining: 0,
      completedByType: {study: 0, review: 0, practice: 0},
      totalByType: {study: 0, review: 0, practice: 0},
      topicProgress: []
    };
    
    const completed = tasks.filter(task => task.isCompleted).length;
    const total = tasks.length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const examDate = parseISO(selectedPlan.examDate);
    const today = new Date();
    const daysRemaining = Math.max(0, differenceInDays(examDate, today));
    
    // Calculate completion by task type
    const completedByType = {
      study: tasks.filter(task => task.taskType === 'study' && task.isCompleted).length,
      review: tasks.filter(task => task.taskType === 'review' && task.isCompleted).length,
      practice: tasks.filter(task => task.taskType === 'practice' && task.isCompleted).length
    };
    
    const totalByType = {
      study: tasks.filter(task => task.taskType === 'study').length,
      review: tasks.filter(task => task.taskType === 'review').length,
      practice: tasks.filter(task => task.taskType === 'practice').length
    };

    // Calculate progress by topic
    const topicProgress = selectedPlan.topics.map(topic => {
      const topicTasks = tasks.filter(task => task.title.includes(topic));
      const topicCompleted = topicTasks.filter(task => task.isCompleted).length;
      const progress = topicTasks.length > 0 ? (topicCompleted / topicTasks.length) * 100 : 0;
      
      return {
        name: topic,
        progress: Math.round(progress),
        completed: topicCompleted,
        total: topicTasks.length
      };
    });
    
    return { 
      completed, 
      total, 
      percentComplete, 
      daysRemaining,
      completedByType,
      totalByType,
      topicProgress
    };
  };

  // Find upcoming tasks
  const findUpcomingTasks = () => {
    if (!tasks) return [];
    
    const today = new Date();
    const upcomingDate = addDays(today, 7);
    
    return tasks
      .filter(task => !task.isCompleted && isBefore(parseISO(task.date), upcomingDate) && isAfter(parseISO(task.date), today))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 5);
  };

  // Generate daily activity data
  const generateDailyActivity = () => {
    if (!tasks) return [];
    
    // Get tasks completed in the last 30 days
    const today = new Date();
    const thirtyDaysAgo = addDays(today, -30);
    
    // Create a map of dates to count of completed tasks
    const activityMap = new Map();
    
    // Initialize with the past 30 days
    for (let i = 30; i >= 0; i--) {
      const date = format(addDays(today, -i), 'yyyy-MM-dd');
      activityMap.set(date, 0);
    }
    
    // Fill in with actual completion data
    tasks.forEach(task => {
      if (task.isCompleted) {
        const taskDate = parseISO(task.date);
        if (isAfter(taskDate, thirtyDaysAgo)) {
          const dateKey = format(taskDate, 'yyyy-MM-dd');
          if (activityMap.has(dateKey)) {
            activityMap.set(dateKey, activityMap.get(dateKey) + 1);
          } else {
            activityMap.set(dateKey, 1);
          }
        }
      }
    });
    
    // Convert to array for chart
    return Array.from(activityMap).map(([date, count]) => ({
      date: format(parseISO(date), 'MMM d'),
      tasks: count
    }));
  };

  const { 
    completed, 
    total, 
    percentComplete, 
    daysRemaining,
    completedByType,
    totalByType,
    topicProgress
  } = calculateProgress();
  const upcomingTasks = findUpcomingTasks();
  const dailyActivity = generateDailyActivity();

  // Prepare data for the pie chart
  const pieData = [
    { name: 'Completed', value: completed, color: '#4ade80' },
    { name: 'Remaining', value: total - completed, color: '#e2e8f0' }
  ];

  // Prepare data for the task type chart
  const taskTypeData = [
    { 
      name: 'Study', 
      completed: completedByType.study, 
      remaining: totalByType.study - completedByType.study 
    },
    { 
      name: 'Review', 
      completed: completedByType.review, 
      remaining: totalByType.review - completedByType.review 
    },
    { 
      name: 'Practice', 
      completed: completedByType.practice, 
      remaining: totalByType.practice - completedByType.practice 
    },
  ];

  const downloadProgressReport = () => {
    if (!selectedPlan) return;
    
    // Create report content
    let report = `# Progress Report for ${selectedPlan.courseName}\n`;
    report += `Date: ${format(new Date(), 'MMMM d, yyyy')}\n\n`;
    report += `## Overview\n`;
    report += `- Overall Progress: ${percentComplete}% (${completed}/${total} tasks completed)\n`;
    report += `- Days Until Exam: ${daysRemaining}\n`;
    report += `- Weekly Study Time: ${selectedPlan.weeklyStudyTime} hours\n\n`;
    
    report += `## Progress by Topic\n`;
    topicProgress.forEach(topic => {
      report += `- ${topic.name}: ${topic.progress}% (${topic.completed}/${topic.total} tasks completed)\n`;
    });
    
    report += `\n## Progress by Task Type\n`;
    report += `- Study: ${completedByType.study}/${totalByType.study} tasks completed\n`;
    report += `- Review: ${completedByType.review}/${totalByType.review} tasks completed\n`;
    report += `- Practice: ${completedByType.practice}/${totalByType.practice} tasks completed\n\n`;
    
    report += `## Upcoming Tasks\n`;
    upcomingTasks.forEach(task => {
      report += `- ${task.title} - ${format(parseISO(task.date), 'MMMM d')} (${task.duration} min)\n`;
    });
    
    // Create and download the file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${selectedPlan.courseName.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Progress Tracker</h1>
        <Button 
          variant="outline" 
          onClick={downloadProgressReport}
          disabled={!selectedPlanId}
          className="flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
      
      <div className="max-w-xs mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Study Plan
        </label>
        <Select 
          onValueChange={(value) => setSelectedPlanId(parseInt(value))}
          defaultValue={selectedPlanId?.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a study plan" />
          </SelectTrigger>
          <SelectContent>
            {plansData.plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id.toString()}>
                {plan.courseName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPlanId ? (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium">
                  <CheckCircle className="h-4 w-4 text-primary mr-2" />
                  Tasks Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completed} / {total}</div>
                <Progress value={percentComplete} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{percentComplete}% complete</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium">
                  <CalendarIcon className="h-4 w-4 text-primary mr-2" />
                  Days Until Exam
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysRemaining}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Exam date: {selectedPlan ? format(parseISO(selectedPlan.examDate), 'MMMM d, yyyy') : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium">
                  <Timer className="h-4 w-4 text-primary mr-2" />
                  Study Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {percentComplete < 25 ? 'Just Starting' : 
                   percentComplete < 50 ? 'Making Progress' : 
                   percentComplete < 75 ? 'Well Underway' : 
                   percentComplete < 100 ? 'Almost Done' : 'Complete!'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {daysRemaining > 14 ? 'Plenty of time left' : 
                   daysRemaining > 7 ? 'Getting closer' : 
                   daysRemaining > 0 ? 'Crunch time!' : 'Exam day has passed'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress Overview Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                  Progress Overview
                </CardTitle>
                <CardDescription>
                  Your overall task completion status
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => [`${value} tasks`, null]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-primary" />
                  Task Type Breakdown
                </CardTitle>
                <CardDescription>
                  Progress by study activity type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill="#4ade80" name="Completed" />
                    <Bar dataKey="remaining" stackId="a" fill="#e2e8f0" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Topic Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Topic Progress
              </CardTitle>
              <CardDescription>
                Your progress broken down by course topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topicProgress.map((topic, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{topic.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {topic.progress}% ({topic.completed}/{topic.total})
                      </span>
                    </div>
                    <Progress value={topic.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Activity Trend
              </CardTitle>
              <CardDescription>
                Tasks completed over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#8884d8" 
                    name="Tasks Completed" 
                    dot={{ r: 3 }}
                    activeDot={{ r: 7 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                Upcoming Tasks
              </CardTitle>
              <CardDescription>
                Tasks you need to complete in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="py-3 flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {task.taskType === 'study' ? (
                          <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
                        ) : task.taskType === 'review' ? (
                          <BarChart2 className="h-5 w-5 text-purple-500 mt-0.5" />
                        ) : (
                          <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.resource} • {task.duration} minutes
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {format(parseISO(task.date), 'EEEE, MMM d')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-3" />
                  <p>No upcoming tasks for the next 7 days</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">No Study Plan Selected</h2>
          <p className="text-muted-foreground">Please select a study plan to view your progress.</p>
        </div>
      )}
    </div>
  );
}
