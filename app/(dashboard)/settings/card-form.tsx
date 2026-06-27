'use client'

import { useState } from 'react'

export interface CardInput {
  cardNo: string
  expYear: string
  expMonth: string
  idNo: string
  cardPw: string
}

interface Props {
  onSubmit: (card: CardInput) => Promise<void>
  loading: boolean
  submitLabel: string
  error?: string | null
}

export function CardForm({ onSubmit, loading, submitLabel, error: externalError }: Props) {
  const [cardNo, setCardNo] = useState('')
  const [expiry, setExpiry] = useState('')
  const [idNo, setIdNo] = useState('')
  const [cardPw, setCardPw] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const error = externalError ?? localError

  function handleCardNoChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    setCardNo(digits.replace(/(.{4})(?=.)/g, '$1 '))
  }

  function handleExpiryChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)

    const digits = cardNo.replace(/\s/g, '')
    if (digits.length < 15 || digits.length > 16) {
      setLocalError('카드번호를 정확히 입력해 주세요.')
      return
    }

    const expiryDigits = expiry.replace('/', '')
    if (expiryDigits.length !== 4) {
      setLocalError('유효기간을 MM/YY 형식으로 입력해 주세요.')
      return
    }

    const month = parseInt(expiryDigits.slice(0, 2), 10)
    if (month < 1 || month > 12) {
      setLocalError('유효기간 월이 올바르지 않습니다.')
      return
    }

    if (idNo.length !== 6 && idNo.length !== 10) {
      setLocalError('생년월일 6자리 또는 사업자번호 10자리를 입력해 주세요.')
      return
    }

    if (cardPw.length !== 2) {
      setLocalError('비밀번호 앞 2자리를 입력해 주세요.')
      return
    }

    await onSubmit({
      cardNo: digits,
      expMonth: expiryDigits.slice(0, 2),
      expYear: expiryDigits.slice(2),
      idNo,
      cardPw,
    })
  }

  const labelCls = 'block text-xs font-medium text-[var(--flowrit-text-secondary)] mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="card-no" className={labelCls}>카드번호</label>
        <input
          id="card-no"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          value={cardNo}
          onChange={e => handleCardNoChange(e.target.value)}
          placeholder="0000 0000 0000 0000"
          disabled={loading}
          className="flowrit-input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="card-exp" className={labelCls}>유효기간</label>
          <input
            id="card-exp"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={expiry}
            onChange={e => handleExpiryChange(e.target.value)}
            placeholder="MM / YY"
            maxLength={5}
            disabled={loading}
            className="flowrit-input"
            required
          />
        </div>
        <div>
          <label htmlFor="card-pw" className={labelCls}>비밀번호 앞 2자리</label>
          <input
            id="card-pw"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cardPw}
            onChange={e => setCardPw(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="••"
            maxLength={2}
            disabled={loading}
            className="flowrit-input"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="card-idno" className={labelCls}>
          생년월일 6자리
        </label>
        <input
          id="card-idno"
          type="text"
          inputMode="numeric"
          value={idNo}
          onChange={e => setIdNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="예: 901231"
          disabled={loading}
          className="flowrit-input"
          required
        />
        <p className="flowrit-form-help">개인: 생년월일 6자리 / 법인: 사업자번호 10자리</p>
      </div>

      {error && <p className="flowrit-form-error">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flowrit-button-primary w-full"
      >
        {loading ? '처리 중...' : submitLabel}
      </button>
    </form>
  )
}
