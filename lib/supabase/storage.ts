import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_PROJECT_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set."
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "kanscout-storage";
const FOLDER = "resumes";

/**
 * Uploads a resume file buffer to Supabase Storage.
 * Returns the app-relative URL (/api/profile/resume) and the storage path.
 * The bucket is private; access is gated through the authenticated API route.
 */
export async function uploadResumeToStorage(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; storagePath: string }> {
  const supabase = getSupabaseClient();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${FOLDER}/${userId}/${Date.now()}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return {
    // Store a stable app-relative URL; the actual signed URL is generated on demand
    // by GET /api/profile/resume to avoid exposing a public or pre-signed bucket URL.
    url: "/api/profile/resume",
    storagePath,
  };
}

/**
 * Creates a short-lived signed URL (valid for `expiresIn` seconds) to view a private resume.
 * Call this server-side inside an authenticated route; never expose it directly to clients.
 */
export async function getSignedResumeUrl(
  storagePath: string,
  expiresIn: number = 60
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to generate signed URL: ${error?.message ?? "Unknown error"}`
    );
  }

  return data.signedUrl;
}

/**
 * Deletes a resume file from Supabase Storage by its storage path.
 */
export async function deleteResumeFromStorage(storagePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.error(`[Supabase] Failed to delete file at ${storagePath}:`, error.message);
  }
}
