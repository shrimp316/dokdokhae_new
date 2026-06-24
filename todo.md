# TODO

## 익명 사용자 클린업 자동화

**상태**: 대기 (익명 사용자 누적 후 구현)

**배경**: 이주의 글/이달의 글 비회원 댓글 기능에서 `signInAnonymously` 사용. 익명 계정이 Firebase Auth에 누적됨.

**시점**: Firebase Console → Authentication에서 익명 사용자가 100명 이상 쌓였을 때

### 작업 내용

- [ ] `src/app/api/cron/route.js`에 익명 사용자 삭제 로직 추가
  - `getAuth().listUsers()`로 익명 사용자 조회
  - 30일 이상 경과한 익명 계정 `auth.deleteUsers()`로 일괄 삭제
  - 결과를 `log` 배열에 추가
- [ ] 외부 스케줄러(cron-job.org, Vercel Cron, GitHub Actions)에서 매일 `/api/cron` 호출 확인
  - 헤더: `Authorization: Bearer ${CRON_SECRET}`
- [ ] Firebase Console → Authentication → Sign-in method → Anonymous 활성화 확인

### 참고

- 기존 `/api/cron/route.js`는 `firebase-admin` 사용, `getAuth()` 추가 import만 필요
- 수동 삭제: Firebase Console → Authentication → Users → 익명 사용자 선택 삭제
