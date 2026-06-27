'use client'

import { useState, useActionState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, FlaskConical, Loader2, MapPin, MessageCircle, Search } from 'lucide-react'
import { sendTestInquiry } from '@/lib/actions/testWebhook'
import { TabNav } from '@/components/ui/tab-nav'

// ─── 플랫폼 정보 ──────────────────────────────────────────────────────────────

type Platform = {
  id: string
  name: string
  settingsPath: string
  steps: string[]
}

const PLATFORMS: Platform[] = [
  {
    id: 'instagram',
    name: '인스타그램',
    settingsPath: 'Meta Business Suite → 인박스 → 자동화 도구 → 키워드 자동 응답',
    steps: [
      'Meta Business Suite(business.facebook.com)에 접속합니다.',
      '왼쪽 메뉴에서 인박스 → 자동화 도구를 선택합니다.',
      '키워드 자동 응답 만들기를 클릭합니다.',
      '"문의", "촬영", "예약", "가격", "견적" 등을 키워드로 추가합니다.',
      '응답 메시지에 아래 문구를 붙여넣습니다.',
    ],
  },
  {
    id: 'kakao',
    name: '카카오 채널',
    settingsPath: '카카오 비즈니스 → 채널 관리자센터 → 스마트채팅',
    steps: [
      '카카오 비즈니스(business.kakao.com)에 접속합니다.',
      '채널 관리자센터에서 내 채널을 선택합니다.',
      '스마트채팅 → 기본형 → 인사말 설정을 선택합니다.',
      '또는 키워드 응답으로 "문의", "촬영" 등을 추가합니다.',
      '응답 메시지에 아래 문구를 붙여넣습니다.',
    ],
  },
  {
    id: 'naver',
    name: '네이버 톡톡',
    settingsPath: '네이버 스마트플레이스 → 채널 관리 → 자동응답',
    steps: [
      '네이버 스마트플레이스(smartplace.naver.com)에 접속합니다.',
      '업체 관리 → 채널 관리 → 네이버 톡톡을 선택합니다.',
      '자동응답 관리 → 첫 방문 환영 인사를 설정합니다.',
      '또는 키워드 자동응답을 추가합니다.',
      '응답 메시지에 아래 문구를 붙여넣습니다.',
    ],
  },
]

// ─── 서브 컴포넌트: 복사 버튼 ─────────────────────────────────────────────────

