import Form from 'next/form'
import Link from 'next/link'
import { ChevronRight, Download, Plus, Search, UserRound } from 'lucide-react'
import { getCustomers } from '@/lib/actions/customer'

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string
  }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const query = (await searchParams).q ?? ''
  const customers = await getCustomers(query)

  return (
    <div className="flowrit-page">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--flowrit-text)] md:text-2xl">고객</h1>
          <p className="mt-1 line-clamp-1 text-sm text-[var(--flowrit-text-muted)]">
            고객 정보를 등록하고 이름으로 빠르게 찾습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export/customers"
            download
            className="flowrit-button-secondary inline-flex min-h-9"
          >
            <Download className="h-4 w-4" />
            CSV 내보내기
          </a>
          <Link href="/customers/new" className="flowrit-button-primary min-h-9">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">고객 등록</span>
            <span className="md:hidden">등록</span>
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <Form action="/customers" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--flowrit-text-muted)]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="고객 이름 검색"
              className="flowrit-input pl-9"
            />
          </div>
          <button type="submit" className="flowrit-button-secondary min-h-9">
            검색
          </button>
        </Form>
      </div>

      {customers.length > 0 ? (
        <section className="flowrit-panel overflow-hidden">
          {/* Desktop table — hidden on mobile */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1.5fr_1fr_120px_120px] border-b border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-5 py-3 text-xs font-medium uppercase tracking-wide text-[var(--flowrit-text-muted)]">
              <span>고객</span>
              <span>연락처</span>
              <span>프로젝트</span>
              <span>등록일</span>
            </div>
            <div className="divide-y divide-[var(--flowrit-border)]">
              {customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="grid grid-cols-[1.5fr_1fr_120px_120px] items-center px-5 py-4 transition-colors hover:bg-[var(--flowrit-panel-subtle)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--flowrit-primary-soft)] text-[var(--flowrit-primary-soft-text)]">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--flowrit-text)]">{customer.name}</p>
                      {customer.memo && (
                        <p className="mt-0.5 truncate text-xs text-[var(--flowrit-text-muted)]">{customer.memo}</p>
                      )}
                    </div>
                  </div>
                  <span className="truncate text-sm text-[var(--flowrit-text-secondary)]">
                    {customer.contact || '미입력'}
                  </span>
                  <span className="text-sm text-[var(--flowrit-text-secondary)]">
                    {customer._count.projects}개
                  </span>
                  <span className="text-sm text-[var(--flowrit-text-muted)]">
                    {customer.createdAt.toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile card list — hidden on desktop */}
          <div className="divide-y divide-[var(--flowrit-border)] md:hidden">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="flex items-center gap-3 px-4 py-4 transition-colors active:bg-[var(--flowrit-panel-subtle)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--flowrit-primary-soft)] text-sm font-semibold text-[var(--flowrit-primary-soft-text)]">
                  {customer.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--flowrit-text)]">{customer.name}</p>
                  <p className="mt-0.5 text-sm text-[var(--flowrit-text-muted)]">
                    {customer.contact || '연락처 없음'} · 프로젝트 {customer._count.projects}개
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--flowrit-text-muted)]" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="flowrit-empty-state">
          <div className="flowrit-empty-icon">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="flowrit-empty-title">
            {query ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
          </p>
          <p className="flowrit-empty-description">
            {query
              ? '다른 이름으로 검색해 보세요.'
              : '첫 고객을 등록하고 프로젝트 흐름을 시작하세요.'}
          </p>
          {!query && (
            <div className="flowrit-empty-actions">
              <Link href="/customers/new" className="flowrit-button-primary min-h-9">
                <Plus className="h-4 w-4" aria-hidden="true" />
                고객 등록
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
