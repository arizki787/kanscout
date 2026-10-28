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

const BUCKET = "kanscout-storage";
const FOLDER = "resumes";

/**
 * Uploads a resume file buffer to Supabase Storage.
 * Returns the public URL and the storage path.
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

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    storagePath,
  };
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
