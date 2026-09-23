# 너 참 독독하다 (dokdokhae)

독서모임을 위한 웹앱입니다. 이 달의 책, 게시판, 이 주/달의 글(발췌·큐레이션), 감상평, 모임 일정, 마이페이지, 관리자 페이지를 제공합니다.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router), React 19
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging), Firebase Admin SDK (서버 라우트용)
- **AI**: Anthropic SDK — 관리자 페이지의 토론 질문 / 큐레이터 코멘트 자동 생성
- **Styling**: Tailwind CSS v4(`globals.css`의 유틸리티 기반 스타일) + 컴포넌트/페이지별 [CSS Modules](#스타일-작성-방식) + 리치 텍스트 에디터로 `react-quill-new`
- **Notification**: Web Push (FCM)
- **Sanitization**: `dompurify` / `sanitize-html` (사용자 입력 HTML 정화)

## Getting Started

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 값을 채워주세요.

```bash
cp .env.local.example .env.local
```

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Web SDK 설정 (브라우저에 노출되어도 안전, Google Cloud에서 도메인/API 제한 권장) |
| `NEXT_PUBLIC_KAKAO_API_KEY` | 관리자 페이지의 카카오 도서 검색 |
| `ANTHROPIC_API_KEY` | AI 질문/발췌 생성 (`/api/ai-questions`, `/api/ai-passage`) — 서버 전용 |
| `CRON_SECRET` | 예약 알림 발송 크론(`/api/cron`) 인증 — 서버 전용 |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK 서비스 계정 JSON — 서버 전용 |

### 3. Firestore / Storage 보안 규칙 배포 (선택)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인하세요.

## Scripts

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드된 앱 실행 |
| `npm run lint` | ESLint 검사 |
| `npm test` | 전체 테스트 실행 (`sanitize`, `cover-proxy`, `nicknames`) |

## 프로젝트 구조

```
src/
  app/                # App Router 페이지 + API 라우트
    api/               #   서버 라우트 (콘텐츠 CRUD, AI 생성, 알림, 크론 등)
    admin/             #   관리자 페이지 (책/일정/공지/질문/발췌/알림 관리)
    board/             #   자유게시판
    books/             #   도서 목록 / 상세 + 감상평
    featured/          #   이 주/달의 글 목록 + 상세
    ...
  components/          # 재사용 컴포넌트 (ui/ 폴더는 디자인 시스템 프리미티브)
  hooks/               # 커스텀 훅
  lib/                 # Firebase 클라이언트/어드민 초기화, 인증 컨텍스트, 정화(sanitize) 로직 등
tests/                 # node:test 기반 유닛 테스트
```

## 스타일 작성 방식

- 전역 디자인 토큰(색상, 폰트, 반응형 그리드 등)과 여러 파일이 공유하는 클래스(`.card`, `.btn-sm`, `.post-card`, `.review-content` 등)는 `src/app/globals.css`에 있습니다.
- 컴포넌트/페이지 전용 스타일은 같은 폴더에 co-locate된 `*.module.css`로 분리되어 있습니다 (예: `Navbar.js` ↔ `Navbar.module.css`).
- 조건부 스타일(활성 탭, 좋아요 상태 등)은 JS 삼항 연산자로 인라인 스타일을 바꾸는 대신 `data-*` 속성 + CSS 셀렉터(`[data-active]`, `[data-liked]` 등)로 표현합니다.
- 인라인 `style={{...}}`는 런타임에만 알 수 있는 값(예: 이미지 클릭 좌표, 책마다 다른 표지 그래디언트, `next/og` 이미지 생성처럼 CSS Modules 자체를 지원하지 않는 곳)에만 남아 있습니다.
- Tailwind는 `globals.css`에서 `@import "tailwindcss"`로 로드되어 있지만, 새 UI는 위 CSS Modules 방식을 기본으로 합니다.

## Notes

- 이 저장소는 표준 Next.js와 다른 부분이 있을 수 있습니다 — 자세한 내용과 작업 규칙은 [`AGENTS.md`](./AGENTS.md)를 참고하세요.
