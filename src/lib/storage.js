import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { UPLOAD_IMAGE_TYPES } from '@/lib/imagePolicy';

// 원래 파일 이름은 공개 URL에 그대로 드러나고, 붙여넣은 이미지는 대개 image.png라 경로가 겹칠 수 있다.
// storage.rules가 덮어쓰기를 막으므로 겹치면 업로드가 실패한다. 그래서 무작위 이름에 확장자만 붙인다.
// randomUUID는 HTTPS·localhost에서만 있어, 개발 중 다른 기기에서 http로 접속할 때를 대비해 대체값을 둔다.
function randomFileName(file) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${id}.${UPLOAD_IMAGE_TYPES[file.type] ?? 'img'}`;
}

// folder는 storage.rules가 허용하는 board / reviews / notices 중 하나여야 한다.
export async function uploadImage(folder, file) {
  const fileRef = ref(storage, `${folder}/${randomFileName(file)}`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}
