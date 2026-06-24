import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv } from './helpers'

// A-04, A-09, A-10 must run without session (wrong-creds / route-protection tests)
test.describe('auth — unauthenticated scenarios', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('A-04 wrong password shows error and stays on login page', async ({ page }) => {
    requireEnv(['email'])
    await page.goto('/login')
    await page.getByLabel('이메일').fill(e2eEnv.email!)
    await page.getByLabel('비밀번호').fill('wrongpassword')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.locator('.flowrit-form-error, [class*="error"]').first()).toBeVisible()
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('A-07 forgot-password form sends reset link', async ({ page }) => {
    requireEnv(['email'])
    await page.goto('/forgot-password')
    await page.getByLabel('이메일').fill(e2eEnv.email!)
    await page.getByRole('button', { name: '재설정 링크 받기' }).click()
    await expect(page.getByText('비밀번호 재설정 링크를 발송했습니다')).toBeVisible({ timeout: 10_000 })
  })

  test('A-09 expired reset token shows error', async ({ page }) => {
    await page.goto('/reset-password/invalid-token-xyz')
    await expect(page.getByText(/재설정|만료|유효하지 않/).first()).toBeVisible()
  })

  test('A-10 unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('A-10 unauthenticated access to /customers redirects to /login', async ({ page }) => {
    await page.goto('/customers')
    await expect(page).toHaveURL(/\/login/)
  })
})

// A-06 starts from authenticated session (storageState from setup)
test.describe('auth — authenticated scenarios', () => {
  test('A-06 logout clears session and redirects to login', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.getByRole('button', { name: '로그아웃' }).click()
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
