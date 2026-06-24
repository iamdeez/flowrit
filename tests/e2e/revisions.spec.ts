import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('revisions', () => {
  test('F-07 revision list page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/revisions')
    await expect(page.getByRole('heading', { name: '수정 요청' })).toBeVisible()
  })

  test('F-01 create revision request on a project', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)

    // Navigate to project list and pick first project
    await page.goto('/projects')
    const firstProject = page.getByRole('link').filter({ hasText: /프로젝트|E2E/ }).first()
    test.skip((await firstProject.count()) === 0, '프로젝트 없음 — 선행 데이터 필요')

    await firstProject.click()
    await expect(page).toHaveURL(/\/projects\/[a-z0-9]+/)

    // Navigate to the revision tab / section
    const revisionTab = page.getByRole('link', { name: /수정 요청|작업 항목/ })
      .or(page.getByRole('tab', { name: /수정 요청|작업 항목/ }))
    if (await revisionTab.count()) await revisionTab.first().click()

    await page.getByLabel('내부 작업 항목').fill('E2E 자동 생성 수정 요청 내용')
    await page.getByLabel('우선순위').selectOption('HIGH')
    await page.getByRole('button', { name: '작업 항목 추가' }).click()

    await expect(page.getByText('E2E 자동 생성 수정 요청 내용')).toBeVisible({ timeout: 10_000 })
  })

  test('F-02 revision status can be changed via status select', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)

    await page.goto('/revisions')
    const statusSelect = page.getByRole('combobox', { name: /수정 요청 상태/ }).first()
    test.skip((await statusSelect.count()) === 0, '수정 요청 없음 — 선행 데이터 필요')

    await statusSelect.selectOption('IN_PROGRESS')
    await expect(statusSelect).toHaveValue('IN_PROGRESS')
  })
})
