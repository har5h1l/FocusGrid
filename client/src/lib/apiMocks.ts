/**
 * Mock API helpers for development
 */

// Mock study plan creation
export async function mockCreatePlan(planData: any) {
  console.log('Creating mock plan:', planData);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Initialize topicsProgress
  const topicsProgress = (planData.topics || []).reduce((acc, topic) => {
    acc[topic] = 0; // Default progress is 0
    return acc;
  }, {});

  // Parse initial progress if provided
  if (planData.progress && typeof planData.progress === 'string') {
    const progressString = planData.progress.toLowerCase();
    const completedTopics = [];
    
    // Example parsing: "Finished topics 1, 3" or "Completed unit 1-2"
    const topicMatches = progressString.match(/topics? (\d+(?:, ?\d+)*)/);
    const unitMatches = progressString.match(/units? (\d+)-(\d+)/);
    const singleUnitMatches = progressString.match(/unit (\d+)/);
    
    if (topicMatches && topicMatches[1]) {
      const indices = topicMatches[1].split(/, ?/).map(n => parseInt(n) - 1);
      indices.forEach(index => {
        if (planData.topics[index]) {
          completedTopics.push(planData.topics[index]);
        }
      });
    } else if (unitMatches && unitMatches[1] && unitMatches[2]) {
      const startUnit = parseInt(unitMatches[1]);
      const endUnit = parseInt(unitMatches[2]);
      // Assuming topics are somewhat related to units sequentially
      // This is a simplification - a real app might need explicit topic-unit mapping
      const topicsPerUnit = Math.ceil(planData.topics.length / (planData.topics.length || 1)); // Estimate
      for (let i = (startUnit - 1) * topicsPerUnit; i < endUnit * topicsPerUnit && i < planData.topics.length; i++) {
         if (planData.topics[i]) completedTopics.push(planData.topics[i]);
      }
    } else if (singleUnitMatches && singleUnitMatches[1]) {
       const unitNum = parseInt(singleUnitMatches[1]);
       const topicsPerUnit = Math.ceil(planData.topics.length / (planData.topics.length || 1)); // Estimate
       for (let i = (unitNum - 1) * topicsPerUnit; i < unitNum * topicsPerUnit && i < planData.topics.length; i++) {
         if (planData.topics[i]) completedTopics.push(planData.topics[i]);
       }
    }
    
    // Mark completed topics as 100%
    completedTopics.forEach(topicName => {
      if (topicsProgress.hasOwnProperty(topicName)) {
        topicsProgress[topicName] = 100;
      }
    });
  }
  
  // Create a plan with an ID
  const planId = Date.now(); // Use timestamp as unique ID
  
  // Check if we have an AI-generated plan with weekly structure
  const hasAIStructure = planData.aiWeeklyPlan && planData.aiWeeklyPlan.length > 0;
  
  const plan = {
    id: planId,
    ...planData,
    topicsProgress, // Add initialized progress
    createdAt: new Date().toISOString(),
    // Flag to indicate whether this plan was personalized by AI
    isAIPersonalized: hasAIStructure,
  };
  
  // Store the plan data in localStorage
  localStorage.setItem(`plan_${planId}`, JSON.stringify(plan));
  
  return plan;
}

