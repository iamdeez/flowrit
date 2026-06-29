# Billing Incident Runbook

## 적용 범위

NicePayments 카드 승인, 빌링키 등록, 정기 결제와 결제 후 DB 반영 실패에 적용한다.

## 상태 불변 조건

- 외부 승인 실패 시 `Subscription`, `Payment`, `Workspace.plan`을 성공 상태로 기록하지 않는다.
- 외부 승인이 성공한 뒤 내부 DB 반영이 실패하면 Critical 운영 알림을 남긴다.
- 운영 알림에는 billing key, secret, token, authorization, cookie를 포함하지 않는다.

## 탐지

Discord Critical 알림의 `source`로 실패 단계를 구분한다.

| Source | 의미 | 최초 확인 |
|---|---|---|
| `billing.callback.registerBillingKey` | 카드 승인 또는 빌링키 수령 실패 | NicePayments resultCode/resultMsg, tid 존재 여부 |
| `billing.callback.db` | 외부 승인 후 내부 DB transaction 실패 | 결제 tid, Payment/Subscription 기록 여부 |
| `cron.daily.billing` | 정기 결제 작업 실패 | retryCount, subscription status, 다음 결제일 |

## 대응 절차

1. 알림 시간, source, resultCode를 기준으로 Sentry 이벤트를 찾는다.
2. 승인 실패라면 내부 구독·결제·플랜이 변경되지 않았는지 확인한다.
3. DB 반영 실패라면 NicePayments 승인 내역과 내부 Payment 기록을 대조한다.
4. 중복 결제를 피하기 전까지 수동 재실행하지 않는다.
5. 원인 수정 후 테스트 환경에서 카드 승인 → 구독 활성화 전체 흐름을 재검증한다.

## F101 사례

- 증상: `PKCS7 전자서명 및 암호화메시지 검증 실패`
- 원인: AUTHNICE Server 승인 모델에 직접 카드 등록 endpoint인 `/v1/subscribe/regist`를 사용했다.
- 수정: 승인 모델에 맞는 `/v1/payments/{tid}`와 `{ amount }` 요청으로 교체했다.
- 재발 방지: `approveAndRegisterBillingKey`가 올바른 endpoint와 payload를 사용하는 회귀 테스트를 유지한다.

## 종료 조건

- 외부 승인 결과와 내부 상태가 일치한다.
- 실패 요청이 성공 상태로 남지 않았다.
- 원인과 수정 사항이 테스트 또는 운영 문서에 반영됐다.

