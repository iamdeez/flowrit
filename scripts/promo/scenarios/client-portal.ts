import type { PromoEnv, PromoScenario } from '../lib/types.ts'
import { optionalClick, optionalSpotlight } from './shared.ts'

export function createClientPortalScenario(env: PromoEnv): PromoScenario {
  return {
    id: 'client-portal',
    title: '고객은 링크 하나로 진행 단계와 납품 이력을 확인',
    durationTargetSec: 30,
    viewport: 'mobile-reels',
    async run(director) {
      await director.goto(`/p/${env.publicToken}`, 'client portal')
      await optionalSpotlight(director, 'text=진행 단계 확인')
      await director.screenshot('01-client-stage')
      await optionalClick(director, 'text=납품 이력 확인')
      await optionalSpotlight(director, 'text=납품')
      await director.screenshot('02-client-deliveries')
      await optionalClick(director, 'text=수정 요청 전달')
      await optionalSpotlight(director, 'text=수정')
      await director.screenshot('03-client-revision')
      await director.pause(1_400, 'final hold')
    },
  }
}
