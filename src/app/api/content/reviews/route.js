import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  ContentApiError,
  contentApiErrorResponse,
  documentId,
  getUserProfile,
  ratingValue,
  readJsonBody,
  requireProfile,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function POST(request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const body = await readJsonBody(request);
    const db = getAdminDb();
    const profile = requireProfile(await getUserProfile(db, authResult.user.uid));
    const bookId = documentId(body.bookId, 'bookId');
    const rating = ratingValue(body.rating);
    const content = sanitizedRichHtml(body.content, CONTENT_LIMITS.richHtml);

    const bookSnap = await db.collection('books').doc(bookId).get();
    if (!bookSnap.exists) throw new ContentApiError(400, 'bookId does not reference an existing book');

    const ref = await db.collection('reviews').add({
      bookId,
      content: content.html,
      rating,
      nickname: profile.nickname.trim(),
      uid: authResult.user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: ref.id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    }, { status: 201 });
  } catch (error) {
    return contentApiErrorResponse(error, 'create review');
  }
}
