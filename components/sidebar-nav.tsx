'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList,
  FilePen,
  FolderOpen,
  LayoutDashboard,
  Layers,
  LogOut,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const coreItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/orders', label: '주문서 관리', icon: ClipboardList },
  { href: '/projects', label: '프로젝트', icon: FolderOpen },
  { href: '/revisions', label: '수정 요청', icon: FilePen },
  { href: '/customers', label: '고객', icon: Users },
]

const workItems: NavItem[] = [
  { href: '/messages', label: '메시지', icon: MessageSquare },
  { href: '/templates', label: '템플릿', icon: Layers },
]

const adminItems: NavItem[] = [
  { href: '/team', label: '팀', icon: UserPlus },
  { href: '/settings', label: '설정', icon: Settings },
]

const MEMBER_ALLOWED = new Set(['/dashboard', '/projects', '/revisions', '/orders'])

type SidebarNavProps = {
  userName: string
  userRole: string
  openRevisionCount?: number
  pendingOrderCount?: number
}

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  pathname,
}: NavItem & { badge?: number; pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[var(--flowrit-primary-soft)] text-[var(--flowrit-primary-soft-text)]'
          : 'text-[var(--flowrit-text-secondary)] hover:bg-[var(--flowrit-panel-subtle)] hover:text-[var(--flowrit-text)]'
      }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${isActive ? 'text-[var(--flowrit-primary)]' : ''}`}
        strokeWidth={isActive ? 2.5 : 2}
      />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 py-px text-[10px] font-bold leading-none text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--flowrit-text-muted)]">
      {children}
    </p>
  )
}

export function SidebarNav({ userName, userRole, openRevisionCount = 0, pendingOrderCount = 0 }: SidebarNavProps) {
  const pathname = usePathname()
  const isAdmin = userRole !== 'MEMBER'
  const initials =
    userName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const visibleCore = isAdmin ? coreItems : coreItems.filter((item) => MEMBER_ALLOWED.has(item.href))

  return (
    <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
      {visibleCore.map((item) => (
        <NavLink
          key={item.href}
          {...item}
          pathname={pathname}
          badge={
            item.href === '/revisions' ? openRevisionCount
            : item.href === '/orders' ? pendingOrderCount
            : undefined
          }
        />
      ))}

      {isAdmin && (
        <>
          <SectionLabel>작업</SectionLabel>
          {workItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}

          <SectionLabel>관리</SectionLabel>
          {adminItems.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </>
      )}

      <div className="mt-auto border-t border-[var(--flowrit-border)] pt-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--flowrit-primary-soft)] text-xs font-semibold text-[var(--flowrit-primary-soft-text)]">
            {initials}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--flowrit-text)]">
            {userName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              title="로그아웃"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--flowrit-text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
