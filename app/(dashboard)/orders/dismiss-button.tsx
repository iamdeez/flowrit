'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { dismissInquiry } from '@/lib/actions/inquiry'

export function DismissInquiryButton({ inquiryId }: { inquiryId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDismiss() {
    if (!confirm('이 접수 건을 삭제하시겠습니까?')) return
    startTransition(async () => {
      await dismissInquiry(inquiryId)
    })
  }

  return (
    <button
      type="button"
      onClick={handleDismiss}
      disabled={isPending}
      className="flowrit-button-secondary min-h-8 px-3 py-1.5 text-xs text-[var(--flowrit-text-muted)] hover:border-red-200 hover:text-red-500 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" />
      삭제
    </button>
  )
}
