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

export async function authenticatedJsonFetch(input, { body, ...init } = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const response = await authenticatedFetch(input, {
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }
  return payload;
}
