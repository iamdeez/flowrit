import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendNewInquiryEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

// 외부 플랫폼 소스 레이블
const SOURCE_LABELS: Record<string, string> = {
  instagram: '인스타그램 DM',
  kakao: '카카오톡 채널',
  naver: '네이버 톡톡',
  zapier: 'Zapier',
  make: 'Make',
  custom: '외부 연동',
}

type WebhookBody = {
  name?: unknown
  contact?: unknown
  content?: unknown
  source?: unknown
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  // 1. WEBHOOK_SECRET 설정 여부 확인
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.' },
      { status: 503 }
    )
  }

  // 2. Bearer 토큰 인증
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // 3. 요청 본문 파싱
  let body: WebhookBody
  try {
    body = (await request.json()) as WebhookBody
  } catch {
    return NextResponse.json({ ok: false, error: '유효하지 않은 JSON입니다.' }, { status: 400 })
  }

  // 4. 필수 필드 검증
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim() : null
  const sourceRaw = typeof body.source === 'string' ? body.source.toLowerCase() : null

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name 필드가 필요합니다.' }, { status: 422 })
  }
  if (!content) {
    return NextResponse.json({ ok: false, error: 'content 필드가 필요합니다.' }, { status: 422 })
  }

  // 5. 워크스페이스 조회
  const { workspaceSlug } = await params
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } })
  if (!workspace) {
    return NextResponse.json({ ok: false, error: '존재하지 않는 워크스페이스입니다.' }, { status: 404 })
  }

  // 6. 소스 레이블을 content 상단에 추가
  const sourceLabel = sourceRaw ? (SOURCE_LABELS[sourceRaw] ?? sourceRaw) : null
  const finalContent = sourceLabel ? `[${sourceLabel}]\n${content}` : content

  // 7. Inquiry 생성
  const inquiry = await prisma.inquiry.create({
    data: {
      workspaceId: workspace.id,
      name,
      contact: contact || null,
      content: finalContent,
      fileUrls: [],
    },
  })

  // 8. 담당자 알림 발송
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { userId: true },
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const excerpt = finalContent.length > 120 ? `${finalContent.slice(0, 120)}...` : finalContent

    await sendNotification({
      userIds: members.map((m) => m.userId),
      workspaceId: workspace.id,
      type: 'NEW_INQUIRY',
      title: `새 의뢰 접수${sourceLabel ? ` (${sourceLabel})` : ''}`,
      body: `${name}: ${excerpt}`,
      href: '/dashboard',
      emailFn: (to) =>
        sendNewInquiryEmail(to, {
          submitterName: name,
          contact: contact || '',
          excerpt,
          dashboardUrl: `${appUrl}/dashboard`,
        }),
    })
  } catch (error) {
    console.error('[webhook] notification failed', { inquiryId: inquiry.id, error })
  }

  return NextResponse.json({ ok: true, inquiryId: inquiry.id }, { status: 201 })
}
