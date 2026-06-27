import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FilePen,
  Inbox,
  Link2,
  MessageSquareText,
  Plus,
  UserRound,
  Zap,
} from 'lucide-react'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_URL,
  defaultOpenGraph,
  defaultTwitter,
} from '@/lib/seo'

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    ...defaultOpenGraph,
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    ...defaultTwitter,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
}

// ─── 실제 기능 3가지 ────────────────────────────────────────
const FEATURES = [
  {
    icon: ClipboardList,
    title: '맞춤형 주문서 폼',
    desc: '워크스페이스 고유 URL로 고객이 직접 의뢰서를 작성합니다. 텍스트·날짜·선택·파일 등 필드를 원하는 대로 구성하세요.',
    bullets: ['필드 타입 커스터마이징 (텍스트·날짜·선택·파일)', '일반 문의 폼 + 상세 주문서 폼 분리'],
  },
  {
    icon: Zap,
    title: '프로젝트 단계 추적',
    desc: '워크플로우 템플릿으로 단계를 정의하고, 마감일·담당자·수정 요청을 한 화면에서 관리합니다.',
    bullets: ['단계별 진행률 실시간 반영', '마감 임박·수정 미완료 알림'],
  },
  {
    icon: Link2,
    title: '고객 포털 & 납품 링크',
    desc: '암호화된 공유 링크로 납품물을 전달합니다. 고객이 직접 수정 요청을 입력하면 내부 대시보드에 바로 연동됩니다.',
    bullets: ['파일·링크 납품물 첨부', '고객 수정 요청 → 내부 자동 연동'],
  },
]

// ─── 실제 솔루션 대상 ────────────────────────────────────────
const SOLUTIONS = [
  {
    role: '프리랜서 개인',
    title: '혼자서도 체계적으로',
    desc: '고객 응대·주문 접수·납품까지 모든 흐름을 하나의 화면에서 처리합니다. 이메일과 메모장을 대체하세요.',
  },
  {
    role: '소규모 팀',
    title: '팀 협업 최적화',
    desc: '프로젝트별 담당자를 지정하고, 수정 요청을 팀 전체가 실시간으로 공유합니다. 역할별 권한 설정도 지원합니다.',
  },
  {
    role: '스튜디오 / 에이전시',
    title: '다중 프로젝트 관리',
    desc: '여러 고객·여러 프로젝트를 동시에 관리하고, 성과 분석 대시보드로 월별 완료 건수·예상 수익을 한눈에 파악합니다.',
  },
]

// ─── 실제 4단계 워크플로우 ────────────────────────────────────
const STEPS = [
  {
    title: '주문서 링크 공유',
    desc: '워크스페이스 고유 URL을 고객에게 공유합니다. 고객은 브라우저에서 의뢰서를 작성하고 파일을 첨부할 수 있습니다.',
  },
  {
    title: '한 번에 프로젝트 전환',
    desc: '접수된 의뢰를 확인하고 워크플로우 템플릿을 선택하면 프로젝트가 즉시 생성됩니다.',
  },
  {
    title: '단계별 진행 추적',
    desc: '마감일·담당자·단계 진행률이 실시간으로 반영됩니다. 수정 요청도 우선순위별로 모아서 관리합니다.',
  },
  {
    title: '납품 링크로 완료',
    desc: '암호화된 고객 포털 링크로 결과물을 전달하고, 수정 요청을 한 곳에서 처리합니다.',
  },
]

