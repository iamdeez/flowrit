import { createCipheriv } from 'crypto'
import * as Sentry from '@sentry/nextjs'

const NICEPAY_API_BASE = 'https://api.nicepay.co.kr/v1'

export const PLAN_PRICES = { monthly: 29900, yearly: 298000 } as const
export type BillingCycle = keyof typeof PLAN_PRICES

function authHeader(): string {
  const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID!
  const secretKey = process.env.NICEPAY_SECRET_KEY!
  return `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`
}

// NicePayments /subscribe/regist 필수 encData.
// secretKey는 32자 hex 문자열 → hex decode하면 16바이트 AES-128 키.
function buildEncData(authToken: string): string {
  const secretKey = process.env.NICEPAY_SECRET_KEY!
  const key = Buffer.from(secretKey, 'hex')
  const cipher = createCipheriv('aes-128-ecb', key, null)
  return Buffer.concat([cipher.update(authToken, 'utf8'), cipher.final()]).toString('base64')
}

/**
 * 나이스페이먼츠 빌링키 발급 + 첫 결제
 * AUTHNICE를 amount > 0으로 호출했으므로 /subscribe/regist에 amount/goodsName/encData 모두 필수.
 */
export async function registerBillingKey(
  authToken: string,
  orderId: string,
  buyerEmail: string,
  buyerName: string,
  amount: number,
  goodsName: string,
): Promise<{ bid: string; tid: string; payMethod: string; paidAt: string; cardName?: string; cardNum?: string }> {
  const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID!
  const encData = buildEncData(authToken)
  const body = { clientId, authToken, orderId, buyerEmail, buyerName, amount, goodsName, encData }

  const res = await fetch(`${NICEPAY_API_BASE}/subscribe/regist`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  console.log(`NP:${json.resultCode}|${(json.resultMsg ?? '').slice(0, 60)}`)
  if (json.resultCode !== '0000') {
    const err = new Error(`[${json.resultCode}] ${json.resultMsg ?? '빌링키 발급 실패'}`)
    Sentry.captureException(err, { extra: { resultCode: json.resultCode, resultMsg: json.resultMsg, orderId, amount } })
    throw err
  }
  return {
    bid: json.bid as string,
    tid: json.tid as string,
    payMethod: json.payMethod as string,
    paidAt: json.paidAt as string,
    cardName: json.cardName as string | undefined,
    cardNum: json.cardNum as string | undefined,
  }
}

/**
 * 카드 변경용 빌링키 등록 (amount=0, 첫 결제 없음)
 * AUTHNICE를 amount=0으로 호출한 후 서버에서 이 함수로 새 빌링키를 발급한다.
 */
export async function registerCard(
  authToken: string,
  orderId: string,
  buyerEmail: string,
  buyerName: string,
): Promise<{ bid: string; cardName?: string; cardNum?: string }> {
  const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID!
  const encData = buildEncData(authToken)
  const body = {
    clientId,
    authToken,
    orderId,
    buyerEmail,
    buyerName,
    amount: 0,
    goodsName: 'Flowrit 결제 수단 등록',
    encData,
  }

  const res = await fetch(`${NICEPAY_API_BASE}/subscribe/regist`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  console.log(`NP(card):${json.resultCode}|${(json.resultMsg ?? '').slice(0, 60)}`)
  if (json.resultCode !== '0000') {
    const err = new Error(`[${json.resultCode}] ${json.resultMsg ?? '카드 등록 실패'}`)
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
