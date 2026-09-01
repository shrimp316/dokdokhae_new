import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAdminUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  ContentApiError,
  booleanValue,
  contentApiErrorResponse,
  documentId,
  readJsonBody,
  requiredString,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAdminUser(request);
    if (authResult.response) return authResult.response;

    const { id: rawId } = await params;
    const id = documentId(rawId, 'notice id');
    const body = await readJsonBody(request);
    const title = requiredString(body.title, 'title', CONTENT_LIMITS.title);
    const content = sanitizedRichHtml(body.content);
    const pinned = booleanValue(body.pinned, 'pinned');
    const db = getAdminDb();
    const ref = db.collection('notices').doc(id);
    const noticeSnap = await ref.get();
    if (!noticeSnap.exists) throw new ContentApiError(404, 'Notice not found');

    const batch = db.batch();
    if (pinned) {
      const pinnedSnap = await db.collection('notices').where('pinned', '==', true).get();
      pinnedSnap.docs.forEach(doc => {
        if (doc.id !== id) batch.update(doc.ref, { pinned: false });
      });
    }
    batch.update(ref, {
      title,
      content: content.html,
      pinned,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    });
  } catch (error) {
    return contentApiErrorResponse(error, 'update notice');
  }
}
