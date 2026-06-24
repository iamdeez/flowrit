import { expect, test } from 'playwright/test'
import { e2eEnv, requireEnv, requireMutationAllowed } from './helpers'

test.describe('customer portal', () => {
  test('H-01 public project portal loads for valid token', async ({ page }) => {
    requireEnv(['publicProjectToken'])
    await page.goto(`/p/${e2eEnv.publicProjectToken}`)
    await expect(page.getByText('진행 단계 확인').or(page.getByText(/진행|단계|현황/)).first()).toBeVisible({ timeout: 10_000 })
  })

  test('H-02 PREPARING assets are not shown in customer portal', async ({ page }) => {
    requireEnv(['publicProjectToken'])
    await page.goto(`/p/${e2eEnv.publicProjectToken}`)
    await expect(page).not.toHaveURL(/\/login/)
    // PREPARING status label should not appear in customer view
    await expect(page.getByText('PREPARING')).not.toBeVisible()
    await expect(page.getByText('비공개')).not.toBeVisible()
  })

  test('H-04 customer can add comment in portal', async ({ page }) => {
    requireMutationAllowed()
    requireEnv(['publicProjectToken'])
    await page.goto(`/p/${e2eEnv.publicProjectToken}`)

    // Navigate to revision tab / revision that allows comments
    const revisionTabBtn = page.getByRole('button', { name: /수정 요청|피드백/ })
    if (await revisionTabBtn.count()) await revisionTabBtn.first().click()

    const commentInput = page.locator('textarea').or(page.getByPlaceholder(/내용|댓글|코멘트/)).first()
    test.skip((await commentInput.count()) === 0, '댓글 입력란 없음 — 수정 요청 필요')
    await commentInput.fill(`E2E 고객 댓글 ${Date.now()}`)
    const submitBtn = page.getByRole('button', { name: /제출|전송|보내기/ }).first()
    test.skip((await submitBtn.count()) === 0, '제출 버튼 없음')
    await submitBtn.click()
    await expect(page.getByText(/접수|완료|감사/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('H-05 invalid portal token shows 404 or error', async ({ page }) => {
    await page.goto('/p/invalid-token-xyz')
    await expect(
      page.getByRole('heading', { name: /404|페이지를 찾을 수 없습니다|찾을 수 없습니다/ })
        .or(page.getByText(/유효하지 않|찾을 수 없|존재하지 않/)).first()
    ).toBeVisible({ timeout: 10_000 })
  })

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
