import type { PromoEnv, PromoScenario } from '../lib/types.ts'
import { loginForPromo, optionalClick, optionalSpotlight } from './shared.ts'

export function createOwnerDashboardScenario(env: PromoEnv): PromoScenario {
  return {
    id: 'owner-dashboard',
    title: '오늘 할 일과 납품 상태를 한 화면에서 관리',
    durationTargetSec: 30,
    viewport: 'mobile-reels',
    async run(director) {
      await loginForPromo(director, env)
      await director.goto('/dashboard', 'dashboard overview')
      await optionalSpotlight(director, 'text=오늘')
      await optionalSpotlight(director, 'text=수정')
      await optionalSpotlight(director, 'text=납품')
      await director.screenshot('01-dashboard-priority')

      await director.goto('/projects', 'project list')
      await optionalSpotlight(director, 'main')
      await optionalClick(director, 'a[href*="/projects/"]')
      await optionalSpotlight(director, 'text=고객')
      await director.screenshot('02-project-context')
      await director.pause(1_400, 'final hold')
    },
  }
}
