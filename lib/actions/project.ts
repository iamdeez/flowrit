'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { seedDefaultWorkflowTemplates } from '@/lib/default-workflow-templates'
import { sendStageChangedEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'
import { isProjectDone } from '@/lib/project-utils'
import type { WorkspaceRole } from '@/lib/types'

export type ProjectFormState = {
  error?: string
}

export type DuplicateProjectState = {
  error?: string
}

export type ProjectWithAssignee = {
  assigneeName: string | null
  id: string
  title: string
  workspaceId: string
  customerId: string
  assigneeId: string | null
  dueDate: Date | null
  budget: number | null
  archivedAt: Date | null
  currentStageId: string | null
  createdAt: Date
  customer: { id: string; workspaceId: string; name: string; contact: string | null; memo: string | null; createdAt: Date }
  stages: Array<{ id: string; order: number; internalName: string; customerName: string; projectId: string; completedAt: Date | null }>
  revisions: Array<{ id: string; status: string }>
  assets: Array<{ id: string }>
}

export type GetProjectsResult = {
  projects: ProjectWithAssignee[]
  totalCount: number
  page: number
  totalPages: number
  role: WorkspaceRole
}

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

async function requireAuth(): Promise<{ workspaceId: string; userId: string; role: WorkspaceRole }> {
  const session = await auth()
  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
  const { workspaceId } = session.user
  const userId = session.user.id
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  })
  const role = (member?.role as WorkspaceRole) ?? 'MEMBER'
  return { workspaceId, userId, role }
}

function parseDueDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseBudget(value: string): number | null {
  if (!value) return null
  const budget = Number(value)
  if (!Number.isInteger(budget) || budget < 0) return null
  return budget
}

export async function getProjectFormData() {
  const workspaceId = await requireWorkspaceId()
  await seedDefaultWorkflowTemplates(workspaceId)

  const [customers, templates, members] = await Promise.all([
    prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    }),
    prisma.workflowTemplate.findMany({
      where: { workspaceId },
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return { customers, templates, members }
}

export async function getWorkspaceMembers() {
  const workspaceId = await requireWorkspaceId()
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

const PAGE_SIZE = 20

export async function getProjects(
  status?: string,
  q?: string,
  archived?: string,
  page?: number,
  assigneeFilter?: string,
): Promise<GetProjectsResult> {
  const { workspaceId, userId, role } = await requireAuth()

  const searchFilter = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { customer: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  // MEMBER는 본인 담당 프로젝트만 — 파라미터로 우회 불가
  const roleFilter =
    role === 'MEMBER'
      ? { assigneeId: userId }
      : assigneeFilter
        ? { assigneeId: assigneeFilter }
        : {}

  const where = {
    workspaceId,
    archivedAt: archived === 'true' ? { not: null } : null,
    ...searchFilter,
    ...roleFilter,
  }

  const currentPage = Math.max(1, page ?? 1)
  const skip = (currentPage - 1) * PAGE_SIZE

  const [rawProjects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        customer: true,
        stages: { orderBy: { order: 'asc' } },
        revisions: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        },
        assets: true,
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
      skip,
    }),
    prisma.project.count({ where }),
  ])

  // status 필터 (done/in_progress)는 클라이언트 필터이므로 count와 일치하지 않을 수 있음
  // 단순 구현: status 필터는 in-memory (페이지 내에서만 적용)
  const filteredProjects =
    status === 'done'
      ? rawProjects.filter(isProjectDone)
      : status === 'in_progress'
        ? rawProjects.filter((p) => !isProjectDone(p))
        : rawProjects

  // 담당자 이름 일괄 조회
  const assigneeIds = [...new Set(
    filteredProjects.map((p) => p.assigneeId).filter(Boolean) as string[]
  )]
  const assigneeNameMap =
    assigneeIds.length > 0
      ? await prisma.user
          .findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, name: true },
          })
          .then((users) => new Map(users.map((u) => [u.id, u.name])))
      : new Map<string, string | null>()

  const projects = filteredProjects.map((p) => ({
    ...p,
    assigneeName: p.assigneeId ? (assigneeNameMap.get(p.assigneeId) ?? null) : null,
  }))

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return { projects, totalCount, page: currentPage, totalPages, role }
}

