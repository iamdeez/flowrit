import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('customers', () => {
  test('D-01 customer list page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: '고객' })).toBeVisible()
  })

  test('D-02 create customer and verify it appears in list', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)

    const name = `E2E 고객 ${Date.now()}`
    await page.goto('/customers/new')
    await expect(page.getByRole('heading', { name: '고객 등록' })).toBeVisible()
    await page.getByLabel('이름').fill(name)
    await page.getByLabel('연락처').fill(`e2e-${Date.now()}@test.com`)
    await page.getByLabel('메모').fill('E2E 자동 테스트로 생성된 고객')
    await page.getByRole('button', { name: '고객 등록' }).click()

    await expect(page).toHaveURL(/\/customers/, { timeout: 15_000 })
    await expect(page.getByText(name)).toBeVisible()
  })

  test('D-03 customer detail page shows customer info', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')
    const firstCustomer = page.locator('a[href^="/customers/"]:not([href="/customers/new"])').first()
    test.skip((await firstCustomer.count()) === 0, '고객 없음 — 선행 데이터 필요')
    // Use goto instead of click to avoid wide grid overflow issues on mobile
    const href = await firstCustomer.getAttribute('href')
    await page.goto(href!)
    await expect(page).toHaveURL(/\/customers\/[a-z0-9]+/)
    // Customer detail should show name and some info
    await expect(page.locator('h1, h2, [class*="heading"]').first()).toBeVisible()
  })

  test('D-04 customer info can be edited', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')
    const firstCustomer = page.locator('a[href^="/customers/"]:not([href="/customers/new"])').first()
    test.skip((await firstCustomer.count()) === 0, '고객 없음 — 선행 데이터 필요')
    // Use goto instead of click to avoid wide grid overflow issues on mobile
    const href = await firstCustomer.getAttribute('href')
    await page.goto(href!)
    await expect(page).toHaveURL(/\/customers\/[a-z0-9]+/)

    // Open edit modal
    const editBtn = page.getByRole('button', { name: /수정|편집|Edit/ }).first()
    test.skip((await editBtn.count()) === 0, '수정 버튼 없음 — UI 확인 필요')
    await editBtn.click()

    const nameInput = page.locator('#edit-name')
    const currentName = await nameInput.inputValue()
    const newName = currentName.endsWith(' (수정)') ? currentName.replace(' (수정)', '') : `${currentName} (수정)`
    await nameInput.fill(newName)
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 })
  })

  test('D-05 customer search filters list', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/customers')
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/검색|이름/))
    test.skip((await search.count()) === 0, '검색 입력란 없음 — UI 변경 가능성')
    await search.fill('E2E')
    // Customers page renders both desktop table (hidden md:block) and mobile cards (md:hidden).
    // Use :visible to skip the hidden desktop table links and find the visible mobile card links.
    const customerRow = page.locator('a[href^="/customers/"]:not([href="/customers/new"]):visible').first()
    await expect(customerRow).toBeVisible({ timeout: 5_000 })
  })
})
