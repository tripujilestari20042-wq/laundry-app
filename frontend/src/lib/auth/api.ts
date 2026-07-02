import { api, API_URL } from '@/lib/api';
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

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/api/auth/register', payload);
  return res.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<{ data: AuthResponse }>('/api/auth/login', payload);
  return res.data;
}

export { API_URL };
