'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { createPublicPage, togglePublicPage } from '@/lib/actions/publicPage'

type PublicPage = {
  id: string
  token: string
  isActive: boolean
}

export function PublicPageForm({
  projectId,
  publicPage,
}: {
  projectId: string
  publicPage: PublicPage | null
}) {
  const [copied, setCopied] = useState(false)
  const [pending, setPending] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl = publicPage ? `${appUrl}/p/${publicPage.token}` : null

  async function handleCreate() {
    setPending(true)
    try {
      await createPublicPage(projectId)
    } finally {
      setPending(false)
    }
  }

  async function handleToggle() {
    if (!publicPage) return
    setPending(true)
    try {
      await togglePublicPage(publicPage.id, !publicPage.isActive)
    } finally {
      setPending(false)
    }
  }

  async function handleCopy() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!publicPage) {
    return (
      <button
        type="button"
        onClick={handleCreate}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" />
        {pending ? '생성 중...' : '공유 링크 생성'}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
          publicPage.isActive
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        {publicPage.isActive ? '공유 중' : '비활성'}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!publicPage.isActive}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? '복사됨' : '링크 복사'}
      </button>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? '처리 중...' : publicPage.isActive ? '비활성화' : '활성화'}
      </button>
    </div>
  )
}
