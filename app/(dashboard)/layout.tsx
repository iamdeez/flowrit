import { SidebarNav } from '@/components/sidebar-nav'
import { NotificationBell } from '@/components/notification-bell'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const unreadCount = session?.user?.id
    ? await prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      })
    : 0

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <p className="text-lg font-bold text-indigo-600">Flowrit</p>
          <p className="text-xs text-gray-400 mt-0.5">나의 작업실</p>
        </div>
        <SidebarNav />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-end border-b border-gray-200 bg-gray-50/95 px-8 backdrop-blur">
          {session?.user?.id && (
            <NotificationBell
              userId={session.user.id}
              initialUnreadCount={unreadCount}
            />
          )}
        </div>
        {children}
      </main>
    </div>
  )
}