// ─── 실제 요금제 ─────────────────────────────────────────────
const FREE_FEATURES = ['프로젝트 3개', '본인 계정만 사용', '기본 주문서 폼', '납품 링크 공유']
const PRO_FEATURES = ['무제한 프로젝트', '팀원 최대 5명', '성과 분석 대시보드', '우선 고객 지원']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)] text-[var(--flowrit-text)] antialiased">

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 border-b border-[var(--flowrit-border)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 md:h-20">
          <div className="flex min-w-0 items-center gap-8 lg:gap-12">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <Image src="/FLOWRIT_icon_logo.svg" alt="Flowrit 아이콘" width={36} height={36} className="shrink-0" />
              <Image src="/FLOWRIT_text_logo.svg" alt="Flowrit" width={120} height={20} className="shrink" />
            </Link>
            <nav className="hidden items-center gap-8 lg:flex">
              {[
                { label: '기능', href: '#features' },
                { label: '활용 방법', href: '#solutions' },
                { label: '시작 방법', href: '#process' },
                { label: '요금제', href: '#pricing' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-sm font-semibold text-[var(--flowrit-text-secondary)] transition-colors hover:text-[var(--flowrit-primary)]"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="hidden px-4 py-2 text-sm font-semibold text-[var(--flowrit-text-secondary)] transition-colors hover:text-[var(--flowrit-primary)] sm:inline-flex"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="flowrit-button-primary whitespace-nowrap px-4 py-2.5 text-sm sm:px-6"
              style={{ boxShadow: '0 4px 20px rgba(79,70,229,0.2)' }}
            >
              <span className="sm:hidden">시작하기</span>
              <span className="hidden sm:inline">무료로 시작하기</span>
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ── */}
        <section
          className="overflow-hidden pb-14 pt-12 md:pb-16 md:pt-20"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(79,70,229,0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(70,72,212,0.05), transparent 40%)',
          }}
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">

            {/* Badge */}
            <div className="mb-8 flex justify-center">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(79,70,229,0.2)] bg-[rgba(79,70,229,0.05)] px-3 py-1.5 sm:px-4">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flowrit-primary)]" />
                <span className="text-center text-[11px] font-bold uppercase text-[var(--flowrit-primary)] sm:text-xs">
                  프리랜서·디자이너·개발자를 위한 업무 OS
                </span>
              </div>
            </div>

            {/* Headline */}
            <div className="mb-8 text-center">
              <h1
                className="mx-auto max-w-4xl text-[34px] font-extrabold leading-[1.12] text-[var(--flowrit-text)] md:text-[56px]"
              >
                고객 관리부터 납품까지,
                <br />
                <span className="text-[var(--flowrit-primary)]">하나의 워크스페이스</span>로 끝냅니다
              </h1>
            </div>

            {/* Sub */}
            <p className="mx-auto mb-10 max-w-2xl text-center text-base leading-relaxed text-[var(--flowrit-text-secondary)] md:mb-12 md:text-xl">
              주문서 접수 → 프로젝트 전환 → 단계별 진행 → 납품 링크 공유.
              <br />
              이메일과 메모장을 오가는 파편화된 업무를 단 하나의 도구로 통합합니다.
            </p>

            {/* CTAs */}
            <div className="mb-14 flex flex-col items-center justify-center gap-3 sm:mb-16 sm:flex-row sm:gap-4">
              <Link
                href="/register"
                className="flowrit-button-primary inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
                style={{ boxShadow: '0 12px 32px rgba(79,70,229,0.25)' }}
              >
                무료로 시작하기
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="flowrit-button-secondary inline-flex w-full max-w-sm items-center justify-center rounded-xl px-8 py-3.5 text-base font-semibold sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
              >
                기존 계정으로 로그인
              </Link>
            </div>

            {/* ── 실제 대시보드 UI 모형 (장식용) ── */}
            <div className="relative mx-auto max-w-6xl" aria-hidden="true">
              <div
                className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full sm:-left-16 sm:h-72 sm:w-72"
                style={{ background: 'rgba(79,70,229,0.07)', filter: 'blur(72px)', zIndex: -1 }}
              />
              <div
                className="pointer-events-none absolute -bottom-12 -right-10 h-44 w-44 rounded-full sm:-right-16 sm:h-64 sm:w-64"
                style={{ background: 'rgba(70,72,212,0.06)', filter: 'blur(64px)', zIndex: -1 }}
              />

              <div
                className="overflow-hidden rounded-2xl bg-white p-1.5 sm:p-2"
                style={{ boxShadow: '0 32px 64px -16px rgba(0,0,0,0.1)', border: '1px solid var(--flowrit-border)' }}
              >
                {/* Browser chrome */}
                <div className="overflow-hidden rounded-xl border border-[var(--flowrit-border)]">
                  <div className="flex h-10 items-center justify-between border-b border-[var(--flowrit-border)] bg-[#f8fafc] px-3 sm:h-11 sm:px-4">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-[#fc615d]" />
                      <span className="h-3 w-3 rounded-full bg-[#fdbc40]" />
                      <span className="h-3 w-3 rounded-full bg-[#34c749]" />
                    </div>
                    <span className="max-w-[170px] truncate rounded border border-[var(--flowrit-border)] bg-white/60 px-3 py-0.5 text-[11px] text-[var(--flowrit-text-muted)] sm:max-w-none">
                      flowrit.kr/dashboard
                    </span>
                    <div className="hidden w-14 sm:block" />
                  </div>

                  {/* App shell */}
                  <div className="flex h-[500px] bg-[#f8fafc] sm:h-[460px]">

                    {/* Sidebar */}
                    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[var(--flowrit-border)] bg-white sm:flex">
                      <div className="flex items-center gap-2 border-b border-[var(--flowrit-border)] px-4 py-3.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--flowrit-primary)] text-sm font-bold text-white">F</span>
                        <div>
                          <p className="text-xs font-semibold text-[var(--flowrit-text)]">Flowrit</p>
                          <p className="text-[10px] text-[var(--flowrit-text-muted)]">나의 스튜디오</p>
                        </div>
                      </div>
                      <nav className="flex-1 space-y-0.5 px-2 py-3">
                        {[
                          { icon: BarChart3, label: '대시보드', active: true },
                          { icon: ClipboardList, label: '주문서', badge: '4' },
                          { icon: Zap, label: '프로젝트' },
                          { icon: FilePen, label: '수정 요청', badge: '3' },
                          { icon: UserRound, label: '고객' },
                          { icon: MessageSquareText, label: '메시지' },
                        ].map(({ icon: Icon, label, active, badge }) => (
                          <div
                            key={label}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${
                              active
                                ? 'bg-[var(--flowrit-primary-soft)] text-[var(--flowrit-primary)]'
                                : 'text-[var(--flowrit-text-muted)]'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1">{label}</span>
                            {badge && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${active ? 'bg-[var(--flowrit-primary)] text-white' : 'bg-rose-100 text-rose-600'}`}>
                                {badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </nav>
                    </aside>

                    {/* Main dashboard */}
                    <div className="flex-1 overflow-hidden p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-3 sm:items-center">
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-[var(--flowrit-primary)]">Workspace overview</p>
                          <p className="mt-0.5 text-base font-bold text-[var(--flowrit-text)]">대시보드</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                          <span className="rounded-lg border border-[var(--flowrit-border)] bg-white px-2.5 py-1 text-[10px] font-medium text-[var(--flowrit-text-muted)]">이번 달</span>
                          <span className="flex items-center gap-1 rounded-lg bg-[var(--flowrit-primary)] px-2 py-1 text-[10px] font-semibold text-white sm:px-2.5">
                            <Plus className="h-3 w-3" />
                            <span className="hidden sm:inline">새 프로젝트</span>
                          </span>
                        </div>
                      </div>

                      {/* 파이프라인 stat cards */}
                      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {[
                          { icon: Zap, label: '진행 중', count: '7', bg: 'bg-[var(--flowrit-primary-soft)]', color: 'text-[var(--flowrit-primary)]' },
                          { icon: Clock, label: '마감 임박', count: '2', bg: 'bg-orange-50', color: 'text-orange-600' },
                          { icon: FilePen, label: '미완료 수정', count: '3', bg: 'bg-rose-50', color: 'text-rose-600' },
                          { icon: Inbox, label: '미확인 주문', count: '4', bg: 'bg-sky-50', color: 'text-sky-600' },
                        ].map((s) => {
                          const Icon = s.icon
                          return (
                            <div key={s.label} className="rounded-xl border border-[var(--flowrit-border)] bg-white p-3">
                              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${s.bg}`}>
                                <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                              </div>
                              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                              <p className="mt-0.5 text-[10px] text-[var(--flowrit-text-muted)]">{s.label}</p>
                            </div>
                          )
                        })}
                      </div>

                      {/* 오늘의 우선순위 */}
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--flowrit-text)]">오늘의 우선순위</p>
                        <span className="text-[10px] text-[var(--flowrit-text-muted)]">마감 임박 · 수정 요청</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { title: '브랜드 상세페이지 제작', customer: '스튜디오 오렌지', stage: '디자인 확정', badge: '수정 2건', badgeCls: 'text-rose-600 bg-rose-50', urgent: true },
                          { title: '카페 메뉴판 리뉴얼', customer: '카페 봄날', stage: '최종 검토', badge: 'D-1', badgeCls: 'text-orange-600 bg-orange-50', urgent: true },
                          { title: '앱 소개 영상 편집', customer: '모바일 앱사', stage: '납품 준비', badge: '진행 중', badgeCls: 'text-[var(--flowrit-primary)] bg-[var(--flowrit-primary-soft)]', urgent: false },
                        ].map((p) => (
                          <div
                            key={p.title}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                              p.urgent ? 'border-orange-200 bg-orange-50/60' : 'border-[var(--flowrit-border)] bg-white'
                            }`}
                          >
                            {p.urgent && (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-[var(--flowrit-text)]">{p.title}</p>
                              <p className="text-[10px] text-[var(--flowrit-text-muted)]">{p.customer} · {p.stage}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.badgeCls}`}>
                              {p.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="mb-10 md:mb-16">
              <h2
                className="mb-4 text-[28px] font-bold leading-tight text-[var(--flowrit-text)] md:text-4xl"
              >
                이메일과 메모장에서 벗어나세요
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-[var(--flowrit-text-secondary)] md:text-xl">
                의뢰 접수부터 납품까지, 프리랜서가 실제로 필요한 기능만 담았습니다.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <article
                    key={feature.title}
                    className="group rounded-2xl bg-[var(--flowrit-panel-subtle)] p-6 transition-all duration-300 hover:bg-white hover:shadow-xl md:p-8"
                    style={{ border: '1px solid var(--flowrit-border)' }}
                  >
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(79,70,229,0.07)] text-[var(--flowrit-primary)] transition-colors group-hover:bg-[var(--flowrit-primary)] group-hover:text-white">
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="mb-4 text-xl font-semibold text-[var(--flowrit-text)] md:text-2xl">{feature.title}</h3>
                    <p className="mb-6 leading-relaxed text-[var(--flowrit-text-secondary)]">{feature.desc}</p>
                    <ul className="space-y-2">
                      {feature.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-[var(--flowrit-text-secondary)]">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--flowrit-primary)]" aria-hidden="true" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Solutions by Role ── */}
        <section id="solutions" className="bg-[var(--flowrit-panel-subtle)] py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="mb-10 text-center md:mb-16">
              <h2
                className="mb-4 text-[28px] font-bold leading-tight text-[var(--flowrit-text)] md:text-4xl"
              >
                어떤 규모든 맞는 방법이 있습니다
              </h2>
              <p className="text-base leading-relaxed text-[var(--flowrit-text-secondary)] md:text-xl">
                프리랜서 개인부터 팀, 스튜디오까지 Flowrit 하나로 운영합니다.
              </p>
            </div>
            <div
              className="grid grid-cols-1 overflow-hidden rounded-3xl border border-[var(--flowrit-border)] lg:grid-cols-3"
              style={{ background: 'var(--flowrit-border)', gap: '1px' }}
            >
              {SOLUTIONS.map((s) => (
                <div key={s.role} className="bg-white p-6 transition-colors hover:bg-[var(--flowrit-panel-subtle)] md:p-12">
                  <span className="mb-4 block text-sm font-bold uppercase text-[var(--flowrit-primary)]">
                    {s.role}
                  </span>
                  <h3 className="mb-4 text-xl font-bold text-[var(--flowrit-text)] md:text-2xl">{s.title}</h3>
                  <p className="leading-relaxed text-[var(--flowrit-text-secondary)]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Process ── */}
        <section id="process" className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">

              {/* Steps */}
              <div>
                <h2
                  className="mb-8 text-[28px] font-bold leading-tight text-[var(--flowrit-text)] md:mb-10 md:text-4xl"
                >
                  의뢰에서 납품까지
                  <br />
                  4단계로 끝납니다
                </h2>
                <div className="space-y-6 md:space-y-8">
                  {STEPS.map((step, i) => (
                    <div key={step.title} className="flex gap-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--flowrit-primary)] text-lg font-bold text-white">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="mb-1.5 text-lg font-bold text-[var(--flowrit-text)]">{step.title}</h4>
                        <p className="leading-relaxed text-[var(--flowrit-text-secondary)]">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 실제 주문서 관리 UI 모형 (장식용) */}
              <div
                className="overflow-hidden rounded-3xl bg-white shadow-xl"
                style={{ border: '1px solid var(--flowrit-border)' }}
                aria-hidden="true"
              >
                {/* 상단 헤더 */}
                <div className="border-b border-[var(--flowrit-border)] px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3 sm:items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--flowrit-text)]">주문서 관리</p>
                      <p className="text-xs text-[var(--flowrit-text-muted)]">고객 의뢰를 프로젝트로 전환합니다</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--flowrit-border)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--flowrit-text-muted)]">
                      <ExternalLink className="h-3 w-3" />
                      <span className="hidden sm:inline">주문서 열기</span>
                      <span className="sm:hidden">열기</span>
                    </span>
                  </div>
                </div>

                {/* 3단계 안내 */}
                <div className="grid grid-cols-3 border-b border-[var(--flowrit-border)]">
                  {[
                    { icon: Inbox, label: '접수', desc: '주문서 링크로 의뢰 수신' },
                    { icon: CheckCircle2, label: '검토', desc: '내용·일정 확인' },
                    { icon: Zap, label: '전환', desc: '프로젝트 즉시 생성' },
                  ].map(({ icon: Icon, label, desc }, idx) => (
                    <div key={label} className={`px-2 py-4 text-center sm:px-4 ${idx < 2 ? 'border-r border-[var(--flowrit-border)]' : ''}`}>
                      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--flowrit-primary-soft)]">
                        <Icon className="h-4 w-4 text-[var(--flowrit-primary)]" />
                      </div>
                      <p className="text-xs font-bold text-[var(--flowrit-text)]">{label}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--flowrit-text-muted)]">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* 폼 링크 */}
                <div className="border-b border-[var(--flowrit-border)] px-4 py-3 sm:px-6">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[var(--flowrit-text-secondary)]">주문서 폼</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--flowrit-text-muted)]">flowrit.kr/order/my-studio</p>
                    </div>
                    <span className="shrink-0 rounded bg-[var(--flowrit-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--flowrit-primary)]">복사</span>
                  </div>
                </div>

                {/* 접수된 의뢰 목록 */}
                <div className="divide-y divide-[var(--flowrit-border)]">
                  {[
                    { name: '김민준', contact: 'minjun@brand.co', content: '브랜드 아이덴티티 디자인 의뢰드립니다. 로고부터 명함, 소셜미디어 템플릿까지...', type: '주문서', date: '오늘' },
                    { name: '이서연', contact: 'seoyeon@cafe.kr', content: '카페 메뉴판 리뉴얼 작업 문의드립니다. A4 2페이지 분량으로...', type: '문의', date: '어제' },
                  ].map((item) => (
                    <div key={item.name} className="px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-sm font-bold text-violet-700">
                            {item.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--flowrit-text)]">{item.name}</p>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${item.type === '주문서' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
                                {item.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--flowrit-text-muted)]">{item.contact}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-[var(--flowrit-text-muted)]">{item.date}</span>
                      </div>
                      <p className="mt-2.5 line-clamp-2 text-xs text-[var(--flowrit-text-secondary)]">{item.content}</p>
                      <div className="mt-3 flex justify-end gap-2 border-t border-[var(--flowrit-border)] pt-2.5">
                        <span className="rounded-lg border border-[var(--flowrit-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--flowrit-text-muted)]">무시</span>
                        <span className="rounded-lg bg-[var(--flowrit-primary)] px-2.5 py-1 text-[11px] font-semibold text-white">프로젝트로 전환</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-[var(--flowrit-panel-subtle)] py-16 md:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="mb-10 text-center md:mb-16">
              <h2
                className="mb-4 text-[28px] font-bold leading-tight text-[var(--flowrit-text)] md:text-4xl"
              >
                간단하고 합리적인 요금제
              </h2>
              <p className="text-base leading-relaxed text-[var(--flowrit-text-secondary)] md:text-xl">
                무료로 시작하고, 팀이 커지면 Pro로 전환하세요.
              </p>
            </div>
            <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">

              {/* Free */}
              <article
                className="flex flex-col rounded-3xl bg-white p-6 md:p-10"
                style={{ border: '1px solid var(--flowrit-border)' }}
              >
                <h3 className="mb-2 text-xl font-bold text-[var(--flowrit-text)]">무료</h3>
                <div className="mb-3">
                  <span className="text-4xl font-bold text-[var(--flowrit-text)]">₩0</span>
                  <span className="text-[var(--flowrit-text-secondary)]"> /월</span>
                </div>
                <p className="mb-8 text-sm text-[var(--flowrit-text-muted)]">개인 프리랜서, 시작 단계에 적합합니다.</p>
                <ul className="mb-10 flex-grow space-y-4">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[var(--flowrit-text)]">
                      <Check className="h-5 w-5 shrink-0 text-[var(--flowrit-primary)]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="w-full rounded-xl border border-[var(--flowrit-primary)] py-4 text-center font-bold text-[var(--flowrit-primary)] transition-colors hover:bg-[rgba(79,70,229,0.04)]"
                >
                  무료로 시작하기
                </Link>
              </article>

              {/* Pro */}
              <article
                className="relative flex flex-col overflow-hidden rounded-3xl p-6 text-white md:p-10"
                style={{ background: 'var(--flowrit-primary)', boxShadow: '0 24px 48px rgba(79,70,229,0.3)' }}
              >
                <div className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">
                  추천
                </div>
                <h3 className="mb-2 text-xl font-bold">Pro</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold">₩29,900</span>
                  <span className="text-white/80"> /월</span>
                </div>
                <p className="mb-8 text-sm text-white/70">연간 결제 시 ₩298,000 (17% 할인)</p>
                <ul className="mb-10 flex-grow space-y-4">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <Check className="h-5 w-5 shrink-0 text-white/80" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="w-full rounded-xl bg-white py-4 text-center font-bold text-[var(--flowrit-primary)] transition-colors hover:bg-slate-100"
                >
                  Pro로 시작하기
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-16 text-center text-white md:py-24" style={{ backgroundColor: 'var(--flowrit-ink)' }}>
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2
              className="mb-6 text-[28px] font-bold leading-tight text-white md:mb-8 md:text-4xl"
            >
              지금 바로 업무 방식을 바꿔보세요
            </h2>
            <p className="mb-10 text-base leading-relaxed text-white/75 md:mb-12 md:text-xl">
              5분이면 워크스페이스를 만들고 주문서 링크를 공유할 수 있습니다.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="flowrit-button-primary w-full max-w-sm rounded-xl px-10 py-4 text-base font-bold sm:w-auto sm:px-12 sm:py-5 sm:text-lg"
                style={{ boxShadow: '0 8px 32px rgba(79,70,229,0.2)' }}
              >
                무료로 시작하기
              </Link>
              <Link
                href="/login"
                className="w-full max-w-sm rounded-xl bg-white/10 px-10 py-4 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:w-auto sm:px-12 sm:py-5 sm:text-lg"
              >
                로그인
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--flowrit-border)] bg-white pb-8 pt-12 md:pt-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-10 grid grid-cols-2 gap-8 md:mb-12 md:grid-cols-4 md:gap-12 lg:grid-cols-5">
            <div className="col-span-2">
              <Link href="/" className="mb-6 flex items-center gap-2">
                <Image src="/FLOWRIT_icon_logo.svg" alt="Flowrit 아이콘" width={30} height={30} />
                <Image src="/FLOWRIT_text_logo.svg" alt="Flowrit" width={100} height={16} />
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-[var(--flowrit-text-secondary)]">
                프리랜서·디자이너·개발자를 위한 AI Workflow OS. 고객 관리, 프로젝트 진행, 납품까지 한 곳에서.
              </p>
            </div>
            <FooterLinks title="서비스" links={[
              { label: '주요 기능', href: '#features' },
              { label: '요금제', href: '#pricing' },
              { label: '시작 방법', href: '#process' },
            ]} />
            <FooterLinks title="계정" links={[
              { label: '회원가입', href: '/register' },
              { label: '로그인', href: '/login' },
            ]} />
            <FooterLinks title="법적 고지" links={[
              { label: '이용약관', href: '/terms' },
              { label: '개인정보처리방침', href: '/privacy' },
            ]} />
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--flowrit-border)] pt-8 text-xs text-[var(--flowrit-text-muted)] md:flex-row">
            <p>© {new Date().getFullYear()} Flowrit. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="transition-colors hover:text-[var(--flowrit-primary)]">이용약관</Link>
              <Link href="/privacy" className="transition-colors hover:text-[var(--flowrit-primary)]">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterLinks({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h5 className="mb-5 font-bold text-[var(--flowrit-text)]">{title}</h5>
      <ul className="space-y-3.5">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-[var(--flowrit-text-secondary)] transition-colors hover:text-[var(--flowrit-primary)]"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
