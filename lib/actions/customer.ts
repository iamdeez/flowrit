'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type CustomerFormState = {
  error?: string
}

async function requireWorkspaceId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    throw new Error('로그인이 필요합니다.')
  }
  return session.user.workspaceId
}

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

export async function getCustomers(query?: string) {
  const workspaceId = await requireWorkspaceId()
  const search = query?.trim()

  return prisma.customer.findMany({
    where: {
      workspaceId,
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    include: {
      _count: {
        select: { projects: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCustomerDetail(customerId: string) {
  const workspaceId = await requireWorkspaceId()

  return prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    include: {
      projects: {
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      },
    },
  })
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const workspaceId = await requireWorkspaceId()
  const name = stringValue(formData, 'name')
  const contact = stringValue(formData, 'contact')
  const memo = stringValue(formData, 'memo')

  if (!name) {
    return { error: '고객 이름을 입력해 주세요.' }
  }

  const customer = await prisma.customer.create({
    data: {
      workspaceId,
      name,
      contact: contact || null,
      memo: memo || null,
    },
  })

  revalidatePath('/customers')
  redirect(`/customers/${customer.id}`)
}

export async function updateCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const workspaceId = await requireWorkspaceId()
  const id = stringValue(formData, 'id')
  const name = stringValue(formData, 'name')
  const contact = stringValue(formData, 'contact')
  const memo = stringValue(formData, 'memo')

  if (!id) {
    return { error: '고객 정보를 찾을 수 없습니다.' }
  }

  if (!name) {
    return { error: '고객 이름을 입력해 주세요.' }
  }

  const result = await prisma.customer.updateMany({
    where: { id, workspaceId },
    data: {
      name,
      contact: contact || null,
      memo: memo || null,
    },
  })

  if (result.count === 0) {
    return { error: '수정할 고객을 찾을 수 없습니다.' }
  }

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return {}
}

export async function deleteCustomer(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const id = stringValue(formData, 'id')

  if (!id) return

  await prisma.customer.deleteMany({
    where: { id, workspaceId },
  })

  revalidatePath('/customers')
  redirect('/customers')
}
