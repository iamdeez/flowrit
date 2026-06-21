import { prisma } from '@/lib/db'

export type DefaultWorkflowTemplate = {
  name: string
  industry: string
  stages: {
    internalName: string
    customerName: string
    order: number
  }[]
}

export const DEFAULT_WORKFLOW_TEMPLATES: DefaultWorkflowTemplate[] = [
  {
    name: '사진 기본 워크플로우',
    industry: 'photo',
    stages: [
      { internalName: '신규 접수', customerName: '의뢰 접수됨', order: 1 },
      { internalName: '주문 확인', customerName: '검토 중', order: 2 },
      { internalName: '원본·자료 확인', customerName: '준비 중', order: 3 },
      { internalName: '작업자 배정', customerName: '준비 중', order: 4 },
      { internalName: '작업 진행 중', customerName: '작업 진행 중', order: 5 },
      { internalName: '1차 결과 업로드', customerName: '1차 결과 전달 완료', order: 6 },
      { internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
      { internalName: '재수정 접수', customerName: '수정 작업 중', order: 8 },
      { internalName: '최종 납품', customerName: '납품 완료', order: 9 },
      { internalName: '완료', customerName: '완료', order: 10 },
    ],
  },
  {
    name: '웨딩 기본 워크플로우',
    industry: 'wedding',
    stages: [
      { internalName: '신규 접수', customerName: '의뢰 접수됨', order: 1 },
      { internalName: '상담 일정 확인', customerName: '일정 협의 중', order: 2 },
      { internalName: '촬영 준비', customerName: '촬영 준비 중', order: 3 },
      { internalName: '촬영 진행', customerName: '촬영 완료', order: 4 },
      { internalName: '보정 작업 중', customerName: '작업 진행 중', order: 5 },
      { internalName: '1차 결과 업로드', customerName: '1차 결과 전달 완료', order: 6 },
      { internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
      { internalName: '재수정 접수', customerName: '수정 작업 중', order: 8 },
      { internalName: '최종 납품', customerName: '납품 완료', order: 9 },
      { internalName: '완료', customerName: '완료', order: 10 },
    ],
  },
]

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export async function seedDefaultWorkflowTemplates(
  workspaceId: string,
  tx: PrismaTransaction = prisma
) {
  for (const template of DEFAULT_WORKFLOW_TEMPLATES) {
    const existing = await tx.workflowTemplate.findFirst({
      where: {
        workspaceId,
        industry: template.industry,
        isDefault: true,
      },
      select: { id: true },
    })

    if (existing) continue

    await tx.workflowTemplate.create({
      data: {
        workspaceId,
        name: template.name,
        industry: template.industry,
        isDefault: true,
        stages: { create: template.stages },
      },
    })
  }
}
