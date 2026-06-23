'use client'

import { useActionState, useState } from 'react'
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
}: {
  defaultName: string
  defaultSlug: string
}) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState)
  useFormToast(state)

  const [name, setName] = useState(defaultName)
  const [slug, setSlug] = useState(defaultSlug)
  const [slugTouched, setSlugTouched] = useState(false)

  function handleNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(toSlug(v) || defaultSlug)
  }

  function handleSlugChange(v: string) {
    setSlugTouched(true)
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
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
        <p className="mt-1 text-xs text-[var(--flowrit-text-muted)]">
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
        <p className="mt-1 text-xs text-[var(--flowrit-text-muted)]">
          의뢰 접수 폼 주소로 사용됩니다. 영소문자·숫자·하이픈만 가능.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-[var(--flowrit-danger-soft)] px-3 py-2 text-sm text-[var(--flowrit-danger-text)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim() || !slug.trim()}
        className="flowrit-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '설정 중...' : 'Flowrit 시작하기 →'}
      </button>
    </form>
  )
}
