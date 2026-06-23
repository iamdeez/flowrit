import { expect, test } from 'playwright/test'
import { login, requireEnv } from './helpers'

test.describe('billing', () => {
  test('owner can open NicePayments upgrade modal without charging', async ({ page }) => {
    requireEnv(['email', 'password'])

    await login(page)
    await page.goto('/settings?tab=billing')
    await expect(page.getByRole('heading', { name: /설정/ })).toBeVisible()

    const upgradeButton = page.getByRole('button', { name: 'Pro 업그레이드' })
    test.skip((await upgradeButton.count()) === 0, 'Workspace is already Pro or current user is not owner')

    await upgradeButton.click()
    await expect(page.getByRole('heading', { name: 'Pro 플랜 업그레이드' })).toBeVisible()
    await expect(page.getByRole('button', { name: /월 ₩29,900로 시작하기/ })).toBeVisible()
  })
})
