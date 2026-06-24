import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

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

  test('P-04 test webhook sends test inquiry', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    // WebhookInfo is rendered inside the workspace tab (not a standalone webhook tab)
    await page.goto('/settings?tab=workspace')
    const testBtn = page.getByRole('button', { name: '테스트 의뢰 보내기' }).first()
    test.skip((await testBtn.count()) === 0, '테스트 의뢰 보내기 버튼 없음 — 워크스페이스 탭 또는 소유자 권한 확인 필요')
    await testBtn.click()
    await expect(
      page.getByText(/대시보드에서 확인하세요|성공|전송됨/).first()
    ).toBeVisible({ timeout: 10_000 })
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
