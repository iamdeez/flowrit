import { config as loadDotenv } from 'dotenv'
import { parseCliArgs } from './lib/cli.ts'
import { loadPromoEnv } from './lib/env.ts'
import { validateExistingBundle } from './lib/render.ts'

loadDotenv({ path: '.env.local', quiet: true })

async function main() {
  const args = parseCliArgs()
  if (args.help) {
    console.log('Usage: npm run promo:check -- --dir <path>')
    return
  }
  const env = loadPromoEnv()
  const dir = args.dir
  if (typeof dir !== 'string') {
    throw new Error('Missing --dir for promo bundle check')
  }
  await validateExistingBundle(dir, [env.email, env.publicToken, ...env.blacklist])
  console.log(`Promo bundle check passed: ${dir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
