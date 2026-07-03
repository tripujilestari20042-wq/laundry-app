import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import type { Profile } from '@/types';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/auth/callback'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

const ADMIN_ROUTES = ['/admin'];
const PELANGGAN_ROUTES = ['/dashboard', '/orders', '/services'];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, supabase, supabaseResponse } = await updateSession(request);

  // API routes handle auth sendiri (Bearer token / cookie) — jangan redirect ke /login
  if (pathname.startsWith('/api/')) {
    return supabaseResponse;
  }

  const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/auth/');
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    if (!supabase) {
      return supabaseResponse;
    }
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'role'> | null;
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && (matchesRoute(pathname, ADMIN_ROUTES) || matchesRoute(pathname, PELANGGAN_ROUTES))) {
    if (!supabase) {
      return supabaseResponse;
    }
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profileData as Pick<Profile, 'role'> | null)?.role;

    if (matchesRoute(pathname, ADMIN_ROUTES) && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
