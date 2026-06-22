'use client'

import { useState } from 'react'
import { MobileTabBar } from './mobile-tab-bar'
import { MobileMoreDrawer } from './mobile-more-drawer'

type Props = {
  userRole: string
  userName: string
  userInitials: string
  openRevisionCount: number
}

export function MobileNavWrapper({ userRole, userName, userInitials, openRevisionCount }: Props) {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <MobileTabBar
        userRole={userRole}
        openRevisionCount={openRevisionCount}
        onMoreClick={() => setMoreOpen(true)}
        isMoreOpen={moreOpen}
      />
      <MobileMoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        userName={userName}
        userInitials={userInitials}
      />
    </>
  )
}
