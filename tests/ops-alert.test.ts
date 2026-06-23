import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeOpsContext } from '@/lib/ops-sanitize'
import { sendOpsAlert } from '@/lib/ops-alert'

describe('sanitizeOpsContext', () => {
  it('masks sensitive keys recursively', () => {
    expect(
      sanitizeOpsContext({
        userId: 'user_1',
        token: 'secret-token',
        nested: {
          DATABASE_URL: 'postgres://secret',
          count: 3,
        },
      }),
    ).toEqual({
      userId: 'user_1',
      token: '[REDACTED]',
      nested: {
        DATABASE_URL: '[REDACTED]',
        count: 3,
      },
    })
  })
})

describe('sendOpsAlert', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DISCORD_WEBHOOK_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not call Discord outside production', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await sendOpsAlert({
      level: 'warning',
      title: 'Cron failed',
      message: 'Daily job failed',
      source: 'cron',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends sanitized Discord payload in production', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DISCORD_WEBHOOK_URL', 'https://discord.example/webhook')
    vi.stubGlobal('fetch', fetchMock)

    await sendOpsAlert({
      level: 'critical',
      title: 'Billing failed',
      message: 'Payment retry failed',
      source: 'billing',
      context: {
        workspaceId: 'ws_1',
        secretKey: 'very-secret',
        nested: { authorization: 'Bearer token' },
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.example/webhook',
      expect.objectContaining({ method: 'POST' }),
    )
    const [, init] = fetchMock.mock.calls[0]
    const payload = JSON.parse(init.body)
    const serialized = JSON.stringify(payload)
    expect(serialized).toContain('Billing failed')
    expect(serialized).toContain('ws_1')
    expect(serialized).toContain('[REDACTED]')
    expect(serialized).not.toContain('very-secret')
    expect(serialized).not.toContain('Bearer token')
  })

  it('swallows Discord transport errors', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DISCORD_WEBHOOK_URL', 'https://discord.example/webhook')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      sendOpsAlert({
        level: 'critical',
        title: 'Webhook failed',
        message: 'External webhook failed',
        source: 'webhook',
      }),
    ).resolves.toBeUndefined()
  })
})
