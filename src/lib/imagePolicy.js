// 본문 이미지 업로드 규칙. storage.rules의 isSmallImage()와 같게 유지한다.
// 규칙을 어기면 Storage가 거절해 이유 없이 "업로드 실패"만 보이므로, 올리기 전에 먼저 걸러 안내한다.
// Firebase를 import하지 않아 에디터와 테스트에서 그대로 쓸 수 있다.

// 형식 → 저장할 파일 확장자
export const UPLOAD_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
export const UPLOAD_MIMETYPES = Object.keys(UPLOAD_IMAGE_TYPES);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const SUPPORTED_IMAGE_LABEL = 'JPG, PNG, GIF, WebP';

// 아이폰 사진(HEIC)처럼 자주 올리는 형식이 왜 안 되는지 알 수 있게 걸린 형식 이름을 함께 보여준다.
function unsupportedFileMessage(files) {
  const kinds = [...new Set(files.map((file) => {
    const ext = file.name?.includes('.') ? file.name.split('.').pop() : '';
    return (file.type ? file.type.split('/').pop().split('+')[0] : ext).toUpperCase() || '알 수 없음';
  }))];
  return `지원하지 않는 형식이에요. (${kinds.join(', ')})\n사용할 수 있는 이미지 형식: ${SUPPORTED_IMAGE_LABEL}`;
}

function tooLargeMessage(files) {
  const names = files.map((file) => file.name || '이미지').join(', ');
  return `10MB 미만 이미지만 올릴 수 있어요. (${names})`;
}

// 이미지 버튼과 붙여넣기·끌어놓기가 같은 기준으로 거른다.
// 올릴 수 있는 파일만 accepted로 돌려주고, 걸러낸 파일이 있으면 안내 문구를 message로 준다.
export function checkImageFiles(files) {
  const list = Array.from(files);
  const unsupported = list.filter((file) => !UPLOAD_MIMETYPES.includes(file.type));
  const tooLarge = list.filter((file) => UPLOAD_MIMETYPES.includes(file.type) && file.size >= MAX_IMAGE_BYTES);
  const accepted = list.filter((file) => !unsupported.includes(file) && !tooLarge.includes(file));

  const messages = [];
  if (unsupported.length > 0) messages.push(unsupportedFileMessage(unsupported));
  if (tooLarge.length > 0) messages.push(tooLargeMessage(tooLarge));
  return { accepted, message: messages.length > 0 ? messages.join('\n\n') : null };
}
