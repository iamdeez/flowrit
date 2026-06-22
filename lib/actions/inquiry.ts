'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendNewInquiryEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

export type InquiryFormState = {
  error?: string
  success?: boolean
}

export type ConvertFormState = {
  error?: string
}

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

async function requireWorkspaceId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
  return session.user.workspaceId
}

export async function submitInquiry(
  workspaceSlug: string,
  _prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  })
  if (!workspace) return { error: '존재하지 않는 워크스페이스입니다.' }

  const name = stringValue(formData, 'name')
  const contact = stringValue(formData, 'contact')
  const content = stringValue(formData, 'content')
  const fileUrlsRaw = formData.get('fileUrls') as string | null
  const fileUrls = fileUrlsRaw ? (JSON.parse(fileUrlsRaw) as string[]) : []

  if (!name) return { error: '이름을 입력해 주세요.' }
  if (!content) return { error: '의뢰 내용을 입력해 주세요.' }

  const inquiry = await prisma.inquiry.create({
    data: {
      workspaceId: workspace.id,
      name,
      contact: contact || null,
      content,
      fileUrls,
    },
  })

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { userId: true },
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const excerpt = content.length > 100 ? `${content.slice(0, 100)}...` : content

    await sendNotification({
      userIds: members.map((member) => member.userId),
      workspaceId: workspace.id,
      type: 'NEW_INQUIRY',
      title: '새 의뢰가 접수되었습니다',
      body: `${name}: ${excerpt}`,
      href: '/dashboard',
      emailFn: (to) =>
        sendNewInquiryEmail(to, {
          submitterName: name,
          contact,
          excerpt,
          dashboardUrl: `${appUrl}/dashboard`,
        }),
    })
  } catch (error) {
    console.error('[notification] submitInquiry failed', { inquiryId: inquiry.id, error })
  }

  return { success: true }
}

export async function submitOrder(
  workspaceSlug: string,
  _prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } })
  if (!workspace) return { error: '존재하지 않는 워크스페이스입니다.' }

  const name = stringValue(formData, 'name')
  const contact = stringValue(formData, 'contact')
  const preferredDate = stringValue(formData, 'preferredDate')
  const budget = stringValue(formData, 'budget')
  const rawContent = stringValue(formData, 'content')
  const fileUrlsRaw = formData.get('fileUrls') as string | null
  const fileUrls = fileUrlsRaw ? (JSON.parse(fileUrlsRaw) as string[]) : []

  if (!name) return { error: '이름을 입력해 주세요.' }
  if (!rawContent) return { error: '의뢰 내용을 입력해 주세요.' }

  const metaLines: string[] = []
  if (preferredDate) metaLines.push(`희망 날짜: ${preferredDate}`)
  if (budget) metaLines.push(`예산: ${budget}`)
  const content = metaLines.length > 0 ? `${metaLines.join('\n')}\n---\n${rawContent}` : rawContent

  const inquiry = await prisma.inquiry.create({
    data: {
      workspaceId: workspace.id,
      name,
      contact: contact || null,
      content,
      fileUrls,
      formType: 'ORDER',
    },
  })

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { userId: true },
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const excerpt = rawContent.length > 100 ? `${rawContent.slice(0, 100)}...` : rawContent

    await sendNotification({
      userIds: members.map((m) => m.userId),
      workspaceId: workspace.id,
      type: 'NEW_INQUIRY',
      title: '[주문서] 새 의뢰가 접수되었습니다',
      body: `${name}: ${excerpt}`,
      href: '/orders',
      emailFn: (to) =>
        sendNewInquiryEmail(to, {
          submitterName: name,
          contact,
          excerpt,
          dashboardUrl: `${appUrl}/orders`,
        }),
    })
  } catch (error) {
    console.error('[notification] submitOrder failed', { inquiryId: inquiry.id, error })
  }

  return { success: true }
}

export async function dismissInquiry(inquiryId: string): Promise<{ error?: string }> {
  const workspaceId = await requireWorkspaceId()
  const inquiry = await prisma.inquiry.findFirst({ where: { id: inquiryId, workspaceId } })
  if (!inquiry) return { error: '접수 건을 찾을 수 없습니다.' }
  await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'DISMISSED' } })
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return {}
}

export async function getPendingInquiries() {
  const workspaceId = await requireWorkspaceId()

  return prisma.inquiry.findMany({
    where: { workspaceId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  })
}

export async function convertInquiryToProject(
  _prevState: ConvertFormState,
  formData: FormData
): Promise<ConvertFormState> {
  const workspaceId = await requireWorkspaceId()

  const inquiryId = stringValue(formData, 'inquiryId')
  const title = stringValue(formData, 'title')
  const templateId = stringValue(formData, 'templateId')
  const dueDateRaw = stringValue(formData, 'dueDate')
  const dueDate = dueDateRaw ? (() => { const d = new Date(`${dueDateRaw}T00:00:00`); return Number.isNaN(d.getTime()) ? null : d })() : null

  const existingCustomerId = stringValue(formData, 'existingCustomerId')
  const newCustomerName = stringValue(formData, 'newCustomerName')
  const newCustomerContact = stringValue(formData, 'newCustomerContact')

  if (!inquiryId) return { error: '접수 건을 찾을 수 없습니다.' }
  if (!title) return { error: '프로젝트 제목을 입력해 주세요.' }
  if (!templateId) return { error: '워크플로우 템플릿을 선택해 주세요.' }
  if (!existingCustomerId && !newCustomerName)
    return { error: '고객을 선택하거나 이름을 입력해 주세요.' }

  const [inquiry, template] = await Promise.all([
    prisma.inquiry.findFirst({ where: { id: inquiryId, workspaceId, status: 'PENDING' } }),
    prisma.workflowTemplate.findFirst({
      where: { id: templateId, workspaceId },
      include: { stages: { orderBy: { order: 'asc' } } },
    }),
  ])

  if (!inquiry) return { error: '접수 건을 찾을 수 없습니다.' }
  if (!template) return { error: '선택한 템플릿을 찾을 수 없습니다.' }
  if (template.stages.length === 0) return { error: '템플릿에 단계가 없습니다.' }

  if (existingCustomerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: existingCustomerId, workspaceId },
    })
    if (!customer) return { error: '선택한 고객을 찾을 수 없습니다.' }
  }

  const project = await prisma.$transaction(async (tx) => {
    let customerId = existingCustomerId

    if (!customerId) {
      const customer = await tx.customer.create({
        data: {
          workspaceId,
          name: newCustomerName,
          contact: newCustomerContact || null,
        },
      })
      customerId = customer.id
    }

    const createdProject = await tx.project.create({
      data: { workspaceId, customerId, title, dueDate },
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

    await Promise.all([
      tx.inquiry.update({
        where: { id: inquiryId },
        data: { status: 'CONVERTED', projectId: createdProject.id },
      }),
      tx.timelineEvent.create({
        data: {
          projectId: createdProject.id,
          title: `의뢰 접수에서 프로젝트 생성: ${template.name} 템플릿 적용`,
          eventType: 'PROJECT_CREATED',
          metadata: { templateId: template.id, templateName: template.name, inquiryId },
        },
      }),
    ])

    return createdProject
  })

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  redirect(`/projects/${project.id}`)
}
