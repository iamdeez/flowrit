import { expect, test } from 'playwright/test'
import { requireMutationAllowed } from './helpers'

test.describe('signup and onboarding', () => {
  test('new user can register, complete onboarding, and reach dashboard', async ({ page }) => {
    requireMutationAllowed()
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
    const password = 'Test1234!'

    await page.goto('/register')
    await page.getByLabel('이름').fill('E2E 런칭 테스트')
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('비밀번호').fill(password)
    await page.getByRole('button', { name: '가입하기' }).click()

    await expect(page).toHaveURL(/\/onboarding/)
    await page.getByRole('button', { name: /Flowrit 시작하기/ }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /대시보드/ })).toBeVisible()
  })
})
