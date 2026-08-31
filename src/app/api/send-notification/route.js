import { NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging, requireAdminUser } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const authResult = await requireAdminUser(request);
    if (authResult.response) return authResult.response;

    const { title, body, url = '/' } = await request.json();
    if (!title || !body) return NextResponse.json({ error: 'title, body 필요' }, { status: 400 });

    const db = getAdminDb();
    const messaging = getAdminMessaging();

    // 모든 FCM 토큰 가져오기
    const snap = await db.collection('fcmTokens').get();
    const tokens = snap.docs.map(d => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: '등록된 토큰 없음' });
    }

    // 멀티캐스트 발송
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        notification: { title, body, icon: '/icon-192.png' },
        fcmOptions: { link: url },
      },
    });

    // 실패한 토큰 정리
    const failedTokens = [];
    result.responses.forEach((resp, i) => {
      if (!resp.success) failedTokens.push(tokens[i]);
    });
    if (failedTokens.length > 0) {
      const batch = db.batch();
      const allDocs = await db.collection('fcmTokens').get();
      allDocs.docs.forEach(d => {
        if (failedTokens.includes(d.data().token)) batch.delete(d.ref);
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true, sent: result.successCount, failed: result.failureCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
