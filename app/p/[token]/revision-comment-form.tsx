'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import type { PublicCommentFormState } from '@/lib/actions/publicRevisionComment'
import { addClientRevisionComment } from '@/lib/actions/publicRevisionComment'

type RevisionComment = {
  id: string
  authorType: string
  authorName: string
  content: string
  createdAt: Date | string
  parentId: string | null
  replies: {
    id: string
    authorType: string
    authorName: string
    content: string
    createdAt: Date | string
    parentId: string | null
  }[]
}

type Props = {
  token: string
  revisionId: string
  parentId?: string
  comments: RevisionComment[]
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flowrit-button-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '등록 중...' : label}
    </button>
  )
}

export function RevisionCommentForm({ token, revisionId, parentId, comments }: Props) {
  const [state, formAction] = useActionState<PublicCommentFormState, FormData>(
    addClientRevisionComment,
    {}
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div className="mt-4">
      {comments.length > 0 && (
        <div className="mb-4 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{comment.authorName}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
              </div>

              {comment.replies.length > 0 && (
                <div className="ml-4 space-y-2 border-l-2 border-gray-100 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{reply.authorName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(reply.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flowrit-panel-padded space-y-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="revisionId" value={revisionId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        {state.success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">댓글이 등록되었습니다.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`name-${revisionId}`} className="text-xs font-medium text-gray-700">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id={`name-${revisionId}`}
              name="authorName"
              type="text"
              required
              maxLength={100}
              placeholder="이름을 입력하세요"
              className="flowrit-input mt-1"
            />
          </div>
          <div>
            <label htmlFor={`email-${revisionId}`} className="text-xs font-medium text-gray-700">
              이메일 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              id={`email-${revisionId}`}
              name="authorEmail"
              type="email"
              placeholder="답글 알림을 받으려면 입력하세요"
              className="flowrit-input mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor={`content-${revisionId}`} className="text-xs font-medium text-gray-700">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            id={`content-${revisionId}`}
            name="content"
            rows={3}
            required
            maxLength={2000}
            placeholder="댓글을 입력하세요..."
            className="flowrit-input mt-1 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <SubmitButton label="댓글 등록" />
        </div>
      </form>
    </div>
  )
}
