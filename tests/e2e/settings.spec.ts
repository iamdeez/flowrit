import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv } from './helpers'

test.describe('settings', () => {
  test('P-01 settings page loads with heading', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
  })

  test('P-02 settings shows workspace public links', async ({ page }) => {
    requireEnv(['email', 'password', 'workspaceSlug'])
    await login(page)
    // Intake/order links are on the workspace tab, not the orderform tab
    await page.goto('/settings?tab=workspace')
    // Both intake and order URL spans are on the workspace tab — check either is visible
    const intakeLink = page.getByText(new RegExp(`/intake/${e2eEnv.workspaceSlug}`)).first()
    const orderLink = page.getByText(new RegExp(`/order/${e2eEnv.workspaceSlug}`)).first()
    await expect(intakeLink.or(orderLink).nth(0)).toBeVisible()
  })

  test('P-03 settings shows all tab navigation items', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/settings')
    for (const tab of ['프로필', '비밀번호', '워크스페이스', '결제', '알림']) {
      await expect(page.getByText(tab, { exact: true })).toBeVisible()
    }
  })
})
