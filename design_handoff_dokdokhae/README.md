# Handoff: 독독해 — 서재(Study) 방향 리디자인

## Overview

독서모임 사이트 "독독해(너 참 독독하다)"의 UI 전면 리디자인입니다. 기존의 일반적인 SaaS 느낌의 화면을, **따뜻한 종이 톤의 문학 매거진 + 책장(서재) 메타포**로 재해석했습니다.

핵심 디자인 결정:
- **세피아/책 종이 톤의 팔레트** + 깊은 테라코타 액센트(기존 오렌지의 차분한 후속)
- **세리프(Noto Serif KR) 디스플레이 + 산세리프(Pretendard) 본문** — 깔끔하면서 문학적
- **책등(spine) 모티프 사이드바** — 메뉴 항목이 실제 책등처럼 색깔 있는 두꺼운 띠로 쌓여있음
- **책장(bookshelf) 형태의 도서 목록** — 책들이 나무 선반 위에 세로로 서 있고, 우측 끝에는 황동 명패가 매달려 연도 범위 표시
- **라이트/세피아/다크 3단 모드** + **사이드바 접기 책갈피 탭** + **본문 크기 슬라이더**

## About the Design Files

`reference/` 폴더의 파일들은 **HTML로 만든 디자인 레퍼런스**입니다. 그대로 운영 배포하는 코드가 아니라, **의도된 룩앤필과 동작을 보여주는 프로토타입**입니다. 

기존 Next.js 코드베이스(`dokdokhae.vercel.app`)에 이미 자리잡힌 컴포넌트/라우팅/스타일링 패턴을 사용해서 이 디자인을 **재구현**하는 것이 목표입니다. 인라인 스타일은 토큰화해서 CSS 변수 또는 기존 디자인 시스템(Tailwind/CSS Modules/styled-components 등)으로 옮기세요.

## Fidelity

**High-fidelity.** 모든 색상, 타이포그래피, 간격, 그림자, 책갈피 탭과 황동 명패의 미세 디테일까지 픽셀 단위로 다듬어져 있습니다. 가능한 그대로 재현해 주세요.

---

## Screens / Views

### 1. 사이드바 (`Sidebar` — 전 화면 공통)

**역할**: 화면 간 내비게이션 + 책갈피 탭으로 열고/닫기

**레이아웃**:
- 데스크탑: 좌측 고정, 폭 178px, 세로 풀 높이
- 모바일(≤820px): 닫힌 상태 기본, 책갈피 탭 누르면 fixed-position 드로어로 슬라이드 인 (폭 234px, 우측 backdrop)
- 닫기 시 폭 0 (snap, transition 없음 — 책갈피 tab 자체는 transform으로 부드럽게 슬라이드)

**구성 요소** (위→아래):
1. 로고: "너 참 / **독독하다**" — 세리프, 18px, "독독하다"는 italic + 액센트 컬러
2. 7개 메뉴 항목 (각각 고유 색의 책등 모양 버튼)
   - 홈 #8a3a1f / 도서 목록 #3a4a3b / 이 주의 글 #6a4a3a / 모임 일정 #7a5a3a / 내 감상평 #a8773a / 자유게시판 #6b8aa8 / 공지사항 #2c3a4a
   - 높이 38px, 좌측 내부 보더 2px(흰색 12% alpha), 좌측에 1px×18px 세로 구분선 흰색 28% alpha 후 라벨
   - 라벨: 세리프 13px, 흰색 95%, letter-spacing 0.04em
   - **활성 상태**: 좌측 marginLeft를 6px→0으로 당김(앞으로 튀어나오는 효과) + inset 4px 좌측 보더 var(--accent) + 더 진한 box-shadow
   - **호버**: 활성과 동일하게 marginLeft 0으로 (.14s 트랜지션)
3. 하단 사용자 영역: 26px 동그라미 아바타(액센트 배경 + 첫 글자) + 이름 + 로그아웃 링크

**책갈피 탭 (`SidebarTab`)**:
- 사이드바 우측 가장자리에 absolute 부착 (사이드바가 닫히면 viewport 좌측 가장자리에 노출)
- 24px × 58px, `clipPath: polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)` — V자 노치 책갈피
- 배경 var(--accent), 텍스트 흰색
- 내용: `‹` (열림 상태) / `›` (닫힘 상태) — translateY(-2px)로 시각적 보정
- box-shadow: `2px 2px 8px -2px rgba(0,0,0,.35)`
- transform: translateX 178px(열림) ↔ 0(닫힘), .28s cubic-bezier(.4,0,.2,1) 트랜지션
- aria-label: "사이드바 닫기" / "사이드바 열기"
- 모바일에서는 top: 18px, translateX 234px

