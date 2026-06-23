import { sanitizeOpsContext } from '@/lib/ops-sanitize'

export type OpsAlertLevel = 'info' | 'warning' | 'critical'

export type OpsAlertInput = {
  level: OpsAlertLevel
  title: string
  message: string
  source: string
  context?: Record<string, unknown>
}

const LEVEL_META: Record<OpsAlertLevel, { label: string; color: number }> = {
  info: { label: 'INFO', color: 0x4f46e5 },
  warning: { label: 'WARNING', color: 0xf59e0b },
  critical: { label: 'CRITICAL', color: 0xdc2626 },
}

function stringifyContext(context: unknown): string {
  if (!context) return '없음'
  return JSON.stringify(context, null, 2).slice(0, 1600)
}

export async function sendOpsAlert(input: OpsAlertInput): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (process.env.NODE_ENV !== 'production' || !webhookUrl) {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[ops-alert] skipped', { source: input.source, title: input.title })
    }
    return
  }

  const meta = LEVEL_META[input.level]
  const sanitizedContext = sanitizeOpsContext(input.context ?? {})

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Flowrit Ops',
        embeds: [
          {
            title: `[${meta.label}] ${input.title}`,
            description: input.message,
            color: meta.color,
            fields: [
              { name: 'Source', value: input.source, inline: true },
              {
                name: 'Context',
                value: `\`\`\`json\n${stringifyContext(sanitizedContext)}\n\`\`\``,
                inline: false,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('[ops-alert] Discord webhook failed', {
        status: response.status,
        source: input.source,
      })
    }
  } catch (error) {
    console.error('[ops-alert] Discord webhook error', {
      source: input.source,
      error,
    })
  }
}
