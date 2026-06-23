'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type FieldActionState = {
  error?: string
  success?: boolean
}

export type FormFieldRow = {
  id: string
  fieldKey: string
  label: string
  type: string
  placeholder: string | null
  required: boolean
  order: number
  isSystem: boolean
  options: string[] | null
}

const DEFAULT_FIELDS: Omit<FormFieldRow, 'id'>[] = [
  { fieldKey: 'name', label: '이름', type: 'text', placeholder: '홍길동', required: true, order: 0, isSystem: true, options: null },
  { fieldKey: 'contact', label: '연락처', type: 'text', placeholder: '010-0000-0000 또는 이메일', required: false, order: 1, isSystem: true, options: null },
  { fieldKey: 'preferredDate', label: '희망 날짜', type: 'date', placeholder: null, required: false, order: 2, isSystem: false, options: null },
  { fieldKey: 'budget', label: '예산', type: 'text', placeholder: '예: 50만원 이상', required: false, order: 3, isSystem: false, options: null },
  { fieldKey: 'content', label: '의뢰 내용', type: 'textarea', placeholder: '원하시는 내용, 일정, 참고사항 등을 자유롭게 적어주세요.', required: true, order: 4, isSystem: true, options: null },
  { fieldKey: 'files', label: '참고 파일 첨부', type: 'file', placeholder: null, required: false, order: 5, isSystem: true, options: null },
]

async function requireOwner(): Promise<string> {
  const session = await auth()
  if (!session?.user?.workspaceId || !session.user.id) throw new Error('로그인이 필요합니다.')
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: session.user.workspaceId, userId: session.user.id } },
  })
  if (!member || member.role !== 'OWNER') throw new Error('권한이 없습니다.')
  return session.user.workspaceId
}

function toRow(raw: { id: string; fieldKey: string; label: string; type: string; placeholder: string | null; required: boolean; order: number; isSystem: boolean; options: unknown }): FormFieldRow {
  const options = Array.isArray(raw.options) ? (raw.options as string[]) : null
  return { ...raw, options }
}

export async function getOrInitOrderFormFields(workspaceId: string): Promise<FormFieldRow[]> {
  const existing = await prisma.orderFormField.findMany({
    where: { workspaceId },
    orderBy: { order: 'asc' },
  })
  if (existing.length > 0) return existing.map(toRow)

  await prisma.orderFormField.createMany({
    data: DEFAULT_FIELDS.map((f) => ({ ...f, workspaceId, options: f.options ?? undefined })),
  })
  const seeded = await prisma.orderFormField.findMany({
    where: { workspaceId },
    orderBy: { order: 'asc' },
  })
  return seeded.map(toRow)
}

export async function addOrderFormField(
  _prevState: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  let workspaceId: string
  try { workspaceId = await requireOwner() } catch (e) { return { error: (e as Error).message } }

  const label = ((formData.get('label') as string) ?? '').trim()
  const type = (formData.get('type') as string) ?? ''
  const placeholder = ((formData.get('placeholder') as string) ?? '').trim()
  const required = formData.get('required') === 'on'
  const optionsRaw = ((formData.get('options') as string) ?? '').trim()

  if (!label) return { error: '필드 이름을 입력해 주세요.' }
  if (!['text', 'textarea', 'date', 'select'].includes(type)) return { error: '올바른 필드 유형을 선택해 주세요.' }

  const fieldKey = `custom_${Date.now()}`

  const agg = await prisma.orderFormField.aggregate({ where: { workspaceId }, _max: { order: true } })
  const order = (agg._max.order ?? -1) + 1

  const options = type === 'select' && optionsRaw
    ? optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
    : undefined

  await prisma.orderFormField.create({
    data: { workspaceId, label, fieldKey, type, placeholder: placeholder || null, required, order, isSystem: false, options },
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updateOrderFormField(
  _prevState: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  let workspaceId: string
  try { workspaceId = await requireOwner() } catch (e) { return { error: (e as Error).message } }

  const id = (formData.get('id') as string) ?? ''
  const label = ((formData.get('label') as string) ?? '').trim()
  const placeholder = ((formData.get('placeholder') as string) ?? '').trim()
  const required = formData.get('required') === 'on'
  const optionsRaw = ((formData.get('options') as string) ?? '').trim()

  if (!id) return { error: '필드를 찾을 수 없습니다.' }
  if (!label) return { error: '필드 이름을 입력해 주세요.' }

  const field = await prisma.orderFormField.findFirst({ where: { id, workspaceId } })
  if (!field) return { error: '필드를 찾을 수 없습니다.' }

  const options: string[] | undefined =
    field.type === 'select' && optionsRaw
      ? optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(field.options)
        ? (field.options as string[])
        : undefined

  const finalRequired = field.fieldKey === 'name' || field.fieldKey === 'content' ? true : required

  await prisma.orderFormField.update({
    where: { id },
    data: { label, placeholder: placeholder || null, required: finalRequired, options },
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteOrderFormField(id: string): Promise<{ error?: string }> {
  let workspaceId: string
  try { workspaceId = await requireOwner() } catch (e) { return { error: (e as Error).message } }

  const field = await prisma.orderFormField.findFirst({ where: { id, workspaceId } })
  if (!field) return { error: '필드를 찾을 수 없습니다.' }
  if (field.isSystem) return { error: '기본 필드는 삭제할 수 없습니다.' }

  await prisma.orderFormField.delete({ where: { id } })
  revalidatePath('/settings')
  return {}
}

export async function moveOrderFormField(id: string, direction: 'up' | 'down'): Promise<{ error?: string }> {
  let workspaceId: string
  try { workspaceId = await requireOwner() } catch (e) { return { error: (e as Error).message } }

  const fields = await prisma.orderFormField.findMany({
    where: { workspaceId },
    orderBy: { order: 'asc' },
  })

  const index = fields.findIndex((f) => f.id === id)
  if (index === -1) return { error: '필드를 찾을 수 없습니다.' }

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= fields.length) return {}

  const current = fields[index]
  const swap = fields[swapIndex]

  await prisma.$transaction([
    prisma.orderFormField.update({ where: { id: current.id }, data: { order: swap.order } }),
    prisma.orderFormField.update({ where: { id: swap.id }, data: { order: current.order } }),
  ])

  revalidatePath('/settings')
  return {}
}
