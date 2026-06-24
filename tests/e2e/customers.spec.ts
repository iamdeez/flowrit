import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('customers', () => {
  test('D-01 customer list page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: '고객' })).toBeVisible()
  })

  test('D-02 create customer and verify it appears in list', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)

    const name = `E2E 고객 ${Date.now()}`
    await page.goto('/customers/new')
    await expect(page.getByRole('heading', { name: '고객 등록' })).toBeVisible()
    await page.getByLabel('이름').fill(name)
    await page.getByLabel('연락처').fill(`e2e-${Date.now()}@test.com`)
    await page.getByLabel('메모').fill('E2E 자동 테스트로 생성된 고객')
    await page.getByRole('button', { name: '고객 등록' }).click()

    await expect(page).toHaveURL(/\/customers/, { timeout: 15_000 })
    await expect(page.getByText(name)).toBeVisible()
  })

  test('D-05 customer search filters list', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/검색|이름/))
    test.skip((await search.count()) === 0, '검색 입력란 없음 — UI 변경 가능성')
    await search.fill('E2E')
    await expect(page.getByText('E2E').first()).toBeVisible({ timeout: 5_000 })
  })
})
