'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { AssetFormState } from '@/lib/actions/asset'
import { createAsset } from '@/lib/actions/asset'

type AssetFormProps = {
  projectId: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '등록 중...' : '파일·링크 등록'}
    </button>
  )
}

export function AssetForm({ projectId }: AssetFormProps) {
  const [state, formAction] = useActionState<AssetFormState, FormData>(
    createAsset,
    {}
  )

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <input type="hidden" name="projectId" value={projectId} />

      <div className="grid gap-4 md:grid-cols-[1fr_1.5fr]">
        <div>
          <label htmlFor="asset-name" className="text-sm font-medium text-gray-900">
            이름
          </label>
          <input
            id="asset-name"
            name="name"
            required
            placeholder="최종 보정본 갤러리"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="asset-url" className="text-sm font-medium text-gray-900">
            URL
          </label>
          <input
            id="asset-url"
            name="url"
            type="url"
            required
            placeholder="https://drive.google.com/..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="asset-type" className="text-sm font-medium text-gray-900">
            타입
          </label>
          <select
            id="asset-type"
            name="type"
            defaultValue="OTHER"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="DRIVE">드라이브</option>
            <option value="GALLERY">갤러리</option>
            <option value="VIDEO">영상</option>
            <option value="DOCUMENT">문서</option>
            <option value="OTHER">기타</option>
          </select>
        </div>

        <div>
          <label htmlFor="asset-version" className="text-sm font-medium text-gray-900">
            버전
          </label>
          <input
            id="asset-version"
            name="version"
            placeholder="v1, 최종본"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="asset-expired-at" className="text-sm font-medium text-gray-900">
            만료일
          </label>
          <input
            id="asset-expired-at"
            name="expiredAt"
            type="date"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          등록 직후에는 준비 중 상태이며, 공유됨으로 바꾸면 고객용 페이지에 노출됩니다.
        </p>
        <SubmitButton />
      </div>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm font-medium text-emerald-600">{state.success}</p>
      )}
    </form>
  )
}
