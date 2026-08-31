import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  return initializeApp({ credential: cert(serviceAccount) });
}

export async function verifyRequestUser(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return await getAuth(getAdminApp()).verifyIdToken(header.slice(7));
  } catch {
    return null;
  }
}

export async function isAdminUser(decodedToken) {
  if (!decodedToken?.uid) return false;
  const snap = await getFirestore(getAdminApp()).collection('users').doc(decodedToken.uid).get();
  return snap.exists && snap.data()?.role === 'admin';
}
