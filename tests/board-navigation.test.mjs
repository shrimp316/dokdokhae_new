import assert from 'node:assert/strict';
import test from 'node:test';

import { boardHref, readBoardState } from '../src/lib/boardNavigation.js';

test('preserves Korean search, prefix, and page through a post and its list return', () => {
  const state = { search: '책 & 독서 + #추천', prefix: '책 이야기', page: 3 };
  const listUrl = new URL(boardHref(state), 'https://example.com');
  const postUrl = new URL(boardHref(readBoardState(listUrl.searchParams), 'post-123'), listUrl);
  const returnUrl = new URL(boardHref(readBoardState(postUrl.searchParams)), postUrl);

  assert.equal(postUrl.pathname, '/board/post-123');
  assert.deepEqual(readBoardState(returnUrl.searchParams), state);
  assert.equal(returnUrl.href, listUrl.href);
});

test('fresh lists and clearing the search use defaults without stale query values', () => {
  assert.deepEqual(readBoardState(new URLSearchParams()), { search: '', prefix: '', page: 1 });
  assert.equal(boardHref({ search: '', prefix: '', page: 1 }), '/board');
  assert.equal(boardHref({ search: '', prefix: '질문', page: 1 }), '/board?prefix=%EC%A7%88%EB%AC%B8');
});

test('malformed, negative, fractional, or unsafe page values fall back to page one', () => {
  for (const page of ['', '0', '-1', '1.5', 'abc', 'Infinity', '9007199254740992']) {
    assert.equal(readBoardState(new URLSearchParams({ page })).page, 1, page);
  }
  assert.equal(readBoardState(new URLSearchParams('page=8')).page, 8);
});

test('return links only retain board fields and cannot become an external redirect', () => {
  const params = new URLSearchParams({
    q: 'https://elsewhere.example/?x=1',
    prefix: 'javascript:alert(1)',
    page: '2',
    returnTo: '//elsewhere.example',
  });
  const target = new URL(boardHref(readBoardState(params)), 'https://example.com');
  assert.equal(target.origin, 'https://example.com');
  assert.equal(target.pathname, '/board');
  assert.equal(target.searchParams.has('returnTo'), false);
  assert.equal(target.searchParams.get('q'), params.get('q'));
});