function CopyButton({ text, label = '복사' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        copied
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-[var(--flowrit-panel-subtle)] text-[var(--flowrit-text-secondary)] hover:bg-white hover:text-[var(--flowrit-text)]'
      } border border-[var(--flowrit-border)]`}
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5 text-emerald-500" />복사됨</>
      ) : (
        <><Copy className="h-3.5 w-3.5" />{label}</>
      )}
    </button>
  )
}

// ─── 서브 컴포넌트: 플랫폼 가이드 ────────────────────────────────────────────

function PlatformGuide({ platform, intakeUrl }: { platform: Platform; intakeUrl: string }) {
  const messageTemplate = `안녕하세요! 문의해 주셔서 감사합니다.\n\n아래 링크에서 의뢰 내용을 작성해 주시면\n빠르게 확인 후 연락드리겠습니다.\n\n${intakeUrl}\n\n감사합니다.`

  return (
    <div className="space-y-4">
      {/* 설정 위치 안내 */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold text-amber-800">설정 위치</p>
          <p className="mt-0.5 text-xs text-amber-700">{platform.settingsPath}</p>
        </div>
      </div>

      {/* 단계별 안내 */}
      <ol className="space-y-2">
        {platform.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--flowrit-primary-soft)] text-[10px] font-bold text-[var(--flowrit-primary-soft-text)]">
              {i + 1}
            </span>
            <p className="text-sm text-[var(--flowrit-text-secondary)]">{step}</p>
          </li>
        ))}
      </ol>

      {/* 복사 가능한 응답 메시지 */}
      <div className="rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)]">
        <div className="flex items-center justify-between border-b border-[var(--flowrit-border)] px-3 py-2">
          <p className="text-xs font-semibold text-[var(--flowrit-text-secondary)]">자동 응답 메시지 (붙여넣기 바로 가능)</p>
          <CopyButton text={messageTemplate} label="메시지 복사" />
        </div>
        <pre className="whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-[var(--flowrit-text)]">
          {messageTemplate}
        </pre>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트: 고급 Webhook ─────────────────────────────────────────────

function AdvancedWebhook({ webhookUrl }: { webhookUrl: string }) {
  const [testState, testAction, isPending] = useActionState(sendTestInquiry, {})

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Authorization: Bearer {WEBHOOK_SECRET}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"홍길동","contact":"010-0000-0000","content":"문의 내용","source":"instagram"}'`

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--flowrit-text-muted)]">
        Zapier · Make 등을 통해 플랫폼 메시지를 자동으로 의뢰로 전환합니다. 설정에는 약간의 기술 지식이 필요합니다.
      </p>

      {/* 엔드포인트 */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--flowrit-text-muted)]">Webhook 엔드포인트</p>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate text-xs text-[var(--flowrit-text-secondary)]">
            POST {webhookUrl}
          </code>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={webhookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="엔드포인트 새 탭에서 열기"
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--flowrit-text-muted)] hover:bg-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <CopyButton text={webhookUrl} />
          </div>
        </div>
      </div>

      {/* 인증 */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--flowrit-text-muted)]">인증 헤더</p>
        <div className="rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-3 py-2.5">
          <code className="text-xs text-[var(--flowrit-text-secondary)]">
            Authorization: Bearer{' '}
            <span className="rounded bg-amber-100 px-1 text-amber-800">{'{WEBHOOK_SECRET}'}</span>
          </code>
        </div>
        <p className="text-xs text-[var(--flowrit-text-muted)]">
          서버 환경변수 <code className="rounded bg-gray-100 px-1 font-mono text-xs">WEBHOOK_SECRET</code>에 임의의 비밀 문자열을 설정하세요.
        </p>
      </div>

      {/* 요청 본문 */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-[var(--flowrit-text-muted)]">요청 본문 (JSON)</p>
        <div className="rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-3 py-3 font-mono text-xs leading-relaxed text-[var(--flowrit-text-secondary)]">
          {'{'}<br />
          &nbsp;&nbsp;<span className="text-indigo-600">&quot;name&quot;</span>: <span className="text-emerald-700">&quot;고객 이름&quot;</span><span className="text-gray-400 not-italic font-sans">&nbsp;&nbsp;// 필수</span><br />
          &nbsp;&nbsp;<span className="text-indigo-600">&quot;contact&quot;</span>: <span className="text-emerald-700">&quot;010-0000-0000&quot;</span><span className="text-gray-400 not-italic font-sans">&nbsp;&nbsp;// 선택</span><br />
          &nbsp;&nbsp;<span className="text-indigo-600">&quot;content&quot;</span>: <span className="text-emerald-700">&quot;문의 내용&quot;</span><span className="text-gray-400 not-italic font-sans">&nbsp;&nbsp;// 필수</span><br />
          &nbsp;&nbsp;<span className="text-indigo-600">&quot;source&quot;</span>: <span className="text-emerald-700">&quot;instagram&quot;</span><span className="text-gray-400 not-italic font-sans">&nbsp;&nbsp;// 선택: instagram | kakao | naver</span><br />
          {'}'}
        </div>
      </div>

      {/* curl 예시 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--flowrit-text-muted)]">curl 테스트 예시</p>
          <CopyButton text={curlExample} />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-3 py-3 text-[11px] leading-relaxed text-[var(--flowrit-text-secondary)]">
          {curlExample}
        </pre>
      </div>

      {/* 테스트 버튼 */}
      <div className="border-t border-[var(--flowrit-border)] pt-4">
        <p className="mb-2 text-xs text-[var(--flowrit-text-muted)]">
          아래 버튼을 누르면 대시보드에 테스트 의뢰가 생성됩니다.
        </p>
        <div className="flex items-center gap-3">
          <form action={testAction}>
            <button
              type="submit"
              disabled={isPending}
              className="flowrit-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              테스트 의뢰 보내기
            </button>
          </form>
          {testState.success && (
            <p className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              대시보드에서 확인하세요
            </p>
          )}
          {testState.error && (
            <p className="text-sm text-red-600">{testState.error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function WebhookInfo({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState('instagram')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const intakeUrl = `${appUrl}/intake/${slug}`
  const webhookUrl = `${appUrl}/api/webhooks/intake/${slug}`

  const activePlatform = PLATFORMS.find((p) => p.id === activeTab) ?? PLATFORMS[0]

  return (
    <div className="space-y-5">
      {/* 제목 */}
      <div>
        <p className="text-sm font-medium text-[var(--flowrit-text)]">플랫폼 자동 응답 설정</p>
        <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
          인스타그램·카카오·네이버 톡톡에서 메시지가 오면 의뢰 링크를 자동으로 보내도록 설정합니다.
        </p>
      </div>

      {/* 플랫폼 탭 */}
      <TabNav
        activeKey={activeTab}
        onSelect={setActiveTab}
        items={PLATFORMS.map((p) => ({
          key: p.id,
          label: (
            <>
              {p.id === 'instagram' ? (
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {p.name}
            </>
          ),
        }))}
      />

      {/* 플랫폼별 가이드 */}
      <PlatformGuide platform={activePlatform} intakeUrl={intakeUrl} />

      {/* 고급 Webhook 섹션 (접기/펼치기) */}
      <div className="border-t border-[var(--flowrit-border)] pt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--flowrit-text-secondary)]">
              고급: Webhook 자동 의뢰 생성
            </p>
            <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
              Zapier · Make 연동으로 메시지를 의뢰로 자동 전환 (기술 설정 필요)
            </p>
          </div>
          {advancedOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[var(--flowrit-text-muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--flowrit-text-muted)]" />
          )}
        </button>

        {advancedOpen && (
          <div className="mt-4">
            <AdvancedWebhook webhookUrl={webhookUrl} />
          </div>
        )}
      </div>
    </div>
  )
}
