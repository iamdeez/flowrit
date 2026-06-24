import { config as loadDotenv } from 'dotenv'
import { loadPromoEnv } from './lib/env.ts'
import { findFfmpegPath } from './lib/media.ts'
import { assertPromoSafety } from './lib/safety.ts'
import { listScenarioIds } from './scenarios/index.ts'

loadDotenv({ path: '.env.local', quiet: true })

type CheckResult = {
  name: string
  ok: boolean
  detail: string
}

async function main() {
  const results: CheckResult[] = []

  let envLoaded = false
  try {
    const env = loadPromoEnv()
    envLoaded = true
    results.push({
      name: 'PROMO environment',
      ok: true,
      detail: `Loaded ${env.baseUrl} / workspace=${env.workspaceSlug}`,
    })

    try {
      assertPromoSafety(env)
      results.push({
        name: 'Demo safety',
        ok: true,
        detail: 'Target looks like demo, preview, staging, or explicit safe workspace.',
      })
    } catch (error) {
      results.push({
        name: 'Demo safety',
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  } catch (error) {
    results.push({
      name: 'PROMO environment',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    })
  }

  const ffmpegPath = await findFfmpegPath()
  results.push({
    name: 'ffmpeg',
    ok: Boolean(ffmpegPath),
    detail: ffmpegPath
      ? `Found at ${ffmpegPath}`
      : 'Not found. Install ffmpeg or set FFMPEG_PATH to generate source.mp4.',
  })

  results.push({
    name: 'Scenarios',
    ok: true,
    detail: listScenarioIds().join(', '),
  })

  const failed = results.filter((result) => !result.ok)
  for (const result of results) {
    const marker = result.ok ? 'OK' : 'FAIL'
    console.log(`[${marker}] ${result.name}: ${result.detail}`)
  }

  if (!envLoaded) {
    console.log('\nRequired env keys: PROMO_BASE_URL, PROMO_EMAIL, PROMO_PASSWORD, PROMO_WORKSPACE_SLUG, PROMO_PUBLIC_TOKEN')
  }

  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
