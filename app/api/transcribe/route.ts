import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

type TranscriptSegment = {
  start?: number;
  end?: number;
  text?: string;
};

function looksLikeResponsePrompt(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.includes("?")) return true;

  return /^(what|why|how|who|when|where|can|could|would|do|does|did|is|are|tell me|show me|explain|turn and talk|discuss|talk to your partner|partner|raise your hand)/.test(
    normalized
  );
}

function buildWaitTimeEvidence(segments: TranscriptSegment[] | undefined) {
  if (!Array.isArray(segments) || segments.length < 2) {
    return {
      responseWaitEvidence:
        "Audio timing note: the transcript did not expose reliable pause timing metadata for this chunk. Do not treat missing pause timestamps as evidence of weak wait time.",
      promptPauseCount: 0,
      averagePromptPauseSeconds: null,
      longestPromptPauseSeconds: null,
    };
  }

  const promptPauses: number[] = [];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const currentEnd = typeof current.end === "number" ? current.end : null;
    const nextStart = typeof next.start === "number" ? next.start : null;

    if (currentEnd === null || nextStart === null) continue;

    const gap = nextStart - currentEnd;
    if (gap < 4) continue;

    if (looksLikeResponsePrompt(String(current.text || ""))) {
      promptPauses.push(gap);
    }
  }

  if (promptPauses.length === 0) {
    return {
      responseWaitEvidence:
        "Audio timing note: no clear prompt-response pause markers were detected from this transcript chunk. Silence may still have occurred and should not be treated as missing just because it was not surfaced in the transcript.",
      promptPauseCount: 0,
      averagePromptPauseSeconds: null,
      longestPromptPauseSeconds: null,
    };
  }

  const average =
    promptPauses.reduce((sum, value) => sum + value, 0) / promptPauses.length;
  const longest = Math.max(...promptPauses);

  return {
    responseWaitEvidence: `Audio timing evidence: ${promptPauses.length} likely prompt-response pause${promptPauses.length === 1 ? "" : "s"} of at least 4 seconds were detected in this chunk. Average detected pause: ${average.toFixed(
      1
    )} seconds. Longest detected pause: ${longest.toFixed(
      1
    )} seconds. Use this as supporting evidence that student think time may be present even when silence is not visible in the transcript text.`,
    promptPauseCount: promptPauses.length,
    averagePromptPauseSeconds: Number(average.toFixed(1)),
    longestPromptPauseSeconds: Number(longest.toFixed(1)),
  };
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
            } catch {}
          },
        },
      }
    ) as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return safeJson({ transcript: "", error: "Not authenticated" }, 401);
    }

    const openai = createOpenAIClient();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return safeJson(
        { transcript: "", error: "No audio file provided." },
        400
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    } as any);

    const transcript = String((transcription as any).text || "").trim();
    const waitTimeEvidence = buildWaitTimeEvidence((transcription as any).segments);

    return safeJson({ transcript, error: null, ...waitTimeEvidence });
  } catch (err: any) {
    console.error("TRANSCRIBE ERROR:", err);
    return safeJson(
      {
        transcript: "",
        error:
          err?.message || "Error transcribing audio chunk. Please try again.",
      },
      400
    );
  }
}
