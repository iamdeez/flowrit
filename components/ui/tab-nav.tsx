import type { ReactNode } from 'react'

export interface TabItem {
  key: string
  label: ReactNode
  /** 링크형 탭 (서버 네비게이션). 없으면 onSelect 버튼형으로 렌더 */
  href?: string
  danger?: boolean
}

/**
 * 공용 탭 네비게이션.
 * - 링크형(`href`)과 버튼형(`onSelect`)을 모두 지원
 * - active 상태는 flowrit 토큰(인디고)으로 통일
 */
export function TabNav({
  items,
  activeKey,
  onSelect,
  className,
}: {
  items: TabItem[]
  activeKey: string
  onSelect?: (key: string) => void
  className?: string
}) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto border-b border-[var(--flowrit-border)] [&::-webkit-scrollbar]:hidden ${className ?? ''}`}
    >
      {items.map((t) => {
        const active = t.key === activeKey
        const cls = [
          'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 -mb-px px-4 py-2 text-sm font-medium transition-colors',
          active
            ? 'border-[var(--flowrit-primary)] text-[var(--flowrit-primary)]'
            : 'border-transparent text-[var(--flowrit-text-muted)] hover:text-[var(--flowrit-text-secondary)]',
          t.danger && !active ? 'text-[var(--flowrit-danger)] hover:text-[var(--flowrit-danger-hover)]' : '',
        ].join(' ')

        return t.href ? (
          <a key={t.key} href={t.href} className={cls}>
            {t.label}
          </a>
        ) : (
          <button key={t.key} type="button" onClick={() => onSelect?.(t.key)} className={cls}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
