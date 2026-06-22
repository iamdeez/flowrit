'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type RevisionFormState = {
  error?: string
  success?: string
}

const priorities = new Set(['HIGH', 'MEDIUM', 'LOW'])
const statuses = new Set(['OPEN', 'IN_PROGRESS', 'DONE'])
const incompleteStatuses = ['OPEN', 'IN_PROGRESS']

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

async function requireWorkspaceId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    throw new Error('로그인이 필요합니다.')
  }
  return session.user.workspaceId
}

export async function getRevisionGroups() {
  const workspaceId = await requireWorkspaceId()

  return prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      revisions: { some: { status: { in: incompleteStatuses } } },
    },
    include: {
      customer: true,
      revisions: {
        where: { status: { in: incompleteStatuses } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function createRevisionRequest(
  _prevState: RevisionFormState,
  formData: FormData
): Promise<RevisionFormState> {
  const workspaceId = await requireWorkspaceId()
  const projectId = stringValue(formData, 'projectId')
  const content = stringValue(formData, 'content')
  const priority = stringValue(formData, 'priority') || 'MEDIUM'
  const assigneeId = stringValue(formData, 'assigneeId') || null

  if (!projectId) return { error: '프로젝트를 찾을 수 없습니다.' }
  if (!content) return { error: '수정 요청 내용을 입력해 주세요.' }
  if (!priorities.has(priority)) return { error: '우선순위를 다시 선택해 주세요.' }

  const [project, assignee] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, workspaceId } }),
    assigneeId
      ? prisma.workspaceMember.findFirst({ where: { workspaceId, userId: assigneeId } })
      : Promise.resolve(null),
  ])

  if (!project) return { error: '프로젝트를 찾을 수 없습니다.' }
  if (assigneeId && !assignee) return { error: '선택한 담당자를 찾을 수 없습니다.' }

  await prisma.$transaction([
    prisma.revisionRequest.create({
      data: {
        projectId,
        content,
        priority,
        assigneeId,
        source: 'MANUAL',
      },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId,
        title: '수정 요청 등록',
        eventType: 'REVISION_CREATED',
        metadata: { priority, assigneeId },
      },
    }),
  ])

  revalidatePath('/revisions')
  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)

  return { success: '수정 요청을 등록했습니다.' }
}

export async function deleteRevisionRequest(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const revisionId = stringValue(formData, 'revisionId')

  if (!revisionId) return

  const revision = await prisma.revisionRequest.findFirst({
    where: { id: revisionId, project: { workspaceId } },
    include: { project: true },
  })

  if (!revision) return

  await prisma.revisionRequest.delete({ where: { id: revision.id } })

  revalidatePath('/revisions')
  revalidatePath('/projects')
  revalidatePath(`/projects/${revision.projectId}`)
}

export async function updateRevisionStatus(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const revisionId = stringValue(formData, 'revisionId')
  const status = stringValue(formData, 'status')

  if (!revisionId || !statuses.has(status)) return

  const revision = await prisma.revisionRequest.findFirst({
    where: { id: revisionId, project: { workspaceId } },
    include: { project: true },
  })

  if (!revision || revision.status === status) return

  await prisma.$transaction([
    prisma.revisionRequest.update({
      where: { id: revision.id },
      data: { status },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId: revision.projectId,
        title: `수정 요청 상태 변경: ${revision.status} → ${status}`,
        eventType: 'REVISION_STATUS_CHANGE',
        metadata: {
          revisionId: revision.id,
          previousStatus: revision.status,
          nextStatus: status,
        },
      },
    }),
  ])

  revalidatePath('/revisions')
  revalidatePath('/projects')
  revalidatePath(`/projects/${revision.projectId}`)
}
