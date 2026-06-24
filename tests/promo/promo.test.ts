import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { loadPromoEnv, normalizeBaseUrl, parseList } from '@/scripts/promo/lib/env'
import { findFfmpegPath } from '@/scripts/promo/lib/media'
import { renderPromoBundle } from '@/scripts/promo/lib/render'
import { assertPromoSafety } from '@/scripts/promo/lib/safety'
import { scanSensitiveText } from '@/scripts/promo/lib/sensitive-scan'
import { resolveInstagramPublishMode, publishInstagramReel } from '@/scripts/promo/lib/instagram-publisher'
import { createScenarioRegistry, listScenarioIds } from '@/scripts/promo/scenarios'

const baseEnv = {
  PROMO_BASE_URL: 'http://localhost:3000/',
  PROMO_EMAIL: 'promo-demo@example.com',
  PROMO_PASSWORD: 'secret',
  PROMO_WORKSPACE_SLUG: 'demo-workspace',
  PROMO_PUBLIC_TOKEN: 'public-demo-token',
  PROMO_OUTPUT_DIR: 'artifacts/promo',
}

describe('promo automation', () => {
  it('parses promo env and normalizes values', () => {
    const env = loadPromoEnv({
      ...baseEnv,
      PROMO_BLACKLIST: 'Acme, Real Customer',
    })

    expect(env.baseUrl).toBe('http://localhost:3000')
    expect(env.blacklist).toEqual(['Acme', 'Real Customer'])
    expect(parseList('a, b,,c')).toEqual(['a', 'b', 'c'])
    expect(normalizeBaseUrl('https://example.com/foo?bar=1')).toBe('https://example.com/foo')
  })

  it('requires mandatory promo env values', () => {
    expect(() => loadPromoEnv({ ...baseEnv, PROMO_PUBLIC_TOKEN: '' })).toThrow(
      /PROMO_PUBLIC_TOKEN/,
    )
  })

  it('blocks unsafe production-looking targets by default', () => {
    const env = loadPromoEnv({
      ...baseEnv,
      PROMO_BASE_URL: 'https://flowrit.motionbit.kr',
      PROMO_WORKSPACE_SLUG: 'client-workspace',
    })

    expect(() => assertPromoSafety(env)).toThrow(/production host/)
  })

  it('registers the default promo scenarios', () => {
    const env = loadPromoEnv(baseEnv)
    const registry = createScenarioRegistry(env)

    expect(listScenarioIds()).toEqual([
      'owner-dashboard',
      'client-portal',
      'revision-to-delivery',
    ])
    expect(Object.keys(registry)).toHaveLength(3)
  })

  it('detects sensitive promo text', () => {
    const findings = scanSensitiveText(
      'Contact real@example.com with authorization header for Acme Corp.',
      ['Acme Corp'],
    )

    expect(findings.map((finding) => finding.label)).toEqual([
      'email',
      'secret-keyword',
      'blacklist',
    ])
  })

  it('renders a bundle manifest, caption, prompt, and cover', async () => {
    const env = loadPromoEnv(baseEnv)
    const registry = createScenarioRegistry(env)
    const runDir = await mkdtemp(join(tmpdir(), 'flowrit-promo-'))
    await mkdir(join(runDir, 'screenshots'))
    await writeFile(join(runDir, 'screenshots', '01.png'), 'fake image')
    await writeFile(join(runDir, 'source.mp4'), 'fake video')

    const manifest = await renderPromoBundle({
      env,
      scenario: registry['client-portal'],
      runId: 'test-run',
      runDir,
    })

    expect(manifest.files.cover).toBe('cover.png')
    expect(manifest.files.sourceVideo).toBe('source.mp4')
    expect(manifest.files.caption).toBe('caption.md')
    expect(manifest.files.capcutBrief).toBe('capcut-brief.md')
    await expect(readFile(join(runDir, 'manifest.json'), 'utf8')).resolves.toContain(
      'client-portal',
    )
  })

  it('defaults Instagram publishing to review-only', async () => {
    expect(resolveInstagramPublishMode()).toBe('review-only')
    await expect(
      publishInstagramReel({
        mode: 'review-only',
        videoPath: 'source.mp4',
        caption: 'Flowrit demo',
      }),
    ).resolves.toMatchObject({ ok: true, mode: 'review-only' })
  })

  it('checks ffmpeg readiness without throwing', async () => {
    const ffmpegPath = await findFfmpegPath()
    expect(ffmpegPath === null || typeof ffmpegPath === 'string').toBe(true)
  })
})
