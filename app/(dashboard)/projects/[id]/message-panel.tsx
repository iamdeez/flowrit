'use client'

import { useState } from 'react'
import { Check, Copy, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { applyTemplateVars } from '@/lib/utils/messageTemplate'

type Template = {
  id: string
  name: string
  content: string
}

type MessagePanelProps = {
  templates: Template[]
  customerName: string
  stageName: string
  dueDate: string
  shareLink: string
}

const VARIABLES = [
  { token: '{고객명}', value: 'customerName' },
  { token: '{단계}', value: 'stageName' },
  { token: '{마감일}', value: 'dueDate' },
  { token: '{공유링크}', value: 'shareLink' },
] as const

export function MessagePanel({
  templates,
  customerName,
  stageName,
  dueDate,
  shareLink,
}: MessagePanelProps) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const selected = templates.find((t) => t.id === selectedId)
  const preview = selected
    ? applyTemplateVars(selected.content, { customerName, stageName, dueDate, shareLink })
    : null

  async function handleCopy() {
    if (!preview) return
    await navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-lg bg-indigo-50 p-3">
        <p className="mb-1.5 text-xs font-medium text-indigo-800">현재 프로젝트 변수값</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-indigo-700">
          <span><code className="font-mono">{'{고객명}'}</code> → {customerName}</span>
          <span><code className="font-mono">{'{단계}'}</code> → {stageName}</span>
          <span><code className="font-mono">{'{마감일}'}</code> → {dueDate}</span>
          <span className="col-span-2 truncate"><code className="font-mono">{'{공유링크}'}</code> → {shareLink}</span>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-500">
            등록된 메시지 템플릿이 없습니다.{' '}
            <Link href="/messages" className="font-medium text-indigo-600 hover:text-indigo-800">
              메시지 관리
            </Link>
            에서 추가하세요.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              템플릿 선택
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flowrit-input"
            >
              <option value="">— 템플릿을 선택하세요 —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {preview && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">미리보기</label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flowrit-button-secondary min-h-8 px-3 py-1.5"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? '복사됨!' : '클립보드 복사'}
                </button>
              </div>
              <div className="min-h-32 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
                {preview}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
