export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getChatGPTFeedback } from '../../../utils/openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
const userUsageMap = new Map();

const DAILY_RECORDING_LIMIT = 8;
const DAILY_SECONDS_LIMIT = 7 * 60 * 60; // 7 hours



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractField(result: string, heading: string) {
  const lines = result.split('\n').map((line) => line.trim());
  const headingIndex = lines.findIndex(
    (line) => line.replace(/:$/, '').toLowerCase() === heading.toLowerCase()
  );

  if (headingIndex === -1 || headingIndex + 1 >= lines.length) return null;

  return lines[headingIndex + 1] || null;
}

export async function POST(req: NextRequest) {
  try {
    let lectureText = '';
    let grade = '';
    let subject = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      grade = (formData.get('grade') as string) || '';
      subject = (formData.get('subject') as string) || '';

      if (file && file.type.includes('audio')) {
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: 'gpt-4o-transcribe',
        });

        lectureText = transcription.text;
      } else if (file) {
        lectureText = await file.text();
      }

      const directLecture = formData.get('lecture') as string | null;
      if (!lectureText && directLecture) {
        lectureText = directLecture;
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      lectureText = body.lecture;
      grade = body.grade;
      subject = body.subject;
    }

    if (!lectureText) {
      return NextResponse.json(
        { result: 'No lesson text available for analysis.' },
        { status: 400 }
      );
    }

    const feedback = (await getChatGPTFeedback(
      `Grade: ${grade}, Subject: ${subject}\n\nLesson:\n${lectureText}`
    );

    const coverageRaw = extractField(feedback || "", 'Coverage Score');
    const clarityRaw = extractField(feedback || "", 'Clarity Rating');
    const gapsRaw = extractField(feedback || "", 'Gaps Detected');

    const coverageScore = coverageRaw ? parseInt(coverageRaw.replace('%', '').trim(), 10) : null;
    const gapsDetected = gapsRaw ? parseInt(gapsRaw.trim(), 10) : null;
    const clarityRating = clarityRaw || null;

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const today = new Date().toISOString().slice(0, 10);
    const recordingSeconds = Math.floor(lectureText.length / 15); // rough estimate

    if (user) {
      const usageKey = `${user.id}-${today}`;
      const existing = userUsageMap.get(usageKey) || { count: 0, seconds: 0 };

      const nextCount = existing.count + 1;
      const nextSeconds = existing.seconds + recordingSeconds;

      if (nextCount > DAILY_RECORDING_LIMIT) {
        return NextResponse.json(
          { result: 'You can upload up to 8 recordings per day.' },
          { status: 429 }
        );
      }

      if (nextSeconds > DAILY_SECONDS_LIMIT) {
        return NextResponse.json(
          { result: 'You can upload up to 7 total hours per day.' },
          { status: 429 }
        );
      }

      userUsageMap.set(usageKey, {
        count: nextCount,
        seconds: nextSeconds,
      });
    }


    if (user) {
      const title =
        `${subject || 'Lesson'} ${grade ? `- Grade ${grade}` : ''}`.trim() || 'Untitled Lesson';

      await supabase.from('analyses').insert({
        user_id: user.id,
        title,
        grade,
        subject,
        lesson_text: lectureText,
        analysis_result: feedback,
        coverage_score: Number.isNaN(coverageScore) ? null : coverageScore,
        clarity_rating: clarityRating,
        gaps_detected: Number.isNaN(gapsDetected) ? null : gapsDetected,
      });
    }

    return NextResponse.json({ result: feedback });
  } catch (error) {
    console.error('ANALYZE ROUTE ERROR:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown error analyzing lesson.';

    return NextResponse.json(
      { result: `Error analyzing lesson: ${message}` },
      { status: 500 }
    );
  }
}
