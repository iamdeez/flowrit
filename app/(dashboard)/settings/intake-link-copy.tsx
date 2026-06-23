'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Tooltip } from '@/components/tooltip'

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-[var(--flowrit-text-secondary)]">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--flowrit-text-secondary)]">{url}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip content="미리보기">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--flowrit-text-muted)] transition-colors hover:bg-white hover:text-[var(--flowrit-text)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Tooltip>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--flowrit-text-secondary)] transition-colors hover:bg-white"
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600">복사됨</span></>
            ) : (
              <><Copy className="h-3.5 w-3.5" />복사</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function IntakeLinkCopy({ slug }: { slug: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const intakeUrl = `${appUrl}/intake/${slug}`
  const orderUrl = `${appUrl}/order/${slug}`

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-[var(--flowrit-text)]">공유 링크</p>
        <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
          이 링크를 명함, 인스타그램, 카카오톡 프로필에 공유하면 고객이 로그인 없이 접수할 수 있습니다.
        </p>
      </div>
      <div className="space-y-3">
        <LinkRow label="일반 문의 폼" url={intakeUrl} />
        <LinkRow label="주문서 폼" url={orderUrl} />
      </div>
      <p className="text-xs text-[var(--flowrit-text-muted)]">
        슬러그를 변경하면 이 링크도 바뀝니다. 기존에 공유한 링크는 더 이상 작동하지 않으니 주의하세요.
      </p>
    </div>
  )
}
