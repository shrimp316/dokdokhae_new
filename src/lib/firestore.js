// 조회 결과를 화면에서 쓰는 { id, ...필드 } 목록으로 바꾼다.
// id를 먼저 두므로, 문서에 id 필드가 있으면 그 값이 문서 ID를 덮는다. 모든 화면이 같은 규칙을 따르게 여기서만 만든다.
// options는 DocumentSnapshot.data()에 그대로 넘긴다. (예: 방금 쓴 댓글의 serverTimestamp를 추정값으로 받기)
export function mapDocs(snap, options) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data(options) }));
}
