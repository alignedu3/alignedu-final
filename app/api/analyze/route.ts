import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { lecture } = await req.json();

    // Simple test response (works now)
    return NextResponse.json({
      result: `Summary:\n\n${lecture.slice(0, 200)}...`,
    });

  } catch (error) {
    return NextResponse.json(
      { result: "Error analyzing lecture." },
      { status: 500 }
    );
  }
}