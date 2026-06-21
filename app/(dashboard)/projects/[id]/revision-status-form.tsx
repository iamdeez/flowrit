'use client'

import { useFormStatus } from 'react-dom'
import { Check } from 'lucide-react'
import { updateRevisionStatus } from '@/lib/actions/revision'

type RevisionStatusFormProps = {
  revisionId: string
  status: string
  compact?: boolean
}

function DoneButton({ done }: { done: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || done}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5" />
      완료
    </button>
  )
}

export function RevisionStatusForm({
  revisionId,
  status,
  compact = false,
}: RevisionStatusFormProps) {
  const done = status === 'DONE'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'justify-end'}`}>
      <form action={updateRevisionStatus}>
        <input type="hidden" name="revisionId" value={revisionId} />
        <select
          name="status"
          defaultValue={status}
          aria-label="수정 요청 상태"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="OPEN">접수됨</option>
          <option value="IN_PROGRESS">진행 중</option>
          <option value="DONE">완료</option>
        </select>
      </form>

      <form action={updateRevisionStatus}>
        <input type="hidden" name="revisionId" value={revisionId} />
        <input type="hidden" name="status" value="DONE" />
        <DoneButton done={done} />
      </form>
    </div>
  )
}
