import { config } from '../config';

export interface GoTrueErrorBody {
  msg?: string;
  message?: string;
  error?: string;
  error_description?: string;
  code?: string | number;
  status?: number;
}

export class GoTrueError extends Error {
  status: number;
  code?: string;
  body: GoTrueErrorBody;

  constructor(status: number, body: GoTrueErrorBody, fallbackMessage?: string) {
    const message =
      body.msg ||
      body.message ||
      body.error_description ||
      body.error ||
      fallbackMessage ||
      `Supabase Auth error (HTTP ${status})`;

    super(typeof message === 'string' ? message : JSON.stringify(message));
    this.status = status;
    this.code = body.code?.toString();
    this.body = body;
  }
}

async function gotrueFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey: string;
    bearer?: string;
  }
): Promise<T> {
  const url = `${config.supabase.url}${path}`;
  const headers: Record<string, string> = {
    apikey: options.apiKey,
    'Content-Type': 'application/json',
  };

  if (options.bearer) {
    headers.Authorization = `Bearer ${options.bearer}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let parsed: GoTrueErrorBody & T = {} as GoTrueErrorBody & T;

  if (text) {
    try {
      parsed = JSON.parse(text) as GoTrueErrorBody & T;
    } catch {
      if (!response.ok) {
        throw new GoTrueError(response.status, { message: text || 'Unknown error' });
      }
      throw new Error(`Invalid JSON from Supabase Auth: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new GoTrueError(response.status, parsed, text || undefined);
  }

  return parsed;
}

export interface GoTrueUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface GoTrueSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: GoTrueUser;
}

/** Admin: create user (requires service role / secret key) */
export async function adminCreateUser(params: {
  email: string;
  password: string;
  user_metadata?: Record<string, unknown>;
}): Promise<GoTrueUser> {
  const result = await gotrueFetch<{ user: GoTrueUser }>(
    '/auth/v1/admin/users',
    {
      method: 'POST',
      apiKey: config.supabase.serviceRoleKey,
      bearer: config.supabase.serviceRoleKey,
      body: {
        email: params.email,
        password: params.password,
        email_confirm: true,
        user_metadata: params.user_metadata ?? {},
      },
    }
  );

  if (!result.user?.id) {
    throw new Error('Supabase tidak mengembalikan data user setelah registrasi');
  }

  return result.user;
}

/** Public signup via anon/publishable key */
export async function signUpUser(params: {
  email: string;
  password: string;
  user_metadata?: Record<string, unknown>;
}): Promise<{ user: GoTrueUser | null; session: GoTrueSession | null }> {
  const result = await gotrueFetch<{ user: GoTrueUser; session: GoTrueSession | null }>(
    '/auth/v1/signup',
    {
      method: 'POST',
      apiKey: config.supabase.anonKey,
      body: {
        email: params.email,
        password: params.password,
        data: params.user_metadata ?? {},
      },
    }
  );

  return { user: result.user ?? null, session: result.session ?? null };
}

/** Password login via anon/publishable key */
export async function signInWithPassword(params: {
  email: string;
  password: string;
}): Promise<GoTrueSession> {
  const result = await gotrueFetch<GoTrueSession>(
    '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      apiKey: config.supabase.anonKey,
      body: {
        email: params.email,
        password: params.password,
      },
    }
  );

  if (!result.access_token) {
    throw new Error('Login gagal: token tidak diterima dari Supabase');
  }

  return result;
}

export function mapGoTrueError(error: unknown): string {
  if (error instanceof GoTrueError) {
    const msg = error.message.toLowerCase();

    if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('duplicate')) {
      return 'Email sudah terdaftar. Silakan login.';
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Email atau password salah.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Email belum diverifikasi. Cek inbox Anda.';
    }
    if (error.status === 401 || error.status === 403) {
      return `Autentikasi Supabase ditolak (HTTP ${error.status}). Periksa SUPABASE_URL dan API keys di backend/.env — gunakan key dari Supabase Dashboard → Settings → API.`;
    }
    if (error.status === 500 || error.message.toLowerCase().includes('database error saving new user')) {
      return 'Error database saat registrasi. Jalankan file supabase/fix-auth.sql di Supabase SQL Editor, lalu coba lagi.';
    }
    if (error.message === '{}' || !error.message.trim()) {
      return `Supabase Auth gagal (HTTP ${error.status}). Periksa API keys dan skema database.`;
    }
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === '{}') {
      return 'Supabase Auth gagal. Periksa konfigurasi API key dan skema database.';
    }
    return error.message;
  }

  return 'Terjadi kesalahan autentikasi';
}
