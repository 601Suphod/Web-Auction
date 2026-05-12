export const AUTH_PAGES = ['/login', '/register'] as const;
export const PROTECTED_PREFIXES = [
  '/admin',
  '/profile',
  '/payment',
  '/sell',
  '/dashboard',
  '/orders',
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function sanitizeNextPath(nextPath: string | null | undefined): string | null {
  if (!nextPath) return null;
  if (!nextPath.startsWith('/')) return null;
  if (nextPath.startsWith('//')) return null;
  return nextPath;
}
