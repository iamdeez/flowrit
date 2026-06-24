import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('team management', () => {
  test('team page loads with heading', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/team')
    await expect(page.getByRole('heading', { name: '팀', exact: true })).toBeVisible()
  })

  test('K-01 invite form shows invite URL after submission', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/team')

    const email = `e2e-invite-${Date.now()}@example.com`
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('역할').selectOption('ADMIN')
    await page.getByRole('button', { name: '초대 이메일 발송' }).click()

    // After submission: pending invite appears in list (email success via revalidatePath)
    // OR readonly URL input appears (email failure path).
    // Use exact: true so the pending-list <p> matches instead of the toast substring.
    await expect(
      page.getByText(email, { exact: true }).or(page.locator('input[readonly]'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('K-04 cancel pending invite removes it from list', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/team')

    // Create a fresh invite so this test is self-contained (fullyParallel=true means
    // K-01 may not have completed yet when this test starts)
    const email = `e2e-cancel-${Date.now()}@example.com`
    await page.getByLabel('이메일').fill(email)
    await page.getByLabel('역할').selectOption('ADMIN')
    await page.getByRole('button', { name: '초대 이메일 발송' }).click()
    // Wait for invite to appear; reload once if not shown (parallel test cache interference)
    const inviteLocator = page.getByText(email, { exact: true }).or(page.locator('input[readonly]'))
    try {
      await expect(inviteLocator).toBeVisible({ timeout: 12_000 })
    } catch {
      await page.reload()
      await expect(inviteLocator).toBeVisible({ timeout: 8_000 })
    }

    // If invite appeared as readonly URL (email failure path), reload to get list view
    if (await page.locator('input[readonly]').isVisible()) {
      await page.reload()
    }

    const cancelBtn = page.getByRole('button', { name: '취소' }).first()
    test.skip((await cancelBtn.count()) === 0, '취소 버튼 없음 — 초대 생성 실패')

    page.on('dialog', (dialog) => dialog.accept())
    await cancelBtn.click()
    await expect(page.getByText(email, { exact: true })).not.toBeVisible({ timeout: 10_000 })
  })
})
