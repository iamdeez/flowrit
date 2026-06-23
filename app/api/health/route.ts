import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendOpsAlert } from '@/lib/ops-alert'

export const dynamic = 'force-dynamic'

type CheckStatus = 'ok' | 'degraded'

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'NICEPAY_SECRET_KEY',
  'NEXT_PUBLIC_NICEPAY_CLIENT_ID',
  'CRON_SECRET',
]

function getAuthToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length).trim()
  return new URL(request.url).searchParams.get('token')
}

function summarize(status: CheckStatus) {
  return {
    status,
    service: 'flowrit',
    timestamp: new Date().toISOString(),
  }
}

export async function GET(request: Request) {
  const expectedToken = process.env.HEALTHCHECK_TOKEN
  const suppliedToken = getAuthToken(request)
  const detailed = Boolean(expectedToken && suppliedToken === expectedToken)

  if (suppliedToken && !detailed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const missingEnv = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  let databaseStatus: CheckStatus = 'ok'
  let databaseError: string | null = null

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    databaseStatus = 'degraded'
    databaseError = error instanceof Error ? error.message : 'Database check failed'
  }

  const envStatus: CheckStatus = missingEnv.length > 0 ? 'degraded' : 'ok'
  const status: CheckStatus = databaseStatus === 'ok' && envStatus === 'ok' ? 'ok' : 'degraded'

  if (detailed && status === 'degraded') {
    await sendOpsAlert({
      level: 'critical',
      title: 'Health check degraded',
      message: 'Flowrit health check가 degraded 상태를 반환했습니다.',
      source: 'health',
      context: {
        databaseStatus,
        databaseError,
        missingEnv,
      },
    })
  }

  const httpStatus = status === 'ok' ? 200 : 503
  if (!detailed) {
    return NextResponse.json(summarize(status), { status: httpStatus })
  }

  return NextResponse.json(
    {
      ...summarize(status),
      checks: {
        app: { status: 'ok' },
        database: {
          status: databaseStatus,
          error: databaseError,
        },
        env: {
          status: envStatus,
          missing: missingEnv,
        },
      },
    },
    { status: httpStatus },
  )
}
