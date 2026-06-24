import type { Metadata } from 'next'

export const SITE_URL = 'https://flowrit.motionbit.kr'
export const SITE_NAME = 'Flowrit'
export const DEFAULT_TITLE = 'Flowrit - 프리랜서와 스튜디오를 위한 고객 작업 관리'
export const DEFAULT_DESCRIPTION =
  '고객 의뢰 접수, 프로젝트 진행 단계, 수정 요청, 납품 이력을 하나의 링크와 대시보드로 관리하는 프리랜서·스튜디오용 작업 운영 도구입니다.'
export const DEFAULT_KEYWORDS = [
  'Flowrit',
  '프리랜서 업무관리',
  '스튜디오 프로젝트 관리',
  '고객 의뢰 관리',
  '수정 요청 관리',
  '납품 링크',
  '프로젝트 대시보드',
  '고객 포털',
  '워크플로우 관리',
]
export const DEFAULT_OG_IMAGE = {
  url: '/og-flowrit.png',
  width: 1200,
  height: 630,
  alt: 'Flowrit - 의뢰 접수, 수정 요청, 납품 이력을 한 곳에서 관리하는 작업 운영 도구',
}

export const defaultOpenGraph: NonNullable<Metadata['openGraph']> = {
  type: 'website',
  locale: 'ko_KR',
  url: SITE_URL,
  siteName: SITE_NAME,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
}

export const defaultTwitter: NonNullable<Metadata['twitter']> = {
  card: 'summary_large_image',
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  images: [DEFAULT_OG_IMAGE.url],
}
