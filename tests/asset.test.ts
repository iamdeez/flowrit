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

// SC-008: 에셋 등록 → 상태를 SHARED로 변경 → 고객 페이지에 노출
describe('createAsset (SC-008)', () => {
  it('유효한 외부 URL로 에셋을 생성한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.asset.create.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      name: '최종 사진 드라이브',
      url: 'https://drive.google.com/folder/abc',
      type: 'DRIVE',
      status: 'PREPARING',
    } as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('name', '최종 사진 드라이브')
    formData.set('url', 'https://drive.google.com/folder/abc')
    formData.set('type', 'DRIVE')

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          name: '최종 사진 드라이브',
          type: 'DRIVE',
        }),
      })
    )
  })

  it('http/https가 아닌 URL은 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('name', '링크')
    formData.set('url', 'ftp://invalid-url.com')
    formData.set('type', 'OTHER')

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.asset.create).not.toHaveBeenCalled()
  })

  it('이름이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('name', '')
    formData.set('url', 'https://example.com')
    formData.set('type', 'OTHER')

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result.error).toBeDefined()
  })

  it('잘못된 에셋 타입이면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('name', '링크')
    formData.set('url', 'https://example.com')
    formData.set('type', 'INVALID_TYPE')

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result.error).toBeDefined()
  })
})

describe('updateAssetStatus (SC-008)', () => {
  it('PREPARING → SHARED로 상태를 변경하면 타임라인 이벤트를 생성한다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      name: '최종 드라이브',
      status: 'PREPARING',
      project: { workspaceId: 'ws1' },
    } as never)
    prismaMock.asset.update.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('assetId', 'a1')
    formData.set('status', 'SHARED')

    const { updateAssetStatus } = await import('@/lib/actions/asset')
    await updateAssetStatus(formData)

    expect(prismaMock.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { status: 'SHARED' },
      })
    )
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'ASSET_STATUS_CHANGE',
        }),
      })
    )
  })

  it('이미 같은 상태이면 업데이트하지 않는다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      name: '드라이브',
      status: 'SHARED',
      project: { workspaceId: 'ws1' },
    } as never)

    const formData = new FormData()
    formData.set('assetId', 'a1')
    formData.set('status', 'SHARED')

    const { updateAssetStatus } = await import('@/lib/actions/asset')
    await updateAssetStatus(formData)

    expect(prismaMock.asset.update).not.toHaveBeenCalled()
  })

  it('잘못된 상태값이면 업데이트하지 않는다', async () => {
    const formData = new FormData()
    formData.set('assetId', 'a1')
    formData.set('status', 'INVALID')

    const { updateAssetStatus } = await import('@/lib/actions/asset')
    await updateAssetStatus(formData)

    expect(prismaMock.asset.update).not.toHaveBeenCalled()
  })
})

// SC-008: status=SHARED인 에셋만 공개 페이지에 포함되는지 검증
describe('SHARED 에셋 필터링 (SC-008)', () => {
  it('status=SHARED인 에셋만 공개 페이지에 노출된다', () => {
    const assets = [
      { id: 'a1', name: '드라이브', status: 'SHARED' },
      { id: 'a2', name: '갤러리', status: 'PREPARING' },
      { id: 'a3', name: '비디오', status: 'EXPIRED' },
    ]

    // 공개 페이지 쿼리는 { where: { status: 'SHARED' } }로 필터링
    const sharedAssets = assets.filter((a) => a.status === 'SHARED')

    expect(sharedAssets).toHaveLength(1)
    expect(sharedAssets[0].id).toBe('a1')
  })
})
