import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Only create client when actually needed at runtime
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: create client with env vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
      );
    }

    return createClient(url, key);
  }

  // Client-side: reuse singleton
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error(
        "Missing Supabase credentials. Auth features will not work. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set at build time."
      );
      throw new Error("Missing Supabase credentials");
    }

    supabaseInstance = createClient(url, key);
  }

  return supabaseInstance;
}

// Lazy getter -- only throws when actually accessed, not at module load time.
// This prevents the homepage (which never calls Supabase) from crashing.
export function getSupabaseSafe(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

// Default export: null-safe -- pages that import this module won't crash at load
// time even if credentials are missing. Auth pages should call getSupabase() directly.
export const supabase = typeof window !== 'undefined' ? getSupabaseSafe() : null;
