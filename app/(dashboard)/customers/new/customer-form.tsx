'use client'

import { useActionState } from 'react'
import { createCustomer, type CustomerFormState } from '@/lib/actions/customer'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: CustomerFormState = {}

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          이름
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="예: 김민지"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="contact" className="mb-1 block text-sm font-medium text-gray-700">
          연락처
        </label>
        <input
          id="contact"
          name="contact"
          placeholder="전화번호, 이메일, 카카오톡 ID 등"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="memo" className="mb-1 block text-sm font-medium text-gray-700">
          메모
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={5}
          placeholder="고객 선호사항, 상담 내용, 주의할 점을 남겨두세요."
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '등록 중...' : '고객 등록'}
      </button>
    </form>
  )
}
