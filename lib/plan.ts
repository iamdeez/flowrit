import { prisma } from '@/lib/db'

export const PLAN_LIMITS = {
  free: { maxProjects: 3, maxMembers: 1 },
  pro: { maxProjects: Infinity, maxMembers: 5 },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  })
  const plan = workspace?.plan
  if (plan === 'pro') return 'pro'
  return 'free'
}

export async function checkProjectLimit(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  const limit = PLAN_LIMITS[plan].maxProjects
  if (limit === Infinity) return

  const count = await prisma.project.count({
    where: { workspaceId },
  })
  if (count >= limit) {
    throw new Error('PLAN_LIMIT_EXCEEDED:PROJECT')
  }
}

export async function checkMemberLimit(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  const limit = PLAN_LIMITS[plan].maxMembers
  if (limit === Infinity) return

  const count = await prisma.workspaceMember.count({
    where: { workspaceId },
  })
  if (count >= limit) {
    throw new Error('PLAN_LIMIT_EXCEEDED:MEMBER')
  }
}
