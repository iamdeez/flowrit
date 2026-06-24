import type { Page } from 'playwright'

export const PROMO_VIEWPORTS = {
  'mobile-reels': { width: 430, height: 932 },
  'desktop-framed': { width: 1080, height: 1920 },
} as const

export type PromoViewport = keyof typeof PROMO_VIEWPORTS

export type PromoScenarioId =
  | 'owner-dashboard'
  | 'client-portal'
  | 'revision-to-delivery'

export type PromoScenario = {
  id: PromoScenarioId
  title: string
  durationTargetSec: 15 | 30 | 45
  viewport: PromoViewport
  run: (director: HumanDirector) => Promise<void>
}

export type HumanDirector = {
  page: Page
  goto: (pathOrUrl: string, reason?: string) => Promise<void>
  hover: (target: string, label?: string) => Promise<void>
  click: (target: string, label?: string) => Promise<void>
  type: (target: string, text: string, label?: string) => Promise<void>
  scrollTo: (target: string, label?: string) => Promise<void>
  pause: (ms: number, reason?: string) => Promise<void>
  spotlight: (target: string, label?: string) => Promise<void>
  screenshot: (name: string) => Promise<void>
}

export type PromoEnv = {
  baseUrl: string
  email: string
  password: string
  workspaceSlug: string
  publicToken: string
  projectId?: string
  outputDir: string
  blacklist: string[]
  allowProduction: boolean
}

export type PromoManifest = {
  runId: string
  scenario: PromoScenarioId
  title: string
  baseUrl: string
  workspaceSlug: string
  projectId?: string
  viewport: { width: number; height: number }
  durationTargetSec: number
  createdAt: string
  files: {
    sourceVideo?: string
    cover?: string
    screenshots: string[]
    caption: string
    capcutBrief: string
  }
}

export type BundleInput = {
  env: PromoEnv
  scenario: Pick<PromoScenario, 'id' | 'title' | 'durationTargetSec' | 'viewport'>
  runId: string
  runDir: string
}
