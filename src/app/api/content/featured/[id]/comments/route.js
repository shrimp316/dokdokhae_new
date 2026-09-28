import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import {
  CONTENT_LIMITS,
  ContentApiError,
  contentApiErrorResponse,
  contentTooLongMessage,
  documentId,
  getUserProfile,
  readJsonBody,
  requiredString,
  sanitizedRichHtml,
} from '@/lib/contentApi';
import { NICKNAME_TAKEN_MESSAGE, isMemberNicknameTaken } from '@/lib/nicknames';
import { ANON_NICKNAME_MIN } from '@/lib/commentPolicy';

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
  if (nickname.length < ANON_NICKNAME_MIN) {
    throw new ContentApiError(400, `nickname must be at least ${ANON_NICKNAME_MIN} characters`);
  }
  return nickname;
}

const ANONYMOUS_COMMENT_INTERVAL_MS = 15_000;

// 비회원은 계정을 새로 만들어 우회할 수 있어 완전한 방어는 아니지만,
// 한 계정이 짧은 간격으로 연속 등록하는 것은 막는다.
// (comments 컬렉션 그룹의 uid + createdAt 인덱스를 사용: firestore.indexes.json)
async function assertAnonymousCommentInterval(db, uid) {
  const snap = await db.collectionGroup('comments')
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  const lastMs = snap.docs[0]?.data().createdAt?.toMillis?.();
  if (lastMs && Date.now() - lastMs < ANONYMOUS_COMMENT_INTERVAL_MS) {
    throw new ContentApiError(429, '댓글은 잠시 후에 다시 등록할 수 있어요.');
  }
}

export async function POST(request, { params }) {
  try {
    // 비회원 댓글을 허용하는 API. 익명 계정은 이 API에서만 통과시킨다.
    const authResult = await requireAuthenticatedUser(request, { allowAnonymous: true });
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
    if (!profile) {
      // 화면에서도 검사하지만 API를 직접 호출해 우회할 수 있으므로 서버에서 다시 막는다.
      if (await isMemberNicknameTaken(db, nickname)) {
        throw new ContentApiError(409, NICKNAME_TAKEN_MESSAGE);
      }
      await assertAnonymousCommentInterval(db, authResult.user.uid);
    }
    const isRich = !parentId;
    const content = isRich
      ? sanitizedRichHtml(body.content, CONTENT_LIMITS.commentHtml)
      : {
          html: requiredString(body.content, 'content', CONTENT_LIMITS.commentHtml, {
            tooLongMessage: contentTooLongMessage(CONTENT_LIMITS.commentHtml),
          }),
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
