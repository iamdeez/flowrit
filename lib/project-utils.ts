export function getCurrentStage<
  T extends {
    currentStageId: string | null
    stages: {
      id: string
      internalName: string
      customerName: string
      order: number
    }[]
  },
>(project: T) {
  return project.stages.find((stage) => stage.id === project.currentStageId) ?? null
}

type DeliveryStageLike = {
  id: string
  internalName: string
  customerName: string
  order: number
}

function includesAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword))
}

export function findDeliveryStageForVersion<T extends DeliveryStageLike>(
  stages: T[],
  version: string | null,
): T | null {
  const orderedStages = [...stages].sort((a, b) => a.order - b.order)
  const isFinalDelivery = version?.includes('최종') ?? false

  if (isFinalDelivery) {
    const finalStage = orderedStages.find((stage) => {
      const label = `${stage.internalName} ${stage.customerName}`
      return includesAny(label, ['최종 납품', '납품 완료'])
    })
    if (finalStage) return finalStage
  }

  return orderedStages.find((stage) => {
    const label = `${stage.internalName} ${stage.customerName}`
    return includesAny(label, ['고객 확인', '확인 요청'])
  }) ?? orderedStages.find((stage) => {
    const label = `${stage.internalName} ${stage.customerName}`
    return includesAny(label, ['결과 업로드', '결과 전달', '납품'])
  }) ?? null
}

function isAssetSharedForCustomer(asset: { status?: string; shareScheduledAt?: Date | string | null }): boolean {
  if (asset.status === 'SHARED') return true
  if (!asset.shareScheduledAt) return false
  return new Date(asset.shareScheduledAt).getTime() <= Date.now()
}

export function getEffectiveStageFromSharedAssets<
  T extends {
    currentStageId: string | null
    stages: DeliveryStageLike[]
    assets: { status?: string; version: string | null; shareScheduledAt?: Date | string | null }[]
  },
>(project: T) {
  const currentStage = getCurrentStage(project)
  const sharedAssets = project.assets.filter(isAssetSharedForCustomer)
  const deliveryStage = sharedAssets
    .map((asset) => findDeliveryStageForVersion(project.stages, asset.version))
    .filter((stage): stage is DeliveryStageLike => Boolean(stage))
    .sort((a, b) => b.order - a.order)[0] ?? null

  if (!deliveryStage) return currentStage
  if (!currentStage || deliveryStage.order > currentStage.order) return deliveryStage
  return currentStage
}

export function findCompletionStage<T extends DeliveryStageLike>(stages: T[]): T | null {
  return [...stages].sort((a, b) => b.order - a.order).find((stage) => {
    const label = `${stage.internalName} ${stage.customerName}`
    return label.includes('완료')
  }) ?? null
}

export function isProjectDone<
  T extends {
    currentStageId: string | null
    stages: {
      id: string
      internalName: string
      customerName: string
      order: number
    }[]
  },
>(project: T) {
  const currentStage = getCurrentStage(project)
  return currentStage?.internalName === '완료' || currentStage?.customerName === '완료'
}
