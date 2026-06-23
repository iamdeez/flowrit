import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function buildLimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`, prefix: string): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `flowrit:${prefix}`,
    ephemeralCache: new Map(),
  })
}

// 공개 의뢰/주문 폼: 10분에 5회
const intakeLimiter = buildLimiter(5, '10 m', 'intake')

// 웹훅 인테이크 API: 1분에 60회
const webhookLimiter = buildLimiter(60, '1 m', 'webhook')

type RateLimitResult = { limited: true; retryAfter: number } | { limited: false }

async function check(limiter: Ratelimit | null, identifier: string): Promise<RateLimitResult> {
  if (!limiter) return { limited: false }
  const { success, reset } = await limiter.limit(identifier)
  if (success) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
}

export async function checkIntakeRateLimit(ip: string): Promise<RateLimitResult> {
  return check(intakeLimiter, ip)
}

export async function checkWebhookRateLimit(ip: string): Promise<RateLimitResult> {
  return check(webhookLimiter, ip)
}
