import { config as loadDotenv } from 'dotenv'
import { parseCliArgs } from './lib/cli.ts'
import { loadPromoEnv } from './lib/env.ts'
import { renderPromoBundle } from './lib/render.ts'
import { createRunId } from './lib/run-id.ts'
import { assertPromoSafety } from './lib/safety.ts'
import { getScenario } from './scenarios/index.ts'

loadDotenv({ path: '.env.local', quiet: true })

async function main() {
  const args = parseCliArgs()
  if (args.help) {
    console.log('Usage: npm run promo:bundle -- --scenario <id> [--runId <id>] [--dir <path>]')
    return
  }
  const env = loadPromoEnv()
  assertPromoSafety(env)
  const scenario = getScenario(env, String(args.scenario || 'owner-dashboard'))
  const runId = String(args.runId || createRunId(scenario.id))
  const runDir = String(args.dir || `${env.outputDir}/${runId}`)
  const manifest = await renderPromoBundle({ env, scenario, runId, runDir })
  console.log(`Promo bundle rendered: ${runDir}`)
  console.log(JSON.stringify(manifest, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
