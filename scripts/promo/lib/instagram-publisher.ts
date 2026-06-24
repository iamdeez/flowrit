export type InstagramPublishMode = 'review-only' | 'publish'

export type InstagramPublishInput = {
  mode?: InstagramPublishMode
  videoPath: string
  caption: string
  coverPath?: string
}

export function resolveInstagramPublishMode(mode?: string): InstagramPublishMode {
  return mode === 'publish' ? 'publish' : 'review-only'
}

export async function publishInstagramReel(input: InstagramPublishInput) {
  const mode = input.mode ?? 'review-only'
  if (mode === 'review-only') {
    return {
      ok: true,
      mode,
      message: 'Review-only mode. No Instagram API request was sent.',
    }
  }

  const required = ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing Instagram publish environment variables: ${missing.join(', ')}`)
  }

  throw new Error('Instagram publish is not implemented yet. Use review-only until Meta permissions are verified.')
}
