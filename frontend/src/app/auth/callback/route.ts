import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getPostAuthRedirect, isSafeRedirect } from '@/lib/auth/redirect';
import type { Profile, UserRole } from '@/types';

function parseExpectedRole(value: string | undefined): UserRole | null {
  if (value === 'admin' || value === 'pelanggan') return value;
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  if (oauthError) {
    const details = oauthErrorDescription || oauthError;
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'auth_callback_failed');
    if (details.includes('redirect_uri_mismatch')) {
      loginUrl.searchParams.set(
        'hint',
        'redirect_uri_mismatch: tambahkan https://upekqyrncipkgbpazrzm.supabase.co/auth/v1/callback di Google Cloud Console'
      );
    }
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      if (user && session) {
        const cookieStore = await cookies();
        const expectedRole = parseExpectedRole(cookieStore.get('auth_expected_role')?.value);
        cookieStore.delete('auth_expected_role');

        let profileRole: UserRole | undefined;

        if (expectedRole) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          const syncRes = await fetch(`${apiUrl}/api/auth/sync-role`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: expectedRole }),
          });

          if (syncRes.ok) {
            const json = await syncRes.json() as { data: { profile: Pick<Profile, 'role'> } };
            profileRole = json.data.profile?.role;
          } else if (syncRes.status === 403) {
            await supabase.auth.signOut();
            const loginUrl = new URL('/login', origin);
            loginUrl.searchParams.set('error', 'auth_callback_failed');
            loginUrl.searchParams.set(
              'hint',
              'Role tidak sesuai dengan akun Google Anda. Pilih role yang benar.'
            );
            return NextResponse.redirect(loginUrl);
          }
        }

        if (!profileRole) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          profileRole = (profileData as Pick<Profile, 'role'> | null)?.role;
        }

        const roleRedirect = getPostAuthRedirect(profileRole);
        const destination = isSafeRedirect(next) ? next : roleRedirect;

        return NextResponse.redirect(`${origin}${destination}`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
