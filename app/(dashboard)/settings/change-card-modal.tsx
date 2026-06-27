'use client'

import { useState } from 'react'
import Script from 'next/script'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export function ChangeCardModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChangeCard() {
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

    const orderId = `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const handleReturnMessage = async (event: MessageEvent) => {
      const data = event.data
      if (data?.type !== 'NICEPAY_SUCCESS' && data?.type !== 'NICEPAY_ERROR') return
      window.removeEventListener('message', handleReturnMessage)

      if (data.type === 'NICEPAY_SUCCESS') {
        await processCardChange(data.authToken as string)
      } else {
        setError((data.errorMsg as string) || '카드 등록에 실패했습니다.')
        setLoading(false)
      }
    }
    window.addEventListener('message', handleReturnMessage)

    async function processCardChange(authToken: string) {
      try {
        const res = await fetch('/api/billing/change-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authToken, orderId }),
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    window.AUTHNICE.requestPay({
      clientId,
      method: 'card',
      orderId,
      amount: 0,
      goodsName: 'Flowrit 결제 수단 등록',
      returnUrl: `${appUrl}/api/billing/nicepay-return?mode=change-card&orderId=${orderId}`,
      fnSuccess: async (result) => {
        window.removeEventListener('message', handleReturnMessage)
        await processCardChange(result.authToken)
      },
      fnError: (result) => {
        window.removeEventListener('message', handleReturnMessage)
        setError(result.errorMsg || '카드 등록에 실패했습니다.')
        setLoading(false)
      },
    })
  }

  return (
    <>
      <Script src="https://pay.nicepay.co.kr/v1/js/" strategy="afterInteractive" />

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

          <p className="text-sm text-gray-500 mb-6">
            새 카드를 등록하면 기존 카드는 자동으로 해지됩니다. 다음 결제일부터 새 카드로 청구됩니다.
          </p>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleChangeCard}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : '새 카드 등록'}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            카드 정보는 나이스페이먼츠가 안전하게 보관합니다
          </p>
        </div>
      </div>
    </>
  )
}