export async function createTimelineMemo(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const projectId = ((formData.get('projectId') as string | null) ?? '').trim()
  const content = ((formData.get('content') as string | null) ?? '').trim()

  if (!content) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  })
  if (!project) return

  await prisma.timelineEvent.create({
    data: {
      projectId,
      title: content,
      eventType: 'MEMO',
    },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function getProjectDetail(projectId: string) {
  const workspaceId = await requireWorkspaceId()

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    include: {
      customer: true,
      stages: { orderBy: { order: 'asc' } },
      revisions: { orderBy: { createdAt: 'desc' } },
      assets: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' } },
      publicPage: true,
    },
  })

  if (!project) return null

  const [assignee, members, customers] = await Promise.all([
    project.assigneeId
      ? prisma.workspaceMember.findFirst({
          where: { workspaceId, userId: project.assigneeId },
          include: { user: true },
        })
      : Promise.resolve(null),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    }),
  ])

  return { project, assignee, members, customers }
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const workspaceId = await requireWorkspaceId()
  const customerId = stringValue(formData, 'customerId')
  const title = stringValue(formData, 'title')
  const dueDate = parseDueDate(stringValue(formData, 'dueDate'))
  const budget = parseBudget(stringValue(formData, 'budget'))
  const assigneeId = stringValue(formData, 'assigneeId') || null
  const templateId = stringValue(formData, 'templateId')

  if (!customerId) return { error: '고객을 선택해 주세요.' }
  if (!title) return { error: '프로젝트 제목을 입력해 주세요.' }
  if (!templateId) return { error: '워크플로우 템플릿을 선택해 주세요.' }

  const [customer, template, assignee] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, workspaceId } }),
    prisma.workflowTemplate.findFirst({
      where: { id: templateId, workspaceId },
      include: { stages: { orderBy: { order: 'asc' } } },
    }),
    assigneeId
      ? prisma.workspaceMember.findFirst({ where: { workspaceId, userId: assigneeId } })
      : Promise.resolve(null),
  ])

  if (!customer) return { error: '선택한 고객을 찾을 수 없습니다.' }
  if (!template) return { error: '선택한 템플릿을 찾을 수 없습니다.' }
  if (template.stages.length === 0) return { error: '템플릿에 단계가 없습니다.' }
  if (assigneeId && !assignee) return { error: '선택한 담당자를 찾을 수 없습니다.' }

  const project = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        workspaceId,
        customerId,
        title,
        dueDate,
        budget,
        assigneeId,
      },
    })

    let firstStageId: string | null = null
    for (const stage of template.stages) {
      const createdStage = await tx.workflowStage.create({
        data: {
          projectId: createdProject.id,
          internalName: stage.internalName,
          customerName: stage.customerName,
          order: stage.order,
        },
      })
      firstStageId ??= createdStage.id
    }

    await tx.project.update({
      where: { id: createdProject.id },
      data: { currentStageId: firstStageId },
    })

    await tx.timelineEvent.create({
      data: {
        projectId: createdProject.id,
        title: `프로젝트 생성: ${template.name} 템플릿 적용`,
        eventType: 'PROJECT_CREATED',
        metadata: { templateId: template.id, templateName: template.name },
      },
    })

    return createdProject
  })

  revalidatePath('/projects')
  redirect(`/projects/${project.id}`)
}

export async function updateProjectBudget(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const projectId = stringValue(formData, 'projectId')
  const budget = parseBudget(stringValue(formData, 'budget'))

  if (!projectId) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  })
  if (!project) return

  await prisma.project.update({
    where: { id: projectId },
    data: { budget },
  })

  revalidatePath('/analytics')
  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}

export async function archiveProject(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const projectId = stringValue(formData, 'projectId')
  if (!projectId) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true, archivedAt: true },
  })
  if (!project || project.archivedAt) return

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId,
        title: '프로젝트 아카이브',
        eventType: 'ARCHIVED',
      },
    }),
  ])

  revalidatePath('/dashboard')
  revalidatePath('/analytics')
  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}

