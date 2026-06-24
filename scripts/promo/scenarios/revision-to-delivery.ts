import type { PromoEnv, PromoScenario } from '../lib/types.ts'
import { loginForPromo, optionalClick, optionalSpotlight } from './shared.ts'

export function createRevisionToDeliveryScenario(env: PromoEnv): PromoScenario {
  return {
    id: 'revision-to-delivery',
    title: '수정 요청부터 재납품과 작업 확정까지 연결',
    durationTargetSec: 45,
    viewport: 'mobile-reels',
    async run(director) {
      await loginForPromo(director, env)
      const projectPath = env.projectId ? `/projects/${env.projectId}` : '/projects'
      await director.goto(projectPath, 'project detail or list')
      if (!env.projectId) {
        await optionalClick(director, 'a[href*="/projects/"]')
      }
      await optionalSpotlight(director, 'text=수정')
      await director.screenshot('01-revision-request')
      await optionalSpotlight(director, 'text=납품')
      await director.screenshot('02-delivery-upload')

      await director.goto(`/p/${env.publicToken}`, 'client confirms delivery')
      await optionalClick(director, 'text=납품 이력 확인')
      await optionalSpotlight(director, 'text=작업 확정')
      await director.screenshot('03-client-confirm')
      await director.pause(1_400, 'final hold')
    },
  }
}
