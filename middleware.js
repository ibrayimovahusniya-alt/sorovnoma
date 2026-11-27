import { NextResponse } from 'next/server';
import { sessionToken } from './lib/session';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/bot') || pathname.startsWith('/api/setup')) {
    return NextResponse.next();
  }
  const c = req.cookies.get('adm')?.value;
  if (!process.env.ADMIN_PASSWORD || c !== (await sessionToken())) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|favicon.ico|welcome.mp4).*)'] };