// Mock plan refinement
export async function mockRefinePlan(refineData: any) {
  console.log('Refining mock plan:', refineData);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate recommendations based on user preferences
  const recommendations = [];
  
  // Study session recommendations based on preference
  if (refineData.studyPreference === 'short') {
    recommendations.push(
      'Break study sessions into 25-minute pomodoro sessions with 5-minute breaks',
      'Use spaced repetition for more effective short-burst learning'
    );
  } else {
    recommendations.push(
      'Start each long session with a 5-minute warm-up to prime your brain',
      'Take a 10-minute break every 50 minutes to maintain focus'
    );
  }
  
  // Learning style recommendations
  if (refineData.learningStyle === 'visual') {
    recommendations.push(
      'Create visual mind maps for each topic',
      'Use color-coding in your notes to highlight key concepts'
    );
  } else if (refineData.learningStyle === 'auditory') {
    recommendations.push(
      'Record yourself explaining concepts and listen during review',
      'Participate in study groups where you can discuss topics verbally'
    );
  } else if (refineData.learningStyle === 'reading') {
    recommendations.push(
      'Take detailed notes and rewrite key concepts in your own words',
      'Create summary sheets for each topic to review before the exam'
    );
  } else if (refineData.learningStyle === 'kinesthetic') {
    recommendations.push(
      'Use flashcards you can physically manipulate',
      'Take breaks to move around when studying complex topics'
    );
  }
  
  // Study materials recommendations
  if (refineData.studyMaterials?.includes('flashcards')) {
    recommendations.push('Create flashcards for key terms and review them daily');
  }
  if (refineData.studyMaterials?.includes('videos')) {
    recommendations.push(`Look for video lectures on ${refineData.courseName} topics`);
  }
  if (refineData.studyMaterials?.includes('practice_tests')) {
    recommendations.push('Take at least one practice test per week to gauge your progress');
  }
  
  // Course-specific recommendations
  if (refineData.courseName.toLowerCase().includes('psychology')) {
    recommendations.push(
      'Focus on understanding key psychological theories rather than just memorizing facts',
      'Practice applying concepts to real-world scenarios'
    );
  } else if (refineData.courseName.toLowerCase().includes('history')) {
    recommendations.push(
      'Create timelines to visualize historical events in sequence',
      'Focus on cause-and-effect relationships between historical events'
    );
  } else if (refineData.courseName.toLowerCase().includes('math') || 
             refineData.courseName.toLowerCase().includes('calculus')) {
    recommendations.push(
      'Practice with different types of problems rather than repeating similar ones',
      'Understand the underlying concepts rather than memorizing formulas'
    );
  }
  
  // Weekly study time recommendations
  if (refineData.weeklyStudyTime < 5) {
    recommendations.push('Maximize your limited study time by focusing on high-priority topics first');
  } else if (refineData.weeklyStudyTime > 10) {
    recommendations.push('Consider breaking up your study time across different subjects to prevent burnout');
  }
  
  // Get the existing plan data
  const existingPlan = JSON.parse(localStorage.getItem(`plan_${refineData.planId}`) || '{}');
  
  // Update the plan with AI recommendations
  const updatedPlan = {
    ...existingPlan,
    aiRecommendations: recommendations.slice(0, 5), // Limit to 5 recommendations
  };
  
  // Save the updated plan
  localStorage.setItem(`plan_${refineData.planId}`, JSON.stringify(updatedPlan));
  
  return updatedPlan;
}

