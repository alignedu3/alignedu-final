import OpenAI from "openai";



export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

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

async function callOpenAI(messages: any[]) {
  return await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.3,
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

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

    const systemPrompt = `
You are an elite instructional coach analyzing classroom teaching.
Be specific, evidence-based, and actionable.
`;

    const userPrompt = `
Grade: ${grade}
Subject: ${subject}

Analyze this lesson transcript:

Return:
- Instructional Score (0-100)
- Coverage
- Clarity
- Engagement
- Gaps Flagged
- Key Findings
- Missed Opportunities
- Student Signals
- Suggested Next Steps

Transcript:
${transcript}
`;

    const completion = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const result =
      completion.choices[0]?.message?.content || "No result returned";

    return safeJson({
      result,
      error: null,
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
