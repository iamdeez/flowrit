'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Crown, ReceiptText } from 'lucide-react'
import { cancelSubscription } from '@/lib/actions/billing'
import { UpgradeModal } from './upgrade-modal'

type Payment = {
  amount: number
  status: string
  method: string | null
  paidAt: Date | null
  createdAt: Date
}

type Subscription = {
  plan: string
  billingCycle: string | null
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  payments: Payment[]
} | null

type Props = {
  isOwner: boolean
  workspacePlan: string
  subscription: Subscription
}

export function getBillingPlanMessage({
  isPro,
  isPastDue,
  isCancelScheduled,
  cancelDone,
  periodEnd,
}: {
  isPro: boolean
  isPastDue: boolean
  isCancelScheduled: boolean
  cancelDone: boolean
  periodEnd: string | null
}): string {
  if (!isPro) return '무료 플랜에서는 프로젝트 3개와 본인 계정만 사용할 수 있습니다.'
  if (isPastDue) return '결제 확인이 필요합니다. 결제 수단을 확인하거나 다시 업그레이드를 진행해 주세요.'
  if (isCancelScheduled || cancelDone) return `${periodEnd ?? '현재 결제 기간 종료일'}까지 Pro 기능을 사용할 수 있습니다.`
  return `${periodEnd ? `${periodEnd}까지` : '현재'} Pro 기능이 활성화되어 있습니다.`
}

export function BillingTab({ isOwner, workspacePlan, subscription }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  const isPro = workspacePlan === 'pro'
  const isCancelScheduled = subscription?.cancelAtPeriodEnd ?? false
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('ko-KR')
    : null
  const payments = subscription?.payments ?? []
  const isPastDue = subscription?.status === 'past_due'
  const planMessage = getBillingPlanMessage({
    isPro,
    isPastDue,
    isCancelScheduled,
    cancelDone,
    periodEnd,
  })

  async function handleCancel() {
    if (!confirm('구독을 취소하시겠어요? 현재 결제 기간이 끝나면 무료 플랜으로 전환됩니다.')) return
    setCanceling(true)
    const res = await cancelSubscription()
    setCanceling(false)
    if (res.success) setCancelDone(true)
  }

  return (
    <div className="space-y-8">
      {/* 현재 플랜 */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">현재 플랜</h2>
        <div className="flowrit-panel-padded">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isPro && <Crown className="h-3.5 w-3.5" aria-hidden="true" />}
                  {isPro ? 'PRO' : 'FREE'}
                </span>
                {isPastDue && (
                  <span className="flowrit-badge flowrit-badge-danger">
                    결제 확인 필요
                  </span>
                )}
                {isPro && subscription?.billingCycle && (
                  <span className="text-sm text-gray-500">
                    {subscription.billingCycle === 'monthly' ? '월정기' : '연정기'}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">{planMessage}</p>
            </div>
            <div className="flex gap-2">
              {!isPro && isOwner && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="flowrit-button-primary"
                >
                  Pro 업그레이드
                </button>
              )}
              {isPro && isOwner && !isCancelScheduled && !cancelDone && (
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="flowrit-button-secondary disabled:opacity-50"
                >
                  {canceling ? '처리 중...' : '구독 취소'}
                </button>
              )}
            </div>
          </div>

          {!isPro && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Pro 플랜으로 업그레이드하면</p>
              <ul className="space-y-1">
                {['무제한 프로젝트', '팀원 최대 5명', '우선 지원'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isPastDue && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <p className="text-sm leading-6 text-red-700">
                결제가 실패하면 Pro 기능이 제한될 수 있습니다. 결제 수단을 확인해 주세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 결제 내역 */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">결제 내역</h2>
        {payments.length > 0 ? (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">수단</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {payments.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {(p.paidAt ?? p.createdAt) instanceof Date
                        ? new Date(p.paidAt ?? p.createdAt).toLocaleDateString('ko-KR')
                        : String(p.paidAt ?? p.createdAt).slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      ₩{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.method ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === 'done'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.status === 'done' ? '완료' : p.status === 'failed' ? '실패' : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flowrit-empty-state">
            <div className="flowrit-empty-icon">
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="flowrit-empty-title">결제 내역이 없습니다.</p>
            <p className="flowrit-empty-description">
              Pro 플랜 결제가 완료되면 결제일, 금액, 상태가 이곳에 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  )
}
