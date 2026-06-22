# Spec: webhook-platform-integration

> Branch: 001-webhook-platform-integration | Date: 2026-06-23 | Version: v0.6.0

## 목차

- [배경 및 목적](#배경-및-목적)
- [사용자 스토리](#사용자-스토리-user-stories)
- [기능 요구사항](#기능-요구사항-functional-requirements)
- [비기능 요구사항](#비기능-요구사항-non-functional-requirements)
- [수용 기준](#수용-기준-acceptance-criteria)
- [범위 외](#범위-외-out-of-scope)

---

## 배경 및 목적

대부분의 Flowrit 사용자(프리랜서 디자이너·개발자)는 인스타그램 DM, 카카오톡 채널, 네이버 톡톡을 통해 고객 문의를 받는다. 이 메시지들을 Flowrit으로 자동으로 가져오려면 각 플랫폼의 자동 응답 기능을 통해 Flowrit webhook 엔드포인트로 전송할 수 있어야 한다.

기존 webhook 설정 화면은 개발자 관점의 기술 문서 형태로 구성되어 있어, 비전문가인 사용자가 설정하기 어려웠다.

이 스펙은 두 가지를 해결한다:
1. 외부 플랫폼이 POST 요청으로 의뢰를 접수할 수 있는 REST API 엔드포인트 구현
2. 비전문가 사용자가 플랫폼별로 따라할 수 있는 단계별 설정 가이드 UI

---

## 사용자 스토리 (User Stories)

- **US-001**: 프리랜서로서, 인스타그램 DM 자동 응답 봇이 Flowrit으로 고객 문의를 자동 전달하도록 설정하고 싶다.
- **US-002**: 프리랜서로서, 카카오톡 채널 자동 응답 메시지에 내 의뢰 접수 URL을 포함하여 고객이 직접 폼을 작성하게 하고 싶다.
- **US-003**: 프리랜서로서, 설정 화면에서 테스트 의뢰를 전송해 webhook 연동이 정상 작동하는지 확인하고 싶다.
- **US-004**: 개발자로서, Zapier/Make 같은 자동화 도구를 통해 외부 시스템의 데이터를 Flowrit Inquiry로 생성하고 싶다.

---

## 기능 요구사항 (Functional Requirements)

- **FR-001**: `POST /api/webhooks/intake/[workspaceSlug]` 엔드포인트가 `name`, `content`, `contact`(선택), `source`(선택) 필드를 받아 Inquiry를 생성해야 한다.
- **FR-002**: 엔드포인트는 `Authorization: Bearer {WEBHOOK_SECRET}` 헤더로 인증한다. `WEBHOOK_SECRET` 환경변수 미설정 시 503을 반환한다.
- **FR-003**: `source` 필드로 유입 경로를 구분하며, content 상단에 `[인스타그램 DM]` 등 레이블을 자동으로 추가한다.
- **FR-004**: 의뢰 생성 후 워크스페이스 멤버 전체에게 `NEW_INQUIRY` 인앱 알림 및 이메일을 발송한다.
- **FR-005**: 설정 페이지 webhook 섹션에 인스타그램 / 카카오채널 / 네이버 톡톡 탭별 비기술 설정 가이드를 제공한다.
- **FR-006**: 각 플랫폼 가이드에 복사 가능한 자동 응답 메시지 템플릿(의뢰 접수 URL 포함)을 제공한다.
- **FR-007**: 설정 화면에서 "테스트 전송" 버튼으로 테스트 Inquiry를 생성할 수 있어야 한다.
- **FR-008**: 기술 상세(엔드포인트 URL, 인증 헤더, JSON 스키마, curl 예제)는 "고급" 접기 섹션으로 구성해 기본 숨김 처리한다.

---

## 비기능 요구사항 (Non-Functional Requirements)

- **NFR-001**: webhook 엔드포인트는 인증 실패 시 401, 필드 누락 시 422, 존재하지 않는 워크스페이스 시 404를 반환한다.
- **NFR-002**: 알림 발송 실패는 Inquiry 생성을 롤백하지 않는다 (best-effort 발송).

---

## 수용 기준 (Acceptance Criteria)

- **SC-001** (`FR-001`): 올바른 인증 헤더 + 필수 필드로 POST 시 201과 `{ ok: true, inquiryId }` 응답.
- **SC-002** (`FR-002`): 잘못된 Bearer 토큰 시 401 응답.
- **SC-003** (`FR-003`): `source: "instagram"` 포함 요청 시 생성된 Inquiry의 content가 `[인스타그램 DM]\n{content}` 형태.
- **SC-004** (`FR-005`, `FR-006`): 설정 페이지에서 인스타그램·카카오채널·네이버 톡톡 탭 전환 가능하고, 각 탭에 복사 버튼이 있는 자동 응답 메시지 템플릿 표시.
- **SC-005** (`FR-007`): "테스트 전송" 버튼 클릭 시 "[테스트]" 내용의 Inquiry가 생성되고 성공 메시지 표시.
- **SC-006** (`FR-008`): "고급" 섹션이 기본 닫힘 상태이며 클릭 시 토글.

---

## 범위 외 (Out of Scope)

- 플랫폼별 공식 API 직접 연동 (DM 수신 등) — 자동 응답 메시지를 통한 URL 유도 방식만 지원
- 파일 첨부 webhook 수신
- 멀티 WEBHOOK_SECRET (워크스페이스별 고유 secret)
