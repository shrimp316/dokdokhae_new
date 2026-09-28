import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging } from '@/lib/firebaseAdmin';

// api/send-notification과 같은 로직이다. 토큰을 한 번만 읽도록 고치면서 lib/push.js로 합칠 예정이다.
async function sendToAll(messaging, db, title, body, url = '/') {
  const snap = await db.collection('fcmTokens').get();
  const tokens = snap.docs.map(d => d.data().token).filter(Boolean);
  if (tokens.length === 0) return 0;
  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: { title, body, icon: '/icon-192.png' },
      fcmOptions: { link: url },
    },
  });
  const failedTokens = result.responses.map((r, i) => !r.success ? tokens[i] : null).filter(Boolean);
  if (failedTokens.length > 0) {
    const allDocs = await db.collection('fcmTokens').get();
    const batch = db.batch();
    allDocs.docs.forEach(d => { if (failedTokens.includes(d.data().token)) batch.delete(d.ref); });
    await batch.commit();
  }
  return result.successCount;
}

// Vercel Cron은 CRON_SECRET이 설정돼 있으면 `Authorization: Bearer <CRON_SECRET>`을 붙여 호출한다.
// CRON_SECRET이 없을 때 `Bearer undefined`와 비교해 통과되는 일이 없도록 미설정이면 모두 거부한다.
function isAuthorizedCronRequest(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not configured; rejecting cron request');
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get('authorization') || '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const messaging = getAdminMessaging();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    let totalSent = 0;
    const log = [];

    // sent·notified 표시를 남겨, cron이 다시 실행되거나 재시도돼도 같은 알림을 두 번 보내지 않는다.
    const scheduledSnap = await db.collection('scheduledNotifications').where('date', '==', todayStr).where('sent', '==', false).get();
    for (const docSnap of scheduledSnap.docs) {
      const n = docSnap.data();
      const sent = await sendToAll(messaging, db, n.title, n.body, n.url || '/');
      await docSnap.ref.update({ sent: true, sentAt: new Date(), sentCount: sent });
      log.push(`예약알림: ${n.title} (${sent}명)`);
      totalSent += sent;
    }

    // 모임 전날 자동 알림
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    const meetSnap = await db.collection('meetings').get();
    for (const meetDoc of meetSnap.docs) {
      const m = meetDoc.data();
      if (!m.date) continue;
      const meetDate = m.date.slice(0, 10);
      if (meetDate === tomorrowStr && !m.notified) {
        const sent = await sendToAll(messaging, db, '📅 내일 독서모임이 있어요!', `${m.date.slice(0,16).replace('T',' ')} 모임을 잊지 마세요.`, '/schedule');
        await meetDoc.ref.update({ notified: true });
        log.push(`D-1 모임 알림 (${sent}명)`);
        totalSent += sent;
      }
    }

    return NextResponse.json({ success: true, date: todayStr, sent: totalSent, log });
  } catch (e) {
    console.error('cron failed', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
