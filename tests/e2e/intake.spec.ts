import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('intake form', () => {
  test('J-01 intake form loads for valid workspace slug', async ({ page }) => {
    requireEnv(['workspaceSlug'])
    await page.goto(`/intake/${e2eEnv.workspaceSlug}`)
    await expect(page.getByRole('button', { name: '의뢰 접수하기' })).toBeVisible()
  })

  test('J-02 intake form submission shows success', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['workspaceSlug'])

    await page.goto(`/intake/${e2eEnv.workspaceSlug}`)
    // Intake form labels have no htmlFor — use placeholder/name selectors
    await page.getByPlaceholder('홍길동').fill('강감찬')
    await page.getByPlaceholder('010-0000-0000 또는 이메일').fill('kang@example.com')
    await page.locator('textarea[name="content"]').fill('E2E 자동 테스트 일반 문의입니다.')
    await page.getByRole('button', { name: '의뢰 접수하기' }).click()

    await expect(page.getByText('의뢰가 접수되었습니다')).toBeVisible({ timeout: 10_000 })
  })

  test('J-02 submitted intake appears in owner orders list', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/orders?tab=inquiry')
    await expect(page.getByRole('heading', { name: /주문서 관리/ })).toBeVisible()
  })
})
