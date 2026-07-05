import type { AuthResponse } from './errors';
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

async function authPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let json: { data?: T; error?: string; message?: string } = {};
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new Error('Respons server tidak valid. Coba refresh halaman.');
    }
  }

  if (!res.ok) {
    throw new Error(json.error || 'Permintaan autentikasi gagal');
  }

  if (!json.data) {
    throw new Error(json.error || 'Data autentikasi tidak tersedia');
  }

  return json.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  return authPost<AuthResponse>('/api/auth/login', payload);
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  return authPost<AuthResponse>('/api/auth/register', payload);
}