export async function unarchiveProject(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const projectId = stringValue(formData, 'projectId')
  if (!projectId) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true, archivedAt: true },
  })
  if (!project || !project.archivedAt) return

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: null },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId,
        title: '아카이브 해제',
        eventType: 'UNARCHIVED',
      },
    }),
  ])

  revalidatePath('/dashboard')
  revalidatePath('/analytics')
  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}

export async function duplicateProject(
  _prevState: DuplicateProjectState,
  formData: FormData
): Promise<DuplicateProjectState> {
  const workspaceId = await requireWorkspaceId()
  const sourceId = stringValue(formData, 'sourceId')
  const title = stringValue(formData, 'title')
  const customerId = stringValue(formData, 'customerId')
  const dueDate = parseDueDate(stringValue(formData, 'dueDate'))

  if (!sourceId) return { error: '복제할 프로젝트를 찾을 수 없습니다.' }
  if (!title) return { error: '새 프로젝트 제목을 입력해 주세요.' }

  const source = await prisma.project.findFirst({
    where: { id: sourceId, workspaceId },
    include: { stages: { orderBy: { order: 'asc' } } },
  })
  if (!source) return { error: '복제할 프로젝트를 찾을 수 없습니다.' }

  const nextCustomerId = customerId || source.customerId
  const customer = await prisma.customer.findFirst({
    where: { id: nextCustomerId, workspaceId },
    select: { id: true },
  })
  if (!customer) return { error: '선택한 고객을 찾을 수 없습니다.' }

  const newProject = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        workspaceId,
        customerId: nextCustomerId,
        title,
        dueDate,
        budget: source.budget,
      },
    })

    let firstStageId: string | null = null
    for (const stage of source.stages) {
      const createdStage = await tx.workflowStage.create({
        data: {
          projectId: createdProject.id,
          internalName: stage.internalName,
          customerName: stage.customerName,
          order: stage.order,
          completedAt: null,
        },
      })
      firstStageId ??= createdStage.id
    }

    await tx.project.update({
      where: { id: createdProject.id },
      data: { currentStageId: firstStageId },
    })

    return createdProject
  })

  revalidatePath('/projects')
  redirect(`/projects/${newProject.id}`)
}

export async function updateProjectStage(formData: FormData): Promise<void> {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  if (!workspaceId) throw new Error('로그인이 필요합니다.')
  const projectId = stringValue(formData, 'projectId')
  const stageId = stringValue(formData, 'stageId')

  if (!projectId || !stageId) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { stages: true },
  })
  if (!project) return

  const nextStage = project.stages.find((stage) => stage.id === stageId)
  if (!nextStage || project.currentStageId === stageId) return

  const previousStage = project.stages.find(
    (stage) => stage.id === project.currentStageId
  )

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: { currentStageId: stageId },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId,
        title: `${previousStage?.internalName ?? '단계 없음'} → ${nextStage.internalName}`,
        eventType: 'STAGE_CHANGE',
        metadata: {
          previousStageId: previousStage?.id ?? null,
          previousStageName: previousStage?.internalName ?? null,
          nextStageId: nextStage.id,
          nextStageName: nextStage.internalName,
        },
      },
    }),
  ])

  if (project.assigneeId && project.assigneeId !== session.user.id) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      await sendNotification({
        userIds: [project.assigneeId],
        workspaceId,
        type: 'STAGE_CHANGED',
        title: '프로젝트 단계가 변경되었습니다',
        body: `${previousStage?.internalName ?? '단계 없음'} → ${nextStage.internalName}`,
        href: `/projects/${projectId}`,
        emailFn: (to) =>
          sendStageChangedEmail(to, {
            projectTitle: project.title,
            fromStage: previousStage?.internalName ?? '단계 없음',
            toStage: nextStage.internalName,
            changedBy: session.user.name ?? session.user.email ?? '팀원',
            projectUrl: `${appUrl}/projects/${projectId}`,
          }),
      })
    } catch (error) {
      console.error('[notification] updateProjectStage failed', { projectId, error })
    }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}
