import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { getChatGPTFeedback } from '../../../utils/openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    let lectureText = '';
    let grade = '';
    let subject = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      grade = formData.get('grade') as string;
      subject = formData.get('subject') as string;

      if (!file) {
        return NextResponse.json({ result: 'No file uploaded.' }, { status: 400 });
      }

      // 🔥 If audio → transcribe
      if (file.type.includes('audio')) {
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: 'gpt-4o-transcribe',
        });

        lectureText = transcription.text;
      } else {
        lectureText = await file.text();
      }
    }

    if (contentType.includes('application/json')) {
      const body = await req.json();
      lectureText = body.lecture;
      grade = body.grade;
      subject = body.subject;
    }

    const feedback = await getChatGPTFeedback(
      `Grade: ${grade}, Subject: ${subject}\n\nLesson:\n${lectureText}`
    );

    return NextResponse.json({ result: feedback });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ result: 'Error analyzing lesson.' }, { status: 500 });
  }
}
