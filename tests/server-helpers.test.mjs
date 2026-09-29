import assert from 'node:assert/strict';
import test from 'node:test';

import { responseText } from '../src/lib/ai.js';
import { ContentApiError } from '../src/lib/contentApiError.js';
import { sendToAll } from '../src/lib/push.js';
import { postPath } from '../src/lib/routes.js';

// --- lib/push.js ---------------------------------------------------------

// fcmTokens 컬렉션과 FCM을 흉내 낸다. failures에 토큰별 실패 코드를 주면 그 토큰만 실패한다.
function fakePush(tokenCount, failures = {}) {
  const docs = Array.from({ length: tokenCount }, (_, i) => ({
    ref: { id: `uid${i}` },
    data: () => ({ token: `t${i}` }),
  }));
  docs.push({ ref: { id: 'no-token' }, data: () => ({}) });

  const calls = { reads: 0, multicast: [], deleted: [], batches: 0 };
  const db = {
    collection: () => ({ get: async () => { calls.reads += 1; return { docs }; } }),
    batch: () => {
      calls.batches += 1;
      return { delete: (ref) => calls.deleted.push(ref.id), commit: async () => {} };
    },
  };
  const messaging = {
    sendEachForMulticast: async ({ tokens, webpush }) => {
      calls.multicast.push({ count: tokens.length, link: webpush.fcmOptions.link });
      const responses = tokens.map((t) => (failures[t]
        ? { success: false, error: { code: failures[t] } }
        : { success: true }));
      const failureCount = responses.filter((r) => !r.success).length;
      return { responses, successCount: tokens.length - failureCount, failureCount };
    },
  };
  return { db, messaging, calls };
}

test('sendToAll은 등록 해제된 토큰만 지우고, 일시적 실패 토큰은 남긴다', async () => {
  const { db, messaging, calls } = fakePush(4, {
    t1: 'messaging/registration-token-not-registered',
    t2: 'messaging/invalid-registration-token',
    t3: 'messaging/internal-error',
  });
  const result = await sendToAll(db, messaging, { title: '제목', body: '본문', url: '/schedule' });

  assert.deepEqual(result, { tokenCount: 4, successCount: 1, failureCount: 3, removedCount: 2 });
  assert.deepEqual(calls.deleted, ['uid1', 'uid2']);
  assert.equal(calls.reads, 1, '토큰 컬렉션은 한 번만 읽는다');
  assert.equal(calls.multicast[0].link, '/schedule');
});

test('sendToAll은 토큰을 500개씩 나눠 보낸다', async () => {
  const { db, messaging, calls } = fakePush(1201);
  const result = await sendToAll(db, messaging, { title: '제목', body: '본문' });

  assert.deepEqual(calls.multicast.map((c) => c.count), [500, 500, 201]);
  assert.equal(result.successCount, 1201);
  assert.equal(calls.batches, 0, '지울 토큰이 없으면 배치를 만들지 않는다');
  assert.equal(calls.multicast[0].link, '/', 'url 기본값은 홈');
});

test('sendToAll은 토큰이 없으면 발송하지 않는다', async () => {
  const { db, messaging, calls } = fakePush(0);
  const result = await sendToAll(db, messaging, { title: '제목', body: '본문' });
  assert.deepEqual(result, { tokenCount: 0, successCount: 0, failureCount: 0, removedCount: 0 });
  assert.equal(calls.multicast.length, 0);
});

// --- lib/routes.js -------------------------------------------------------

test('postPath는 글 종류별 화면 주소를 만든다 (감상평은 책 페이지)', () => {
  assert.equal(postPath({ collectionName: 'board', postId: 'p1' }), '/board/p1');
  assert.equal(postPath({ collectionName: 'reviews', postId: 'r1', bookId: 'b1' }), '/books/b1');
  assert.equal(postPath({ collectionName: 'featuredPassages', postId: 'f1' }), '/featured/f1');
});

// --- lib/ai.js -----------------------------------------------------------

const message = (content, stop_reason = 'end_turn') => ({ content, stop_reason });

test('responseText는 text 블록만 모아 돌려준다', () => {
  const text = responseText(message([
    { type: 'thinking', thinking: '' },
    { type: 'text', text: '  첫 줄\n' },
    { type: 'text', text: '둘째 줄  ' },
  ]));
  assert.equal(text, '첫 줄\n둘째 줄');
});

test('responseText는 잘리거나 거절되거나 빈 응답을 관리자용 에러로 바꾼다', () => {
  const cases = [
    [message([{ type: 'text', text: '반쯤' }], 'max_tokens'), /잘렸어요/],
    [message([], 'refusal'), /답하지 않았어요/],
    [message([{ type: 'text', text: '   ' }]), /비어 있어요/],
    [message(undefined), /비어 있어요/],
  ];
  for (const [msg, pattern] of cases) {
    assert.throws(() => responseText(msg), (error) => {
      assert.ok(error instanceof ContentApiError);
      assert.equal(error.status, 502);
      assert.match(error.message, pattern);
      return true;
    });
  }
});
