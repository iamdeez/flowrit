import { NextResponse } from 'next/server'

// NicePayments AUTHNICE 팝업이 카드 결제 완료 후 POST하는 엔드포인트.
// 팝업에 HTML을 반환해 postMessage로 부모 창에 결과를 전달하고 팝업을 닫는다.
export async function POST(request: Request) {
  let resultCode = ''
  let resultMsg = ''
  let authToken = ''
  let tid = ''

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    resultCode = (formData.get('resultCode') as string) ?? ''
    resultMsg = (formData.get('resultMsg') as string) ?? ''
    authToken = (formData.get('authToken') as string) ?? ''
    tid = (formData.get('tid') as string) ?? ''
  } else {
    try {
      const json = await request.json()
      resultCode = json.resultCode ?? ''
      resultMsg = json.resultMsg ?? ''
      authToken = json.authToken ?? ''
      tid = json.tid ?? ''
    } catch {
      resultCode = ''
    }
  }

  const isSuccess = resultCode === '0000'
  const payload = isSuccess
    ? JSON.stringify({ type: 'NICEPAY_SUCCESS', authToken, tid })
    : JSON.stringify({ type: 'NICEPAY_ERROR', errorMsg: resultMsg || '결제에 실패했습니다.' })

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>결제 처리 중...</title></head>
<body>
<script>
  try {
    var payload = ${payload};
    if (window.opener) {
      window.opener.postMessage(payload, '*');
    }
  } catch (e) {}
  window.close();
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
