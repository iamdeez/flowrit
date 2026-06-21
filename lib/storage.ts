import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const MAX_UPLOAD_SIZE = MAX_SIZE

export async function createPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<{ presignedUrl: string; key: string }> {
  const ext = filename.includes('.') ? filename.split('.').pop() : ''
  const key = ext ? `uploads/${randomUUID()}.${ext}` : `uploads/${randomUUID()}`

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 300 })

  return { presignedUrl, key }
}

export function getPublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