// Mock plan details fetch
export async function mockGetPlan(planId: string) {
  console.log(`Fetching mock plan with id: ${planId}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Get the plan data from local storage or a global state
  const planData = JSON.parse(localStorage.getItem(`plan_${planId}`) || '{}');
  
  // Use the stored plan data or fallback to defaults
  const courseName = planData.courseName || 'Course';
  const examDate = planData.examDate || new Date(Date.now() + 30 * 86400000).toISOString();
  const weeklyStudyTime = planData.weeklyStudyTime || 5;
  const studyPreference = planData.studyPreference || 'short';
  const topics = planData.topics || ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4'];
  const resources = planData.resources || ['Textbook', 'Notes'];
  
  // AI-generated data
  const aiRecommendations = planData.aiRecommendations || [];
  const planSummary = planData.planSummary || '';
  const finalWeekStrategy = planData.finalWeekStrategy || '';
  const aiWeeklyPlan = planData.aiWeeklyPlan || [];
  
  // Generate tasks based on actual topics and resources
  const tasks = topics.flatMap((topic, index) => {
    const resource = resources[index % resources.length] || resources[0];
    const offset = index * 2 * 86400000; // 2 days between each topic
    
    return [
      {
        id: index * 3 + 1,
        studyPlanId: parseInt(planId),
        title: `Study ${topic}`,
        description: `Learn key concepts about ${topic}`,
        date: new Date(Date.now() + offset).toISOString(),
        duration: studyPreference === 'short' ? 30 : 60,
        resource: resource,
        isCompleted: false,
        taskType: 'study',
      },
      {
        id: index * 3 + 2,
        studyPlanId: parseInt(planId),
        title: `Review ${topic}`,
        description: `Review your notes on ${topic}`,
        date: new Date(Date.now() + offset + 86400000).toISOString(), // 1 day after study
        duration: studyPreference === 'short' ? 20 : 45,
        resource: 'Notes',
        isCompleted: false,
        taskType: 'review',
      },
      {
        id: index * 3 + 3,
        studyPlanId: parseInt(planId),
        title: `Practice ${topic}`,
        description: `Complete practice questions on ${topic}`,
        date: new Date(Date.now() + offset + 2 * 86400000).toISOString(), // 2 days after study
        duration: studyPreference === 'short' ? 25 : 50,
        resource: 'Practice Tests',
        isCompleted: false,
        taskType: 'practice',
      }
    ];
  });
  
  // Create topics progress object
  const topicsProgress = topics.reduce((acc, topic) => {
    // Use stored progress if available, otherwise default to 0
    acc[topic] = planData.topicsProgress?.[topic] || 0;
    return acc;
  }, {});
  
  // Sample plan data
  const plan = {
    id: parseInt(planId),
    courseName,
    examDate,
    weeklyStudyTime,
    studyPreference,
    topics,
    resources,
    topicsProgress,
    createdAt: planData.createdAt || new Date(Date.now() - 86400000).toISOString(), // yesterday,
    // Include AI-generated plan data
    aiRecommendations,
    planSummary,
    finalWeekStrategy,
    aiWeeklyPlan
  };
  
  return { plan, tasks };
}

// Mock update task
export async function mockUpdateTask(planId: string, taskId: number, data: any) {
  console.log(`Updating task ${taskId} in plan ${planId}:`, data);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return the updated task
  return {
    id: taskId,
    studyPlanId: parseInt(planId),
    ...data,
  };
}

// Mock function to get all study plans
export async function mockGetAllPlans() {
  console.log('Fetching all mock plans');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find all plan items in localStorage
  const plans = [];
  const tasks = {};
  
  // Get all keys from localStorage
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('plan_')) {
      try {
        const planData = JSON.parse(localStorage.getItem(key) || '{}');
        const planId = parseInt(key.replace('plan_', ''));
        
        // Add plan to array
        plans.push(planData);
        
        // Generate tasks for this plan
        const planTasks = (planData.topics || []).flatMap((topic, index) => {
          const resource = (planData.resources || [])[index % (planData.resources || []).length] || 'Textbook';
          const offset = index * 2 * 86400000; // 2 days between each topic
          const studyPreference = planData.studyPreference || 'short';
          
          // Set completed status based on topic progress
          const isTopicCompleted = planData.topicsProgress?.[topic] === 100;
          
          return [
            {
              id: planId * 1000 + index * 3 + 1,
              studyPlanId: planId,
              title: `Study ${topic}`,
              description: `Learn key concepts about ${topic}`,
              date: new Date(Date.now() + offset).toISOString(),
              duration: studyPreference === 'short' ? 30 : 60,
              resource: resource,
              isCompleted: isTopicCompleted,
              taskType: 'study',
            },
            {
              id: planId * 1000 + index * 3 + 2,
              studyPlanId: planId,
              title: `Review ${topic}`,
              description: `Review your notes on ${topic}`,
              date: new Date(Date.now() + offset + 86400000).toISOString(), // 1 day after study
              duration: studyPreference === 'short' ? 20 : 45,
              resource: 'Notes',
              isCompleted: false,
              taskType: 'review',
            },
            {
              id: planId * 1000 + index * 3 + 3,
              studyPlanId: planId,
              title: `Practice ${topic}`,
              description: `Complete practice questions on ${topic}`,
              date: new Date(Date.now() + offset + 2 * 86400000).toISOString(), // 2 days after study
              duration: studyPreference === 'short' ? 25 : 50,
              resource: 'Practice Tests',
              isCompleted: false,
              taskType: 'practice',
            }
          ];
        });
        
        // Add tasks to the map with plan ID as key
        tasks[planId] = planTasks;
      } catch (error) {
        console.error(`Error parsing plan data for ${key}:`, error);
      }
    }
  }
  
  // If no plans found in localStorage, create sample data
  if (plans.length === 0) {
    const samplePlan = {
      id: 1,
      courseName: 'Sample Psychology Course',
      examDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      weeklyStudyTime: 8,
      studyPreference: 'short',
      topics: ['Cognitive Psychology', 'Social Psychology', 'Research Methods', 'Development'],
      resources: ['Textbook', 'Lecture Notes', 'Practice Questions', 'Online Videos'],
      topicsProgress: {
        'Cognitive Psychology': 75,
        'Social Psychology': 50,
        'Research Methods': 25,
        'Development': 0
      },
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString() // 10 days ago
    };
    
    plans.push(samplePlan);
    
    // Create sample tasks
    const sampleTasks = samplePlan.topics.flatMap((topic, index) => {
      const resource = samplePlan.resources[index % samplePlan.resources.length];
      const offset = index * 2 * 86400000; // 2 days between each topic
      const progress = samplePlan.topicsProgress[topic] || 0;
      
      return [
        {
          id: 1000 + index * 3 + 1,
          studyPlanId: 1,
          title: `Study ${topic}`,
          description: `Learn key concepts about ${topic}`,
          date: new Date(Date.now() + offset).toISOString(),
          duration: 30,
          resource: resource,
          isCompleted: progress >= 50, // Completed if progress is 50% or more
          taskType: 'study',
        },
        {
          id: 1000 + index * 3 + 2,
          studyPlanId: 1,
          title: `Review ${topic}`,
          description: `Review your notes on ${topic}`,
          date: new Date(Date.now() + offset + 86400000).toISOString(), // 1 day after study
          duration: 20,
          resource: 'Notes',
          isCompleted: progress >= 75, // Completed if progress is 75% or more
          taskType: 'review',
        },
        {
          id: 1000 + index * 3 + 3,
          studyPlanId: 1,
          title: `Practice ${topic}`,
          description: `Complete practice questions on ${topic}`,
          date: new Date(Date.now() + offset + 2 * 86400000).toISOString(), // 2 days after study
          duration: 25,
          resource: 'Practice Tests',
          isCompleted: progress === 100, // Completed if progress is 100%
          taskType: 'practice',
        }
      ];
    });
    
    tasks[1] = sampleTasks;
  }
  
  return { plans, tasks };
}