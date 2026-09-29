import assert from 'node:assert/strict';
import test from 'node:test';

import { isEmptyRichHtml } from '../src/lib/html.js';

// 클라이언트 제출 전 검사와 서버 저장 검증(sanitizedRichHtml)이 이 함수를 같이 쓴다.
// 여기서 빈 글로 보는 입력은 브라우저에서 막히고, 서버에서도 거절된다.
test('내용이 없는 에디터 출력은 빈 글로 본다', () => {
  const empties = [
    '',
    null,
    undefined,
    '<p><br></p>',
    '<p><br></p><p><br></p>',
    '<p><br/></p>',
    '<p> &nbsp; &#160; </p>',
    '<p><!-- comment --></p>',
    '<h2><br></h2><ul><li><br></li></ul>',
  ];
  for (const html of empties) {
    assert.equal(isEmptyRichHtml(html), true, JSON.stringify(html));
  }
});

test('글자나 이미지가 있으면 빈 글이 아니다', () => {
  const filled = [
    '<p>a</p>',
    '<p><br></p><p>안녕하세요</p>',
    '<p><img src="https://example.com/a.png"></p>',
    '<IMG SRC="https://example.com/a.png">',
    '<p>&lt;br&gt;</p>',
  ];
  for (const html of filled) {
    assert.equal(isEmptyRichHtml(html), false, JSON.stringify(html));
  }
});
