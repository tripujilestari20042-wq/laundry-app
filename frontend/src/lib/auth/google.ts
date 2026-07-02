/**
 * URL yang WAJIB didaftarkan di Google Cloud Console → Authorized redirect URIs.
 * BUKAN URL localhost aplikasi — ini callback internal Supabase ke Google.
 */
import type { UserRole } from '@/types';

export function getSupabaseGoogleCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/auth/v1/callback`;
}

/** URL aplikasi setelah OAuth selesai — didaftarkan di Supabase → URL Configuration. */
export function getAppAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
  return `${appUrl}/auth/callback`;
}

export async function startGoogleOAuth(role: UserRole = 'pelanggan'): Promise<{ error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      error:
        'Konfigurasi Supabase belum lengkap. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const redirectTo = getAppAuthCallbackUrl();
  const googleCallback = getSupabaseGoogleCallbackUrl();

  if (typeof document !== 'undefined') {
    document.cookie = `auth_expected_role=${role}; path=/; max-age=600; SameSite=Lax`;
  }

  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    const msg = error.message?.trim();
    if (msg?.includes('redirect_uri_mismatch') || msg?.includes('invalid request')) {
      return {
        error: `Google redirect URI tidak cocok. Tambahkan URL ini di Google Cloud Console → Credentials → Authorized redirect URIs: ${googleCallback}`,
      };
    }
    return {
      error: msg && msg !== '{}' ? msg : 'Login Google gagal. Pastikan Google Provider aktif di Supabase.',
    };
  }

  return {};
}
