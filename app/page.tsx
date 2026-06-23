import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Check,
  FileCheck2,
  Inbox,
  MessageSquareText,
  PanelsTopLeft,
  UsersRound,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Inbox,
    title: '의뢰 접수',
    desc: '공개 폼과 웹훅으로 들어온 고객 요청을 한 곳에 모읍니다.',
  },
  {
    icon: PanelsTopLeft,
    title: '프로젝트 진행',
    desc: '단계, 담당자, 마감일, 고객 정보를 같은 화면에서 확인합니다.',
  },
  {
    icon: MessageSquareText,
    title: '수정 요청',
    desc: '고객은 링크로 요청을 남기고 작업자는 상태와 댓글을 관리합니다.',
  },
  {
    icon: FileCheck2,
    title: '납품 링크',
    desc: '파일과 외부 링크를 고객 포털에 정리해 전달합니다.',
  },
  {
    icon: UsersRound,
    title: '팀 협업',
    desc: 'OWNER, ADMIN, MEMBER 역할로 접근 범위를 나눕니다.',
  },
  {
    icon: BarChart3,
    title: '업무 지표',
    desc: '완료율, 접수 추이, 팀 워크로드를 대시보드에서 봅니다.',
  },
]

const FREE_FEATURES = ['프로젝트 최대 3개', '팀원 1명', '의뢰 접수 폼', '납품 링크', '수정 요청 관리']
const PRO_FEATURES = [
  '프로젝트 무제한',
  '팀원 최대 5명',
  '웹훅 연동',
  '주문서 폼 빌더',
  '통계 대시보드',
  '고객 메시지 템플릿',
]

