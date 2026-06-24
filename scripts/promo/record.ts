import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import { chromium } from 'playwright'
import { parseCliArgs } from './lib/cli.ts'
import { loadPromoEnv } from './lib/env.ts'
import { createHumanDirector } from './lib/human-actions.ts'
import { convertToMp4 } from './lib/media.ts'
import { renderPromoBundle } from './lib/render.ts'
import { createRunId } from './lib/run-id.ts'
import { assertPromoSafety } from './lib/safety.ts'
import { PROMO_VIEWPORTS } from './lib/types.ts'
import { getScenario, listScenarioIds } from './scenarios/index.ts'

loadDotenv({ path: '.env.local', quiet: true })

async function main() {
  const args = parseCliArgs()
  if (args.help) {
    printHelp()
    return
  }

  const env = loadPromoEnv()
  assertPromoSafety(env)
  const scenarioId = String(args.scenario || 'owner-dashboard')
  const scenario = getScenario(env, scenarioId)
  const runId = String(args.runId || createRunId(scenario.id))
  const runDir = join(env.outputDir, runId)
  const screenshotsDir = join(runDir, 'screenshots')
  await mkdir(screenshotsDir, { recursive: true })

  const viewport = PROMO_VIEWPORTS[scenario.viewport]
  const browser = await chromium.launch({ headless: args.headed !== true })
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: runDir, size: viewport },
  })
  const page = await context.newPage()
  const director = createHumanDirector(page, { baseUrl: env.baseUrl, screenshotDir: screenshotsDir })

  try {
    await scenario.run(director)
    const videoPath = await page.video()?.path()
    await context.close()
    await browser.close()
    if (videoPath) {
      const webmPath = join(runDir, 'source.webm')
      await rename(videoPath, webmPath).catch(() => undefined)
      const converted = await convertToMp4(webmPath, join(runDir, 'source.mp4'))
      if (!converted) {
        console.warn('ffmpeg not found. Kept Playwright source.webm instead of source.mp4.')
      }
    }
    const manifest = await renderPromoBundle({ env, scenario, runId, runDir })
    console.log(`Promo bundle created: ${runDir}`)
    console.log(JSON.stringify(manifest.files, null, 2))
  } catch (error) {
    await page.screenshot({ path: join(runDir, 'failure.png'), fullPage: true }).catch(() => undefined)
    await writeFile(
      join(runDir, 'failure.log'),
      error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error),
    ).catch(() => undefined)
    await context.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
    throw error
  }
}

function printHelp() {
  console.log(`Usage: npm run promo:record -- --scenario <id> [--headed]\n\nScenarios:\n- ${listScenarioIds().join('\n- ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
