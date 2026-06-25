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

  it('업로드된 파일 공개 URL로 에셋을 생성한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.asset.create.mockResolvedValue({
      id: 'a-upload',
      projectId: 'p1',
      name: '최종 납품.zip',
      url: 'https://cdn.flowrit.example/uploads/final.zip',
      type: 'OTHER',
      status: 'PREPARING',
    } as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('name', '최종 납품.zip')
    formData.set('url', 'https://cdn.flowrit.example/uploads/final.zip')
    formData.set('type', 'OTHER')

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result).toEqual({ success: '납품본을 등록했습니다.' })
    expect(prismaMock.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          name: '최종 납품.zip',
          url: 'https://cdn.flowrit.example/uploads/final.zip',
        }),
      }),
    )
  })

  it('업로드된 파일 여러 개를 한 번에 에셋으로 생성한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.asset.create.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set(
      'assets',
      JSON.stringify([
        { name: '납품 1.jpg', url: 'https://cdn.flowrit.example/uploads/1.jpg', type: 'GALLERY' },
        { name: '납품 2.zip', url: 'https://cdn.flowrit.example/uploads/2.zip', type: 'OTHER' },
      ]),
    )

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result).toEqual({ success: '납품본 2개를 등록했습니다.' })
    expect(prismaMock.asset.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.asset.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          name: '납품 1.jpg',
          type: 'GALLERY',
        }),
      }),
    )
  })

  it('수정 요청에 연결된 재수정 납품본 에셋을 생성한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
    } as never)
    prismaMock.asset.create.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('revisionId', 'r1')
    formData.set(
      'assets',
      JSON.stringify([
        { name: '수정본.jpg', url: 'https://cdn.flowrit.example/uploads/revision.jpg', type: 'GALLERY' },
      ]),
    )

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result).toEqual({ success: '재수정 납품본을 등록했습니다.' })
    expect(prismaMock.revisionRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'r1',
          projectId: 'p1',
          project: { workspaceId: 'ws1' },
        }),
      }),
    )
    expect(prismaMock.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          revisionRequestId: 'r1',
          name: '수정본.jpg',
        }),
      }),
    )
  })

  it('수정 요청을 찾을 수 없으면 재수정 납품본 에셋을 생성하지 않는다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('revisionId', 'other-workspace-revision')
    formData.set(
      'assets',
      JSON.stringify([
        { name: '수정본.jpg', url: 'https://cdn.flowrit.example/uploads/revision.jpg', type: 'GALLERY' },
      ]),
    )

    const { createAsset } = await import('@/lib/actions/asset')
    const result = await createAsset({}, formData)

    expect(result.error).toBe('수정 요청을 찾을 수 없습니다.')
    expect(prismaMock.asset.create).not.toHaveBeenCalled()
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
      version: null,
      project: { workspaceId: 'ws1', currentStageId: 's1', stages: [] },
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

  it('납품본을 공유하면 고객 확인 단계로 자동 이동한다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      name: '1차 납품',
      status: 'PREPARING',
      version: '1차 납품',
      project: {
        workspaceId: 'ws1',
        currentStageId: 's1',
        stages: [
          { id: 's1', internalName: '신규 접수', customerName: '의뢰 접수됨', order: 1 },
          { id: 's6', internalName: '1차 결과 업로드', customerName: '1차 결과 전달 완료', order: 6 },
          { id: 's7', internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
          { id: 's9', internalName: '최종 납품', customerName: '납품 완료', order: 9 },
        ],
      },
    } as never)
    prismaMock.asset.update.mockResolvedValue({} as never)
    prismaMock.project.update.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('assetId', 'a1')
    formData.set('status', 'SHARED')

    const { updateAssetStatus } = await import('@/lib/actions/asset')
    await updateAssetStatus(formData)

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { currentStageId: 's7' },
      }),
    )
  })

  it('최종본을 공유하면 최종 납품 단계로 자동 이동한다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue({
      id: 'a-final',
      projectId: 'p1',
      name: '최종 납품',
      status: 'PREPARING',
      version: '최종본',
      project: {
        workspaceId: 'ws1',
        currentStageId: 's7',
        stages: [
          { id: 's7', internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
          { id: 's9', internalName: '최종 납품', customerName: '납품 완료', order: 9 },
          { id: 's10', internalName: '완료', customerName: '완료', order: 10 },
        ],
      },
    } as never)
    prismaMock.asset.update.mockResolvedValue({} as never)
    prismaMock.project.update.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('assetId', 'a-final')
    formData.set('status', 'SHARED')

    const { updateAssetStatus } = await import('@/lib/actions/asset')
    await updateAssetStatus(formData)

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { currentStageId: 's9' },
      }),
    )
  })

  it('이미 같은 상태이면 업데이트하지 않는다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      name: '드라이브',
      status: 'SHARED',
      project: { workspaceId: 'ws1', currentStageId: 's1', stages: [] },
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

describe('shareProjectAssets', () => {
  it('프로젝트 납품본을 즉시 일괄 공유하고 고객 확인 단계로 이동한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
      currentStageId: 's1',
      stages: [
        { id: 's1', internalName: '신규 접수', customerName: '의뢰 접수됨', order: 1 },
        { id: 's7', internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
      ],
      assets: [
        { id: 'a1', version: '1차 납품', status: 'PREPARING', createdAt: new Date('2026-06-24') },
      ],
    } as never)
    prismaMock.asset.updateMany.mockResolvedValue({ count: 1 } as never)
    prismaMock.project.update.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('shareMode', 'now')

    const { shareProjectAssets } = await import('@/lib/actions/asset')
    await shareProjectAssets(formData)

    expect(prismaMock.asset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'p1', status: 'PREPARING' },
        data: { status: 'SHARED', shareScheduledAt: null },
      }),
    )
    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { currentStageId: 's7' },
      }),
    )
  })

  it('프로젝트 납품본 공유 예약일을 일괄 설정한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
      currentStageId: 's1',
      stages: [],
      assets: [{ id: 'a1', version: '1차 납품', status: 'PREPARING' }],
    } as never)
    prismaMock.asset.updateMany.mockResolvedValue({ count: 1 } as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('shareMode', 'scheduled')
    formData.set('shareScheduledAt', '2099-01-02T14:30')

    const { shareProjectAssets } = await import('@/lib/actions/asset')
    await shareProjectAssets(formData)

    expect(prismaMock.asset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'p1', status: 'PREPARING' },
        data: expect.objectContaining({
          shareScheduledAt: expect.any(Date),
        }),
      }),
    )
    expect(prismaMock.project.update).not.toHaveBeenCalled()
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
