import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getTEKSStandards, formatTEKSForPrompt } from "@/lib/teksStandards";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable in server runtime.");
    throw new Error("Server configuration error: OPENAI_API_KEY is not set.");
  }
  if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
    console.error("Malformed OPENAI_API_KEY environment variable in server runtime.");
    throw new Error("Server configuration error: OPENAI_API_KEY appears malformed.");
  }
  return apiKey;
}

function createOpenAIClient() {
  return new OpenAI({ apiKey: getOpenAIKey() });
}

function safeJson(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function callOpenAI(openai: OpenAI, messages: any[]) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.3,
  });
}

function extractScoreFromResult(result: string): number {
  const scoreMatch = result.match(/(?:###\s+)?Instructional Score[:\s]*([0-9]+)/i);
  if (scoreMatch) {
    return Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
  }
  return 75;
}

function extractMetricsFromResult(result: string): {
  coverage_score: number;
  clarity_rating: number;
  engagement_level: number;
  gaps_detected: number;
} {
  const defaults = {
    coverage_score: 75,
    clarity_rating: 75,
    engagement_level: 75,
    gaps_detected: 1,
  };

  const coverageMatch = result.match(/(?:###\s+)?Coverage[:\s]*([0-9]+)/i);
  const clarityMatch = result.match(/(?:###\s+)?Clarity[:\s]*([0-9]+)/i);
  const engagementMatch = result.match(/(?:###\s+)?Engagement[:\s]*([0-9]+)/i);
  const gapsMatch = result.match(/(?:###\s+)?Gaps[\s]*(?:Flagged)?[:\s]*([0-9]+)/i);

  return {
    coverage_score: coverageMatch ? parseInt(coverageMatch[1], 10) : defaults.coverage_score,
    clarity_rating: clarityMatch ? parseInt(clarityMatch[1], 10) : defaults.clarity_rating,
    engagement_level: engagementMatch ? parseInt(engagementMatch[1], 10) : defaults.engagement_level,
    gaps_detected: gapsMatch ? parseInt(gapsMatch[1], 10) : defaults.gaps_detected,
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const cookieStore = await cookies();

    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Handle error silently
            }
          },
        },
      }
    ) as any;

    const { data: { user } } = await anonSupabase.auth.getUser();
    if (!user?.id) {
      return safeJson({ result: null, error: 'Not authenticated' }, 401);
    }

    const grade = String(formData.get("grade") || "");
    const subject = String(formData.get("subject") || "");
    const lectureText = String(formData.get("lecture") || "").trim();
    const audioDurationValue = formData.get("audioDuration");
    const audioDuration = audioDurationValue
      ? Number(audioDurationValue)
      : undefined;

    const files = formData
      .getAll("file")
      .filter(
        (entry): entry is File => entry instanceof File && entry.size > 0
      );

    if (audioDuration && audioDuration > 5400) {
      return safeJson(
        {
          result: null,
          error: "Audio is too long. Please upload a file shorter than 90 minutes.",
        },
        400
      );
    }

    const openai = createOpenAIClient();
    let transcript = lectureText;

    if (files.length > 0) {
      const spokenParts: string[] = [];

      for (const file of files) {
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
        });

        const spokenText = String((transcription as any).text || "").trim();
        if (spokenText) spokenParts.push(spokenText);
      }

      const spokenText = spokenParts.join("\n\n");
      if (spokenText) {
        transcript = transcript
          ? `${transcript}\n\nAudio Transcript:\n${spokenText}`
          : spokenText;
      }
    }

    if (!transcript || transcript.trim().length < 10) {
      return safeJson(
        {
          result: null,
          error: "Please provide lesson notes or upload an audio file for transcription.",
        },
        400
      );
    }

    // Load TEKS standards for this grade/subject combination
    const { standards, overview, found: hasStandards } = getTEKSStandards(grade, subject);
    const teksContext = formatTEKSForPrompt(standards, overview);

    const systemPrompt = `
You are an elite instructional coach analyzing classroom teaching.
Be specific, evidence-based, and actionable.
Provide two distinct types of feedback: (1) Generic instructional quality coaching, and (2) Texas TEKS standards alignment analysis.
`;

    const userPrompt = `
Grade: ${grade}
Subject: ${subject}

${teksContext}

Analyze this lesson transcript and provide feedback in the following structured format (use these exact section headers):

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Gaps Flagged: [number]

=== INSTRUCTIONAL COACHING FEEDBACK ===
Provide generic, high-quality instructional coaching feedback on:
- Key Findings (what was done well, areas for growth)
- Missed Opportunities (where instruction could be enhanced)
- Student Engagement Signals (evidence of student understanding and participation)
- Suggested Next Steps (actionable improvements)

=== TEXAS TEKS STANDARDS ALIGNMENT ===
Provide specific curriculum alignment feedback:
- Standards Addressed (which TEKS standards were explicitly taught or practiced in this lesson)
- Standards Not Observed (which TEKS standards were missing or underdeveloped)
- Standards Mastery Notes (observations about depth and quality of standards instruction)
- Recommendations for Standards Integration (how to better integrate missing standards)

Transcript:
${transcript}
`;

    const completion = await callOpenAI(openai, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const result =
      completion.choices[0]?.message?.content || "No result returned";

    const score = extractScoreFromResult(result);
    const metrics = extractMetricsFromResult(result);

    // Service role client to bypass RLS for the insert
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    ) as any;

    let dbSaved = false;
    let analysisId: string | null = null;

    if (user?.id) {
      const analysisRecord = {
        user_id: user.id,
        grade,
        subject,
        coverage_score: metrics.coverage_score,
        clarity_rating: metrics.clarity_rating,
        engagement_level: metrics.engagement_level,
        gaps_detected: metrics.gaps_detected,
        transcript: transcript.slice(0, 5000),
        result: result.slice(0, 5000),
        created_at: new Date().toISOString(),
      };

      const { data: insertedData, error: dbError } = await serviceSupabase
        .from("analyses")
        .insert([analysisRecord])
        .select()
        .single();

      if (dbError) {
        console.error("DB SAVE ERROR:", dbError);
        console.error("Record being saved:", analysisRecord);
      } else if (insertedData) {
        dbSaved = true;
        analysisId = insertedData.id;
      }
    } else {
      console.error("No authenticated user found when trying to save analysis");
    }

    return safeJson({
      result,
      error: null,
      score,
      saved: dbSaved,
      analysisId,
    });
  } catch (err: any) {
    console.error("ANALYZE ERROR:", err);

    const message = err?.message || "Analysis failed";
    const userError = message.includes("longer than")
      ? "Audio is too long for transcription. Please upload a file under 90 minutes."
      : message;

    return safeJson(
      {
        result: null,
        error: userError,
      },
      400
    );
  }
}