import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { prisma } from './db'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      workspaceId: string
      role: string
    }
  }
  interface User {
    workspaceId: string
    role: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        workspaceId: { label: 'WorkspaceId', type: 'text' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { memberships: { orderBy: { createdAt: 'asc' } } },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        const requestedId = credentials.workspaceId as string | undefined
        const membership = requestedId
          ? (user.memberships.find((m) => m.workspaceId === requestedId) ?? user.memberships[0])
          : (user.memberships.find((m) => m.role === 'OWNER') ?? user.memberships[0])

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: membership?.workspaceId ?? '',
          role: membership?.role ?? 'MEMBER',
        }
      },
    }),
  ],
})
