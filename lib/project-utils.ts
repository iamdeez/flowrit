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
