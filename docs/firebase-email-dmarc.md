# Firebase 인증 메일·DMARC 점검 가이드

현재 프로젝트는 Firebase 기본 발신 주소를 사용합니다. 이 주소의 `firebaseapp.com` DNS(SPF/DKIM/DMARC)는 프로젝트 소유자가 직접 수정할 수 없습니다. 따라서 Firebase 콘솔에서 확인할 수 있는 설정과 수신 메일 헤더 진단을 기준으로 점검합니다.

## Firebase Console 점검

1. Firebase Console에서 프로젝트를 엽니다.
2. **Authentication → Settings → Authorized domains**에서 실제 사이트 도메인이 등록되어 있는지 확인합니다.
3. **Authentication → Templates**에서 비밀번호 재설정 템플릿의 발신자 이름, 회신 주소, 언어, 링크가 정상인지 확인합니다.
4. 발신자 이름과 본문을 과도한 홍보 문구 없이 서비스 목적에 맞게 작성합니다.
5. 비밀번호 재설정 링크가 연결되는 도메인이 Authorized domains에 포함되어 있는지 확인합니다.

## DMARC 결과 확인

Gmail에서 테스트 메일을 연 뒤 **더보기(⋮) → 원본 보기**를 선택합니다. 다음 항목을 확인합니다.

- `SPF: PASS`
- `DKIM: PASS`
- `DMARC: PASS`

`PASS`인데도 스팸으로 분류되면 DMARC가 아닌 발신자 평판, 수신자별 스팸 정책, 메일 내용/링크 평판, 짧은 시간의 반복 발송 등이 원인일 수 있습니다.

## 기본 발신 주소의 한계

- `firebaseapp.com`의 SPF/DKIM/DMARC 레코드는 직접 추가·수정할 수 없습니다.
- 스팸함 이동을 확실히 제어해야 한다면 자체 도메인을 준비하고, Firebase가 지원하는 커스텀 이메일 발신/SMTP 또는 별도 이메일 발송 서비스 전환을 검토해야 합니다.
- 이 전환은 DNS(SPF, DKIM, DMARC) 설정과 발신 도메인 검증이 필요한 별도 작업입니다.

## 확인 시 보안 주의사항

- `NEXT_PUBLIC_FIREBASE_*` 웹 설정값은 클라이언트에 공개될 수 있지만, Google Cloud Console에서 API 키의 도메인/API 제한을 설정합니다.
- `FIREBASE_SERVICE_ACCOUNT_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`는 서버 전용 환경변수로만 보관합니다.
