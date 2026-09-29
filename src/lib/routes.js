// 댓글·좋아요가 달린 글의 화면 주소. 푸시 알림(api/notify)의 링크와 알림 목록(NotificationBell)의
// 이동 위치가 같아야 하므로 서버와 브라우저가 이 함수 하나를 같이 쓴다. (서버 전용 코드를 넣지 않는다)
// 감상평은 단독 페이지가 없어 해당 책 페이지로 보낸다.
export function postPath({ collectionName, postId, bookId }) {
  if (collectionName === 'board') return `/board/${postId}`;
  if (collectionName === 'reviews') return `/books/${bookId}`;
  return `/featured/${postId}`;
}
