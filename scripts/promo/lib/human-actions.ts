import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Locator, Page } from 'playwright'
import type { HumanDirector } from './types.ts'

const DEFAULT_PAUSE_MS = 650
const READ_PAUSE_MS = 1_250
const TYPE_DELAY_MS = 45

export function createHumanDirector(page: Page, options: { baseUrl: string; screenshotDir: string }): HumanDirector {
  async function resolveTarget(target: string): Promise<Locator> {
    return page.locator(target).first()
  }

  return {
    page,
    async goto(pathOrUrl, reason) {
      const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${options.baseUrl}${pathOrUrl}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(reason ? READ_PAUSE_MS : DEFAULT_PAUSE_MS)
    },
    async hover(target) {
      const locator = await resolveTarget(target)
      await locator.hover({ trial: false })
      await page.waitForTimeout(DEFAULT_PAUSE_MS)
    },
    async click(target) {
      const locator = await resolveTarget(target)
      await locator.hover({ trial: false })
      await page.waitForTimeout(350)
      await locator.click()
      await page.waitForTimeout(DEFAULT_PAUSE_MS)
    },
    async type(target, text) {
      const locator = await resolveTarget(target)
      await locator.click()
      await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
      await locator.press('Backspace')
      await locator.pressSequentially(text, { delay: TYPE_DELAY_MS })
      await page.waitForTimeout(DEFAULT_PAUSE_MS)
    },
    async scrollTo(target) {
      const locator = await resolveTarget(target)
      await locator.scrollIntoViewIfNeeded()
      await page.waitForTimeout(READ_PAUSE_MS)
    },
    async pause(ms) {
      await page.waitForTimeout(ms)
    },
    async spotlight(target) {
      const locator = await resolveTarget(target)
      await locator.scrollIntoViewIfNeeded()
      await locator.evaluate((element) => {
        const node = element as HTMLElement
        node.animate(
          [
            { boxShadow: '0 0 0 0 rgba(79, 70, 229, 0)' },
            { boxShadow: '0 0 0 6px rgba(79, 70, 229, 0.22)' },
            { boxShadow: '0 0 0 0 rgba(79, 70, 229, 0)' },
          ],
          { duration: 1_100, iterations: 1 },
        )
      })
      await page.waitForTimeout(READ_PAUSE_MS)
    },
    async screenshot(name) {
      await mkdir(options.screenshotDir, { recursive: true })
      await page.screenshot({ path: join(options.screenshotDir, `${name}.png`), fullPage: false })
      await page.waitForTimeout(350)
    },
  }
}
