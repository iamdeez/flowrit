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
 * 나이스페이먼츠 빌링키 발급 + 첫 결제
 * AUTHNICE를 amount > 0으로 호출했으므로 /subscribe/regist에 동일한 amount/goodsName 필수.
 * NicePayments는 authToken에 포함된 금액 서명과 regist 요청의 amount가 일치하는지 검증한다.
 */
export async function registerBillingKey(
  authToken: string,
  orderId: string,
  buyerEmail: string,
  buyerName: string,
  amount: number,
  goodsName: string,
): Promise<{ bid: string; tid: string; payMethod: string; paidAt: string }> {
  const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID!
  const body = { clientId, authToken, orderId, buyerEmail, buyerName, amount, goodsName }

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
