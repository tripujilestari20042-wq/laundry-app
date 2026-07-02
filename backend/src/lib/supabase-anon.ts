import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabaseAnon: SupabaseClient | null = null;

/** Anon/publishable client for password sign-in (server-side only). */
export function getSupabaseAnon(): SupabaseClient {
  if (!supabaseAnon) {
    supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAnon;
}
