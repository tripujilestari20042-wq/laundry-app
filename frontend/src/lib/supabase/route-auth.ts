import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getAuthenticatedUser(
  supabase: SupabaseClient,
  request: Request
): Promise<User | null> {
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();

  if (cookieUser) {
    return cookieUser;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const {
      data: { user: tokenUser },
    } = await supabase.auth.getUser(token);
    return tokenUser;
  }

  return null;
}
