'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useRef } from 'react'
import { Search, X } from 'lucide-react'

const STATUS_TABS = [
  { label: '전체', status: undefined as string | undefined, archived: false },
  { label: '진행 중', status: 'in_progress', archived: false },
  { label: '완료', status: 'done', archived: false },
  { label: '아카이브', status: undefined as string | undefined, archived: true },
]

type Member = { userId: string; user: { name: string | null } }

export function ProjectsFilter({ isAdmin, members }: { isAdmin: boolean; members: Member[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  const currentStatus = searchParams.get('status') ?? undefined
  const currentQ = searchParams.get('q') ?? ''
  const currentArchived = searchParams.get('archived') === 'true'
  const currentAssigneeId = searchParams.get('assigneeId') ?? ''

  function push(params: URLSearchParams) {
    startTransition(() => router.push(`/projects?${params}`))
  }

  function setStatus(tab: (typeof STATUS_TABS)[number]) {
    const params = new URLSearchParams()
    if (currentQ) params.set('q', currentQ)
    if (currentAssigneeId && isAdmin) params.set('assigneeId', currentAssigneeId)
    if (tab.archived) params.set('archived', 'true')
    else if (tab.status) params.set('status', tab.status)
    push(params)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchRef.current?.value.trim() ?? ''
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (q) params.set('q', q)
    else params.delete('q')
    push(params)
  }

  function clearSearch() {
    if (searchRef.current) searchRef.current.value = ''
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('page')
    push(params)
  }

  function handleAssignee(assigneeId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (assigneeId) params.set('assigneeId', assigneeId)
    else params.delete('assigneeId')
    push(params)
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity duration-100 ${
        isPending ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      {/* Segmented status control */}
      <div className="flex items-center gap-0.5 rounded-xl border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] p-1">
        {STATUS_TABS.map((tab) => {
          const active = tab.archived
            ? currentArchived
            : !currentArchived && currentStatus === tab.status
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setStatus(tab)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-[var(--flowrit-text)] shadow-sm'
                  : 'text-[var(--flowrit-text-muted)] hover:text-[var(--flowrit-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          key={currentQ}
          ref={searchRef}
          defaultValue={currentQ}
          placeholder="프로젝트 또는 고객명 검색"
          className="flowrit-input w-full pl-9 pr-8"
        />
        {currentQ && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Assignee */}
      {isAdmin && members.length > 0 && (
        <select
          value={currentAssigneeId}
          onChange={(e) => handleAssignee(e.target.value)}
          className="flowrit-input min-w-28 flex-none appearance-none"
          style={{ width: 'auto' }}
        >
          <option value="">전체 담당자</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.name ?? m.userId}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
