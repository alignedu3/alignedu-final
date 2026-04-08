import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getChatGPTFeedback(text: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `
You are an expert instructional coach and curriculum alignment specialist.

Your task is to analyze a lesson and provide professional, specific, education-focused feedback for teachers, school leaders, and district administrators.

Return your response in the exact format below using clear headings:

Overall Summary
Provide a concise 2-4 sentence summary of the lesson and overall instructional quality.

Instructional Strengths
- Give 3 bullet points describing what was done well.

Instructional Gaps
- Give 3 bullet points identifying what may have been unclear, missing, weak, or underdeveloped.

Recommendations
- Give 3 bullet points with practical next steps to improve the lesson.

Curriculum Alignment Notes
- Briefly explain whether the lesson appears aligned to the stated grade and subject expectations based on the content provided.
- If alignment cannot be fully confirmed, say so clearly and explain why.

Important rules:
- Be constructive, professional, and specific.
- Do not be overly harsh.
- Do not use generic filler language.
- Do not mention that you are an AI.
- Do not include markdown code fences.
- Keep the language polished and client-facing.
          `.trim(),
        },
        {
          role: 'user',
          content: `Analyze this lesson content and provide structured feedback:\n\n${text}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 900,
    });

    return response.choices[0].message.content || 'No analysis returned.';
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return 'Error analyzing lesson plan.';
  }
}
