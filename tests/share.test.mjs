import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { shareLink } from '../src/lib/share.js';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let alerts;

// shareLink는 브라우저 전역(navigator, alert)을 쓰므로 테스트마다 가짜로 바꿔 끼운다.
function stubBrowser({ share, writeText }) {
  alerts = [];
  const calls = { share: [], writeText: [] };
  const nav = {};
  if (share) nav.share = async (data) => { calls.share.push(data); return share(data); };
  if (writeText) nav.clipboard = { writeText: async (text) => { calls.writeText.push(text); return writeText(text); } };
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
  globalThis.alert = (msg) => alerts.push(msg);
  return calls;
}

function abortError() {
  const e = new Error('Share canceled');
  e.name = 'AbortError';
  return e;
}

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  delete globalThis.alert;
});

const target = { title: '제목', url: 'https://example.com/board/1' };

test('공유 시트로 공유하면 링크를 복사하지 않는다', async () => {
  const calls = stubBrowser({ share: () => {}, writeText: () => {} });
  await shareLink(target);
  assert.deepEqual(calls.share, [target]);
  assert.deepEqual(calls.writeText, []);
  assert.deepEqual(alerts, []);
});

test('사용자가 공유 시트를 닫으면(AbortError) 에러 없이 조용히 끝난다', async () => {
  const calls = stubBrowser({ share: () => { throw abortError(); }, writeText: () => {} });
  await shareLink(target);
  assert.deepEqual(calls.writeText, []);
  assert.deepEqual(alerts, []);
});

test('공유 시트가 다른 이유로 실패하면 링크 복사로 대신한다', async () => {
  const calls = stubBrowser({
    share: () => { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e; },
    writeText: () => {},
  });
  await shareLink(target);
  assert.deepEqual(calls.writeText, [target.url]);
  assert.deepEqual(alerts, ['링크가 복사됐어요!']);
});

test('공유 시트가 없으면 링크를 복사한다', async () => {
  const calls = stubBrowser({ writeText: () => {} });
  await shareLink(target);
  assert.deepEqual(calls.writeText, [target.url]);
  assert.deepEqual(alerts, ['링크가 복사됐어요!']);
});

test('클립보드도 쓸 수 없으면 직접 복사하라고 안내한다', async () => {
  stubBrowser({});
  await shareLink(target);
  assert.deepEqual(alerts, ['링크를 복사하지 못했어요. 주소창의 링크를 직접 복사해주세요.']);
});
