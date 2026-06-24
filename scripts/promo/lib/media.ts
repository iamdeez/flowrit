import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'

export async function findFfmpegPath(): Promise<string | null> {
  const candidates = [
    process.env.FFMPEG_PATH,
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next common install path.
    }
  }

  return null
}

export async function convertToMp4(inputPath: string, outputPath: string): Promise<boolean> {
  const ffmpegPath = await findFfmpegPath()
  if (!ffmpegPath) return false

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      '-y',
      '-i',
      inputPath,
      '-vf',
      'format=yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ])
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
  })

  return true
}
