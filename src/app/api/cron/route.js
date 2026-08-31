import { NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging } from '@/lib/firebaseAdmin';

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

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const messaging = getAdminMessaging();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    let totalSent = 0;
    const log = [];

    // 예약 알림
    const scheduledSnap = await db.collection('scheduledNotifications').where('date', '==', todayStr).where('sent', '==', false).get();
    for (const docSnap of scheduledSnap.docs) {
      const n = docSnap.data();
      const sent = await sendToAll(messaging, db, n.title, n.body, n.url || '/');
      await docSnap.ref.update({ sent: true, sentAt: new Date(), sentCount: sent });
      log.push(`예약알림: ${n.title} (${sent}명)`);
      totalSent += sent;
    }

    // 모임 D-1 자동 알림
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
