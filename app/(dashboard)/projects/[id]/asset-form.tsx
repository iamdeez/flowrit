'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { ChevronLeft, ChevronRight, ExternalLink, Eye, FileUp, Loader2, Paperclip, Trash2, UploadCloud, X } from 'lucide-react'
import type { AssetFormState } from '@/lib/actions/asset'
import { createAsset } from '@/lib/actions/asset'
import { uploadFileToR2 } from '@/lib/client-upload'
import { useFormToast } from '@/hooks/use-form-toast'
import {
  MAX_ASSET_UPLOAD_FILES,
  MAX_UPLOAD_SIZE,
  MAX_UPLOAD_SIZE_LABEL,
} from '@/lib/upload-constants'

type AssetFormProps = {
  projectId: string
  revisionId?: string
  compact?: boolean
}

type AssetMode = 'file' | 'link'

type UploadedAsset = {
  name: string
  url: string
  type: string
}

function guessAssetType(contentType: string): string {
  if (contentType.startsWith('image/')) return 'GALLERY'
  if (contentType.startsWith('video/')) return 'VIDEO'
  if (
    contentType === 'application/pdf' ||
    contentType.includes('document') ||
    contentType.includes('spreadsheet') ||
    contentType.includes('presentation')
  ) {
    return 'DOCUMENT'
  }
  return 'OTHER'
}

function SubmitButton({ disabled, revisionId }: { disabled: boolean; revisionId?: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flowrit-button-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '등록 중...' : revisionId ? '재수정본 등록' : '납품본 등록'}
    </button>
  )
}

