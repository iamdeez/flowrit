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

    const cancelBtn = page.getByRole('button', { name: /취소/ }).first()
    test.skip((await cancelBtn.count()) === 0, '대기 중인 초대 없음 — K-01 먼저 실행 필요')

    const inviteRow = cancelBtn.locator('..')
    const inviteEmail = await inviteRow.getByText(/@/).first().textContent()
    await cancelBtn.click()

    if (inviteEmail) {
      await expect(page.getByText(inviteEmail)).not.toBeVisible({ timeout: 5_000 })
    }
  })
})
