import { NextResponse } from 'next/server';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const db = getAdminDb();
    await db.collection('fcmTokens').doc(authResult.user.uid)
      .set({ token, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    await getAdminDb().collection('fcmTokens').doc(authResult.user.uid).delete();

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
