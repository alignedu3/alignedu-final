import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/errorHandling";

export const runtime = "nodejs";
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: "Choose a document to upload." }, { status: 400 });
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ success: false, error: "Documents must be 15 MB or smaller." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (extension === "pdf" || file.type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
    } else if (extension === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (["txt", "md", "csv"].includes(extension || "") || file.type.startsWith("text/")) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json({ success: false, error: "Use a PDF, Word (.docx), text, Markdown, or CSV document." }, { status: 400 });
    }

    const cleaned = text.replace(/\u0000/g, "").replace(/\n{4,}/g, "\n\n\n").trim();
    if (!cleaned) {
      return NextResponse.json({ success: false, error: "No readable text was found in this document." }, { status: 422 });
    }

    return NextResponse.json({ success: true, text: cleaned.slice(0, 250_000), fileName: file.name });
  } catch (error) {
    console.error("DOCUMENT EXTRACTION ERROR:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error, "Unable to read this document.") }, { status: 500 });
  }
}
