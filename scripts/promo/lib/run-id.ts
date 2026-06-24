import type { PromoScenarioId } from './types.ts'

export function createRunId(scenarioId: PromoScenarioId, date = new Date()): string {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  return `${stamp}-${scenarioId}`
}
