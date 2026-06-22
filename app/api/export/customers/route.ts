import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CSV_BOM, toCSV } from '@/lib/utils/csv'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = session.user.workspaceId
  if (!workspaceId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const csv = toCSV(
    ['이름', '연락처', '메모', '프로젝트 수', '등록일'],
    customers.map((customer) => [
      customer.name,
      customer.contact ?? '',
      customer.memo ?? '',
      String(customer._count.projects),
      customer.createdAt.toLocaleDateString('ko-KR'),
    ])
  )

  return new Response(CSV_BOM + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="customers.csv"',
    },
  })
}
