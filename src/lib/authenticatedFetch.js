'use client';

import { auth } from '@/lib/firebase';

export async function authenticatedFetch(input, init = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(input, { ...init, headers });
}
