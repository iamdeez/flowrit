import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { AcceptInviteForm } from './accept-forms'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  })

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const isExpired =
    invite &&
    invite.status === 'PENDING' &&
    now - invite.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000

  if (!invite) {
    notFound()
  }

  const isInvalid = invite.status !== 'PENDING' || isExpired
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--flowrit-panel-subtle)]">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Image src="/FLOWRIT_icon_logo.svg" alt="Flowrit 아이콘" width={36} height={36} />
          <Image src="/FLOWRIT_text_logo.svg" alt="Flowrit" width={120} height={20} />
        </div>

        <div className="flowrit-panel-padded p-8">
          {isInvalid ? (
            <div className="text-center">
              <p className="text-gray-700 font-medium mb-2">초대 링크가 유효하지 않습니다</p>
              <p className="text-sm text-gray-500">
                {invite.status === 'ACCEPTED'
                  ? '이미 수락된 초대입니다.'
                  : isExpired
                  ? '초대 유효 기간(7일)이 만료되었습니다.'
                  : '취소된 초대입니다.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">팀 초대</h2>
                <p className="text-sm text-gray-500">
                  <strong className="text-gray-700">{invite.workspace.name}</strong> 워크스페이스에
                  초대되었습니다.
                </p>
              </div>

              <AcceptInviteForm
                token={token}
                email={invite.email}
                isNewUser={!existingUser}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
