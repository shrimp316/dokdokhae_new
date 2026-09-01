import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import {
  ContentApiError,
  assertOwnerOrAdmin,
  contentApiErrorResponse,
  documentId,
  getUserProfile,
  ratingValue,
  readJsonBody,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const { id: rawId } = await params;
    const id = documentId(rawId, 'review id');
    const body = await readJsonBody(request);
    const db = getAdminDb();
    const ref = db.collection('reviews').doc(id);
    const [reviewSnap, profile] = await Promise.all([
      ref.get(),
      getUserProfile(db, authResult.user.uid),
    ]);

    if (!reviewSnap.exists) throw new ContentApiError(404, 'Review not found');
    assertOwnerOrAdmin(reviewSnap.data(), authResult.user.uid, profile);

    const rating = ratingValue(body.rating);
    const content = sanitizedRichHtml(body.content);
    await ref.update({
      content: content.html,
      rating,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    });
  } catch (error) {
    return contentApiErrorResponse(error, 'update review');
  }
}
