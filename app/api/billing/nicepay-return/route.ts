import { NextResponse } from 'next/server'

// NicePayments AUTHNICE 팝업이 카드 등록 완료 후 POST하는 엔드포인트.
// 실제 빌링키 발급·결제 처리는 클라이언트 fnSuccess → /api/billing/callback 에서 수행.
export async function POST() {
  return NextResponse.json({ ok: true })
}
