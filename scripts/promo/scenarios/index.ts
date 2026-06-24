import type { PromoEnv, PromoScenario, PromoScenarioId } from '../lib/types.ts'
import { createClientPortalScenario } from './client-portal.ts'
import { createOwnerDashboardScenario } from './owner-dashboard.ts'
import { createRevisionToDeliveryScenario } from './revision-to-delivery.ts'

export function createScenarioRegistry(env: PromoEnv): Record<PromoScenarioId, PromoScenario> {
  return {
    'owner-dashboard': createOwnerDashboardScenario(env),
    'client-portal': createClientPortalScenario(env),
    'revision-to-delivery': createRevisionToDeliveryScenario(env),
  }
}

export function getScenario(env: PromoEnv, id: string): PromoScenario {
  const registry = createScenarioRegistry(env)
  if (isPromoScenarioId(id) && registry[id]) return registry[id]
  throw new Error(`Unknown promo scenario "${id}". Available: ${Object.keys(registry).join(', ')}`)
}

export function listScenarioIds(): PromoScenarioId[] {
  return ['owner-dashboard', 'client-portal', 'revision-to-delivery']
}

function isPromoScenarioId(value: string): value is PromoScenarioId {
  return listScenarioIds().includes(value as PromoScenarioId)
}
