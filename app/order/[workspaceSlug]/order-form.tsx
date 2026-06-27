'use client'

import { useActionState, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Paperclip, X } from 'lucide-react'
import { submitOrder, type InquiryFormState } from '@/lib/actions/inquiry'
import type { FormFieldRow } from '@/lib/actions/form-fields'
import { uploadFileToR2 } from '@/lib/client-upload'
import { MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-constants'

type UploadedFile = { name: string; url: string }

function FieldInput({ field }: { field: FormFieldRow }) {
  const base = 'flowrit-input mt-1'
  const id = `field-${field.fieldKey}`
  if (field.type === 'textarea') {
    return (
      <textarea
        id={id}
        name={field.fieldKey}
        required={field.required}
        rows={field.fieldKey === 'content' ? 6 : 3}
        className={base}
        placeholder={field.placeholder ?? undefined}
      />
    )
  }
  if (field.type === 'date') {
    return <input id={id} name={field.fieldKey} type="date" required={field.required} className={base} />
  }
  if (field.type === 'select' && field.options && field.options.length > 0) {
    return (
      <select id={id} name={field.fieldKey} required={field.required} className={base}>
        <option value="">선택해 주세요</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }
  return (
    <input
      id={id}
      name={field.fieldKey}
      type="text"
      required={field.required}
      className={base}
      placeholder={field.placeholder ?? undefined}
    />
  )
}

export function OrderForm({ workspaceSlug, fields }: { workspaceSlug: string; fields: FormFieldRow[] }) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const boundAction = submitOrder.bind(null, workspaceSlug)
  const [state, action, pending] = useActionState<InquiryFormState, FormData>(boundAction, {})

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
        selected.map(async (file) => ({ name: file.name, url: await uploadFileToR2(file) })),
      )
      setFiles((prev) => [...prev, ...uploaded])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (state.success) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--flowrit-border)] bg-[var(--flowrit-success-soft)] p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--flowrit-success-text)]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-[var(--flowrit-success-text)]">주문서가 접수되었습니다</p>
        <p className="mt-2 text-sm leading-6 text-[var(--flowrit-success-text)]">
          담당자가 내용을 확인한 뒤 일정과 다음 단계를 안내드리겠습니다.
        </p>
      </div>
    )
  }

  // Group consecutive non-file fields into rows (pair up short fields side by side)
  const PAIR_TYPES = new Set(['text', 'date'])
  const rows: FormFieldRow[][] = []
  let i = 0
  while (i < fields.length) {
    const field = fields[i]
    if (field.type === 'file') {
      rows.push([field])
      i++
    } else if (
      PAIR_TYPES.has(field.type) &&
      i + 1 < fields.length &&
      PAIR_TYPES.has(fields[i + 1].type) &&
      fields[i + 1].type !== 'file'
    ) {
      rows.push([field, fields[i + 1]])
      i += 2
    } else {
      rows.push([field])
      i++
    }
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="fileUrls" value={JSON.stringify(files.map((f) => f.url))} />

      {rows.map((row) => {
        if (row.length === 2) {
          return (
            <div key={row[0].id} className="grid gap-4 sm:grid-cols-2">
              {row.map((field) => (
                <div key={field.id}>
                  <label htmlFor={`field-${field.fieldKey}`} className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-red-500"> *</span>}
                  </label>
                  <FieldInput field={field} />
                </div>
              ))}
            </div>
          )
        }

        const field = row[0]

        if (field.type === 'file') {
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="ml-0.5 text-red-500"> *</span>}
                <span className="ml-1 text-xs text-gray-400">(각 {MAX_UPLOAD_SIZE_LABEL} 이하)</span>
              </label>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flowrit-button-secondary px-3 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  {uploading ? '업로드 중...' : '파일 선택'}
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
              </div>
              {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f) => (
                    <li key={f.url} className="flex items-center gap-2 text-sm text-gray-600">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((x) => x.url !== f.url))}
                        aria-label={`첨부 파일 제거: ${f.name}`}
                        className="ml-auto shrink-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        }

        return (
          <div key={field.id}>
            <label htmlFor={`field-${field.fieldKey}`} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-0.5 text-red-500"> *</span>}
            </label>
            <FieldInput field={field} />
          </div>
        )
      })}

      {state.error && (
        <p role="alert" className="flowrit-form-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="flowrit-button-primary w-full py-2.5 disabled:opacity-50"
      >
        {pending ? '제출 중...' : '주문서 제출하기'}
      </button>
    </form>
  )
}
