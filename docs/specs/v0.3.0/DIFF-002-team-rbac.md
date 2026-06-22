# Diff: 002-team-rbac

## 커밋 메시지 한 줄 요약

- **KO**: 팀 RBAC 구현 — ADMIN 역할, 역할 변경·멤버 제거·소유권 이전 + 초대 수락 세션 버그 수정
- **EN**: Implement team RBAC — ADMIN role, role change/remove/transfer + fix invite acceptance session bug

## 변경 요약

`WorkspaceRole` 타입에 ADMIN을 추가하고, `lib/actions/team.ts`에 `getMemberRole` / `requireRole` 헬퍼와 `changeMemberRole`, `removeMember`, `transferOwnership` 신규 Server Action을 구현했다. `inviteTeamMember`·`cancelInvite`에 ADMIN 권한 검증을 추가하고, `getTeamData`에 현재 로그인 사용자의 멤버 정보(`currentMember`)를 포함시켰다.

`lib/auth.ts`에서 `workspaceId` credential을 추가하여 초대 수락 후 로그인 시 올바른 워크스페이스가 세션에 설정되도록 수정했다(`memberships: { take: 1 }` → `orderBy: { createdAt: 'asc' }` + 특정 workspaceId 지정 시 해당 멤버십 선택). `lib/actions/invite.ts`에서 `signIn` 호출 시 `workspaceId`를 전달한다.

팀 페이지 UI에 ADMIN 뱃지(파란색), 역할 변경 드롭다운, 제거 버튼, 소유권 이전 버튼을 추가하고, 초대 폼은 OWNER/ADMIN만 볼 수 있도록 조건부 렌더링했다.

## 변경 파일 및 라인 수

| 파일 | 추가 | 삭제 |
|---|---|---|
| `lib/types.ts` (신규) | +3 | — |
| `lib/actions/team.ts` | +109 | -6 |
| `lib/auth.ts` | +7 | -2 |
| `lib/actions/invite.ts` | +10 | -2 |
| `app/(dashboard)/team/page.tsx` | +59 | -21 |
| `app/(dashboard)/team/role-change-select.tsx` (신규) | +30 | — |
| `app/(dashboard)/team/remove-member-button.tsx` (신규) | +50 | — |
| `app/(dashboard)/team/transfer-ownership-button.tsx` (신규) | +55 | — |
| `app/(dashboard)/team/invite-form.tsx` | +1 | -1 |

## Diff

