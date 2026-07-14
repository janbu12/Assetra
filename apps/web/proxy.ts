import { NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  const publicPaths = ['/login', '/offline', '/manifest.webmanifest', '/icon', '/sw.js'];
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path)) || request.nextUrl.pathname.startsWith('/_next')) return NextResponse.next();
  if (!request.cookies.get('assetra_access')) {
    const login = new URL('/login', request.url); login.searchParams.set('next', request.nextUrl.pathname); return NextResponse.redirect(login);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!api/|og.png).*)'] };
