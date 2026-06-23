import { expect, test } from 'playwright/test'

test.describe('launch readiness smoke', () => {
  test('landing page exposes primary product message', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /Flowrit/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /무료로 시작하기|로그인/ }).first()).toBeVisible()
  })
})
