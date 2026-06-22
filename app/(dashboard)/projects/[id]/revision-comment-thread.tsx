'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { MessageSquare } from 'lucide-react'
import type { CommentFormState, RevisionCommentWithReplies } from '@/lib/actions/revisionComment'
import { addRevisionComment } from '@/lib/actions/revisionComment'
import { useFormToast } from '@/hooks/use-form-toast'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flowrit-button-primary min-h-8 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '등록 중...' : label}
    </button>
  )
}

function CommentForm({ revisionId, parentId }: { revisionId: string; parentId?: string }) {
  const [state, formAction] = useActionState<CommentFormState, FormData>(addRevisionComment, {})
  useFormToast(state)

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="revisionId" value={revisionId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="content"
        rows={2}
        maxLength={2000}
        placeholder={parentId ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
        className="flowrit-input resize-none"
      />
      <div className="flex justify-end">
        <SubmitButton label={parentId ? '답글 등록' : '댓글 등록'} />
      </div>
    </form>
  )
}

type Props = {
  revisionId: string
  initialComments: RevisionCommentWithReplies[]
}

export function RevisionCommentThread({ revisionId, initialComments }: Props) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">
          댓글 {initialComments.length}개
        </span>
      </div>

      {initialComments.length > 0 && (
        <div className="mb-4 space-y-4">
          {initialComments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800">{comment.authorName}</span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                    {comment.authorType === 'WORKER' ? '작업자' : '클라이언트'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-900">{comment.content}</p>
              </div>

              {comment.replies.length > 0 && (
                <div className="ml-4 space-y-2 border-l-2 border-gray-100 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{reply.authorName}</span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                          {reply.authorType === 'WORKER' ? '작업자' : '클라이언트'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(reply.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-900">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 답글에는 "답글 달기" 폼만 — depth=1 강제는 서버에서 처리 */}
              <CommentForm revisionId={revisionId} parentId={comment.id} />
            </div>
          ))}
        </div>
      )}

      {initialComments.length === 0 && (
        <p className="mb-3 text-xs text-gray-400">아직 댓글이 없습니다.</p>
      )}

      <CommentForm revisionId={revisionId} />
    </div>
  )
}
