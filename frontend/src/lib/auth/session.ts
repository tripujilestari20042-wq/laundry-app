import { createClient } from '@/lib/supabase/client';
import type { AuthSession } from '@/lib/auth/errors';
import { getPostAuthRedirect } from '@/lib/auth/redirect';
import type { UserRole } from '@/types';

export async function applyAuthSession(session: AuthSession | null): Promise<void> {
  if (!session) return;

  const supabase = createClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) {
    throw new Error(`Gagal menyimpan sesi: ${error.message}`);
  }
}

export function getRedirectForRole(
  role: UserRole | undefined,
  fallback = '/dashboard'
): string {
  return getPostAuthRedirect(role, fallback);
}
