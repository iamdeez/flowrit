import { expect, test } from 'playwright/test'

test.describe('promo recording smoke', () => {
  test.use({ storageState: undefined, viewport: { width: 430, height: 932 } })

  test('can open the promo public portal target for recording', async ({ page }) => {
    test.skip(
      !process.env.PROMO_RECORDING_SMOKE || !process.env.PROMO_BASE_URL || !process.env.PROMO_PUBLIC_TOKEN,
      'Set PROMO_RECORDING_SMOKE=true, PROMO_BASE_URL, and PROMO_PUBLIC_TOKEN to run promo smoke.',
    )

    await page.goto(`${process.env.PROMO_BASE_URL}/p/${process.env.PROMO_PUBLIC_TOKEN}`)
    await expect(page.locator('body')).toContainText(/진행|납품|수정/)
    await page.screenshot({ path: 'test-results/promo-recording-smoke.png', fullPage: false })
  })
})
