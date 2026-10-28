import { getSession } from "@/lib/auth/auth";
import { uploadResumeToStorage } from "@/lib/supabase/storage";
import { extractPdfText, parseResumeWithGemini } from "@/lib/ai/parse-resume";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = "application/pdf";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== ALLOWED_MIME) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 5MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdf_data = await extractPdfText(buffer);
    // Upload to Supabase and parse with Gemini concurrently
    const [storageResult, parsedData] = await Promise.all([
      uploadResumeToStorage(session.user.id, buffer, file.name, file.type),
      parseResumeWithGemini(pdf_data),
    ]);

    return NextResponse.json({
      success: true,
      resume: {
        url: storageResult.url,
        storagePath: storageResult.storagePath,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      },
      parsedData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[upload-resume] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
