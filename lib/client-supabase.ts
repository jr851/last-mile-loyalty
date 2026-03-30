'use client';

import { createClient } from "@supabase/supabase-js";

// Client-side only Supabase client
let instance: any = null;

export function getClientSupabase() {
  if (!instance && typeof window !== 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (url && key) {
      instance = createClient(url, key);
    }
  }
  
  return instance;
}

export const supabase = getClientSupabase();
