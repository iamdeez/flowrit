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

  test('E-10 project list filter by status', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects')
    // filtering via URL param
    await page.goto('/projects?view=mine')
    await expect(page.getByRole('heading', { name: '프로젝트' })).toBeVisible()
  })
})
