import { createClient } from "@supabase/supabase-js";

// Only create client when actually needed at runtime
let supabaseInstance: any = null;

export function getSupabase() {
  if (typeof window === 'undefined') {
    // Server-side: create client with env vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error("Missing Supabase credentials");
    }
    
    return createClient(url, key);
  }
  
  // Client-side: reuse singleton
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error("Missing Supabase credentials");
    }
    
    supabaseInstance = createClient(url, key);
  }
  
  return supabaseInstance;
}

// Default export for backwards compatibility - but only call it at runtime
export const supabase = typeof window !== 'undefined' ? getSupabase() : null;
