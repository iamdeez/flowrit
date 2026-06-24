import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('message templates', () => {
  // Serial: M-02 creates a template that M-04 (edit) and M-05 (delete) depend on
  test.describe.configure({ mode: 'serial' })
  test('M-01 messages page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/messages')
    await expect(page.getByRole('heading', { name: '메시지 템플릿' })).toBeVisible()
  })

  test('M-02 create message template', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/messages')

    const templateName = `E2E 템플릿 ${Date.now()}`
    // Form fields in message-form.tsx use ids: msg-name-new, msg-content-new
    await page.locator('#msg-name-new').fill(templateName)
    await page.locator('#msg-content-new').fill(
      '안녕하세요 {{고객명}}님, E2E 자동 테스트 템플릿입니다.'
    )
    await page.getByRole('button', { name: '템플릿 생성' }).click()

    await expect(page.getByText(templateName)).toBeVisible({ timeout: 10_000 })
  })

  test('M-04 edit existing message template', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/messages')
    await expect(page.getByRole('heading', { name: '메시지 템플릿' })).toBeVisible()

    // "편집" button renders per template in MessagesPageClient; use text filter for reliability
    const editBtn = page.locator('button').filter({ hasText: '편집' }).first()
    test.skip((await editBtn.count()) === 0, '템플릿 없음 — M-02 먼저 실행 필요')
    await editBtn.click()

    // After clicking edit, the form switches to edit mode (msg-name-new id stays same but template id changes)
    const nameInput = page.locator('input[id^="edit-name"], input[name="name"]')
      .or(page.locator('#msg-name-new')).first()
    const currentVal = await nameInput.inputValue()
    const newVal = currentVal.endsWith(' (수정)') ? currentVal.replace(' (수정)', '') : `${currentVal} (수정)`
    await nameInput.fill(newVal)
    await page.getByRole('button', { name: '변경사항 저장' }).click()

    await expect(page.getByText(newVal)).toBeVisible({ timeout: 10_000 })
  })

  test('M-05 delete message template', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/messages')
    await expect(page.getByRole('heading', { name: '메시지 템플릿' })).toBeVisible()

    // Delete button renders as <button type="submit"> inside a <form> per template
    const allDeleteBtns = page.locator('button').filter({ hasText: '삭제' })
    const countBefore = await allDeleteBtns.count()
    test.skip(countBefore === 0, '템플릿 없음 — M-02 먼저 실행 필요')

    page.on('dialog', (dialog) => dialog.accept())
    await allDeleteBtns.first().click()
    await expect(allDeleteBtns).toHaveCount(countBefore - 1, { timeout: 10_000 })
  })
})
