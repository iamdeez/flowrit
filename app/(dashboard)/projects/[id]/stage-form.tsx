'use client'

import { useFormStatus } from 'react-dom'
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

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '변경 중...' : '단계 변경'}
    </button>
  )
}

export function StageForm({ projectId, currentStageId, stages }: StageFormProps) {
  return (
    <form action={updateProjectStage} className="flex gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select
        name="stageId"
        defaultValue={currentStageId ?? ''}
        className="min-w-52 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.internalName}
          </option>
        ))}
      </select>
      <SubmitButton />
    </form>
  )
}
