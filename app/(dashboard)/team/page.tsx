import { getTeamData } from '@/lib/actions/team'
import { InviteForm } from './invite-form'
import { CancelInviteButton } from './cancel-invite-button'

export default async function TeamPage() {
  const { members, invites } = await getTeamData()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">팀</h1>
        <p className="text-sm text-gray-500 mt-1">워크스페이스 팀원을 관리하고 새 팀원을 초대합니다.</p>
      </div>

      {/* 팀원 목록 */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 ({members.length}명)</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                <p className="text-xs text-gray-500">{m.user.email}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                m.role === 'OWNER'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {m.role === 'OWNER' ? '오너' : '멤버'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 대기 중인 초대 */}
      {invites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            초대 대기 중 ({invites.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-gray-700">{invite.email}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                    초대 대기
                  </span>
                  <CancelInviteButton inviteId={invite.id} email={invite.email} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 초대 폼 */}
      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 초대</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <InviteForm />
        </div>
      </section>
    </div>
  )
}
