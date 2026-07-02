import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPostAuthRedirect, isSafeRedirect } from '@/lib/auth/redirect';
import type { Profile, UserRole } from '@/types';

function parseExpectedRole(value: string | undefined): UserRole | null {
  if (value === 'admin' || value === 'pelanggan') return value;
  return null;
}

function loginErrorRedirect(origin: string, hint: string) {
  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('error', 'auth_callback_failed');
  loginUrl.searchParams.set('hint', hint);
  return NextResponse.redirect(loginUrl);
}

async function createCallbackClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables on server');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

async function trySyncRole(
  accessToken: string,
  expectedRole: UserRole
): Promise<{ ok: true; role: UserRole } | { ok: false; forbidden: boolean }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return { ok: false, forbidden: false };
  }

  try {
    const syncRes = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/auth/sync-role`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: expectedRole }),
      signal: AbortSignal.timeout(8000),
    });

    if (syncRes.ok) {
      const json = (await syncRes.json()) as { data: { profile: Pick<Profile, 'role'> } };
      return { ok: true, role: json.data.profile?.role ?? expectedRole };
    }

    if (syncRes.status === 403) {
      return { ok: false, forbidden: true };
    }

    return { ok: false, forbidden: false };
  } catch {
    return { ok: false, forbidden: false };
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  if (oauthError) {
    const details = oauthErrorDescription || oauthError;
    if (details.includes('redirect_uri_mismatch')) {
      return loginErrorRedirect(
        origin,
        'redirect_uri_mismatch: tambahkan https://upekqyrncipkgbpazrzm.supabase.co/auth/v1/callback di Google Cloud Console'
      );
    }
    return loginErrorRedirect(origin, details);
  }

  if (!code) {
    return loginErrorRedirect(origin, 'Kode autentikasi tidak ditemukan.');
  }

  try {
    const supabase = await createCallbackClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[auth/callback] exchangeCodeForSession:', exchangeError.message);
      return loginErrorRedirect(origin, exchangeError.message || 'Gagal menukar kode OAuth.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!user || !session) {
      return loginErrorRedirect(origin, 'Session login tidak tersedia setelah OAuth.');
    }

    const cookieStore = await cookies();
    const expectedRole = parseExpectedRole(cookieStore.get('auth_expected_role')?.value);
    cookieStore.delete('auth_expected_role');

    let profileRole: UserRole | undefined;

    if (expectedRole) {
      const syncResult = await trySyncRole(session.access_token, expectedRole);

      if (syncResult.ok) {
        profileRole = syncResult.role;
      } else if (syncResult.forbidden) {
        await supabase.auth.signOut();
        return loginErrorRedirect(
          origin,
          'Role tidak sesuai dengan akun Google Anda. Pilih role yang benar.'
        );
      }
    }

    if (!profileRole) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[auth/callback] profile fetch:', profileError.message);
      }

      profileRole = (profileData as Pick<Profile, 'role'> | null)?.role ?? 'pelanggan';
    }

    const roleRedirect = getPostAuthRedirect(profileRole);
    const destination = isSafeRedirect(next) ? next : roleRedirect;

    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err) {
    console.error('[auth/callback] unhandled:', err);
    const message =
      err instanceof Error ? err.message : 'Terjadi kesalahan saat proses login Google.';
    return loginErrorRedirect(origin, message);
  }
}
