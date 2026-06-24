import { expect, test } from 'playwright/test'
import { login, requireEnv } from './helpers'

test.describe('data export', () => {
  test('Q-01 customers CSV export button is present', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')

    // /api/export/customers link with download attribute
    const exportLink = page.locator('a[href*="/api/export/customers"]')
    await expect(exportLink).toBeVisible({ timeout: 10_000 })
    await expect(exportLink).toHaveText(/CSV 내보내기/)
  })

  test('Q-02 projects CSV export button is present', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')

    // /api/export/projects link with download attribute
    const exportLink = page.locator('a[href*="/api/export/projects"]')
    await expect(exportLink).toBeVisible({ timeout: 10_000 })
  })
})
