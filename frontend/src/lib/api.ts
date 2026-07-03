const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? '';
  const isLocalBackend =
    !configured ||
    configured.includes('localhost') ||
    configured.includes('127.0.0.1');

  // Production tanpa backend Railway — pakai API bawaan Next.js di Vercel (same origin)
  if (isLocalBackend && IS_PRODUCTION) {
    if (typeof window !== 'undefined') {
      return '';
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
    return appUrl ?? '';
  }

  return configured || 'http://localhost:4000';
}

const API_URL = resolveApiBaseUrl();
const USING_LOCALHOST_API =
  !process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_URL.includes('localhost') ||
    process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1'));
const USES_BUILTIN_VERCEL_API = IS_PRODUCTION && API_URL !== 'http://localhost:4000' &&
  (!process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL.includes('localhost') ||
    process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1'));

interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiConnectionError extends Error {
  readonly isConnectionError = true;

  constructor(apiUrl: string = API_URL) {
    const displayUrl = apiUrl || 'API Vercel';
    const hint =
      IS_PRODUCTION && USING_LOCALHOST_API && !USES_BUILTIN_VERCEL_API
        ? ' Set NEXT_PUBLIC_API_URL di Vercel ke URL backend production (Railway/Render).'
        : '';
    super(
      `Tidak dapat terhubung ke server (${displayUrl}). Pastikan koneksi internet stabil.${hint}`
    );
    this.name = 'ApiConnectionError';
  }
}

export function isApiConnectionError(err: unknown): boolean {
  if (err instanceof ApiConnectionError) return true;
  if (err instanceof Error) {
    return (
      err.message.includes('Tidak dapat terhubung ke backend') ||
      err.message === 'Failed to fetch'
    );
  }
  return false;
}

function parseApiError(json: unknown, status: number): string {
  if (json && typeof json === 'object' && 'error' in json) {
    const err = (json as { error: unknown }).error;
    if (typeof err === 'string' && err) return err;
    if (err && typeof err === 'object') {
      const errObj = err as Record<string, unknown>;
      if (typeof errObj.message === 'string') return errObj.message;
      if (Array.isArray(errObj.formErrors) && errObj.formErrors.length > 0) {
        return String(errObj.formErrors[0]);
      }
    }
  }
  if (json && typeof json === 'object' && 'message' in json) {
    return String((json as { message: unknown }).message);
  }
  return `Terjadi kesalahan pada server (HTTP ${status})`;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiConnectionError();
  }

  let json: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(text || `Respons server tidak valid (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(parseApiError(json, response.status));
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    apiFetch<T>(endpoint, { method: 'POST', body: JSON.stringify(body), token }),

  put: <T>(endpoint: string, body: unknown, token?: string) =>
    apiFetch<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), token }),

  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    apiFetch<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: <T>(endpoint: string, token?: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE', token }),
};

export { API_URL };
