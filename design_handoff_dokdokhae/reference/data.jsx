// Mock data for 독독해 reading club site
const BOOK_COVER = (palette) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 170'><defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='${palette[0]}'/><stop offset='1' stop-color='${palette[1]}'/></linearGradient></defs><rect width='120' height='170' fill='url(%23g)'/><rect x='8' y='8' width='104' height='154' fill='none' stroke='${palette[2]}' stroke-opacity='.35'/></svg>`)}`;

const BOOKS = [
  { id: 'b1', title: '살인자의 기억법', author: '김영하', year: 2013, genre: '장편소설', color: '#c8362a', spine: '#a8261c', cover: '#d44034', current: true,
    intro: '김영하의 장편소설 『살인자의 기억법』. 《너의 목소리가 들려》 이후 일 년 반 만에 펴낸 장편소설로 알츠하이머에 걸려 점점 사라져가는 기억과 사투를 벌이는 은퇴한 연쇄살인범의 이야기를 담고 있다.',
    excerpt: '1960년대라는 격동의 시대, 급속한 산업화 속에서 개인의 욕망과 현실 사이의 간극을 탐색하는 작품입니다. 안개 속의 낯선 도시라는 배경 설정은 단순한 장소 묘사를 넘어, 주인공이 마주하게 되는 내적 혼란과 불안감을 시각적으로 드러냅니다.',
    quote: '기억이 사라지면, 나는 누구인가.', questions: 3 },
  { id: 'b2', title: '바냐 아저씨', author: '안톤 체호프', year: 1899, genre: '희곡', color: '#3a4a3b', spine: '#2a3a2b', cover: '#4a5a4c' },
  { id: 'b3', title: '너는 너로 살고 있니', author: '김숨', year: 2017, genre: '소설', color: '#6b8aa8', spine: '#4b6a88', cover: '#7b9ab8' },
  { id: 'b4', title: '설국', author: '가와바타 야스나리', year: 1948, genre: '장편소설', color: '#8b7aa8', spine: '#6b5a88', cover: '#9b8ab8' },
  { id: 'b5', title: '하쿠나 마타타 우리 같이 춤출래', author: '오소희', year: 2020, genre: '에세이', color: '#2c2c2c', spine: '#1c1c1c', cover: '#3c3c3c' },
  { id: 'b6', title: '인간과 상징', author: '카를 융 외', year: 1964, genre: '심리학', color: '#a8b8c8', spine: '#88a0b8', cover: '#b8c8d8' },
  { id: 'b7', title: '인생 따위 엿이나 먹어라', author: '마루야마 겐지', year: 2013, genre: '에세이', color: '#a83a2a', spine: '#882c1c', cover: '#b84a3a' },
  { id: 'b8', title: '사랑의 기술', author: '에리히 프롬', year: 1956, genre: '인문', color: '#e8c8b8', spine: '#c8a898', cover: '#f0d4c0' },
  { id: 'b9', title: '전락', author: '알베르 카뮈', year: 1956, genre: '소설', color: '#c4b89a', spine: '#a8987a', cover: '#d4c8aa' },
  { id: 'b10', title: '가면의 고백', author: '미시마 유키오', year: 1949, genre: '소설', color: '#222', spine: '#111', cover: '#333' },
  { id: 'b11', title: '존재의 세 가지 거짓말', author: '아고타 크리스토프', year: 1986, genre: '소설', color: '#3a6a4a', spine: '#2a5a3a', cover: '#4a7a5a' },
  { id: 'b12', title: '카타리나 블룸의 잃어버린 명예', author: '하인리히 뵐', year: 1974, genre: '소설', color: '#7a8a9a', spine: '#5a6a7a', cover: '#8a9aaa' },
];

const CURRENT_BOOK = BOOKS[0];

const WEEKLY_POSTS = [
  { id: 'w1', week: '2026-W20', book: '무진기행 / 김승옥', tag: '소개', current: true,
    body: '1960년대라는 격동의 시대, 급속한 산업화 속에서 개인의 욕망과 현실 사이의 간극을 탐색하는 작품입니다. 안개 속의 낯선 도시라는 배경 설정은 단순한 장소 묘사를 넘어, 주인공이 마주하게 되는 내적 혼란과 불안감을…', questions: 3 },
  { id: 'w2', week: '2026-W19', book: '자유론(무삭제 완역본) / 존 스튜어트 밀', tag: '소개',
    body: '150년 전 저술된 고전이 오늘날 더욱 주목받는 이유는 무엇일까요? 이 책은 개인의 자유와 국가 권력의 경계에 대한 근본적인 질문을 던집니다.', questions: 3 },
  { id: 'w3', week: '2026-W18', book: '모순 / 양귀자', tag: '인용',
    body: '- 인생은 탐구하는 것이 아니라 살아가야 하는 것이다. 살아가면서 우리들이 해야 할 말은 말이 아니라 삶이어야 한다.\n- 사람들은 작은 상처는 오래…', questions: 4 },
  { id: 'w4', week: '2026-W17', book: '이방인 / 알베르 카뮈', tag: '인용',
    body: '오늘 엄마가 죽었다. 아니면 어제. 잘 모르겠다. 나는 전보를 받았다: "어머니 별세. 내일 장례식. 진심의 위로를 드립니다." 이것은 아무것도…', questions: 4 },
];

