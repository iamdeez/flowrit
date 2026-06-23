import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function emailWrapper(content: string): string {
  return `
    <div style="margin:0;padding:32px;background:#f8f9fa;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#111827">
      <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;overflow:hidden">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb">
          <div style="font-size:18px;font-weight:700;color:#4f46e5">Flowrit</div>
          <div style="margin-top:4px;font-size:12px;color:#9ca3af">중요한 작업 변경 알림</div>
        </div>
        <div style="padding:24px">${content}</div>
        <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
          이 알림은 Flowrit 워크스페이스 설정에 따라 발송되었습니다.
        </div>
      </div>
    </div>
  `
}

function actionLink(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:16px;border-radius:8px;background:#4f46e5;padding:10px 14px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">${escapeHtml(label)}</a>`
}

export async function sendInviteEmail({
  to,
  inviterName,
  workspaceName,
  inviteToken,
}: {
  to: string
  inviterName: string
  workspaceName: string
  inviteToken: string
}) {
  const inviteUrl = `${APP_URL}/invite/${inviteToken}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Flowrit] ${workspaceName}에 초대되었습니다`,
    html: emailWrapper(`
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6">${escapeHtml(inviterName)}님이 <strong>${escapeHtml(workspaceName)}</strong> 워크스페이스에 초대했습니다.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563">아래 링크를 클릭하면 초대를 수락할 수 있습니다.</p>
      ${actionLink(inviteUrl, '초대 수락하기')}
      <p style="color:#888;font-size:12px;margin-top:24px">이 초대는 발급 후 7일간 유효합니다.</p>
    `),
  })
}

export async function sendNewInquiryEmail(
  to: string,
  payload: { submitterName: string; contact: string; excerpt: string; dashboardUrl: string }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: '[Flowrit] 새 의뢰가 접수되었습니다',
    html: emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">새 의뢰가 접수되었습니다</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>제출자</strong> ${escapeHtml(payload.submitterName)}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563"><strong>연락처</strong> ${escapeHtml(payload.contact || '미입력')}</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:14px;line-height:1.6;color:#374151">${escapeHtml(payload.excerpt)}</div>
      ${actionLink(payload.dashboardUrl, '대시보드 열기')}
    `),
  })
}

export async function sendRevisionSubmittedEmail(
  to: string,
  payload: { projectTitle: string; content: string; fileCount: number; projectUrl: string }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Flowrit] ${payload.projectTitle} 수정 요청이 접수되었습니다`,
    html: emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">수정 요청이 접수되었습니다</h1>
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563"><strong>프로젝트</strong> ${escapeHtml(payload.projectTitle)}</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:14px;line-height:1.6;color:#374151">${escapeHtml(payload.content)}</div>
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280">첨부 파일 ${payload.fileCount}개</p>
      ${actionLink(payload.projectUrl, '프로젝트 확인하기')}
    `),
  })
}

export async function sendStageChangedEmail(
  to: string,
  payload: {
    projectTitle: string
    fromStage: string
    toStage: string
    changedBy: string
    projectUrl: string
  }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Flowrit] ${payload.projectTitle} 단계가 변경되었습니다`,
    html: emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">프로젝트 단계가 변경되었습니다</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>프로젝트</strong> ${escapeHtml(payload.projectTitle)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>변경자</strong> ${escapeHtml(payload.changedBy)}</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:14px;color:#374151">${escapeHtml(payload.fromStage)} → <strong>${escapeHtml(payload.toStage)}</strong></div>
      ${actionLink(payload.projectUrl, '프로젝트 열기')}
    `),
  })
}

export async function sendRevisionCommentReplyEmail(
  to: string,
  payload: {
    authorName: string
    revisionContent: string
    replyContent: string
    portalUrl: string
  }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: '[Flowrit] 수정 요청에 답글이 달렸습니다',
    html: emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">수정 요청에 답글이 달렸습니다</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>작성자</strong> ${escapeHtml(payload.authorName)}</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:13px;line-height:1.6;color:#6b7280;margin-bottom:12px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">원 수정 요청</p>
        ${escapeHtml(payload.revisionContent)}
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:12px;font-size:14px;line-height:1.6;color:#374151">
        ${escapeHtml(payload.replyContent)}
      </div>
      ${actionLink(payload.portalUrl, '포털에서 확인하기')}
    `),
  })
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password/${resetToken}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: '[Flowrit] 비밀번호 재설정 안내',
    html: emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">비밀번호 재설정</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563">
        비밀번호 재설정 요청이 접수되었습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
      </p>
      ${actionLink(resetUrl, '비밀번호 재설정하기')}
      <p style="color:#888;font-size:12px;margin-top:24px">
        이 링크는 1시간 후 만료됩니다. 본인이 요청하지 않았다면 이 이메일을 무시하세요.
      </p>
    `),
  })
}

export async function sendDeadlineReminderEmail(
  to: string,
  payload: {
    projectTitle: string
    customerName: string
    dueDate: string
    pendingRevisions: number
    projectUrl: string
  }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Flowrit] ${payload.projectTitle} 마감일이 다가옵니다`,
    html: emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">마감일 1일 전 리마인더</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>프로젝트</strong> ${escapeHtml(payload.projectTitle)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>고객</strong> ${escapeHtml(payload.customerName)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#4b5563"><strong>마감일</strong> ${escapeHtml(payload.dueDate)}</p>
      <p style="margin:0;font-size:14px;color:#4b5563"><strong>미완료 수정 요청</strong> ${payload.pendingRevisions}건</p>
      ${actionLink(payload.projectUrl, '프로젝트 확인하기')}
    `),
  })
}

export async function sendPaymentFailEmail(
  toEmail: string,
  workspaceName: string,
  isFinal: boolean,
): Promise<void> {
  const subject = isFinal
    ? '[Flowrit] 구독이 중단되었습니다 — 결제 수단을 확인해 주세요'
    : '[Flowrit] 결제에 실패했습니다 — 카드 정보를 확인해 주세요'

  const body = isFinal
    ? `
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">구독이 중단되었습니다</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563">
        <strong>${escapeHtml(workspaceName)}</strong> 워크스페이스의 Pro 구독 결제가 3회 연속 실패하여
        무료 플랜으로 전환되었습니다.
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563">
        결제 수단을 업데이트하고 다시 구독하시면 Pro 기능을 계속 사용하실 수 있습니다.
      </p>
      ${actionLink(`${APP_URL}/settings?tab=billing`, '결제 수단 업데이트')}
    `
    : `
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">결제에 실패했습니다</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563">
        <strong>${escapeHtml(workspaceName)}</strong> 워크스페이스의 Pro 구독 결제가 실패했습니다.
        카드 정보를 확인해 주세요.
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563">
        결제가 계속 실패할 경우 무료 플랜으로 전환됩니다.
      </p>
      ${actionLink(`${APP_URL}/settings?tab=billing`, '결제 정보 확인하기')}
    `

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject,
    html: emailWrapper(body),
  })
}
