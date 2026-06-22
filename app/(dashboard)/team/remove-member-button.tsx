'use client'

import { useTransition } from 'react'
import { removeMember } from '@/lib/actions/team'

interface Props {
  memberId: string
  memberName: string
  memberEmail: string
}

export function RemoveMemberButton({ memberId, memberName, memberEmail }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`${memberName}(${memberEmail})을(를) 팀에서 제거하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    startTransition(() => { removeMember(memberId) })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {isPending ? '처리 중...' : '제거'}
    </button>
  )
}
