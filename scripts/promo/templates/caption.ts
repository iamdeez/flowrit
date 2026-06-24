import type { BundleInput } from '../lib/types.ts'

const HASHTAGS = ['#Flowrit', '#프리랜서', '#프로젝트관리', '#수정요청', '#납품관리', '#SaaS']

export function createCaption(input: BundleInput): string {
  const title = input.scenario.title
  return [
    `# ${title}`,
    '',
    '고객 의뢰부터 수정 요청, 납품 확인까지 흩어진 업무를 Flowrit 링크 하나로 정리하세요.',
    '작업자는 오늘 할 일을 빠르게 확인하고, 고객은 진행 단계와 납품 이력을 직접 확인할 수 있습니다.',
    '',
    'CTA: 지금 Flowrit으로 프로젝트 응대 흐름을 정리해 보세요.',
    '',
    HASHTAGS.join(' '),
    '',
    '## 게시 전 체크리스트',
    '',
    '- [ ] 영상에 실제 고객 정보가 보이지 않는가?',
    '- [ ] 커버 이미지에서 제품 화면과 핵심 메시지가 읽히는가?',
    '- [ ] CTA 링크와 프로필 링크가 일치하는가?',
  ].join('\n')
}
