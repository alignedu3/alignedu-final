import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { lecture } = await req.json();

  return NextResponse.json({
    result: `Summary:\n\n${lecture.slice(0, 200)}...`,
  });
}