const MEETINGS = [
  { id: 'm1', date: '2026-05-23', time: '13:00 ~ 17:00', book: '살인자의 기억법', label: '1회 모임', d: 9 },
  { id: 'm2', date: '2026-05-24', time: '17:00', book: '살인자의 기억법', label: '2회차', d: 10 },
  { id: 'm3', date: '2026-06-13', time: '13:00', book: '다음 책', label: '6월 1회', d: 30 },
];

const REVIEWS = [
  { id: 'r1', user: '대인팁', rating: 3, book: '설국', body: '말은 많지만 드러내진 않는다🥲', likes: 1, comments: 0 },
  { id: 'r2', user: '후레시베리', rating: 4, book: '설국', body: '1. 눈에 보이는 명확한 플롯이 없을 수는 있다. 그러나 인물의 내면 풍경이 더없이 선명하다.', likes: 1, comments: 0 },
  { id: 'r3', user: '정이', rating: 4, book: '하쿠나 마타타 우리 같이…', body: '\'열 줄 아는\' 사람이, \'확 살아버릴\' 줄 아…', likes: 1, comments: 0 },
  { id: 'r4', user: '양강', rating: 1, book: '하쿠나 마타타 우리 같이…', body: '1. 오지에서도 우리가 생각하는 아름다움이…', likes: 1, comments: 0 },
  { id: 'r5', user: '대인팁', rating: 4, book: '하쿠나 마타타 우리 같이…', body: '-위태위태한 시뮬라크르😅 -기자적 글쓰…', likes: 0, comments: 0 },
  { id: 'r6', user: '대인팁', rating: 3, book: '사랑의 기술', body: '당신 걸리면 가만 안둬.', likes: 0, comments: 0 },
  { id: 'r7', user: '대인팁', rating: 5, book: '전락', body: '인생은 연극이고 모든 남녀는 배우다. 그러나 그들은 자…', likes: 0, comments: 0 },
  { id: 'r8', user: '정이', rating: 4, book: '사랑의 기술', body: '2회독. 무슨 말인지 모르겠고 너무 어려워서 성격파탄이…', likes: 1, comments: 0 },
  { id: 'r9', user: '범', rating: 5, book: '사랑의 기술', body: '사랑을 어떻게 설명해야하는가 사랑은 어떻게 정리되는가', likes: 1, comments: 0 },
];

const BOARD_POSTS = [
  { id: 'p1', tag: '리뷰', tagColor: '#b34a2a', title: 'Michael Jackson – Thriller (1982)', user: '꿈이독서인', date: '5/13' },
  { id: 'p2', tag: '글쓰기', tagColor: '#c87a4a', title: '시화) 이명', user: '후레시베리', date: '5/13' },
  { id: 'p3', tag: '필사', tagColor: '#8a3a1f', title: '연화석재', user: '후레시베리', date: '5/11' },
  { id: 'p4', tag: '기타', tagColor: '#a8773a', title: '소모임을 구성하셔도 좋습니다.', user: '대인팁', date: '5/4',
    body: '회원님들끼리 글쓰기, 필사, 특수한 독모( ex. 톨스토이 소설들 읽기 모임) 등 뜻이 맞으시는 분들끼리 소모임을 만드셔도 좋습니다당.', comments: 1 },
  { id: 'p5', tag: '리뷰', tagColor: '#b34a2a', title: 'Erotic Worms Exhibition – 아나토미 (2024)', user: '꿈이독서인', date: '5/1' },
  { id: 'p6', tag: '필사', tagColor: '#8a3a1f', title: '20260501 필사', user: '후레시베리', date: '5/1' },
  { id: 'p7', tag: '지난 독모', tagColor: '#6a4a3a', title: '04/26 독서모임 <하쿠나 마타타 우리 같이 춤출래?>', user: '대인팁', date: '5/1' },
  { id: 'p8', tag: '필사', tagColor: '#8a3a1f', title: '[이명의 탄생] 예술이란 진실을 암시하는 거짓', user: '테스피스', date: '5/1' },
  { id: 'p9', tag: '필사', tagColor: '#8a3a1f', title: '[이명의 탄생]새로운 감각을 갖는 유일한 방법은', user: '테스피스', date: '4/30' },
];

const NOTICES = [
  { id: 'n1', title: '신규 기능', date: '2026.4.9' },
  { id: 'n2', title: '정기 모임 <살인자의 기억법>, 05/23~05/24', date: '2026.4.9', pinned: true },
  { id: 'n3', title: '🤓📚 독서모임, 이상없다: 모임 안내 😎😎', date: '2026.4.9' },
];

const NAV = [
  { id: 'home', label: '홈', short: '홈' },
  { id: 'books', label: '도서 목록', short: '서가' },
  { id: 'weekly', label: '이 주의 글', short: '주간' },
  { id: 'meetings', label: '모임 일정', short: '일정' },
  { id: 'reviews', label: '내 감상평', short: '감상' },
  { id: 'board', label: '자유게시판', short: '게시판' },
  { id: 'notices', label: '공지사항', short: '공지' },
];

Object.assign(window, { BOOKS, CURRENT_BOOK, WEEKLY_POSTS, MEETINGS, REVIEWS, BOARD_POSTS, NOTICES, NAV });
