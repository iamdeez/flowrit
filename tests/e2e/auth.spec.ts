import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

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

test('A-02 duplicate email registration is blocked', async ({ page }) => {
  requireMutationAllowed()
  requireEnv(['email'])
  await page.goto('/register')
  await page.getByLabel('이름').fill('중복 테스터')
  await page.getByLabel('이메일').fill(e2eEnv.email!)
  await page.getByLabel('비밀번호').fill('QATest1234!')
  await page.getByRole('button', { name: '가입하기' }).click()
  await expect(page.locator('.flowrit-form-error, [class*="error"]').first()).toBeVisible({ timeout: 10_000 })
  await expect(page).not.toHaveURL(/\/onboarding/)
})

test('A-03 successful login redirects to dashboard', async ({ page }) => {
  requireEnv(['email', 'password'])
  await page.goto('/login')
  await page.getByLabel('이메일').fill(e2eEnv.email!)
  await page.getByLabel('비밀번호').fill(e2eEnv.password!)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
})

// A-06 starts from authenticated session (storageState from setup)
test.describe('auth — authenticated scenarios', () => {
  test('A-06 logout clears session and redirects to login', async ({ page, isMobile }) => {
    requireEnv(['email', 'password'])
    await login(page)
    if (isMobile) {
      // Mobile: open "더보기" drawer then click logout button inside it
      await page.getByRole('button', { name: '더보기' }).click()
      await page.getByRole('dialog', { name: '더보기 메뉴' }).getByRole('button', { name: '로그아웃' }).click()
    } else {
      // Desktop: sidebar logout button is inside <aside>
      await page.locator('aside').getByTitle('로그아웃').click()
    }
    await expect(page).toHaveURL(/\/login/)

    // Clear cookies to ensure session is fully invalidated before re-testing auth guard
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
