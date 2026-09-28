import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  COMMENT_MAX_LENGTH, commentMode, isRichComment,
} from '../src/lib/commentPolicy.js';

// firestore.rules는 JS 모듈을 import할 수 없어 댓글 길이 제한을 따로 적어 둔다.
// 게시판·감상평 댓글(rules 검증)과 이 주의 글 댓글(API 검증)의 제한이 어긋나지 않게 확인한다.
test('firestore.rules의 댓글 길이 제한이 COMMENT_MAX_LENGTH와 같다', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const fn = /function validCommentContent\(content\) \{([\s\S]*?)\}/.exec(rules);
  assert.ok(fn, 'validCommentContent를 firestore.rules에서 찾을 수 없음');

  const max = /content\.size\(\) <= (\d+)/.exec(fn[1]);
  assert.ok(max, 'validCommentContent에 최대 길이 조건이 없음');
  assert.equal(Number(max[1]), COMMENT_MAX_LENGTH);
});

test('이 주의 글 댓글만 서버 API·리치 HTML·비회원 작성을 쓴다', () => {
  assert.deepEqual(commentMode('featuredPassages'), {
    apiPath: '/api/content/featured', rich: true, allowAnonymous: true,
  });
  for (const name of ['board', 'reviews']) {
    assert.deepEqual(commentMode(name), { apiPath: null, rich: false, allowAnonymous: false });
  }
});

test('리치 모드에서는 최상위 댓글만 리치 HTML이다', () => {
  const rich = commentMode('featuredPassages');
  assert.equal(isRichComment(rich, { parentId: null }), true);
  assert.equal(isRichComment(rich, { parentId: 'c1' }), false);
  assert.equal(isRichComment(rich, { parentId: 'c1', isRich: true }), true);
  assert.equal(isRichComment(commentMode('board'), { parentId: null }), false);
});
