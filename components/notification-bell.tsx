'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Bell, CalendarClock, FilePen, Inbox, Layers } from 'lucide-react'
import {
  getNotifications,
  markNotificationsRead,
} from '@/lib/actions/notifications'

type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number]

type NotificationBellProps = {
  userId: string
  initialUnreadCount: number
}

function formatCount(count: number) {
  if (count > 99) return '99+'
  return String(count)
}

function iconFor(type: string) {
  if (type === 'NEW_INQUIRY') return <Inbox className="h-4 w-4" />
  if (type === 'REVISION_SUBMITTED') return <FilePen className="h-4 w-4" />
  if (type === 'STAGE_CHANGED') return <Layers className="h-4 w-4" />
  if (type === 'DEADLINE_SOON') return <CalendarClock className="h-4 w-4" />
  return <Bell className="h-4 w-4" />
}

export function NotificationBell({
  userId,
  initialUnreadCount,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isPending, startTransition] = useTransition()

  function toggleOpen() {
    const nextOpen = !open
    setOpen(nextOpen)

    if (!nextOpen) return

    startTransition(async () => {
      const items = await getNotifications(userId)
      setNotifications(items)
      if (unreadCount > 0) {
        await markNotificationsRead(userId)
        setUnreadCount(0)
      }
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="알림"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
            {formatCount(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">알림</p>
            <p className="mt-0.5 text-xs text-gray-500">최근 20건의 중요 이벤트</p>
          </div>

          {isPending && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">불러오는 중...</p>
          ) : notifications.length > 0 ? (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    {iconFor(notification.type)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-gray-500">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {notification.createdAt.toLocaleString('ko-KR')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              표시할 알림이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
