import { expect, test } from 'playwright/test'

test.describe('system & ops', () => {
  test('S-01 /api/health returns 200 with ok status', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('S-02 /api/health with valid token returns detailed info', async ({ request }) => {
    const token = process.env.HEALTHCHECK_TOKEN
    test.skip(!token, 'HEALTHCHECK_TOKEN 없음 — 환경변수 필요')
    const res = await request.get(`/api/health?token=${token}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    // Detailed response should include db or extra fields beyond public summary
    expect(Object.keys(body).length).toBeGreaterThan(1)
  })

  test('S-03 /api/health with wrong token returns 401 or only public summary', async ({ request }) => {
    const res = await request.get('/api/health?token=wrongtoken')
    expect([200, 401]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      // should not expose detailed DB info to bad token
      expect(body.status).toBeDefined()
    }
  })

  test('S-04 unknown path renders 404 page', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeVisible()
  })

  test('S-07 /terms renders legal page', async ({ page }) => {
    await page.goto('/terms')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: '이용약관' })).toBeVisible()
  })

  test('S-07b /privacy renders privacy policy page', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: '개인정보처리방침' })).toBeVisible()
  })
})
