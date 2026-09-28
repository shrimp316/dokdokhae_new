const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

// 목록 미리보기·검색용 평문. 태그 자리를 공백으로 바꿔 문단 경계의 단어가 붙지 않게 한다.
export function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}
export function extractFirstImage(html) {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || '');
  return m ? m[1] : null;
}
export function matchAny(haystacks, needle) {
  const q = (needle || '').trim().toLowerCase();
  if (!q) return true;
  return haystacks.some(h => (h || '').toString().toLowerCase().includes(q));
}
