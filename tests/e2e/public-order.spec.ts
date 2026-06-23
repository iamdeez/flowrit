import { expect, test } from 'playwright/test'
import { e2eEnv, login, requireEnv, requireMutationAllowed } from './helpers'

test.describe('public order flow', () => {
  test('customer submits public order and owner sees orders page', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['workspaceSlug', 'email', 'password'])

    await page.goto(`/order/${e2eEnv.workspaceSlug}`)
    await page.getByLabel(/이름/).fill('E2E 고객')
    const contact = page.getByLabel(/연락처/)
    if (await contact.count()) await contact.fill('e2e-customer@example.com')
    await page.getByLabel(/의뢰 내용/).fill('E2E 공개 주문서 제출 테스트입니다.')
    await page.getByRole('button', { name: /주문서 제출하기/ }).click()
    await expect(page.getByText('주문서가 접수되었습니다')).toBeVisible()

    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('heading', { name: '주문서 관리' })).toBeVisible()
    await expect(page.getByText('E2E 고객').first()).toBeVisible()
  })

  test('pending order exposes project conversion CTA', async ({ page }) => {
    requireEnv(['email', 'password'])

    await login(page)
    await page.goto('/orders?tab=order')
    await expect(page.getByRole('button', { name: '프로젝트로 전환' }).first()).toBeVisible()
  })
})
