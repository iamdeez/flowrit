import Link from 'next/link'

const FEATURES = [
  {
    icon: '📥',
    title: '의뢰 접수',
    desc: '공개 폼·웹훅으로 고객 의뢰를 자동 수집. 이메일 알림까지.',
  },
  {
    icon: '📋',
    title: '프로젝트 관리',
    desc: '단계별 워크플로우로 촬영·편집·납품 진행 상황을 한눈에.',
  },
  {
    icon: '✏️',
    title: '수정 요청 처리',
    desc: '고객이 링크 하나로 수정 요청 제출. 히스토리도 자동 관리.',
  },
  {
    icon: '📦',
    title: '납품 링크',
    desc: '결과물을 안전한 공개 링크로 고객에게 전달. 뷰어 내장.',
  },
  {
    icon: '👥',
    title: '팀 협업',
    desc: 'OWNER·ADMIN·MEMBER 역할로 팀원과 함께 업무 분담.',
  },
  {
    icon: '📊',
    title: '통계·분석',
    desc: '월간 수익, 의뢰 전환율, 수정 요청 빈도를 한 곳에서 확인.',
  },
]

const FREE_FEATURES = ['프로젝트 최대 3개', '팀원 1명', '의뢰 접수 폼', '납품 링크', '수정 요청 관리']
const PRO_FEATURES = [
  '프로젝트 무제한',
  '팀원 최대 5명',
  '웹훅 연동',
  '주문서 폼 빌더',
  '통계·분석 대시보드',
  '고객 메시지 템플릿',
  '우선 고객 지원',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--flowrit-text)]">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-50 border-b border-[var(--flowrit-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-[var(--flowrit-primary)]">Flowrit</span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--flowrit-text-secondary)] hover:text-[var(--flowrit-text)]"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="flowrit-button-primary px-4 py-2 text-sm"
            >
              무료 시작
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--flowrit-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--flowrit-primary-soft-text)] mb-6">
          ✨ 프리랜서를 위한 업무 관리 플랫폼
        </div>
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-[var(--flowrit-text)] mb-6">
          의뢰부터 납품까지
          <br />
          <span className="text-[var(--flowrit-primary)]">한 곳에서</span> 관리하세요
        </h1>
        <p className="mx-auto max-w-xl text-lg text-[var(--flowrit-text-secondary)] mb-10">
          고객 의뢰 접수, 프로젝트 진행, 수정 요청 처리, 납품 링크 생성까지.
          Flowrit 하나로 클라이언트 워크플로우를 완성하세요.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/register" className="flowrit-button-primary px-8 py-3 text-base font-semibold">
            무료로 시작하기 →
          </Link>
          <Link
            href="/login"
            className="flowrit-button-secondary px-8 py-3 text-base font-semibold"
          >
            로그인
          </Link>
        </div>
        <p className="mt-4 text-sm text-[var(--flowrit-text-muted)]">신용카드 불필요 · 무료 플랜 영구 제공</p>
      </section>

      {/* ─── Features ─── */}
      <section className="bg-[var(--flowrit-panel-subtle)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">
            업무에 필요한 모든 것
          </h2>
          <p className="mb-12 text-center text-[var(--flowrit-text-secondary)]">
            복잡한 도구 여러 개 대신 Flowrit 하나로 충분합니다.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white border border-[var(--flowrit-border)] p-6 hover:border-[var(--flowrit-primary)] transition-colors"
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-[var(--flowrit-text)]">{f.title}</h3>
                <p className="text-sm text-[var(--flowrit-text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">심플한 요금제</h2>
          <p className="mb-12 text-center text-[var(--flowrit-text-secondary)]">
            시작은 무료, 성장하면 Pro로 업그레이드하세요.
          </p>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-xl border border-[var(--flowrit-border)] bg-white p-8">
              <p className="text-sm font-medium text-[var(--flowrit-text-muted)] mb-1">무료</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₩0</span>
                <span className="text-[var(--flowrit-text-muted)]"> / 월</span>
              </div>
              <ul className="mb-8 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="flowrit-button-secondary block w-full text-center py-2.5 font-medium"
              >
                무료로 시작
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-xl border-2 border-[var(--flowrit-primary)] bg-white p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--flowrit-primary)] px-3 py-0.5 text-xs font-medium text-white">
                추천
              </div>
              <p className="text-sm font-medium text-[var(--flowrit-primary)] mb-1">Pro</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₩29,900</span>
                <span className="text-[var(--flowrit-text-muted)]"> / 월</span>
              </div>
              <ul className="mb-8 space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--flowrit-primary)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="flowrit-button-primary block w-full text-center py-2.5 font-medium"
              >
                Pro 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="bg-[var(--flowrit-primary)] py-16 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">지금 바로 시작하세요</h2>
        <p className="mb-8 text-indigo-200">
          5분이면 충분합니다. 설정 없이 바로 사용 가능.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold text-[var(--flowrit-primary)] hover:bg-indigo-50 transition-colors"
        >
          무료 계정 만들기 →
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[var(--flowrit-border)] py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-sm font-bold text-[var(--flowrit-primary)]">Flowrit</span>
          <div className="flex gap-6 text-sm text-[var(--flowrit-text-muted)]">
            <Link href="/terms" className="hover:text-[var(--flowrit-text)]">이용약관</Link>
            <Link href="/privacy" className="hover:text-[var(--flowrit-text)]">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
