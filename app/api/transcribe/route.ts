import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
