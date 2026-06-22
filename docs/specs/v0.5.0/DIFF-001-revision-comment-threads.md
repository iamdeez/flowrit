---
작성: Docs Agent
버전: v1.0
최종 수정: 2026-06-22 22:08
상태: 확정
---

# Diff: 001-revision-comment-threads

## 커밋 메시지용 한 줄 요약

(이 섹션은 커밋 메시지 작성 시 참고할 수 있도록 제공한다. 실제 커밋 메시지는 프로젝트 컨벤션에 맞춰 자유롭게 조정한다.)

- **KO**: [feat] 수정 요청 댓글 스레드 신규 개발 — 작업자·클라이언트 댓글 작성 및 알림 연동 (v0.5.0)
- **EN**: [feat] add revision comment threads — worker/client comment authoring with in-app and email notifications (v0.5.0)

## 변경 요약

- **Prisma 스키마**: `RevisionComment` 모델 신규 추가. `authorType(WORKER|CLIENT)`, `authorEmail?`, self-relation 기반 1단계 depth 답글 구조. `RevisionRequest`에 `comments` relation 연결.
- **알림 타입**: `lib/notifications.ts`에 `REVISION_COMMENT` 타입·설정 키 추가.
- **이메일**: `lib/email.ts`에 `sendRevisionCommentReplyEmail()` 함수 추가 (작업자 답글 → 클라이언트 이메일).
- **Server Actions (작업자)**: `lib/actions/revisionComment.ts` 신규. `getRevisionComments` (workspaceId scope 격리), `addRevisionComment` (depth=1 강제, 이메일 알림 연동).
- **Server Actions (클라이언트)**: `lib/actions/publicRevisionComment.ts` 신규. `addClientRevisionComment` (토큰 검증, 입력 유효성, 인앱 알림 연동).
- **UI — 대시보드**: `revision-comment-section.tsx` (Server Component), `revision-comment-thread.tsx` (Client Component, useActionState 기반) 신규. `page.tsx` 수정 요청 탭에 통합.
- **UI — 고객 포털**: `revision-comment-form.tsx` (Client Component) 신규. `p/[token]/page.tsx` 에 댓글 include 쿼리 추가 및 컴포넌트 삽입.
- **테스트**: `tests/revisionComment.test.ts` 신규 (SC-003~SC-015, 19건 전부 PASS).

## 변경 파일 및 라인 수

| 파일 | 추가 | 삭제 |
|---|---|---|
| `prisma/schema.prisma` | +22 | -0 |
| `lib/notifications.ts` | +2 | -0 |
| `lib/email.ts` | +28 | -0 |
| `lib/actions/revisionComment.ts` | +135 | -0 (신규) |
| `lib/actions/publicRevisionComment.ts` | +111 | -0 (신규) |
| `app/(dashboard)/projects/[id]/revision-comment-section.tsx` | +12 | -0 (신규) |
| `app/(dashboard)/projects/[id]/revision-comment-thread.tsx` | +110 | -0 (신규) |
| `app/(dashboard)/projects/[id]/page.tsx` | +8 | -4 |
| `app/p/[token]/revision-comment-form.tsx` | +156 | -0 (신규) |
| `app/p/[token]/page.tsx` | +44 | -1 |
| `tests/revisionComment.test.ts` | +680 | -0 (신규) |
| `prisma/migrations/20260622134000_add_revision_comment_threads/` | +마이그레이션 SQL | — |

## Diff

