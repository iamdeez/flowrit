'use client'

import { useTransition } from 'react'
import { changeMemberRole } from '@/lib/actions/team'
import type { WorkspaceRole } from '@/lib/types'

interface Props {
  memberId: string
  currentRole: WorkspaceRole
}

export function RoleChangeSelect({ memberId, currentRole }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      defaultValue={currentRole}
      disabled={isPending}
      onChange={(e) => {
        const newRole = e.target.value as WorkspaceRole
        startTransition(() => { changeMemberRole(memberId, newRole) })
      }}
      className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      <option value="ADMIN">어드민</option>
      <option value="MEMBER">멤버</option>
    </select>
  )
}
