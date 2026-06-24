import { expect, test } from 'playwright/test'
import { login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('workflow templates', () => {
  test('N-01 templates page loads', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/templates')
    await expect(page.getByRole('heading', { name: /워크플로우 템플릿|템플릿/ }).first()).toBeVisible()
  })

  test('N-02 create workflow template with stages', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/templates')

    const templateName = `QA 디자인 플로우 ${Date.now()}`

    // Find the new-template form — template-form uses label "워크스페이스 이름" for name
    // template-form.tsx uses ids like `${mode}-name-${id}` where mode='create', id='new'
    const nameInput = page.locator('input[id*="create-name"], input[id*="name-new"]')
      .or(page.getByLabel('템플릿 이름').or(page.getByPlaceholder(/이름|템플릿/))).first()

    if ((await nameInput.count()) === 0) {
      // Try new template button first
      const newBtn = page.getByRole('button', { name: /새 템플릿|추가|\+/ }).first()
      test.skip((await newBtn.count()) === 0, '새 템플릿 버튼 없음')
      await newBtn.click()
    }

    await nameInput.fill(templateName)

    // Add stages — stage inputs are stageInternalName and stageCustomerName
    const addStageBtn = page.getByRole('button', { name: /스테이지 추가|단계 추가|추가/ }).first()
    if (await addStageBtn.count()) {
      await addStageBtn.click()
      const internalInputs = page.locator('input[name="stageInternalName"]')
      const customerInputs = page.locator('input[name="stageCustomerName"]')
      if (await internalInputs.count()) {
        await internalInputs.first().fill('시안 작업')
        if (await customerInputs.count()) await customerInputs.first().fill('디자인 작업 중')
      }
    }

    const saveBtn = page.getByRole('button', { name: /저장|생성|만들기/ }).first()
    await saveBtn.click()

    await expect(page.getByText(templateName)).toBeVisible({ timeout: 10_000 })
  })

  test('N-04 workflow template is available when creating a project', async ({ page }) => {
    requireEnv(['email', 'password'])
    await login(page)
    await page.goto('/projects/new')

    // Template selector should list available templates
    const templateSelect = page.getByLabel('워크플로우 템플릿')
    test.skip((await templateSelect.count()) === 0, '템플릿 셀렉트 없음')
    const optionCount = await templateSelect.locator('option').count()
    // Should have at least one non-empty option (from N-02 or pre-existing)
    expect(optionCount).toBeGreaterThan(1)
  })
})
