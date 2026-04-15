import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getTEKSStandards, formatTEKSForPrompt } from "@/lib/teksStandards";
import { STAAR_SUBJECTS } from "@/lib/staarSubjects";
import { getAdminVisibility } from "@/lib/adminVisibility";

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
  assessment_quality: number;
  gaps_detected: number;
} {
  const defaults = {
    coverage_score: 75,
    clarity_rating: 75,
    engagement_level: 75,
    assessment_quality: 75,
    gaps_detected: 1,
  };

  const coverageMatch = result.match(/(?:###\s+)?Coverage[:\s]*([0-9]+)/i);
  const clarityMatch = result.match(/(?:###\s+)?Clarity[:\s]*([0-9]+)/i);
  const engagementMatch = result.match(/(?:###\s+)?Engagement[:\s]*([0-9]+)/i);
  const assessmentMatch = result.match(/(?:###\s+)?Assessment Quality[:\s]*([0-9]+)/i);
  const gapsMatch = result.match(/(?:###\s+)?Gaps[\s]*(?:Flagged)?[:\s]*([0-9]+)/i);

  return {
    coverage_score: coverageMatch ? parseInt(coverageMatch[1], 10) : defaults.coverage_score,
    clarity_rating: clarityMatch ? parseInt(clarityMatch[1], 10) : defaults.clarity_rating,
    engagement_level: engagementMatch ? parseInt(engagementMatch[1], 10) : defaults.engagement_level,
    assessment_quality: assessmentMatch ? parseInt(assessmentMatch[1], 10) : defaults.assessment_quality,
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

    const observedTeacherValue = formData.get("observedTeacherId");
    const observedTeacherId = typeof observedTeacherValue === "string"
      ? observedTeacherValue.trim()
      : "";
    let targetUserId = user.id;

    if (observedTeacherId) {
      const { data: callerProfile, error: callerProfileError } = await anonSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (callerProfileError) {
        return safeJson({ result: null, error: callerProfileError.message }, 500);
      }

      if (!['admin', 'super_admin'].includes(callerProfile?.role)) {
        return safeJson({ result: null, error: 'Forbidden' }, 403);
      }

      const visibility = await getAdminVisibility(user.id, callerProfile.role);
      if (!visibility.teacherIds.includes(observedTeacherId)) {
        return safeJson({ result: null, error: 'You can only observe teachers under your scope.' }, 403);
      }

      targetUserId = observedTeacherId;
    }

    const grade = String(formData.get("grade") || "");
    const subject = String(formData.get("subject") || "");
    const lectureText = String(formData.get("lecture") || "").trim();
    const waitTimeEvidence = String(formData.get("waitTimeEvidence") || "").trim();
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

    let systemPrompt = `You are an elite instructional coach analyzing classroom teaching. Be specific, evidence-based, and actionable. Organize the report with clear sections, bullet points, and concise language so it is easy to follow.`;
    const waitTimeGuidance = `Important wait-time rule: once the lesson is underway, assume the teacher typically allows about 8 to 10 seconds for student response after questions unless the transcript gives clear evidence that the teacher rushed, answered their own questions, cut students off, or rapidly moved on without space for thinking. Audio transcription often removes silence, pauses, and think time, so do not criticize wait time based only on the absence of transcribed silence. Only flag weak wait time when there is explicit evidence of it in the lesson record.`;
    let userPrompt = '';

    // Check if this is a STAAR-tested subject/grade
    const isSTAAR = STAAR_SUBJECTS.some(
      (s) => s.grade.toLowerCase() === grade.toLowerCase() && s.subject.toLowerCase() === subject.toLowerCase()
    );

    const reportFormat = `Analyze this lesson transcript and provide feedback in the following structured format. Use these exact section headers and keep the feedback evidence-based, specific, and unbiased.

Metrics:
Instructional Score (0-100): [number]
Coverage (0-100): [number]
Clarity (0-100): [number]
Engagement (0-100): [number]
Assessment Quality (0-100): [number]
Gaps Flagged: [number]

=== EXECUTIVE SUMMARY ===
Provide a concise 2-4 sentence summary of overall lesson quality, student experience, and biggest instructional takeaway.

=== WHAT WENT WELL ===
- [bullet]
- [bullet]
- [bullet]

=== WHAT CAN IMPROVE ===
- [bullet]
- [bullet]
- [bullet]

=== RECOMMENDED NEXT STEP ===
Provide 1 concise paragraph with the single highest-leverage next move for the teacher.

=== INSTRUCTIONAL COACHING FEEDBACK ===
Provide generic, high-quality instructional coaching feedback using labeled bullets:
- Key Findings: ...
- Missed Opportunities: ...
- Student Engagement Signals: ...
- Suggested Next Steps: ...`;

    if (hasStandards) {
      systemPrompt += '\nProvide two distinct types of feedback: (1) Generic instructional quality coaching, and (2) Texas TEKS standards alignment analysis.';
      userPrompt = `Grade: ${grade}\nSubject: ${subject}\n\n${teksContext}\n\n${waitTimeGuidance}${waitTimeEvidence ? `\n\nAdditional audio timing evidence:\n${waitTimeEvidence}` : ''}\n\n${reportFormat}`;

      if (isSTAAR) {
        userPrompt += `\n\n=== STAAR TEKS COVERAGE ===\nSummarize how well the lesson covered the most important TEKS for this STAAR-tested subject and grade. Use labeled bullets for:\n- Readiness Summary: ...\n- Standards Reinforced:\n  - CODE: exact TEKS description\n  - CODE: exact TEKS description\n- Standards That Need Stronger Assessment Evidence:\n  - CODE: exact TEKS description\n  - CODE: exact TEKS description\n- STAAR Readiness Recommendation: ...\nFor Standards Reinforced and Standards That Need Stronger Assessment Evidence, list only actual TEKS codes with their matching descriptions from the standards reference above. Do not use generic prose in those two fields. For the weaker-assessment field, choose TEKS that are directly related to the lesson topic and concept focus.`;
      }

      userPrompt += `\n\n=== TEXAS TEKS STANDARDS ALIGNMENT ===\nProvide specific curriculum alignment feedback using labeled bullets:
- Standards Addressed: cite the actual TEKS codes and descriptions that were explicitly taught or practiced.
- Standards Not Observed: cite the actual TEKS codes and descriptions that were missing, underdeveloped, or not evidenced.
- Standards Mastery Notes: observations about depth and quality of standards instruction.
- Recommendations for Standards Integration: how to better integrate missing standards with concrete instructional moves.
\nTranscript:\n${transcript}\n`;
    } else {
      userPrompt = `Grade: ${grade}\nSubject: ${subject}\n\n${waitTimeGuidance}${waitTimeEvidence ? `\n\nAdditional audio timing evidence:\n${waitTimeEvidence}` : ''}\n\n${reportFormat}\n\nTranscript:\n${transcript}\n`;
    }

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
        user_id: targetUserId,
        grade,
        subject,
        coverage_score: metrics.coverage_score,
        clarity_rating: metrics.clarity_rating,
        engagement_level: metrics.engagement_level,
        assessment_quality: metrics.assessment_quality,
        gaps_detected: metrics.gaps_detected,
        transcript: transcript.slice(0, 5000),
        result: result.slice(0, 5000),
        created_at: new Date().toISOString(),
      };

      let insertQuery = serviceSupabase
        .from("analyses")
        .insert([analysisRecord])
        .select()
        .single();

      let { data: insertedData, error: dbError } = await insertQuery;

      if (dbError && /assessment_quality/i.test(dbError.message || "")) {
        const { assessment_quality, ...legacyRecord } = analysisRecord;
        ({ data: insertedData, error: dbError } = await serviceSupabase
          .from("analyses")
          .insert([legacyRecord])
          .select()
          .single());
      }

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
