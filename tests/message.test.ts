import { describe, it, expect } from 'vitest'
import { applyTemplateVars } from '@/lib/utils/messageTemplate'

// SC-012: 메시지 템플릿 변수 치환
describe('applyTemplateVars (SC-012)', () => {
  const vars = {
    customerName: '김철수',
    stageName: '최종 편집',
    dueDate: '2026-06-30',
    shareLink: 'https://flowrit.com/p/abc123',
  }

  it('{고객명} 변수를 치환한다', () => {
    const result = applyTemplateVars('안녕하세요, {고객명}님!', vars)
    expect(result).toBe('안녕하세요, 김철수님!')
  })

  it('{단계} 변수를 치환한다', () => {
    const result = applyTemplateVars('현재 단계: {단계}', vars)
    expect(result).toBe('현재 단계: 최종 편집')
  })

  it('{마감일} 변수를 치환한다', () => {
    const result = applyTemplateVars('마감일은 {마감일}입니다.', vars)
    expect(result).toBe('마감일은 2026-06-30입니다.')
  })

  it('{공유링크} 변수를 치환한다', () => {
    const result = applyTemplateVars('진행상황 확인: {공유링크}', vars)
    expect(result).toBe('진행상황 확인: https://flowrit.com/p/abc123')
  })

  it('모든 변수를 동시에 치환한다', () => {
    const template =
      '{고객명}님, 현재 {단계} 단계입니다. 마감일: {마감일}\n확인: {공유링크}'
    const result = applyTemplateVars(template, vars)
    expect(result).toBe(
      '김철수님, 현재 최종 편집 단계입니다. 마감일: 2026-06-30\n확인: https://flowrit.com/p/abc123'
    )
  })

  it('동일 변수가 여러 번 등장해도 모두 치환한다', () => {
    const result = applyTemplateVars('{고객명}님께, {고객명}님 감사합니다.', vars)
    expect(result).toBe('김철수님께, 김철수님 감사합니다.')
  })

  it('치환 변수가 없는 템플릿은 그대로 반환한다', () => {
    const template = '안녕하세요, 이용해 주셔서 감사합니다.'
    expect(applyTemplateVars(template, vars)).toBe(template)
  })
})
