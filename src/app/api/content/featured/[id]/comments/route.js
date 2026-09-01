import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  ContentApiError,
  contentApiErrorResponse,
  documentId,
  getUserProfile,
  readJsonBody,
  requiredString,
  sanitizedRichHtml,
} from '@/lib/contentApi';

function commentNickname(authUser, profile, suppliedNickname) {
  if (profile) {
    try {
      return requiredString(
        profile.nickname,
        'profile nickname',
        CONTENT_LIMITS.memberNickname,
      );
    } catch {
      throw new ContentApiError(403, 'A valid user profile is required');
    }
  }

  const provider = authUser.firebase?.sign_in_provider;
  if (provider !== 'anonymous') {
    throw new ContentApiError(403, 'A valid user profile is required');
  }

  const nickname = requiredString(suppliedNickname, 'nickname', CONTENT_LIMITS.nickname);
  if (nickname.length < 2) {
    throw new ContentApiError(400, 'nickname must be at least 2 characters');
  }
  return nickname;
}

export async function POST(request, { params }) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const { id: rawId } = await params;
    const passageId = documentId(rawId, 'featured passage id');
    const body = await readJsonBody(request);
    const parentId = body.parentId == null || body.parentId === ''
      ? null
      : documentId(body.parentId, 'parentId');
    const db = getAdminDb();
    const passageRef = db.collection('featuredPassages').doc(passageId);
    const [passageSnap, profile] = await Promise.all([
      passageRef.get(),
      getUserProfile(db, authResult.user.uid),
    ]);
    if (!passageSnap.exists) throw new ContentApiError(404, 'Featured passage not found');

    if (parentId) {
      const parentSnap = await passageRef.collection('comments').doc(parentId).get();
      if (!parentSnap.exists) throw new ContentApiError(400, 'Parent comment not found');
      if (parentSnap.data().parentId) {
        throw new ContentApiError(400, 'Replies can only target a top-level comment');
      }
    }

    const nickname = commentNickname(authResult.user, profile, body.nickname);
    const isRich = !parentId;
    const content = isRich
      ? sanitizedRichHtml(body.content, CONTENT_LIMITS.commentHtml)
      : {
          html: requiredString(body.content, 'content', CONTENT_LIMITS.commentHtml),
          removedUnsafeContent: false,
        };
    const ref = passageRef.collection('comments').doc();
    await ref.set({
      content: content.html,
      nickname,
      uid: authResult.user.uid,
      parentId,
      isRich,
      ...(profile ? {} : { isAnonymous: true }),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: ref.id,
      content: content.html,
      contentWasSanitized: content.removedUnsafeContent,
    }, { status: 201 });
  } catch (error) {
    return contentApiErrorResponse(error, 'create featured comment');
  }
}
