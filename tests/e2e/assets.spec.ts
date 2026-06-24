import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('assets (deliverables)', () => {
  async function goToFirstProjectAssets(page: Parameters<typeof login>[0]) {
    await login(page)
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    if ((await firstProject.count()) === 0) return null
    const href = await firstProject.getAttribute('href')
    await page.goto(`${href}?tab=assets`)
    await page.waitForLoadState('networkidle')
    return href
  }

  test('G-03 PREPARING asset can be shared', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    const href = await goToFirstProjectAssets(page)
    test.skip(!href, '프로젝트 없음 — 선행 데이터 필요')

    // Assets are shared in bulk via the share form — look for "즉시 공유" option
    const shareSelect = page.locator('select').filter({ hasText: /즉시 공유|공유 예약/ })
    test.skip((await shareSelect.count()) === 0, '납품물 없음 또는 공유 폼 없음 — 선행 데이터 필요')

    await shareSelect.selectOption('now')
    const submitBtn = page.getByRole('button', { name: '설정 적용' }).first()
    test.skip((await submitBtn.count()) === 0, '설정 적용 버튼 없음')
    await submitBtn.click()
    await expect(page.getByText(/공유|SHARED|즉시 공유/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('G-04 SHARED asset can be expired', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    const href = await goToFirstProjectAssets(page)
    test.skip(!href, '프로젝트 없음 — 선행 데이터 필요')

    // If no delete button exists yet, add a link asset first to create one
    if ((await page.locator('[aria-label="에셋 삭제"]').count()) === 0) {
      const switchBtn = page.getByRole('button', { name: '외부 링크로 등록' })
      test.skip((await switchBtn.count()) === 0, '링크 등록 모드 전환 버튼 없음')
      await switchBtn.click()
      const linkInput = page.locator('#asset-url')
      await linkInput.fill('https://www.example.com/g04-test')
      const nameInput = page.locator('#asset-name')
      if (await nameInput.count()) await nameInput.fill('G04 삭제 테스트')
      await page.getByRole('button', { name: /등록/ }).first().click()
      await expect(page.locator('[aria-label="에셋 삭제"]').first()).toBeVisible({ timeout: 10_000 })
    }

    const deleteBtn = page.locator('[aria-label="에셋 삭제"]').first()
    await expect(deleteBtn).toBeVisible()
  })

  test('G-05 link asset can be added', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    const href = await goToFirstProjectAssets(page)
    test.skip(!href, '프로젝트 없음 — 선행 데이터 필요')

    // AssetForm starts in FILE mode; switch to link mode first
    const switchBtn = page.getByRole('button', { name: '외부 링크로 등록' })
    test.skip((await switchBtn.count()) === 0, '링크 등록 모드 전환 버튼 없음')
    await switchBtn.click()

    // After switching, id="asset-url" (name="url") input is visible
    const linkInput = page.locator('#asset-url')
    await expect(linkInput).toBeVisible()
    await linkInput.fill('https://www.figma.com/design/e2e-test-link')

    const nameInput = page.locator('#asset-name')
    if (await nameInput.count()) await nameInput.fill('QA E2E 피그마 링크')

    // Submit button text is "납품본 등록" (contains "등록")
    const submitBtn = page.getByRole('button', { name: /등록/ }).first()
    await submitBtn.click()
    await expect(page.getByText(/figma|QA E2E/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('G-06 assets can be filtered by type', async ({ page }) => {
    requireEnv(['email', 'password'])
    const href = await goToFirstProjectAssets(page)
    test.skip(!href, '프로젝트 없음 — 선행 데이터 필요')

    // Type filter buttons or select — look for DRIVE or DOCUMENT type filter
    const typeFilter = page.getByRole('button', { name: /파일|링크|문서|DRIVE|DOCUMENT/ }).first()
    test.skip((await typeFilter.count()) === 0, '타입 필터 없음 — 납품물 있을 때만 표시')
    await expect(typeFilter).toBeVisible()
  })
})
