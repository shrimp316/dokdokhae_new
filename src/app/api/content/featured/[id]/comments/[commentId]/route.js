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
  readJsonBody,
  requiredString,
  sanitizedRichHtml,
} from '@/lib/contentApi';

export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const { id: rawPassageId, commentId: rawCommentId } = await params;
    const passageId = documentId(rawPassageId, 'featured passage id');
    const commentId = documentId(rawCommentId, 'comment id');
    const body = await readJsonBody(request);
    const db = getAdminDb();
    const ref = db.collection('featuredPassages').doc(passageId)
      .collection('comments').doc(commentId);
    const [commentSnap, profile] = await Promise.all([
      ref.get(),
      getUserProfile(db, authResult.user.uid),
    ]);

    if (!commentSnap.exists) throw new ContentApiError(404, 'Comment not found');
    const comment = commentSnap.data();
    assertOwnerOrAdmin(comment, authResult.user.uid, profile);

    const isRich = comment.isRich || !comment.parentId;
    const content = isRich
      ? sanitizedRichHtml(body.content, CONTENT_LIMITS.commentHtml)
      : {
          html: requiredString(body.content, 'content', CONTENT_LIMITS.commentHtml),
          removedUnsafeContent: false,
        };
    await ref.update({
      content: content.html,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: commentId,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    });
  } catch (error) {
    return contentApiErrorResponse(error, 'update featured comment');
  }
}
