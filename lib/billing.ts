import crypto from 'node:crypto'
import * as Sentry from '@sentry/nextjs'

const NICEPAY_API_BASE = 'https://api.nicepay.co.kr/v1'

export const PLAN_PRICES = { monthly: 29900, yearly: 298000 } as const
export type BillingCycle = keyof typeof PLAN_PRICES

function authHeader(): string {
  const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID!
  const secretKey = process.env.NICEPAY_SECRET_KEY!
  return `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`
}

/**
 * AUTHNICE R2_ 결제창 승인 + 빌링키 수령
 * /v1/payments/{tid} — AUTHNICE Server 승인 모델의 올바른 endpoint.
 * bid는 계정 설정에 따라 응답에 포함될 수 있음.
 */
export async function approveAndRegisterBillingKey(
  tid: string,
  amount: number,
): Promise<{ bid?: string; tid: string; payMethod: string; paidAt: string; cardName?: string; cardNum?: string }> {
  const res = await fetch(`${NICEPAY_API_BASE}/payments/${encodeURIComponent(tid)}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  })

  const json = await res.json()
  if (json.resultCode !== '0000') {
    const err = new Error(`[${json.resultCode}] ${json.resultMsg ?? '결제 승인 실패'}`)
    Sentry.captureException(err, { extra: { resultCode: json.resultCode, resultMsg: json.resultMsg, tid, amount } })
    throw err
  }
  return {
    bid: json.bid as string | undefined,
    tid: json.tid as string,
    payMethod: json.payMethod as string,
    paidAt: json.paidAt as string,
    cardName: (json.card?.cardName ?? json.cardName) as string | undefined,
    cardNum: (json.card?.cardNum ?? json.cardNum) as string | undefined,
  }
}

export interface CardDetails {
  cardNo: string    // 카드번호 숫자만
  expYear: string   // 유효기간 년 YY
  expMonth: string  // 유효기간 월 MM
  idNo: string      // 생년월일 6자리(개인) 또는 사업자번호 10자리(법인)
  cardPw: string    // 비밀번호 앞 2자리
}

function buildEncData(card: CardDetails): string {
  const secretKey = process.env.NICEPAY_SECRET_KEY!
  const key = Buffer.from(secretKey.substring(0, 16), 'utf8')
  const plain = `cardNo=${card.cardNo}&expYear=${card.expYear}&expMonth=${card.expMonth}&idNo=${card.idNo}&cardPw=${card.cardPw}`
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('hex')
}

/**
 * 카드 정보 직접 입력으로 빌링키 발급 (/v1/subscribe/regist)
 */
export async function registerBillingKeyDirect(
  card: CardDetails,
  orderId: string,
  buyerName?: string,
  buyerEmail?: string,
): Promise<{ bid: string; cardName?: string; cardNum?: string }> {
  const encData = buildEncData(card)
  const body: Record<string, unknown> = { encData, orderId }
  if (buyerName) body.buyerName = buyerName
  if (buyerEmail) body.buyerEmail = buyerEmail

  const res = await fetch(`${NICEPAY_API_BASE}/subscribe/regist`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.resultCode !== '0000') {
    const err = new Error(`[${json.resultCode}] ${json.resultMsg ?? '빌링키 발급 실패'}`)
    Sentry.captureException(err, { extra: { resultCode: json.resultCode, resultMsg: json.resultMsg, orderId } })
    throw err
  }
  return {
    bid: json.bid as string,
    cardName: json.cardName as string | undefined,
    cardNum: json.cardNum as string | undefined,
  }
}

/**
 * 나이스페이먼츠 빌링키 해지
 * 카드 삭제 또는 카드 교체 시 이전 빌링키를 해지한다.
 * 실패해도 예외를 던지지 않고 로깅만 한다 (NicePayments 측 정리 실패가 DB 정리를 막으면 안 됨).
 */
export async function cancelBillingKey(bid: string): Promise<void> {
  try {
    const res = await fetch(`${NICEPAY_API_BASE}/subscribe/${encodeURIComponent(bid)}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader() },
    })
    const json = await res.json()
    if (json.resultCode !== '0000') {
      console.error(`cancelBillingKey failed: [${json.resultCode}] ${json.resultMsg}`)
    }
  } catch (e) {
    console.error('cancelBillingKey error:', e)
  }
}

/**
 * 나이스페이먼츠 빌링키 결제
 * bid(빌링키)로 실제 결제 수행
 */
export async function chargeBillingKey({
  bid,
  orderId,
  amount,
  goodsName,
  buyerName,
  buyerEmail,
}: {
  bid: string
  orderId: string
  amount: number
  goodsName: string
  buyerName: string
  buyerEmail: string
}): Promise<{ tid: string; payMethod: string; paidAt: string }> {
  const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID!

  const res = await fetch(
    `${NICEPAY_API_BASE}/subscribe/${encodeURIComponent(bid)}/payments`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        goodsName,
        amount,
        orderId,
        buyerName,
        buyerEmail,
        useShopInterest: false,
      }),
    },
  )

  const json = await res.json()
  if (json.resultCode !== '0000') {
    const err = new Error(json.resultMsg ?? '결제 실패')
    Sentry.captureException(err, { extra: { resultCode: json.resultCode, orderId } })
    throw err
  }

  return {
    tid: json.tid as string,
    payMethod: json.payMethod as string,
    paidAt: json.paidAt as string,
  }
}

export function getNextPeriodEnd(billingCycle: BillingCycle, from: Date): Date {
  const next = new Date(from)
  if (billingCycle === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  } else {
    next.setFullYear(next.getFullYear() + 1)
  }
  return next
}
