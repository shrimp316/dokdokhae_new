import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDate, formatDateTime, formatDotDate, formatMonthDay, formatTime,
} from '../src/lib/format.js';

// 로컬 시간 기준으로 만들어, 테스트를 돌리는 컴퓨터의 시간대와 상관없이 결과가 같게 한다.
const date = new Date(2026, 2, 7, 19, 5);
const timestamp = { toDate: () => date };
const meetingString = '2026-03-07T19:05';

test('Firestore Timestamp, Date, datetime-local 문자열을 같은 날짜로 읽는다', () => {
  for (const value of [timestamp, date, meetingString]) {
    assert.equal(formatMonthDay(value), '03-07');
    assert.equal(formatDotDate(value), '2026.3.7');
    assert.equal(formatDate(value), '2026-03-07');
    assert.equal(formatTime(value), '19:05');
    assert.equal(formatDateTime(value), '2026-03-07 19:05');
  }
});

test('모임 일시는 분까지 보여준다', () => {
  assert.equal(formatDateTime('2026-03-07T19:30'), '2026-03-07 19:30');
});

test('값이 없거나 날짜가 아니면 빈 문자열을 돌려준다', () => {
  const formatters = [formatMonthDay, formatDotDate, formatDate, formatTime, formatDateTime];
  for (const value of [null, undefined, '', 'not a date', {}]) {
    for (const format of formatters) {
      assert.equal(format(value), '', `${format.name}(${JSON.stringify(value)})`);
    }
  }
});
