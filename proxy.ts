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
  function redirectTo(pathname: string) {
    const url = req.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!req.auth) {
    return redirectTo('/login')
  }

  const role = req.auth.user?.role
  const pathname = req.nextUrl.pathname

  if (
    role === 'MEMBER' &&
    MEMBER_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return redirectTo('/dashboard')
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
