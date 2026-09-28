// 댓글 공통 정책. 댓글 화면(CommentSection)과 이 주의 글 댓글 API가 함께 쓴다.
//
// 게시판·감상평 댓글은 브라우저가 Firestore에 직접 쓰고 firestore.rules가 검증한다.
// rules 파일은 이 모듈을 import할 수 없으므로 COMMENT_MAX_LENGTH를 바꾸면
// firestore.rules의 validCommentContent도 함께 바꿔야 한다.
// (tests/comment-policy.test.mjs가 두 값이 같은지 확인한다.)

export const COMMENT_MAX_LENGTH = 5000;

// 비회원(익명) 댓글 작성자 닉네임 길이
export const ANON_NICKNAME_MIN = 2;
export const ANON_NICKNAME_MAX = 20;

// 컬렉션별 댓글 방식.
// - apiPath: 있으면 `${apiPath}/{postId}/comments` 서버 API로 작성·수정한다.
//   (리치 HTML sanitize, 비회원 검증이 필요한 경우) 없으면 Firestore에 직접 쓴다.
// - rich: 최상위 댓글을 에디터(HTML)로 작성한다. 답글은 항상 일반 텍스트.
// - allowAnonymous: 비회원도 닉네임을 입력해 작성할 수 있다.
const DEFAULT_MODE = { apiPath: null, rich: false, allowAnonymous: false };

const COMMENT_MODES = {
  featuredPassages: { apiPath: '/api/content/featured', rich: true, allowAnonymous: true },
};

export function commentMode(collectionName) {
  return COMMENT_MODES[collectionName] || DEFAULT_MODE;
}

// 최상위 댓글만 리치 HTML이다. (예전 데이터는 isRich 필드로도 표시돼 있다.)
export function isRichComment(mode, comment) {
  return mode.rich && (comment.isRich || !comment.parentId);
}
