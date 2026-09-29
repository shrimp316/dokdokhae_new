// 등록된 모든 기기에 웹 푸시를 보낸다. 예약 알림(api/cron)과 관리자 즉시 발송(api/send-notification)이 같이 쓴다.
// db와 messaging은 Admin SDK 인스턴스를 받는다. (테스트에서 가짜를 넣을 수 있게 인자로 받는다)

// sendEachForMulticast는 한 번에 토큰 500개까지만 받는다. Firestore 배치 쓰기도 500개가 한도다.
const CHUNK_SIZE = 500;

// 앱 삭제·권한 해제로 더는 쓸 수 없는 토큰만 지운다. 서버 오류 같은 일시적 실패에 지우면
// 정상 사용자가 알림을 조용히 못 받게 되므로 다른 실패는 남겨 둔다. (api/notify와 같은 기준)
const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function sendToAll(db, messaging, { title, body, url = '/' }) {
  const snap = await db.collection('fcmTokens').get();
  const targets = snap.docs
    .map((d) => ({ ref: d.ref, token: d.data().token }))
    .filter((t) => t.token);

  let successCount = 0;
  let failureCount = 0;
  const staleRefs = [];

  for (const chunk of chunks(targets, CHUNK_SIZE)) {
    const result = await messaging.sendEachForMulticast({
      tokens: chunk.map((t) => t.token),
      notification: { title, body },
      webpush: {
        notification: { title, body, icon: '/icon-192.png' },
        fcmOptions: { link: url },
      },
    });
    successCount += result.successCount;
    failureCount += result.failureCount;
    result.responses.forEach((resp, i) => {
      if (!resp.success && STALE_TOKEN_CODES.has(resp.error?.code)) staleRefs.push(chunk[i].ref);
    });
  }

  // 처음 읽은 문서 참조로 바로 지워, 컬렉션을 다시 읽지 않는다.
  for (const refs of chunks(staleRefs, CHUNK_SIZE)) {
    const batch = db.batch();
    refs.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return { tokenCount: targets.length, successCount, failureCount, removedCount: staleRefs.length };
}
