'use client'

import { updateAssetStatus } from '@/lib/actions/asset'

type AssetStatusFormProps = {
  assetId: string
  status: string
}

export function AssetStatusForm({ assetId, status }: AssetStatusFormProps) {
  return (
    <form action={updateAssetStatus}>
      <input type="hidden" name="assetId" value={assetId} />
      <select
        name="status"
        defaultValue={status}
        aria-label="파일·링크 상태"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="PREPARING">준비 중</option>
        <option value="SHARED">공유됨</option>
        <option value="EXPIRED">만료됨</option>
      </select>
    </form>
  )
}