### 2. 헤더 (`StudyHeader` — 전 화면 공통, 메인 영역 상단)

- 좌측: `VOL. 02` (세리프 11px, letter-spacing 0.25em, uppercase, 텍스트-muted) — 1px×18px 보더 구분선 — `이 주의 책 · 살인자의 기억법` (세리프 12px)
- 우측: 🔍 아이콘 버튼
- 좌측 패딩 56px (책갈피 탭 자리 확보), 우측 36px
- 1px 하단 보더 var(--border)

### 3. 홈 (`HomeScreen`)

**섹션 1 — 이 달의 책 마스트헤드**:
- 상단 작은 라벨: `THIS MONTH · 이 달의 책` (세리프 11px, 액센트 컬러, letter-spacing 0.3em) + 우측에 `NO. 020` + 사이에 1px 보더 라인
- 큰 H1 타이틀: "살인자의\n*기억법*" — 세리프 clamp(36px, 7vw, 64px), 두 번째 단어 italic + 액센트
- 3-column 그리드 (160px / 1fr / 220px, gap 36px):
  - **좌**: 책 표지 placeholder (l 사이즈: 140×199px, 두 톤 그라데이션)
  - **중**: 메타데이터 ("김영하 · 장편소설 · 2013") + 본문 인트로 (세리프 15px, line-height 1.65) + 액센트 좌측 보더 2px의 인용구 + outline 액센트 버튼 "도서 페이지 →"
  - **우**: 액센트 배경의 다음 모임 카드 (NEXT MEETING 라벨, "D-9" 세리프 36px, 날짜·시간) + 다음 모임 텍스트 버튼

**섹션 2 — 이 주의 글 + 공지**:
- 2-column 그리드 (1fr / 1fr, gap 36px)
- 좌측 article 카드: surface 배경, border 1px, 패딩 24px — pill 라벨 "이 주의 글", 책 제목, 4줄 클램프 본문, 메타
- 우측: 섹션 타이틀 "N.B. 공지사항" + 공지 목록 (점선 1px 구분선)

**섹션 3 — 인용 밴드**:
- 상하 1px 보더, 패딩 32px, 가운데 정렬
- 작은 라벨 `QUOTE OF THE WEEK` + 큰 italic 세리프 26px 인용문 + 출처 캡션

### 4. 도서 목록 (`BooksScreen` + `BookShelfStudy`)

**상단 헤드라인**:
- 좌측: 작은 라벨 `THE LIBRARY` + H1 "역대 *도서 목록*" (둘째 단어 italic 액센트)
- 우측: 검색 input (transparent bg, 하단 보더만, 폭 280px+) — 모바일에서 전폭

**책장 (핵심 컴포넌트)**:

여러 개의 책장 row (한 row당 기본 6권). 각 row 구조:

```
shelf-row-container (position: relative, marginBottom: 30px)
├── books-flex (display: flex, alignItems: flex-end, gap: 8px, paddingLeft: 12px, minHeight: 260px, flexWrap: wrap)
│   ├── (6×) Book button — 가변 높이/폭, 세로 책등
│   └── Bookend (14px×46px, var(--accent) 배경)
├── Year plaque (position: absolute, right: 12px, bottom: 16px) — pointer-events: none
└── Shelf board (height 16px, 나무 그라데이션, 강한 box-shadow)
```

**책등 (`Book button`)**:
- 폭은 책마다 다름 (38/40/42/44/46/48px 순환), 높이도 다름 (212/218/222/228/232/238px 순환)
- 가로 그라데이션 배경: `linear-gradient(90deg, ${spine} 0%, ${color} 18%, ${color} 82%, ${spine} 100%)` — 책등 양 끝이 어두워지는 효과
- box-shadow: `inset 2px 0 0 rgba(255,255,255,.10), inset -2px 0 0 rgba(0,0,0,.20), 0 1px 3px rgba(0,0,0,.2)`
- 상단 모서리만 radius 1px (`borderRadius: '1px 1px 0 0'`)
- **타이틀**: `writing-mode: vertical-lr` ← **반드시 lr (left-to-right)** — 한 컬럼이 채워지면 다음 컬럼은 오른쪽으로 흘러야 함 (vertical-rl 사용 금지, 위→아래 순서 뒤바뀜)
  - `white-space: nowrap` — 강제 단일 컬럼
  - 세리프 10.5px, 흰색 96%, letter-spacing 0.04em, font-weight 500
  - text-shadow `0 1px 1px rgba(0,0,0,.18)`
- **하단 연도 스티커**: 책등 폭 풀, 패딩 4px 0 5px, 세리프 8.5px, 흰색 58%, tabular-nums, 상단 1px 보더 검정 22% alpha — 책 발행연도 표시
- **호버**: `transform: translateY(-6px)`, .15s 트랜지션 (책이 살짝 튀어 나옴)

**황동 명패 (`Year plaque`)**:
- `position: absolute, right: 12px, bottom: 16px` — 핵심! flex flow 밖에 둬야 narrow viewport에서 책 아래로 wrap돼서 책이 "떠 보이는" 현상 안 생김
- 위쪽: 2px×14px 체인 (`linear-gradient(180deg, #8a6a3a 0%, #5a3a1a 100%)`)
- 명패 본체: 최소폭 92px, 패딩 10px 16px, radius 3px
- 배경 그라데이션: `linear-gradient(180deg, #d8b27a 0%, #c08648 38%, #a76c2c 72%, #8a5418 100%)` — 황동 톤
- box-shadow: `inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.25), 0 3px 6px rgba(0,0,0,.25)`
- text-shadow: `0 1px 0 rgba(255,255,255,.22)`
- 상단 8px 라벨 "ANNO" (letter-spacing 0.35em, uppercase, color #3e2410)
- 하단 13px 연도 범위 "1899–2020" (tabular-nums, font-weight 700)
- 4귀퉁이에 3px 동그라미 핀 — `radial-gradient(circle at 30% 30%, #b88a4a 0%, #4c2e0c 80%)`

**나무 선반 보드**:
- height 16px, `linear-gradient(180deg, #7a5232 0%, #5a3a20 50%, #3a2310 100%)`
- box-shadow: `0 10px 18px -8px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1)`
- 하단 모서리 radius 2px

### 5. 도서 상세 (`BookDetailScreen`)

- `← 목록으로` 텍스트 버튼
- 책 표지 + 메타(장르·연도) + H1 책 제목 + italic 액센트 저자 ("— 김영하") + 인트로
- 섹션 "01. 감상평 남기기": surface 카드 안에 ★ 5개 별점 + textarea + 임시저장/감상평 남기기 2 버튼
- 섹션 "02. 다른 회원들의 감상평": grid `120px 1fr auto` — 사용자명+별점 | 본문 | 좋아요·댓글 수

### 6. 이 주의 글 (`WeeklyScreen`)
- 현재 주차 글: 액센트 보더 강조 + 상단 -10px에 "현재 · W20" 라벨 부착
- 주간/월간 토글 (탭 형태, 액센트 하단 보더)
- 과거 글 리스트: `100px 1fr` grid — 주차 표기 | 컨텐츠 (pill 태그, 2줄 클램프, 책·질문 메타)

### 7. 모임 일정 (`MeetingsScreen`)
- H1 "2026년 5월." (마침표 italic 액센트)
- 2-column grid (2fr / 1fr): 캘린더 (7×6 그리드, 일요일 액센트, 오늘 보더 강조, 모임일 액센트 배경) | 다가오는 모임 카드 리스트

### 8. 전체 감상평 (`ReviewsScreen`)
- 헤드 + 검색
- 리스트: `120px 1fr 100px` grid — 작성자+별점 | 책 + 본문 | 좋아요·댓글

### 9. 자유게시판 (`BoardScreen`)
- 헤드 + 말머리 칩 그룹 (전체/리뷰/글쓰기/필사/기타/지난 독모) + 우측에 액센트 "＋ 글쓰기" 버튼
- 리스트: `80px 1fr auto` grid — 말머리(작은 대시 + 색깔 텍스트) | 제목+작성자·날짜 | 댓글 수

### 10. 공지사항 (`NoticesScreen`)
- 패딩 22px, 항목별 borderTop/Bottom 1px
- 고정 공지: surface 배경 + 좌측 3px 액센트 보더 + 우측 상단 `📌 고정` 라벨

---

## Interactions & Behavior

### 사이드바 토글
- 책갈피 탭 클릭 → `isOpen` 상태 토글
- 데스크탑: 사이드바 폭이 178→0 (snap), 메인 컨텐츠가 채워짐
- 모바일: 사이드바 fixed-position 드로어 transform `translateX(-100%)` ↔ `translateX(0)`, .28s 트랜지션 + backdrop fade in
- 메뉴 클릭 시 모바일에서는 자동 닫힘
- 책갈피 탭의 chevron(‹/›)과 aria-label은 isOpen에 따라 토글

### 화면 전환
- 단일 페이지 내 `useState({id, book})`로 현재 화면 추적 — Next.js 이식 시 라우터로 교체
- 도서 목록의 책 클릭 → `bookDetail` 화면, 상세 페이지에서 `← 목록으로` 클릭 → 도서 목록

### 책 호버
- 책장의 책등 호버 시 6px translateY 위로

### 메뉴 호버
- 사이드바 메뉴 호버 시 marginLeft 0으로 (앞으로 튀어나오는 효과)

### 모드 전환 (Tweaks 패널)
- 라이트/세피아/다크 — CSS 변수 전체가 한 번에 교체됨
- 기본은 세피아 (`STUDY.sepia`)

### 본문 크기
- 12–18px 슬라이더 — `--body`, `--h1`, `--h2` CSS 변수에 반영

### 검색
- 도서 목록 검색은 title/author/genre 부분 일치 (`useMemo`로 필터)

### 반응형 (media query `max-width: 820px`)
- 페이지 패딩 48px→18px
- 모든 multi-column grid → 1-column
- 사이드바 → 드로어
- 도서 검색 헤드 → 세로 스택

---

## State Management

- `screen: { id, book }` — 현재 화면 + 선택된 책
- `isOpen: boolean` — 사이드바 상태
- `isMobile: boolean` — `matchMedia('(max-width: 820px)')` 구독
- `mode: 'light' | 'sepia' | 'dark'` — 테마
- `fontSize: 12–18` — 본문 크기

Next.js 이식 시:
- `screen.id` → URL 라우트 (`/`, `/books`, `/books/[id]`, `/weekly`, `/meetings`, `/reviews`, `/board`, `/notices`)
- `isOpen` → Context + localStorage 영속화 권장
- `mode` → `<html data-mode={mode}>` + localStorage
- `fontSize` → CSS 변수 + localStorage

---

## Design Tokens

### Color — Sepia (기본 모드)
```
--bg:           #e6d8b8   /* 페이지 배경 — 옅은 종이 */
--surface:     #ede0c2   /* 카드 / 사이드바 */
--text:         #2c2218   /* 본문 */
--text-muted:   #7c6a56   /* 보조 텍스트 */
--accent:       #7a3014   /* 깊은 테라코타 */
--accent-soft:  #d4b890   /* 액센트 soft (pill 배경) */
--border:       rgba(44,34,24,0.22)
--shelf:        linear-gradient(180deg, #6b4a2e 0%, #3e2a18 100%)
```

### Color — Light
```
--bg: #ece1c8; --surface: #f3e9d2; --text: #28201a; --text-muted: #7a6856;
--accent: #8a3a1f; --accent-soft: #d8c0a0; --border: rgba(40,32,26,0.18);
--shelf: linear-gradient(180deg, #6b4a2e 0%, #4a3220 100%);
```

### Color — Dark
```
--bg: #1c1813; --surface: #241e17; --text: #e8dcc6; --text-muted: #8c7e68;
--accent: #c87a4a; --accent-soft: #3a2c1e; --border: rgba(232,220,198,0.10);
--shelf: linear-gradient(180deg, #2a2018 0%, #15100b 100%);
```

### 책등 색상 (책별 고정 데이터)
각 책 객체는 `color` (메인 책등 색), `spine` (그림자/끝 색), `cover` (하이라이트 색) 3개를 가짐. 예:
- 살인자의 기억법 — color #c8362a / spine #a8261c / cover #d44034
- 바냐 아저씨 — color #3a4a3b / spine #2a3a2b / cover #4a5a4c
- (전체 12권의 색상은 `data.jsx` 참조)

### 사이드바 메뉴 색상
`['#8a3a1f', '#3a4a3b', '#6a4a3a', '#7a5a3a', '#a8773a', '#6b8aa8', '#2c3a4a']`

### Typography
```
--serif:  "Noto Serif KR", "EB Garamond", Georgia, serif
--sans:   Pretendard, -apple-system, sans-serif
--body:   14px (조정 가능 12–18)
--h1:     clamp(36px, 7vw, 64px)
--h2:     ~30px (body × 2.2)
```

- 모든 화면 H1: 세리프 500 weight, letter-spacing -0.03em, line-height 1
- 두 번째 단어(또는 강조하고 싶은 단어)는 *italic* + `var(--accent)` 컬러
- 본문: var(--sans) — 단, 인트로/인용/카드 본문 등 "읽기 위한" 텍스트는 var(--serif)
- 작은 라벨/캡션: 11px, letter-spacing 0.2–0.3em, uppercase
- 번호/날짜: `font-variant-numeric: tabular-nums`

### Spacing
- 페이지 컨테이너 패딩: 36px 48px 60px (모바일 24px 18px 56px)
- 섹션 간 gap: 28–48px
- 그리드 gap: 24–36px

### Border radius
- 거의 모두 직각 또는 1–3px — 매거진/도서관 느낌은 둥근 모서리 거의 없음
- 명패만 3px
- 책등 상단 1px

### Shadows
- 책등: `inset 2px 0 0 rgba(255,255,255,.10), inset -2px 0 0 rgba(0,0,0,.20), 0 1px 3px rgba(0,0,0,.2)`
- 선반: `0 10px 18px -8px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1)`
- 책갈피 탭: `2px 2px 8px -2px rgba(0,0,0,.35)`
- 명패: `inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.25), 0 3px 6px rgba(0,0,0,.25)`

---

## Assets

이 디자인에 외부 이미지/아이콘 자산은 없습니다 — 모든 요소가 CSS/SVG inline.

- **책 표지 placeholder**: 두 톤 그라데이션 + 안쪽 1px 보더 + 책 제목·저자 텍스트로 생성된 데이터-URL SVG (`Cover` 컴포넌트 in `screens.jsx`). 실제 책 표지 이미지가 있다면 이걸로 교체.
- **로그아웃/검색**: 이모지 🔍 사용 — 디자인 시스템에 아이콘 셋이 있다면 교체 권장.

### 폰트
- **Noto Serif KR** (Google Fonts) — weights 400/500/600/700
- **EB Garamond** (Google Fonts) — weights 400/500, italic 400 (라틴 폴백)
- **Pretendard** (jsdelivr CDN) — 전 weight

Next.js에서는 `next/font/google`로 Noto Serif KR와 EB Garamond를 로컬 호스팅하고, Pretendard는 `next/font/local`로 추가하는 것을 권장.

---

## Files

```
reference/
├── index.html           — 엔트리 (스크립트 로딩 순서 + 글로벌 미디어쿼리 CSS)
├── app-study.jsx        — App shell, Sidebar, SidebarTab, Header, ReadingApp, 테마 정의
├── screens.jsx          — 모든 화면 컴포넌트 (Sidebar용 NAV 스타일, BookShelfStudy 등)
├── data.jsx             — 목 데이터 (BOOKS, WEEKLY_POSTS, MEETINGS, REVIEWS, BOARD_POSTS, NOTICES, NAV)
└── tweaks-panel.jsx     — 디자인 작업용 Tweaks 패널 (운영 코드에는 불필요)
```

### 이식 우선순위

1. **디자인 토큰** → globals.css의 CSS 변수로 추출 (5분)
2. **`Sidebar` + `SidebarTab`** → 가장 인상적인 요소. 이거 하나만 이식해도 분위기 80% 확보
3. **`HomeScreen`** → 마스트헤드 큰 세리프 + 다음 모임 카드 패턴 정립
4. **`BookShelfStudy`** → 두 번째로 인상적인 요소. **`writing-mode: vertical-lr`와 황동 명패 absolute 포지셔닝 두 개를 반드시 그대로** 유지할 것
5. 나머지 화면들 → 같은 토큰/패턴 적용

### 주의사항

- `writing-mode: vertical-lr`을 **반드시 lr** (left-to-right)로. `vertical-rl`은 컬럼 순서가 뒤집혀 한글 책 제목이 거꾸로 읽힘.
- 책장의 황동 명패는 **반드시 position: absolute**로 — flex flow에 두면 narrow viewport에서 다른 줄로 wrap되어 책들이 "떠 보이는" 현상 발생.
- 사이드바 폭 transition은 의도적으로 snap (no transition) — flex item의 width transition은 min-width: auto와 충돌해서 정상 동작 안 함. 책갈피 탭의 transform만 트랜지션.
- 액센트 컬러는 기존 오렌지(#ea580c 계열)보다 살짝 어둡고 차분한 톤(#7a3014~#8a3a1f). 의도된 변화이므로 그대로 사용 권장.
