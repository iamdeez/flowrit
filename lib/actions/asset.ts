'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type AssetFormState = {
  error?: string
  success?: string
}

const assetTypes = new Set(['DRIVE', 'GALLERY', 'VIDEO', 'DOCUMENT', 'OTHER'])
const assetStatuses = new Set(['PREPARING', 'SHARED', 'EXPIRED'])

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
  const expiredAt = parseOptionalDate(stringValue(formData, 'expiredAt'))

  if (!projectId) return { error: '프로젝트를 찾을 수 없습니다.' }
  if (!name) return { error: '링크 이름을 입력해 주세요.' }
  if (!url) return { error: 'http 또는 https로 시작하는 외부 URL을 입력해 주세요.' }
  if (!assetTypes.has(type)) return { error: '에셋 타입을 다시 선택해 주세요.' }

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  })
  if (!project) return { error: '프로젝트를 찾을 수 없습니다.' }

  await prisma.$transaction([
    prisma.asset.create({
      data: {
        projectId,
        name,
        url,
        type,
        version,
        expiredAt,
      },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId,
        title: `파일·링크 등록: ${name}`,
        eventType: 'ASSET_CREATED',
        metadata: { type, version, expiredAt },
      },
    }),
  ])

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)

  return { success: '파일·링크를 등록했습니다.' }
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
    include: { project: true },
  })

  if (!asset || asset.status === status) return

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
  ])

  revalidatePath('/projects')
  revalidatePath(`/projects/${asset.projectId}`)
}
