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
 * 나이스페이먼츠 빌링키 발급
 * 클라이언트 AUTHNICE fnSuccess 콜백의 authToken을 서버에서 받아 빌링키(bid) 획득.
 * popup amount > 0이면 /subscribe/regist 호출 시 첫 결제도 동시에 처리된다.
 */
export async function registerBillingKey(
  authToken: string,
  orderId: string,
  buyerEmail: string,
  buyerName: string,
  encData?: string,
): Promise<{ bid: string; tid: string; payMethod: string; paidAt: string }> {
  const body: Record<string, string> = { authToken, orderId, buyerEmail, buyerName }
  if (encData) body.encData = encData

  const res = await fetch(`${NICEPAY_API_BASE}/subscribe/regist`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
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
    tid: json.tid as string,
    payMethod: json.payMethod as string,
    paidAt: json.paidAt as string,
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
