'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, FilePen, Users, MoreHorizontal } from 'lucide-react'

type Props = {
  userRole: string
  openRevisionCount: number
  onMoreClick: () => void
  isMoreOpen: boolean
}

const primaryTabs = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard, hasBadge: false },
  { href: '/projects', label: '프로젝트', icon: FolderOpen, hasBadge: false },
  { href: '/revisions', label: '수정요청', icon: FilePen, hasBadge: true },
  { href: '/customers', label: '고객', icon: Users, hasBadge: false },
]

const MORE_PATHS = ['/templates', '/messages', '/team', '/settings']
const MEMBER_ALLOWED = ['/dashboard', '/projects', '/revisions']

export function MobileTabBar({ userRole, openRevisionCount, onMoreClick, isMoreOpen }: Props) {
  const pathname = usePathname()
  const isMember = userRole === 'MEMBER'

  const visibleTabs = isMember
    ? primaryTabs.filter((t) => MEMBER_ALLOWED.includes(t.href))
    : primaryTabs

  const isMoreActive =
    isMoreOpen || MORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--flowrit-border)] bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14">
        {visibleTabs.map(({ href, label, icon: Icon, hasBadge }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const badge = hasBadge ? openRevisionCount : 0

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-1"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-b-full bg-[var(--flowrit-primary)]" />
              )}
              <span className="relative">
                <Icon
                  className={`h-[22px] w-[22px] transition-colors ${
                    isActive ? 'text-[var(--flowrit-primary)]' : 'text-[var(--flowrit-text-muted)]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 py-px text-[9px] font-bold leading-none text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] font-medium leading-none tracking-tight ${
                  isActive ? 'text-[var(--flowrit-primary)]' : 'text-[var(--flowrit-text-muted)]'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}

        {!isMember && (
          <button
            type="button"
            onClick={onMoreClick}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-1"
          >
            {isMoreActive && (
              <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-b-full bg-[var(--flowrit-primary)]" />
            )}
            <MoreHorizontal
              className={`h-[22px] w-[22px] transition-colors ${
                isMoreActive ? 'text-[var(--flowrit-primary)]' : 'text-[var(--flowrit-text-muted)]'
              }`}
              strokeWidth={isMoreActive ? 2.5 : 1.75}
            />
            <span
              className={`text-[10px] font-medium leading-none tracking-tight ${
                isMoreActive ? 'text-[var(--flowrit-primary)]' : 'text-[var(--flowrit-text-muted)]'
              }`}
            >
              더보기
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
