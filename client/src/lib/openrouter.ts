import { StudyPlan } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'mistral/mistral-7b-instruct';

export async function refinePlanWithAI(plan: StudyPlan): Promise<StudyPlan> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Study Planning App'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert study planner and tutor. Help refine and optimize study plans.'
          },
          {
            role: 'user',
            content: `Please analyze and improve this study plan:
              Course: ${plan.courseName}
              Exam Date: ${plan.examDate}
              Weekly Study Time: ${plan.weeklyStudyTime} hours
              Topics: ${plan.topics.join(', ')}
              Learning Style: ${plan.learningStyle}
              
              Suggest improvements for topic order, time allocation, and study methods.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI suggestions');
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content;

    // Update the plan with AI suggestions
    return {
      ...plan,
      aiSuggestions: suggestions
    };
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    return plan;
  }
} 