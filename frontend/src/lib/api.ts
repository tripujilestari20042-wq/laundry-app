const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? '';

  // Browser: deteksi host aktual (lebih andal daripada env saja)
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isVercelHost = hostname.includes('vercel.app');

    if (isVercelHost) {
      // Selalu pakai API Next.js same-origin di Vercel
      return '';
    }

    if (isLocalhost) {
      return configured || 'http://localhost:4000';
    }

    // Custom domain: backend eksternal jika dikonfigurasi
    if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
      if (configured === origin || configured.startsWith(origin)) {
        return '';
      }
      return configured;
    }

    return '';
  }

  // SSR
  const isLocalBackend =
    !configured ||
    configured.includes('localhost') ||
    configured.includes('127.0.0.1');

  if (isLocalBackend && IS_PRODUCTION) {
    return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ?? '';
  }

  return configured || 'http://localhost:4000';
}

function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

interface FetchOptions extends RequestInit {
  token?: string;
}

export class ApiConnectionError extends Error {
  readonly isConnectionError = true;

  constructor(apiUrl: string = getApiBaseUrl()) {
    const displayUrl = apiUrl || 'API Vercel';
    super(
      `Tidak dapat terhubung ke server (${displayUrl}). Pastikan koneksi internet stabil.`
    );
    this.name = 'ApiConnectionError';
  }
}

export function isApiConnectionError(err: unknown): boolean {
  if (err instanceof ApiConnectionError) return true;
  if (err instanceof Error) {
    return (
      err.message.includes('Tidak dapat terhubung ke') ||
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

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
  baseUrl?: string
): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;
  const API_URL = baseUrl ?? getApiBaseUrl();

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
    if (baseUrl === undefined && typeof window !== 'undefined' && API_URL !== '') {
      return apiFetch<T>(endpoint, options, '');
    }
    throw new ApiConnectionError(API_URL);
  }

  let json: unknown = null;
  const text = await response.text();
  if (text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      if (baseUrl === undefined && typeof window !== 'undefined' && API_URL !== '') {
        return apiFetch<T>(endpoint, options, '');
      }
      throw new Error('Layanan API sementara tidak tersedia. Coba refresh halaman.');
    }
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 200) || `Respons server tidak valid (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    if (
      response.status === 404 &&
      baseUrl === undefined &&
      typeof window !== 'undefined' &&
      API_URL !== ''
    ) {
      return apiFetch<T>(endpoint, options, '');
    }
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

export { getApiBaseUrl as API_URL };
