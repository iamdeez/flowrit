import { expect, test as setup } from 'playwright/test'
import { e2eEnv } from '../helpers'

const authFile = 'tests/.auth/user.json'

setup('authenticate', async ({ page }) => {
  if (!e2eEnv.email || !e2eEnv.password) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set')
  }

  await page.goto('/login')
  await page.getByLabel('이메일').fill(e2eEnv.email)
  await page.getByLabel('비밀번호').fill(e2eEnv.password)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  await page.context().storageState({ path: authFile })
})
