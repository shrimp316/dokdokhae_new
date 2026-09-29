import { NextResponse } from 'next/server';
import { getAdminDb, getAdminMessaging, requireAdminUser } from '@/lib/firebaseAdmin';
import { sendToAll } from '@/lib/push';

export async function POST(request) {
  try {
    const authResult = await requireAdminUser(request);
    if (authResult.response) return authResult.response;

    const { title, body, url = '/' } = await request.json();
    if (!title || !body) return NextResponse.json({ error: 'title, body 필요' }, { status: 400 });

    const db = getAdminDb();
    const messaging = getAdminMessaging();

    const result = await sendToAll(db, messaging, { title, body, url });
    if (result.tokenCount === 0) {
      return NextResponse.json({ success: true, sent: 0, message: '등록된 토큰 없음' });
    }
    return NextResponse.json({ success: true, sent: result.successCount, failed: result.failureCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
