'use client'

import { Check } from 'lucide-react'
import { updateProjectStage } from '@/lib/actions/project'

type StageFormProps = {
  projectId: string
  currentStageId: string | null
  stages: {
    id: string
    internalName: string
    customerName: string
  }[]
}

export function StageForm({ projectId, currentStageId, stages }: StageFormProps) {
  if (stages.length === 0) {
    return <p className="text-sm text-gray-400">단계 없음</p>
  }

  const currentIndex = stages.findIndex((s) => s.id === currentStageId)

  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage, index) => {
        const isDone = index < currentIndex
        const isCurrent = stage.id === currentStageId

        return (
          <form key={stage.id} action={updateProjectStage}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="stageId" value={stage.id} />
            <button
              type="submit"
              disabled={isCurrent}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isDone
                  ? 'bg-gray-700 text-white hover:bg-gray-800'
                  : isCurrent
                    ? 'cursor-default bg-indigo-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {isDone && <Check className="h-3 w-3" />}
              {stage.internalName}
            </button>
          </form>
        )
      })}
    </div>
  )
}
