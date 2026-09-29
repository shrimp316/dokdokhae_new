import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { MAX_IMAGE_BYTES, UPLOAD_MIMETYPES, checkImageFiles } from '../src/lib/imagePolicy.js';

const MB = 1024 * 1024;
const file = (name, type, size = MB) => ({ name, type, size });

// storage.rules는 JS 모듈을 import할 수 없어 형식·크기 제한을 따로 적어 둔다.
// 브라우저에서 통과시킨 이미지를 Storage가 거절하지 않도록 두 곳의 기준이 같은지 확인한다.
test('storage.rules의 이미지 형식·크기 제한이 imagePolicy와 같다', async () => {
  const rules = await readFile(new URL('../storage.rules', import.meta.url), 'utf8');
  const fn = /function isSmallImage\(\) \{([\s\S]*?)\}/.exec(rules);
  assert.ok(fn, 'isSmallImage를 storage.rules에서 찾을 수 없음');

  const types = /contentType\.matches\('image\/\(([^)]+)\)'\)/.exec(fn[1]);
  assert.ok(types, 'isSmallImage에 형식 조건이 없음');
  assert.deepEqual(
    types[1].split('|').map((t) => `image/${t}`).sort(),
    [...UPLOAD_MIMETYPES].sort(),
  );

  const size = /size < (\d+) \* 1024 \* 1024/.exec(fn[1]);
  assert.ok(size, 'isSmallImage에 크기 조건이 없음');
  assert.equal(Number(size[1]) * MB, MAX_IMAGE_BYTES);
});

test('허용 형식이고 10MB 미만이면 그대로 올린다', () => {
  const files = [file('a.jpg', 'image/jpeg'), file('b.png', 'image/png'), file('c.webp', 'image/webp', MAX_IMAGE_BYTES - 1)];
  assert.deepEqual(checkImageFiles(files), { accepted: files, message: null });
});

test('10MB 이상이면 빼고, 파일 이름과 함께 안내한다', () => {
  const ok = file('ok.jpg', 'image/jpeg');
  const big = file('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES);
  const { accepted, message } = checkImageFiles([ok, big]);
  assert.deepEqual(accepted, [ok]);
  assert.match(message, /10MB 미만/);
  assert.match(message, /big\.jpg/);
});

test('지원하지 않는 형식은 빼고, 형식 이름을 알려준다', () => {
  const { accepted, message } = checkImageFiles([file('photo.heic', 'image/heic'), file('doc.pdf', '')]);
  assert.deepEqual(accepted, []);
  assert.match(message, /지원하지 않는 형식이에요\. \(HEIC, PDF\)/);
});

test('형식과 크기 문제가 함께 있으면 두 안내를 모두 보여준다', () => {
  const { accepted, message } = checkImageFiles([
    file('photo.heic', 'image/heic'),
    file('big.png', 'image/png', 20 * MB),
    file('ok.gif', 'image/gif'),
  ]);
  assert.deepEqual(accepted.map((f) => f.name), ['ok.gif']);
  assert.match(message, /지원하지 않는 형식/);
  assert.match(message, /10MB 미만/);
});
