import { getTeamData } from '@/lib/actions/team'
import { InviteForm } from './invite-form'
import { CancelInviteButton } from './cancel-invite-button'
import { RoleChangeSelect } from './role-change-select'
import { RemoveMemberButton } from './remove-member-button'
import { TransferOwnershipButton } from './transfer-ownership-button'
import type { WorkspaceRole } from '@/lib/types'

const roleLabel: Record<WorkspaceRole, string> = {
  OWNER: '오너',
  ADMIN: '어드민',
  MEMBER: '멤버',
}

const roleBadgeClass: Record<WorkspaceRole, string> = {
  OWNER: 'bg-indigo-50 text-indigo-700',
  ADMIN: 'bg-blue-50 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
}

export default async function TeamPage() {
  const { members, invites, currentMember } = await getTeamData()
  const myRole = (currentMember?.role as WorkspaceRole) ?? 'MEMBER'
  const myId = currentMember?.userId ?? ''

  const canManage = myRole === 'OWNER' || myRole === 'ADMIN'

  return (
    <div className="flowrit-page max-w-2xl">
      <div className="flowrit-page-header">
        <div>
          <h1 className="flowrit-page-title">팀</h1>
          <p className="flowrit-page-description">워크스페이스 팀원을 관리하고 새 팀원을 초대합니다.</p>
        </div>
      </div>

      {/* 팀원 목록 */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 ({members.length}명)</h2>
        <div className="flowrit-panel divide-y divide-gray-100">
          {members.map((m) => {
            const memberRole = m.role as WorkspaceRole
            const isSelf = m.userId === myId
            const isTargetOwner = memberRole === 'OWNER'

            const canChangeRole = myRole === 'OWNER' && !isSelf && !isTargetOwner
            const canRemove =
              canManage &&
              !isSelf &&
              !isTargetOwner &&
              !(myRole === 'ADMIN' && memberRole === 'ADMIN')
            const canTransfer = myRole === 'OWNER' && !isSelf && !isTargetOwner

            return (
              <div key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.user.name}
                    {isSelf && <span className="ml-1 text-xs text-gray-400">(나)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{m.user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canChangeRole ? (
                    <RoleChangeSelect memberId={m.id} currentRole={memberRole} />
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass[memberRole]}`}>
                      {roleLabel[memberRole]}
                    </span>
                  )}
                  {canTransfer && (
                    <TransferOwnershipButton
                      memberId={m.id}
                      memberName={m.user.name}
                      memberEmail={m.user.email}
                    />
                  )}
                  {canRemove && (
                    <RemoveMemberButton
                      memberId={m.id}
                      memberName={m.user.name}
                      memberEmail={m.user.email}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 대기 중인 초대 */}
      {invites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            초대 대기 중 ({invites.length})
          </h2>
          <div className="flowrit-panel divide-y divide-gray-100">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <p className="min-w-0 truncate text-sm text-gray-700">{invite.email}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="flowrit-badge flowrit-badge-pending">
                    초대 대기
                  </span>
                  {canManage && <CancelInviteButton inviteId={invite.id} email={invite.email} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 초대 폼 — OWNER/ADMIN만 표시 */}
      {canManage && (
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 초대</h2>
          <div className="flowrit-panel-padded">
            <InviteForm />
          </div>
        </section>
      )}
    </div>
  )
}
