import { NextResponse } from 'next/server'

// NicePayments AUTHNICE가 결제 완료 후 POST하는 엔드포인트.
// 팝업 모드: postMessage로 opener에 결과 전달 후 닫음.
// 풀페이지 리다이렉트 모드(모바일 등): /api/billing/callback 직접 호출 후 설정 페이지로 이동.
export async function POST(request: Request) {
  const url = new URL(request.url)
  const billingCycle = url.searchParams.get('billingCycle') ?? 'monthly'
  const orderId = url.searchParams.get('orderId') ?? ''

  let resultCode = ''
  let resultMsg = ''
  let authToken = ''
  let tid = ''

  const contentType = request.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      resultCode = (formData.get('resultCode') as string) ?? ''
      resultMsg = (formData.get('resultMsg') as string) ?? ''
      authToken = (formData.get('authToken') as string) ?? ''
      tid = (formData.get('tid') as string) ?? ''
    } else {
      const json = await request.json()
      resultCode = json.resultCode ?? ''
      resultMsg = json.resultMsg ?? ''
      authToken = json.authToken ?? ''
      tid = json.tid ?? ''
    }
  } catch {
    // 파싱 실패 시 빈 값으로 진행
  }

  const isSuccess = resultCode === '0000'
  const errorMsg = resultMsg || '결제에 실패했습니다.'

  // 풀페이지 리다이렉트 모드에서 billing callback을 호출하는 JS 코드
  const fullPageScript = isSuccess
    ? `
    fetch('/api/billing/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken: ${JSON.stringify(authToken)}, orderId: ${JSON.stringify(orderId)}, billingCycle: ${JSON.stringify(billingCycle)} })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        window.location.href = '/settings?tab=billing&upgraded=true';
      } else {
        window.location.href = '/settings?billingError=' + encodeURIComponent(data.error || '결제 처리에 실패했습니다.');
      }
    })
    .catch(function() {
      window.location.href = '/settings?billingError=' + encodeURIComponent('네트워크 오류가 발생했습니다.');
    });`
    : `window.location.href = '/settings?billingError=' + encodeURIComponent(${JSON.stringify(errorMsg)});`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>결제 처리 중...</title></head>
<body>
<script>
  try {
    if (window.opener) {
      var payload = ${JSON.stringify(
        isSuccess
          ? { type: 'NICEPAY_SUCCESS', authToken, tid }
          : { type: 'NICEPAY_ERROR', errorMsg }
      )};
      window.opener.postMessage(payload, '*');
      window.close();
    } else {
      ${fullPageScript}
    }
  } catch (e) {
    ${fullPageScript}
  }
</script>
<p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#666;">결제를 처리하고 있습니다...</p>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
