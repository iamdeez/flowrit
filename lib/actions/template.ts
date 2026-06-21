'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { seedDefaultWorkflowTemplates } from '@/lib/default-workflow-templates'

export type TemplateFormState = {
  error?: string
  success?: string
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

function parseStages(formData: FormData) {
  const internalNames = formData.getAll('stageInternalName')
  const customerNames = formData.getAll('stageCustomerName')

  return internalNames
    .map((value, index) => ({
      internalName: String(value).trim(),
      customerName: String(customerNames[index] ?? '').trim(),
      order: index + 1,
    }))
    .filter((stage) => stage.internalName || stage.customerName)
}

function validateTemplate(formData: FormData): TemplateFormState | null {
  const name = stringValue(formData, 'name')
  const stages = parseStages(formData)

  if (!name) return { error: '템플릿 이름을 입력해 주세요.' }
  if (stages.length === 0) return { error: '단계를 1개 이상 추가해 주세요.' }

  const incompleteStage = stages.find(
    (stage) => !stage.internalName || !stage.customerName
  )
  if (incompleteStage) {
    return { error: '각 단계의 내부명과 고객 표시명을 모두 입력해 주세요.' }
  }

  return null
}

export async function getWorkflowTemplates() {
  const workspaceId = await requireWorkspaceId()
  await seedDefaultWorkflowTemplates(workspaceId)

  return prisma.workflowTemplate.findMany({
    where: { workspaceId },
    include: {
      stages: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
}

export async function createWorkflowTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const workspaceId = await requireWorkspaceId()
  const validation = validateTemplate(formData)
  if (validation) return validation

  const name = stringValue(formData, 'name')
  const industry = stringValue(formData, 'industry')
  const stages = parseStages(formData)

  await prisma.workflowTemplate.create({
    data: {
      workspaceId,
      name,
      industry: industry || null,
      isDefault: false,
      stages: { create: stages },
    },
  })

  revalidatePath('/templates')
  return { success: '템플릿을 생성했습니다.' }
}

export async function updateWorkflowTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const workspaceId = await requireWorkspaceId()
  const id = stringValue(formData, 'id')
  const validation = validateTemplate(formData)
  if (validation) return validation
  if (!id) return { error: '수정할 템플릿을 찾을 수 없습니다.' }

  const template = await prisma.workflowTemplate.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  })

  if (!template) return { error: '수정할 템플릿을 찾을 수 없습니다.' }

  const name = stringValue(formData, 'name')
  const industry = stringValue(formData, 'industry')
  const stages = parseStages(formData)

  await prisma.$transaction(async (tx) => {
    await tx.workflowTemplate.update({
      where: { id },
      data: {
        name,
        industry: industry || null,
      },
    })
    await tx.templateStage.deleteMany({ where: { templateId: id } })
    await tx.templateStage.createMany({
      data: stages.map((stage) => ({ ...stage, templateId: id })),
    })
  })

  revalidatePath('/templates')
  return { success: '템플릿을 저장했습니다.' }
}

export async function deleteWorkflowTemplate(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const id = stringValue(formData, 'id')
  if (!id) return

  await prisma.workflowTemplate.deleteMany({
    where: { id, workspaceId },
  })

  revalidatePath('/templates')
}
