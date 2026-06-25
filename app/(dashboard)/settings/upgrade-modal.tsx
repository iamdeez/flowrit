'use client'

import { useState } from 'react'
import Script from 'next/script'

type Props = {
  onClose: () => void
}

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (params: {
        clientId: string
        method: string
        orderId: string
        amount: number
        goodsName: string
        returnUrl: string
        vat: number
        taxFreeAmt: number
        fnSuccess: (result: { authToken: string; tid: string }) => void
        fnError: (result: { errorMsg?: string }) => void
      }) => void
    }
  }
}

export function UpgradeModal({ onClose }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceLabel = billingCycle === 'monthly' ? '월 ₩29,900' : '연 ₩298,000 (17% 할인)'

  async function handleUpgrade() {
    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID
    if (!clientId) {
      setError('결제 시스템을 초기화할 수 없습니다.')
      return
    }

    if (!window.AUTHNICE) {
      setError('결제 모듈을 로드 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    setLoading(true)
    setError(null)

    const orderId = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    window.AUTHNICE.requestPay({
      clientId,
      method: 'card',
      orderId,
      amount: 0, // 0원 인증 — 빌링키 발급용
      vat: 0,
      taxFreeAmt: 0,
      goodsName: '카드 등록',
      returnUrl: `${appUrl}/api/billing/nicepay-return`,
      fnSuccess: async (result) => {
        try {
          const res = await fetch('/api/billing/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              authToken: result.authToken,
              orderId,
              billingCycle,
            }),
          })
          const data = await res.json()
          if (data.success) {
            window.location.href = '/settings?tab=billing&upgraded=true'
          } else {
            setError(data.error || '결제에 실패했습니다.')
            setLoading(false)
          }
        } catch {
          setError('네트워크 오류가 발생했습니다.')
          setLoading(false)
        }
      },
      fnError: (result) => {
        setError(result.errorMsg || '카드 등록에 실패했습니다.')
        setLoading(false)
      },
    })
  }

  return (
    <>
      <Script src="https://pay.nicepay.co.kr/v1/js/" strategy="afterInteractive" />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Pro 플랜 업그레이드</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 혜택 */}
          <div className="mb-6 rounded-xl bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-800 mb-2">Pro 플랜 혜택</p>
            <ul className="space-y-1">
              {['무제한 프로젝트', '팀원 최대 5명', '우선 고객 지원'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-indigo-700">
                  <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* 결제 주기 선택 */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">결제 주기 선택</p>
            <div className="grid grid-cols-2 gap-3">
              {(['monthly', 'yearly'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    billingCycle === cycle
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {cycle === 'monthly' ? '월정기' : '연정기'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cycle === 'monthly' ? '월 ₩29,900' : '연 ₩298,000'}
                  </p>
                  {cycle === 'yearly' && (
                    <span className="mt-1 inline-block text-xs text-indigo-600 font-medium">
                      2개월 무료
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : `${priceLabel}로 시작하기`}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            언제든지 취소 가능 · 카드 정보는 나이스페이먼츠가 안전하게 보관
          </p>
        </div>
      </div>
    </>
  )
}
