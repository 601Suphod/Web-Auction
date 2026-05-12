import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_PAGES, isProtectedPath } from '@/lib/auth-routes';

const authPages = new Set<string>(AUTH_PAGES);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auction_token')?.value;
  const isAuthenticated = Boolean(token);

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authPages.has(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/payment/:path*',
    '/sell/:path*',
    '/dashboard/:path*',
    '/orders/:path*',
    '/login',
    '/register',
  ],
};
