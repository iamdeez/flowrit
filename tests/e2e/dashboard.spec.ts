import { expect, test } from 'playwright/test'
import { login, requireEnv } from './helpers'

test.describe('dashboard', () => {
  test('C-01 dashboard loads with heading after login', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })

  test('C-02 dashboard shows pipeline and stats sections', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await expect(page.getByText('업무 파이프라인')).toBeVisible()
  })

  test('C-05 mobile viewport renders without layout overflow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test')
    requireEnv(['email', 'password'])
    await login(page)
    const body = await page.evaluate(() => document.body.scrollWidth)
    const viewport = page.viewportSize()!.width
    expect(body).toBeLessThanOrEqual(viewport + 1)
  })
})
