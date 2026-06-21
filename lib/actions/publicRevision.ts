'use server'

import { prisma } from '@/lib/db'

export type CustomerRevisionState = {
  success?: boolean
  error?: string
}

export async function submitCustomerRevision(
  _prevState: CustomerRevisionState,
  formData: FormData
): Promise<CustomerRevisionState> {
  const token = ((formData.get('token') as string | null) ?? '').trim()
  const content = ((formData.get('content') as string | null) ?? '').trim()
  const fileUrl = ((formData.get('fileUrl') as string | null) ?? '').trim()

  if (!token) return { error: '잘못된 요청입니다.' }
  if (!content) return { error: '수정 요청 내용을 입력해 주세요.' }

  const page = await prisma.publicProjectPage.findUnique({
    where: { token, isActive: true },
  })
  if (!page) return { error: '유효하지 않은 공유 링크입니다.' }

  await prisma.revisionRequest.create({
    data: {
      projectId: page.projectId,
      content,
      fileUrls: fileUrl ? [fileUrl] : [],
      source: 'CUSTOMER_PORTAL',
    },
  })

  return { success: true }
}
