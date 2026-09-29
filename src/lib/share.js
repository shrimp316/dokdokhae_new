// 공유 시트가 있으면 쓰고, 없거나 실패하면 링크 복사로 대신한다.
// 사용자가 공유 시트를 닫으면 AbortError가 나는데, 이는 정상 동작이라 조용히 끝낸다.
export async function shareLink({ title, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }

  // HTTPS가 아니거나 권한이 없으면 clipboard가 없거나 거절된다.
  try {
    await navigator.clipboard.writeText(url);
    alert('링크가 복사됐어요!');
  } catch {
    alert('링크를 복사하지 못했어요. 주소창의 링크를 직접 복사해주세요.');
  }
}
