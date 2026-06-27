import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfileForm } from './profile-form'
import { PasswordForm } from './password-form'
import { WorkspaceForm } from './workspace-form'
import { NotificationForm } from './notification-form'
import { DangerZone } from './danger-zone'
import { IntakeLinkCopy } from './intake-link-copy'
import { WebhookInfo } from './webhook-info'
import { OrderFormBuilder } from './order-form-builder'
import { BillingTab } from './billing-tab'
import { TabNav } from '@/components/ui/tab-nav'
import { getOrInitOrderFormFields } from '@/lib/actions/form-fields'

const TABS = [
  { key: 'profile', label: '프로필' },
  { key: 'password', label: '비밀번호' },
  { key: 'workspace', label: '워크스페이스' },
  { key: 'orderform', label: '주문서 폼' },
  { key: 'billing', label: '결제' },
  { key: 'notifications', label: '알림' },
  { key: 'danger', label: '위험 구역' },
] as const

type Tab = (typeof TABS)[number]['key']

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; billingError?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.workspaceId) redirect('/login')

  const { tab: rawTab, billingError } = await searchParams
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
      select: { id: true, name: true, slug: true, plan: true },
    }),
  ])

  if (!user || !member || !workspace) redirect('/login')

  const isOwner = member.role === 'OWNER'

  const [orderFormFields, billingData] = await Promise.all([
    (tab === 'orderform' && isOwner)
      ? getOrInitOrderFormFields(session.user.workspaceId)
      : Promise.resolve([]),
    tab === 'billing'
      ? prisma.subscription.findUnique({
          where: { workspaceId: session.user.workspaceId },
          select: {
            plan: true,
            billingCycle: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            billingKey: true,
            cardName: true,
            cardNum: true,
            payments: {
              select: { amount: true, status: true, method: true, paidAt: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        })
      : Promise.resolve(null),
  ])

  return (
    <div className="flowrit-page max-w-3xl">
      <div className="flowrit-page-header">
        <div>
          <h1 className="flowrit-page-title">설정</h1>
          <p className="flowrit-page-description">계정, 워크스페이스, 주문서, 결제 설정을 관리합니다.</p>
        </div>
      </div>

      {billingError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          결제 오류: {billingError}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <TabNav
        className="mb-8"
        activeKey={tab}
        items={TABS.filter((t) => (t.key !== 'workspace' && t.key !== 'orderform') || isOwner).map((t) => ({
          key: t.key,
          label: t.label,
          href: `/settings?tab=${t.key}`,
          danger: t.key === 'danger',
        }))}
      />

      {/* 탭 콘텐츠 */}
      {tab === 'profile' && (
        <ProfileForm initialName={user.name} initialEmail={user.email} />
      )}
      {tab === 'password' && <PasswordForm />}
      {tab === 'workspace' && isOwner && (
        <div className="space-y-8">
          <WorkspaceForm initialName={workspace.name} initialSlug={workspace.slug} />
          <div className="border-t border-[var(--flowrit-border)] pt-8">
            <IntakeLinkCopy slug={workspace.slug} />
          </div>
          <div className="border-t border-[var(--flowrit-border)] pt-8">
            <WebhookInfo slug={workspace.slug} />
          </div>
        </div>
      )}
      {tab === 'orderform' && isOwner && (
        <OrderFormBuilder fields={orderFormFields} />
      )}
      {tab === 'billing' && (
        <BillingTab
          isOwner={isOwner}
          workspacePlan={workspace.plan as string}
          subscription={billingData}
        />
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
