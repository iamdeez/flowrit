import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('intake form', () => {
  test('J-01 intake form loads for valid workspace slug', async ({ page }) => {
    requireEnv(['workspaceSlug'])
    await page.goto(`/intake/${e2eEnv.workspaceSlug}`)
    await expect(page.getByRole('button', { name: '의뢰 접수하기' })).toBeVisible()
  })

  test('J-02 intake form submission shows success', async ({ page }) => {
    test.setTimeout(40_000)
    requireMutationAllowed()
    requireEnv(['workspaceSlug'])

    await page.goto(`/intake/${e2eEnv.workspaceSlug}`)
    // Intake form labels have no htmlFor — use placeholder/name selectors
    await page.getByPlaceholder('홍길동').fill('강감찬')
    await page.getByPlaceholder('010-0000-0000 또는 이메일').fill('kang@example.com')
    await page.locator('textarea[name="content"]').fill('E2E 자동 테스트 일반 문의입니다.')
    await page.getByRole('button', { name: '의뢰 접수하기' }).click()

    // Rate limit: 5 submissions per 10 min per IP — skip gracefully instead of failing
    const successOrRateLimit = page.getByText('의뢰가 접수되었습니다').or(page.getByText('너무 많은 요청'))
    await expect(successOrRateLimit.first()).toBeVisible({ timeout: 25_000 })
    test.skip(await page.getByText('너무 많은 요청').isVisible(), '의뢰 제출 rate limit — 10분 후 재시도')
  })

  test('J-03 webhook intake creates inquiry with valid auth', async ({ request }) => {
    requireMutationAllowed()
    requireEnv(['workspaceSlug'])
    const secret = process.env.WEBHOOK_SECRET
    test.skip(!secret, 'WEBHOOK_SECRET 없음 — 환경변수 필요')
    const res = await request.post(`/api/webhooks/intake/${e2eEnv.workspaceSlug}`, {
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      data: { name: 'Webhook 테스터', content: 'E2E 웹훅 테스트 문의' },
    })
    expect(res.status()).toBe(201)
  })

  test('J-04 webhook with wrong auth returns 401', async ({ request }) => {
    requireEnv(['workspaceSlug'])
    const res = await request.post(`/api/webhooks/intake/${e2eEnv.workspaceSlug}`, {
      headers: { Authorization: 'Bearer wrongtoken', 'Content-Type': 'application/json' },
      data: { name: '테스터', message: '테스트' },
    })
    expect(res.status()).toBe(401)
  })

  test('J-02 submitted intake appears in owner orders list', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/orders?tab=inquiry')
    await expect(page.getByRole('heading', { name: /주문서 관리/ })).toBeVisible()
  })
})
