---
작성: Database Design Agent
버전: v1.0
최종 수정: 2026-06-22 21:40
상태: 완료
---

# Data Model: revision-comment-threads

## 목차

- [DB 선택 및 근거](#db-선택-및-근거)
- [엔티티 관계도 (ERD)](#엔티티-관계도-erd)
- [테이블 정의](#테이블-정의)
- [인덱스 전략](#인덱스-전략)
- [데이터 무결성 규칙](#데이터-무결성-규칙)
- [마이그레이션 계획](#마이그레이션-계획)
- [롤백 전략](#롤백-전략)

---

## DB 선택 및 근거

기존 프로젝트와 동일하게 **PostgreSQL (Neon)** + **Prisma 7** 사용.
신규 모델 `RevisionComment`를 기존 스키마에 추가하는 방식으로 진행하며, 별도 DB 도입 근거 없음.

---

## 엔티티 관계도 (ERD)

```
RevisionRequest (기존)
    id (PK)
    projectId → Project.id
    ...
    comments → RevisionComment[] (신규 relation)

RevisionComment (신규)
    id (PK)
    revisionId → RevisionRequest.id  [onDelete: Cascade]
    parentId?  → RevisionComment.id  [onDelete: Restrict, self-referential "CommentReplies"]
    authorType  STRING  -- "WORKER" | "CLIENT"
    authorName  STRING
    authorEmail STRING?
    content     STRING
    createdAt   DATETIME
```

관계 방향:
```
RevisionRequest ─── 1:N ───> RevisionComment  (revisionId FK)
RevisionComment ─── 1:N ───> RevisionComment  (parentId FK, self-referential "CommentReplies")
```

---

## 테이블 정의

### RevisionComment (신규)

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK, CUID | 댓글 고유 식별자 |
| `revisionId` | TEXT | NOT NULL, FK → RevisionRequest.id | 소속 수정 요청 |
| `parentId` | TEXT | NULLABLE, FK → RevisionComment.id | 답글인 경우 부모 댓글 ID |
| `authorType` | TEXT | NOT NULL | 작성자 유형: "WORKER" 또는 "CLIENT" |
| `authorName` | TEXT | NOT NULL | 작성자 표시명 |
| `authorEmail` | TEXT | NULLABLE | 클라이언트 이메일 (선택 입력) |
| `content` | TEXT | NOT NULL | 댓글 본문 |
| `createdAt` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 작성 일시 |

### RevisionRequest (기존 모델 수정)

기존 필드 변경 없음. 아래 Prisma relation만 추가:

| relation | 타입 | 설명 |
|---|---|---|
| `comments` | `RevisionComment[]` | 해당 수정 요청에 달린 댓글 목록 |

---

## 인덱스 전략

| 인덱스 | 대상 컬럼 | 목적 |
|---|---|---|
| `RevisionComment_revisionId_createdAt_idx` | `(revisionId, createdAt)` | 수정 요청별 댓글 조회(revisionId) + 시간순 정렬(createdAt) 복합 커버 (NFR-006) |

**단일 컬럼 인덱스를 복합으로 설계한 근거**: `getRevisionComments` 쿼리는 항상 `WHERE revisionId = ?` 조건과 `ORDER BY createdAt ASC` 를 함께 사용한다. 복합 인덱스 `(revisionId, createdAt)`는 필터 + 정렬을 단일 인덱스로 처리하므로 filesort를 제거한다.

---

## 데이터 무결성 규칙

### 참조 무결성

| 관계 | ON DELETE | ON UPDATE | 근거 |
|---|---|---|---|
| `RevisionComment.revisionId → RevisionRequest.id` | CASCADE | CASCADE | 수정 요청 삭제 시 댓글도 함께 삭제 (FR-012: 상태 변경은 삭제가 아니므로 댓글 보존됨) |
| `RevisionComment.parentId → RevisionComment.id` | RESTRICT | CASCADE | 범위 외(댓글 삭제 기능 미구현)이므로 실질적으로 삭제 불발생. RESTRICT로 설정하여 부모 댓글이 삭제 시도되면 DB 수준에서 방어 |

### 애플리케이션 수준 제약

아래 제약은 DB 수준(CHECK constraint)이 아닌 Server Action에서 강제한다. Prisma 스키마에 DB CHECK 제약을 추가하지 않은 이유: 기존 코드베이스 패턴(`RevisionRequest.status`, `source` 등)이 모두 String 필드로 애플리케이션 검증을 사용하며 스키마 일관성 유지.

| 규칙 | 적용 위치 | 근거 |
|---|---|---|
| `authorName` 1~100자 | Server Action | NFR-001 |
| `authorEmail` RFC 5321 형식 | Server Action | NFR-001 |
| `content` 1~2000자 | Server Action | NFR-002 |
| `parentId`가 지정된 경우 해당 댓글의 `parentId`가 null이어야 함 (depth=1 강제) | Server Action | NFR-005 |
| `authorType`은 "WORKER" 또는 "CLIENT"만 허용 | Server Action | FR-004~FR-009 |

---

## 마이그레이션 계획

**파일**: `prisma/migrations/20260622134000_add_revision_comment_threads/migration.sql`

**Up (적용):**
1. `RevisionComment` 테이블 생성 (8개 컬럼)
2. 복합 인덱스 `(revisionId, createdAt)` 생성
3. FK: `revisionId → RevisionRequest.id` (CASCADE)
4. FK: `parentId → RevisionComment.id` (RESTRICT)

**실행 명령:**
```bash
npx prisma migrate dev --name add-revision-comment-threads
```

Prisma는 마이그레이션 실행 후 `@/app/generated/prisma` 경로에 Prisma Client를 자동 재생성한다. `prisma.revisionComment` 메서드가 노출됨을 확인해야 한다.

---

## 롤백 전략

**Down (롤백 SQL):**

```sql
-- FK 제거 (자식 → 부모 순)
ALTER TABLE "RevisionComment" DROP CONSTRAINT IF EXISTS "RevisionComment_parentId_fkey";
ALTER TABLE "RevisionComment" DROP CONSTRAINT IF EXISTS "RevisionComment_revisionId_fkey";

-- 인덱스 제거
DROP INDEX IF EXISTS "RevisionComment_revisionId_createdAt_idx";

-- 테이블 제거
DROP TABLE IF EXISTS "RevisionComment";
```

**주의사항:**
- Prisma는 기본적으로 Down 마이그레이션을 자동 생성하지 않는다. 위 SQL을 수동 실행하거나 `prisma migrate reset`(개발 환경 전용)을 사용한다.
- 운영 환경 롤백 시 위 SQL을 직접 실행한다. `RevisionRequest` 모델의 `comments` relation은 스키마에서 삭제 후 `prisma generate`를 재실행한다.
- `RevisionComment` 테이블 삭제는 비가역적이므로 운영 환경 적용 전 백업 필수.
