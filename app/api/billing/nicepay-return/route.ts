import { NextResponse } from 'next/server'

// NicePayments AUTHNICE가 결제 완료 후 호출하는 엔드포인트.
// 팝업 모드: postMessage로 opener에 결과 전달 후 닫음.
// 풀페이지 리다이렉트 모드(모바일 등): /api/billing/callback 직접 호출 후 설정 페이지로 이동.

async function handleReturn(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const billingCycle = url.searchParams.get('billingCycle') ?? 'monthly'
  const orderId = url.searchParams.get('orderId') ?? ''

  let resultCode = url.searchParams.get('resultCode') ?? ''
  let resultMsg = url.searchParams.get('resultMsg') ?? ''
  let authToken = url.searchParams.get('authToken') ?? ''
  let tid = url.searchParams.get('tid') ?? ''
  let ediDate = url.searchParams.get('ediDate') ?? ''
  let amount = url.searchParams.get('amount') ?? ''

  // POST body가 있으면 body 파라미터가 우선
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        // 디버그: NicePayments가 보낸 전체 form 필드 확인
        const allFields: Record<string, string> = {}
        formData.forEach((v, k) => { allFields[k] = String(v).slice(0, 100) })
        console.log('[nicepay-return] POST formData fields:', JSON.stringify(allFields))
        resultCode = (formData.get('resultCode') as string) || resultCode
        resultMsg = (formData.get('resultMsg') as string) || resultMsg
        authToken = (formData.get('authToken') as string) || authToken
        tid = (formData.get('tid') as string) || tid
        ediDate = (formData.get('ediDate') as string) || ediDate
        amount = (formData.get('amount') as string) || amount
      } else if (contentType.includes('application/json')) {
        const json = await request.json()
        console.log('[nicepay-return] POST json fields:', JSON.stringify(json).slice(0, 500))
        resultCode = json.resultCode || resultCode
        resultMsg = json.resultMsg || resultMsg
        authToken = json.authToken || authToken
        tid = json.tid || tid
        ediDate = json.ediDate || ediDate
        amount = json.amount || amount
      }
    } catch (e) {
      console.log('[nicepay-return] POST parse error:', String(e), 'content-type:', contentType)
    }
  }

  // 디버그: NicePayments가 보낸 전체 파라미터 로그
  console.log('[nicepay-return] received params:', {
    resultCode, resultMsg, authToken: authToken ? `${authToken.slice(0, 10)}...` : '', tid,
    ediDate, amount, method: request.method, url: url.toString(),
  })

  // NicePayments는 returnUrl에 resultCode 없이 authToken만 전달하는 경우가 있음.
  // authToken 존재 자체가 인증 성공 신호이며, 실제 결과는 /subscribe/regist 응답으로 확인.
  const isSuccess = !!authToken || resultCode === '0000'
  const errorMsg = resultMsg || '결제 인증에 실패했습니다.'

  const fullPageScript = isSuccess
    ? `
    fetch('/api/billing/callback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authToken: ${JSON.stringify(authToken)},
        orderId: ${JSON.stringify(orderId)},
        billingCycle: ${JSON.stringify(billingCycle)}
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        window.location.href = '/settings?tab=billing&upgraded=true';
      } else {
        window.location.href = '/settings?billingError=' + encodeURIComponent(data.error || '결제 처리에 실패했습니다.');
      }
    })
    .catch(function(e) {
      window.location.href = '/settings?billingError=' + encodeURIComponent('네트워크 오류: ' + String(e));
    });`
    : `window.location.href = '/settings?billingError=' + encodeURIComponent(${JSON.stringify(errorMsg)});`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>결제 처리 중...</title></head>
<body>
<p id="msg" style="font-family:sans-serif;text-align:center;margin-top:40px;color:#666;">결제를 처리하고 있습니다...</p>
<script>
  try {
    if (window.opener && !window.opener.closed) {
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
    try { ${fullPageScript} } catch(e2) {
      document.getElementById('msg').textContent = '오류: ' + String(e2);
    }
  }
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  return handleReturn(request)
}

export async function GET(request: Request) {
  return handleReturn(request)
}
