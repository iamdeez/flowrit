import Link from 'next/link'
import { ArrowUpRight, FilePen, FileText, Paperclip } from 'lucide-react'
import { getRevisionGroups } from '@/lib/actions/revision'
import {
  revisionPriorityLabels,
  revisionSourceLabels,
  revisionStatusLabels,
} from '@/lib/revision-labels'
import { RevisionStatusForm } from '@/app/(dashboard)/projects/[id]/revision-status-form'

const priorityLeftBorder: Record<string, string> = {
  HIGH: 'border-l-rose-400',
  MEDIUM: 'border-l-amber-400',
  LOW: 'border-l-[var(--flowrit-border)]',
}

const priorityDot: Record<string, string> = {
  HIGH: 'bg-rose-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-gray-300',
}

const statusBadgeClass: Record<string, string> = {
  OPEN: 'flowrit-badge flowrit-badge-active',
  IN_PROGRESS: 'flowrit-badge bg-amber-50 text-amber-700',
  DONE: 'flowrit-badge flowrit-badge-done',
}

export default async function RevisionsPage() {
  const projects = await getRevisionGroups()
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const totalCount = projects.reduce((sum, p) => sum + p.revisions.length, 0)
  const openCount = projects.reduce(
    (sum, p) => sum + p.revisions.filter((r) => r.status === 'OPEN').length,
    0
  )
  const inProgressCount = projects.reduce(
    (sum, p) => sum + p.revisions.filter((r) => r.status === 'IN_PROGRESS').length,
    0
  )

  return (
    <div className="flowrit-page">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--flowrit-text)] md:text-2xl">수정 요청</h1>
          <p className="mt-1 hidden text-sm text-[var(--flowrit-text-muted)] md:block">
            전체 워크스페이스의 미완료 요청을 프로젝트별로 확인합니다.
          </p>
        </div>
      </div>

      {/* 상태 요약 칩 */}
      {totalCount > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--flowrit-border)] bg-white px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--flowrit-primary)]" />
            <span className="font-semibold text-[var(--flowrit-text)]">{openCount}</span>
            <span className="text-[var(--flowrit-text-muted)]">접수됨</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--flowrit-border)] bg-white px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-[var(--flowrit-text)]">{inProgressCount}</span>
            <span className="text-[var(--flowrit-text-muted)]">진행 중</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--flowrit-border)] bg-white px-3 py-2 text-sm">
            <span className="font-semibold text-[var(--flowrit-text)]">{totalCount}</span>
            <span className="text-[var(--flowrit-text-muted)]">건 전체</span>
          </div>
        </div>
      )}

      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((project) => {
            const urgent =
              project.dueDate != null &&
              project.dueDate.getTime() <= now + 2 * 24 * 60 * 60 * 1000

            return (
              <section key={project.id} className="flowrit-panel overflow-hidden">
                {/* 프로젝트 헤더 */}
                <div className="flex items-center justify-between gap-3 border-b border-[var(--flowrit-border)] px-4 py-3 md:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                      <FilePen className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--flowrit-text)]">
                          {project.title}
                        </p>
                        <span className="shrink-0 rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold leading-none text-rose-600">
                          {project.revisions.length}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--flowrit-text-muted)]">
                        {project.customer.name}
                        {project.dueDate != null && (
                          <span
                            className={
                              urgent
                                ? 'ml-1.5 font-medium text-orange-600'
                                : 'ml-1.5'
                            }
                          >
                            · {project.dueDate.toLocaleDateString('ko-KR')} 마감
                            {urgent && ' ⚠'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/projects/${project.id}?tab=revisions`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--flowrit-text-secondary)] transition-colors hover:bg-[var(--flowrit-panel-subtle)]"
                  >
                    열기
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* 수정 요청 목록 */}
                <div className="divide-y divide-[var(--flowrit-border)]">
                  {project.revisions.map((revision) => (
                    <div
                      key={revision.id}
                      className={`border-l-[3px] px-4 py-4 md:px-5 ${
                        priorityLeftBorder[revision.priority] ?? 'border-l-[var(--flowrit-border)]'
                      }`}
                    >
                      {/* 뱃지 행 */}
                      <div className="mb-2.5 flex flex-wrap items-center gap-2">
                        <span
                          className={
                            statusBadgeClass[revision.status] ??
                            'flowrit-badge flowrit-badge-pending'
                          }
                        >
                          {revisionStatusLabels[revision.status] ?? revision.status}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--flowrit-text-muted)]">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${priorityDot[revision.priority] ?? 'bg-gray-300'}`}
                          />
                          {revisionPriorityLabels[revision.priority] ?? revision.priority} 우선순위
                        </span>
                        {revision.source !== 'MANUAL' && (
                          <span className="text-[11px] text-[var(--flowrit-text-muted)]">
                            · {revisionSourceLabels[revision.source] ?? revision.source}
                          </span>
                        )}
                      </div>

                      {/* 본문 */}
                      <p className="text-sm leading-relaxed text-[var(--flowrit-text)]">
                        {revision.content}
                      </p>

                      {/* 첨부 파일 */}
                      {(revision.fileUrls as string[]).length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {(revision.fileUrls as string[]).map((url, i) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-[var(--flowrit-panel-subtle)] px-2 py-1 text-[11px] text-[var(--flowrit-text-secondary)] transition-colors hover:text-[var(--flowrit-primary)]"
                            >
                              <Paperclip className="h-3 w-3" />
                              {url.split('/').pop() || `첨부 ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* 푸터: 날짜 + 액션 */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] text-[var(--flowrit-text-muted)]">
                          {revision.createdAt.toLocaleDateString('ko-KR')} 등록
                        </p>
                        <RevisionStatusForm
                          revisionId={revision.id}
                          status={revision.status}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="flowrit-empty-state">
          <div className="flowrit-empty-icon">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="flowrit-empty-title">
            처리할 수정 요청이 없습니다.
          </p>
          <p className="flowrit-empty-description">
            프로젝트 상세에서 등록한 미완료 요청이 이곳에 표시됩니다.
          </p>
          <div className="flowrit-empty-actions">
            <Link href="/projects" className="flowrit-button-secondary">
              프로젝트 목록 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