```diff
diff --git a/app/(dashboard)/team/invite-form.tsx b/app/(dashboard)/team/invite-form.tsx
index be88bf8..37a01e2 100644
--- a/app/(dashboard)/team/invite-form.tsx
+++ b/app/(dashboard)/team/invite-form.tsx
@@ -35,7 +35,7 @@ export function InviteForm() {
             className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
           >
             <option value="MEMBER">멤버</option>
-            <option value="OWNER">오너</option>
+            <option value="ADMIN">어드민</option>
           </select>
         </div>
       </div>
diff --git a/app/(dashboard)/team/page.tsx b/app/(dashboard)/team/page.tsx
index 5640d77..2a2dbb1 100644
--- a/app/(dashboard)/team/page.tsx
+++ b/app/(dashboard)/team/page.tsx
@@ -1,9 +1,29 @@
 import { getTeamData } from '@/lib/actions/team'
 import { InviteForm } from './invite-form'
 import { CancelInviteButton } from './cancel-invite-button'
+import { RoleChangeSelect } from './role-change-select'
+import { RemoveMemberButton } from './remove-member-button'
+import { TransferOwnershipButton } from './transfer-ownership-button'
+import type { WorkspaceRole } from '@/lib/types'
+
+const roleLabel: Record<WorkspaceRole, string> = {
+  OWNER: '오너',
+  ADMIN: '어드민',
+  MEMBER: '멤버',
+}
+
+const roleBadgeClass: Record<WorkspaceRole, string> = {
+  OWNER: 'bg-indigo-50 text-indigo-700',
+  ADMIN: 'bg-blue-50 text-blue-700',
+  MEMBER: 'bg-gray-100 text-gray-600',
+}
 
 export default async function TeamPage() {
-  const { members, invites } = await getTeamData()
+  const { members, invites, currentMember } = await getTeamData()
+  const myRole = (currentMember?.role as WorkspaceRole) ?? 'MEMBER'
+  const myId = currentMember?.userId ?? ''
+
+  const canManage = myRole === 'OWNER' || myRole === 'ADMIN'
 
   return (
     <div className="p-8 max-w-2xl">
@@ -16,21 +36,54 @@ export default async function TeamPage() {
       <section className="mb-8">
         <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 ({members.length}명)</h2>
         <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
-          {members.map((m) => (
-            <div key={m.id} className="flex items-center justify-between px-5 py-4">
-              <div>
-                <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
-                <p className="text-xs text-gray-500">{m.user.email}</p>
+          {members.map((m) => {
+            const memberRole = m.role as WorkspaceRole
+            const isSelf = m.userId === myId
+            const isTargetOwner = memberRole === 'OWNER'
+
+            const canChangeRole = myRole === 'OWNER' && !isSelf && !isTargetOwner
+            const canRemove =
+              canManage &&
+              !isSelf &&
+              !isTargetOwner &&
+              !(myRole === 'ADMIN' && memberRole === 'ADMIN')
+            const canTransfer = myRole === 'OWNER' && !isSelf && !isTargetOwner
+
+            return (
+              <div key={m.id} className="flex items-center justify-between px-5 py-4">
+                <div>
+                  <p className="text-sm font-medium text-gray-900">
+                    {m.user.name}
+                    {isSelf && <span className="ml-1 text-xs text-gray-400">(나)</span>}
+                  </p>
+                  <p className="text-xs text-gray-500">{m.user.email}</p>
+                </div>
+                <div className="flex items-center gap-2">
+                  {canChangeRole ? (
+                    <RoleChangeSelect memberId={m.id} currentRole={memberRole} />
+                  ) : (
+                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass[memberRole]}`}>
+                      {roleLabel[memberRole]}
+                    </span>
+                  )}
+                  {canTransfer && (
+                    <TransferOwnershipButton
+                      memberId={m.id}
+                      memberName={m.user.name}
+                      memberEmail={m.user.email}
+                    />
+                  )}
+                  {canRemove && (
+                    <RemoveMemberButton
+                      memberId={m.id}
+                      memberName={m.user.name}
+                      memberEmail={m.user.email}
+                    />
+                  )}
+                </div>
               </div>
