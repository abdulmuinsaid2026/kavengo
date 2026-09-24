import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    const payload = JSON.parse(atob(b64));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  const isAuthenticated = Boolean(token && !isTokenExpired(token));
  const isAdmin = userRole === 'ADMIN' || userRole === 'PLATFORM_ADMIN';

  // 1. Dedicated Admin Login handling
  if (pathname === '/admin/login') {
    if (isAuthenticated && isAdmin) {
      return NextResponse.redirect(new URL('/admin/products', request.url));
    }
    return NextResponse.next();
  }

  // 2. Guard all /admin routes
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAuthenticated) {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(adminLoginUrl);
      if (token) {
        response.cookies.delete('token');
        response.cookies.delete('refresh_token');
        response.cookies.delete('user_role');
      }
      return response;
    }

    if (!isAdmin) {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(adminLoginUrl);
    }
  }

  // 3. Guard all /account routes
  if (pathname === '/account' || pathname.startsWith('/account/')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      if (token) {
        response.cookies.delete('token');
        response.cookies.delete('refresh_token');
        response.cookies.delete('user_role');
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/account',
    '/account/:path*',
  ],
};