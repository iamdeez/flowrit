import Link from 'next/link'
import { ClipboardList, ExternalLink, Inbox } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ConvertDialog } from '../dashboard/convert-dialog'
import { DismissInquiryButton } from './dismiss-button'
import { CopyLinkButton } from './copy-link-button'

type OrdersPageProps = {
  searchParams: Promise<{ tab?: string; status?: string }>
}

const TAB_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'inquiry', label: '일반 문의' },
  { key: 'order', label: '주문서' },
] as const

type TabKey = (typeof TAB_OPTIONS)[number]['key']

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await auth()
  if (!session?.user?.workspaceId) redirect('/login')
  const workspaceId = session.user.workspaceId

  const { tab: rawTab, status: rawStatus } = await searchParams
  const tab: TabKey = TAB_OPTIONS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'all'
  const statusFilter = rawStatus === 'converted' ? 'CONVERTED' : 'PENDING'

  const formTypeFilter =
    tab === 'inquiry' ? { formType: 'INQUIRY' }
    : tab === 'order' ? { formType: 'ORDER' }
    : {}

  const [inquiries, customers, templates, workspace] = await Promise.all([
    prisma.inquiry.findMany({
      where: { workspaceId, status: statusFilter, ...formTypeFilter },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } }),
    prisma.workflowTemplate.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } }),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const orderFormUrl = workspace ? `${appUrl}/order/${workspace.slug}` : null
  const intakeFormUrl = workspace ? `${appUrl}/intake/${workspace.slug}` : null

  function tabHref(t: string) {
    const p = new URLSearchParams()
    if (t !== 'all') p.set('tab', t)
    if (rawStatus) p.set('status', rawStatus)
    return `/orders${p.size ? `?${p}` : ''}`
  }

  function statusHref(s: string) {
    const p = new URLSearchParams()
    if (tab !== 'all') p.set('tab', tab)
    if (s !== 'pending') p.set('status', s)
    return `/orders${p.size ? `?${p}` : ''}`
  }

  return (
    <div className="flowrit-page">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--flowrit-text)] md:text-2xl">주문서 관리</h1>
          <p className="mt-0.5 hidden text-sm text-[var(--flowrit-text-muted)] md:block">
            고객 문의·주문서를 확인하고 프로젝트로 전환합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orderFormUrl && (
            <a
              href={orderFormUrl}
              target="_blank"
              rel="noreferrer"
              className="flowrit-button-secondary hidden md:inline-flex"
            >
              <ExternalLink className="h-4 w-4" />
              주문서 열기
            </a>
          )}
          {orderFormUrl && <CopyLinkButton url={orderFormUrl} label="주문서 링크" />}
        </div>
      </div>

      {/* 폼 링크 안내 */}
      {(orderFormUrl || intakeFormUrl) && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {intakeFormUrl && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--flowrit-border)] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--flowrit-text-secondary)]">일반 문의 폼</p>
                <p className="mt-0.5 truncate text-xs text-[var(--flowrit-text-muted)]">{intakeFormUrl}</p>
              </div>
              <a href={intakeFormUrl} target="_blank" rel="noreferrer"
                className="shrink-0 text-[var(--flowrit-text-muted)] hover:text-[var(--flowrit-primary)]">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
          {orderFormUrl && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--flowrit-border)] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--flowrit-text-secondary)]">주문서 폼</p>
                <p className="mt-0.5 truncate text-xs text-[var(--flowrit-text-muted)]">{orderFormUrl}</p>
              </div>
              <a href={orderFormUrl} target="_blank" rel="noreferrer"
                className="shrink-0 text-[var(--flowrit-text-muted)] hover:text-[var(--flowrit-primary)]">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* 탭 + 상태 필터 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-[var(--flowrit-border)]">
          {TAB_OPTIONS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-[var(--flowrit-primary)] text-[var(--flowrit-primary)]'
                  : 'border-transparent text-[var(--flowrit-text-muted)] hover:text-[var(--flowrit-text-secondary)]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {(['pending', 'converted'] as const).map((s) => (
            <Link
              key={s}
              href={statusHref(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                (s === 'pending' ? statusFilter === 'PENDING' : statusFilter === 'CONVERTED')
                  ? 'bg-[var(--flowrit-primary-soft)] text-[var(--flowrit-primary-soft-text)]'
                  : 'text-[var(--flowrit-text-muted)] hover:bg-[var(--flowrit-panel-subtle)]'
              }`}
            >
              {s === 'pending' ? '대기 중' : '전환 완료'}
            </Link>
          ))}
        </div>
      </div>

      {/* 건수 */}
      <p className="mb-3 text-xs text-[var(--flowrit-text-muted)]">
        <span className="font-medium text-[var(--flowrit-text-secondary)]">{inquiries.length}</span>건
      </p>

      {/* 목록 */}
      {inquiries.length === 0 ? (
        <div className="flowrit-panel px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            {tab === 'order' ? <ClipboardList className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
          </div>
          <p className="text-sm font-medium text-gray-900">
            {statusFilter === 'CONVERTED' ? '전환 완료된 건이 없습니다.' : '접수된 건이 없습니다.'}
          </p>
          {statusFilter === 'PENDING' && (
            <p className="mt-1 text-sm text-gray-500">
              {tab === 'order'
                ? '주문서 링크를 공유하면 접수된 주문서가 여기에 표시됩니다.'
                : '의뢰 링크를 공유하면 접수된 문의가 여기에 표시됩니다.'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="flowrit-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      inquiry.formType === 'ORDER'
                        ? 'bg-violet-50 text-violet-700'
                        : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {inquiry.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--flowrit-text)]">
                        {inquiry.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          inquiry.formType === 'ORDER'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {inquiry.formType === 'ORDER' ? '주문서' : '문의'}
                      </span>
                    </div>
                    {inquiry.contact && (
                      <p className="text-xs text-[var(--flowrit-text-muted)]">{inquiry.contact}</p>
                    )}
                  </div>
                </div>
                <time className="shrink-0 text-xs text-[var(--flowrit-text-muted)]">
                  {inquiry.createdAt.toLocaleDateString('ko-KR')}
                </time>
              </div>

              <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-[var(--flowrit-text-secondary)]">
                {inquiry.content}
              </p>

              {inquiry.status === 'PENDING' && (
                <div className="mt-3 flex justify-end gap-2">
                  <DismissInquiryButton inquiryId={inquiry.id} />
                  <ConvertDialog inquiry={inquiry} customers={customers} templates={templates} />
                </div>
              )}
              {inquiry.status === 'CONVERTED' && (
                <div className="mt-3 flex justify-end">
                  {inquiry.projectId ? (
                    <Link
                      href={`/projects/${inquiry.projectId}`}
                      className="text-xs font-medium text-[var(--flowrit-primary)] hover:underline"
                    >
                      프로젝트 보기 →
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--flowrit-text-muted)]">전환 완료</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
