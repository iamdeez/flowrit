'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Paperclip, X } from 'lucide-react'
import {
  submitCustomerRevision,
  type CustomerRevisionState,
} from '@/lib/actions/publicRevision'

const MAX_SIZE = 10 * 1024 * 1024

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '제출 중...' : '수정 요청 제출'}
    </button>
  )
}

export function CustomerRevisionForm({ token }: { token: string }) {
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, formAction] = useActionState<CustomerRevisionState, FormData>(
    submitCustomerRevision,
    {}
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      setUploadError('파일 크기가 10MB를 초과할 수 없습니다.')
      return
    }

    setUploading(true)
    setUploadError('')
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      })
      if (!res.ok) throw new Error()
      const { presignedUrl, publicUrl } = (await res.json()) as {
        presignedUrl: string
        publicUrl: string
        key: string
      }

      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      setFileUrl(publicUrl)
      setFileName(file.name)
    } catch {
      setUploadError('파일 업로드에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setUploading(false)
    }
  }

  function handleRemoveFile() {
    setFileUrl('')
    setFileName('')
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (state.success) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-7 w-7 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">수정 요청이 접수되었습니다</h2>
        <p className="mt-2 text-sm text-gray-500">담당자가 확인 후 처리해 드리겠습니다.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="fileUrl" value={fileUrl} />

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-900">
          수정 요청 내용 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          rows={6}
          required
          placeholder="수정 또는 변경이 필요한 사항을 상세히 입력해 주세요."
          className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">파일 첨부 (선택)</p>
        {fileName ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{fileName}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 hover:border-gray-400">
            <Paperclip className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {uploading ? '업로드 중...' : '파일 선택 (최대 10MB)'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
        {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div>{state.error && <p className="text-sm text-red-600">{state.error}</p>}</div>
        <SubmitButton />
      </div>
    </form>
  )
}
