'use client'

import { useTransition } from 'react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { removeMember } from '@/lib/actions/team'

interface Props {
  memberId: string
  memberName: string
  memberEmail: string
}

export function RemoveMemberButton({ memberId, memberName, memberEmail }: Props) {
  const [isPending, startTransition] = useTransition()
  const confirm = useConfirm()

  async function handleClick() {
    const ok = await confirm({
      title: '팀원 제거',
      description: `${memberName}(${memberEmail})을(를) 팀에서 제거하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '제거',
      danger: true,
    })
    if (!ok) return
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
