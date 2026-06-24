import type { Metadata } from 'next'
import Image from 'next/image'
import { MobilePageTitle } from '@/components/mobile-page-title'
import { MobileNavWrapper } from '@/components/mobile-nav-wrapper'
import { NotificationBell } from '@/components/notification-bell'
import { SidebarNav } from '@/components/sidebar-nav'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userId = session?.user?.id
  const workspaceId = session?.user?.workspaceId

  const [unreadCount, workspace, openRevisionCount, pendingOrderCount] = await Promise.all([
    userId
      ? prisma.notification.count({ where: { userId, isRead: false } })
      : Promise.resolve(0),
    workspaceId
      ? prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } })
      : Promise.resolve(null),
    workspaceId
      ? prisma.revisionRequest.count({
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            project: { workspaceId, archivedAt: null },
          },
        })
      : Promise.resolve(0),
    workspaceId
      ? prisma.inquiry.count({ where: { workspaceId, status: 'PENDING' } })
      : Promise.resolve(0),
  ])

  const userName = session?.user?.name ?? ''
  const userRole = session?.user?.role ?? 'MEMBER'
  const userInitials =
    userName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  return (
    <div className="flex h-svh bg-[var(--flowrit-panel-subtle)]">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-[var(--flowrit-border)] bg-white">
        <div className="border-b border-[var(--flowrit-border)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/FLOWRIT_icon_logo.svg" alt="Flowrit 아이콘" width={32} height={32} className="shrink-0" />
            <div className="min-w-0">
              <Image src="/FLOWRIT_text_logo.svg" alt="Flowrit" width={80} height={13} />
              <p className="mt-0.5 truncate text-xs text-[var(--flowrit-text-muted)]">
                {workspace?.name ?? '나의 작업실'}
              </p>
            </div>
          </div>
        </div>
        <SidebarNav userName={userName} userRole={userRole} openRevisionCount={openRevisionCount} pendingOrderCount={pendingOrderCount} />
      </aside>

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[var(--flowrit-border)] bg-[rgba(248,250,252,0.92)] px-4 backdrop-blur md:px-8">
          {/* Mobile: current page title */}
          <div className="md:hidden">
            <MobilePageTitle />
          </div>
          {/* Desktop: workspace name only */}
          <p className="hidden text-sm font-medium text-[var(--flowrit-text-secondary)] md:block">
            {workspace?.name}
          </p>
          {userId && (
            <NotificationBell userId={userId} initialUnreadCount={unreadCount} />
          )}
        </div>

        {/* Scrollable page content — extra bottom padding on mobile for tab bar */}
        <div className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <div className="md:hidden">
        <MobileNavWrapper
          userRole={userRole}
          userName={userName}
          userInitials={userInitials}
          openRevisionCount={openRevisionCount}
        />
      </div>
    </div>
  )
}
