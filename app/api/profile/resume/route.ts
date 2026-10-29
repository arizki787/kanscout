import { getSession } from "@/lib/auth/auth";
import { getSignedResumeUrl } from "@/lib/supabase/storage";
import connectDB from "@/lib/db";
import Profile from "@/lib/models/profile";
import { NextResponse } from "next/server";

/**
 * GET /api/profile/resume
 *
 * Authenticated endpoint that generates a short-lived (60 s) signed URL for the
 * current user's resume stored in the private Supabase bucket, then issues a
 * 307 temporary redirect so the browser opens the PDF directly.
 *
 * Security:
 * - Requires an active session (returns 401 otherwise).
 * - Looks up the storagePath from the user's own MongoDB profile document,
 *   so one user can never access another user's file.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const profile = await Profile.findOne({ userId: session.user.id })
      .select("resume.storagePath")
      .lean();

    const storagePath = (profile as { resume?: { storagePath?: string } } | null)?.resume?.storagePath;

    if (!storagePath) {
      return NextResponse.json({ error: "No resume on file" }, { status: 404 });
    }

    const signedUrl = await getSignedResumeUrl(storagePath, 60);

    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/profile/resume] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
