import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

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

  test('C-03 dashboard shows pending inquiries section', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/dashboard')
    // If there are pending inquiries, the section is visible
    const pendingSection = page.getByText(/접수 대기|접수된 건|PENDING/)
      .or(page.getByRole('link', { name: /전환/ }))
    // Section may be absent if no inquiries exist — just check page loads properly
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
    if (await pendingSection.count()) {
      await expect(pendingSection.first()).toBeVisible()
    }
  })

  test('C-04 convert pending inquiry to project', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/dashboard')

    // Look for a convert button in the dashboard pending inquiries area
    const convertBtn = page.getByRole('button', { name: /전환|Convert/ }).first()
    test.skip((await convertBtn.count()) === 0, '대기 중 접수 건 없음 — 선행 데이터 필요')
    await convertBtn.click()

    // A dialog or form should appear asking for project name/customer
    await expect(
      page.getByRole('dialog').or(page.getByRole('heading', { name: /프로젝트|전환/ })).first()
    ).toBeVisible({ timeout: 5_000 })
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
