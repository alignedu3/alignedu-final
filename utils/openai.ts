import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getChatGPTFeedback(text: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 1100,
      messages: [
        {
          role: 'system',
          content: `
You are an expert instructional coach, curriculum alignment reviewer, and classroom observation specialist.

Your task is to analyze lesson content and provide professional, specific, education-focused feedback for teachers, school leaders, and district administrators.

Return your response using exactly these section headings in this exact order:

Overall Summary
Instructional Strengths
Instructional Gaps
Recommendations
Curriculum Alignment Notes

Formatting requirements:
- Overall Summary must be 2 to 4 sentences.
- Instructional Strengths must contain exactly 3 bullet points.
- Instructional Gaps must contain exactly 3 bullet points.
- Recommendations must contain exactly 3 bullet points.
- Curriculum Alignment Notes must be 2 to 4 sentences.
- Keep headings exactly as written above.
- Use bullet points only in the three bullet sections.
- Do not include any extra headings or extra sections.

Quality requirements:
- Be constructive, specific, and professional.
- Be polished and client-facing.
- Focus on what was actually taught, what may have been missed, and what should be improved next.
- Help reduce subjectivity by grounding the feedback in the lesson content provided.
- If something cannot be fully confirmed, say so clearly.
- Do not mention that you are an AI.
- Do not include markdown code fences.
- Do not use generic filler language.
- Do not be overly harsh.

Your goal is to provide more objective, consistent instructional feedback based on the lesson content provided.
          `.trim(),
        },
        {
          role: 'user',
          content: `Analyze this lesson content and provide structured instructional feedback:\n\n${text}`,
        },
      ],
    });

    return response.choices[0]?.message?.content || 'No analysis returned.';
  } catch (error: any) {
    console.error('OpenAI error:', error?.status, error?.message, error);
    return `Error analyzing lesson plan: ${error?.message || 'Unknown error'}`;
  }
}