export function AssetForm({ projectId, revisionId, compact = false }: AssetFormProps) {
  const [mode, setMode] = useState<AssetMode>('file')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [assetType, setAssetType] = useState('OTHER')
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, formAction] = useActionState<AssetFormState, FormData>(
    createAsset,
    {}
  )
  useFormToast(state)

  const canSubmit = mode === 'file'
    ? uploadedAssets.length > 0 && !uploading
    : Boolean(name.trim() && url.trim() && !uploading)
  const imageAssets = uploadedAssets.filter((asset) => asset.type === 'GALLERY')
  const previewAsset = previewIndex !== null ? imageAssets[previewIndex] : null

  function openPreview(assetUrl: string) {
    const index = imageAssets.findIndex((asset) => asset.url === assetUrl)
    if (index >= 0) setPreviewIndex(index)
  }

  function closePreview() {
    setPreviewIndex(null)
  }

  function removePreviewAsset() {
    if (!previewAsset) return

    const urlToRemove = previewAsset.url
    const remainingImageCount = imageAssets.length - 1
    setUploadedAssets((prev) => prev.filter((asset) => asset.url !== urlToRemove))
    setUploadError('')
    setPreviewIndex((index) => {
      if (index === null || remainingImageCount <= 0) return null
      return Math.min(index, remainingImageCount - 1)
    })
  }

  function showPreviousImage() {
    setPreviewIndex((index) => (
      index === null ? null : (index - 1 + imageAssets.length) % imageAssets.length
    ))
  }

  function showNextImage() {
    setPreviewIndex((index) => (
      index === null ? null : (index + 1) % imageAssets.length
    ))
  }

  async function uploadSelectedFiles(selected: File[]) {
    if (selected.length === 0) return

    const remaining = MAX_ASSET_UPLOAD_FILES - uploadedAssets.length
    if (remaining <= 0) {
      setUploadError(`파일은 최대 ${MAX_ASSET_UPLOAD_FILES}개까지 업로드할 수 있습니다.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const files = selected.slice(0, remaining)
    const oversized = files.find((file) => file.size > MAX_UPLOAD_SIZE)
    if (oversized) {
      setUploadError(`파일 크기는 ${MAX_UPLOAD_SIZE_LABEL}를 초과할 수 없습니다. (${oversized.name})`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadError('')
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          url: await uploadFileToR2(file),
          type: guessAssetType(file.type),
        })),
      )
      setUploadedAssets((prev) => [...prev, ...uploaded])
      if (selected.length > files.length) {
        setUploadError(`최대 ${MAX_ASSET_UPLOAD_FILES}개까지만 추가했습니다. 초과한 파일은 제외되었습니다.`)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    await uploadSelectedFiles(Array.from(e.target.files ?? []))
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (uploading || uploadedAssets.length >= MAX_ASSET_UPLOAD_FILES) return
    void uploadSelectedFiles(Array.from(e.dataTransfer.files ?? []))
  }

  function switchMode(nextMode: AssetMode) {
    setMode(nextMode)
    setUploadError('')
    if (nextMode === 'link' && assetType === 'GALLERY') setAssetType('DRIVE')
  }

  function removeUploadedFile(urlToRemove: string) {
    setUploadedAssets((prev) => prev.filter((asset) => asset.url !== urlToRemove))
    setUploadError('')
  }

  useEffect(() => {
    if (!previewAsset) return

    const previewUrl = previewAsset.url
    const imageCount = imageAssets.length

    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setPreviewIndex(null)
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setPreviewIndex((index) => (
          index === null ? null : (index - 1 + imageCount) % imageCount
        ))
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setPreviewIndex((index) => (
          index === null ? null : (index + 1) % imageCount
        ))
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        const remainingImageCount = imageCount - 1
        setUploadedAssets((prev) => prev.filter((asset) => asset.url !== previewUrl))
        setUploadError('')
        setPreviewIndex((index) => {
          if (index === null || remainingImageCount <= 0) return null
          return Math.min(index, remainingImageCount - 1)
        })
      }
    }

    window.addEventListener('keydown', handlePreviewKeyDown)
    return () => window.removeEventListener('keydown', handlePreviewKeyDown)
  }, [previewAsset, imageAssets.length])

  return (
    <form action={formAction} className={`${compact ? 'space-y-4' : 'flowrit-panel-padded space-y-5'}`}>
      <input type="hidden" name="projectId" value={projectId} />
      {revisionId && <input type="hidden" name="revisionId" value={revisionId} />}
      {mode === 'file' && (
        <input type="hidden" name="assets" value={JSON.stringify(uploadedAssets)} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--flowrit-text)]">
            {revisionId ? '재수정 납품본' : '납품 이력 등록'}
          </p>
          <p className="mt-1 text-sm text-[var(--flowrit-text-muted)]">
            {revisionId
              ? '이 수정 요청을 반영한 다음 납품본을 등록하세요. 납품 이력에도 함께 표시됩니다.'
              : '1차 납품, 재수정, 최종본처럼 고객에게 전달한 파일 흐름을 기록하세요.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => switchMode(mode === 'file' ? 'link' : 'file')}
          className="flowrit-button-secondary min-h-9 px-3 text-xs"
        >
          {mode === 'file' ? (
            <>
              <ExternalLink className="h-3.5 w-3.5" />
              외부 링크로 등록
            </>
          ) : (
            <>
              <UploadCloud className="h-3.5 w-3.5" />
              파일 업로드로 돌아가기
            </>
          )}
        </button>
      </div>

      {mode === 'file' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`rounded-lg border border-dashed px-5 py-6 text-center transition-colors ${
            isDragging
              ? 'border-[var(--flowrit-primary)] bg-[var(--flowrit-primary-soft)]'
              : 'border-[var(--flowrit-border-strong)] bg-[var(--flowrit-panel-subtle)]'
          }`}
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[var(--flowrit-primary)] shadow-sm">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileUp className="h-5 w-5" />
            )}
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--flowrit-text)]">
            {uploading ? '파일을 업로드하는 중입니다.' : '파일을 끌어놓거나 선택하세요.'}
          </p>
          <p className="mt-1 text-xs text-[var(--flowrit-text-muted)]">
            현재 {uploadedAssets.length}/{MAX_ASSET_UPLOAD_FILES}개 · 파일당 {MAX_UPLOAD_SIZE_LABEL} 이하
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || uploadedAssets.length >= MAX_ASSET_UPLOAD_FILES}
            className="flowrit-button-primary mt-4 min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploading ? '업로드 중...' : '파일 선택'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploadError && <p className="mt-3 text-xs font-medium text-red-600">{uploadError}</p>}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--flowrit-text)]">
            <ExternalLink className="h-4 w-4 text-[var(--flowrit-primary)]" />
            외부 링크 등록
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div>
              <label htmlFor="asset-name" className="text-sm font-medium text-gray-900">
                이름
              </label>
              <input
                id="asset-name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={revisionId ? '재수정본 링크' : '납품본 링크'}
                className="flowrit-input mt-2"
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
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="flowrit-input mt-2"
              />
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${mode === 'link' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {mode === 'link' && (
          <div>
            <label htmlFor="asset-type" className="text-sm font-medium text-gray-900">
              타입
            </label>
            <select
              id="asset-type"
              name="type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="flowrit-input mt-2"
            >
              <option value="DRIVE">드라이브</option>
              <option value="GALLERY">갤러리</option>
              <option value="VIDEO">영상</option>
              <option value="DOCUMENT">문서</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="asset-version" className="text-sm font-medium text-gray-900">
            납품 단계
          </label>
          <input
            id="asset-version"
            name="version"
            placeholder={revisionId ? '예: 1차 재수정, 2차 재수정' : '예: 1차 납품, 최종본'}
            className="flowrit-input mt-2"
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
            className="flowrit-input mt-2"
          />
        </div>
      </div>

      {mode === 'file' && uploadedAssets.length > 0 && (
        <div className="rounded-lg border border-[var(--flowrit-border)] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--flowrit-border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--flowrit-text)]">
              업로드된 파일 {uploadedAssets.length}개
            </p>
            <button
              type="button"
              onClick={() => setUploadedAssets([])}
              className="text-xs font-medium text-[var(--flowrit-text-muted)] hover:text-red-600"
            >
              모두 제거
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {uploadedAssets.map((asset, index) => (
                <li
                  key={asset.url}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] px-3 py-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-[11px] font-semibold text-[var(--flowrit-text-muted)]">
                    {index + 1}
                  </span>
                  <Paperclip className="h-4 w-4 shrink-0 text-[var(--flowrit-text-muted)]" />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--flowrit-text-secondary)]">
                    {asset.name}
                  </span>
                  {asset.type === 'GALLERY' && (
                    <button
                      type="button"
                      onClick={() => openPreview(asset.url)}
                      className="flex h-7 shrink-0 items-center rounded-md bg-white px-2 text-xs font-medium text-[var(--flowrit-primary)] hover:bg-[var(--flowrit-primary-soft)]"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      미리보기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeUploadedFile(asset.url)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--flowrit-text-muted)] hover:bg-white hover:text-red-500"
                    aria-label={`${asset.name} 제거`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {mode === 'file'
            ? '등록 후 납품 공개 설정에서 즉시 공유하거나 공개 일시를 예약할 수 있습니다.'
            : '링크도 등록 후 납품 공개 설정에서 즉시 공유하거나 공개 일시를 예약할 수 있습니다.'}
        </p>
        <SubmitButton disabled={!canSubmit} revisionId={revisionId} />
      </div>

      {previewAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
        >
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                removePreviewAsset()
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-red-500/80"
              aria-label={`${previewAsset.name} 삭제`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={closePreview}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="미리보기 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">
            {(previewIndex ?? 0) + 1} / {imageAssets.length}
          </p>

          {imageAssets.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                showPreviousImage()
              }}
              className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div
            className="mx-14 max-h-[90vh] max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewAsset.url}
              alt={previewAsset.name}
              className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-3 text-center text-sm text-white/70">
              {previewAsset.name}
            </p>
          </div>

          {imageAssets.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                showNextImage()
              }}
              className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
              aria-label="다음 이미지"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}

    </form>
  )
}
