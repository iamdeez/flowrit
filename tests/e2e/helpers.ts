import { expect, type Page, test } from 'playwright/test'

export const e2eEnv = {
  email: process.env.E2E_TEST_EMAIL,
  password: process.env.E2E_TEST_PASSWORD,
  workspaceSlug: process.env.E2E_WORKSPACE_SLUG,
  publicProjectToken: process.env.E2E_PUBLIC_PROJECT_TOKEN,
  allowMutation: process.env.E2E_ALLOW_MUTATION,
}

export function requireEnv(keys: Array<keyof typeof e2eEnv>) {
  for (const key of keys) {
    test.skip(!e2eEnv[key], `Missing ${key} E2E environment variable`)
  }
}

export function requireMutationAllowed() {
  test.skip(
    e2eEnv.allowMutation !== 'true',
    'Set E2E_ALLOW_MUTATION=true to run scenarios that create or update data',
  )
}

export async function login(page: Page) {
  requireEnv(['email', 'password'])
  // Skip form when already authenticated via storageState
  await page.goto('/dashboard')
  if (page.url().includes('/dashboard')) return

  await page.goto('/login')
  await page.getByLabel('이메일').fill(e2eEnv.email!)
  await page.getByLabel('비밀번호').fill(e2eEnv.password!)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}
