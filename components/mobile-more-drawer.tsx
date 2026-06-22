'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, MessageSquare, UserPlus, Settings, LogOut } from 'lucide-react'
import { logout } from '@/lib/actions/auth'

const moreItems = [
  { href: '/templates', label: '템플릿', icon: Layers },
  { href: '/messages', label: '메시지', icon: MessageSquare },
  { href: '/team', label: '팀', icon: UserPlus },
  { href: '/settings', label: '설정', icon: Settings },
]

type Props = {
  open: boolean
  onClose: () => void
  userName: string
  userInitials: string
}

export function MobileMoreDrawer({ open, onClose, userName, userInitials }: Props) {
  const pathname = usePathname()

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="더보기 메뉴"
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Nav items */}
        <nav className="px-3 py-2">
          {moreItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--flowrit-primary-soft)] text-[var(--flowrit-primary-soft-text)]'
                    : 'text-[var(--flowrit-text-secondary)] active:bg-gray-100'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? 'text-[var(--flowrit-primary)]' : 'text-[var(--flowrit-text-muted)]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="mx-3 mb-3 mt-1 flex items-center gap-3 rounded-xl border border-[var(--flowrit-border)] px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--flowrit-primary-soft)] text-xs font-semibold text-[var(--flowrit-primary-soft-text)]">
            {userInitials}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--flowrit-text)]">
            {userName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--flowrit-text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
