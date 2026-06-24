import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('revisions', () => {
  // Serial: F-01 and F-05 both navigate to the same project; their revalidatePath calls
  // cause each other's RevisionForm to remount (Next.js 16 router cache push to all clients).
  test.describe.configure({ mode: 'serial' })

  test('F-07 revision list page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/revisions')
    await expect(page.getByRole('heading', { name: '수정 요청' })).toBeVisible()
  })

  test('F-01 create revision request on a project', async ({ page }) => {
    // Parallel spec files (projects, assets) also navigate to the first project and trigger
    // revalidatePath server actions, causing this page's RevisionForm to remount continuously.
    // Increase timeout to allow the retry loop below enough budget.
    test.setTimeout(60_000)

    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)

    // Navigate to project list and pick first project detail link
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')

    // Use goto instead of click to avoid mobile grid overflow click issues
    const projectHref = await firstProject.getAttribute('href')
    await page.goto(`${projectHref}?tab=revisions`)
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+/)

    // RevisionForm is inside a <details> element. revalidatePath from concurrent tests can
    // remount the form at any point. Retry the full expand→fill→submit sequence up to 4 times.
    let submitted = false
    for (let attempt = 0; attempt < 4 && !submitted; attempt++) {
      if (attempt > 0) {
        await page.reload()
        await page.waitForTimeout(600)
        const tab = page.getByRole('link', { name: /수정 요청|작업 항목/ })
          .or(page.getByRole('tab', { name: /수정 요청|작업 항목/ }))
        if (await tab.count()) await tab.first().click({ timeout: 2_000 }).catch(() => {})
      }
      try {
        const summary = page.locator('summary').filter({ hasText: /내부 작업 항목/ })
        if (await summary.count()) {
          await summary.click({ timeout: 2_000 })
          await page.waitForTimeout(300)
        }
        await page.getByLabel('내부 작업 항목').fill('E2E 자동 생성 수정 요청 내용', { timeout: 3_000 })
        await page.getByLabel('우선순위').selectOption('HIGH', { timeout: 2_000 })
        await page.getByRole('button', { name: '작업 항목 추가' }).click({ timeout: 3_000 })
        submitted = true
      } catch {
        // revalidatePath re-render detached the DOM — retry
      }
    }

    if (!submitted) throw new Error('RevisionForm 제출 실패 — DOM 분리 4회 초과')

    // Server action revalidates /projects/[id] — navigate back to revisions tab to flush cache
    // (page.reload() resets to default tab; explicit URL preserves tab selection on all viewports)
    await page.goto(`${projectHref}?tab=revisions`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E 자동 생성 수정 요청 내용').first()).toBeVisible({ timeout: 10_000 })
  })

  test('F-03 revision status can be changed to DONE', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/revisions')
    // Find an IN_PROGRESS revision's status select
    const statusSelect = page.locator('select[aria-label="수정 요청 상태"]').first()
    test.skip((await statusSelect.count()) === 0, '수정 요청 없음 — 선행 데이터 필요')

    // Set to DONE to test that transition
    await statusSelect.selectOption('DONE')
    await expect(statusSelect).toHaveValue('DONE', { timeout: 5_000 })
  })

  test('F-04 revision priority badges are visible', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')
    const href = await firstProject.getAttribute('href')
    await page.goto(`${href}?tab=revisions`)
    // Priority labels rendered as <span> badges (not <option> elements in the form select)
    const priorityLabels = page.locator('span').filter({ hasText: /높음|중간|낮음/ }).first()
    test.skip((await priorityLabels.count()) === 0, '수정 요청 없음 — 선행 데이터 필요')
    await expect(priorityLabels).toBeVisible()
  })

  test('F-05 worker can add comment to revision', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/revisions')
    test.skip(
      (await page.locator('select[aria-label="수정 요청 상태"]').count()) === 0,
      '수정 요청 없음 — 선행 데이터 필요'
    )

    // Navigate to first project with revisions to access comment thread
    await page.goto('/projects')
    const firstProject = page.locator('a[href^="/projects/"]:not([href="/projects/new"])').first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')
    const href = await firstProject.getAttribute('href')
    await page.goto(`${href}?tab=revisions`)

    // RevisionCommentThread renders textarea with placeholder "댓글을 입력하세요..."
    const commentInput = page.getByPlaceholder('댓글을 입력하세요...').first()
    test.skip((await commentInput.count()) === 0, '댓글 입력란 없음 — 수정 요청 없음')

    const commentText = `E2E 자동 댓글 ${Date.now()}`
    await commentInput.fill(commentText)
    const submitBtn = page.getByRole('button', { name: '댓글 등록' }).first()
    test.skip((await submitBtn.count()) === 0, '댓글 등록 버튼 없음')
    await submitBtn.click()
    // Try to see the comment immediately (RSC re-render), or reload after 2s if not visible
    try {
      await expect(page.getByText(commentText)).toBeVisible({ timeout: 3_000 })
    } catch {
      // Server action may not have updated the page yet — reload to flush cache
      await page.waitForTimeout(1_000)
      await page.reload()
      await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 })
    }
  })

  test('F-02 revision status can be changed via status select', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)

    await page.goto('/revisions')
    // <select aria-label="수정 요청 상태"> — use attribute selector for cross-browser reliability
    const statusSelect = page.locator('select[aria-label="수정 요청 상태"]').first()
    test.skip((await statusSelect.count()) === 0, '수정 요청 없음 — 선행 데이터 필요')

    await statusSelect.selectOption('IN_PROGRESS')
    await expect(statusSelect).toHaveValue('IN_PROGRESS')
  })
})
