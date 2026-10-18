import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "build-placeholder-key";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in environment variables.");
  }
}

export const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

/**
 * Server-side Supabase client using the Service Role Key.
 * MUST NEVER BE IMPORTED INTO CLIENT COMPONENTS.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  // Next.js caches fetch() by default, which freezes counters; never cache DB calls.
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
