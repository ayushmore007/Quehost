import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "build-placeholder-key";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in environment variables.");
  }
}

/**
 * Server-side Supabase client using the Service Role Key.
 * MUST NEVER BE IMPORTED INTO CLIENT COMPONENTS.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
