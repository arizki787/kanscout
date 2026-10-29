import { getSession } from "@/lib/auth/auth";
import { deleteResumeFromStorage, uploadResumeToStorage } from "@/lib/supabase/storage";
import { extractPdfText, parseResumeWithGemini } from "@/lib/ai/parse-resume";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Profile } from "@/lib/models";

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

    const resume = {
      url: storageResult.url,
      storagePath: storageResult.storagePath,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date(),
    };

    await connectDB();
    const saved = await Profile.findOneAndUpdate(
      { userId: session.user.id },
      { $set: { resume } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean<{ resume?: { storagePath?: string } }>();

    if (!saved?.resume?.storagePath) {
      // DB write failed or strict mode dropped it
      await deleteResumeFromStorage(storageResult.storagePath);
      return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resume: { ...resume, uploadedAt: resume.uploadedAt.toISOString() },
      parsedData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[upload-resume] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
