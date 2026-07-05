import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin-client';
import type { UserRole } from '@/types';

export function createAnonAuthClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Konfigurasi Supabase belum lengkap di server.');
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function toSessionPayload(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    token_type: session.token_type ?? 'bearer',
  };
}

export async function getProfileByUserId(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, role, full_name, phone')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data: byId } = await admin.auth.admin.getUserById(profile.id);
    if (byId.user) return byId.user;
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data.users.length) return null;

  return data.users.find((u) => u.email?.toLowerCase() === normalized) ?? null;
}

export function getAuthProviders(user: User): string[] {
  const fromIdentities = user.identities?.map((i) => i.provider) ?? [];
  const fromApp = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata.providers as string[])
    : [];
  return [...new Set([...fromIdentities, ...fromApp])];
}

export function isEmailConfirmed(user: User): boolean {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export async function confirmAuthUserEmail(userId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
}

export async function signInWithEmailPassword(email: string, password: string) {
  const client = createAnonAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false as const, error };
  }

  if (!data.session || !data.user) {
    return { ok: false as const, error: new Error('Session login tidak tersedia.') };
  }

  return { ok: true as const, session: data.session, user: data.user };
}

export function isOAuthOnlyAccount(user: User): boolean {
  const providers = getAuthProviders(user);
  return !providers.includes('email');
}

export async function linkEmailPasswordForUser(userId: string, password: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
}

export function roleLabel(role: UserRole): string {
  return role === 'admin' ? 'Admin Laundry' : 'Pelanggan';
}

export function mapLoginFailureMessage(params: {
  email: string;
  authUser: User | null;
}): string {
  const { authUser } = params;

  if (!authUser) {
    return 'Email atau password salah. Pastikan akun sudah terdaftar.';
  }

  if (!isEmailConfirmed(authUser)) {
    return 'Email belum diverifikasi. Coba login lagi — sistem akan mengaktifkan akun otomatis.';
  }

  return 'Email atau password salah.';
}

export async function upsertProfile(params: {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('profiles').upsert(
    {
      id: params.id,
      email: params.email,
      full_name: params.full_name,
      phone: params.phone ?? null,
      role: params.role,
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Profil gagal disimpan: ${error.message}`);
  }
}
