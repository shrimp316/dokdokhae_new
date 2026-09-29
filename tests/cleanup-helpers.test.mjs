import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { mapDocs } from '../src/lib/firestore.js';
import { alertIfSanitized } from '../src/lib/sanitize.client.js';

// Firestore QuerySnapshot 모양만 흉내 낸다. data()에 넘긴 옵션을 기록해 둔다.
function fakeSnap(docs) {
  const dataCalls = [];
  return {
    dataCalls,
    docs: docs.map(({ id, fields }) => ({
      id,
      data: (options) => { dataCalls.push(options); return fields; },
    })),
  };
}

test('mapDocs는 문서마다 { id, ...필드 }를 만든다', () => {
  const snap = fakeSnap([
    { id: 'a', fields: { title: '첫 글' } },
    { id: 'b', fields: { title: '둘째 글', likes: 2 } },
  ]);
  assert.deepEqual(mapDocs(snap), [
    { id: 'a', title: '첫 글' },
    { id: 'b', title: '둘째 글', likes: 2 },
  ]);
});

test('mapDocs는 문서에 id 필드가 있으면 그 값을 쓴다 (기존 화면들과 같은 규칙)', () => {
  const snap = fakeSnap([{ id: 'doc-id', fields: { id: 'field-id' } }]);
  assert.deepEqual(mapDocs(snap), [{ id: 'field-id' }]);
});

test('mapDocs는 옵션을 data()에 그대로 넘긴다', () => {
  const snap = fakeSnap([{ id: 'a', fields: {} }]);
  mapDocs(snap, { serverTimestamps: 'estimate' });
  assert.deepEqual(snap.dataCalls, [{ serverTimestamps: 'estimate' }]);
});

let alerts;
afterEach(() => { delete globalThis.alert; });
function stubAlert() {
  alerts = [];
  globalThis.alert = (msg) => alerts.push(msg);
}

test('alertIfSanitized는 걸러낸 내용이 없으면 알리지 않는다', () => {
  stubAlert();
  alertIfSanitized(false);
  alertIfSanitized(undefined);
  assert.deepEqual(alerts, []);
});

test('alertIfSanitized는 저장과 임시저장을 다른 문구로 알린다', () => {
  stubAlert();
  alertIfSanitized(true);
  alertIfSanitized(true, { draft: true });
  assert.deepEqual(alerts, [
    '안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 저장했습니다.',
    '안전하지 않거나 지원되지 않는 HTML을 제거한 뒤 임시저장합니다.',
  ]);
});
