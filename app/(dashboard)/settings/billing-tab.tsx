'use client'

import { useState } from 'react'
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
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isPro ? 'PRO' : 'FREE'}
                </span>
                {isPro && subscription?.billingCycle && (
                  <span className="text-sm text-gray-500">
                    {subscription.billingCycle === 'monthly' ? '월정기' : '연정기'}
                  </span>
                )}
              </div>
              {isPro && periodEnd && (
                <p className="mt-1 text-sm text-gray-500">
                  {isCancelScheduled || cancelDone
                    ? `${periodEnd}에 무료 플랜으로 전환됩니다`
                    : `다음 결제일: ${periodEnd}`}
                </p>
              )}
              {!isPro && (
                <p className="mt-1 text-sm text-gray-500">
                  프로젝트 3개, 팀원 1명 (본인만)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {!isPro && isOwner && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Pro 업그레이드
                </button>
              )}
              {isPro && isOwner && !isCancelScheduled && !cancelDone && (
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {canceling ? '처리 중...' : '구독 취소'}
                </button>
              )}
            </div>
          </div>

          {!isPro && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Pro 플랜으로 업그레이드하면</p>
              <ul className="space-y-1">
                {['무제한 프로젝트', '팀원 최대 5명', '우선 지원'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 결제 내역 */}
      {payments.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">결제 내역</h2>
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
        </div>
      )}

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  )
}
