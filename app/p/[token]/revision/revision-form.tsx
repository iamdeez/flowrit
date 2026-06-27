'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, Image as ImageIcon, Paperclip, Plus, X } from 'lucide-react'
import {
  submitCustomerRevision,
  type CustomerRevisionState,
} from '@/lib/actions/publicRevision'
import { uploadFileToR2 } from '@/lib/client-upload'
import { MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-constants'

const MAX_FILES = 100

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flowrit-button-primary px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '제출 중...' : '수정 요청 제출'}
    </button>
  )
}

type AttachedFile = { url: string; name: string; isImage: boolean }

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']

export function CustomerRevisionForm({ token }: { token: string }) {
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, formAction] = useActionState<CustomerRevisionState, FormData>(
    submitCustomerRevision,
    {}
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return

    const remaining = MAX_FILES - files.length
    if (remaining <= 0) {
      setUploadError(`최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`)
      return
    }

    const toUpload = selected.slice(0, remaining)
    const oversized = toUpload.filter((f) => f.size > MAX_UPLOAD_SIZE)
    if (oversized.length) {
      setUploadError(`파일 크기가 ${MAX_UPLOAD_SIZE_LABEL}를 초과할 수 없습니다: ${oversized.map((f) => f.name).join(', ')}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setUploadError('')

    const results: AttachedFile[] = []
    for (const file of toUpload) {
      try {
        const publicUrl = await uploadFileToR2(file)
        results.push({ url: publicUrl, name: file.name, isImage: IMAGE_TYPES.includes(file.type) })
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : `'${file.name}' 업로드에 실패했습니다.`)
      }
    }

    setFiles((prev) => [...prev, ...results])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(url: string) {
    setFiles((prev) => prev.filter((f) => f.url !== url))
  }

  if (state.success) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">수정 요청이 접수되었습니다</h2>
        <p className="mt-2 text-sm text-gray-500">
          담당자가 내용을 확인한 뒤 처리 상태를 업데이트합니다.
        </p>
      </div>
    )
  }

  const imageFiles = files.filter((f) => f.isImage)
  const otherFiles = files.filter((f) => !f.isImage)
  const canAddMore = files.length < MAX_FILES

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {files.map((f) => (
        <input key={f.url} type="hidden" name="fileUrls" value={f.url} />
      ))}

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
          className="flowrit-input mt-2 resize-none"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">
          파일·사진 첨부{' '}
          <span className="font-normal text-gray-400">(선택, 최대 {MAX_FILES}개 · 각 {MAX_UPLOAD_SIZE_LABEL} 이하)</span>
        </p>

        {/* 이미지 썸네일 그리드 */}
        {imageFiles.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {imageFiles.map((f) => (
              <div key={f.url} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-start justify-end bg-black/0 p-1 transition-colors group-hover:bg-black/20">
                  <button
                    type="button"
                    onClick={() => removeFile(f.url)}
                    aria-label={`이미지 제거: ${f.name}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 일반 파일 목록 */}
        {otherFiles.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {otherFiles.map((f) => (
              <div
                key={f.url}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.url)}
                  aria-label={`첨부 파일 제거: ${f.name}`}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 파일 추가 버튼 */}
        {canAddMore && (
          <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 hover:border-gray-400 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                <span className="text-sm text-gray-500">업로드 중...</span>
              </>
            ) : files.length > 0 ? (
              <>
                <Plus className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  사진·파일 추가 ({files.length}/{MAX_FILES})
                </span>
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">사진·파일 선택 (여러 개 가능)</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
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