-              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
-                m.role === 'OWNER'
-                  ? 'bg-indigo-50 text-indigo-700'
-                  : 'bg-gray-100 text-gray-600'
-              }`}>
-                {m.role === 'OWNER' ? '오너' : '멤버'}
-              </span>
-            </div>
-          ))}
+            )
+          })}
         </div>
       </section>
 
@@ -48,7 +101,7 @@ export default async function TeamPage() {
                   <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                     초대 대기
                   </span>
-                  <CancelInviteButton inviteId={invite.id} email={invite.email} />
+                  {canManage && <CancelInviteButton inviteId={invite.id} email={invite.email} />}
                 </div>
               </div>
             ))}
@@ -56,13 +109,15 @@ export default async function TeamPage() {
         </section>
       )}
 
-      {/* 초대 폼 */}
-      <section>
-        <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 초대</h2>
-        <div className="bg-white rounded-xl border border-gray-200 p-5">
-          <InviteForm />
-        </div>
-      </section>
+      {/* 초대 폼 — OWNER/ADMIN만 표시 */}
+      {canManage && (
+        <section>
+          <h2 className="text-sm font-medium text-gray-700 mb-3">팀원 초대</h2>
+          <div className="bg-white rounded-xl border border-gray-200 p-5">
+            <InviteForm />
+          </div>
+        </section>
+      )}
     </div>
   )
 }
diff --git a/lib/actions/invite.ts b/lib/actions/invite.ts
index 25cc5bd..d025b2c 100644
--- a/lib/actions/invite.ts
+++ b/lib/actions/invite.ts
@@ -51,7 +51,12 @@ export async function registerAndAcceptInvite(
   })
 
   try {
-    await signIn('credentials', { email: invite.email, password, redirectTo: '/dashboard' })
+    await signIn('credentials', {
+      email: invite.email,
+      password,
+      workspaceId: invite.workspaceId,
+      redirectTo: '/dashboard',
+    })
   } catch (err) {
     if (err instanceof AuthError) {
       return { error: '가입 후 로그인 중 오류가 발생했습니다. 로그인 페이지에서 다시 시도해 주세요.' }
@@ -106,7 +111,12 @@ export async function loginAndAcceptInvite(
   }
 
   try {
-    await signIn('credentials', { email: invite.email, password, redirectTo: '/dashboard' })
+    await signIn('credentials', {
+      email: invite.email,
+      password,
+      workspaceId: invite.workspaceId,
+      redirectTo: '/dashboard',
+    })
   } catch (err) {
     if (err instanceof AuthError) {
       return { error: '로그인 중 오류가 발생했습니다.' }
diff --git a/lib/actions/team.ts b/lib/actions/team.ts
index 3d01453..66dc7b1 100644
--- a/lib/actions/team.ts
+++ b/lib/actions/team.ts
@@ -4,6 +4,22 @@ import { revalidatePath } from 'next/cache'
 import { auth } from '@/lib/auth'
 import { prisma } from '@/lib/db'
 import { sendInviteEmail } from '@/lib/email'
+import type { WorkspaceRole } from '@/lib/types'
+
+async function getMemberRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
+  const member = await prisma.workspaceMember.findFirst({
+    where: { userId, workspaceId },
+    select: { role: true },
+  })
+  return (member?.role as WorkspaceRole) ?? null
+}
+
+function requireRole(current: WorkspaceRole, minimum: WorkspaceRole): void {
+  const hierarchy: Record<WorkspaceRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
+  if (hierarchy[current] < hierarchy[minimum]) {
+    throw new Error('권한이 없습니다.')
+  }
+}
 
 export type InviteState = {
   error?: string
@@ -21,8 +37,17 @@ export async function inviteTeamMember(
     return { error: '로그인이 필요합니다.' }
   }
 
+  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
+  if (!currentRole) return { error: '팀 멤버 정보를 찾을 수 없습니다.' }
+  try {
+    requireRole(currentRole, 'ADMIN')
+  } catch {
+    return { error: '권한이 없습니다.' }
+  }
+
   const email = (formData.get('email') as string)?.trim().toLowerCase()
-  const role = (formData.get('role') as string) || 'MEMBER'
+  const rawRole = (formData.get('role') as string) || 'MEMBER'
+  const role = rawRole === 'OWNER' ? 'MEMBER' : rawRole
 
   if (!email) {
     return { error: '이메일을 입력해 주세요.' }
@@ -81,6 +106,14 @@ export async function cancelInvite(inviteId: string): Promise<void> {
   const session = await auth()
   if (!session?.user?.workspaceId) return
 
+  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
+  if (!currentRole) return
+  try {
+    requireRole(currentRole, 'ADMIN')
+  } catch {
+    return
+  }
+
   await prisma.workspaceInvite.updateMany({
     where: { id: inviteId, workspaceId: session.user.workspaceId, status: 'PENDING' },
     data: { status: 'CANCELLED' },
@@ -89,11 +122,103 @@ export async function cancelInvite(inviteId: string): Promise<void> {
   revalidatePath('/team')
 }
 
+export async function changeMemberRole(targetMemberId: string, newRole: WorkspaceRole): Promise<void> {
+  const session = await auth()
+  if (!session?.user?.workspaceId) return
+
+  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
+  if (!currentRole) return
+  requireRole(currentRole, 'OWNER')
+
+  if (newRole === 'OWNER') {
+    await transferOwnership(targetMemberId)
+    return
+  }
+
+  const targetMember = await prisma.workspaceMember.findFirst({
+    where: { id: targetMemberId, workspaceId: session.user.workspaceId },
+  })
+  if (!targetMember) throw new Error('멤버를 찾을 수 없습니다.')
+  if (targetMember.userId === session.user.id) throw new Error('자신의 역할은 변경할 수 없습니다.')
+
+  await prisma.workspaceMember.update({
+    where: { id: targetMemberId },
+    data: { role: newRole },
+  })
+
+  revalidatePath('/team')
+}
+
+export async function removeMember(targetMemberId: string): Promise<void> {
+  const session = await auth()
+  if (!session?.user?.workspaceId) return
+
+  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
+  if (!currentRole) return
+  requireRole(currentRole, 'ADMIN')
+
+  const targetMember = await prisma.workspaceMember.findFirst({
+    where: { id: targetMemberId, workspaceId: session.user.workspaceId },
+    select: { id: true, userId: true, role: true },
+  })
+  if (!targetMember) throw new Error('멤버를 찾을 수 없습니다.')
+  if (targetMember.userId === session.user.id) throw new Error('자기 자신은 제거할 수 없습니다.')
+  if (targetMember.role === 'OWNER') throw new Error('오너는 제거할 수 없습니다.')
+  if (currentRole === 'ADMIN' && targetMember.role === 'ADMIN') {
+    throw new Error('어드민은 다른 어드민을 제거할 수 없습니다.')
+  }
+
+  await prisma.$transaction([
+    prisma.workspaceMember.delete({ where: { id: targetMemberId } }),
+    prisma.project.updateMany({
+      where: { workspaceId: session.user.workspaceId, assigneeId: targetMember.userId },
+      data: { assigneeId: null },
+    }),
+    prisma.revisionRequest.updateMany({
+      where: {
+        project: { workspaceId: session.user.workspaceId },
+        assigneeId: targetMember.userId,
+      },
+      data: { assigneeId: null },
+    }),
+  ])
+
+  revalidatePath('/team')
+}
+
+export async function transferOwnership(targetMemberId: string): Promise<void> {
+  const session = await auth()
+  if (!session?.user?.workspaceId) return
+
+  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
+  if (!currentRole) return
+  requireRole(currentRole, 'OWNER')
+
+  const currentMember = await prisma.workspaceMember.findFirst({
+    where: { userId: session.user.id, workspaceId: session.user.workspaceId },
+    select: { id: true },
+  })
+  if (!currentMember) return
+
+  const targetMember = await prisma.workspaceMember.findFirst({
+    where: { id: targetMemberId, workspaceId: session.user.workspaceId },
+  })
+  if (!targetMember) throw new Error('멤버를 찾을 수 없습니다.')
+  if (targetMember.userId === session.user.id) throw new Error('자기 자신에게 소유권을 이전할 수 없습니다.')
+
+  await prisma.$transaction([
+    prisma.workspaceMember.update({ where: { id: currentMember.id }, data: { role: 'ADMIN' } }),
+    prisma.workspaceMember.update({ where: { id: targetMemberId }, data: { role: 'OWNER' } }),
+  ])
+
+  revalidatePath('/team')
+}
+
 export async function getTeamData() {
   const session = await auth()
-  if (!session?.user?.workspaceId) return { members: [], invites: [] }
+  if (!session?.user?.workspaceId) return { members: [], invites: [], currentMember: null }
 
-  const [members, invites] = await Promise.all([
+  const [members, invites, currentMember] = await Promise.all([
     prisma.workspaceMember.findMany({
       where: { workspaceId: session.user.workspaceId },
       include: { user: true },
@@ -103,7 +228,11 @@ export async function getTeamData() {
       where: { workspaceId: session.user.workspaceId, status: 'PENDING' },
       orderBy: { createdAt: 'desc' },
     }),
+    prisma.workspaceMember.findFirst({
+      where: { userId: session.user.id, workspaceId: session.user.workspaceId },
+      select: { id: true, role: true, userId: true },
+    }),
   ])
 
-  return { members, invites }
+  return { members, invites, currentMember }
 }
diff --git a/lib/auth.ts b/lib/auth.ts
index 88fc9e6..4e2e5ec 100644
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -21,13 +21,14 @@ export const { handlers, signIn, signOut, auth } = NextAuth({
       credentials: {
         email: { label: 'Email', type: 'email' },
         password: { label: 'Password', type: 'password' },
+        workspaceId: { label: 'WorkspaceId', type: 'text' },
       },
       authorize: async (credentials) => {
         if (!credentials?.email || !credentials?.password) return null
 
         const user = await prisma.user.findUnique({
           where: { email: credentials.email as string },
-          include: { memberships: { take: 1 } },
+          include: { memberships: { orderBy: { createdAt: 'asc' } } },
         })
 
         if (!user) return null
@@ -38,11 +39,16 @@ export const { handlers, signIn, signOut, auth } = NextAuth({
         )
         if (!valid) return null
 
+        const requestedId = credentials.workspaceId as string | undefined
+        const membership = requestedId
+          ? (user.memberships.find((m) => m.workspaceId === requestedId) ?? user.memberships[0])
+          : user.memberships[0]
+
         return {
           id: user.id,
           email: user.email,
           name: user.name,
-          workspaceId: user.memberships[0]?.workspaceId ?? '',
+          workspaceId: membership?.workspaceId ?? '',
         }
       },
     }),
diff --git a/lib/types.ts b/lib/types.ts
new file mode 100644
index 0000000..3756d10
--- /dev/null
+++ b/lib/types.ts
@@ -0,0 +1,3 @@
+export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'
```
