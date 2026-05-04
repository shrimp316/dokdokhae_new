export function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
export function matchAny(haystacks, needle) {
  const q = (needle || '').trim().toLowerCase();
  if (!q) return true;
  return haystacks.some(h => (h || '').toString().toLowerCase().includes(q));
}
