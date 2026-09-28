// 표지 색을 추출하기 전이나 표지가 없는 책도 늘 같은 색으로 보이도록 제목 해시로 팔레트를 고른다.
// 책 문서에 color/spine/cover가 저장돼 있으면 그 값이 우선한다.

const PALETTES = [
  { color: '#c8362a', spine: '#a8261c', cover: '#d44034' }, // red
  { color: '#3a4a3b', spine: '#2a3a2b', cover: '#4a5a4c' }, // forest green
  { color: '#6b8aa8', spine: '#4b6a88', cover: '#7b9ab8' }, // dusty blue
  { color: '#8b7aa8', spine: '#6b5a88', cover: '#9b8ab8' }, // mauve
  { color: '#2c2c2c', spine: '#1c1c1c', cover: '#3c3c3c' }, // charcoal
  { color: '#a8b8c8', spine: '#88a0b8', cover: '#b8c8d8' }, // pale slate
  { color: '#a83a2a', spine: '#882c1c', cover: '#b84a3a' }, // brick
  { color: '#e8c8b8', spine: '#c8a898', cover: '#f0d4c0' }, // peach paper
  { color: '#c4b89a', spine: '#a8987a', cover: '#d4c8aa' }, // sand
  { color: '#3a6a4a', spine: '#2a5a3a', cover: '#4a7a5a' }, // moss
  { color: '#7a8a9a', spine: '#5a6a7a', cover: '#8a9aaa' }, // stone
  { color: '#6a4a3a', spine: '#4a2c1c', cover: '#7a5c4a' }, // walnut
];

function hashString(s) {
  let h = 5381;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & h; // 32비트 정수로 유지
  }
  return Math.abs(h);
}

export function paletteFor(title) {
  return PALETTES[hashString(title) % PALETTES.length];
}

export function bookColors(book) {
  if (!book) return PALETTES[0];
  if (book.color && book.spine && book.cover) {
    return { color: book.color, spine: book.spine, cover: book.cover };
  }
  return paletteFor(book.title || book.id || '');
}
