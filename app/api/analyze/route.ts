import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import busboy from 'busboy';
import { getChatGPTFeedback } from '../../utils/openai'; // Assuming you have the OpenAI utility

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
    });
}
