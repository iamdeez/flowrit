import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { assertNoSensitiveText } from './sensitive-scan.ts'
import { PROMO_VIEWPORTS, type BundleInput, type PromoManifest } from './types.ts'
import { createCapCutBrief } from '../templates/capcut-brief.ts'
import { createCaption } from '../templates/caption.ts'

export async function renderPromoBundle(input: BundleInput): Promise<PromoManifest> {
  const screenshotsDir = join(input.runDir, 'screenshots')
  await mkdir(screenshotsDir, { recursive: true })

  const screenshotFiles = await listFiles(screenshotsDir, '.png')
  const cover = screenshotFiles[0] ? 'cover.png' : undefined
  if (screenshotFiles[0]) {
    await cp(join(screenshotsDir, screenshotFiles[0]), join(input.runDir, 'cover.png'))
  }

  const sourceVideo = (await listFiles(input.runDir, '.mp4'))[0] || (await listFiles(input.runDir, '.webm'))[0]
  const caption = createCaption(input)
  const capcutBrief = createCapCutBrief(input)

  const viewport = PROMO_VIEWPORTS[input.scenario.viewport]
  const manifest: PromoManifest = {
    runId: input.runId,
    scenario: input.scenario.id,
    title: input.scenario.title,
    baseUrl: input.env.baseUrl,
    workspaceSlug: input.env.workspaceSlug,
    projectId: input.env.projectId,
    viewport,
    durationTargetSec: input.scenario.durationTargetSec,
    createdAt: new Date().toISOString(),
    files: {
      sourceVideo,
      cover,
      screenshots: screenshotFiles.map((file) => `screenshots/${file}`),
      caption: 'caption.md',
      capcutBrief: 'capcut-brief.md',
    },
  }

  const manifestText = JSON.stringify(manifest, null, 2)
  assertNoSensitiveText(
    [caption, capcutBrief, manifestText].join('\n'),
    [input.env.email, input.env.publicToken, ...input.env.blacklist],
  )

  await writeFile(join(input.runDir, 'caption.md'), caption)
  await writeFile(join(input.runDir, 'capcut-brief.md'), capcutBrief)
  await writeFile(join(input.runDir, 'manifest.json'), manifestText)
  return manifest
}

export async function validateExistingBundle(runDir: string, blacklist: string[] = []): Promise<void> {
  const files = ['caption.md', 'capcut-brief.md', 'manifest.json']
  const contents = await Promise.all(files.map((file) => readFile(join(runDir, file), 'utf8')))
  assertNoSensitiveText(contents.join('\n'), blacklist)
}

async function listFiles(dir: string, extension: string): Promise<string[]> {
  try {
    const entries = await readdir(dir)
    return entries.filter((entry) => entry.endsWith(extension)).map((entry) => basename(entry)).sort()
  } catch {
    return []
  }
}
