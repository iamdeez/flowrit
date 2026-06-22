import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfileForm } from './profile-form'
import { PasswordForm } from './password-form'
import { WorkspaceForm } from './workspace-form'
import { NotificationForm } from './notification-form'
import { DangerZone } from './danger-zone'

const TABS = [
  { key: 'profile', label: '프로필' },
  { key: 'password', label: '비밀번호' },
  { key: 'workspace', label: '워크스페이스' },
  { key: 'notifications', label: '알림' },
  { key: 'danger', label: '위험 구역' },
] as const

type Tab = (typeof TABS)[number]['key']

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.workspaceId) redirect('/login')

  const { tab: rawTab } = await searchParams
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : 'profile'

  const [user, member, workspace] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, notificationSettings: true },
    }),
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: session.user.workspaceId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    }),
    prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!user || !member || !workspace) redirect('/login')

  const isOwner = member.role === 'OWNER'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">계정 및 워크스페이스 설정을 관리합니다.</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        {TABS.filter((t) => t.key !== 'workspace' || isOwner).map((t) => (
          <a
            key={t.key}
            href={`/settings?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } ${t.key === 'danger' ? 'text-red-500 hover:text-red-600' : ''}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'profile' && (
        <ProfileForm initialName={user.name} initialEmail={user.email} />
      )}
      {tab === 'password' && <PasswordForm />}
      {tab === 'workspace' && isOwner && (
        <WorkspaceForm initialName={workspace.name} initialSlug={workspace.slug} />
      )}
      {tab === 'notifications' && (
        <NotificationForm
          settings={user.notificationSettings as Record<string, boolean>}
        />
      )}
      {tab === 'danger' && (
        <DangerZone isOwner={isOwner} workspaceName={workspace.name} />
      )}
    </div>
  )
}
