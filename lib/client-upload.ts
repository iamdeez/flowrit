import { MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-constants'

type UploadResponse = {
  presignedUrl: string
  publicUrl: string
}

export async function uploadFileToR2(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`파일 크기는 ${MAX_UPLOAD_SIZE_LABEL}를 초과할 수 없습니다. (${file.name})`)
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error ?? '업로드 준비에 실패했습니다.')
  }

  const { presignedUrl, publicUrl } = (await res.json()) as UploadResponse

  try {
    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!putRes.ok) throw new Error('파일 업로드에 실패했습니다.')
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('R2 CORS 설정 때문에 업로드가 차단되었습니다. Cloudflare R2 버킷 CORS에서 현재 도메인의 PUT 요청을 허용해 주세요.')
    }
    throw error
  }

  return publicUrl
}
