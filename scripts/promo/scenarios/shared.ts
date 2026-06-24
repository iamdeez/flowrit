import type { HumanDirector, PromoEnv } from '../lib/types.ts'

export async function loginForPromo(director: HumanDirector, env: PromoEnv) {
  await director.goto('/login', 'login')
  await director.type('#email', env.email, 'email')
  await director.type('#password', env.password, 'password')
  await director.click('button[type="submit"]', 'login submit')
  await director.pause(1_500, 'wait for dashboard redirect')
}

export async function optionalSpotlight(director: HumanDirector, selector: string) {
  try {
    await director.spotlight(selector)
  } catch {
    await director.pause(650, `optional spotlight skipped: ${selector}`)
  }
}

export async function optionalClick(director: HumanDirector, selector: string) {
  try {
    await director.click(selector)
  } catch {
    await director.pause(650, `optional click skipped: ${selector}`)
  }
}
