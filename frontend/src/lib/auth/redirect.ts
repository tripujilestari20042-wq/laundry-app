import type { UserRole } from '@/types';

export function getPostAuthRedirect(role: UserRole | undefined, fallback = '/dashboard'): string {
  if (role === 'admin') return '/admin';
  return fallback;
}

export function isSafeRedirect(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login');
}
