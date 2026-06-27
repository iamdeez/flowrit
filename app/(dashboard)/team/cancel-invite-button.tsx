'use client'

import { useTransition } from 'react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { cancelInvite } from '@/lib/actions/team'

export function CancelInviteButton({ inviteId, email }: { inviteId: string; email: string }) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()

  async function handleClick() {
    const ok = await confirm({
      title: '초대 취소',
      description: `${email} 초대를 취소하시겠습니까?`,
      confirmLabel: '초대 취소',
      danger: true,
    })
    if (!ok) return
    startTransition(() => cancelInvite(inviteId))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="whitespace-nowrap text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {pending ? '취소 중...' : '취소'}
    </button>
  )
}
