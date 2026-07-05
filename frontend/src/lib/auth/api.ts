import { createClient } from '@/lib/supabase/client';
import type { AuthResponse, AuthSession } from './errors';
import type { UserRole } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole;
}

function toAuthSession(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}): AuthSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    token_type: session.token_type ?? 'bearer',
  };
}

function roleLabel(role: UserRole): string {
  return role === 'admin' ? 'Admin Laundry' : 'Pelanggan';
}

function mapSupabaseAuthError(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email atau password salah.';
  }
  if (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already registered')
  ) {
    return 'Email sudah terdaftar. Silakan login.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Cek inbox Anda.';
  }
  if (msg.includes('password') && msg.includes('least')) {
    return 'Password minimal 6 karakter.';
  }

  return message;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim(),
    password: payload.password,
  });

  if (error) {
    throw new Error(mapSupabaseAuthError(error.message));
  }

  if (!data.session || !data.user) {
    throw new Error('Login gagal. Session tidak tersedia.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, phone')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error(
      'Profil tidak ditemukan. Pastikan akun sudah terdaftar dengan benar.'
    );
  }

  if (payload.role && profile.role !== payload.role) {
    await supabase.auth.signOut();
    throw new Error(
      `Akun ini terdaftar sebagai ${roleLabel(profile.role as UserRole)}. Silakan pilih role yang sesuai.`
    );
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    session: toAuthSession(data.session),
    profile: profile as AuthResponse['profile'],
  };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        full_name: payload.full_name.trim(),
        phone: payload.phone?.trim() || null,
        role: payload.role ?? 'pelanggan',
      },
    },
  });

  if (error) {
    throw new Error(mapSupabaseAuthError(error.message));
  }

  if (!data.user) {
    throw new Error('Registrasi gagal. Coba lagi.');
  }

  if (!data.session) {
    return {
      user: { id: data.user.id, email: data.user.email ?? payload.email },
      session: null,
      message:
        'Registrasi berhasil. Cek email Anda untuk verifikasi (jika diaktifkan), lalu login.',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, phone')
    .eq('id', data.user.id)
    .single();

  return {
    user: { id: data.user.id, email: data.user.email ?? payload.email },
    session: toAuthSession(data.session),
    profile: (profile as AuthResponse['profile']) ?? undefined,
  };
}
