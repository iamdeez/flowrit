'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  LayoutDashboard,
  Users,
  FolderOpen,
  FilePen,
  Layers,
  MessageSquare,
  UserPlus,
  Settings,
  LogOut,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/customers', label: '고객', icon: Users },
  { href: '/projects', label: '프로젝트', icon: FolderOpen },
  { href: '/revisions', label: '수정 요청', icon: FilePen },
  { href: '/analytics', label: '통계', icon: BarChart2 },
  { href: '/templates', label: '템플릿', icon: Layers },
  { href: '/messages', label: '메시지', icon: MessageSquare },
  { href: '/team', label: '팀', icon: UserPlus },
  { href: '/settings', label: '설정', icon: Settings },
]

const MEMBER_ALLOWED_PATHS = ['/dashboard', '/projects', '/revisions']

type SidebarNavProps = {
  userName: string
  userRole: string
}

export function SidebarNav({ userName, userRole }: SidebarNavProps) {
  const pathname = usePathname()
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const visibleItems = userRole === 'MEMBER'
    ? navItems.filter(item => MEMBER_ALLOWED_PATHS.includes(item.href))
    : navItems

  return (
    <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
      {visibleItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}

      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
            {initials}
          </div>
          <span className="flex-1 truncate text-sm font-medium text-gray-700">{userName}</span>
          <form action={logout}>
            <button
              type="submit"
              title="로그아웃"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
