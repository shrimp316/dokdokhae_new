import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  ContentApiError,
  assertOwnerOrAdmin,
  contentApiErrorResponse,
  documentId,
  getUserProfile,
  optionalString,
  readJsonBody,
  requiredString,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const { id: rawId } = await params;
    const id = documentId(rawId, 'post id');
    const body = await readJsonBody(request);
    const db = getAdminDb();
    const ref = db.collection('board').doc(id);
    const [postSnap, profile] = await Promise.all([
      ref.get(),
      getUserProfile(db, authResult.user.uid),
    ]);

    if (!postSnap.exists) throw new ContentApiError(404, 'Board post not found');
    assertOwnerOrAdmin(postSnap.data(), authResult.user.uid, profile);

    const title = requiredString(body.title, 'title', CONTENT_LIMITS.title);
    const prefix = optionalString(body.prefix, 'prefix', CONTENT_LIMITS.prefix);
    const content = sanitizedRichHtml(body.content);

    await ref.update({
      title,
      prefix,
      content: content.html,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    });
  } catch (error) {
    return contentApiErrorResponse(error, 'update board post');
  }
}
