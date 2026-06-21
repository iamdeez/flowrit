'use client'

import { useState } from 'react'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { deleteMessageTemplate } from '@/lib/actions/message'
import { MessageForm } from './message-form'

type Template = {
  id: string
  name: string
  content: string
}

export function MessagesPageClient({ templates }: { templates: Template[] }) {
  const [editing, setEditing] = useState<Template | null>(null)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(360px,480px)] gap-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-gray-700">
          템플릿 목록 ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-gray-900">등록된 메시지 템플릿이 없습니다.</p>
            <p className="mt-1 text-sm text-gray-500">오른쪽에서 첫 템플릿을 만들어 보세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <article
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <p className="pt-1.5 text-sm font-semibold text-gray-900">{t.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      편집
                    </button>
                    <form action={deleteMessageTemplate}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
                <p className="ml-12 line-clamp-2 whitespace-pre-wrap text-sm text-gray-500">
                  {t.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          {editing ? '템플릿 편집' : '새 템플릿'}
        </h2>
        <MessageForm
          key={editing?.id ?? 'create'}
          mode={editing ? 'edit' : 'create'}
          template={editing ?? undefined}
          onSuccess={() => setEditing(null)}
        />
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            취소 (새 템플릿 생성 모드로)
          </button>
        )}
      </aside>
    </div>
  )
}
