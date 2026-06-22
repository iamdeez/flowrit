'use client'

import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { deleteRevisionRequest, updateRevisionStatus } from '@/lib/actions/revision'

type RevisionStatusFormProps = {
  revisionId: string
  status: string
  compact?: boolean
}

function DeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="삭제"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--flowrit-text-muted)] transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function StatusSelect({ status, compact }: { status: string; compact: boolean }) {
  const { pending } = useFormStatus()
  return (
    <select
      name="status"
      defaultValue={status}
      disabled={pending}
      aria-label="수정 요청 상태"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`rounded-lg border border-[var(--flowrit-border)] bg-white text-xs font-medium text-[var(--flowrit-text)] transition-colors focus:border-[var(--flowrit-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--flowrit-primary)]/20 disabled:opacity-50 ${
        compact ? 'py-1.5 pl-2.5 pr-7' : 'py-2 pl-3 pr-8'
      }`}
    >
      <option value="OPEN">접수됨</option>
      <option value="IN_PROGRESS">진행 중</option>
      <option value="DONE">완료</option>
    </select>
  )
}

export function RevisionStatusForm({
  revisionId,
  status,
  compact = false,
}: RevisionStatusFormProps) {
  return (
    <div className="flex items-center gap-1.5">
      <form action={updateRevisionStatus}>
        <input type="hidden" name="revisionId" value={revisionId} />
        <StatusSelect status={status} compact={compact} />
      </form>

      <form action={deleteRevisionRequest}>
        <input type="hidden" name="revisionId" value={revisionId} />
        <DeleteButton />
      </form>
    </div>
  )
}
