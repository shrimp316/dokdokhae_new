// 서버 저장 검증과 클라이언트 제출 전 검사가 같은 기준을 써야, 브라우저에서 통과한 글이
// 서버에서 빈 글로 거절되는 일이 없다. 서버 전용 모듈을 import하지 않아야 양쪽에서 쓸 수 있다.
export function isEmptyRichHtml(html) {
  if (!html) return true;
  if (/<img\b/i.test(html)) return false;
  return html
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<br\s*\/?\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim() === '';
}
