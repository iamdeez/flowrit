'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { seedDefaultWorkflowTemplates } from '@/lib/default-workflow-templates'
import { isProjectDone } from '@/lib/project-utils'

export type ProjectFormState = {
  error?: string
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

function parseDueDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
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

export async function getProjects(status?: string, q?: string) {
  const workspaceId = await requireWorkspaceId()

  const searchFilter = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { customer: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  const projects = await prisma.project.findMany({
    where: { workspaceId, ...searchFilter },
    include: {
      customer: true,
      stages: { orderBy: { order: 'asc' } },
      revisions: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      },
      assets: true,
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  if (status === 'done') return projects.filter(isProjectDone)
  if (status === 'in_progress') return projects.filter((project) => !isProjectDone(project))
  return projects
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

  const [assignee, members] = await Promise.all([
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
  ])

  return { project, assignee, members }
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const workspaceId = await requireWorkspaceId()
  const customerId = stringValue(formData, 'customerId')
  const title = stringValue(formData, 'title')
  const dueDate = parseDueDate(stringValue(formData, 'dueDate'))
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

export async function updateProjectStage(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
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

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}
