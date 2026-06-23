import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/app/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: unknown }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

function hasCurrentDelegates(client: unknown): client is PrismaClient {
  const runtimeDataModel = (
    client as {
      _runtimeDataModel?: {
        models?: {
          RevisionRequest?: {
            fields?: Array<{ name?: string }>
          }
          Asset?: {
            fields?: Array<{ name?: string }>
          }
        }
      }
    } | null
  )?._runtimeDataModel
  const revisionRequestHasAssets = runtimeDataModel?.models?.RevisionRequest?.fields?.some(
    (field) => field.name === 'assets',
  )
  const assetHasShareSchedule = runtimeDataModel?.models?.Asset?.fields?.some(
    (field) => field.name === 'shareScheduledAt',
  )

  return Boolean(
    client &&
      typeof client === 'object' &&
      'revisionComment' in client &&
      revisionRequestHasAssets &&
      assetHasShareSchedule
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
