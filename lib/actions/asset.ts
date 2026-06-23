'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MAX_ASSET_UPLOAD_FILES } from '@/lib/upload-constants'
import { findDeliveryStageForVersion } from '@/lib/project-utils'

export type AssetFormState = {
  error?: string
  success?: string
}

const assetTypes = new Set(['DRIVE', 'GALLERY', 'VIDEO', 'DOCUMENT', 'OTHER'])
const assetStatuses = new Set(['PREPARING', 'SHARED', 'EXPIRED'])

type AssetInput = {
  name: string
  url: string
  type: string
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

function normalizeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function parseOptionalDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseOptionalDateTime(value: string): Date | null {
  if (!value) return null
  const normalized = value.includes('T') ? value : `${value}T09:00`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseUploadedAssets(formData: FormData): AssetInput[] | null {
  const raw = stringValue(formData, 'assets')
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.map((item) => {
      if (!item || typeof item !== 'object') return { name: '', url: '', type: '' }
      const value = item as Record<string, unknown>
      return {
        name: typeof value.name === 'string' ? value.name.trim() : '',
        url: typeof value.url === 'string' ? value.url.trim() : '',
        type: typeof value.type === 'string' ? value.type.trim() : 'OTHER',
      }
    })
  } catch {
    return []
  }
}

export async function createAsset(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const workspaceId = await requireWorkspaceId()
  const projectId = stringValue(formData, 'projectId')
  const name = stringValue(formData, 'name')
  const url = normalizeExternalUrl(stringValue(formData, 'url'))
  const type = stringValue(formData, 'type') || 'OTHER'
  const version = stringValue(formData, 'version') || null
  const revisionId = stringValue(formData, 'revisionId') || null
  const expiredAt = parseOptionalDate(stringValue(formData, 'expiredAt'))
  const uploadedAssets = parseUploadedAssets(formData)

  if (!projectId) return { error: '프로젝트를 찾을 수 없습니다.' }

  const assets = uploadedAssets
    ? uploadedAssets.map((asset) => ({
        name: asset.name,
        url: normalizeExternalUrl(asset.url),
        type: assetTypes.has(asset.type) ? asset.type : 'OTHER',
      }))
    : [{ name, url, type }]

  if (assets.length === 0) return { error: '등록할 파일을 업로드해 주세요.' }
  if (assets.length > MAX_ASSET_UPLOAD_FILES) return { error: `파일은 최대 ${MAX_ASSET_UPLOAD_FILES}개까지 등록할 수 있습니다.` }
  if (assets.some((asset) => !asset.name)) return { error: '납품본 이름을 입력해 주세요.' }
  if (assets.some((asset) => !asset.url)) return { error: '파일을 업로드하거나 http 또는 https로 시작하는 외부 URL을 입력해 주세요.' }
  if (!uploadedAssets && !assetTypes.has(type)) return { error: '에셋 타입을 다시 선택해 주세요.' }

  const [project, revision] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    }),
    revisionId
      ? prisma.revisionRequest.findFirst({
          where: { id: revisionId, projectId, project: { workspaceId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])
  if (!project) return { error: '프로젝트를 찾을 수 없습니다.' }
  if (revisionId && !revision) return { error: '수정 요청을 찾을 수 없습니다.' }

  await prisma.$transaction(
    assets.flatMap((asset) => [
      prisma.asset.create({
        data: {
          projectId,
          revisionRequestId: revisionId,
          name: asset.name,
          url: asset.url!,
          type: asset.type,
          version,
          expiredAt,
        },
      }),
      prisma.timelineEvent.create({
        data: {
          projectId,
          title: revisionId
            ? `재수정 납품본 등록: ${asset.name}`
            : `납품본 등록: ${asset.name}`,
          eventType: 'ASSET_CREATED',
          metadata: { type: asset.type, version, expiredAt, revisionId },
        },
      }),
    ])
  )

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)

  if (revisionId && assets.length > 1) return { success: `재수정 납품본 ${assets.length}개를 등록했습니다.` }
  if (revisionId) return { success: '재수정 납품본을 등록했습니다.' }
  if (assets.length > 1) return { success: `납품본 ${assets.length}개를 등록했습니다.` }
  return { success: '납품본을 등록했습니다.' }
}

export async function deleteAsset(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const assetId = stringValue(formData, 'assetId')

  if (!assetId) return

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, project: { workspaceId } },
    include: { project: true },
  })

  if (!asset) return

  await prisma.$transaction([
    prisma.asset.delete({ where: { id: asset.id } }),
    prisma.timelineEvent.create({
      data: {
        projectId: asset.projectId,
        title: `파일·링크 삭제: ${asset.name}`,
        eventType: 'ASSET_DELETED',
        metadata: { assetId: asset.id, name: asset.name },
      },
    }),
  ])

  revalidatePath('/projects')
  revalidatePath(`/projects/${asset.projectId}`)
}

