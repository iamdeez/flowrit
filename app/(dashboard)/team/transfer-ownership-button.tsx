'use client'

import { useTransition } from 'react'
import { transferOwnership } from '@/lib/actions/team'

interface Props {
  memberId: string
  memberName: string
  memberEmail: string
}

export function TransferOwnershipButton({ memberId, memberName, memberEmail }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`${memberName}(${memberEmail})에게 소유권을 이전하시겠습니까?\n이전 후 귀하의 역할은 어드민으로 변경됩니다.`)) return
    startTransition(() => { transferOwnership(memberId) })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-amber-600 hover:text-amber-800 hover:underline disabled:opacity-50"
    >
      {isPending ? '처리 중...' : '소유권 이전'}
    </button>
  )
}
