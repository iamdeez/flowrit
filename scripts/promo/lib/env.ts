import { resolve } from 'node:path'
import type { PromoEnv } from './types.ts'

const REQUIRED_ENV_KEYS = [
  'PROMO_BASE_URL',
  'PROMO_EMAIL',
  'PROMO_PASSWORD',
  'PROMO_WORKSPACE_SLUG',
  'PROMO_PUBLIC_TOKEN',
] as const

export function parseList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function loadPromoEnv(source: Record<string, string | undefined> = process.env): PromoEnv {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !source[key]?.trim())
  if (missing.length > 0) {
    throw new Error(`Missing required promo environment variables: ${missing.join(', ')}`)
  }

  return {
    baseUrl: normalizeBaseUrl(source.PROMO_BASE_URL!),
    email: source.PROMO_EMAIL!,
    password: source.PROMO_PASSWORD!,
    workspaceSlug: source.PROMO_WORKSPACE_SLUG!,
    publicToken: source.PROMO_PUBLIC_TOKEN!,
    projectId: source.PROMO_PROJECT_ID || undefined,
    outputDir: resolve(source.PROMO_OUTPUT_DIR || 'artifacts/promo'),
    blacklist: parseList(source.PROMO_BLACKLIST),
    allowProduction: source.PROMO_ALLOW_PRODUCTION === 'true',
  }
}

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value)
  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}
