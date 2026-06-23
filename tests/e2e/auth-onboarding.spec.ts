import { expect, test } from 'playwright/test'
import { requireMutationAllowed } from './helpers'

test.describe('signup and onboarding', () => {
  test('new user can register, complete onboarding, and reach dashboard', async ({ page }) => {
    requireMutationAllowed()
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
    const password = 'Test1234!'

    await page.goto('/register')
    await page.getByLabel('이름').fill('E2E Test User')
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill(password)
    await page.getByRole('button', { name: '가입하기' }).click()

    await page.waitForURL(/\/onboarding/, { timeout: 15_000 })
    await page.getByRole('button', { name: /Flowrit 시작하기/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /대시보드/ })).toBeVisible()
  })
})