```diff
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 73ac289..f3363cb 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -128,6 +128,24 @@ model RevisionRequest {
   fileUrls   Json     @default("[]")
   createdAt  DateTime @default(now())
   project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
+  comments   RevisionComment[]
+}
+
+model RevisionComment {
+  id          String   @id @default(cuid())
+  revisionId  String
+  parentId    String?
+  authorType  String   // "WORKER" | "CLIENT"
+  authorName  String
+  authorEmail String?
+  content     String
+  createdAt   DateTime @default(now())
+
+  revision RevisionRequest  @relation(fields: [revisionId], references: [id], onDelete: Cascade)
+  parent   RevisionComment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Restrict)
+  replies  RevisionComment[] @relation("CommentReplies")
+
+  @@index([revisionId, createdAt])
 }
 
 model Asset {

diff --git a/lib/notifications.ts b/lib/notifications.ts
index 19e812a..9165f91 100644
--- a/lib/notifications.ts
+++ b/lib/notifications.ts
@@ -5,6 +5,7 @@ export type NotificationType =
   | 'REVISION_SUBMITTED'
   | 'STAGE_CHANGED'
   | 'DEADLINE_SOON'
+  | 'REVISION_COMMENT'
 
 type NotificationSettings = Record<string, boolean>
 
@@ -23,6 +24,7 @@ const settingKeys: Record<NotificationType, string> = {
   REVISION_SUBMITTED: 'notify_revision_submitted',
   STAGE_CHANGED: 'notify_stage_changed',
   DEADLINE_SOON: 'notify_deadline_soon',
+  REVISION_COMMENT: 'notify_revision_comment',
 }

diff --git a/lib/email.ts b/lib/email.ts
index cdd1a4f..e24440c 100644
--- a/lib/email.ts
+++ b/lib/email.ts
@@ -120,6 +120,34 @@ export async function sendStageChangedEmail(
   })
 }
 
+export async function sendRevisionCommentReplyEmail(
+  to: string,
+  payload: {
+    authorName: string
+    revisionContent: string
+    replyContent: string
+    portalUrl: string
+  }
+): Promise<void> {
+  await resend.emails.send({
+    from: FROM,
+    to,
+    subject: '[Flowrit] 수정 요청에 답글이 달렸습니다',
+    html: emailWrapper(`
+      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">수정 요청에 답글이 달렸습니다</h1>
+      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>작성자</strong> ${escapeHtml(payload.authorName)}</p>
+      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:13px;line-height:1.6;color:#6b7280;margin-bottom:12px">
+        <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">원 수정 요청</p>
+        ${escapeHtml(payload.revisionContent)}
+      </div>
+      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:14px;line-height:1.6;color:#374151">
+        ${escapeHtml(payload.replyContent)}
+      </div>
+      ${actionLink(payload.portalUrl, '포털에서 확인하기')}
+    `),
+  })
+}
+
 export async function sendDeadlineReminderEmail(

diff --git a/app/(dashboard)/projects/[id]/page.tsx b/app/(dashboard)/projects/[id]/page.tsx
index f747b38..d09b544 100644
--- a/app/(dashboard)/projects/[id]/page.tsx
+++ b/app/(dashboard)/projects/[id]/page.tsx
@@ -34,6 +34,7 @@ import { AssetStatusForm } from './asset-status-form'
 import { DuplicateProjectDialog } from '../duplicate-project-dialog'
 import { MessagePanel } from './message-panel'
 import { PublicPageForm } from './public-page-form'
+import { RevisionCommentSection } from './revision-comment-section'
 import { RevisionForm } from './revision-form'
 import { RevisionStatusForm } from './revision-status-form'
 import { StageForm } from './stage-form'
@@ -197,50 +198,50 @@ export default async function ProjectDetailPage({
           {project.revisions.length > 0 ? (
             <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
               {project.revisions.map((revision) => (
-                <div
-                  key={revision.id}
-                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"
-                >
-                  <div>
-                    ...revision 카드 내부 기존 내용...
+                <div key={revision.id} className="p-5">
+                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
+                    <div>
+                      ...revision 카드 내부 내용 (레이아웃 wrapper 조정)...
+                    </div>
+                    <RevisionStatusForm revisionId={revision.id} status={revision.status} />
                   </div>
-                  <RevisionStatusForm revisionId={revision.id} status={revision.status} />
+                  <RevisionCommentSection revisionId={revision.id} />
                 </div>
               ))}

diff --git a/app/p/[token]/page.tsx b/app/p/[token]/page.tsx
index 1e1971e..e2686dd 100644
--- a/app/p/[token]/page.tsx
+++ b/app/p/[token]/page.tsx
@@ -3,6 +3,7 @@ import { ExternalLink } from 'lucide-react'
 import { notFound } from 'next/navigation'
 import { prisma } from '@/lib/db'
 import { getCurrentStage } from '@/lib/project-utils'
+import { RevisionCommentForm } from './revision-comment-form'
 
@@ -21,7 +22,34 @@ export default async function PublicProjectPage({ params }: Props) {
-          revisions: { orderBy: { createdAt: 'desc' } },
+          revisions: {
+            orderBy: { createdAt: 'desc' },
+            include: {
+              comments: {
+                where: { parentId: null },
+                select: {
+                  id: true,
+                  authorType: true,
+                  authorName: true,
+                  content: true,
+                  createdAt: true,
+                  parentId: true,
+                  replies: {
+                    orderBy: { createdAt: 'asc' },
+                    select: {
+                      id: true, authorType: true, authorName: true,
+                      content: true, createdAt: true, parentId: true,
+                    },
+                  },
+                },
+                orderBy: { createdAt: 'asc' },
+              },
+            },
+          },
 
@@ -99,6 +127,23 @@ export default async function PublicProjectPage({ params }: Props) {
+        {project.revisions.map((revision) => (
+          <div key={revision.id} className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
+            <p className="mb-2 whitespace-pre-wrap text-sm font-medium text-gray-900">
+              {revision.content}
+            </p>
+            <p className="mb-3 text-xs text-gray-400">
+              {new Date(revision.createdAt).toLocaleDateString('ko-KR')} 등록
+            </p>
+            <RevisionCommentForm
+              token={token}
+              revisionId={revision.id}
+              comments={revision.comments}
+            />
+          </div>
+        ))}

diff --git a/lib/actions/revisionComment.ts b/lib/actions/revisionComment.ts
new file mode 100644
index 0000000..新규
--- /dev/null
+++ b/lib/actions/revisionComment.ts
@@ -0,0 +1,135 @@
+'use server'
+
+import { revalidatePath } from 'next/cache'
+import { auth } from '@/lib/auth'
+import { prisma } from '@/lib/db'
+import { sendRevisionCommentReplyEmail } from '@/lib/email'
+
+export type CommentFormState = {
+  error?: string
+  success?: string
+}
+
+export type RevisionCommentWithReplies = {
+  id: string
+  revisionId: string
+  parentId: null
+  authorType: string
+  authorName: string
+  authorEmail: string | null
+  content: string
+  createdAt: Date
+  replies: {
+    id: string
+    authorType: string
+    authorName: string
+    content: string
+    createdAt: Date
+    parentId: string
+  }[]
+}
+
+function stringValue(formData: FormData, key: string): string {
+  return ((formData.get(key) as string | null) ?? '').trim()
+}
+
+async function requireAuth(): Promise<{ workspaceId: string; userId: string; name: string }> {
+  const session = await auth()
+  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
+  return {
+    workspaceId: session.user.workspaceId,
+    userId: session.user.id,
+    name: session.user.name ?? '작업자',
+  }
+}
+
+export async function getRevisionComments(
+  revisionId: string
+): Promise<RevisionCommentWithReplies[]> {
+  const { workspaceId } = await requireAuth()
+  return prisma.revisionComment.findMany({
+    where: { revisionId, parentId: null, revision: { project: { workspaceId } } },
+    include: { replies: { orderBy: { createdAt: 'asc' } } },
+    orderBy: { createdAt: 'asc' },
+  }) as Promise<RevisionCommentWithReplies[]>
+}
+
+export async function addRevisionComment(
+  _prevState: CommentFormState,
+  formData: FormData
+): Promise<CommentFormState> {
+  const { workspaceId, name } = await requireAuth()
+  const revisionId = stringValue(formData, 'revisionId')
+  const content = stringValue(formData, 'content')
+  const parentId = stringValue(formData, 'parentId') || null
+
+  if (!revisionId) return { error: '수정 요청을 찾을 수 없습니다.' }
+  if (!content) return { error: '댓글 내용을 입력해 주세요.' }
+  if (content.length > 2000) return { error: '댓글은 2,000자를 초과할 수 없습니다.' }
+
+  const revision = await prisma.revisionRequest.findFirst({
+    where: { id: revisionId, project: { workspaceId } },
+    include: { project: { include: { publicPage: { select: { token: true } } } } },
+  })
+  if (!revision) return { error: '수정 요청을 찾을 수 없습니다.' }
+
+  if (parentId) {
+    const parentComment = await prisma.revisionComment.findFirst({
+      where: { id: parentId },
+      select: { parentId: true, authorType: true, authorEmail: true },
+    })
+    if (!parentComment || parentComment.parentId !== null) {
+      return { error: '답글에는 다시 답글을 달 수 없습니다.' }
+    }
+    await prisma.revisionComment.create({
+      data: { revisionId, parentId, authorType: 'WORKER', authorName: name, content },
+    })
+    if (parentComment.authorType === 'CLIENT' && parentComment.authorEmail) {
+      const portalToken = revision.project.publicPage?.token
+      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
+      await sendRevisionCommentReplyEmail(parentComment.authorEmail, {
+        authorName: name,
+        revisionContent: revision.content,
+        replyContent: content,
+        portalUrl: portalToken ? `${appUrl}/p/${portalToken}` : appUrl,
+      })
+    }
+  } else {
+    await prisma.revisionComment.create({
+      data: { revisionId, parentId: null, authorType: 'WORKER', authorName: name, content },
+    })
+  }
+
+  revalidatePath(`/projects/${revision.projectId}`)
+  revalidatePath('/revisions')
+  return { success: '댓글을 등록했습니다.' }
+}

diff --git a/lib/actions/publicRevisionComment.ts b/lib/actions/publicRevisionComment.ts
new file mode 100644
index 0000000..신규
--- /dev/null
+++ b/lib/actions/publicRevisionComment.ts
@@ -0,0 +1,111 @@
+'use server'
+
+import { revalidatePath } from 'next/cache'
+import { prisma } from '@/lib/db'
+import { sendNotification } from '@/lib/notifications'
+
+export type PublicCommentFormState = { error?: string; success?: boolean }
+
+const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
+
+export async function addClientRevisionComment(
+  _prevState: PublicCommentFormState,
+  formData: FormData
+): Promise<PublicCommentFormState> {
+  // 토큰 검증 → revision 존재 확인 → depth=1 강제 → 댓글 생성 → 인앱 알림
+  const token = ((formData.get('token') as string | null) ?? '').trim()
+  const revisionId = ((formData.get('revisionId') as string | null) ?? '').trim()
+  const authorName = ((formData.get('authorName') as string | null) ?? '').trim()
+  const authorEmailRaw = ((formData.get('authorEmail') as string | null) ?? '').trim()
+  const authorEmail = authorEmailRaw.length > 0 ? authorEmailRaw : null
+  const content = ((formData.get('content') as string | null) ?? '').trim()
+  const parentId = ((formData.get('parentId') as string | null) ?? '').trim() || null
+
+  if (!token) return { error: '잘못된 요청입니다.' }
+  if (!revisionId) return { error: '수정 요청을 찾을 수 없습니다.' }
+  if (!authorName || authorName.length < 1) return { error: '이름을 입력해 주세요.' }
+  if (authorName.length > 100) return { error: '이름은 100자를 초과할 수 없습니다.' }
+  if (authorEmail !== null && !EMAIL_REGEX.test(authorEmail))
+    return { error: '올바른 이메일 형식을 입력해 주세요.' }
+  if (!content || content.length < 1) return { error: '댓글 내용을 입력해 주세요.' }
+  if (content.length > 2000) return { error: '댓글은 2,000자를 초과할 수 없습니다.' }
+
+  const page = await prisma.publicProjectPage.findUnique({
+    where: { token, isActive: true },
+    include: { project: { select: { id: true, workspaceId: true, assigneeId: true } } },
+  })
+  if (!page) return { error: '유효하지 않은 공유 링크입니다.' }
+
+  const revision = await prisma.revisionRequest.findFirst({
+    where: { id: revisionId, projectId: page.projectId },
+  })
+  if (!revision) return { error: '수정 요청을 찾을 수 없습니다.' }
+
+  if (parentId) {
+    const parentComment = await prisma.revisionComment.findFirst({
+      where: { id: parentId }, select: { parentId: true },
+    })
+    if (!parentComment || parentComment.parentId !== null)
+      return { error: '답글에는 다시 답글을 달 수 없습니다.' }
+  }
+
+  await prisma.revisionComment.create({
+    data: { revisionId, parentId: parentId || null, authorType: 'CLIENT',
+            authorName, authorEmail: authorEmail || null, content },
+  })
+
+  try {
+    const { workspaceId, assigneeId } = page.project
+    const targetUserIds = assigneeId
+      ? [assigneeId]
+      : (await prisma.workspaceMember.findMany({
+          where: { workspaceId, role: 'OWNER' }, select: { userId: true },
+        })).map((o) => o.userId)
+    await sendNotification({
+      userIds: targetUserIds, workspaceId, type: 'REVISION_COMMENT',
+      title: '수정 요청에 새 댓글이 달렸습니다',
+      body: `${authorName}: ${content.slice(0, 80)}`,
+      href: `/projects/${page.projectId}?tab=revisions`,
+    })
+  } catch (error) {
+    console.error('[notification] addClientRevisionComment failed', { revisionId, error })
+  }
+
+  revalidatePath(`/p/${token}`)
+  return { success: true }
+}

diff --git a/app/(dashboard)/projects/[id]/revision-comment-section.tsx b/app/(dashboard)/projects/[id]/revision-comment-section.tsx
new file mode 100644
index 0000000..신규
--- /dev/null
+++ b/app/(dashboard)/projects/[id]/revision-comment-section.tsx
@@ -0,0 +1,12 @@
+import { getRevisionComments } from '@/lib/actions/revisionComment'
+import { RevisionCommentThread } from './revision-comment-thread'
+
+type RevisionCommentSectionProps = { revisionId: string }
+
+export async function RevisionCommentSection({ revisionId }: RevisionCommentSectionProps) {
+  const comments = await getRevisionComments(revisionId)
+  return <RevisionCommentThread revisionId={revisionId} initialComments={comments} />
+}

diff --git a/app/(dashboard)/projects/[id]/revision-comment-thread.tsx b/app/(dashboard)/projects/[id]/revision-comment-thread.tsx
new file mode 100644
index 0000000..신규
--- /dev/null
+++ b/app/(dashboard)/projects/[id]/revision-comment-thread.tsx
@@ -0,0 +1,110 @@
+'use client'
+
+// useActionState로 addRevisionComment 바인딩, 최상위 댓글·답글 폼 포함
+// authorType별 배지 표시, depth=1 제한은 서버에서 처리
+// (전체 내용은 실제 파일 참조)

diff --git a/app/p/[token]/revision-comment-form.tsx b/app/p/[token]/revision-comment-form.tsx
new file mode 100644
index 0000000..신규
--- /dev/null
+++ b/app/p/[token]/revision-comment-form.tsx
@@ -0,0 +1,156 @@
+'use client'
+
+// addClientRevisionComment를 useActionState로 바인딩
+// 이름(필수), 이메일(선택), 본문(필수) 입력 폼
+// 기존 댓글·답글 목록 표시 (authorEmail 제외)
+// (전체 내용은 실제 파일 참조)

diff --git a/tests/revisionComment.test.ts b/tests/revisionComment.test.ts
new file mode 100644
index 0000000..신규
--- /dev/null
+++ b/tests/revisionComment.test.ts
@@ -0,0 +1,680 @@
+// SC-003~SC-015 단위 테스트 19건
+// Prisma mockDeep, auth mock, sendNotification mock, sendRevisionCommentReplyEmail mock 포함
+// 19/19 PASS (SC-007 mock 수정 후)
+// (전체 내용은 실제 파일 참조)
```
