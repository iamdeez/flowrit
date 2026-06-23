import { prisma } from '@/lib/db'
import { ResetPasswordForm } from './reset-password-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })
  const isValid = record && !record.usedAt && record.expiresAt > new Date()

  if (!isValid) {
    return (
      <div className="flowrit-panel-padded text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">링크가 유효하지 않습니다</h2>
        <p className="mb-6 text-sm text-gray-500">
          링크가 만료되었거나 이미 사용된 링크입니다.
          <br />
          비밀번호 재설정을 다시 요청해 주세요.
        </p>
        <a href="/forgot-password" className="flowrit-button-primary inline-block">
          다시 요청하기
        </a>
      </div>
    )
  }

  return <ResetPasswordForm token={token} />
}
