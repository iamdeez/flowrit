'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteAsset, shareProjectAssets } from '@/lib/actions/asset'

type AssetStatusFormProps = {
  assetId: string
}

export function AssetStatusForm({ assetId }: AssetStatusFormProps) {
  return (
    <form action={deleteAsset}>
      <input type="hidden" name="assetId" value={assetId} />
      <button
        type="submit"
        aria-label="에셋 삭제"
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        삭제
      </button>
    </form>
  )
}

export function AssetBulkShareForm({
  projectId,
  hasScheduled,
}: {
  projectId: string
  hasScheduled: boolean
}) {
  const [mode, setMode] = useState<'now' | 'scheduled'>('now')

  return (
    <div className="flowrit-panel-padded space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--flowrit-text)]">납품 공개 설정</p>
          <p className="mt-1 text-sm text-[var(--flowrit-text-muted)]">
            등록된 납품본을 한 번에 고객에게 공유하거나 공개 예약합니다.
          </p>
        </div>
        {hasScheduled && (
          <form action={shareProjectAssets}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="shareMode" value="cancel" />
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-xs font-medium text-amber-700 hover:bg-amber-50"
            >
              공유 예약 취소
            </button>
          </form>
        )}
      </div>
      <form action={shareProjectAssets}>
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <select
            name="shareMode"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'now' | 'scheduled')}
            className="flowrit-input"
          >
            <option value="now">즉시 공유</option>
            <option value="scheduled">공유 예약</option>
          </select>
          {mode === 'scheduled' && (
            <input
              name="shareScheduledAt"
              type="datetime-local"
              className="flowrit-input"
              aria-label="공유 예약 일시"
              required
            />
          )}
          <button type="submit" className="flowrit-button-primary">
            설정 적용
          </button>
        </div>
      </form>
    </div>
  )
}
