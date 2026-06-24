'use client'

import { useActionState } from 'react'
import {
  createMessageTemplate,
  updateMessageTemplate,
  type MessageFormState,
} from '@/lib/actions/message'
import { useFormToast } from '@/hooks/use-form-toast'

type MessageTemplate = {
  id: string
  name: string
  content: string
}

type MessageFormProps = {
  mode: 'create' | 'edit'
  template?: MessageTemplate
  onSuccess?: () => void
}

const initialState: MessageFormState = {}

const VARIABLES = ['{고객명}', '{단계}', '{마감일}', '{공유링크}']

export function MessageForm({ mode, template, onSuccess }: MessageFormProps) {
  const action = mode === 'create' ? createMessageTemplate : updateMessageTemplate
  const [state, formAction, pending] = useActionState(
    async (prev: MessageFormState, formData: FormData) => {
      const result = await action(prev, formData)
      if (result.success) onSuccess?.()
      return result
    },
    initialState
  )
  useFormToast(state)

  return (
    <form action={formAction} className="space-y-4">
      {template && <input type="hidden" name="id" value={template.id} />}

      <div>
        <label
          className="mb-1 block text-sm font-medium text-gray-700"
          htmlFor={`msg-name-${template?.id ?? 'new'}`}
        >
          템플릿 이름
        </label>
        <input
          id={`msg-name-${template?.id ?? 'new'}`}
          name="name"
          required
          defaultValue={template?.name ?? ''}
          placeholder="예: 결과물 전달 안내"
          className="flowrit-input"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            className="text-sm font-medium text-gray-700"
            htmlFor={`msg-content-${template?.id ?? 'new'}`}
          >
            내용
          </label>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => (
            <code
              key={v}
              className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700"
            >
              {v}
            </code>
          ))}
        </div>
        <textarea
          id={`msg-content-${template?.id ?? 'new'}`}
          name="content"
          required
          rows={6}
          defaultValue={template?.content ?? ''}
          placeholder={`안녕하세요 {고객명}님,\n{단계} 단계가 완료되었습니다.\n결과물 확인: {공유링크}`}
          className="flowrit-input leading-relaxed"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flowrit-button-primary min-h-9 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '저장 중...' : mode === 'create' ? '템플릿 생성' : '변경사항 저장'}
      </button>
    </form>
  )
}
