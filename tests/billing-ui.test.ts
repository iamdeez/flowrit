import { describe, expect, it } from 'vitest'
import { getBillingPlanMessage } from '@/app/(dashboard)/settings/billing-tab'

describe('billing state messages', () => {
  it('explains free plan limits', () => {
    expect(
      getBillingPlanMessage({
        isPro: false,
        isPastDue: false,
        isCancelScheduled: false,
        cancelDone: false,
        periodEnd: null,
      }),
    ).toContain('무료 플랜')
  })

  it('guides past_due users to payment action', () => {
    expect(
      getBillingPlanMessage({
        isPro: true,
        isPastDue: true,
        isCancelScheduled: false,
        cancelDone: false,
        periodEnd: '2026. 7. 1.',
      }),
    ).toContain('결제 확인')
  })

  it('explains scheduled cancellation access period', () => {
    expect(
      getBillingPlanMessage({
        isPro: true,
        isPastDue: false,
        isCancelScheduled: true,
        cancelDone: false,
        periodEnd: '2026. 7. 1.',
      }),
    ).toBe('2026. 7. 1.까지 Pro 기능을 사용할 수 있습니다.')
  })

  it('explains active Pro access', () => {
    expect(
      getBillingPlanMessage({
        isPro: true,
        isPastDue: false,
        isCancelScheduled: false,
        cancelDone: false,
        periodEnd: null,
      }),
    ).toBe('현재 Pro 기능이 활성화되어 있습니다.')
  })
})
