'use client'

import { useActionState, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { completeOnboarding, type OnboardingState } from './actions'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: OnboardingState = {}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/[가-힣\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function OnboardingForm({
  defaultName,
  defaultSlug,
  appUrl,
}: {
  defaultName: string
  defaultSlug: string
  appUrl: string
}) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState)
  useFormToast(state)

  const [name, setName] = useState(defaultName)
  const [slug, setSlug] = useState(defaultSlug)
  const [slugTouched, setSlugTouched] = useState(false)
  const [copied, setCopied] = useState(false)
  const orderUrl = `${appUrl}/order/${slug || defaultSlug}`

  function handleNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(toSlug(v) || defaultSlug)
  }

  function handleSlugChange(v: string) {
    setSlugTouched(true)
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setCopied(false)
  }

  async function copyOrderUrl() {
    await navigator.clipboard.writeText(orderUrl)
    setCopied(true)
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="workspaceName" value={name} />
      <input type="hidden" name="workspaceSlug" value={slug} />

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          워크스페이스 이름
        </label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="홍길동 스튜디오"
          className="flowrit-input"
          maxLength={50}
          required
        />
        <p className="flowrit-form-help">
          고객·팀원에게 표시되는 이름입니다.
        </p>
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          워크스페이스 URL
        </label>
        <div className="flex items-center rounded-lg border border-[var(--flowrit-border-strong)] bg-white focus-within:outline focus-within:outline-2 focus-within:outline-[var(--flowrit-primary)]">
          <span className="pl-3 pr-1 text-sm text-[var(--flowrit-text-muted)] whitespace-nowrap select-none">
            flowrit.app/
          </span>
          <input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="my-studio"
            className="min-h-10 flex-1 rounded-r-lg bg-transparent py-2 pr-3 text-sm outline-none"
            maxLength={40}
            required
          />
        </div>
        <p className="flowrit-form-help">
          의뢰 접수 폼 주소로 사용됩니다. 영소문자·숫자·하이픈만 가능.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] p-3">
        <p className="text-xs font-semibold text-[var(--flowrit-text-secondary)]">첫 주문서 링크</p>
        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--flowrit-text)]">{orderUrl}</p>
          <button
            type="button"
            onClick={copyOrderUrl}
            className="flowrit-icon-button"
            aria-label="주문서 링크 복사"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        <p className="flowrit-form-help">설정 후 대시보드에서도 언제든지 복사할 수 있습니다.</p>
      </div>

      {state?.error && (
        <p className="flowrit-form-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim() || !slug.trim()}
        className="flowrit-button-primary w-full"
      >
        {pending ? '설정 중...' : 'Flowrit 시작하기 →'}
      </button>
    </form>
  )
}
