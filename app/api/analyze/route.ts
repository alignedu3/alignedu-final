import { NextResponse } from "next/server";

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
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { result: "Error analyzing lecture." },
      { status: 500 }
    );
  }
}