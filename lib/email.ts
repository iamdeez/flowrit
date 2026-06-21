import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${inviteToken}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Flowrit] ${workspaceName}에 초대되었습니다`,
    html: `
      <p>${inviterName}님이 <strong>${workspaceName}</strong> 워크스페이스에 초대했습니다.</p>
      <p>아래 링크를 클릭하면 초대를 수락할 수 있습니다.</p>
      <a href="${inviteUrl}">${inviteUrl}</a>
      <p style="color:#888;font-size:12px;margin-top:24px">이 초대는 발급 후 7일간 유효합니다.</p>
    `,
  })
}