export async function updateAssetStatus(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const assetId = stringValue(formData, 'assetId')
  const status = stringValue(formData, 'status')

  if (!assetId || !assetStatuses.has(status)) return

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, project: { workspaceId } },
    include: {
      project: {
        include: { stages: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!asset || asset.status === status) return

  const currentStage = asset.project.stages.find((stage) => stage.id === asset.project.currentStageId)
  const nextStage = status === 'SHARED'
    ? findDeliveryStageForVersion(asset.project.stages, asset.version)
    : null
  const shouldAdvanceStage = Boolean(
    nextStage &&
      (!currentStage || nextStage.order > currentStage.order)
  )

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: asset.id },
      data: { status },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId: asset.projectId,
        title: `파일·링크 상태 변경: ${asset.status} → ${status}`,
        eventType: 'ASSET_STATUS_CHANGE',
        metadata: {
          assetId: asset.id,
          previousStatus: asset.status,
          nextStatus: status,
        },
      },
    }),
    ...(shouldAdvanceStage && nextStage
      ? [
          prisma.project.update({
            where: { id: asset.projectId },
            data: { currentStageId: nextStage.id },
          }),
          prisma.timelineEvent.create({
            data: {
              projectId: asset.projectId,
              title: `납품 공유로 단계 변경: ${currentStage?.internalName ?? '단계 없음'} → ${nextStage.internalName}`,
              eventType: 'STAGE_CHANGE',
              metadata: {
                reason: 'ASSET_SHARED',
                assetId: asset.id,
                previousStageId: currentStage?.id ?? null,
                previousStageName: currentStage?.internalName ?? null,
                nextStageId: nextStage.id,
                nextStageName: nextStage.internalName,
              },
            },
          }),
        ]
      : []),
  ])

  revalidatePath('/projects')
  revalidatePath(`/projects/${asset.projectId}`)
}

export async function shareProjectAssets(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const projectId = stringValue(formData, 'projectId')
  const mode = stringValue(formData, 'shareMode') || 'now'
  const scheduledAt = parseOptionalDateTime(stringValue(formData, 'shareScheduledAt'))

  if (!projectId) return

  if (mode === 'cancel') {
    await prisma.$transaction([
      prisma.asset.updateMany({
        where: { projectId, status: 'PREPARING', shareScheduledAt: { not: null } },
        data: { shareScheduledAt: null },
      }),
      prisma.timelineEvent.create({
        data: {
          projectId,
          title: '납품 공유 예약 취소',
          eventType: 'ASSET_SHARE_CANCELLED',
          metadata: {},
        },
      }),
    ])
    revalidatePath('/projects')
    revalidatePath(`/projects/${projectId}`)
    return
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    include: {
      stages: { orderBy: { order: 'asc' } },
      assets: {
        where: { status: 'PREPARING' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!project || project.assets.length === 0) return

  if (mode === 'scheduled' && !scheduledAt) return

  if (mode === 'scheduled' && scheduledAt && scheduledAt.getTime() > Date.now()) {
    await prisma.$transaction([
      prisma.asset.updateMany({
        where: { projectId, status: 'PREPARING' },
        data: { shareScheduledAt: scheduledAt },
      }),
      prisma.timelineEvent.create({
        data: {
          projectId,
          title: `납품 일괄 공유 예약: ${scheduledAt.toLocaleString('ko-KR')}`,
          eventType: 'ASSET_SHARE_SCHEDULED',
          metadata: { shareScheduledAt: scheduledAt },
        },
      }),
    ])
  } else {
    const currentStage = project.stages.find((stage) => stage.id === project.currentStageId)
    const latestAsset = project.assets[0]
    const nextStage = findDeliveryStageForVersion(project.stages, latestAsset.version)
    const shouldAdvanceStage = Boolean(
      nextStage &&
        (!currentStage || nextStage.order > currentStage.order)
    )

    await prisma.$transaction([
      prisma.asset.updateMany({
        where: { projectId, status: 'PREPARING' },
        data: { status: 'SHARED', shareScheduledAt: null },
      }),
      prisma.timelineEvent.create({
        data: {
          projectId,
          title: '납품본 일괄 공유',
          eventType: 'ASSET_SHARED_BATCH',
          metadata: { assetCount: project.assets.length },
        },
      }),
      ...(shouldAdvanceStage && nextStage
        ? [
            prisma.project.update({
              where: { id: projectId },
              data: { currentStageId: nextStage.id },
            }),
            prisma.timelineEvent.create({
              data: {
                projectId,
                title: `납품 공유로 단계 변경: ${currentStage?.internalName ?? '단계 없음'} → ${nextStage.internalName}`,
                eventType: 'STAGE_CHANGE',
                metadata: {
                  reason: 'ASSET_SHARED_BATCH',
                  previousStageId: currentStage?.id ?? null,
                  previousStageName: currentStage?.internalName ?? null,
                  nextStageId: nextStage.id,
                  nextStageName: nextStage.internalName,
                },
              },
            }),
          ]
        : []),
    ])
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}
