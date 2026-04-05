import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import busboy from 'busboy';
import { getChatGPTFeedback } from '../../utils/openai'; // Assuming you have the OpenAI utility

<<<<<<< HEAD
export async function POST(req: Request) {
  try {
    let lectureText = "";

    const contentType = req.headers.get("content-type") || "";

    // 🟦 Case 1: JSON input (what you already use)
    if (contentType.includes("application/json")) {
      const { lecture } = await req.json();

      if (typeof lecture !== "string" || lecture.trim() === "") {
        return NextResponse.json(
          { result: "Error: 'lecture' should be a non-empty string." },
          { status: 400 }
        );
      }

      lectureText = lecture;
    }

    // 🟩 Case 2: File upload (NEW)
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json(
          { result: "No file uploaded." },
          { status: 400 }
        );
      }

      lectureText = await file.text();
    }

    // ❌ Invalid request type
    else {
      return NextResponse.json(
        { result: "Unsupported request type." },
        { status: 400 }
      );
    }

    // 🧠 Simple summary logic (same as before)
    const summary =
      lectureText.length > 200
        ? `${lectureText.slice(0, 200)}...`
        : lectureText;

    return NextResponse.json({
      result: `Summary:\n\n${summary}`,
=======
export const config = {
    api: {
        bodyParser: false, // Disable body parsing to handle file uploads manually
    },
};

export async function POST(req: NextRequest) {
    return new Promise((resolve, reject) => {
        const bb = busboy({ headers: req.headers });

        let uploadedFilePath = '';

        bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
            uploadedFilePath = path.join('uploads', filename);
            const saveTo = fs.createWriteStream(uploadedFilePath);
            file.pipe(saveTo);

            file.on('end', async () => {
                // After the file is uploaded, process it
                const fileContent = fs.readFileSync(uploadedFilePath, 'utf-8'); // Or extract text based on file type

                try {
                    const feedback = await getChatGPTFeedback(fileContent); // Call OpenAI API for feedback
                    resolve(new NextResponse(JSON.stringify({ feedback }), { status: 200 }));
                } catch (error) {
                    resolve(new NextResponse('Error processing file', { status: 500 }));
                }
            });
        });

        bb.on('error', (error) => {
            reject(new NextResponse('Error processing upload', { status: 500 }));
        });

        req.body.pipe(bb); // Start processing the request body
>>>>>>> e9aea9952896125bedd91a1b4f9a9b1a35fef8bd
    });
}import { NextApiRequest, NextApiResponse } from 'next';

<<<<<<< HEAD
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { result: "Error analyzing lecture." },
      { status: 500 }
    );
=======
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { recording } = req.body;  // assuming you'll receive a recording object
    // Process the recording with AI model here
    // For example, analyze recording for instructional feedback
    const analysis = await analyzeRecording(recording);
    res.status(200).json({ analysis });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
>>>>>>> e9aea9952896125bedd91a1b4f9a9b1a35fef8bd
  }
}

async function analyzeRecording(recording) {
  // Placeholder for AI analysis
  return { feedback: "This lesson was engaging and aligned well with the curriculum." };
}
