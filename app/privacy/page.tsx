import Link from 'next/link'

export const metadata = {
  title: '개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)] py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Flowrit 홈으로
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--flowrit-border)] bg-white p-8 md:p-12">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">개인정보처리방침</h1>
          <p className="mb-8 text-sm text-gray-500">최종 수정일: 2026년 6월 23일</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. 수집하는 개인정보</h2>
              <p>Flowrit(이하 &quot;서비스&quot;)는 다음의 개인정보를 수집합니다.</p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                <li>이름, 이메일 주소 (회원가입 시)</li>
                <li>서비스 이용 기록, 접속 로그</li>
                <li>고객이 입력한 프로젝트·수정 요청·의뢰 데이터</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. 개인정보 수집 및 이용 목적</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>서비스 제공 및 운영</li>
                <li>회원 식별 및 본인 확인</li>
                <li>서비스 관련 이메일 알림 발송</li>
                <li>서비스 개선 및 신규 기능 개발</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. 개인정보 보유 및 이용 기간</h2>
              <p className="text-sm">
                회원 탈퇴 시 또는 서비스 종료 시까지 보유합니다.
                법령에 의해 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
              <p className="text-sm">
                Flowrit는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                다만, 이용자의 동의가 있거나 법령에 의한 경우는 예외로 합니다.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                서비스 운영을 위해 아래 업체에 업무를 위탁합니다:
              </p>
              <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-gray-500">
                <li>Neon Tech (데이터베이스 호스팅)</li>
                <li>Vercel (서버 호스팅)</li>
                <li>Cloudflare (파일 스토리지)</li>
                <li>Resend (이메일 발송)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. 개인정보의 파기</h2>
              <p className="text-sm">
                회원 탈퇴 요청 시 즉시 개인정보를 파기합니다. 단, 관계 법령에 의해 보존이 필요한 경우
                해당 기간 동안 별도 보관 후 파기합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. 이용자의 권리</h2>
              <p className="text-sm">이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                <li>개인정보 열람 요청</li>
                <li>개인정보 정정·삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. 개인정보 보호책임자</h2>
              <p className="text-sm">
                개인정보 관련 문의사항은 아래로 연락해 주세요.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                이메일: {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@flowrit.com'}
              </p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/terms" className="hover:underline">이용약관</Link>
          {' · '}
          <Link href="/privacy" className="hover:underline text-indigo-600">개인정보처리방침</Link>
        </p>
      </div>
    </div>
  )
}
