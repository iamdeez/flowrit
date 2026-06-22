import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const MEMBER_BLOCKED_PATHS = [
  '/customers',
  '/analytics',
  '/templates',
  '/messages',
  '/team',
  '/settings',
]

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = req.auth.user?.role
  const pathname = req.nextUrl.pathname

  if (
    role === 'MEMBER' &&
    MEMBER_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/projects/:path*',
    '/revisions/:path*',
    '/analytics/:path*',
    '/templates/:path*',
    '/messages/:path*',
    '/team/:path*',
    '/settings/:path*',
  ],
}
