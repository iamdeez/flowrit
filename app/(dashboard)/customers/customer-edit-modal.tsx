'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import {
  updateCustomer,
  type CustomerFormState,
} from '@/lib/actions/customer'
import { useFormToast } from '@/hooks/use-form-toast'

type CustomerEditModalProps = {
  customer: {
    id: string
    name: string
    contact: string | null
    memo: string | null
  }
}

const initialState: CustomerFormState = {}

export function CustomerEditModal({ customer }: CustomerEditModalProps) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    async (_prevState: CustomerFormState, formData: FormData) => {
      const result = await updateCustomer(_prevState, formData)
      if (!result.error) setOpen(false)
      return result
    },
    initialState
  )
  useFormToast(state)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Pencil className="h-4 w-4" />
        편집
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                  고객 정보 편집
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  이름, 연락처, 메모를 최신 정보로 관리합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="닫기"
              >
                닫기
              </button>
            </div>

            <form action={action} className="space-y-4">
              <input type="hidden" name="id" value={customer.id} />
              <div>
                <label htmlFor="edit-name" className="mb-1 block text-sm font-medium text-gray-700">
                  이름
                </label>
                <input
                  id="edit-name"
                  name="name"
                  required
                  defaultValue={customer.name}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="edit-contact" className="mb-1 block text-sm font-medium text-gray-700">
                  연락처
                </label>
                <input
                  id="edit-contact"
                  name="contact"
                  defaultValue={customer.contact ?? ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="edit-memo" className="mb-1 block text-sm font-medium text-gray-700">
                  메모
                </label>
                <textarea
                  id="edit-memo"
                  name="memo"
                  rows={4}
                  defaultValue={customer.memo ?? ''}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
