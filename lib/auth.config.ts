import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.workspaceId = user.workspaceId
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.workspaceId = token.workspaceId as string
      session.user.role = token.role as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig
