# Claude Code에 넘길 때 사용할 프롬프트

아래 프롬프트를 Claude Code에 붙여넣고, 이 폴더를 첨부하세요.

---

## 프롬프트

```
독독해(dokdokhae) 사이트의 UI를 새 디자인으로 교체하려고 해.

첨부한 폴더에:
- README.md: 디자인 전체 명세 (스크린별 레이아웃, 토큰, 인터랙션)
- tokens.css: 그대로 가져다 쓸 수 있는 CSS 변수 모음
- reference/: HTML 프로토타입 소스 (그대로 쓰는 게 아니라 참조용)

작업 순서:

1. README.md를 먼저 끝까지 읽어줘. 디자인 의도와 핵심 결정사항 파악.

2. 현재 Next.js 프로젝트 구조를 살펴봐 (app/, components/, styles/ 등).
   기존에 어떤 스타일링 방식을 쓰고 있는지(Tailwind / CSS Modules / 
   styled-components / plain CSS) 확인하고, 그 방식에 맞춰 작업해.

3. 디자인 토큰 적용:
   - tokens.css의 CSS 변수를 globals.css 또는 동등한 위치에 머지
   - 기존 오렌지 컬러(#ea580c 계열 등)를 var(--dd-accent)로 전부 교체
   - <html>에 data-mode 속성 토글로 라이트/세피아/다크 전환 지원

4. 컴포넌트 이식 — 다음 우선순위로:
   a. Sidebar + SidebarTab (책갈피 토글) — reference/app-study.jsx 참조
   b. HomeScreen 마스트헤드 (큰 세리프 + 다음 모임 카드) — screens.jsx의 HomeScreen
   c. BookShelfStudy (책장 + 황동 명패) — screens.jsx의 BookShelfStudy
      ⚠️ writing-mode는 반드시 vertical-lr, 명패는 반드시 position: absolute
   d. 나머지 화면들 (도서 상세, 이 주의 글, 모임 일정, 감상평, 자유게시판, 공지)

5. 라우팅:
   - 현재 단일 페이지 상태(screen.id)로 화면 전환 — Next.js 라우터로 교체
   - / (홈) / /books / /books/[id] / /weekly / /meetings / /reviews / /board / /notices

6. 데이터:
   - reference/data.jsx의 mock data는 무시. 기존 API/DB로 연결.
   - 단, 책 객체에는 color/spine/cover 3색이 필요. DB 컬럼 추가하거나
     책 제목 hash로 자동 생성하는 헬퍼 만들 것.

7. 상태:
   - 사이드바 isOpen → Context + localStorage
   - mode → <html data-mode> + localStorage
   - fontSize → CSS 변수 + localStorage

질문 있으면 작업 중간에 물어봐줘. 한 번에 다 끝내려고 하지 말고,
1단계씩 끝내고 보여주면서 진행해.
```

---

## 단계별로 나눠서 부탁하고 싶을 때

전체를 한 번에 맡기는 대신 단계별로 진행하고 싶다면, 위 프롬프트의 "작업 순서" 중 한두 개씩만 골라서 부탁:

```
첨부한 폴더의 README.md와 tokens.css를 읽고,
일단 1단계 (디자인 토큰 적용)만 해줘.
globals.css에 토큰 머지하고, 기존 오렌지 컬러 교체.
```

그 다음:

```
이제 2단계 (Sidebar + SidebarTab)를 ./reference/app-study.jsx 참조해서
components/Sidebar.tsx로 만들어줘. 라우팅은 next/navigation 사용.
```

---

## 주의

- Claude Code에는 **이 폴더 전체를 첨부**해줘야 reference 파일들도 볼 수 있어요.
- 첨부 후 "이 폴더의 파일을 ls해봐"라고 한 번 시키면 잘 인식했는지 확인 가능.
