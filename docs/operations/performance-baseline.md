# Performance Baseline

## 목적

정적 랜딩 페이지가 아닌 PostgreSQL 조회와 Server Component 렌더링이 포함된 공개 주문 페이지의 기준선을 기록한다. 이 수치는 운영 SLO가 아니라 개선 전 비교 기준이다.

## 측정 환경

- 날짜: 2026-06-30
- 애플리케이션: Next.js production mode, local process
- 데이터베이스: remote Neon PostgreSQL
- 대상: `GET /order/flowrit-demo`
- 도구: ApacheBench 2.3
- 요청: 200
- 동시성: 10
- 옵션: `-l -k` (`-l`은 Next.js 동적 응답 길이 차이를 실패로 오인하지 않게 한다.)

```bash
ab -l -k -n 200 -c 10 http://127.0.0.1:3100/order/flowrit-demo
```

## 결과

| 지표 | 결과 |
|---|---:|
| 성공 요청 | 200 / 200 |
| 처리량 | 14.11 req/s |
| 평균 응답시간 | 694 ms |
| p50 | 643 ms |
| p95 | 1,935 ms |
| 최대 | 2,126 ms |

## 해석과 다음 측정

- 원격 DB 왕복과 SSR을 포함한 읽기 경로의 초기 기준선이다.
- `generateMetadata`와 페이지 렌더의 workspace 조회, 주문 필드 초기화 경로를 우선 프로파일링한다.
- 캐시 또는 쿼리 개선 전후에 동일 조건으로 다시 측정한다.
- 문의 등록처럼 데이터를 변경하는 시나리오는 격리된 테스트 DB에서만 측정한다.

