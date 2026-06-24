import { expect, test } from 'playwright/test'
import { e2eEnv, requireEnv, requireMutationAllowed } from './helpers'

test.describe('customer portal', () => {
  test('customer can open revision form from public project portal', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['publicProjectToken'])

    await page.goto(`/p/${e2eEnv.publicProjectToken}`)
    await expect(page.getByText('진행 단계 확인')).toBeVisible()
    // Switch to the revisions tab — the '수정 요청하기' link only renders there
    await page.getByRole('button', { name: '수정 요청 전달' }).click()
    await page.getByRole('link', { name: '수정 요청하기' }).click()
    await expect(page).toHaveURL(new RegExp(`/p/${e2eEnv.publicProjectToken}/revision`))
    await page.getByLabel(/수정 요청 내용/).fill('E2E 고객 포털 수정 요청 테스트입니다.')
    await page.getByRole('button', { name: '수정 요청 제출' }).click()
    await expect(page.getByText('수정 요청이 접수되었습니다')).toBeVisible()
  })
})
