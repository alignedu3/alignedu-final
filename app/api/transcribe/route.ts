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
    });

    const transcript = String((transcription as any).text || "").trim();

    return safeJson({ transcript, error: null });
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
