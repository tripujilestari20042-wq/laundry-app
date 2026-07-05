import type { Profile } from '@/types';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResponse {
  user: { id: string; email?: string };
  session: AuthSession | null;
  profile?: Pick<Profile, 'id' | 'email' | 'role' | 'full_name' | 'phone'>;
  message?: string;
}

export function formatAuthError(error: unknown): string {
  if (!error) return 'Terjadi kesalahan autentikasi';
  if (typeof error === 'string') {
    return error === '{}' ? 'Autentikasi gagal. Periksa email/password dan konfigurasi Supabase.' : error;
  }
  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (!msg || msg === '{}') {
      return 'Autentikasi gagal. Periksa email/password Anda atau coba login dengan Google.';
    }
    return msg;
  }
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message && obj.message !== '{}') return obj.message;
    if (typeof obj.error === 'string' && obj.error && obj.error !== '{}') return obj.error;
    const serialized = JSON.stringify(error);
    if (serialized === '{}' || serialized === 'null') {
      return 'Autentikasi gagal. Periksa email/password Anda.';
    }
    return serialized;
  }
  return 'Terjadi kesalahan autentikasi';
}
