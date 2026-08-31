import { auth } from '@/lib/firebase';

export async function authHeaders(extra = {}) {
  const user = auth.currentUser;
  if (!user) return { ...extra };
  const token = await user.getIdToken();
  return { ...extra, Authorization: `Bearer ${token}` };
}
