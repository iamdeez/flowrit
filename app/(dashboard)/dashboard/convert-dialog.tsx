'use client'

import { useActionState, useState } from 'react'
import { X } from 'lucide-react'
import { convertInquiryToProject, type ConvertFormState } from '@/lib/actions/inquiry'
import { useFormToast } from '@/hooks/use-form-toast'

type Props = {
  inquiry: {
    id: string
    name: string
    contact: string | null
    content: string
    createdAt: Date
  }
  customers: { id: string; name: string }[]
  templates: { id: string; name: string }[]
}

export function ConvertDialog({ inquiry, customers, templates }: Props) {
  const [open, setOpen] = useState(false)
  const [useNewCustomer, setUseNewCustomer] = useState(false)

  const [state, action, pending] = useActionState(
    async (_prevState: ConvertFormState, formData: FormData) => {
      const result = await convertInquiryToProject(_prevState, formData)
      return result
    },
    {}
  )
  useFormToast(state)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        프로젝트로 전환
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">프로젝트로 전환</h2>
                <p className="mt-0.5 text-xs text-gray-500">{inquiry.name} 의뢰 건</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={action} className="space-y-4 px-5 py-4">
              <input type="hidden" name="inquiryId" value={inquiry.id} />

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  프로젝트 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="예: 웨딩 본식 사진 보정"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  마감일 (선택)
                </label>
                <input
                  type="date"
                  name="dueDate"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  워크플로우 템플릿 <span className="text-red-500">*</span>
                </label>
                <select
                  name="templateId"
                  required
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>템플릿 선택</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    고객 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseNewCustomer((v) => !v)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {useNewCustomer ? '기존 고객 선택' : '새 고객으로 등록'}
                  </button>
                </div>

                {useNewCustomer ? (
                  <div className="mt-1 space-y-2">
                    <input
                      name="newCustomerName"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder={`고객 이름 (기본값: ${inquiry.name})`}
                      defaultValue={inquiry.name}
                    />
                    <input
                      name="newCustomerContact"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="연락처 (선택)"
                      defaultValue={inquiry.contact ?? ''}
                    />
                  </div>
                ) : (
                  <select
                    name="existingCustomerId"
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">고객 선택 (또는 새 고객으로 등록)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {pending ? '처리 중...' : '프로젝트 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
