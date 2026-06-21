import Form from 'next/form'
import Link from 'next/link'
import { Plus, Search, UserRound } from 'lucide-react'
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
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">고객</h1>
          <p className="mt-1 text-sm text-gray-500">
            고객 정보를 등록하고 이름으로 빠르게 찾습니다.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          고객 등록
        </Link>
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <Form action="/customers" className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="고객 이름 검색"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            검색
          </button>
        </Form>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[1.5fr_1fr_120px_120px] border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
          <span>고객</span>
          <span>연락처</span>
          <span>프로젝트</span>
          <span>등록일</span>
        </div>

        {customers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="grid grid-cols-[1.5fr_1fr_120px_120px] items-center px-5 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{customer.name}</p>
                    {customer.memo && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{customer.memo}</p>
                    )}
                  </div>
                </div>
                <span className="truncate text-sm text-gray-600">
                  {customer.contact || '미입력'}
                </span>
                <span className="text-sm text-gray-600">
                  {customer._count.projects}개
                </span>
                <span className="text-sm text-gray-500">
                  {customer.createdAt.toLocaleDateString('ko-KR')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <UserRound className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {query ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {query ? '다른 이름으로 검색해 보세요.' : '첫 고객을 등록하고 프로젝트 흐름을 시작하세요.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
