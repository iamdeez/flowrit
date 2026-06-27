'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { CardForm, type CardInput } from './card-form'

type Props = {
  onClose: () => void
}

export function UpgradeModal({ onClose }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceLabel = billingCycle === 'monthly' ? '월 ₩29,900' : '연 ₩298,000 (17% 할인)'

  async function handleSubmit(card: CardInput) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card, billingCycle }),
      })
      const result = await res.json()
      if (result.success) {
        window.location.href = '/settings?tab=billing&upgraded=true'
      } else {
        setError(result.error || '결제에 실패했습니다.')
        setLoading(false)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Pro 플랜 업그레이드" maxWidth="md">
      {/* 혜택 */}
      <div className="mb-5 rounded-lg bg-[var(--flowrit-primary-soft)] p-4">
        <p className="mb-2 text-sm font-medium text-[var(--flowrit-primary-soft-text)]">Pro 플랜 혜택</p>
        <ul className="space-y-1">
          {['무제한 프로젝트', '팀원 최대 5명', '우선 고객 지원'].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-[var(--flowrit-primary-soft-text)]">
              <Check className="h-4 w-4" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* 결제 주기 선택 */}
      <div className="mb-5">
        <p className="mb-3 text-sm font-medium text-[var(--flowrit-text-secondary)]">결제 주기</p>
        <div className="grid grid-cols-2 gap-3">
          {(['monthly', 'yearly'] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              disabled={loading}
              aria-pressed={billingCycle === cycle}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                billingCycle === cycle
                  ? 'border-[var(--flowrit-primary)] bg-[var(--flowrit-primary-soft)]'
                  : 'border-[var(--flowrit-border)] hover:border-[var(--flowrit-border-strong)]'
              }`}
            >
              <p className="text-sm font-semibold text-[var(--flowrit-text)]">
                {cycle === 'monthly' ? '월정기' : '연정기'}
              </p>
              <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
                {cycle === 'monthly' ? '월 ₩29,900' : '연 ₩298,000'}
              </p>
              {cycle === 'yearly' && (
                <span className="mt-1 inline-block text-xs font-medium text-[var(--flowrit-primary)]">
                  2개월 무료
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <CardForm
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel={`${priceLabel}로 시작하기`}
        error={error}
      />

      <p className="mt-3 text-center text-xs text-[var(--flowrit-text-muted)]">
        언제든지 취소 가능 · 카드 정보는 나이스페이먼츠가 안전하게 보관
      </p>
    </Modal>
  )
}
