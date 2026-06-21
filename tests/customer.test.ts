import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

const SESSION = {
  user: { id: 'u1', workspaceId: 'ws1', email: 'test@example.com', name: 'Test' },
} as never

beforeEach(async () => {
  mockReset(prismaMock)
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(SESSION)
})

// SC-003: 고객 CRUD + 검색
describe('getCustomers (SC-003)', () => {
  it('검색어 없이 전체 고객을 반환한다', async () => {
    const customers = [
      { id: 'c1', name: '김철수', workspaceId: 'ws1', _count: { projects: 2 } },
      { id: 'c2', name: '이영희', workspaceId: 'ws1', _count: { projects: 0 } },
    ]
    prismaMock.customer.findMany.mockResolvedValue(customers as never)

    const { getCustomers } = await import('@/lib/actions/customer')
    const result = await getCustomers()

    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: 'ws1' }),
      })
    )
    expect(result).toHaveLength(2)
  })

  it('검색어로 고객을 필터링한다', async () => {
    const customers = [
      { id: 'c1', name: '김철수', workspaceId: 'ws1', _count: { projects: 1 } },
    ]
    prismaMock.customer.findMany.mockResolvedValue(customers as never)

    const { getCustomers } = await import('@/lib/actions/customer')
    const result = await getCustomers('김철수')

    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'ws1',
          name: expect.objectContaining({ contains: '김철수' }),
        }),
      })
    )
    expect(result).toHaveLength(1)
  })
})

describe('createCustomer (SC-003)', () => {
  it('이름이 있으면 고객을 생성한다', async () => {
    prismaMock.customer.create.mockResolvedValue({
      id: 'c-new',
      workspaceId: 'ws1',
      name: '박민수',
    } as never)

    const formData = new FormData()
    formData.set('name', '박민수')
    formData.set('contact', '010-1234-5678')

    const { createCustomer } = await import('@/lib/actions/customer')
    await createCustomer({}, formData).catch(() => {}) // redirect throws

    expect(prismaMock.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws1',
          name: '박민수',
          contact: '010-1234-5678',
        }),
      })
    )
  })

  it('이름이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('name', '')

    const { createCustomer } = await import('@/lib/actions/customer')
    const result = await createCustomer({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.customer.create).not.toHaveBeenCalled()
  })
})

describe('updateCustomer (SC-003)', () => {
  it('이름을 수정하면 updateMany를 호출한다', async () => {
    prismaMock.customer.updateMany.mockResolvedValue({ count: 1 })

    const formData = new FormData()
    formData.set('id', 'c1')
    formData.set('name', '김수정')
    formData.set('contact', '')
    formData.set('memo', '')

    const { updateCustomer } = await import('@/lib/actions/customer')
    const result = await updateCustomer({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.customer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1', workspaceId: 'ws1' },
        data: expect.objectContaining({ name: '김수정' }),
      })
    )
  })

  it('id가 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('id', '')
    formData.set('name', '이름')

    const { updateCustomer } = await import('@/lib/actions/customer')
    const result = await updateCustomer({}, formData)

    expect(result.error).toBeDefined()
  })

  it('고객을 찾을 수 없으면 에러를 반환한다', async () => {
    prismaMock.customer.updateMany.mockResolvedValue({ count: 0 })

    const formData = new FormData()
    formData.set('id', 'nonexistent')
    formData.set('name', '이름')

    const { updateCustomer } = await import('@/lib/actions/customer')
    const result = await updateCustomer({}, formData)

    expect(result.error).toBeDefined()
  })
})

describe('deleteCustomer (SC-003)', () => {
  it('고객을 삭제하면 deleteMany를 호출한다', async () => {
    prismaMock.customer.deleteMany.mockResolvedValue({ count: 1 })

    const formData = new FormData()
    formData.set('id', 'c1')

    const { deleteCustomer } = await import('@/lib/actions/customer')
    await deleteCustomer(formData).catch(() => {}) // redirect throws

    expect(prismaMock.customer.deleteMany).toHaveBeenCalledWith({
      where: { id: 'c1', workspaceId: 'ws1' },
    })
  })
})
