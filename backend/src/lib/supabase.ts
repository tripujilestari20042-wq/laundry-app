import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabaseAdmin: SupabaseClient | null = null;

/** Service-role client — bypasses RLS. Use only on the server. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
}

/** Anon client scoped to a user's JWT for RLS-aware operations. */
export function getSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
