import { NextRequest } from 'next/server'
import { createPresignedUploadUrl, MAX_UPLOAD_SIZE } from '@/lib/storage'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 })
  }

  const { filename, contentType, size } = body as {
    filename?: unknown
    contentType?: unknown
    size?: unknown
  }

  if (typeof filename !== 'string' || !filename.trim()) {
    return Response.json({ error: 'filename이 필요합니다.' }, { status: 400 })
  }
  if (typeof contentType !== 'string' || !contentType.trim()) {
    return Response.json({ error: 'contentType이 필요합니다.' }, { status: 400 })
  }
  if (typeof size !== 'number' || size <= 0) {
    return Response.json({ error: 'size가 유효하지 않습니다.' }, { status: 400 })
  }
  if (size > MAX_UPLOAD_SIZE) {
    return Response.json({ error: '파일 크기가 10MB를 초과할 수 없습니다.' }, { status: 400 })
  }

  try {
    const { presignedUrl, key } = await createPresignedUploadUrl(filename, contentType)
    return Response.json({ presignedUrl, key })
  } catch {
    return Response.json({ error: '업로드 URL 생성에 실패했습니다.' }, { status: 500 })
  }
}
