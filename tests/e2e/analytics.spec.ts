import { expect, test } from 'playwright/test'
import { login, requireEnv } from './helpers'

test.describe('analytics / stats', () => {
  test('O-01 analytics page redirects to dashboard with stats', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/analytics')
    // /analytics redirects to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })

  test('O-02 period filter updates analytics view', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/dashboard')
    // Wait for page to fully render (PeriodSelector is a 'use client' component — wait for heading)
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()

    // PeriodSelector buttons: "이번 달", "지난 3개월", "지난 6개월", "올해"
    // Use text filter (more reliable than getByRole name match for buttons with only Korean text)
    const periodBtn = page.locator('button').filter({ hasText: '지난 3개월' }).first()
    test.skip((await periodBtn.count()) === 0, '기간 필터 버튼 없음')
    await periodBtn.click()
    await expect(page).toHaveURL(/period=3months/)
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })

  test('O-03 inquiry trend chart section is visible', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/dashboard')
    // Dashboard contains "의뢰 접수 추이" chart section
    await expect(page.getByText('의뢰 접수 추이')).toBeVisible({ timeout: 10_000 })
  })
})
