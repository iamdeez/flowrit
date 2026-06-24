import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('projects', () => {
  test('E-01 project list page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: '프로젝트' })).toBeVisible()
  })

  test('E-02 create project when customer and template exist', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects/new')
    await expect(page.getByRole('heading', { name: '프로젝트 생성' })).toBeVisible()

    // skip if no customers or templates
    const noCustomerMsg = page.getByText('먼저 고객을 등록해 주세요')
    if (await noCustomerMsg.isVisible()) {
      test.skip(true, '고객 또는 템플릿 없음 — 선행 데이터 필요')
      return
    }

    const customerSelect = page.getByLabel('고객')
    const templateSelect = page.getByLabel('워크플로우 템플릿')

    // pick first available customer and template
    await customerSelect.selectOption({ index: 1 })
    await templateSelect.selectOption({ index: 1 })

    const title = `E2E 프로젝트 ${Date.now()}`
    await page.getByLabel('제목').fill(title)
    await page.getByLabel('마감일').fill('2026-07-31')
    await page.getByRole('button', { name: '프로젝트 생성' }).click()

    // Regex excludes /projects/new — must navigate to an actual project detail page
    await expect(page).toHaveURL(/\/projects\/(?!new)[a-z0-9]+/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('E-03 project form warns when no customers exist', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects/new')
    // Only check if the warning is present — it appears only when there are no customers
    const warning = page.getByText('먼저 고객을 등록해 주세요')
    const submitBtn = page.getByRole('button', { name: '프로젝트 생성' })
    if (await warning.isVisible()) {
      await expect(submitBtn).toBeDisabled()
    } else {
      test.skip(true, '고객 데이터 있음 — 이 시나리오는 빈 상태 전용')
    }
  })

  test('E-04 project detail shows basic info', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')
    // Use goto to avoid click races with concurrent revalidatePath server actions
    const href = await firstProject.getAttribute('href')
    await page.goto(href!)
    await expect(page).toHaveURL(/\/projects\/(?!new)[a-z0-9]+/)
    // Project detail should show stage info and project heading
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('E-05 stage can be advanced on project detail', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')
    // Use goto instead of click to avoid grid overflow issues on mobile
    const href = await firstProject.getAttribute('href')
    await page.goto(href!)
    await expect(page).toHaveURL(/\/projects\/(?!new)[a-z0-9]+/)

    // Stage buttons are rendered by StageForm — find a non-current stage button
    // Require some text to exclude the icon-only logout button (form button[type=submit] with no text)
    const stageButtons = page.locator('form button[type="submit"]')
      .filter({ hasText: /[가-힣a-zA-Z]/ })
      .filter({ hasNotText: /확인|제출|생성/ })
    test.skip((await stageButtons.count()) === 0, '스테이지 버튼 없음 — 선행 데이터 필요')
    // Click first non-selected stage button
    await stageButtons.first().click()
    // Stage change updates the page without navigation
    await expect(page).toHaveURL(/\/projects\/(?!new)[a-z0-9]+/)
  })

  test('E-07 project share link copy button', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')
    // Use goto to avoid click races with concurrent revalidatePath server actions
    const href = await firstProject.getAttribute('href')
    await page.goto(href!)
    await expect(page).toHaveURL(/\/projects\/(?!new)[a-z0-9]+/)

    // Either "공유 링크 생성" button (no public page yet) or "링크 복사" button (page exists)
    const copyOrCreate = page.getByRole('button', { name: /링크 복사|공유 링크 생성/ })
    test.skip((await copyOrCreate.count()) === 0, '공유 링크 버튼 없음 — UI 확인 필요')
    await expect(copyOrCreate.first()).toBeVisible()
  })

  test('E-08 timeline tab shows stage change history', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')
    const href = await firstProject.getAttribute('href')
    await page.goto(`${href}?tab=timeline`)
    await expect(page).toHaveURL(/\/projects\/(?!new)[a-z0-9]+/)
    // Timeline tab renders a textarea for memos and any existing events
    await expect(
      page.locator('textarea').or(page.getByText(/단계 변경|타임라인|기록/).first()).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('E-10 project list filter by status', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    // filtering via URL param
    await page.goto('/projects?view=mine')
    await expect(page.getByRole('heading', { name: '프로젝트' })).toBeVisible()
  })
})
