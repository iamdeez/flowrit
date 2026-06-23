'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export type OnboardingState = {
  error?: string
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$|^[a-z0-9]{2,40}$/

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await auth()
  if (!session?.user?.workspaceId) return { error: '로그인이 필요합니다.' }

  const name = (formData.get('workspaceName') as string)?.trim()
  const slug = (formData.get('workspaceSlug') as string)?.trim().toLowerCase()

  if (!name) return { error: '워크스페이스 이름을 입력해 주세요.' }
  if (name.length > 50) return { error: '이름은 50자 이내로 입력해 주세요.' }
  if (!slug) return { error: '워크스페이스 URL을 입력해 주세요.' }
  if (!SLUG_RE.test(slug)) {
    return { error: 'URL은 2~40자의 영소문자·숫자·하이픈만 사용 가능합니다. (시작·끝은 영문·숫자)' }
  }

  const conflict = await prisma.workspace.findFirst({
    where: { slug, NOT: { id: session.user.workspaceId } },
    select: { id: true },
  })
  if (conflict) return { error: '이미 사용 중인 URL입니다. 다른 URL을 입력해 주세요.' }

  await prisma.workspace.update({
    where: { id: session.user.workspaceId },
    data: { name, slug },
  })

  redirect('/dashboard')
}
