import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  return initializeApp({ credential: cert(serviceAccount) });
}

export async function POST(request) {
  try {
    const { token, uid } = await request.json();
    if (!token || !uid) return NextResponse.json({ error: 'token, uid 필요' }, { status: 400 });

    getAdminApp();
    const db = getFirestore();
    await db.collection('fcmTokens').doc(uid).set({ token, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
