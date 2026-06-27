'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { CardForm, type CardInput } from './card-form'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export function ChangeCardModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(card: CardInput) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/change-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card }),
      })
      const result = await res.json()
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || '카드 변경에 실패했습니다.')
        setLoading(false)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="카드 변경"
      maxWidth="sm"
      description="새 카드를 등록하면 기존 카드는 자동으로 해지됩니다. 다음 결제일부터 새 카드로 청구됩니다."
    >
      <CardForm onSubmit={handleSubmit} loading={loading} submitLabel="새 카드 등록" error={error} />
      <p className="mt-3 text-center text-xs text-[var(--flowrit-text-muted)]">
        카드 정보는 나이스페이먼츠가 안전하게 보관합니다
      </p>
    </Modal>
  )
}
