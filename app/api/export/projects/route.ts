import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentStage, isProjectDone } from '@/lib/project-utils'
import { formatKRW } from '@/lib/utils/analytics'
import { CSV_BOM, toCSV } from '@/lib/utils/csv'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = session.user.workspaceId
  if (!workspaceId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? undefined
  const q = url.searchParams.get('q') ?? url.searchParams.get('search') ?? undefined
  const archived = url.searchParams.get('archived')
  const search = q?.trim()

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
  })
  const memberNames = new Map(
    members.map((member) => [member.userId, member.user.name || member.user.email])
  )

  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: archived === 'true' ? { not: null } : null,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      customer: true,
      stages: { orderBy: { order: 'asc' } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  const filtered = projects.filter((project) => {
    if (status === 'done') return isProjectDone(project)
    if (status === 'in_progress') return !isProjectDone(project)
    return true
  })

  const csv = toCSV(
    ['프로젝트명', '고객명', '현재 단계', '마감일', '담당자', '예산', '완료 여부', '생성일'],
    filtered.map((project) => {
      const currentStage = getCurrentStage(project)
      return [
        project.title,
        project.customer.name,
        currentStage?.internalName ?? '대기',
        project.dueDate?.toLocaleDateString('ko-KR') ?? '',
        project.assigneeId ? memberNames.get(project.assigneeId) ?? '미지정' : '미지정',
        project.budget ? formatKRW(project.budget) : '',
        isProjectDone(project) ? '완료' : '진행 중',
        project.createdAt.toLocaleDateString('ko-KR'),
      ]
    })
  )

  return new Response(CSV_BOM + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="projects.csv"',
    },
  })
}
