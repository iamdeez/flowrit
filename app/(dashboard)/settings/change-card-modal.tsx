'use client'

import { useState } from 'react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">카드 변경</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          새 카드를 등록하면 기존 카드는 자동으로 해지됩니다. 다음 결제일부터 새 카드로 청구됩니다.
        </p>

        <CardForm
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="새 카드 등록"
          error={error}
        />

        <p className="mt-3 text-center text-xs text-gray-400">
          카드 정보는 나이스페이먼츠가 안전하게 보관합니다
        </p>
      </div>
    </div>
  )
}
