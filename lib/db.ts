import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/app/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: unknown }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

function hasCurrentDelegates(client: unknown): client is PrismaClient {
  return Boolean(
    client &&
      typeof client === 'object' &&
      'revisionComment' in client
  )
}

if (globalForPrisma.prisma && !hasCurrentDelegates(globalForPrisma.prisma)) {
  const staleClient = globalForPrisma.prisma as { $disconnect?: () => Promise<void> }
  void staleClient.$disconnect?.()
  globalForPrisma.prisma = createPrismaClient()
}

export const prisma = hasCurrentDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
