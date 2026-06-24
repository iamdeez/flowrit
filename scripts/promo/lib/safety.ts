import type { PromoEnv } from './types.ts'

const SAFE_HOST_HINTS = ['localhost', '127.0.0.1', 'preview', 'staging', 'demo', 'vercel.app']
const PRODUCTION_HOST_HINTS = ['flowrit.motionbit.kr']

export function assertPromoSafety(env: PromoEnv): void {
  const url = new URL(env.baseUrl)
  const host = url.hostname.toLowerCase()
  const slug = env.workspaceSlug.toLowerCase()

  if (!env.allowProduction && PRODUCTION_HOST_HINTS.some((hint) => host === hint)) {
    throw new Error(
      `Refusing to record production host "${host}". Set PROMO_ALLOW_PRODUCTION=true only after confirming demo-only data.`,
    )
  }

  const hostLooksSafe = SAFE_HOST_HINTS.some((hint) => host.includes(hint))
  const slugLooksSafe = ['demo', 'staging', 'preview', 'promo', 'test'].some((hint) =>
    slug.includes(hint),
  )

  if (!env.allowProduction && !hostLooksSafe && !slugLooksSafe) {
    throw new Error(
      `Promo recording requires a demo-like host or workspace slug. Host="${host}", workspace="${env.workspaceSlug}".`,
    )
  }

  if (env.email.includes('@') && !env.allowProduction) {
    const domain = env.email.split('@')[1]?.toLowerCase() ?? ''
    const emailLooksSafe = ['example.', 'test.', 'demo.', 'motionbit.kr'].some((hint) =>
      domain.includes(hint),
    )
    if (!emailLooksSafe && !slugLooksSafe) {
      throw new Error('Promo account email does not look like a demo/test account.')
    }
  }
}
