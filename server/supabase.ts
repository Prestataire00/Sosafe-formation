import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
export const STORAGE_BUCKET = "uploads";

export async function ensureStorageBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.warn("[supabase] Could not list buckets:", listError.message);
    return;
  }

  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    });
    if (createError) {
      console.error("[supabase] Failed to create bucket:", createError.message);
    } else {
      console.log(`[supabase] Bucket "${STORAGE_BUCKET}" created successfully`);
    }
  } else {
    console.log(`[supabase] Bucket "${STORAGE_BUCKET}" already exists`);
  }
}
