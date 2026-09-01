import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAdminUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  booleanValue,
  contentApiErrorResponse,
  readJsonBody,
  requiredString,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function POST(request) {
  try {
    const authResult = await requireAdminUser(request);
    if (authResult.response) return authResult.response;

    const body = await readJsonBody(request);
    const title = requiredString(body.title, 'title', CONTENT_LIMITS.title);
    const content = sanitizedRichHtml(body.content);
    const pinned = booleanValue(body.pinned, 'pinned');
    const db = getAdminDb();
    const ref = db.collection('notices').doc();
    const batch = db.batch();

    if (pinned) {
      const pinnedSnap = await db.collection('notices').where('pinned', '==', true).get();
      pinnedSnap.docs.forEach(doc => batch.update(doc.ref, { pinned: false }));
    }

    batch.set(ref, {
      title,
      content: content.html,
      pinned,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      id: ref.id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    }, { status: 201 });
  } catch (error) {
    return contentApiErrorResponse(error, 'create notice');
  }
}
