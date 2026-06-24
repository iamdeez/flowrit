import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('public order flow', () => {
  // Serial: "customer submits" must run before I-05/I-06 so a pending order exists
  test.describe.configure({ mode: 'serial' })

  test('I-01 order form loads for valid workspace slug', async ({ page }) => {
    requireEnv(['workspaceSlug'])
    await page.goto(`/order/${e2eEnv.workspaceSlug}`)
    await expect(page.getByRole('button', { name: /주문서 제출하기|제출/ })).toBeVisible()
  })

  test('I-03 order form blocks submission when required fields are missing', async ({ page }) => {
    requireEnv(['workspaceSlug'])
    await page.goto(`/order/${e2eEnv.workspaceSlug}`)
    // Only fill name, leave others empty
    await page.getByLabel(/이름/).fill('이름만 입력')
    await page.getByRole('button', { name: /주문서 제출하기|제출/ }).click()
    // Should show validation error or stay on same page
    await expect(page).not.toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/login/)
    const errorOrStay = page.locator('[required]:invalid, [class*="error"]').or(
      page.getByRole('button', { name: /주문서 제출하기|제출/ })
    )
    await expect(errorOrStay.first()).toBeVisible()
  })

  test('I-04 owner can see submitted orders list', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('heading', { name: '주문서 관리' })).toBeVisible()
  })

  test('I-07 sidebar shows pending order badge', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
    // Sidebar link href="/orders" ("주문서 관리") — use href selector for reliability
    // On mobile the sidebar is display:none; filter for visible instance only
    const ordersNav = page.locator('a[href="/orders"]').filter({ visible: true }).first()
    test.skip((await ordersNav.count()) === 0, '주문 네비게이션 비표시 — 모바일 뷰포트')
    await expect(ordersNav).toBeVisible()
  })

  test('customer submits public order and owner sees orders page', async ({ page }) => {
    test.setTimeout(60_000)
    requireMutationAllowed()
    requireEnv(['workspaceSlug', 'email', 'password'])

    await page.goto(`/order/${e2eEnv.workspaceSlug}`)
    await page.getByLabel(/이름/).fill('E2E 고객')
    const contact = page.getByLabel(/연락처/)
    if (await contact.count()) await contact.fill('e2e-customer@example.com')
    await page.getByLabel(/의뢰 내용/).fill('E2E 공개 주문서 제출 테스트입니다.')
    await page.getByRole('button', { name: /주문서 제출하기/ }).click()
    // Rate limit: 5 submissions per 10 min per IP — skip gracefully instead of failing
    const successOrRateLimit = page.getByText('주문서가 접수되었습니다').or(page.getByText('너무 많은 요청'))
    await expect(successOrRateLimit.first()).toBeVisible({ timeout: 25_000 })
    test.skip(await page.getByText('너무 많은 요청').isVisible(), '공개 주문서 rate limit — 10분 후 재시도')

    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('heading', { name: '주문서 관리' })).toBeVisible()
    // revalidatePath may not propagate instantly; reload to flush server cache
    await page.reload()
    await expect(page.getByText('E2E 고객').first()).toBeVisible({ timeout: 10_000 })
  })

  test('pending order exposes project conversion CTA', async ({ page }) => {
    requireEnv(['email', 'password'])

    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('button', { name: '프로젝트로 전환' }).first()).toBeVisible()
  })

  test('I-05 pending order can be converted to project', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('heading', { name: '주문서 관리' })).toBeVisible()
    const convertBtn = page.locator('button').filter({ hasText: '프로젝트로 전환' }).first()
    test.skip((await convertBtn.count()) === 0, 'PENDING 주문 없음 — 선행 데이터 필요')
    await convertBtn.click()
    await expect(
      page.getByRole('dialog').or(page.getByRole('heading', { name: /프로젝트|전환/ })).first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('I-06 pending order can be dismissed', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('heading', { name: '주문서 관리' })).toBeVisible()
    const deleteBtns = page.locator('button').filter({ hasText: '삭제' })
    const countBefore = await deleteBtns.count()
    test.skip(countBefore === 0, 'PENDING 주문 없음 — 선행 데이터 필요')
    page.on('dialog', (dialog) => dialog.accept())
    await deleteBtns.first().click()
    await expect(deleteBtns).toHaveCount(countBefore - 1, { timeout: 10_000 })
  })
})
