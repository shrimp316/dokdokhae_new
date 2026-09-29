import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { stripHtml } from '@/lib/searchUtils';
import { getAdminDb, getAdminMessaging, requireAuthenticatedUser } from '@/lib/firebaseAdmin';
import { postPath } from '@/lib/routes';

const PREVIEW_LEN = 60;
const VALID_COLLECTIONS = ['board', 'reviews', 'featuredPassages'];

async function resolveComment(db, { collectionName, postId, commentId }) {
  const commentSnap = await db.collection(collectionName).doc(postId)
    .collection('comments').doc(commentId).get();
  if (!commentSnap.exists) return null;
  const comment = commentSnap.data();

  if (comment.parentId) {
    const parentSnap = await db.collection(collectionName).doc(postId)
      .collection('comments').doc(comment.parentId).get();
    if (!parentSnap.exists) return null;
    return {
      type: 'reply',
      recipientUid: parentSnap.data().uid,
      actorUid: comment.uid,
      actorNickname: comment.nickname,
      content: comment.content,
    };
  }

  // 이 주의 글은 관리자가 올린 글이라 댓글 알림을 받을 작성자가 없다. (답글 알림만 보낸다)
  if (collectionName === 'featuredPassages') return null;

  const postSnap = await db.collection(collectionName).doc(postId).get();
  if (!postSnap.exists) return null;
  return {
    type: 'comment',
    recipientUid: postSnap.data().uid,
    bookId: postSnap.data().bookId || null,
    actorUid: comment.uid,
    actorNickname: comment.nickname,
    content: comment.content,
  };
}

async function resolveLike(db, { collectionName, postId, actorUid }) {
  if (collectionName === 'featuredPassages') return null;
  const likeSnap = await db.collection(collectionName).doc(postId)
    .collection('likes').doc(actorUid).get();
  if (!likeSnap.exists) return null;

  const postSnap = await db.collection(collectionName).doc(postId).get();
  if (!postSnap.exists) return null;

  const actorSnap = await db.collection('users').doc(actorUid).get();
  return {
    type: 'like',
    recipientUid: postSnap.data().uid,
    bookId: postSnap.data().bookId || null,
    actorUid,
    actorNickname: actorSnap.exists ? actorSnap.data().nickname : '익명',
  };
}

export async function POST(request) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult.response) return authResult.response;

    const body = await request.json();
    const { type, collectionName, postId, commentId } = body;

    if (!VALID_COLLECTIONS.includes(collectionName) || !postId) {
      return NextResponse.json({ error: 'invalid collectionName/postId' }, { status: 400 });
    }

    const db = getAdminDb();

    let resolved = null;
    if (type === 'comment') {
      if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });
      resolved = await resolveComment(db, { collectionName, postId, commentId });
    } else if (type === 'like') {
      resolved = await resolveLike(db, {
        collectionName,
        postId,
        actorUid: authResult.user.uid,
      });
    } else {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }

    if (!resolved) return NextResponse.json({ success: true, skipped: true });
    // 알림 내용은 요청 본문이 아니라 저장된 댓글·좋아요에서 읽는다. 그 작성자가 요청자와 같아야
    // 다른 사람 이름으로 알림을 만들 수 없다.
    if (resolved.actorUid !== authResult.user.uid) {
      return NextResponse.json({ error: 'Notification actor mismatch' }, { status: 403 });
    }

    const { recipientUid } = resolved;
    if (!recipientUid || recipientUid === resolved.actorUid) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const recipientSnap = await db.collection('users').doc(recipientUid).get();
    if (!recipientSnap.exists) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // 같은 댓글, 같은 사람의 같은 글 좋아요는 알림 하나로 유지한다.
    // 좋아요를 껐다 켜도 알림이 쌓이거나 푸시가 반복되지 않는다.
    const notifId = type === 'comment'
      ? commentId
      : `like_${collectionName}_${postId}_${resolved.actorUid}`;
    const notifRef = db.collection('users').doc(recipientUid)
      .collection('notifications').doc(notifId);
    const existingSnap = await notifRef.get();
    const shouldSendPush = !existingSnap.exists;

    const preview = resolved.content ? stripHtml(resolved.content).slice(0, PREVIEW_LEN) : '';
    const notifData = {
      type: resolved.type,
      collectionName,
      postId,
      bookId: resolved.bookId || null,
      commentId: type === 'comment' ? commentId : null,
      actorUid: resolved.actorUid,
      actorNickname: resolved.actorNickname || '익명',
      preview,
    };

    await notifRef.set(
      existingSnap.exists ? notifData : { ...notifData, read: false, createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const tokenSnap = await db.collection('fcmTokens').doc(recipientUid).get();
    const token = tokenSnap.exists ? tokenSnap.data().token : null;
    // 푸시를 받지 못하는 회원을 찾아내기 위한 진단 기록
    if (!token) {
      await db.collection('fcmDiagnostics').add({
        uid: recipientUid, stage: 'no-token', reason: null,
        context: { collectionName, postId }, createdAt: FieldValue.serverTimestamp(),
      });
    }
    if (token && shouldSendPush) {
      const url = postPath({ collectionName, postId, bookId: resolved.bookId });
      const titleByType = {
        comment: `${resolved.actorNickname}님이 댓글을 남겼어요`,
        reply: `${resolved.actorNickname}님이 답글을 남겼어요`,
        like: `${resolved.actorNickname}님이 좋아요를 눌렀어요`,
      };
      const title = titleByType[resolved.type];
      try {
        await getAdminMessaging().send({
          token,
          notification: { title, body: preview || undefined },
          data: { notifId, url },
          webpush: {
            notification: { title, body: preview || undefined, icon: '/icon-192.png', tag: notifId },
            fcmOptions: { link: url },
          },
        });
      } catch (e) {
        if (e?.code === 'messaging/registration-token-not-registered') {
          await db.collection('fcmTokens').doc(recipientUid).delete();
        } else {
          console.error('notify push failed', e);
        }
        await db.collection('fcmDiagnostics').add({
          uid: recipientUid, stage: 'send-failed', reason: e?.code || e?.message || String(e),
          context: { collectionName, postId }, createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('notify failed', e);
    // 지금은 에러도 200으로 돌려주고 e.message를 그대로 노출한다.
    // 다른 API처럼 contentApiErrorResponse 형식으로 맞출 예정이다.
    return NextResponse.json({ success: false, error: e.message }, { status: 200 });
  }
}
