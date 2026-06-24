'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/projects': '프로젝트',
  '/revisions': '수정 요청',
  '/customers': '고객',
  '/messages': '메시지',
  '/analytics': '성과 분석',
  '/team': '팀',
  '/settings': '설정',
  '/billing': '빌링',
  '/notifications': '알림',
}

export function MobilePageTitle() {
  const pathname = usePathname()
  const title =
    PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(`${key}/`))?.[1] ??
    'Flowrit'

  return (
    <span className="text-[15px] font-semibold text-[var(--flowrit-text)]">
      {title}
    </span>
  )
}
