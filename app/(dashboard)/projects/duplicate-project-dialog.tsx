'use client'

import { useState, useActionState } from 'react'
import { Copy } from 'lucide-react'
import {
  duplicateProject,
  type DuplicateProjectState,
} from '@/lib/actions/project'

type DuplicateProjectDialogProps = {
  sourceId: string
  sourceTitle: string
  sourceCustomerId: string
  customers: { id: string; name: string }[]
}

const initialState: DuplicateProjectState = {}

export function DuplicateProjectDialog({
  sourceId,
  sourceTitle,
  sourceCustomerId,
  customers,
}: DuplicateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(duplicateProject, initialState)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Copy className="h-3.5 w-3.5" />
        복제
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">프로젝트 복제</h2>
              <p className="mt-1 text-sm text-gray-500">
                워크플로우 단계만 복사하고 수정 요청과 파일은 제외합니다.
              </p>
            </div>

            <form action={action} className="space-y-4">
              <input type="hidden" name="sourceId" value={sourceId} />

              <div>
                <label htmlFor="duplicate-title" className="mb-1 block text-sm font-medium text-gray-700">
                  새 제목
                </label>
                <input
                  id="duplicate-title"
                  name="title"
                  required
                  defaultValue={`${sourceTitle} (복사본)`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="duplicate-customer" className="mb-1 block text-sm font-medium text-gray-700">
                  고객
                </label>
                <select
                  id="duplicate-customer"
                  name="customerId"
                  defaultValue={sourceCustomerId}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="duplicate-due-date" className="mb-1 block text-sm font-medium text-gray-700">
                  마감일
                </label>
                <input
                  id="duplicate-due-date"
                  name="dueDate"
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {state.error && <p className="text-sm text-red-600">{state.error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {pending ? '복제 중...' : '복제'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
