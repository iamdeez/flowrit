import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // TossPayments customerKey = workspaceId
  return NextResponse.json({ customerKey: session.user.workspaceId })
}
