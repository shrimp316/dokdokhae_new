import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  return initializeApp({ credential: cert(serviceAccount) });
}

export async function POST(request) {
  try {
    const { uid, stage, reason, context } = await request.json();
    if (!uid || !stage) return NextResponse.json({ error: 'uid, stage 필요' }, { status: 400 });

    getAdminApp();
    const db = getFirestore();
    await db.collection('fcmDiagnostics').add({
      uid, stage, reason: reason || null, context: context || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
