import Link from 'next/link'

export const metadata = {
  title: '이용약관',
  description: 'Flowrit 이용약관입니다. 서비스 이용 조건, 데이터 소유권, 이용자의 권리와 의무를 안내합니다.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)] py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Flowrit 홈으로
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--flowrit-border)] bg-white p-8 md:p-12">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">이용약관</h1>
          <p className="mb-8 text-sm text-gray-500">최종 수정일: 2026년 6월 23일</p>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 (목적)</h2>
              <p className="text-sm">
                본 약관은 Flowrit(이하 &quot;서비스&quot;)가 제공하는 서비스의 이용 조건 및 절차,
                이용자와 서비스 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 (서비스의 내용)</h2>
              <p className="text-sm">
                Flowrit는 프리랜서 디자이너·개발자를 위한 워크플로우 관리 서비스를 제공합니다.
                서비스의 구체적인 내용은 서비스 내에서 확인할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 (이용자의 의무)</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>이용자는 서비스 이용 시 관계 법령을 준수해야 합니다.</li>
                <li>타인의 개인정보를 도용하거나 서비스를 부정 사용해서는 안 됩니다.</li>
                <li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
                <li>허위 정보를 입력하거나 타인을 사칭해서는 안 됩니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 (서비스 중단)</h2>
              <p className="text-sm">
                서비스는 시스템 점검, 장비 교체 및 고장, 통신 두절 등의 사유로 일시적으로 중단될 수 있습니다.
                서비스는 이에 대해 사전 또는 사후 공지하기 위해 노력합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 (면책조항)</h2>
              <p className="text-sm">
                서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우
                서비스 제공에 관한 책임이 면제됩니다. 이용자의 귀책 사유로 인한 서비스 이용 장애에
                대해서는 책임을 지지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 (데이터 소유권)</h2>
              <p className="text-sm">
                이용자가 서비스에 입력한 데이터(고객 정보, 프로젝트 정보 등)의 소유권은 이용자에게 있습니다.
                서비스는 해당 데이터를 이용자의 동의 없이 제3자에게 제공하거나 상업적으로 이용하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 (약관의 변경)</h2>
              <p className="text-sm">
                서비스는 합리적인 사유가 발생할 경우 약관을 변경할 수 있습니다.
                약관이 변경되는 경우 서비스 내 공지 또는 이메일로 7일 전에 통지합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 (준거법 및 관할법원)</h2>
              <p className="text-sm">
                본 약관에 관한 분쟁은 대한민국 법률을 준거법으로 하며,
                분쟁 발생 시 서울중앙지방법원을 관할 법원으로 합니다.
              </p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/terms" className="hover:underline text-indigo-600">이용약관</Link>
          {' · '}
          <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
        </p>
      </div>
    </div>
  )
}
