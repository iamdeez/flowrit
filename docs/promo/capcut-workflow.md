# CapCut Workflow

Flowrit은 실제 UI 녹화와 편집 브리프를 자동 생성하고, 최종 릴스 편집은 CapCut에서 무료 또는 저비용으로 마감한다.

## 입력 파일

- `source.mp4`: 실제 Flowrit UI 녹화 원본
- `cover.png`: 커버 후보 이미지
- `screenshots/*.png`: 컷별 참고 이미지
- `capcut-brief.md`: 타임라인, 자막, CTA, 내보내기 설정
- `caption.md`: Reels 게시용 문구

## 권장 절차

1. `npm run promo:record -- --scenario client-portal`로 소스 번들을 생성한다.
2. CapCut에서 9:16 세로 프로젝트를 만든다.
3. `source.mp4`를 가져오고 30초 내외로 자른다.
4. `capcut-brief.md`의 hook, middle, CTA 문구를 텍스트 오버레이로 넣는다.
5. 자동 자막 또는 수동 자막을 추가한다.
6. 상업적으로 사용 가능한 배경 음악만 적용한다.
7. `cover.png` 또는 CapCut에서 새 커버를 선택한다.
8. 1080x1920 MP4로 export한다.

## 무료 제작 원칙

- AI 영상 생성 크레딧을 쓰지 않고 실제 UI 녹화로 본편을 만든다.
- CapCut은 자막, 음악, 템플릿, 컷 편집 용도로만 사용한다.
- 유료 템플릿이나 Pro-only 효과를 피한다.
- 최종 게시 전 실제 고객 정보, 이메일, 토큰, 비공개 URL이 보이지 않는지 확인한다.
