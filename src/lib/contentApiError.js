// API가 사용자에게 그대로 보여줄 에러(상태 코드 + 메시지). contentApiErrorResponse가 이 에러만 메시지를 내보낸다.
// 다른 의존성이 없어야 lib/ai.js 같은 모듈과 node 테스트에서도 불러올 수 있다.
export class ContentApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ContentApiError';
    this.status = status;
  }
}
