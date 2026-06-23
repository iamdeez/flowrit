/**
 * Flowrit 더미 데이터 시드 스크립트
 * Usage: node prisma/seed.cjs
 *
 * 기존 flowrit-demo@example.com 워크스페이스가 있으면 해당 워크스페이스 데이터만 모두 삭제 후 재생성합니다.
 */

const { Client } = require('pg')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

function cuid() {
  return 'c' + crypto.randomBytes(11).toString('hex')
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function daysAgo(n) {
  return daysFromNow(-n)
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  const q = (text, values) => client.query(text, values)

  console.log('🌱 시드 시작...')

  // ── 기존 시드 데이터 정리 ──────────────────────────────
  const existing = await q(`SELECT id FROM "Workspace" WHERE slug = 'flowrit-demo' LIMIT 1`)
  if (existing.rows.length > 0) {
    const wsId = existing.rows[0].id
    console.log('   기존 데모 워크스페이스 데이터 삭제 중...')
    await q(`DELETE FROM "Workspace" WHERE id = $1`, [wsId])
    // User 삭제 (memberships 없으면 CASCADE 안 됨)
    await q(`DELETE FROM "User" WHERE email = 'flowrit-demo@example.com'`)
    await q(`DELETE FROM "User" WHERE email = 'member1@example.com'`)
    await q(`DELETE FROM "User" WHERE email = 'member2@example.com'`)
  }

  // ── 유저 생성 ──────────────────────────────────────────
  const passwordHash = bcrypt.hashSync('demo1234', 10)

  const ownerId = cuid()
  const member1Id = cuid()
  const member2Id = cuid()

  await q(
    `INSERT INTO "User" (id, email, password, name, "notificationSettings", "createdAt")
     VALUES ($1,$2,$3,$4,'{}',NOW())`,
    [ownerId, 'flowrit-demo@example.com', passwordHash, '김민준']
  )
  await q(
    `INSERT INTO "User" (id, email, password, name, "notificationSettings", "createdAt")
     VALUES ($1,$2,$3,$4,'{}',NOW())`,
    [member1Id, 'member1@example.com', passwordHash, '이서연']
  )
  await q(
    `INSERT INTO "User" (id, email, password, name, "notificationSettings", "createdAt")
     VALUES ($1,$2,$3,$4,'{}',NOW())`,
    [member2Id, 'member2@example.com', passwordHash, '박지훈']
  )

  // ── 워크스페이스 생성 ──────────────────────────────────
  const wsId = cuid()
  await q(
    `INSERT INTO "Workspace" (id, name, slug, plan, "createdAt")
     VALUES ($1,$2,$3,$4,NOW())`,
    [wsId, '민준 스튜디오', 'flowrit-demo', 'beta']
  )

  // ── 멤버십 ─────────────────────────────────────────────
  await q(
    `INSERT INTO "WorkspaceMember" (id, "workspaceId", "userId", role, "createdAt")
     VALUES ($1,$2,$3,'OWNER',NOW())`,
    [cuid(), wsId, ownerId]
  )
  await q(
    `INSERT INTO "WorkspaceMember" (id, "workspaceId", "userId", role, "createdAt")
     VALUES ($1,$2,$3,'ADMIN',NOW())`,
    [cuid(), wsId, member1Id]
  )
  await q(
    `INSERT INTO "WorkspaceMember" (id, "workspaceId", "userId", role, "createdAt")
     VALUES ($1,$2,$3,'MEMBER',NOW())`,
    [cuid(), wsId, member2Id]
  )

  // ── 워크플로우 템플릿 ──────────────────────────────────
  const tmplId = cuid()
  await q(
    `INSERT INTO "WorkflowTemplate" (id, "workspaceId", name, industry, "isDefault", "createdAt")
     VALUES ($1,$2,$3,$4,true,NOW())`,
    [tmplId, wsId, '브랜드 디자인 기본', '디자인']
  )
  const tmplStages = ['기획 & 리서치', '컨셉 디자인', '1차 시안', '피드백 수정', '최종 납품']
  for (let i = 0; i < tmplStages.length; i++) {
    await q(
      `INSERT INTO "TemplateStage" (id, "templateId", "internalName", "customerName", "order")
       VALUES ($1,$2,$3,$4,$5)`,
      [cuid(), tmplId, tmplStages[i], tmplStages[i], i + 1]
    )
  }

  const tmplId2 = cuid()
  await q(
    `INSERT INTO "WorkflowTemplate" (id, "workspaceId", name, industry, "isDefault", "createdAt")
     VALUES ($1,$2,$3,$4,false,NOW())`,
    [tmplId2, wsId, '웹/앱 UI 디자인', 'IT']
  )
  const tmplStages2 = ['요구사항 분석', 'IA & 와이어프레임', 'UI 디자인', '디자인 QA', '개발 핸드오프', '납품']
  for (let i = 0; i < tmplStages2.length; i++) {
    await q(
      `INSERT INTO "TemplateStage" (id, "templateId", "internalName", "customerName", "order")
       VALUES ($1,$2,$3,$4,$5)`,
      [cuid(), tmplId2, tmplStages2[i], tmplStages2[i], i + 1]
    )
  }

  // ── 고객 생성 ──────────────────────────────────────────
  const customers = [
    { name: '핏블리 주식회사', contact: '010-2341-5678', memo: '운동 앱 스타트업, 빠른 의사결정' },
    { name: '그린테이블', contact: '010-3456-7890', memo: '친환경 F&B 브랜드' },
    { name: '도담 출판사', contact: '02-555-1234', memo: '어린이 교육 콘텐츠 전문' },
    { name: '워크온 컴퍼니', contact: '010-9012-3456', memo: 'HR SaaS 스타트업, 시리즈A' },
    { name: '소울컬러', contact: '010-4567-8901', memo: '인테리어 디자인 회사' },
    { name: '루나베이크', contact: '010-5678-9012', memo: '프리미엄 베이커리 체인' },
    { name: '넥스트드림', contact: '02-777-8888', memo: '온라인 교육 플랫폼' },
    { name: '블루코스트', contact: '010-6789-0123', memo: '해양 레저 스타트업' },
    { name: '해나무 협동조합', contact: '02-333-4444', memo: '농산물 직거래 플랫폼' },
    { name: '클래빗 뮤직', contact: '010-7890-1234', memo: '음악 교육 서비스' },
    { name: '밀라노 인테리어', contact: '010-8901-2345', memo: '주거 공간 리노베이션' },
    { name: '옴니브랜드', contact: '02-222-9999', memo: '종합 마케팅 대행사' },
  ]

  const customerIds = []
  for (const c of customers) {
    const id = cuid()
    customerIds.push(id)
    await q(
      `INSERT INTO "Customer" (id, "workspaceId", name, contact, memo, "createdAt")
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [id, wsId, c.name, c.contact, c.memo]
    )
  }

  // ── 프로젝트 + 단계 생성 헬퍼 ─────────────────────────
  async function createProject({ title, customerId, dueDate, budget, assigneeId, stages, completedCount, archivedAt, createdAt }) {
    const projectId = cuid()
    const stageRecords = []
    for (let i = 0; i < stages.length; i++) {
      const stageId = cuid()
      stageRecords.push({ id: stageId, name: stages[i], order: i + 1, done: i < completedCount })
    }

    // currentStageId: first non-completed stage
    const currentStage = stageRecords.find((s) => !s.done) ?? stageRecords[stageRecords.length - 1]

    const created = createdAt ?? daysAgo(Math.floor(Math.random() * 60 + 5))
    await q(
      `INSERT INTO "Project" (id, "workspaceId", "customerId", title, "dueDate", budget, "assigneeId", "currentStageId", "archivedAt", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [projectId, wsId, customerId, title, dueDate, budget, assigneeId, currentStage.id, archivedAt ?? null, created]
    )

    for (const s of stageRecords) {
      const completedAt = s.done ? daysAgo(Math.floor(Math.random() * 10 + 1)) : null
      await q(
        `INSERT INTO "WorkflowStage" (id, "projectId", "internalName", "customerName", "order", "completedAt")
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [s.id, projectId, s.name, s.name, s.order, completedAt]
      )
    }

    return projectId
  }

  const designStages = ['기획 & 리서치', '컨셉 디자인', '1차 시안', '피드백 수정', '최종 납품']
  const webStages = ['요구사항 분석', 'IA & 와이어프레임', 'UI 디자인', '디자인 QA', '개발 핸드오프', '납품']
  const brandStages = ['리서치', '브랜드 전략', '로고 시안', '아이덴티티 시스템', '가이드라인', '납품']

  // ── 진행 중 프로젝트 (마감 임박 포함) ─────────────────
  const p1 = await createProject({
    title: '핏블리 앱 리디자인',
    customerId: customerIds[0],
    dueDate: daysFromNow(1),  // 내일 — 마감 임박
    budget: 3500000,
    assigneeId: ownerId,
    stages: webStages,
    completedCount: 3,
  })

  const p2 = await createProject({
    title: '그린테이블 브랜드 아이덴티티',
    customerId: customerIds[1],
    dueDate: daysFromNow(2),  // 마감 임박
    budget: 2200000,
    assigneeId: member1Id,
    stages: brandStages,
    completedCount: 2,
  })

  const p3 = await createProject({
    title: '도담 출판사 웹사이트 UI',
    customerId: customerIds[2],
    dueDate: daysFromNow(14),
    budget: 1800000,
    assigneeId: ownerId,
    stages: webStages,
    completedCount: 1,
  })

  const p4 = await createProject({
    title: '워크온 대시보드 UX 개선',
    customerId: customerIds[3],
    dueDate: daysFromNow(21),
    budget: 4500000,
    assigneeId: member2Id,
    stages: webStages,
    completedCount: 2,
  })

  const p5 = await createProject({
    title: '소울컬러 포트폴리오 브로슈어',
    customerId: customerIds[4],
    dueDate: daysFromNow(7),
    budget: 850000,
    assigneeId: member1Id,
    stages: designStages,
    completedCount: 3,
  })

  const p6 = await createProject({
    title: '루나베이크 패키지 디자인',
    customerId: customerIds[5],
    dueDate: daysFromNow(30),
    budget: 1600000,
    assigneeId: null,
    stages: designStages,
    completedCount: 0,
  })

  const p7 = await createProject({
    title: '넥스트드림 랜딩페이지',
    customerId: customerIds[6],
    dueDate: daysFromNow(10),
    budget: 1200000,
    assigneeId: ownerId,
    stages: webStages,
    completedCount: 4,
  })

  const p8 = await createProject({
    title: '블루코스트 앱 아이콘 & 스플래시',
    customerId: customerIds[7],
    dueDate: daysFromNow(5),  // 곧 마감
    budget: 700000,
    assigneeId: member1Id,
    stages: designStages,
    completedCount: 2,
  })

  // ── 완료 프로젝트 ──────────────────────────────────────
  const p9 = await createProject({
    title: '그린테이블 홈페이지 리뉴얼',
    customerId: customerIds[1],
    dueDate: daysAgo(10),
    budget: 2800000,
    assigneeId: ownerId,
    stages: webStages,
    completedCount: 6, // 전부 완료
    createdAt: daysAgo(45),
  })

  const p10 = await createProject({
    title: '핏블리 온보딩 플로우 설계',
    customerId: customerIds[0],
    dueDate: daysAgo(20),
    budget: 1900000,
    assigneeId: member1Id,
    stages: webStages,
    completedCount: 6,
    createdAt: daysAgo(55),
  })

  const p11 = await createProject({
    title: '해나무 CI/BI 작업',
    customerId: customerIds[8],
    dueDate: daysAgo(5),
    budget: 3200000,
    assigneeId: ownerId,
    stages: brandStages,
    completedCount: 6,
    createdAt: daysAgo(40),
  })

  const p12 = await createProject({
    title: '클래빗 뮤직 교육앱 UI 키트',
    customerId: customerIds[9],
    dueDate: daysAgo(15),
    budget: 2100000,
    assigneeId: member2Id,
    stages: webStages,
    completedCount: 6,
    createdAt: daysAgo(50),
  })

  // ── 아카이브 프로젝트 ──────────────────────────────────
  const p13 = await createProject({
    title: '밀라노 인테리어 명함 & 리플릿',
    customerId: customerIds[10],
    dueDate: daysAgo(60),
    budget: 500000,
    assigneeId: member1Id,
    stages: designStages,
    completedCount: 5,
    archivedAt: daysAgo(30),
    createdAt: daysAgo(90),
  })

  const p14 = await createProject({
    title: '옴니브랜드 소셜미디어 템플릿',
    customerId: customerIds[11],
    dueDate: daysAgo(45),
    budget: 900000,
    assigneeId: null,
    stages: designStages,
    completedCount: 2,
    archivedAt: daysAgo(40),
    createdAt: daysAgo(80),
  })

  // ── 수정 요청 생성 ─────────────────────────────────────
  const revisions = [
    // 핏블리 앱 (마감 임박) — 여러 건
    { projectId: p1, content: '대시보드 홈 화면의 운동 기록 카드 디자인 변경 요청입니다. 현재 너무 복잡하게 느껴진다고 하네요.', priority: 'HIGH', status: 'IN_PROGRESS', source: 'PORTAL', assigneeId: ownerId },
    { projectId: p1, content: '색상 팔레트를 기존 파란색 계열에서 브랜드 오렌지 계열로 전환 부탁드립니다.', priority: 'MEDIUM', status: 'OPEN', source: 'MANUAL', assigneeId: ownerId },
    { projectId: p1, content: '운동 완료 후 뜨는 축하 애니메이션 UI 수정 필요합니다.', priority: 'LOW', status: 'OPEN', source: 'PORTAL', assigneeId: null },
    // 그린테이블 (마감 임박)
    { projectId: p2, content: '로고에서 나뭇잎 아이콘을 좀 더 자연스럽게 다듬어 주세요. 현재 버전은 너무 딱딱해 보입니다.', priority: 'HIGH', status: 'IN_PROGRESS', source: 'MANUAL', assigneeId: member1Id },
    { projectId: p2, content: '브랜드 컬러 중 보조색 2번을 좀 더 채도 높은 버전으로 변경해주세요.', priority: 'MEDIUM', status: 'OPEN', source: 'PORTAL', assigneeId: null },
    // 소울컬러 브로슈어
    { projectId: p5, content: '페이지 3의 포트폴리오 그리드 레이아웃을 2열에서 3열로 변경해주세요.', priority: 'LOW', status: 'OPEN', source: 'MANUAL', assigneeId: member1Id },
    // 넥스트드림 랜딩페이지
    { projectId: p7, content: 'Hero 섹션 CTA 버튼 문구를 "무료로 시작하기"에서 "지금 무료 체험"으로 바꿔주세요.', priority: 'MEDIUM', status: 'OPEN', source: 'PORTAL', assigneeId: ownerId },
    { projectId: p7, content: '가격 플랜 섹션 디자인이 다른 섹션에 비해 너무 단조롭습니다. 카드형으로 개편 요청합니다.', priority: 'HIGH', status: 'IN_PROGRESS', source: 'MANUAL', assigneeId: ownerId },
    // 블루코스트
    { projectId: p8, content: '앱 아이콘 배경색을 밝은 하늘색에서 딥오션 블루 계열로 조정 부탁드립니다.', priority: 'MEDIUM', status: 'OPEN', source: 'PORTAL', assigneeId: member1Id },
    // 완료 프로젝트에도 수정 (done)
    { projectId: p9, content: '리뉴얼 완료 후 추가 요청: 블로그 목록 페이지 UI 업데이트.', priority: 'LOW', status: 'DONE', source: 'MANUAL', assigneeId: ownerId },
    { projectId: p11, content: '가이드라인 PDF에 모션 가이드 페이지 추가 요청.', priority: 'LOW', status: 'DONE', source: 'MANUAL', assigneeId: null },
  ]

  const revisionIds = []
  for (const r of revisions) {
    const id = cuid()
    revisionIds.push(id)
    await q(
      `INSERT INTO "RevisionRequest" (id, "projectId", content, priority, status, "assigneeId", source, "fileUrls", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'[]',NOW() - (random() * INTERVAL '7 days'))`,
      [id, r.projectId, r.content, r.priority, r.status, r.assigneeId, r.source]
    )
  }

  // ── 수정 요청 댓글 (일부) ──────────────────────────────
  await q(
    `INSERT INTO "RevisionComment" (id, "revisionId", "authorType", "authorName", content, "createdAt")
     VALUES ($1,$2,'WORKER','김민준','네, 확인했습니다. 오늘 중으로 수정본 올려드리겠습니다.',NOW() - INTERVAL '2 days')`,
    [cuid(), revisionIds[0]]
  )
  await q(
    `INSERT INTO "RevisionComment" (id, "revisionId", "authorType", "authorName", "authorEmail", content, "createdAt")
     VALUES ($1,$2,'CLIENT','핏블리 정현우','hyunwoo@fitbly.kr','감사합니다! 특히 카드 간 여백을 좀 더 넓게 해주시면 좋겠어요.',NOW() - INTERVAL '1 day')`,
    [cuid(), revisionIds[0]]
  )
  await q(
    `INSERT INTO "RevisionComment" (id, "revisionId", "authorType", "authorName", content, "createdAt")
     VALUES ($1,$2,'WORKER','이서연','색상 조합 시안 3가지 첨부했습니다. 확인 후 방향 정해주세요.',NOW() - INTERVAL '12 hours')`,
    [cuid(), revisionIds[3]]
  )

  // ── 에셋 ──────────────────────────────────────────────
  const assets = [
    { projectId: p9, name: '그린테이블_홈페이지_최종.fig', url: 'https://example.com/assets/gt_final.fig', type: 'DESIGN', status: 'APPROVED', version: 'v3.0' },
    { projectId: p9, name: '홈페이지_개발핸드오프.zip', url: 'https://example.com/assets/gt_handoff.zip', type: 'OTHER', status: 'APPROVED', version: null },
    { projectId: p11, name: '해나무_CI_가이드라인.pdf', url: 'https://example.com/assets/haenamu_ci.pdf', type: 'DOCUMENT', status: 'APPROVED', version: 'v1.0' },
    { projectId: p11, name: '해나무_로고_원본.ai', url: 'https://example.com/assets/haenamu_logo.ai', type: 'DESIGN', status: 'APPROVED', version: null },
    { projectId: p1, name: '핏블리_앱_현재시안.fig', url: 'https://example.com/assets/fitbly_draft.fig', type: 'DESIGN', status: 'PENDING_REVIEW', version: 'v2.1' },
    { projectId: p7, name: '넥스트드림_랜딩_시안.fig', url: 'https://example.com/assets/nd_landing.fig', type: 'DESIGN', status: 'PENDING_REVIEW', version: 'v1.3' },
    { projectId: p2, name: '그린테이블_로고시안_1차.pdf', url: 'https://example.com/assets/gt_logo_v1.pdf', type: 'DOCUMENT', status: 'PREPARING', version: 'v1.0' },
  ]

  for (const a of assets) {
    await q(
      `INSERT INTO "Asset" (id, "projectId", name, url, type, version, status, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [cuid(), a.projectId, a.name, a.url, a.type, a.version, a.status]
    )
  }

  // ── 신규 접수 (Inquiry) ────────────────────────────────
  const inquiries = [
    { name: '송하은', contact: 'haesong@brand.co.kr', content: '스킨케어 브랜드 론칭 예정으로 로고 및 패키지 전체 디자인 의뢰 드립니다. 예산은 약 500~800만원 내외로 생각하고 있습니다.' },
    { name: '최동우', contact: '010-4521-7788', content: '중소기업 HR 솔루션 스타트업인데 서비스 UI/UX 설계 및 디자인 전체 작업이 필요합니다. 빠른 일정으로 진행 가능한지 여쭤봅니다.' },
    { name: '양지원', contact: 'jiwon.yang@coops.kr', content: '사회적협동조합 웹사이트 리뉴얼 프로젝트입니다. 비영리 단체라 예산이 빠듯하지만 퀄리티 있는 작업을 원합니다.' },
    { name: '권세진', contact: '010-9988-1122', content: '온라인 영어 교육 앱 신규 기능 추가에 따른 화면 설계 및 디자인 요청드립니다. 약 30개 화면 예상됩니다.' },
  ]

  for (const inq of inquiries) {
    await q(
      `INSERT INTO "Inquiry" (id, "workspaceId", name, contact, content, status, "fileUrls", "createdAt")
       VALUES ($1,$2,$3,$4,$5,'PENDING','[]',NOW() - (random() * INTERVAL '3 days'))`,
      [cuid(), wsId, inq.name, inq.contact, inq.content]
    )
  }

  // ── 공개 주문서 접수 (ORDER formType) — E2E pending-order CTA 테스트용 ──
  const orders = [
    { name: '박서준', contact: 'seojun.park@brand.co.kr', content: '쇼핑몰 로고 및 상세 페이지 디자인 전반적으로 의뢰드립니다.' },
    { name: '한미래', contact: '010-7744-2233', content: '스타트업 브랜드 아이덴티티 구축 프로젝트입니다. 전반적인 BI 작업을 요청드립니다.' },
  ]

  for (const ord of orders) {
    await q(
      `INSERT INTO "Inquiry" (id, "workspaceId", name, contact, content, status, "formType", "fileUrls", "createdAt")
       VALUES ($1,$2,$3,$4,$5,'PENDING','ORDER','[]',NOW() - (random() * INTERVAL '2 days'))`,
      [cuid(), wsId, ord.name, ord.contact, ord.content]
    )
  }

  // ── 퍼블릭 프로젝트 페이지 (일부) ─────────────────────
  for (const pid of [p1, p7, p9]) {
    await q(
      `INSERT INTO "PublicProjectPage" (id, "projectId", token, "isActive", "createdAt")
       VALUES ($1,$2,$3,true,NOW())`,
      [cuid(), pid, crypto.randomUUID()]
    )
  }

  // ── 알림 ──────────────────────────────────────────────
  const notifications = [
    { userId: ownerId, type: 'REVISION_NEW', title: '새 수정 요청', body: '핏블리 앱 리디자인 · 색상 팔레트 변경 요청이 접수되었습니다.', href: `/projects/${p1}` },
    { userId: ownerId, type: 'DEADLINE_SOON', title: '마감 임박', body: '핏블리 앱 리디자인 프로젝트의 마감이 1일 남았습니다.', href: `/projects/${p1}` },
    { userId: ownerId, type: 'DEADLINE_SOON', title: '마감 임박', body: '그린테이블 브랜드 아이덴티티 프로젝트의 마감이 2일 남았습니다.', href: `/projects/${p2}` },
    { userId: ownerId, type: 'INQUIRY_NEW', title: '신규 의뢰 접수', body: '송하은 님으로부터 새 프로젝트 의뢰가 접수되었습니다.', href: '/dashboard' },
    { userId: member1Id, type: 'REVISION_NEW', title: '새 수정 요청', body: '그린테이블 브랜드 아이덴티티 · 로고 수정 요청이 접수되었습니다.', href: `/projects/${p2}` },
  ]

  for (const n of notifications) {
    await q(
      `INSERT INTO "Notification" (id, "userId", "workspaceId", type, title, body, href, "isRead", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW() - (random() * INTERVAL '1 day'))`,
      [cuid(), n.userId, wsId, n.type, n.title, n.body, n.href]
    )
  }

  // ── 타임라인 이벤트 ────────────────────────────────────
  for (const [pid, title] of [
    [p9, '프로젝트 완료 처리'],
    [p11, '최종 납품 완료'],
    [p1, '3단계(1차 시안) 완료 처리'],
    [p2, '2단계(브랜드 전략) 완료 처리'],
    [p7, '4단계(디자인 QA) 완료 처리'],
  ]) {
    await q(
      `INSERT INTO "TimelineEvent" (id, "projectId", title, "eventType", "createdAt")
       VALUES ($1,$2,$3,'STAGE_COMPLETE',NOW() - (random() * INTERVAL '10 days'))`,
      [cuid(), pid, title]
    )
  }

  await client.end()

  console.log('')
  console.log('✅ 시드 완료!')
  console.log('')
  console.log('  로그인 정보:')
  console.log('  ┌─────────────────────────────────────────────────┐')
  console.log('  │  이메일: flowrit-demo@example.com               │')
  console.log('  │  비밀번호: demo1234                              │')
  console.log('  │  역할: OWNER (모든 기능 접근 가능)               │')
  console.log('  ├─────────────────────────────────────────────────┤')
  console.log('  │  멤버1: member1@example.com / demo1234 (ADMIN)  │')
  console.log('  │  멤버2: member2@example.com / demo1234 (MEMBER) │')
  console.log('  └─────────────────────────────────────────────────┘')
  console.log('')
  console.log('  생성된 데이터:')
  console.log('  - 고객 12명')
  console.log('  - 프로젝트 14개 (진행 중 8, 완료 4, 아카이브 2)')
  console.log('  - 수정 요청 11건 (미완료 8건)')
  console.log('  - 신규 접수 4건')
  console.log('  - 에셋 7개, 알림 5개')
  console.log('')
}

main().catch((e) => {
  console.error('❌ 시드 실패:', e)
  process.exit(1)
})