const PIPELINE = [
  { label: '접수', count: 4, color: 'bg-sky-500' },
  { label: '진행', count: 7, color: 'bg-indigo-500' },
  { label: '검토', count: 3, color: 'bg-amber-500' },
  { label: '완료', count: 12, color: 'bg-emerald-500' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--flowrit-text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--flowrit-border)] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--flowrit-primary)] text-sm font-bold text-white">
              F
            </span>
            <span className="text-base font-bold text-[var(--flowrit-text)]">Flowrit</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="flowrit-button-secondary min-h-9 border-transparent bg-transparent px-3"
            >
              로그인
            </Link>
            <Link href="/register" className="flowrit-button-primary min-h-9 px-4">
              무료 시작
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-12 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-14 lg:pt-20">
            <div>
              <p className="mb-4 inline-flex items-center rounded-full border border-[var(--flowrit-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--flowrit-text-secondary)]">
                프리랜서와 소규모 팀을 위한 업무 운영 툴
              </p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[var(--flowrit-text)] md:text-6xl">
                고객 의뢰부터 납품 링크까지 한 흐름으로 정리하세요
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--flowrit-text-secondary)] md:text-lg">
                Flowrit은 주문서, 프로젝트 진행, 수정 요청, 납품물을 하나의 워크스페이스에 모아 고객 응대 시간을 줄여줍니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="flowrit-button-primary px-6 py-3 text-base font-semibold">
                  무료로 시작하기
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/login" className="flowrit-button-secondary px-6 py-3 text-base font-semibold">
                  기존 계정으로 로그인
                </Link>
              </div>
              <p className="mt-4 text-sm text-[var(--flowrit-text-muted)]">
                신용카드 없이 시작하고, 필요할 때 Pro로 업그레이드하세요.
              </p>
            </div>

            <div className="flowrit-panel-padded bg-white">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--flowrit-text)]">오늘의 워크스페이스</p>
                  <p className="text-xs text-[var(--flowrit-text-muted)]">미확인 주문, 수정 요청, 마감 프로젝트</p>
                </div>
                <span className="flowrit-badge flowrit-badge-active">실시간</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {PIPELINE.map((item) => (
                  <div key={item.label} className="rounded-lg border border-[var(--flowrit-border)] p-3">
                    <span className={`flowrit-status-dot ${item.color}`} />
                    <p className="mt-3 text-xs text-[var(--flowrit-text-muted)]">{item.label}</p>
                    <p className="text-2xl font-semibold text-[var(--flowrit-text)]">{item.count}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-lg border border-[var(--flowrit-border)] p-4">
                  <p className="mb-3 text-xs font-semibold text-[var(--flowrit-text-muted)]">우선 처리</p>
                  {[
                    ['브랜드 상세페이지 제작', '오늘 마감 · 수정 요청 2건', 'flowrit-badge-warning'],
                    ['카페 메뉴판 리뉴얼', '내일 마감 · 고객 검토 중', 'flowrit-badge-active'],
                    ['앱 소개 영상 편집', '납품 링크 준비', 'flowrit-badge-done'],
                  ].map(([title, meta, badge]) => (
                    <div key={title} className="flex items-center justify-between gap-3 border-t border-[var(--flowrit-border)] py-3 first:border-t-0 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--flowrit-text)]">{title}</p>
                        <p className="mt-0.5 truncate text-xs text-[var(--flowrit-text-muted)]">{meta}</p>
                      </div>
                      <span className={`flowrit-badge ${badge}`}>진행</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-[var(--flowrit-border)] p-4">
                  <p className="mb-3 text-xs font-semibold text-[var(--flowrit-text-muted)]">공유 링크</p>
                  <div className="rounded-lg bg-[var(--flowrit-panel-subtle)] p-3">
                    <p className="text-xs text-[var(--flowrit-text-muted)]">주문서 폼</p>
                    <p className="mt-1 truncate text-sm font-medium text-[var(--flowrit-text)]">flowrit.kr/order/studio</p>
                  </div>
                  <div className="mt-3 rounded-lg bg-[var(--flowrit-panel-subtle)] p-3">
                    <p className="text-xs text-[var(--flowrit-text-muted)]">고객 포털</p>
                    <p className="mt-1 truncate text-sm font-medium text-[var(--flowrit-text)]">수정 요청과 납품물을 한 링크로</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-18">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-bold text-[var(--flowrit-text)]">업무 흐름을 끊지 않는 기능</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--flowrit-text-secondary)]">
                고객과 주고받는 요청, 파일, 링크, 진행 상태를 팀 내부 화면과 고객 포털에 맞게 나눠 보여줍니다.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <article key={feature.title} className="flowrit-panel-padded">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--flowrit-panel-subtle)] text-[var(--flowrit-text-secondary)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--flowrit-text)]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--flowrit-text-secondary)]">{feature.desc}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)]">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold text-[var(--flowrit-text)]">작게 시작하고, 바쁠 때 확장하세요</h2>
              <p className="mt-3 text-sm text-[var(--flowrit-text-secondary)]">무료 플랜으로 업무 흐름을 만들고 팀이 생기면 Pro로 옮기면 됩니다.</p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
              <PricingCard title="Free" price="₩0" features={FREE_FEATURES} href="/register" cta="무료로 시작" />
              <PricingCard title="Pro" price="₩29,900" features={PRO_FEATURES} href="/register" cta="Pro 준비하기" featured />
            </div>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-[var(--flowrit-radius-panel)] border border-[var(--flowrit-border)] bg-[var(--flowrit-text)] p-6 text-white md:flex-row md:items-center md:p-8">
            <div>
              <h2 className="text-2xl font-bold">첫 주문서 링크부터 만들어보세요</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                가입 후 워크스페이스를 만들면 주문서와 고객 포털 흐름을 바로 확인할 수 있습니다.
              </p>
            </div>
            <Link href="/register" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[var(--flowrit-text)] hover:bg-slate-100">
              무료 계정 만들기
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--flowrit-border)] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between">
          <span className="text-sm font-bold text-[var(--flowrit-text)]">Flowrit</span>
          <div className="flex gap-6 text-sm text-[var(--flowrit-text-muted)]">
            <Link href="/terms" className="hover:text-[var(--flowrit-text)]">이용약관</Link>
            <Link href="/privacy" className="hover:text-[var(--flowrit-text)]">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PricingCard({
  title,
  price,
  features,
  href,
  cta,
  featured = false,
}: {
  title: string
  price: string
  features: string[]
  href: string
  cta: string
  featured?: boolean
}) {
  return (
    <article className={`flowrit-panel-padded relative ${featured ? 'border-[var(--flowrit-primary)]' : ''}`}>
      {featured && (
        <span className="flowrit-badge flowrit-badge-active absolute right-5 top-5">추천</span>
      )}
      <p className="text-sm font-semibold text-[var(--flowrit-text-muted)]">{title}</p>
      <div className="mt-3">
        <span className="text-4xl font-bold text-[var(--flowrit-text)]">{price}</span>
        <span className="text-sm text-[var(--flowrit-text-muted)]"> / 월</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[var(--flowrit-text-secondary)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--flowrit-success-text)]" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <Link href={href} className={`${featured ? 'flowrit-button-primary' : 'flowrit-button-secondary'} mt-7 w-full`}>
        {cta}
      </Link>
    </article>
  )
}
