import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const { stage, reason, context } = await request.json();
    if (!stage) return NextResponse.json({ error: 'stage required' }, { status: 400 });

    const db = getAdminDb();
    await db.collection('fcmDiagnostics').add({
      uid: authResult.user.uid, stage, reason: reason || null, context: context || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
