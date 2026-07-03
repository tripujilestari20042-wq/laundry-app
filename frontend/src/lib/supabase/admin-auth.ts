import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

export class AdminAccessError extends Error {
  constructor(message = 'Akses ditolak — hanya admin') {
    super(message);
    this.name = 'AdminAccessError';
  }
}

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return (data?.role as UserRole) ?? null;
}

export async function requireAdmin(supabase: SupabaseClient, userId: string): Promise<void> {
  const role = await getUserRole(supabase, userId);
  if (role !== 'admin') {
    throw new AdminAccessError();
  }
}

export async function isUserAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  return (await getUserRole(supabase, userId)) === 'admin';
}
