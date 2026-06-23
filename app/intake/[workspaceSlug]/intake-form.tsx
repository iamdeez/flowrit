'use client'

import { useActionState, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Paperclip, X } from 'lucide-react'
import { submitInquiry, type InquiryFormState } from '@/lib/actions/inquiry'
import { uploadFileToR2 } from '@/lib/client-upload'
import { MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-constants'

type UploadedFile = {
  name: string
  url: string
}

export function IntakeForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const boundAction = submitInquiry.bind(null, workspaceSlug)
  const [state, action, pending] = useActionState<InquiryFormState, FormData>(
    boundAction,
    {}
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const oversized = selected.find((f) => f.size > MAX_UPLOAD_SIZE)
    if (oversized) {
      setUploadError(`파일 크기는 ${MAX_UPLOAD_SIZE_LABEL}를 초과할 수 없습니다. (${oversized.name})`)
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const url = await uploadFileToR2(file)
          return { name: file.name, url }
        })
      )
      setFiles((prev) => [...prev, ...uploaded])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeFile(url: string) {
    setFiles((prev) => prev.filter((f) => f.url !== url))
  }

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-emerald-900">의뢰가 접수되었습니다</p>
        <p className="mt-2 text-sm leading-6 text-emerald-700">
          담당자가 내용을 확인한 뒤 필요한 정보와 다음 단계를 안내드리겠습니다.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="fileUrls" value={JSON.stringify(files.map((f) => f.url))} />

      <div>
        <label className="block text-sm font-medium text-gray-700">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          className="flowrit-input mt-1"
          placeholder="홍길동"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">연락처</label>
        <input
          name="contact"
          type="text"
          className="flowrit-input mt-1"
          placeholder="010-0000-0000 또는 이메일"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          의뢰 내용 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="content"
          required
          rows={5}
          className="flowrit-input mt-1"
          placeholder="원하시는 내용, 일정, 참고사항 등을 자유롭게 적어주세요."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          참고 파일 첨부 <span className="text-xs text-gray-400">(각 {MAX_UPLOAD_SIZE_LABEL} 이하)</span>
        </label>
        <div className="mt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flowrit-button-secondary px-3 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
            {uploading ? '업로드 중...' : '파일 선택'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {uploadError && (
          <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
        )}

        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f) => (
              <li key={f.url} className="flex items-center gap-2 text-sm text-gray-600">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.url)}
                  className="ml-auto shrink-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="flowrit-button-primary w-full py-2.5 disabled:opacity-50"
      >
        {pending ? '제출 중...' : '의뢰 접수하기'}
      </button>
    </form>
  )
}
